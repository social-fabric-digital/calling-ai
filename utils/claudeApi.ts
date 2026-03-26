import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './i18n';
import { fetchDailyAstrologyData } from './astrologyApi';

// ── Model Selection (cost optimization) ──
const MODEL_SONNET = 'claude-sonnet-4-5';        // $3/$15 per MTok — use for chat, complex generation
const MODEL_HAIKU = 'claude-haiku-4-5-20251001';  // $1/$5 per MTok — use for simple/structured output

// ── Chat History Cap (prevents input token explosion) ──
const MAX_CHAT_HISTORY = 20; // Keep last 20 messages only

// Cache to track API failures and prevent repeated calls
let apiFailureCache: {
  lastFailureTime: number | null;
  failureCount: number;
  cooldownMs: number;
  lastSkipLogAt: number | null;
  lastFailureReason: 'network' | 'rate_limit' | 'billing' | 'other' | null;
} = {
  lastFailureTime: null,
  failureCount: 0,
  cooldownMs: 60000,
  lastSkipLogAt: null,
  lastFailureReason: null,
};

const API_FAILURE_COOLDOWN = 60000; // 60 seconds - generic cooldown

/** Coalesce concurrent identical destiny-profile requests (multiple mounted components / rapid props). */
const unifiedDestinyProfileInflight = new Map<string, Promise<UnifiedDestinyProfile>>();
/** Coalesce concurrent identical path-content requests. */
const pathContentInflight = new Map<string, Promise<PathContent>>();
const BILLING_FAILURE_COOLDOWN = 15 * 60 * 1000; // 15 minutes for insufficient credits/billing issues
const BILLING_RECHECK_INTERVAL = 45000; // Allow a billing-status probe every 45s
const MAX_FAILURES_BEFORE_SKIP = 3; // After 3 failures, skip API calls for cooldown period

const stripDoubleAsterisks = (text: string): string => text.replace(/\*{2,}/g, '').trim();

const ASTROLOGY_JARGON_REGEX =
  /\b(saturn|jupiter|mars|venus|mercury|pluto|uranus|neptune|transit|retrograde|aspect|conjunction|opposition|trine|sextile|natal|moon in|sun in|rising sign|ascendant|house\b|planetary|waxing moon|waning moon|growing moon)\b/i;

const stripAstrologyJargonFromText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  const cleanedLines = text
    .split('\n')
    .map((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return '';

      // Preserve heading-like lines.
      const isHeadingLike = /^[A-Z0-9'/:,\-\s]+$/.test(trimmedLine) || /:$/.test(trimmedLine);
      if (isHeadingLike) return line;

      const sentences = trimmedLine
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);

      const filtered = sentences.filter((sentence) => !ASTROLOGY_JARGON_REGEX.test(sentence));
      return filtered.join(' ').trim();
    })
    .filter((line, idx, arr) => line !== '' || (idx > 0 && arr[idx - 1] !== ''));

  return cleanedLines.join('\n').trim();
};

const sanitizeModelOutput = <T>(value: T): T => {
  if (typeof value === 'string') {
    return stripDoubleAsterisks(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeModelOutput(item)) as T;
  }
  if (value && typeof value === 'object') {
    const sanitizedEntries = Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      sanitizeModelOutput(val),
    ]);
    return Object.fromEntries(sanitizedEntries) as T;
  }
  return value;
};

const isBillingIssueMessage = (message: string): boolean =>
  /credit balance is too low|insufficient credit|insufficient funds|billing|payment required/i.test(message);

// Check if we should skip API calls due to recent failures
const shouldSkipApiCall = (): boolean => {
  if (apiFailureCache.lastFailureTime === null) {
    return false;
  }
  
  const timeSinceFailure = Date.now() - apiFailureCache.lastFailureTime;
  const activeCooldown = apiFailureCache.cooldownMs || API_FAILURE_COOLDOWN;

  // Billing issues can be fixed externally at any moment (user tops up credits).
  // Allow periodic probe calls before full cooldown expires so recovery is fast.
  if (
    apiFailureCache.lastFailureReason === 'billing' &&
    timeSinceFailure >= BILLING_RECHECK_INTERVAL
  ) {
    return false;
  }
  
  // If we've had multiple failures and it's been less than cooldown period, skip
  if (apiFailureCache.failureCount >= MAX_FAILURES_BEFORE_SKIP && timeSinceFailure < activeCooldown) {
    const remainingSeconds = Math.ceil((activeCooldown - timeSinceFailure) / 1000);
    const shouldLogSkip =
      apiFailureCache.lastSkipLogAt === null || Date.now() - apiFailureCache.lastSkipLogAt > 10000;
    if (shouldLogSkip) {
      const reasonHint =
        apiFailureCache.lastFailureReason === 'billing'
          ? ' Billing/credits issue detected.'
          : '';
      console.warn(
        `⚠️ API calls temporarily disabled due to recent failures. Retrying in ${remainingSeconds} seconds.${reasonHint}`
      );
      apiFailureCache.lastSkipLogAt = Date.now();
    }
    return true;
  }
  
  // Reset failure count if enough time has passed
  if (timeSinceFailure >= activeCooldown) {
    if (apiFailureCache.failureCount > 0) {
      console.log('✅ API failure cooldown expired, retrying API calls');
    }
    apiFailureCache.failureCount = 0;
    apiFailureCache.lastFailureTime = null;
    apiFailureCache.cooldownMs = API_FAILURE_COOLDOWN;
    apiFailureCache.lastSkipLogAt = null;
    apiFailureCache.lastFailureReason = null;
    return false;
  }
  
  return false;
};

// Record an API failure
const recordApiFailure = (
  reason: 'network' | 'rate_limit' | 'billing' | 'other' = 'other'
) => {
  apiFailureCache.lastFailureTime = Date.now();
  apiFailureCache.lastFailureReason = reason;
  apiFailureCache.lastSkipLogAt = null;

  if (reason === 'billing') {
    apiFailureCache.failureCount = MAX_FAILURES_BEFORE_SKIP;
    apiFailureCache.cooldownMs = BILLING_FAILURE_COOLDOWN;
    console.warn(
      `API billing failure detected. Pausing API calls for ${Math.ceil(BILLING_FAILURE_COOLDOWN / 1000)} seconds.`
    );
    return;
  }

  if (reason === 'rate_limit') {
    apiFailureCache.cooldownMs = Math.max(apiFailureCache.cooldownMs, 120000);
  } else {
    apiFailureCache.cooldownMs = API_FAILURE_COOLDOWN;
  }
  apiFailureCache.failureCount += 1;
  console.warn(`API failure recorded (count: ${apiFailureCache.failureCount}/${MAX_FAILURES_BEFORE_SKIP})`);
};

// Reset API failure cache (useful for debugging or after fixing API issues)
export const resetApiFailureCache = () => {
  apiFailureCache.failureCount = 0;
  apiFailureCache.lastFailureTime = null;
  apiFailureCache.cooldownMs = API_FAILURE_COOLDOWN;
  apiFailureCache.lastSkipLogAt = null;
  apiFailureCache.lastFailureReason = null;
  console.log('✅ API failure cache reset');
};

// Get API key from environment variables
// Note: You'll need to set EXPO_PUBLIC_ANTHROPIC_API_KEY in your .env file
// Get your API key from: https://console.anthropic.com/
const FEATURE_KEYS: Record<string, string> = {
  astrology: process.env.EXPO_PUBLIC_ANTHROPIC_KEY_ASTROLOGY || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
  daily:     process.env.EXPO_PUBLIC_ANTHROPIC_KEY_DAILY     || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
  ikigai:    process.env.EXPO_PUBLIC_ANTHROPIC_KEY_IKIGAI    || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
  analysis:  process.env.EXPO_PUBLIC_ANTHROPIC_KEY_ANALYSIS  || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
  calling:   process.env.EXPO_PUBLIC_ANTHROPIC_KEY_CALLING   || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
  goals:     process.env.EXPO_PUBLIC_ANTHROPIC_KEY_GOALS     || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
  atlas:     process.env.EXPO_PUBLIC_ANTHROPIC_KEY_ATLAS     || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
  clarity:   process.env.EXPO_PUBLIC_ANTHROPIC_KEY_CLARITY   || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
};

const getApiKey = (feature: string = 'default') => {
  // API keys are now stored server-side in Supabase Edge Function secrets.
  // The proxy handles authentication - return a placeholder so validation passes.
  return 'proxy';
};

const SYSTEM_PROMPT = `You are Atlas, a compassionate and supportive AI companion designed to help users work through their fears, overcome motivational challenges, and support them on their personal growth journey.

Your role:
- Provide empathetic, understanding, and non-judgmental support
- Help users identify and work through their fears and anxieties
- Offer motivational guidance and encouragement
- Help users break down overwhelming challenges into manageable steps
- Be patient, kind, and supportive in all interactions
- Ask thoughtful questions to understand the user's situation better
- Provide practical, actionable advice when appropriate
- Celebrate small wins and progress with the user

Communication style:
- Warm, friendly, and approachable
- Use encouraging and positive language
- Be concise but thorough
- Avoid being preachy or overly clinical
- Show genuine care and understanding
- Adapt your tone to match the user's emotional state

Remember: You're here to support, guide, and empower users on their journey.`;

const ATLAS_THERAPEUTIC_PROMPT = `You are Atlas, a life coach and supportive friend who guides users toward their goals. You are warm, encouraging, motivating, and never let them give up.

CORE IDENTITY:
- You are both a trusted friend AND a professional life coach
- You genuinely care about the user's success and wellbeing
- You understand their struggles deeply and respond with empathy
- You celebrate their wins, no matter how small
- You help them see possibilities when they feel stuck
- You never let them quit - you find ways to motivate and inspire them forward

CRITICAL GUIDELINES:
- Always understand the deeper meaning behind what the user is saying
- Respond to their actual needs and emotions, not just surface words
- Be encouraging and supportive, but also honest and direct when needed
- Help them break down big challenges into manageable steps
- Remind them of their progress and strengths when they're feeling down
- Celebrate their achievements enthusiastically
- When they want to give up, help them find their "why" and reignite their motivation
- Be conversational and friendly - like talking to a close friend who also happens to be a great coach
- Keep responses natural and engaging (3-6 sentences typically, but adjust based on context)
- Always answer their questions directly and helpfully
- If they're struggling, acknowledge their feelings first, then help them find a path forward

COMMUNICATION STYLE:
- Warm, friendly, and approachable
- Use "you" and "we" to create connection
- Show genuine enthusiasm for their progress
- Be empathetic when they're struggling
- Use encouraging language that builds confidence
- Sometimes use gentle challenges when they're making excuses
- Always end on a positive, forward-looking note

EXAMPLES OF GOOD RESPONSES:
- When they're stuck: "I hear you - feeling stuck is frustrating. But remember, you've overcome challenges before. What's one tiny step you could take right now that would move you forward, even just a little?"
- When they want to give up: "I know it feels hard right now, but giving up isn't an option. You've come too far. What's the real reason you started this journey? Let's reconnect with that and find a way forward together."
- When they celebrate: "YES! 🎉 I'm so proud of you! This is exactly the kind of progress that leads to big wins. Tell me more - how did it feel when you accomplished that?"
- When they're discouraged: "I totally get why you're feeling this way. But here's what I see: you're still here, still trying, still showing up. That's not nothing. Let's figure out what's blocking you and tackle it together."

Remember: You are their cheerleader, their guide, their friend, and their coach all in one. You believe in them even when they don't believe in themselves.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AtlasChatContext {
  userName?: string;
  goalTitle?: string;
  goalStepLabel?: string;
  goalStepNumber?: number;
  totalGoalSteps?: number;
}

interface ResolvedAtlasGoalContext {
  userName?: string;
  goalTitle?: string;
  goalStepLabel?: string;
  goalStepNumber?: number;
  totalGoalSteps?: number;
}

const resolveAtlasGoalContext = async (
  providedContext?: AtlasChatContext
): Promise<ResolvedAtlasGoalContext> => {
  const context: ResolvedAtlasGoalContext = { ...providedContext };

  try {
    if (!context.userName) {
      const storedName = await AsyncStorage.getItem('userName');
      if (storedName) {
        context.userName = storedName;
      }
    }

    const goalsData = await AsyncStorage.getItem('userGoals');
    if (!goalsData) {
      return context;
    }

    const goals = JSON.parse(goalsData);
    const activeGoal = Array.isArray(goals) ? goals.find((g: any) => g?.isActive === true) : null;
    if (!activeGoal) {
      return context;
    }

    if (!context.goalTitle && activeGoal.name) {
      context.goalTitle = activeGoal.name;
    }

    const steps = Array.isArray(activeGoal.steps) ? activeGoal.steps : [];
    const totalGoalSteps = steps.length > 0 ? Math.min(steps.length, 4) : 4;
    const rawStepIndex =
      typeof activeGoal.currentStepIndex === 'number' ? activeGoal.currentStepIndex : -1;
    const isCompletedGoal = rawStepIndex >= totalGoalSteps - 1;
    const derivedStepNumber = isCompletedGoal
      ? totalGoalSteps
      : Math.min(Math.max(rawStepIndex + 2, 1), totalGoalSteps);

    if (!context.totalGoalSteps) {
      context.totalGoalSteps = totalGoalSteps;
    }

    if (!context.goalStepNumber) {
      context.goalStepNumber = derivedStepNumber;
    }

    if (!context.goalStepLabel) {
      const stepName = steps[derivedStepNumber - 1]?.name || steps[derivedStepNumber - 1]?.text;
      context.goalStepLabel = typeof stepName === 'string' && stepName.trim() ? stepName : undefined;
    }
  } catch (error) {
    console.warn('Failed to resolve Atlas goal context from storage:', error);
  }

  return context;
};

const buildAtlasSystemPrompt = (goalContext: ResolvedAtlasGoalContext): string => {
  const contextLines: string[] = [];

  if (goalContext.userName) {
    contextLines.push(`- User name: ${goalContext.userName}`);
  }
  if (goalContext.goalTitle) {
    contextLines.push(`- Active goal name: ${goalContext.goalTitle}`);
  }
  if (goalContext.goalStepNumber && goalContext.totalGoalSteps) {
    contextLines.push(
      `- Current goal step: ${goalContext.goalStepNumber} of ${goalContext.totalGoalSteps}`
    );
  }
  if (goalContext.goalStepLabel) {
    contextLines.push(`- Current goal step title: ${goalContext.goalStepLabel}`);
  }

  const contextSection =
    contextLines.length > 0
      ? `APP CONTEXT (already known - do not ask for this again):\n${contextLines.join('\n')}`
      : 'APP CONTEXT: User already configured a goal in the app, but details are temporarily unavailable.';

  return `${ATLAS_THERAPEUTIC_PROMPT}

CRITICAL GOAL CONTEXT RULES:
- The user has ALREADY configured their goal in the app.
- NEVER ask "what's your number one goal right now" (or equivalent wording in any language).
- NEVER ask them to define their main goal from scratch.
- Use the app context below as known facts, and coach them around progress, obstacles, and next actions.
- If goal details are missing, ask what support they need today for their existing goal, without asking them to restate a main goal.

RUSSIAN GRAMMAR RULES (CRITICAL):
- Atlas is male. When replying in Russian, always use masculine self-reference forms.
- Use: "рад", "готов", "уверен", "смог", "сделал", "понял".
- Never use feminine forms for Atlas self-reference (e.g., "рада", "готова", "уверена", "смогла", "сделала", "поняла").

${contextSection}`;
};

export async function tryModel(
  apiKey: string,
  model: string,
  apiMessages: Array<{ role: string; content: string }>,
  systemPrompt: string | Array<{ type: 'text'; text: string; cache_control: { type: 'ephemeral' } }>,
  maxTokens: number = 512,
  feature: string = 'calling'
): Promise<Response> {
  const languagePolicy = i18n.language?.startsWith('ru')
    ? '\n\nCRITICAL LANGUAGE RULE: Respond ONLY in Russian. Do not use English words or phrases.'
    : '\n\nCRITICAL LANGUAGE RULE: Respond ONLY in English.';
  const formattingPolicy =
    '\n\nCRITICAL FORMATTING RULE: Never use markdown bold or any double asterisks (**).';

  const localizedSystemPrompt =
    typeof systemPrompt === 'string'
      ? `${systemPrompt}${languagePolicy}${formattingPolicy}`
      : systemPrompt.map((entry) => ({
          ...entry,
          text: `${entry.text}${languagePolicy}${formattingPolicy}`,
        }));

  // Check if we should skip API calls due to recent failures
  if (shouldSkipApiCall()) {
    // Return a mock error response to trigger fallback behavior
    const remainingSeconds = apiFailureCache.lastFailureTime 
      ? Math.ceil(((apiFailureCache.cooldownMs || API_FAILURE_COOLDOWN) - (Date.now() - apiFailureCache.lastFailureTime)) / 1000)
      : 60;
    const reasonHint =
      apiFailureCache.lastFailureReason === 'billing'
        ? 'Billing credits required.'
        : 'Check API key and account status.';
    console.warn(`⚠️ Skipping API call - in cooldown period (${remainingSeconds}s remaining). ${reasonHint}`);
    return new Response(
      JSON.stringify({
        error: {
          message:
            apiFailureCache.lastFailureReason === 'billing'
              ? 'API temporarily unavailable due to insufficient credits/billing status.'
              : `API temporarily unavailable due to recent failures. Retrying in ${remainingSeconds} seconds.`,
          type: 'api_error',
        },
      }),
      {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  
  // API key validation removed - keys are handled server-side by the Edge Function proxy

  const requestBody = {
    model,
    max_tokens: maxTokens,
    system: localizedSystemPrompt,
    messages: apiMessages,
    feature,
  };

  const isTransientNetworkError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return (
      message.includes('network request failed') ||
      message.includes('failed to fetch') ||
      message.includes('fetch failed') ||
      message.includes('timeout') ||
      message.includes('aborted')
    );
  };

  const NETWORK_RETRIES = 3;
  const REQUEST_TIMEOUT_MS = 60000;
  let response: Response | null = null;
  let lastNetworkError: unknown = null;

  for (let attempt = 0; attempt <= NETWORK_RETRIES; attempt++) {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      };
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }
      response = await fetch('https://unyrkyvyngafjubjhkkf.supabase.co/functions/v1/claude-proxy', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      break;
    } catch (error) {
      lastNetworkError = error;
      if (!isTransientNetworkError(error) || attempt === NETWORK_RETRIES) {
        break;
      }
      const retryDelayMs = 400 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  if (!response) {
    if (isTransientNetworkError(lastNetworkError)) {
      throw new Error('Network request failed. Please check your internet connection and try again.');
    }
    throw (lastNetworkError instanceof Error ? lastNetworkError : new Error(String(lastNetworkError)));
  }

  // Any successful response means account/network is healthy again.
  if (response.ok && apiFailureCache.failureCount > 0) {
    resetApiFailureCache();
  }

  // Record failures and classify billing/rate-limit errors for smarter cooldown behavior
  if (!response.ok && (response.status === 400 || response.status === 402 || response.status === 429)) {
    let failureReason: 'network' | 'rate_limit' | 'billing' | 'other' = 'other';

    if (response.status === 429) {
      failureReason = 'rate_limit';
    } else {
      const errorData = await response.clone().json().catch(() => ({}));
      const errorMessage = String(errorData?.error?.message || '');
      if (isBillingIssueMessage(errorMessage) || response.status === 402) {
        failureReason = 'billing';
      }
    }

    recordApiFailure(failureReason);
  }

  return response;
}

export async function getClaudeResponse(
  conversationHistory: ChatMessage[]
): Promise<string> {
  const apiKey = getApiKey('atlas');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  try {
    // Use fetch API directly since Anthropic SDK may not work in React Native
    // Convert messages to the format expected by Claude API
    // Cap conversation history to prevent input token explosion
    const apiMessages = conversationHistory.slice(-MAX_CHAT_HISTORY).map((msg) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));

    // Try multiple models in order of preference
    const modelsToTry = [
      'claude-sonnet-4-5', // Claude Sonnet 4.5 (high quality)
      'claude-haiku-4-5-20251001', // Claude Haiku 4.5 (fallback)
    ];

    let lastError: Error | null = null;
    let response: Response | null = null;

    for (const model of modelsToTry) {
      try {
        const cachedSystemPrompt = [
          {
            type: 'text' as const,
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' as const },
          },
        ];
        response = await tryModel(apiKey, model, apiMessages, cachedSystemPrompt, 'calling');
        
        if (response.ok) {
          console.log(`✅ Successfully using model: ${model}`);
          break; // Success! Exit the loop
        } else if (response.status === 404) {
          console.log(`❌ Model ${model} not found (404), trying next...`);
          const errorData = await response.json().catch(() => ({}));
          lastError = new Error(`Model ${model} not available: ${errorData.error?.message || '404 Not Found'}`);
          continue; // Try next model
        } else {
          // Other error (401, 429, etc.) - don't try other models
          break;
        }
      } catch (error) {
        console.log(`❌ Error with model ${model}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue; // Try next model
      }
    }

    if (!response) {
      throw new Error('Failed to get response from any model. ' + (lastError?.message || ''));
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const fullError = JSON.stringify(errorData, null, 2);
      console.error('Claude API error response:', response.status);
      console.error('Error details:', fullError);
      
      if (response.status === 401) {
        throw new Error('API key is invalid. Please check your EXPO_PUBLIC_ANTHROPIC_API_KEY in .env file.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 400) {
        throw new Error(`Invalid request: ${errorData.error?.message || fullError || 'Please check your message format.'}`);
      }
      if (response.status === 404) {
        const errorMsg = errorData.error?.message || fullError || 'Model not found';
        throw new Error(`Model not found (404): ${errorMsg}. All models were tried. Please check if your API key has access to Claude models.`);
      }
      
      throw new Error(`API error (${response.status}): ${errorData.error?.message || fullError || 'Please try again.'}`);
    }

    const data = await response.json();
    
    // Extract the text content from the response
    const textContent = data.content?.find(
      (block: any) => block.type === 'text'
    ) as { type: 'text'; text: string } | undefined;

    if (!textContent || !textContent.text) {
      console.error('Unexpected response format:', data);
      throw new Error('No text content in Claude response');
    }

    return sanitizeModelOutput(stripAstrologyJargonFromText(textContent.text));
  } catch (error) {
    console.error('Error calling Claude API:', error);
    
    // Re-throw if it's already a user-friendly error
    if (error instanceof Error && error.message.includes('API key')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('API error')) {
      throw error;
    }
    
    // Provide helpful error messages for network errors
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      throw new Error(`Error: ${error.message}`);
    }
    
    throw new Error('Sorry, I encountered an error. Please try again.');
  }
}

export async function getAtlasChatResponse(
  conversationHistory: ChatMessage[],
  context?: AtlasChatContext
): Promise<string> {
  const apiKey = getApiKey('atlas');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  try {
    const resolvedGoalContext = await resolveAtlasGoalContext(context);
    const atlasSystemPrompt = buildAtlasSystemPrompt(resolvedGoalContext);

    // Convert messages to the format expected by Claude API
    // Cap conversation history to prevent input token explosion
    const apiMessages = conversationHistory.slice(-MAX_CHAT_HISTORY).map((msg) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));

    // Use Sonnet for high-quality responses
    const modelsToTry = [
      'claude-sonnet-4-5', // Claude Sonnet 4.5 (high quality)
      'claude-haiku-4-5-20251001', // Claude Haiku 4.5 (fallback)
    ];

    let lastError: Error | null = null;
    let response: Response | null = null;

    for (const model of modelsToTry) {
      try {
        const cachedSystemPrompt = [
          {
            type: 'text' as const,
            text: atlasSystemPrompt,
            cache_control: { type: 'ephemeral' as const },
          },
        ];
        response = await tryModel(apiKey, model, apiMessages, cachedSystemPrompt, 'atlas');
        
        if (response.ok) {
          console.log(`✅ Successfully using model: ${model}`);
          break; // Success! Exit the loop
        } else if (response.status === 404) {
          console.log(`❌ Model ${model} not found (404), trying next...`);
          const errorData = await response.json().catch(() => ({}));
          lastError = new Error(`Model ${model} not available: ${errorData.error?.message || '404 Not Found'}`);
          continue; // Try next model
        } else {
          // Other error (401, 429, etc.) - don't try other models
          break;
        }
      } catch (error) {
        console.log(`❌ Error with model ${model}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue; // Try next model
      }
    }

    if (!response) {
      throw new Error('Failed to get response from any model. ' + (lastError?.message || ''));
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const fullError = JSON.stringify(errorData, null, 2);
      console.error('Claude API error response:', response.status);
      console.error('Error details:', fullError);
      
      if (response.status === 401) {
        throw new Error('API key is invalid. Please check your EXPO_PUBLIC_ANTHROPIC_API_KEY in .env file.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 400) {
        throw new Error(`Invalid request: ${errorData.error?.message || fullError || 'Please check your message format.'}`);
      }
      if (response.status === 404) {
        const errorMsg = errorData.error?.message || fullError || 'Model not found';
        throw new Error(`Model not found (404): ${errorMsg}. All models were tried. Please check if your API key has access to Claude models.`);
      }
      
      throw new Error(`API error (${response.status}): ${errorData.error?.message || fullError || 'Please try again.'}`);
    }

    const data = await response.json();
    
    // Extract the text content from the response
    const textContent = data.content?.find(
      (block: any) => block.type === 'text'
    ) as { type: 'text'; text: string } | undefined;

    if (!textContent || !textContent.text) {
      console.error('Unexpected response format:', data);
      throw new Error('No text content in Claude response');
    }

    return sanitizeModelOutput(stripAstrologyJargonFromText(textContent.text));
  } catch (error) {
    console.error('Error calling Claude API for Atlas chat:', error);
    
    // Re-throw if it's already a user-friendly error
    if (error instanceof Error && error.message.includes('API key')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('API error')) {
      throw error;
    }
    
    // Provide helpful error messages for network errors
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      throw new Error(`Error: ${error.message}`);
    }
    
    throw new Error('Sorry, I encountered an error. Please try again.');
  }
}

// Personal astrological birth chart report generation
export interface PersonalAstrologyReport {
  sunSign: string;
  moonSign: string;
  risingSign: string;
  keyPlanetaryAspects: string[];
  housePlacements: string[];
  cosmicInsights: string; // Detailed personalized insights
}

export async function generatePersonalAstrologyReport(
  birthMonth: string,
  birthDate: string,
  birthYear: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string
): Promise<PersonalAstrologyReport> {
  const apiKey = getApiKey('astrology');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  // Format birth date
  const birthDateStr = `${birthMonth}/${birthDate}/${birthYear}`;
  let birthTimeStr = '';
  if (birthHour && birthMinute && birthPeriod) {
    birthTimeStr = ` at ${birthHour}:${birthMinute} ${birthPeriod}`;
  }
  const locationStr = birthCity ? ` in ${birthCity}` : '';

  // Calculate sun sign
  const month = parseInt(birthMonth);
  const day = parseInt(birthDate);
  let sunSign = '';
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) sunSign = 'Aries';
  else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) sunSign = 'Taurus';
  else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) sunSign = 'Gemini';
  else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) sunSign = 'Cancer';
  else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = 'Leo';
  else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = 'Virgo';
  else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) sunSign = 'Libra';
  else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) sunSign = 'Scorpio';
  else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) sunSign = 'Sagittarius';
  else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) sunSign = 'Capricorn';
  else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) sunSign = 'Aquarius';
  else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) sunSign = 'Pisces';

  const astrologyPrompt = `You are an expert astrologer. Generate a comprehensive personal birth chart analysis.

BIRTH INFORMATION:
- Birth Date: ${birthDateStr}${birthTimeStr}${locationStr}
- Birth Time: ${birthHour && birthMinute && birthPeriod ? `${birthHour}:${birthMinute} ${birthPeriod}` : 'Not provided'}
- Birth Location: ${birthCity || 'Not provided'}

Based on this birth information, generate a detailed personal astrological birth chart report. Include:

1. SUN SIGN: ${sunSign} (already calculated)
2. MOON SIGN: Determine the moon sign based on the birth date, time, and location. The moon sign reveals emotional nature and inner needs.
3. RISING SIGN (ASCENDANT): Determine the rising sign based on birth time and location. This shows how the person presents to the world.
4. KEY PLANETARY ASPECTS: Identify 3-5 significant planetary aspects (conjunctions, squares, trines, oppositions) that shape personality and life path.
5. HOUSE PLACEMENTS: Identify 3-5 key planetary house placements that influence life areas (e.g., "Venus in 6th house of service", "Mars in 10th house of career").
6. COSMIC INSIGHTS: Provide 2-3 paragraphs of personalized insights explaining how these astrological elements combine to create this person's unique cosmic blueprint. Focus on personality traits, natural tendencies, life themes, and how the planetary energies interact.

IMPORTANT:
- If birth time is not provided, estimate moon sign and rising sign based on typical placements for the birth date, but note this is approximate.
- If birth location is not provided, use general astrological knowledge but note limitations.
- Make the insights feel deeply personal and specific to this birth chart, not generic sun sign descriptions.
- Connect how different planetary placements interact and influence each other.

OUTPUT FORMAT (JSON only):
{
  "sunSign": "${sunSign}",
  "moonSign": "calculated moon sign",
  "risingSign": "calculated rising sign",
  "keyPlanetaryAspects": [
    "aspect 1 description",
    "aspect 2 description",
    "aspect 3 description"
  ],
  "housePlacements": [
    "placement 1 description",
    "placement 2 description",
    "placement 3 description"
  ],
  "cosmicInsights": "2-3 paragraphs of personalized insights explaining how these elements combine"
}

Return ONLY valid JSON, no markdown, no code blocks, no explanations.`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: astrologyPrompt,
      },
    ];

    const response = await tryModel(apiKey, 'claude-sonnet-4-5', apiMessages, 'You are an expert astrologer who provides detailed, personalized birth chart analyses.', 2000, 'astrology');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const textContent = data.content?.find(
      (block: any) => block.type === 'text'
    ) as { type: 'text'; text: string } | undefined;

    if (!textContent || !textContent.text) {
      console.error('No text content in astrology report response:', JSON.stringify(data, null, 2));
      throw new Error('No text content in Claude response');
    }

    console.log('[Astrology Report] Raw response length:', textContent.text.length);
    console.log('[Astrology Report] Raw response preview:', textContent.text.substring(0, 300));
    
    // Check if response might be truncated (less than 500 chars is suspicious for a full report)
    if (textContent.text.length < 500) {
      console.warn('[Astrology Report] Response seems unusually short, might be truncated. Length:', textContent.text.length);
    }

    // Parse JSON response
    let cleanedResponse = textContent.text.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '').trim();
    }

    // Helper function to extract JSON object from text
    const extractJSON = (text: string): string | null => {
      // First, try to find complete JSON object by matching braces
      let braceCount = 0;
      let startIndex = -1;
      
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
          if (startIndex === -1) startIndex = i;
          braceCount++;
        } else if (text[i] === '}') {
          braceCount--;
          if (braceCount === 0 && startIndex !== -1) {
            const extracted = text.substring(startIndex, i + 1);
            console.log('[Astrology Report] Extracted JSON length:', extracted.length);
            return extracted;
          }
        }
      }
      
      // If no complete JSON found, try regex as fallback
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('[Astrology Report] Found JSON via regex, length:', jsonMatch[0].length);
        return jsonMatch[0];
      }
      
      console.log('[Astrology Report] No JSON found. Text preview:', text.substring(0, 200));
      return null;
    };

    // Try to extract JSON from the response if it's wrapped in text
    let parsed: any;
    try {
      // First, try parsing the cleaned response directly
      parsed = JSON.parse(cleanedResponse);
    } catch (firstParseError) {
      // If that fails, try to extract JSON object from the text
      const jsonString = extractJSON(cleanedResponse);
      if (jsonString) {
        try {
          parsed = JSON.parse(jsonString);
        } catch (secondParseError) {
          console.error('Failed to parse extracted JSON:', jsonString.substring(0, 500));
          console.error('Parse error:', secondParseError);
          // Try one more time with a more lenient approach - find the first complete JSON object
          const firstBrace = cleanedResponse.indexOf('{');
          if (firstBrace !== -1) {
            let braceCount = 0;
            let endIndex = -1;
            for (let i = firstBrace; i < cleanedResponse.length; i++) {
              if (cleanedResponse[i] === '{') braceCount++;
              if (cleanedResponse[i] === '}') braceCount--;
              if (braceCount === 0) {
                endIndex = i;
                break;
              }
            }
            if (endIndex !== -1) {
              try {
                parsed = JSON.parse(cleanedResponse.substring(firstBrace, endIndex + 1));
              } catch (thirdParseError) {
                console.error('All JSON parsing attempts failed. Response preview:', cleanedResponse.substring(0, 500));
                throw new Error(`Failed to parse astrology report JSON: ${thirdParseError instanceof Error ? thirdParseError.message : 'Unknown error'}`);
              }
            } else {
              throw new Error(`Failed to parse astrology report JSON: ${secondParseError instanceof Error ? secondParseError.message : 'Unknown error'}`);
            }
          } else {
            throw new Error(`Failed to parse astrology report JSON: ${secondParseError instanceof Error ? secondParseError.message : 'Unknown error'}`);
          }
        }
      } else {
        console.error('No JSON object found in astrology report response:', cleanedResponse.substring(0, 500));
        throw new Error('No valid JSON found in astrology report response');
      }
    }
    
    // Validate parsed data
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON structure in astrology report');
    }
    
    return sanitizeModelOutput({
      sunSign: parsed.sunSign || sunSign,
      moonSign: parsed.moonSign || 'Unknown',
      risingSign: parsed.risingSign || 'Unknown',
      keyPlanetaryAspects: Array.isArray(parsed.keyPlanetaryAspects) ? parsed.keyPlanetaryAspects : [],
      housePlacements: Array.isArray(parsed.housePlacements) ? parsed.housePlacements : [],
      cosmicInsights: parsed.cosmicInsights || `As a ${sunSign}, you have natural strengths and tendencies aligned with your sun sign.`,
    });
  } catch (error) {
    console.error('Error generating personal astrology report:', error);
    // Return fallback with sun sign only
    return sanitizeModelOutput({
      sunSign,
      moonSign: 'Unknown',
      risingSign: 'Unknown',
      keyPlanetaryAspects: [],
      housePlacements: [],
      cosmicInsights: `As a ${sunSign}, you have natural strengths and tendencies aligned with your sun sign.`,
    });
  }
}

// Personalized daily cosmic insight generation
export interface PersonalizedDailyInsightParams {
  userName?: string;
  language?: 'en' | 'ru';
  birthMonth: string;
  birthDate: string;
  birthYear: string;
  birthCity?: string;
  birthHour?: string;
  birthMinute?: string;
  birthPeriod?: string;
  birthLatitude?: number;
  birthLongitude?: number;
  birthTimezone?: string;
  currentTimezone?: string;
  birthChart?: PersonalAstrologyReport; // Full birth chart if available
  goals?: Array<{ title: string }>;
  ikigaiData?: {
    whatYouLove?: string;
    whatYouGoodAt?: string;
    whatWorldNeeds?: string;
    whatCanBePaidFor?: string;
  };
  lifeContext?: {
    currentSituation?: string;
    biggestConstraint?: string;
    whatMattersMost?: string[];
  };
}

// Astrology report generation (daily reports) - generic version for shared caching
export async function generateAstrologyReport(
  birthMonth: string,
  birthDate: string,
  birthYear: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string
): Promise<string> {
  const apiKey = getApiKey('astrology');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  // Format birth date
  const birthDateStr = `${birthMonth}/${birthDate}/${birthYear}`;
  let birthTimeStr = '';
  if (birthHour && birthMinute && birthPeriod) {
    birthTimeStr = ` at ${birthHour}:${birthMinute} ${birthPeriod}`;
  }
  const locationStr = birthCity ? ` in ${birthCity}` : '';

  // Get today's date
  const today = new Date();
  const todayDateStr = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Calculate sun sign from birth date
  const month = parseInt(birthMonth);
  const day = parseInt(birthDate);
  let sunSign = '';
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) sunSign = 'Aries';
  else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) sunSign = 'Taurus';
  else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) sunSign = 'Gemini';
  else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) sunSign = 'Cancer';
  else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = 'Leo';
  else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = 'Virgo';
  else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) sunSign = 'Libra';
  else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) sunSign = 'Scorpio';
  else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) sunSign = 'Sagittarius';
  else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) sunSign = 'Capricorn';
  else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) sunSign = 'Aquarius';
  else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) sunSign = 'Pisces';

  console.log('🔮 Astrology Report Generation');
  console.log('📅 Birth Date:', birthDateStr);
  console.log('⏰ Birth Time:', birthTimeStr || 'not provided');
  console.log('📍 Birth Location:', locationStr || 'not provided');
  console.log('☀️ Calculated Sun Sign:', sunSign);

  const astrologyPrompt = `You are an expert astrologer. Today is ${todayDateStr}.

Generate a daily cosmic insight report for TODAY (maximum 300 words) for someone with Sun sign ${sunSign}.

IMPORTANT: This report will be shared by all users with Sun sign ${sunSign}, so make it relevant and meaningful for anyone with this sign:
- Focus on the Sun sign ${sunSign} and its general characteristics
- Consider current planetary transits affecting ${sunSign} energy TODAY
- Provide insights that resonate with ${sunSign} traits and tendencies
- Make it applicable to anyone with this Sun sign, not specific to individual birth charts

Provide insights based on:
1. The ${sunSign} Sun sign's core traits and energy
2. Current planetary transits affecting ${sunSign} energy TODAY
3. How today's cosmic energies interact with ${sunSign} characteristics

Provide a concise daily report for TODAY (${todayDateStr}) with the following structure. Start with the date as a heading, then include these sections:

HEADING: ${todayDateStr}

SECTION: What to Focus On Today
- Main opportunities and priorities for today based on current planetary transits affecting ${sunSign} energy

SECTION: What to Be Cautious Of
- Things to watch out for or be mindful of today based on challenging transits for ${sunSign}

SECTION: Daily Tips
- Practical advice and guidance for navigating today that resonates with ${sunSign} characteristics

Format requirements:
- Start with "${todayDateStr}" as a heading
- Use "What to Focus On Today", "What to Be Cautious Of", and "Daily Tips" as section headings
- Keep it to exactly 300 words or less
- Make it warm, encouraging, and practical
- Reference the ${sunSign} Sun sign and its general traits
- Focus on TODAY's specific insights (${todayDateStr}) rather than general personality traits
- Make it relevant for anyone with Sun sign ${sunSign}, using "you" language that feels personal but applies broadly`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: astrologyPrompt,
      },
    ];

    // Use Haiku for astrology reports
    const modelsToTry = [
      MODEL_HAIKU, // Claude Haiku 4.5 (cost-effective)
      MODEL_HAIKU, // Claude Haiku 4.5 (fallback)
    ];

    let lastError: Error | null = null;
    let response: Response | null = null;

    for (const model of modelsToTry) {
      try {
        response = await tryModel(apiKey, model, apiMessages, 'You are an expert astrologer who provides insightful, sign-based daily astrology reports that are relevant for anyone with a given Sun sign.', 512, 'astrology');
        
        if (response.ok) {
          console.log(`✅ Successfully generated astrology report using model: ${model}`);
          break;
        } else if (response.status === 404) {
          console.log(`❌ Model ${model} not found (404), trying next...`);
          const errorData = await response.json().catch(() => ({}));
          lastError = new Error(`Model ${model} not available: ${errorData.error?.message || '404 Not Found'}`);
          continue;
        } else {
          break;
        }
      } catch (error) {
        console.log(`❌ Error with model ${model}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    if (!response) {
      throw new Error('Failed to get response from any model. ' + (lastError?.message || ''));
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const fullError = JSON.stringify(errorData, null, 2);
      console.error('Claude API error response:', response.status);
      console.error('Error details:', fullError);
      
      if (response.status === 401) {
        throw new Error('API key is invalid. Please check your EXPO_PUBLIC_ANTHROPIC_API_KEY in .env file.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 400) {
        throw new Error(`Invalid request: ${errorData.error?.message || fullError || 'Please check your message format.'}`);
      }
      
      throw new Error(`API error (${response.status}): ${errorData.error?.message || fullError || 'Please try again.'}`);
    }

    const data = await response.json();
    
    const textContent = data.content?.find(
      (block: any) => block.type === 'text'
    ) as { type: 'text'; text: string } | undefined;

    if (!textContent || !textContent.text) {
      console.error('Unexpected response format:', data);
      throw new Error('No text content in Claude response');
    }

    return sanitizeModelOutput(textContent.text);
  } catch (error) {
    console.error('Error generating astrology report:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('API error')) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      throw new Error(`Error: ${error.message}`);
    }
    
    throw new Error('Sorry, I encountered an error generating your astrology report. Please try again.');
  }
}

// NEW: Personalized daily cosmic insight generation
export async function generatePersonalizedDailyInsight(
  params: PersonalizedDailyInsightParams
): Promise<string> {
  const apiKey = getApiKey('daily');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  const {
    userName,
    language,
    birthMonth,
    birthDate,
    birthYear,
    birthHour,
    birthMinute,
    birthPeriod,
    birthLatitude,
    birthLongitude,
    birthTimezone,
    currentTimezone,
    goals,
    ikigaiData,
    lifeContext,
  } = params;

  const outputLanguage: 'en' | 'ru' =
    language === 'ru' || i18n.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';

  const monthPadded = birthMonth.padStart(2, '0');
  const dayPadded = birthDate.padStart(2, '0');
  const birthDateIso = `${birthYear}-${monthPadded}-${dayPadded}`;
  const hourRaw = Number.parseInt(birthHour || '', 10);
  const minuteRaw = Number.parseInt(birthMinute || '', 10);
  const minutePadded = Number.isFinite(minuteRaw) ? String(minuteRaw).padStart(2, '0') : '00';
  const hasAmPm = birthPeriod === 'AM' || birthPeriod === 'PM';
  const computedHour24 = Number.isFinite(hourRaw)
    ? hasAmPm
      ? (() => {
          if (birthPeriod === 'AM') return hourRaw === 12 ? 0 : hourRaw;
          return hourRaw === 12 ? 12 : hourRaw + 12;
        })()
      : Math.max(0, Math.min(23, hourRaw))
    : 12;
  const birthTimeForApi = `${String(computedHour24).padStart(2, '0')}:${minutePadded}`;

  const hasCoordinates =
    typeof birthLatitude === 'number' &&
    Number.isFinite(birthLatitude) &&
    typeof birthLongitude === 'number' &&
    Number.isFinite(birthLongitude);

  if (hasCoordinates) {
    console.log('[Astrology API] Prepared inputs from profile:', {
      birthDateIso,
      birthTimeForApi,
      birthLatitude,
      birthLongitude,
      birthTimezone,
    });
  } else {
    console.log('[Astrology API] Skipping API call because coordinates are missing:', {
      birthDateIso,
      birthTimeForApi,
      birthLatitude,
      birthLongitude,
      birthTimezone,
    });
  }

  let astrologyData: Awaited<ReturnType<typeof fetchDailyAstrologyData>> | null = null;
  if (hasCoordinates) {
    console.log('CALLING ASTROLOGY API');
    astrologyData = await fetchDailyAstrologyData(
      birthDateIso,
      birthTimeForApi,
      birthLatitude as number,
      birthLongitude as number,
      birthTimezone
    );
    console.log('ASTROLOGY RESPONSE', astrologyData);
  }

  const goalsList =
    goals && goals.length > 0
      ? goals
          .map((goal) => goal.title?.trim())
          .filter(Boolean)
          .join('\n')
      : outputLanguage === 'ru'
        ? 'Цели пока не заданы.'
        : 'No goals set yet.';

  const ikigaiSection = ikigaiData
    ? `
IKIGAI / CALLING CONTEXT:
- What they love: ${ikigaiData.whatYouLove || 'Not provided'}
- What they are good at: ${ikigaiData.whatYouGoodAt || 'Not provided'}
- What the world needs: ${ikigaiData.whatWorldNeeds || 'Not provided'}
- What can be paid for: ${ikigaiData.whatCanBePaidFor || 'Not provided'}`
    : '';

  const lifeContextSection = lifeContext
    ? `
CURRENT LIFE CONTEXT:
- Current situation: ${lifeContext.currentSituation || 'Not provided'}
- Biggest constraint: ${lifeContext.biggestConstraint || 'Not provided'}
- What matters most: ${
        lifeContext.whatMattersMost && lifeContext.whatMattersMost.length > 0
          ? lifeContext.whatMattersMost.join(', ')
          : 'Not provided'
      }`
    : '';

  const russianPromptAddition = outputLanguage === 'ru'
    ? `
Write the entire response in Russian. Use warm, supportive language. Section titles in Russian:
- Твой Космический Щит на Сегодня
- Что Вселенная Хочет, Чтобы Ты Знал(а)
- Твои Защищённые Окна
- Мягкое Завершение Вечера
- Твой Якорь на Сегодня`
    : '';

  const todayLocalKey = (() => {
    try {
      const tz = currentTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  })();

  const personalizedPrompt = `
You are a protective, caring guide helping someone navigate their day. You have access to real astronomical data about how today's sky affects this specific person.

${astrologyData?.summaryForClaude || 'No specific transit data available.'}

USER'S CURRENT GOALS:
${goalsList}
${ikigaiSection}${lifeContextSection}
PERSON NAME: ${userName || 'Not provided'}
TODAY (user local date): ${todayLocalKey}

CRITICAL RULES:
- NEVER use astrology jargon (no "Mercury", "Venus", "natal", "transit", "square", "opposition", "conjunct", etc.)
- ONLY write about feelings, behaviors, thoughts, and practical advice
- Write like a caring friend who happens to know what kind of day they are going to have
- Be specific and protective, not vague
- Make them feel safe and prepared
- Make this guidance specific to TODAY and avoid reusing generic wording from prior days

Write the daily insight in these 5 sections:

---

Your Cosmic Shield for Today
(3-4 sentences. Describe how they will FEEL today - their mind, emotions, energy. What is the overall vibe? Make them feel seen and protected. End with something reassuring.)

What the Universe Wants You to Know
(3-4 sentences. Warn them gently about challenges - irritability, overthinking, relationship tension, impulsive decisions. Frame it as awareness, not fear. Tell them specifically what to avoid doing today.)

Your Protected Windows
(Give 3 time windows with 1 sentence each:)
- Morning: [what to do or avoid]
- Midday: [what to do or avoid]
- Evening: [what to do or avoid]

Tonight's Gentle Landing
(2 sentences. A soft wind-down prompt. A question to reflect on or permission to let go. Nurturing tone.)

Your Anchor for Today
(One short mantra/affirmation that matches today's energy. No astrology words. Something they can repeat when feeling anxious.)

---

Remember: Translate the planetary data into HUMAN EXPERIENCES. Never mention planets.${russianPromptAddition}
`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: personalizedPrompt,
      },
    ];

    // Use Sonnet for personalized reports (higher quality needed)
    const modelsToTry = [
      'claude-sonnet-4-5',
      'claude-haiku-4-5-20251001', // Fallback
    ];

    let lastError: Error | null = null;
    let response: Response | null = null;

    for (const model of modelsToTry) {
      try {
        response = await tryModel(
          apiKey,
          model,
          apiMessages,
          'You provide straightforward daily guidance that is personal, practical, and predictive. Avoid technical astrology jargon and keep language clear and grounded.',
          2000,
          'daily'
        );
        
        if (response.ok) {
          console.log(`✅ Successfully generated personalized daily insight using model: ${model}`);
          break;
        } else if (response.status === 404) {
          console.log(`❌ Model ${model} not found (404), trying next...`);
          const errorData = await response.json().catch(() => ({}));
          lastError = new Error(`Model ${model} not available: ${errorData.error?.message || '404 Not Found'}`);
          continue;
        } else {
          break;
        }
      } catch (error) {
        console.log(`❌ Error with model ${model}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    if (!response) {
      throw new Error('Failed to get response from any model. ' + (lastError?.message || ''));
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const fullError = JSON.stringify(errorData, null, 2);
      console.error('Claude API error response:', response.status);
      console.error('Error details:', fullError);
      
      if (response.status === 401) {
        throw new Error('API key is invalid. Please check your EXPO_PUBLIC_ANTHROPIC_API_KEY in .env file.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 400) {
        throw new Error(`Invalid request: ${errorData.error?.message || fullError || 'Please check your message format.'}`);
      }
      
      throw new Error(`API error (${response.status}): ${errorData.error?.message || fullError || 'Please try again.'}`);
    }

    const data = await response.json();
    
    const textContent = data.content?.find(
      (block: any) => block.type === 'text'
    ) as { type: 'text'; text: string } | undefined;

    if (!textContent || !textContent.text) {
      console.error('Unexpected response format:', data);
      throw new Error('No text content in Claude response');
    }

    return sanitizeModelOutput(textContent.text);
  } catch (error) {
    console.error('Error generating personalized daily insight:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('API error')) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      throw new Error(`Error: ${error.message}`);
    }
    
    throw new Error('Sorry, I encountered an error generating your personalized daily insight. Please try again.');
  }
}

// Ikigai conclusion structure
export interface IkigaiConclusion {
  callingType: string; // 1-3 word conclusion about calling type
  pathReport: string; // Comprehensive report about the best path forward
}

// Generate Ikigai conclusion based on user's four answers
export async function generateIkigaiConclusion(
  whatYouLove: string,
  whatYouGoodAt: string,
  whatWorldNeeds: string,
  whatCanBePaidFor: string,
  locale: 'en' | 'ru' = 'en'
): Promise<IkigaiConclusion> {
  const apiKey = getApiKey('ikigai');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  const outputLanguageInstruction =
    locale === 'ru'
      ? 'IMPORTANT: Write the entire response in Russian.'
      : 'IMPORTANT: Write the entire response in English.';

  const ikigaiPrompt = `You are a wise life coach and Ikigai expert. Based on a person's answers to the four dimensions of Ikigai, provide a personalized, insightful conclusion about their path and calling.

The person's answers:
- What they love: "${whatYouLove}"
- What they're good at: "${whatYouGoodAt}"
- What the world needs: "${whatWorldNeeds}"
- What they can be paid for: "${whatCanBePaidFor}"

Analyze the intersection of these four dimensions and provide your response in EXACTLY this format:

CALLING_TYPE: [Provide a concise 1-3 word conclusion about what type of calling awaits this person. Examples: "Creative Visionary", "Healing Guide", "Innovation Catalyst", "Community Builder", "Artistic Mentor", "Tech Pioneer", etc. Be specific and capture their unique essence. Never use asterisks "**" - write in plain text only.]

PATH_REPORT: [Provide a comprehensive, detailed report (500-700 words) about the best path forward for this person. Include:
1. A clear analysis of how their four Ikigai dimensions intersect
2. What specific calling and life path awaits them
3. Concrete opportunities that emerge from this intersection
4. Practical, actionable steps they can take to align their life with their Ikigai
5. How their passion, skills, purpose, and value create unique opportunities
6. What challenges they might face and how to overcome them
7. Long-term vision for their path

Write in a warm, encouraging, and insightful tone. Be specific and reference their actual answers. Make it comprehensive and actionable.

CRITICAL: Never use asterisks "**" for formatting, emphasis, or any other purpose. Do not use markdown bold syntax or any asterisks in your response. Write in plain text only.];

IMPORTANT: Your response must start with "DESTINY_TYPE:" followed by the 1-3 word conclusion, then "PATH_REPORT:" followed by the comprehensive report. Never use asterisks "**" anywhere in your response.

${outputLanguageInstruction}`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: ikigaiPrompt,
      },
    ];

    // Try multiple models in order of preference
    const modelsToTry = [
      'claude-sonnet-4-5', // Claude Sonnet 4.5 (high quality)
      'claude-haiku-4-5-20251001', // Claude Haiku 4.5 (fallback)
    ];

    let lastError: Error | null = null;
    let response: Response | null = null;

    for (const model of modelsToTry) {
      try {
        response = await tryModel(apiKey, model, apiMessages, 'You are a wise life coach and Ikigai expert who provides insightful, personalized guidance about life purpose and destiny.', 512, 'ikigai');
        
        if (response.ok) {
          console.log(`✅ Successfully generated Ikigai conclusion using model: ${model}`);
          break;
        } else if (response.status === 404) {
          console.log(`❌ Model ${model} not found (404), trying next...`);
          const errorData = await response.json().catch(() => ({}));
          lastError = new Error(`Model ${model} not available: ${errorData.error?.message || '404 Not Found'}`);
          continue;
        } else {
          break;
        }
      } catch (error) {
        console.log(`❌ Error with model ${model}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    if (!response) {
      throw new Error('Failed to get response from any model. ' + (lastError?.message || ''));
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const fullError = JSON.stringify(errorData, null, 2);
      console.error('Claude API error response:', response.status);
      console.error('Error details:', fullError);
      
      if (response.status === 401) {
        throw new Error('API key is invalid. Please check your EXPO_PUBLIC_ANTHROPIC_API_KEY in .env file.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 400) {
        throw new Error(`Invalid request: ${errorData.error?.message || fullError || 'Please check your message format.'}`);
      }
      
      throw new Error(`API error (${response.status}): ${errorData.error?.message || fullError || 'Please try again.'}`);
    }

    const data = await response.json();
    
    const textContent = data.content?.find(
      (block: any) => block.type === 'text'
    ) as { type: 'text'; text: string } | undefined;

    if (!textContent || !textContent.text) {
      console.error('Unexpected response format:', data);
      throw new Error('No text content in Claude response');
    }

    // Parse the response to extract CALLING_TYPE and PATH_REPORT
    const responseText = sanitizeModelOutput(textContent.text);
    const callingTypeMatch = responseText.match(/CALLING_TYPE:\s*(.+?)(?:\n|PATH_REPORT:)/s);
    const pathReportMatch = responseText.match(/PATH_REPORT:\s*(.+?)(?:\n\n|$)/s) || responseText.match(/PATH_REPORT:\s*(.+)/s);
    
    const callingType = callingTypeMatch 
      ? callingTypeMatch[1].trim().replace(/\n/g, ' ').substring(0, 50) // Limit to reasonable length
      : 'Your Calling';
    
    const pathReport = pathReportMatch 
      ? pathReportMatch[1].trim()
      : responseText; // Fallback to full response if parsing fails

    return sanitizeModelOutput({
      callingType,
      pathReport,
    });
  } catch (error) {
    console.error('Error generating Ikigai conclusion:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('API error')) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      throw new Error(`Error: ${error.message}`);
    }
    
    throw new Error('Sorry, I encountered an error generating your Ikigai conclusion. Please try again.');
  }
}

// User answer analysis report
export interface UserAnswer {
  date: string;
  question: string;
  answer: string;
  mood?: string; // 'progress' | 'finding' | 'stuck'
}

export async function generateUserAnalysisReport(
  answers: UserAnswer[]
): Promise<string> {
  const apiKey = getApiKey('analysis');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  if (!answers || answers.length === 0) {
    return 'You haven\'t answered any questions yet. Start answering daily questions to get personalized insights!';
  }

  // Format answers for the prompt
  const answersText = answers.map((answer, index) => {
    const moodText = answer.mood 
      ? `\nMood: ${answer.mood === 'progress' ? 'Making progress' : answer.mood === 'finding' ? 'Finding my way' : 'Feeling stuck'}`
      : '';
    return `Date: ${answer.date}${moodText}\nAnswer: "${answer.answer}"`;
  }).join('\n\n---\n\n');

  const analysisPrompt = `You are a compassionate life coach and personal growth expert. Analyze a user's daily answers to understand their patterns, growth, and areas for improvement.

The user has been answering two types of questions daily:
1. "What does the day of an ideal version of you looks like?" (Answer of the Day)
2. "How is it going today?" (Mood check: Making progress / Finding my way / Feeling stuck)

Here are their answers:

${answersText}

Please provide a comprehensive analysis report (400-600 words) that includes:

1. **Patterns & Insights**: What patterns do you notice in their answers? What themes emerge?
2. **Growth Areas**: What areas show growth or positive change over time?
3. **Challenges**: What challenges or obstacles seem to be recurring?
4. **Mood Patterns**: How do their mood responses correlate with their answers? What does this tell us?
5. **Actionable Advice**: Provide 3-5 specific, actionable recommendations for how they can improve and continue growing
6. **Encouragement**: End with warm, encouraging words that acknowledge their journey

Write in a warm, supportive, and non-judgmental tone. Be specific and reference their actual answers. Focus on actionable insights that will help them grow.`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: analysisPrompt,
      },
    ];

    // Try multiple models in order of preference
    const modelsToTry = [
      'claude-sonnet-4-5', // Claude Sonnet 4.5 (high quality)
      'claude-haiku-4-5-20251001', // Claude Haiku 4.5 (fallback)
    ];

    let lastError: Error | null = null;
    let response: Response | null = null;

    for (const model of modelsToTry) {
      try {
        response = await tryModel(apiKey, model, apiMessages, 'You are a compassionate life coach and personal growth expert who provides insightful, personalized analysis and guidance.', 512, 'analysis');
        
        if (response.ok) {
          console.log(`✅ Successfully generated analysis report using model: ${model}`);
          break;
        } else if (response.status === 404) {
          console.log(`❌ Model ${model} not found (404), trying next...`);
          const errorData = await response.json().catch(() => ({}));
          lastError = new Error(`Model ${model} not available: ${errorData.error?.message || '404 Not Found'}`);
          continue;
        } else {
          break;
        }
      } catch (error) {
        console.log(`❌ Error with model ${model}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    if (!response) {
      throw new Error('Failed to get response from any model. ' + (lastError?.message || ''));
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const fullError = JSON.stringify(errorData, null, 2);
      console.error('Claude API error response:', response.status);
      console.error('Error details:', fullError);
      
      if (response.status === 401) {
        throw new Error('API key is invalid. Please check your EXPO_PUBLIC_ANTHROPIC_API_KEY in .env file.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 400) {
        throw new Error(`Invalid request: ${errorData.error?.message || fullError || 'Please check your message format.'}`);
      }
      
      throw new Error(`API error (${response.status}): ${errorData.error?.message || fullError || 'Please try again.'}`);
    }

    const data = await response.json();
    
    const textContent = data.content?.find(
      (block: any) => block.type === 'text'
    ) as { type: 'text'; text: string } | undefined;

    if (!textContent || !textContent.text) {
      console.error('Unexpected response format:', data);
      throw new Error('No text content in Claude response');
    }

    return sanitizeModelOutput(textContent.text);
  } catch (error) {
    console.error('Error generating analysis report:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('API error')) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      throw new Error(`Error: ${error.message}`);
    }
    
    throw new Error('Sorry, I encountered an error generating your analysis report. Please try again.');
  }
}

export interface GeneratedPath {
  id: number;
  title: string;
  description: string;
  glowColor: string; // Color for the glow effect
}

export async function generateCallingPaths(
  birthMonth?: string,
  birthDate?: string,
  birthYear?: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string,
  whatYouLove?: string,
  whatYouGoodAt?: string,
  whatWorldNeeds?: string,
  whatCanBePaidFor?: string,
  fear?: string,
  whatExcites?: string
): Promise<GeneratedPath[]> {
  const apiKey = getApiKey('calling');
  const isRussianLocale = i18n.language?.toLowerCase().startsWith('ru');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  // Format birth date and time (handle empty values gracefully)
  const birthDateStr = (birthMonth && birthDate && birthYear) 
    ? `${birthMonth}/${birthDate}/${birthYear}` 
    : 'Not provided';
  let birthTimeStr = '';
  if (birthHour && birthMinute && birthPeriod) {
    birthTimeStr = ` at ${birthHour}:${birthMinute} ${birthPeriod}`;
  }
  const locationStr = birthCity ? ` in ${birthCity}` : '';

  // Calculate sun sign (handle empty values gracefully)
  const month = birthMonth ? parseInt(birthMonth) : 0;
  const day = birthDate ? parseInt(birthDate) : 0;
  const hasSunSign = month > 0 && day > 0;
  let sunSign = '';
  
  if (hasSunSign) {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) sunSign = 'Aries';
    else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) sunSign = 'Taurus';
    else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) sunSign = 'Gemini';
    else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) sunSign = 'Cancer';
    else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = 'Leo';
    else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = 'Virgo';
    else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) sunSign = 'Libra';
    else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) sunSign = 'Scorpio';
    else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) sunSign = 'Sagittarius';
    else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) sunSign = 'Capricorn';
    else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) sunSign = 'Aquarius';
    else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) sunSign = 'Pisces';
  }

  const toPathTitle = (value: string | undefined, fallback: string): string => {
    const normalized = String(value || '')
      .replace(/["'.,!?;:()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return fallback;
    return normalized
      .split(' ')
      .slice(0, 4)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const fallbackPathA = toPathTitle(
    whatExcites || whatYouLove,
    isRussianLocale ? 'Творческий вектор' : 'Creative Direction'
  );
  const fallbackPathB = toPathTitle(
    whatYouGoodAt || whatCanBePaidFor,
    isRussianLocale ? 'Сильные навыки' : 'Core Strength Path'
  );
  const fallbackPathC = toPathTitle(
    whatWorldNeeds || fear,
    isRussianLocale ? 'Ценный вклад' : 'Meaningful Impact'
  );

  const personalizedFallbackPaths: GeneratedPath[] = isRussianLocale
    ? [
        {
          id: 1,
          title: fallbackPathA,
          description: `Развивай "${fallbackPathA}" через ясные ежедневные шаги.`,
          glowColor: '#cdbad8',
        },
        {
          id: 2,
          title: fallbackPathB,
          description: `Опирайся на свои сильные стороны в "${fallbackPathB}".`,
          glowColor: '#baccd7',
        },
        {
          id: 3,
          title: fallbackPathC,
          description: `В "${fallbackPathC}" ты сможешь приносить реальную пользу.`,
          glowColor: '#a6a76c',
        },
      ]
    : [
        {
          id: 1,
          title: fallbackPathA,
          description: `Develop "${fallbackPathA}" through clear daily action.`,
          glowColor: '#cdbad8',
        },
        {
          id: 2,
          title: fallbackPathB,
          description: `Use your strongest abilities in "${fallbackPathB}".`,
          glowColor: '#baccd7',
        },
        {
          id: 3,
          title: fallbackPathC,
          description: `Create practical value for others in "${fallbackPathC}".`,
          glowColor: '#a6a76c',
        },
      ];

  // Build prompt conditionally based on available data
  const sunSignSection = hasSunSign 
    ? `- Sun Sign: ${sunSign}`
    : `- Sun Sign: Not provided (birth date information unavailable)`;

  const pathsPrompt = `You are an expert astrologer and career counselor. Generate 3 personalized career/life paths for a person based on their complete profile.

PERSONAL INFORMATION:
- Birth Date: ${birthDateStr}${birthTimeStr}${locationStr}
${sunSignSection}
${birthTimeStr ? `- Birth Time: ${birthHour}:${birthMinute} ${birthPeriod}` : '- Birth Time: Not provided'}
${locationStr ? `- Birth Location: ${birthCity}` : '- Birth Location: Not provided'}

IKIGAI RESPONSES (What gives their life meaning and purpose):
${whatYouLove ? `- What they love: ${whatYouLove}` : '- What they love: Not provided'}
${whatYouGoodAt ? `- What they are good at: ${whatYouGoodAt}` : '- What they are good at: Not provided'}
${whatWorldNeeds ? `- What the world needs: ${whatWorldNeeds}` : '- What the world needs: Not provided'}
${whatCanBePaidFor ? `- What can be paid for: ${whatCanBePaidFor}` : '- What can be paid for: Not provided'}

FEARS AND MOTIVATIONS:
${fear ? `- Their fear: ${fear}` : '- Their fear: Not provided'}
${whatExcites ? `- What excites them: ${whatExcites}` : '- What excites them: Not provided'}

INSTRUCTIONS:
Generate exactly 3 distinct career/life paths that align with their destiny. Each path should:
- Be specific, actionable, and personalized
${hasSunSign ? `- Consider their Sun sign (${sunSign}), ` : '- Focus primarily on '}their Ikigai responses, fears, and excitements
- Be inspiring and aligned with their true purpose
- Each path must connect to their Ikigai answers: what they love (${whatYouLove || 'not provided'}), what they're good at (${whatYouGoodAt || 'not provided'}), what the world needs (${whatWorldNeeds || 'not provided'}), and what can be paid for (${whatCanBePaidFor || 'not provided'})

OUTPUT FORMAT (JSON only, no other text):
Return a JSON array with exactly 3 objects. Each object must have:
- "title": A short, compelling title for the path (max 50 characters)
- "description": A concise description explaining why this path aligns with their destiny (max 100 characters)
- "glowColor": One of these colors: "#cdbad8" (dusty rose), "#baccd7" (soft blue), "#a6a76c" (sage green)

Example format:
[
  {
    "title": "Creative Writing and Content",
    "description": "Your Aries energy and love for words align perfectly with creative expression that inspires others.",
    "glowColor": "#cdbad8"
  },
  {
    "title": "Performance and Speaking",
    "description": "Your natural charisma and ability to connect make you a powerful voice on stage and in front of people.",
    "glowColor": "#baccd7"
  },
  {
    "title": "Visual Arts and Design",
    "description": "Your Ikigai shows a gift for bringing beauty and joy to this world through visual expression.",
    "glowColor": "#a6a76c"
  }
]

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations. Just the JSON array.`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: pathsPrompt,
      },
    ];

    // Use Haiku for calling path analysis
    const response = await tryModel(apiKey, MODEL_HAIKU, apiMessages, 'You are an expert astrologer and career counselor.', 400, 'calling');

    // Check response status BEFORE trying to parse JSON
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Unknown error';
      
      // Only log warnings occasionally to reduce spam
      const shouldLog = apiFailureCache.failureCount <= 1 || apiFailureCache.failureCount % 5 === 0;
      if (shouldLog) {
        console.warn(`API error (${response.status}): ${errorMessage}`);
      }
      
      // Handle specific error cases gracefully with fallback
      if (response.status === 400 || response.status === 429 || response.status === 402) {
        // Credit balance too low, rate limit, or payment required - use fallback
        if (shouldLog) {
          console.warn('API unavailable, using fallback paths');
        }
        return personalizedFallbackPaths;
      }
      
      // For other errors, still return fallback but log the error
      console.error(`API error: ${response.status} - ${errorMessage}`);
      return personalizedFallbackPaths;
    }

    // Parse the JSON response only if response is ok
    let paths: GeneratedPath[] = [];
    try {
      const responseData = await response.json();
      const responseText = responseData.content?.[0]?.text || JSON.stringify(responseData);
      
      console.log('Calling Paths API Response:', responseText);
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(cleanedResponse);
      console.log('Parsed Destiny Paths:', parsed);
      
      if (Array.isArray(parsed)) {
        paths = parsed.map((path, index) => ({
          id: index + 1,
          title: path.title || `Path ${index + 1}`,
          description: path.description || '',
          glowColor: path.glowColor || '#cdbad8',
        }));
      }
    } catch (parseError: any) {
      console.error('Error parsing paths JSON:', parseError);
      // Fallback to default paths on parse error
      paths = personalizedFallbackPaths;
    }

    return paths;
  } catch (error) {
    console.error('Error generating calling paths:', error);
    // Return fallback paths
    return personalizedFallbackPaths;
  }
}

export interface NaturalGift {
  name: string; // Gift name (2-4 words)
  description: string; // Short explanation of what this gift is
}

export interface CallingAwaitsContent {
  naturalGifts: NaturalGift[]; // 4 natural gifts with descriptions
  ikigaiCircles: {
    whatYouLove: string; // Short sentence for "What you love" circle
    whatYouGoodAt: string; // Short sentence for "What you're good at" circle
    whatWorldNeeds: string; // Short sentence for "What the world needs" circle
    whatCanBePaidFor: string; // Short sentence for "What you can be paid for" circle
  };
  centerSummary: string; // AI-analyzed calling path summary for the center
}

export async function generateCallingAwaitsContent(
  birthMonth?: string,
  birthDate?: string,
  birthYear?: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string,
  whatYouLove?: string,
  whatYouGoodAt?: string,
  whatWorldNeeds?: string,
  whatCanBePaidFor?: string,
  fear?: string,
  whatExcites?: string,
  astrologyReport?: PersonalAstrologyReport
): Promise<CallingAwaitsContent> {
  const apiKey = getApiKey('calling');
  const isRussianLocale = i18n.language?.toLowerCase().startsWith('ru');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  // Format birth date and time (handle empty values gracefully)
  const birthDateStr = (birthMonth && birthDate && birthYear) 
    ? `${birthMonth}/${birthDate}/${birthYear}` 
    : 'Not provided';
  let birthTimeStr = '';
  if (birthHour && birthMinute && birthPeriod) {
    birthTimeStr = ` at ${birthHour}:${birthMinute} ${birthPeriod}`;
  }
  const locationStr = birthCity ? ` in ${birthCity}` : '';

  // Calculate sun sign (handle empty values gracefully)
  const month = birthMonth ? parseInt(birthMonth) : 0;
  const day = birthDate ? parseInt(birthDate) : 0;
  let sunSign = '';
  const hasSunSign = month > 0 && day > 0;
  
  if (hasSunSign) {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) sunSign = 'Aries';
    else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) sunSign = 'Taurus';
    else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) sunSign = 'Gemini';
    else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) sunSign = 'Cancer';
    else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = 'Leo';
    else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = 'Virgo';
    else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) sunSign = 'Libra';
    else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) sunSign = 'Scorpio';
    else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) sunSign = 'Sagittarius';
    else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) sunSign = 'Capricorn';
    else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) sunSign = 'Aquarius';
    else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) sunSign = 'Pisces';
  }

  // Build astrological section with full report if available
  let astrologySection = '';
  if (astrologyReport && astrologyReport.sunSign) {
    astrologySection = `CRITICAL ASTROLOGICAL BLUEPRINT - USE THESE SPECIFIC INSIGHTS:

This user's complete astrological profile:
- Sun Sign: ${astrologyReport.sunSign} (core identity and ego expression)
- Moon Sign: ${astrologyReport.moonSign} (emotional nature and inner needs)
- Rising Sign (Ascendant): ${astrologyReport.risingSign} (how they present to the world and first impressions)

KEY PLANETARY ASPECTS (shaping personality and life path):
${astrologyReport.keyPlanetaryAspects.length > 0 
  ? astrologyReport.keyPlanetaryAspects.map(aspect => `- ${aspect}`).join('\n')
  : '- No specific aspects provided'}

KEY HOUSE PLACEMENTS (influencing life areas):
${astrologyReport.housePlacements.length > 0 
  ? astrologyReport.housePlacements.map(placement => `- ${placement}`).join('\n')
  : '- No specific house placements provided'}

COSMIC INSIGHTS:
${astrologyReport.cosmicInsights || `As a ${astrologyReport.sunSign}, this person has natural strengths aligned with their sun sign.`}

CRITICAL INSTRUCTION: You MUST reference SPECIFIC insights from this astrological report in your natural gifts and Ikigai circle summaries. Do NOT use generic sun sign descriptions. Instead:
- Reference how their Sun + Moon combination creates unique traits
- Explain how their Rising sign influences their presentation and approach
- Connect planetary aspects to their natural gifts
- Reference house placements to explain WHY certain Ikigai answers resonate
- Make it feel like a personalized reading, not a horoscope`;
  } else if (hasSunSign) {
    astrologySection = `NOTE: Only Sun sign is available (${sunSign}). Birth chart details are not available, so focus on ${sunSign} traits combined with Ikigai responses.`;
  } else {
    astrologySection = `NOTE: Birth date information is not available, so astrological influences cannot be determined. Focus on the user's Ikigai responses and personal motivations.`;
  }

  const callingPrompt = `You are an expert astrologer and life coach. Generate deeply personalized content for a user's calling profile.

${astrologySection}

PERSONAL INFORMATION:
- Birth Date: ${birthDateStr}${birthTimeStr}${locationStr}
${birthTimeStr ? `- Birth Time: ${birthHour}:${birthMinute} ${birthPeriod}` : '- Birth Time: Not provided'}
${locationStr ? `- Birth Location: ${birthCity}` : '- Birth Location: Not provided'}

IKIGAI RESPONSES (USE THESE SPECIFIC ANSWERS):
- What they love: "${whatYouLove || 'Not provided'}"
- What they're good at: "${whatYouGoodAt || 'Not provided'}"
- What the world needs: "${whatWorldNeeds || 'Not provided'}"
- What can be paid for: "${whatCanBePaidFor || 'Not provided'}"

FEARS AND MOTIVATIONS:
${fear ? `- Their fear: ${fear}` : '- Their fear: Not provided'}
${whatExcites ? `- What excites them: ${whatExcites}` : '- What excites them: Not provided'}

INSTRUCTIONS:
1. Generate exactly 4 natural gifts that are HIGHLY PERSONALIZED to this specific user. CRITICAL REQUIREMENTS:
   ${astrologyReport && astrologyReport.sunSign ? `- Each gift MUST deeply integrate their astrological blueprint. Reference SPECIFIC insights from their birth chart:
     * How their ${astrologyReport.sunSign} Sun combines with their ${astrologyReport.moonSign} Moon creates unique traits
     * How their ${astrologyReport.risingSign} Rising sign influences their approach
     * Reference specific planetary aspects and house placements that explain WHY this gift is natural to them
     * Example: "Your ${astrologyReport.sunSign} Sun combined with your ${astrologyReport.moonSign} Moon creates a rare blend of [trait]. This cosmic pairing is why you don't just want to [Ikigai answer] — you FEEL it on a soul level. With [house placement], [Ikigai answer] isn't just a passion; it's woven into your life purpose."
   - DO NOT use generic sun sign descriptions. Use SPECIFIC insights from their complete birth chart.` : hasSunSign ? `- Each gift MUST explicitly reflect their Sun sign: ${sunSign}. Reference ${sunSign} traits that align with their gifts.` : '- Focus on the user\'s unique combination of Ikigai responses and personal motivations.'}
   - Each gift MUST connect to their specific Ikigai answers:
     * What they love: "${whatYouLove || 'not provided'}"
     * What they're good at: "${whatYouGoodAt || 'not provided'}"
     * What the world needs: "${whatWorldNeeds || 'not provided'}"
     * What can be paid for: "${whatCanBePaidFor || 'not provided'}"
   ${astrologyReport && astrologyReport.sunSign ? `- Each gift description MUST reference SPECIFIC astrological insights (Sun+Moon combination, Rising sign, aspects, or house placements) AND connect to their Ikigai responses. Make it feel like a personalized reading.` : hasSunSign ? `- Each gift description MUST mention their Sun sign (${sunSign}) and reference at least one of their Ikigai responses.` : '- Each gift description MUST reference at least one of their Ikigai responses and connect to their personal motivations.'}
   - Consider their fears (${fear || 'not provided'}) and what excites them (${whatExcites || 'not provided'}) to make gifts more relevant.
   - Each gift should have:
     * A name: 2-4 words (e.g., "Creative self-expression", "Bold leadership")
     * A description: A short explanation (1-2 sentences, max 30 words) that ${astrologyReport && astrologyReport.sunSign ? `references SPECIFIC astrological insights from their birth chart and ` : hasSunSign ? `explicitly mentions their ${sunSign} sign and ` : ''}connects to their Ikigai answers. ${astrologyReport && astrologyReport.sunSign ? `Example: "Your ${astrologyReport.sunSign} Sun combined with your ${astrologyReport.moonSign} Moon creates [unique trait]. This is why [Ikigai connection] resonates so deeply with your cosmic blueprint."` : hasSunSign ? `Example: "As a ${sunSign}, your natural [trait] combined with your passion for [whatYouLove] creates [gift description]."` : 'Example: "Your natural [trait] combined with your passion for [whatYouLove] creates [gift description]."'}

2. For each Ikigai circle, create a summary of EXACTLY 2 WORDS that condenses their answer:
   - "What you love" circle: Condense "${whatYouLove || 'their passions'}" to exactly 2 words (e.g., "creative expression", "helping others", "artistic pursuits")
   - "What you're good at" circle: Condense "${whatYouGoodAt || 'their talents'}" to exactly 2 words (e.g., "problem solving", "creative design", "team leadership")
   - "What the world needs" circle: Condense "${whatWorldNeeds || 'world needs'}" to exactly 2 words (e.g., "environmental sustainability", "mental health", "social justice")
   - "What you can be paid for" circle: Condense "${whatCanBePaidFor || 'monetizable skills'}" to exactly 2 words (e.g., "content creation", "consulting services", "digital marketing")
   CRITICAL: Each summary MUST be exactly 2 words. No more, no less. Choose the most impactful 2 words that capture the essence of their answer.

3. Create a center summary (max 12 words, NO word "destiny") that synthesizes their Ikigai answers into a personalized path to purpose and fulfillment. This should be primarily based on the intersection of what they love (${whatYouLove || 'not provided'}), what they're good at (${whatYouGoodAt || 'not provided'}), what the world needs (${whatWorldNeeds || 'not provided'}), and what they can be paid for (${whatCanBePaidFor || 'not provided'}). ${astrologyReport && astrologyReport.cosmicInsights ? `Consider how their astrological blueprint (${astrologyReport.sunSign} Sun, ${astrologyReport.moonSign} Moon, ${astrologyReport.risingSign} Rising) influences this intersection.` : hasSunSign ? `You may also consider their ${sunSign} astrological influences.` : ''} The summary should reflect their unique path forward based on these four Ikigai dimensions. DO NOT use the word "destiny" in the center summary.

OUTPUT FORMAT (JSON only, no other text):
Return a JSON object with this exact structure:
{
  "naturalGifts": [
    {"name": "gift1 name", "description": "short explanation of gift1"},
    {"name": "gift2 name", "description": "short explanation of gift2"},
    {"name": "gift3 name", "description": "short explanation of gift3"},
    {"name": "gift4 name", "description": "short explanation of gift4"}
  ],
  "ikigaiCircles": {
    "whatYouLove": "exactly 2 words",
    "whatYouGoodAt": "exactly 2 words",
    "whatWorldNeeds": "exactly 2 words",
    "whatCanBePaidFor": "exactly 2 words"
  },
  "centerSummary": "life path summary max 12 words, NO word 'calling'"
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations. Just the JSON object.`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: callingPrompt,
      },
    ];

    // Use Sonnet for complex calling content analysis with reduced tokens
    const response = await tryModel(apiKey, 'claude-sonnet-4-5', apiMessages, 'You are an expert astrologer and life coach.', 600, 'calling');

    // Check response status BEFORE trying to parse JSON
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Unknown error';
      
      console.error(`❌ CallingAwaits API error (${response.status}): ${errorMessage}`);
      console.error('Error details:', JSON.stringify(errorData, null, 2));
      
      // Provide helpful error messages based on status code
      if (response.status === 401) {
        console.error('💡 This usually means your API key is invalid. Check EXPO_PUBLIC_ANTHROPIC_API_KEY in .env');
      } else if (response.status === 402) {
        console.error('💡 This usually means your Anthropic account has insufficient credits. Check your account balance.');
      } else if (response.status === 429) {
        console.error('💡 Rate limit exceeded. Wait a moment and try again.');
      } else if (response.status === 400) {
        console.error('💡 Bad request. Check that your API key is valid and the request format is correct.');
      }
      
      // Return fallback content for API errors
      const fallbackGifts: NaturalGift[] = isRussianLocale
        ? [
            { name: 'Творческое выражение', description: 'Ты умеешь превращать идеи в понятные и вдохновляющие формы через слово, визуал и действие.' },
            { name: 'Смелое лидерство', description: 'Ты естественно берёшь инициативу и помогаешь другим двигаться к значимым изменениям.' },
            { name: 'Ясная коммуникация', description: 'Ты умеешь доносить сложные мысли просто и глубоко, создавая доверие и вовлечённость.' },
            { name: 'Запуск проектов', description: 'Ты умеешь запускать важные инициативы и доводить их до ощутимого результата.' },
          ]
        : [
            { name: 'Creative expression', description: 'Your ability to express yourself through art, writing, or creative mediums that resonate with your inner truth.' },
            { name: 'Bold leadership', description: 'Your natural capacity to inspire and guide others toward meaningful change and transformation.' },
            { name: 'Artistic communication', description: 'Your gift for conveying complex ideas and emotions through visual, written, or spoken forms.' },
            { name: 'Initiating projects', description: 'Your talent for starting new ventures and bringing innovative ideas to life with passion and determination.' },
          ];
      console.warn('CallingAwaits: Using fallback content due to API error');
      return {
        naturalGifts: fallbackGifts,
        ikigaiCircles: {
          whatYouLove: whatYouLove ? whatYouLove.split(' ').slice(0, 2).join(' ') : 'Your passions',
          whatYouGoodAt: whatYouGoodAt ? whatYouGoodAt.split(' ').slice(0, 2).join(' ') : 'Your talents',
          whatWorldNeeds: whatWorldNeeds ? whatWorldNeeds.split(' ').slice(0, 2).join(' ') : 'World needs',
          whatCanBePaidFor: whatCanBePaidFor ? whatCanBePaidFor.split(' ').slice(0, 2).join(' ') : 'Monetizable skills',
        },
        centerSummary: 'Your unique path to purpose and fulfillment.',
      };
    }

    // Parse the JSON response only if response is ok
    let content: CallingAwaitsContent;
    let responseText = '';
    try {
      const responseData = await response.json();
      responseText = responseData.content?.[0]?.text || JSON.stringify(responseData);
      
      console.log('Destiny Awaits API Response:', responseText);
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      // Try to extract JSON from the response if it's wrapped in text
      let parsed: any;
      try {
        // First, try parsing the cleaned response directly
        parsed = JSON.parse(cleanedResponse);
      } catch (firstParseError) {
        // If that fails, try to find JSON object in the text
        // Look for content between { and } that might be JSON
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (secondParseError) {
            // If still failing, check if response starts with error text
            if (cleanedResponse.toLowerCase().includes('error') || 
                cleanedResponse.toLowerCase().includes('invalid') ||
                cleanedResponse.toLowerCase().startsWith('i')) {
              console.warn('API response appears to be an error message:', cleanedResponse.substring(0, 200));
              throw new Error(`API returned error message: ${cleanedResponse.substring(0, 100)}`);
            }
            throw firstParseError; // Re-throw original error
          }
        } else {
          // No JSON found in response
          console.warn('No JSON object found in API response:', cleanedResponse.substring(0, 200));
          throw new Error(`No valid JSON found in response: ${cleanedResponse.substring(0, 100)}`);
        }
      }
      
      console.log('Parsed Calling Awaits Content:', parsed);
      
      // Validate and format the response
      const fallbackGifts: NaturalGift[] = [
        { name: 'Creative expression', description: 'Your ability to express yourself through art, writing, or creative mediums that resonate with your inner truth.' },
        { name: 'Bold leadership', description: 'Your natural capacity to inspire and guide others toward meaningful change and transformation.' },
        { name: 'Artistic communication', description: 'Your gift for conveying complex ideas and emotions through visual, written, or spoken forms.' },
        { name: 'Initiating projects', description: 'Your talent for starting new ventures and bringing innovative ideas to life with passion and determination.' },
      ];

      content = {
        naturalGifts: Array.isArray(parsed.naturalGifts) && parsed.naturalGifts.length === 4
          ? parsed.naturalGifts.map((gift: any) => {
              if (typeof gift === 'string') {
                // Legacy format - convert to new format
                return { name: gift, description: `Your natural ability to ${gift.toLowerCase()} and express this gift in your daily life.` };
              }
              return {
                name: gift.name || gift,
                description: gift.description || `Your natural ability to ${(gift.name || gift).toLowerCase()} and express this gift in your daily life.`,
              };
            })
          : fallbackGifts,
        ikigaiCircles: {
          whatYouLove: parsed.ikigaiCircles?.whatYouLove || (whatYouLove ? whatYouLove.split(' ').slice(0, 2).join(' ') : 'Your passions'),
          whatYouGoodAt: parsed.ikigaiCircles?.whatYouGoodAt || (whatYouGoodAt ? whatYouGoodAt.split(' ').slice(0, 2).join(' ') : 'Your talents'),
          whatWorldNeeds: parsed.ikigaiCircles?.whatWorldNeeds || (whatWorldNeeds ? whatWorldNeeds.split(' ').slice(0, 2).join(' ') : 'World needs'),
          whatCanBePaidFor: parsed.ikigaiCircles?.whatCanBePaidFor || (whatCanBePaidFor ? whatCanBePaidFor.split(' ').slice(0, 2).join(' ') : 'Monetizable skills'),
        },
        centerSummary: parsed.centerSummary
          ? parsed.centerSummary.replace(/calling/gi, 'path').replace(/Calling/gi, 'Path')
          : isRussianLocale
            ? 'Твой уникальный путь к смыслу и реализации.'
            : 'Your unique path to purpose and fulfillment.',
      };
    } catch (parseError: any) {
      console.error('Error parsing calling content JSON:', parseError);
      console.error('Response text that failed to parse:', responseText?.substring(0, 500));
      // Fallback content - use user's actual Ikigai responses
      const fallbackGifts: NaturalGift[] = [
        { name: 'Creative expression', description: 'Your ability to express yourself through art, writing, or creative mediums that resonate with your inner truth.' },
        { name: 'Bold leadership', description: 'Your natural capacity to inspire and guide others toward meaningful change and transformation.' },
        { name: 'Artistic communication', description: 'Your gift for conveying complex ideas and emotions through visual, written, or spoken forms.' },
        { name: 'Initiating projects', description: 'Your talent for starting new ventures and bringing innovative ideas to life with passion and determination.' },
      ];
      content = {
        naturalGifts: fallbackGifts,
        ikigaiCircles: {
          whatYouLove: whatYouLove ? whatYouLove.split(' ').slice(0, 3).join(' ') : 'YOUR PASSIONS',
          whatYouGoodAt: whatYouGoodAt ? whatYouGoodAt.split(' ').slice(0, 3).join(' ') : 'YOUR TALENTS',
          whatWorldNeeds: whatWorldNeeds ? whatWorldNeeds.split(' ').slice(0, 3).join(' ') : 'WORLD NEEDS',
          whatCanBePaidFor: whatCanBePaidFor ? whatCanBePaidFor.split(' ').slice(0, 3).join(' ') : 'MONETIZABLE SKILLS',
        },
        centerSummary: 'Your unique path to purpose and fulfillment.',
      };
    }

    return content;
  } catch (error) {
    console.error('Error generating calling awaits content:', error);
    // Return fallback content
    const fallbackGifts: NaturalGift[] = [
      { name: 'Creative expression', description: 'Your ability to express yourself through art, writing, or creative mediums that resonate with your inner truth.' },
      { name: 'Bold leadership', description: 'Your natural capacity to inspire and guide others toward meaningful change and transformation.' },
      { name: 'Artistic communication', description: 'Your gift for conveying complex ideas and emotions through visual, written, or spoken forms.' },
      { name: 'Initiating projects', description: 'Your talent for starting new ventures and bringing innovative ideas to life with passion and determination.' },
    ];
    return {
      naturalGifts: fallbackGifts,
      ikigaiCircles: {
        whatYouLove: whatYouLove ? whatYouLove.split(' ').slice(0, 3).join(' ') : 'Your passions',
        whatYouGoodAt: whatYouGoodAt ? whatYouGoodAt.split(' ').slice(0, 3).join(' ') : 'Your talents',
        whatWorldNeeds: whatWorldNeeds ? whatWorldNeeds.split(' ').slice(0, 3).join(' ') : 'World needs',
        whatCanBePaidFor: whatCanBePaidFor ? whatCanBePaidFor.split(' ').slice(0, 3).join(' ') : 'Monetizable skills',
      },
      centerSummary: 'Your unique path to purpose and fulfillment.',
    };
  }
}

export interface UnifiedDestinyProfile {
  callingAwaits: CallingAwaitsContent;
  paths: GeneratedPath[];
}

export interface PathGoal {
  id: number;
  title: string;
  fear: string;
  timeFrame: string;
  description: string;
}

export interface PathContent {
  whyFitsYou: string[];
  goals: PathGoal[];
}

/**
 * Unified API function that generates all destiny profile content in a single call.
 * This combines calling awaits content and paths aligned content, including Current Life Context data.
 * Should be called once at Step 6 (LoadingStep) after all onboarding data is collected.
 */
async function generateUnifiedDestinyProfileUncached(
  birthMonth?: string,
  birthDate?: string,
  birthYear?: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string,
  whatYouLove?: string,
  whatYouGoodAt?: string,
  whatWorldNeeds?: string,
  whatCanBePaidFor?: string,
  fear?: string,
  whatExcites?: string,
  currentSituation?: string,
  biggestConstraint?: string,
  whatMattersMost?: string[]
): Promise<UnifiedDestinyProfile> {
  const apiKey = getApiKey('calling');
  const isRussianLocale = i18n.language?.toLowerCase().startsWith('ru');
  const outputLanguageLabel = isRussianLocale ? 'Russian' : 'English';
  const notProvidedLabel = isRussianLocale ? 'Не указано' : 'Not provided';
  const trimForPrompt = (value?: string, maxChars = 220) => {
    const normalized = (value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return notProvidedLabel;
    return normalized.length > maxChars ? `${normalized.slice(0, maxChars)}...` : normalized;
  };
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  // Format birth date and time (handle empty values gracefully)
  const birthDateStr = (birthMonth && birthDate && birthYear) 
    ? `${birthMonth}/${birthDate}/${birthYear}` 
    : notProvidedLabel;
  let birthTimeStr = '';
  if (birthHour && birthMinute && birthPeriod) {
    birthTimeStr = ` at ${birthHour}:${birthMinute} ${birthPeriod}`;
  }
  const locationStr = birthCity ? ` in ${birthCity}` : '';

  // Calculate sun sign (handle empty values gracefully)
  const month = birthMonth ? parseInt(birthMonth) : 0;
  const day = birthDate ? parseInt(birthDate) : 0;
  let sunSign = '';
  const hasSunSign = month > 0 && day > 0;
  
  if (hasSunSign) {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) sunSign = 'Aries';
    else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) sunSign = 'Taurus';
    else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) sunSign = 'Gemini';
    else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) sunSign = 'Cancer';
    else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = 'Leo';
    else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = 'Virgo';
    else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) sunSign = 'Libra';
    else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) sunSign = 'Scorpio';
    else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) sunSign = 'Sagittarius';
    else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) sunSign = 'Capricorn';
    else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) sunSign = 'Aquarius';
    else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) sunSign = 'Pisces';
  }

  // Format Current Life Context data
  const currentSituationStr = trimForPrompt(currentSituation, 260);
  const biggestConstraintStr = trimForPrompt(biggestConstraint, 220);
  const whatMattersMostStr = whatMattersMost && whatMattersMost.length > 0 
    ? whatMattersMost.map((item) => trimForPrompt(item, 80)).join(', ') 
    : notProvidedLabel;
  const whatYouLoveStr = trimForPrompt(whatYouLove, 220);
  const whatYouGoodAtStr = trimForPrompt(whatYouGoodAt, 220);
  const whatWorldNeedsStr = trimForPrompt(whatWorldNeeds, 220);
  const whatCanBePaidForStr = trimForPrompt(whatCanBePaidFor, 220);
  const fearStr = trimForPrompt(fear, 180);
  const whatExcitesStr = trimForPrompt(whatExcites, 180);
  const toTwoWords = (value: string, fallbackA: string, fallbackB: string) => {
    const words = value
      .replace(/["'.,!?;:()]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    if (words.length === 2) return `${words[0]} ${words[1]}`;
    if (words.length === 1) return `${words[0]} ${fallbackB}`;
    return `${fallbackA} ${fallbackB}`;
  };
  const buildRateLimitFallbackProfile = (): UnifiedDestinyProfile => {
    const fallbackGifts: NaturalGift[] = isRussianLocale
      ? [
          { name: 'Творческий фокус', description: 'Ты умеешь превращать идеи в конкретные шаги и сохранять мотивацию в процессе.' },
          { name: 'Сильная адаптивность', description: 'Ты гибко подстраиваешься под обстоятельства и находишь рабочие решения.' },
          { name: 'Эмпатичное лидерство', description: 'Ты поддерживаешь других и создаешь вокруг себя атмосферу доверия и роста.' },
          { name: 'Системное мышление', description: 'Ты видишь общую картину и умеешь разбивать сложные цели на понятные этапы.' },
        ]
      : [
          { name: 'Creative Focus', description: 'You turn ideas into concrete steps and stay motivated through execution.' },
          { name: 'Adaptive Strength', description: 'You adjust quickly to changing conditions and keep moving with clarity.' },
          { name: 'Empathic Leadership', description: 'You support people well and create trust while moving goals forward.' },
          { name: 'Systems Thinking', description: 'You see the big picture and break complex goals into practical phases.' },
        ];

    return {
      callingAwaits: {
        naturalGifts: fallbackGifts,
        ikigaiCircles: {
          whatYouLove: toTwoWords(
            whatYouLoveStr,
            isRussianLocale ? 'Твои' : 'Your',
            isRussianLocale ? 'интересы' : 'passions'
          ),
          whatYouGoodAt: toTwoWords(
            whatYouGoodAtStr,
            isRussianLocale ? 'Твои' : 'Your',
            isRussianLocale ? 'таланты' : 'skills'
          ),
          whatWorldNeeds: toTwoWords(
            whatWorldNeedsStr,
            isRussianLocale ? 'Польза' : 'World',
            isRussianLocale ? 'миру' : 'needs'
          ),
          whatCanBePaidFor: toTwoWords(
            whatCanBePaidForStr,
            isRussianLocale ? 'Практичные' : 'Practical',
            isRussianLocale ? 'навыки' : 'value'
          ),
        },
        centerSummary: isRussianLocale
          ? 'Твой путь строится на сильных сторонах и устойчивом прогрессе.'
          : 'Your path is built on strengths and steady progress.',
      },
      paths: isRussianLocale
        ? [
            { id: 1, title: 'Творческий вектор', description: 'Развивай сильные стороны через понятные ежедневные шаги.', glowColor: '#cdbad8' },
            { id: 2, title: 'Личный рост', description: 'Укрепляй уверенность и двигайся к целям в своем темпе.', glowColor: '#baccd7' },
            { id: 3, title: 'Ценный вклад', description: 'Применяй навыки там, где они приносят практическую пользу.', glowColor: '#a6a76c' },
          ]
        : [
            { id: 1, title: 'Creative Direction', description: 'Develop your strengths through clear daily action.', glowColor: '#cdbad8' },
            { id: 2, title: 'Personal Growth', description: 'Build confidence and progress toward meaningful goals.', glowColor: '#baccd7' },
            { id: 3, title: 'Purposeful Impact', description: 'Apply your skills where they create practical value.', glowColor: '#a6a76c' },
          ],
    };
  };

  // If API is currently in cooldown due to recent failures, skip network calls
  // and return a local fallback profile immediately.
  if (shouldSkipApiCall()) {
    console.warn('[Destiny Profile] Cooldown active; using local fallback profile.');
    return buildRateLimitFallbackProfile();
  }

  // Use sun sign only for destiny profile loading step (skip full astrology report to keep load time fast)
  const astrologyReport: PersonalAstrologyReport | undefined = undefined;

  // Build unified prompt that generates both calling awaits content and paths
  let astrologySection = '';
  if (astrologyReport && astrologyReport.sunSign) {
    astrologySection = `CRITICAL ASTROLOGICAL BLUEPRINT - USE THESE SPECIFIC INSIGHTS:

This user's complete astrological profile:
- Sun Sign: ${astrologyReport.sunSign} (core identity and ego expression)
- Moon Sign: ${astrologyReport.moonSign} (emotional nature and inner needs)
- Rising Sign (Ascendant): ${astrologyReport.risingSign} (how they present to the world and first impressions)

KEY PLANETARY ASPECTS (shaping personality and life path):
${astrologyReport.keyPlanetaryAspects.length > 0 
  ? astrologyReport.keyPlanetaryAspects.map(aspect => `- ${aspect}`).join('\n')
  : '- No specific aspects provided'}

KEY HOUSE PLACEMENTS (influencing life areas):
${astrologyReport.housePlacements.length > 0 
  ? astrologyReport.housePlacements.map(placement => `- ${placement}`).join('\n')
  : '- No specific house placements provided'}

COSMIC INSIGHTS:
${astrologyReport.cosmicInsights || `As a ${astrologyReport.sunSign}, this person has natural strengths aligned with their sun sign.`}

CRITICAL INSTRUCTION: You MUST reference SPECIFIC insights from this astrological report in natural gifts, Ikigai circles, and paths. Do NOT use generic sun sign descriptions. Instead:
- Reference how their Sun + Moon combination creates unique traits
- Explain how their Rising sign influences their presentation and approach
- Connect planetary aspects to their natural gifts and paths
- Reference house placements to explain WHY certain Ikigai answers resonate
- Make it feel like a personalized reading, not a horoscope`;
  } else if (hasSunSign) {
    astrologySection = `NOTE: Only Sun sign is available (${sunSign}). Birth chart details are not available, so focus on ${sunSign} traits combined with Ikigai responses and Current Life Context.`;
  } else {
    astrologySection = `NOTE: Birth date information is not available, so astrological influences cannot be determined. Focus on the user's Ikigai responses, Current Life Context, and personal motivations.`;
  }

  const unifiedPrompt = `You are an expert astrologer and life coach. Generate a complete personalized destiny profile for a user based on their complete onboarding data.

${astrologySection}

OUTPUT LANGUAGE REQUIREMENT:
- Return all user-facing text values in ${outputLanguageLabel}.
- Keep JSON keys in English exactly as specified.
- If ${outputLanguageLabel} is Russian, all titles/descriptions/summaries must be natural Russian text.

PERSONAL INFORMATION:
- Birth Date: ${birthDateStr}${birthTimeStr}${locationStr}
${birthTimeStr ? `- Birth Time: ${birthHour}:${birthMinute} ${birthPeriod}` : `- Birth Time: ${notProvidedLabel}`}
${locationStr ? `- Birth Location: ${birthCity}` : `- Birth Location: ${notProvidedLabel}`}

IKIGAI RESPONSES (USE THESE SPECIFIC ANSWERS):
- What they love: "${whatYouLoveStr}"
- What they're good at: "${whatYouGoodAtStr}"
- What the world needs: "${whatWorldNeedsStr}"
- What can be paid for: "${whatCanBePaidForStr}"

FEARS AND MOTIVATIONS:
- Their fear: ${fearStr}
- What excites them: ${whatExcitesStr}

CURRENT LIFE CONTEXT (CRITICAL - Use this to personalize paths and gifts):
- Current Situation: ${currentSituationStr}
- Biggest Constraint: ${biggestConstraintStr}
- What Matters Most: ${whatMattersMostStr}

INSTRUCTIONS:

PART 1 - NATURAL GIFTS (for "Your Destiny Awaits" screen):
Generate exactly 4 natural gifts that are HIGHLY PERSONALIZED to this specific user. 

${astrologyReport && astrologyReport.sunSign ? `🚨 CRITICAL: You MUST use SPECIFIC astrological insights from their birth chart. DO NOT write generic descriptions.

REQUIRED FORMAT FOR EACH GIFT:
Each gift description MUST:
1. Reference their SPECIFIC astrological combination (e.g., "${astrologyReport.sunSign} Sun + ${astrologyReport.moonSign} Moon" or "${astrologyReport.risingSign} Rising")
2. Mention at least ONE specific planetary aspect or house placement from their chart
3. Connect the astrological insight to their SPECIFIC Ikigai answer
4. Explain WHY this gift is natural to them based on their cosmic blueprint

EXAMPLE OF GOOD DESCRIPTION (use this style):
"Your ${astrologyReport.sunSign} Sun combined with your ${astrologyReport.moonSign} Moon creates a rare blend of [specific trait from their chart]. This cosmic pairing is why you don't just want to [specific Ikigai answer] — you FEEL it on a soul level. With ${astrologyReport.housePlacements.length > 0 ? astrologyReport.housePlacements[0] : '[house placement]'}, [Ikigai answer] isn't just a passion; it's woven into your life purpose."

EXAMPLE OF BAD DESCRIPTION (DO NOT DO THIS):
"As a ${astrologyReport.sunSign}, your natural leadership abilities make you good at inspiring others." ❌ TOO GENERIC

${astrologyReport.keyPlanetaryAspects.length > 0 ? `AVAILABLE PLANETARY ASPECTS TO REFERENCE:
${astrologyReport.keyPlanetaryAspects.map((aspect, i) => `${i + 1}. ${aspect}`).join('\n')}` : ''}

${astrologyReport.housePlacements.length > 0 ? `AVAILABLE HOUSE PLACEMENTS TO REFERENCE:
${astrologyReport.housePlacements.map((placement, i) => `${i + 1}. ${placement}`).join('\n')}` : ''}

COSMIC INSIGHTS TO DRAW FROM:
${astrologyReport.cosmicInsights}

REQUIREMENTS:
- Each gift MUST connect to their specific Ikigai answers:
  * What they love: "${whatYouLove || 'not provided'}"
  * What they're good at: "${whatYouGoodAt || 'not provided'}"
  * What the world needs: "${whatWorldNeeds || 'not provided'}"
  * What can be paid for: "${whatCanBePaidFor || 'not provided'}"
- Each gift description MUST be 1-2 sentences (max 40 words) and MUST include:
  * Their Sun+Moon combination OR Rising sign
  * At least one planetary aspect OR house placement
  * Connection to their specific Ikigai answer
  * Explanation of WHY this is natural to them cosmically
- Make it feel like a personalized astrological reading, not a generic horoscope` : hasSunSign ? `- Each gift MUST explicitly reflect their Sun sign: ${sunSign}. Reference ${sunSign} traits that align with their gifts.
- Each gift MUST connect to their specific Ikigai answers:
  * What they love: "${whatYouLove || 'not provided'}"
  * What they're good at: "${whatYouGoodAt || 'not provided'}"
  * What the world needs: "${whatWorldNeeds || 'not provided'}"
  * What can be paid for: "${whatCanBePaidFor || 'not provided'}"
- Each gift description MUST mention their Sun sign (${sunSign}) and reference at least one of their Ikigai responses.` : `- Focus on the user's unique combination of Ikigai responses, Current Life Context, and personal motivations.
- Each gift MUST connect to their specific Ikigai answers:
  * What they love: "${whatYouLove || 'not provided'}"
  * What they're good at: "${whatYouGoodAt || 'not provided'}"
  * What the world needs: "${whatWorldNeeds || 'not provided'}"
  * What can be paid for: "${whatCanBePaidFor || 'not provided'}"`}

- Consider their Current Life Context: situation (${currentSituationStr}), constraint (${biggestConstraintStr}), and what matters (${whatMattersMostStr})
- Consider their fears (${fear || 'not provided'}) and what excites them (${whatExcites || 'not provided'}) to make gifts more relevant.
- Each gift should have:
  * A name: 2-4 words (e.g., "Creative self-expression", "Bold leadership")
  * A description: ${astrologyReport && astrologyReport.sunSign ? `1-2 sentences (max 40 words) that MUST reference their Sun+Moon combination OR Rising sign, at least one aspect/placement, and connect to Ikigai answers` : hasSunSign ? `A short explanation (1-2 sentences, max 30 words) that explicitly mentions their ${sunSign} sign and connects to their Ikigai answers` : 'A short explanation (1-2 sentences, max 30 words) that connects to their Ikigai answers'}

PART 2 - IKIGAI CIRCLES (for visualization):
For each Ikigai circle, create a summary of EXACTLY 2 WORDS that condenses their answer:
- "What you love" circle: Condense "${whatYouLove || 'their passions'}" to exactly 2 words (e.g., "creative expression", "helping others", "artistic pursuits")
- "What you're good at" circle: Condense "${whatYouGoodAt || 'their talents'}" to exactly 2 words (e.g., "problem solving", "creative design", "team leadership")
- "What the world needs" circle: Condense "${whatWorldNeeds || 'world needs'}" to exactly 2 words (e.g., "environmental sustainability", "mental health", "social justice")
- "What you can be paid for" circle: Condense "${whatCanBePaidFor || 'monetizable skills'}" to exactly 2 words (e.g., "content creation", "consulting services", "digital marketing")
CRITICAL: Each summary MUST be exactly 2 words. No more, no less.

PART 3 - CENTER SUMMARY:
Create a center summary (max 12 words, NO word "destiny" or "calling") that synthesizes their Ikigai answers into a personalized path to purpose and fulfillment. This should be primarily based on the intersection of what they love (${whatYouLove || 'not provided'}), what they're good at (${whatYouGoodAt || 'not provided'}), what the world needs (${whatWorldNeeds || 'not provided'}), and what they can be paid for (${whatCanBePaidFor || 'not provided'}). ${astrologyReport && astrologyReport.cosmicInsights ? `Consider how their astrological blueprint (${astrologyReport.sunSign} Sun, ${astrologyReport.moonSign} Moon, ${astrologyReport.risingSign} Rising) influences this intersection.` : hasSunSign ? `You may also consider their ${sunSign} astrological influences.` : ''} Consider their Current Life Context (${currentSituationStr}, ${biggestConstraintStr}, ${whatMattersMostStr}) to make it relevant to where they are now.

PART 4 - DESTINY PATHS (for "Paths Aligned" screen):
Generate exactly 3 distinct career/life paths that align with their destiny. Each path should:
- Be specific, actionable, and personalized
${astrologyReport && astrologyReport.sunSign ? `- Deeply integrate their astrological blueprint: ${astrologyReport.sunSign} Sun, ${astrologyReport.moonSign} Moon, ${astrologyReport.risingSign} Rising, and key aspects/placements. Reference how planetary energies influence each path. ` : hasSunSign ? `- Consider their Sun sign (${sunSign}), ` : '- Focus primarily on '}their Ikigai responses, Current Life Context (situation: ${currentSituationStr}, constraint: ${biggestConstraintStr}, what matters: ${whatMattersMostStr}), fears, and excitements
- Be inspiring and aligned with their true purpose
- Each path must connect to their Ikigai answers: what they love (${whatYouLove || 'not provided'}), what they're good at (${whatYouGoodAt || 'not provided'}), what the world needs (${whatWorldNeeds || 'not provided'}), and what can be paid for (${whatCanBePaidFor || 'not provided'})
- Consider their Current Life Context to ensure paths are realistic and achievable given their situation (${currentSituationStr}) and constraints (${biggestConstraintStr})
- Align with what matters most to them: ${whatMattersMostStr}

OUTPUT FORMAT (JSON only, no other text):
Return a JSON object with this exact structure:
{
  "naturalGifts": [
    {"name": "gift1 name", "description": "${astrologyReport && astrologyReport.sunSign ? 'MUST include Sun+Moon combination or Rising sign, at least one aspect/placement, and connect to Ikigai answer (max 40 words)' : 'short explanation of gift1 (max 30 words)'}"},
    {"name": "gift2 name", "description": "${astrologyReport && astrologyReport.sunSign ? 'MUST include Sun+Moon combination or Rising sign, at least one aspect/placement, and connect to Ikigai answer (max 40 words)' : 'short explanation of gift2 (max 30 words)'}"},
    {"name": "gift3 name", "description": "${astrologyReport && astrologyReport.sunSign ? 'MUST include Sun+Moon combination or Rising sign, at least one aspect/placement, and connect to Ikigai answer (max 40 words)' : 'short explanation of gift3 (max 30 words)'}"},
    {"name": "gift4 name", "description": "${astrologyReport && astrologyReport.sunSign ? 'MUST include Sun+Moon combination or Rising sign, at least one aspect/placement, and connect to Ikigai answer (max 40 words)' : 'short explanation of gift4 (max 30 words)'}"}
  ],
  "ikigaiCircles": {
    "whatYouLove": "exactly 2 words",
    "whatYouGoodAt": "exactly 2 words",
    "whatWorldNeeds": "exactly 2 words",
    "whatCanBePaidFor": "exactly 2 words"
  },
  "centerSummary": "life path summary max 12 words, NO word 'destiny' or 'calling'",
  "paths": [
    {
      "title": "Path 1 title (max 50 characters)",
      "description": "Path 1 description explaining why this path aligns (max 100 characters)",
      "glowColor": "#cdbad8"
    },
    {
      "title": "Path 2 title (max 50 characters)",
      "description": "Path 2 description explaining why this path aligns (max 100 characters)",
      "glowColor": "#baccd7"
    },
    {
      "title": "Path 3 title (max 50 characters)",
      "description": "Path 3 description explaining why this path aligns (max 100 characters)",
      "glowColor": "#a6a76c"
    }
  ]
}

${astrologyReport && astrologyReport.sunSign ? `🚨 FINAL REMINDER: Each natural gift description MUST reference SPECIFIC astrological details (Sun+Moon, Rising, aspects, or house placements). DO NOT write generic sun sign descriptions. Make it feel like a personalized astrological reading.` : ''}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations. Just the JSON object.`;

  // Short fallback prompt used when input-token TPM rate-limit is hit.
  // Keeps the same schema while dramatically reducing token usage.
  const compactUnifiedPrompt = `Generate a personalized profile in ${outputLanguageLabel}. Return JSON only.

User context:
- Birth: ${birthDateStr}${birthTimeStr}${locationStr}
- Sun sign: ${hasSunSign ? sunSign : notProvidedLabel}
- Love: "${whatYouLoveStr}"
- Good at: "${whatYouGoodAtStr}"
- World needs: "${whatWorldNeedsStr}"
- Paid for: "${whatCanBePaidForStr}"
- Fear: "${fearStr}"
- Excites: "${whatExcitesStr}"
- Situation: "${currentSituationStr}"
- Constraint: "${biggestConstraintStr}"
- Matters most: "${whatMattersMostStr}"

Requirements:
1) naturalGifts: exactly 4 items. Each has name (2-4 words) and short description.
2) ikigaiCircles: each value must be exactly 2 words.
3) centerSummary: max 12 words, and must NOT include "destiny" or "calling".
4) paths: exactly 3 items with title, description, glowColor.
5) Keep user-facing text natural ${outputLanguageLabel}.

Output schema:
{
  "naturalGifts": [{"name":"", "description":""}],
  "ikigaiCircles": {
    "whatYouLove": "",
    "whatYouGoodAt": "",
    "whatWorldNeeds": "",
    "whatCanBePaidFor": ""
  },
  "centerSummary": "",
  "paths": [
    {"title":"", "description":"", "glowColor":"#cdbad8"},
    {"title":"", "description":"", "glowColor":"#baccd7"},
    {"title":"", "description":"", "glowColor":"#a6a76c"}
  ]
}`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: unifiedPrompt,
      },
    ];

    // Use Haiku for unified destiny profile generation — structured JSON output,
    // no deep reasoning needed, ~5x cheaper than Sonnet.
    const cachedSystemPrompt = [
      {
        type: 'text' as const,
        text: `You are an expert astrologer and life coach. Return all user-facing values in ${outputLanguageLabel}.`,
        cache_control: { type: 'ephemeral' as const },
      },
    ];
    let response = await tryModel(
      apiKey,
      MODEL_HAIKU,
      apiMessages,
      cachedSystemPrompt,
      1200,
      'calling'
    );

    // If we hit org TPM input limits, retry once with a compact prompt + fewer output tokens.
    if (!response.ok && response.status === 429) {
      console.warn('[Destiny Profile] 429 rate limit on full prompt; retrying with compact prompt.');
      await new Promise((resolve) => setTimeout(resolve, 1200));
      response = await tryModel(
        apiKey,
        MODEL_HAIKU,
        [{ role: 'user', content: compactUnifiedPrompt }],
        `You are an expert life coach. Return all user-facing values in ${outputLanguageLabel}.`,
        800,
        'calling'
      );
    }

    // Check response status BEFORE trying to parse JSON
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Unknown error';
      
      // Provide helpful error messages based on status code
      let errorMsg = `API error (${response.status}): ${errorMessage}`;
      if (response.status === 401) {
        errorMsg += ' - Invalid API key';
      } else if (response.status === 402) {
        errorMsg += ' - Insufficient credits';
      } else if (response.status === 429) {
        errorMsg += ' - Rate limit exceeded. Please retry in 30-60 seconds.';
      }
      
      // Cooldown guard from tryModel; return fallback without throwing noisy errors.
      if (
        response.status === 400 &&
        /temporarily unavailable due to recent failures|retrying in \d+ seconds/i.test(errorMessage)
      ) {
        console.warn('[Destiny Profile] API cooldown response; using local fallback profile.');
        return buildRateLimitFallbackProfile();
      }

      // DO NOT return fallback for other API errors - throw so caller can handle
      throw new Error(errorMsg);
    }

    // Parse the JSON response
    let responseText = '';
    let parsed: any;
    try {
      const responseData = await response.json();
      responseText = responseData.content?.[0]?.text || JSON.stringify(responseData);
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      // Try to extract JSON from the response if it's wrapped in text
      try {
        parsed = JSON.parse(cleanedResponse);
      } catch (firstParseError) {
        // If that fails, try to find JSON object in the text
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (secondParseError) {
            if (cleanedResponse.toLowerCase().includes('error') || 
                cleanedResponse.toLowerCase().includes('invalid') ||
                cleanedResponse.toLowerCase().startsWith('i')) {
              throw new Error(`API returned error message: ${cleanedResponse.substring(0, 100)}`);
            }
            throw firstParseError;
          }
        } else {
          throw new Error(`No valid JSON found in response: ${cleanedResponse.substring(0, 100)}`);
        }
      }
      
      // Validate and format the response
      const fallbackGifts: NaturalGift[] = [
        { name: 'Creative expression', description: 'Your ability to express yourself through art, writing, or creative mediums that resonate with your inner truth.' },
        { name: 'Bold leadership', description: 'Your natural capacity to inspire and guide others toward meaningful change and transformation.' },
        { name: 'Artistic communication', description: 'Your gift for conveying complex ideas and emotions through visual, written, or spoken forms.' },
        { name: 'Initiating projects', description: 'Your talent for starting new ventures and bringing innovative ideas to life with passion and determination.' },
      ];

      const callingAwaits: CallingAwaitsContent = {
        naturalGifts: Array.isArray(parsed.naturalGifts) && parsed.naturalGifts.length === 4
          ? parsed.naturalGifts.map((gift: any) => {
              if (typeof gift === 'string') {
                return { name: gift, description: `Your natural ability to ${gift.toLowerCase()} and express this gift in your daily life.` };
              }
              return {
                name: gift.name || gift,
                description: gift.description || `Your natural ability to ${(gift.name || gift).toLowerCase()} and express this gift in your daily life.`,
              };
            })
          : fallbackGifts,
        ikigaiCircles: {
          whatYouLove: parsed.ikigaiCircles?.whatYouLove || (whatYouLove ? whatYouLove.split(' ').slice(0, 2).join(' ') : 'Your passions'),
          whatYouGoodAt: parsed.ikigaiCircles?.whatYouGoodAt || (whatYouGoodAt ? whatYouGoodAt.split(' ').slice(0, 2).join(' ') : 'Your talents'),
          whatWorldNeeds: parsed.ikigaiCircles?.whatWorldNeeds || (whatWorldNeeds ? whatWorldNeeds.split(' ').slice(0, 2).join(' ') : 'World needs'),
          whatCanBePaidFor: parsed.ikigaiCircles?.whatCanBePaidFor || (whatCanBePaidFor ? whatCanBePaidFor.split(' ').slice(0, 2).join(' ') : 'Monetizable skills'),
        },
        centerSummary: parsed.centerSummary ? parsed.centerSummary.replace(/calling/gi, 'path').replace(/Calling/gi, 'Path') : 'Your unique path to purpose and fulfillment.',
      };

      const paths: GeneratedPath[] = Array.isArray(parsed.paths) && parsed.paths.length === 3
        ? parsed.paths.map((path: any, index: number) => ({
            id: index + 1,
            title: path.title || `Path ${index + 1}`,
            description: path.description || '',
            glowColor: path.glowColor || ['#cdbad8', '#baccd7', '#a6a76c'][index] || '#cdbad8',
          }))
        : isRussianLocale
          ? [
              {
                id: 1,
                title: 'Творческий вектор',
                description: 'Путь, где твои сильные стороны и интересы складываются в устойчивый рост.',
                glowColor: '#cdbad8',
              },
              {
                id: 2,
                title: 'Личный рост',
                description: 'Маршрут, который помогает преодолеть ограничения и раскрыть потенциал.',
                glowColor: '#baccd7',
              },
              {
                id: 3,
                title: 'Ценный вклад',
                description: 'Направление, в котором твои навыки приносят реальную пользу другим.',
                glowColor: '#a6a76c',
              },
            ]
          : [
              {
                id: 1,
                title: 'Creative Expression',
                description: 'A path aligned with your unique talents and passions.',
                glowColor: '#cdbad8',
              },
              {
                id: 2,
                title: 'Personal Growth',
                description: 'A journey that helps you overcome fears and reach your potential.',
                glowColor: '#baccd7',
              },
              {
                id: 3,
                title: 'Purposeful Impact',
                description: 'A way to make a meaningful difference in the world.',
                glowColor: '#a6a76c',
              },
            ];

      return {
        callingAwaits,
        paths,
      };
    } catch (parseError: any) {
      console.error('[Destiny Profile] Parse error:', parseError.message);
      throw new Error(`Failed to parse API response: ${parseError.message}`);
    }
  } catch (error: any) {
    const rawMessage = error?.message || String(error);
    const isExpectedRateOrCooldown =
      /429|rate limit|input tokens per minute|temporarily unavailable due to recent failures|retrying in \d+ seconds/i.test(rawMessage);
    if (isExpectedRateOrCooldown) {
      console.warn('[Destiny Profile] Rate-limit/cooldown encountered; using local fallback profile.');
      return buildRateLimitFallbackProfile();
    }
    console.warn('[Destiny Profile] API call failed; using local fallback profile:', rawMessage);
    if (/network request failed|failed to fetch|fetch failed|timeout|aborted/i.test(rawMessage)) {
      return buildRateLimitFallbackProfile();
    }
    // Fail-open: do not block onboarding if profile generation fails.
    return buildRateLimitFallbackProfile();
  }
}

export async function generateUnifiedDestinyProfile(
  birthMonth?: string,
  birthDate?: string,
  birthYear?: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string,
  whatYouLove?: string,
  whatYouGoodAt?: string,
  whatWorldNeeds?: string,
  whatCanBePaidFor?: string,
  fear?: string,
  whatExcites?: string,
  currentSituation?: string,
  biggestConstraint?: string,
  whatMattersMost?: string[]
): Promise<UnifiedDestinyProfile> {
  const inflightKey = JSON.stringify({
    language: i18n.language || 'en',
    birthMonth: birthMonth ?? '',
    birthDate: birthDate ?? '',
    birthYear: birthYear ?? '',
    birthCity: birthCity ?? '',
    birthHour: birthHour ?? '',
    birthMinute: birthMinute ?? '',
    birthPeriod: birthPeriod ?? '',
    whatYouLove: whatYouLove ?? '',
    whatYouGoodAt: whatYouGoodAt ?? '',
    whatWorldNeeds: whatWorldNeeds ?? '',
    whatCanBePaidFor: whatCanBePaidFor ?? '',
    fear: fear ?? '',
    whatExcites: whatExcites ?? '',
    currentSituation: currentSituation ?? '',
    biggestConstraint: biggestConstraint ?? '',
    whatMattersMost: Array.isArray(whatMattersMost) ? whatMattersMost : [],
  });
  const existing = unifiedDestinyProfileInflight.get(inflightKey);
  if (existing) {
    return existing;
  }
  const pending = generateUnifiedDestinyProfileUncached(
    birthMonth,
    birthDate,
    birthYear,
    birthCity,
    birthHour,
    birthMinute,
    birthPeriod,
    whatYouLove,
    whatYouGoodAt,
    whatWorldNeeds,
    whatCanBePaidFor,
    fear,
    whatExcites,
    currentSituation,
    biggestConstraint,
    whatMattersMost
  ).finally(() => {
    unifiedDestinyProfileInflight.delete(inflightKey);
  });
  unifiedDestinyProfileInflight.set(inflightKey, pending);
  return pending;
}

async function generatePathContentUncached(
  pathTitle: string,
  pathDescription: string,
  birthMonth?: string,
  birthDate?: string,
  birthYear?: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string,
  whatYouLove?: string,
  whatYouGoodAt?: string,
  whatWorldNeeds?: string,
  whatCanBePaidFor?: string,
  fear?: string,
  whatExcites?: string
): Promise<PathContent> {
  const apiKey = getApiKey('goals');
  const isRussianLocale = i18n.language?.toLowerCase().startsWith('ru');
  const outputLanguageLabel = isRussianLocale ? 'Russian' : 'English';
  const notProvidedLabel = isRussianLocale ? 'Не указано' : 'Not provided';
  const hasCyrillic = (value?: string) => /[А-Яа-яЁё]/.test(value || '');
  const sanitizeWords = (value: string | undefined, maxWords = 3, fallback = ''): string => {
    const normalized = String(value || '')
      .replace(/["'.,!?;:()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return fallback;
    return normalized.split(' ').slice(0, maxWords).join(' ');
  };
  const shortPathTitle = sanitizeWords(pathTitle, 3, isRussianLocale ? 'этом пути' : 'this path');
  const shortFocus = sanitizeWords(whatExcites || whatYouLove || whatYouGoodAt, 3, isRussianLocale ? 'сильной стороне' : 'your strongest focus');
  const fallbackFear = fear || (isRussianLocale ? 'А вдруг не получится?' : 'What if I fail?');
  const isGenericGoalTitle = (title: string): boolean => {
    const normalized = title.trim().toLowerCase();
    return (
      normalized === 'become a full-time professional in this path' ||
      normalized === 'launch your own venture in this field' ||
      normalized === 'create and share your work online' ||
      normalized === 'сделай первый профессиональный рывок' ||
      normalized === 'запусти проект в этом направлении' ||
      normalized === 'покажи результаты публично'
    );
  };
  const buildPersonalizedFallbackContent = (): PathContent => {
    if (isRussianLocale) {
      return {
        whyFitsYou: [
          `Твои сильные стороны ${sunSign ? `знака ${sunSign}` : ''} хорошо подходят для пути «${shortPathTitle}».`,
          `Твои ответы Икигай усиливают направление «${shortPathTitle}».`,
          `Этот путь учитывает твой страх и опирается на то, что тебя вдохновляет: ${shortFocus}.`,
        ],
        goals: [
          {
            id: 1,
            title: `Сделай старт в ${shortPathTitle}`,
            fear: fallbackFear,
            timeFrame: 'три месяца, четыре шага',
            description: `Определи конкретную цель в «${shortPathTitle}» и выполни первые 4 шага по понятному плану.`,
          },
          {
            id: 2,
            title: `Собери систему в ${shortPathTitle}`,
            fear: fallbackFear,
            timeFrame: 'шесть месяцев, восемь шагов',
            description: `Выстрой устойчивый ритм действий в «${shortPathTitle}» и закрепи измеримый прогресс.`,
          },
          {
            id: 3,
            title: `Покажи результат в ${shortPathTitle}`,
            fear: fallbackFear,
            timeFrame: 'два месяца, три шага',
            description: `Оформи и представь результаты в «${shortPathTitle}», чтобы получить обратную связь и усилить движение.`,
          },
        ],
      };
    }
    return {
      whyFitsYou: [
        `Your ${sunSign ? `${sunSign} ` : ''}strengths align with the "${shortPathTitle}" direction.`,
        `Your Ikigai responses reinforce this "${shortPathTitle}" path.`,
        `This direction respects your fear while building on what excites you: ${shortFocus}.`,
      ],
      goals: [
        {
          id: 1,
          title: `Start strong in ${shortPathTitle}`,
          fear: fallbackFear,
          timeFrame: 'three months, four steps',
          description: `Set one concrete outcome for "${shortPathTitle}" and complete your first four practical milestones.`,
        },
        {
          id: 2,
          title: `Build a system for ${shortPathTitle}`,
          fear: fallbackFear,
          timeFrame: 'six months, eight steps',
          description: `Create a sustainable weekly plan for "${shortPathTitle}" and track measurable progress.`,
        },
        {
          id: 3,
          title: `Show results from ${shortPathTitle}`,
          fear: fallbackFear,
          timeFrame: 'two months, three steps',
          description: `Package and share outcomes from "${shortPathTitle}" to get feedback and momentum.`,
        },
      ],
    };
  };
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  // Format birth date and time (handle empty values gracefully)
  const birthDateStr = (birthMonth && birthDate && birthYear) 
    ? `${birthMonth}/${birthDate}/${birthYear}` 
    : notProvidedLabel;
  let birthTimeStr = '';
  if (birthHour && birthMinute && birthPeriod) {
    birthTimeStr = ` at ${birthHour}:${birthMinute} ${birthPeriod}`;
  }
  const locationStr = birthCity ? ` in ${birthCity}` : '';

  // Calculate sun sign (handle empty values gracefully)
  const month = birthMonth ? parseInt(birthMonth) : 0;
  const day = birthDate ? parseInt(birthDate) : 0;
  const hasSunSign = month > 0 && day > 0;
  let sunSign = '';
  
  if (hasSunSign) {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) sunSign = 'Aries';
    else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) sunSign = 'Taurus';
    else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) sunSign = 'Gemini';
    else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) sunSign = 'Cancer';
    else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = 'Leo';
    else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = 'Virgo';
    else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) sunSign = 'Libra';
    else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) sunSign = 'Scorpio';
    else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) sunSign = 'Sagittarius';
    else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) sunSign = 'Capricorn';
    else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) sunSign = 'Aquarius';
    else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) sunSign = 'Pisces';
  }

  // Build prompt conditionally based on available data
  const sunSignSection = hasSunSign 
    ? `- Sun Sign: ${sunSign}`
    : `- Sun Sign: ${notProvidedLabel} (birth date information unavailable)`;

  const pathContentPrompt = `You are an expert astrologer and life coach. Generate personalized content for a specific life path that aligns with the user's calling.

SELECTED PATH:
- Title: ${pathTitle}
- Description: ${pathDescription}

PERSONAL INFORMATION:
- Birth Date: ${birthDateStr}${birthTimeStr}${locationStr}
${sunSignSection}
${birthTimeStr ? `- Birth Time: ${birthHour}:${birthMinute} ${birthPeriod}` : `- Birth Time: ${notProvidedLabel}`}
${locationStr ? `- Birth Location: ${birthCity}` : `- Birth Location: ${notProvidedLabel}`}

IKIGAI RESPONSES:
${whatYouLove ? `- What they love: ${whatYouLove}` : `- What they love: ${notProvidedLabel}`}
${whatYouGoodAt ? `- What they are good at: ${whatYouGoodAt}` : `- What they are good at: ${notProvidedLabel}`}
${whatWorldNeeds ? `- What the world needs: ${whatWorldNeeds}` : `- What the world needs: ${notProvidedLabel}`}
${whatCanBePaidFor ? `- What can be paid for: ${whatCanBePaidFor}` : `- What can be paid for: ${notProvidedLabel}`}

FEARS AND MOTIVATIONS:
${fear ? `- Their fear: ${fear}` : `- Their fear: ${notProvidedLabel}`}
${whatExcites ? `- What excites them: ${whatExcites}` : `- What excites them: ${notProvidedLabel}`}

OUTPUT LANGUAGE REQUIREMENT:
- Return all user-facing text values in ${outputLanguageLabel}.
- Keep JSON keys in English exactly as specified.
- If ${outputLanguageLabel} is Russian, all reasons and goals must be natural Russian text.

INSTRUCTIONS:
1. Generate exactly 3 reasons "Why this fits you" that connect ${hasSunSign ? `their astrological chart (Sun sign: ${sunSign}), ` : ''}their Ikigai responses, and their fears/motivations to this specific path. Each reason should be one sentence (max 25 words).

2. Generate exactly 3 specific, actionable goals related to this path. Each goal should:
   - Have a clear, inspiring title (max 8 words)
   - Include a realistic fear that might hold them back (based on their provided fear: ${fear || 'general fear of failure'})
   - Include a time frame (e.g., "three months, four steps" or "six months, eight steps")
   - Include a description (1-2 sentences, max 30 words) explaining what this goal entails and why it matters for this path
   - Be specific to THIS path and THIS user's profile

OUTPUT FORMAT (JSON only, no other text):
Return a JSON object with this exact structure:
{
  "whyFitsYou": [
    "reason 1 (one sentence, max 25 words)",
    "reason 2 (one sentence, max 25 words)",
    "reason 3 (one sentence, max 25 words)"
  ],
  "goals": [
    {
      "title": "goal title (max 8 words)",
      "fear": "realistic fear (max 15 words)",
      "timeFrame": "time frame (e.g., 'three months, four steps')",
      "description": "goal description explaining what this entails (1-2 sentences, max 30 words)"
    },
    {
      "title": "goal title (max 8 words)",
      "fear": "realistic fear (max 15 words)",
      "timeFrame": "time frame (e.g., 'six months, eight steps')",
      "description": "goal description explaining what this entails (1-2 sentences, max 30 words)"
    },
    {
      "title": "goal title (max 8 words)",
      "fear": "realistic fear (max 15 words)",
      "timeFrame": "time frame (e.g., 'two months, three steps')",
      "description": "goal description explaining what this entails (1-2 sentences, max 30 words)"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations. Just the JSON object.`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: pathContentPrompt,
      },
    ];

    // Haiku: structured JSON path goals — cheaper than Sonnet; deduped at export.
    const response = await tryModel(
      apiKey,
      MODEL_HAIKU,
      apiMessages,
      `You are an expert astrologer and life coach. Return all user-facing values in ${outputLanguageLabel}.`,
      700,
      'clarity'
    );
    // Check response status BEFORE trying to parse JSON
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Unknown error';
      
      // Only log warnings occasionally to reduce spam
      const shouldLog = apiFailureCache.failureCount <= 1 || apiFailureCache.failureCount % 5 === 0;
      if (shouldLog) {
        console.warn(`API error (${response.status}): ${errorMessage}`);
      }
      
      // Return fallback content for API errors
      return buildPersonalizedFallbackContent();
    }

    // Parse the JSON response only if response is ok
    let content: PathContent;
    try {

      const responseData = await response.json();
      const responseText = responseData.content?.[0]?.text || JSON.stringify(responseData);
      
      if (__DEV__) {
        console.log('Path Content API Response:', responseText);
      }
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      let parsed: any;
      try {
        parsed = JSON.parse(cleanedResponse);
      } catch {
        // Fallback: try extracting the first complete JSON object from wrapped/truncated text.
        const firstBrace = cleanedResponse.indexOf('{');
        if (firstBrace === -1) {
          throw new Error('No JSON object found in path content response');
        }

        let braceCount = 0;
        let endIndex = -1;
        for (let i = firstBrace; i < cleanedResponse.length; i++) {
          if (cleanedResponse[i] === '{') braceCount++;
          if (cleanedResponse[i] === '}') braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }

        if (endIndex === -1) {
          throw new Error('Path content JSON appears truncated');
        }

        parsed = JSON.parse(cleanedResponse.substring(firstBrace, endIndex + 1));
      }
      if (__DEV__) {
        console.log('Parsed Path Content:', parsed);
      }
      
      // Validate and format the response
      content = {
        whyFitsYou: Array.isArray(parsed.whyFitsYou) && parsed.whyFitsYou.length === 3
          ? parsed.whyFitsYou
          : buildPersonalizedFallbackContent().whyFitsYou,
        goals: Array.isArray(parsed.goals) && parsed.goals.length === 3
          ? parsed.goals.map((goal: any, index: number) => ({
              id: index + 1,
              title: goal.title || `Goal ${index + 1}`,
              fear: goal.fear || 'What if I fail?',
              timeFrame: goal.timeFrame || 'three months, four steps',
              description: goal.description || '',
            }))
          : buildPersonalizedFallbackContent().goals,
      };
      if (content.goals.some((goal) => isGenericGoalTitle(goal.title))) {
        content.goals = buildPersonalizedFallbackContent().goals;
      }

      if (isRussianLocale) {
        const allWhyFitsAreEnglish = content.whyFitsYou.every((item) => !hasCyrillic(item));
        const allGoalsAreEnglish = content.goals.every(
          (goal) =>
            !hasCyrillic(goal.title) &&
            !hasCyrillic(goal.description) &&
            !hasCyrillic(goal.timeFrame) &&
            !hasCyrillic(goal.fear)
        );
        if (allWhyFitsAreEnglish || allGoalsAreEnglish) {
          content = russianFallbackContent();
        }
      }
    } catch (parseError) {
      console.warn('Path content response was not valid JSON, using fallback content:', parseError);
      // Fallback content
      content = buildPersonalizedFallbackContent();
    }

    return content;
  } catch (error) {
    console.error('Error generating path content:', error);
    // Return fallback content
    return buildPersonalizedFallbackContent();
  }
}

export async function generatePathContent(
  pathTitle: string,
  pathDescription: string,
  birthMonth?: string,
  birthDate?: string,
  birthYear?: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string,
  whatYouLove?: string,
  whatYouGoodAt?: string,
  whatWorldNeeds?: string,
  whatCanBePaidFor?: string,
  fear?: string,
  whatExcites?: string
): Promise<PathContent> {
  const inflightKey = JSON.stringify({
    language: i18n.language || 'en',
    pathTitle: pathTitle || '',
    pathDescription: pathDescription || '',
    birthMonth: birthMonth ?? '',
    birthDate: birthDate ?? '',
    birthYear: birthYear ?? '',
    birthCity: birthCity ?? '',
    birthHour: birthHour ?? '',
    birthMinute: birthMinute ?? '',
    birthPeriod: birthPeriod ?? '',
    whatYouLove: whatYouLove ?? '',
    whatYouGoodAt: whatYouGoodAt ?? '',
    whatWorldNeeds: whatWorldNeeds ?? '',
    whatCanBePaidFor: whatCanBePaidFor ?? '',
    fear: fear ?? '',
    whatExcites: whatExcites ?? '',
  });
  const existing = pathContentInflight.get(inflightKey);
  if (existing) {
    return existing;
  }
  const pending = generatePathContentUncached(
    pathTitle,
    pathDescription,
    birthMonth,
    birthDate,
    birthYear,
    birthCity,
    birthHour,
    birthMinute,
    birthPeriod,
    whatYouLove,
    whatYouGoodAt,
    whatWorldNeeds,
    whatCanBePaidFor,
    fear,
    whatExcites
  ).finally(() => {
    pathContentInflight.delete(inflightKey);
  });
  pathContentInflight.set(inflightKey, pending);
  return pending;
}

export interface GoalStep {
  number: number;
  text: string;
}

export interface LevelStepInstruction {
  text: string;
  icon?: string;
}

export async function generateLevelStepInstructions(
  goalTitle: string,
  levelNumber: number,
  levelName: string,
  totalLevels: number,
  birthMonth: string,
  birthDate: string,
  birthYear: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string,
  whatYouLove?: string,
  whatYouGoodAt?: string,
  whatWorldNeeds?: string,
  whatCanBePaidFor?: string,
  fear?: string,
  whatExcites?: string
): Promise<LevelStepInstruction[]> {
  const apiKey = getApiKey('goals');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  // Format birth date and time
  const birthDateStr = `${birthMonth}/${birthDate}/${birthYear}`;
  let birthTimeStr = '';
  if (birthHour && birthMinute && birthPeriod) {
    birthTimeStr = ` at ${birthHour}:${birthMinute} ${birthPeriod}`;
  }
  const locationStr = birthCity ? ` in ${birthCity}` : '';

  // Calculate sun sign
  const month = parseInt(birthMonth);
  const day = parseInt(birthDate);
  let sunSign = '';
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) sunSign = 'Aries';
  else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) sunSign = 'Taurus';
  else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) sunSign = 'Gemini';
  else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) sunSign = 'Cancer';
  else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = 'Leo';
  else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = 'Virgo';
  else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) sunSign = 'Libra';
  else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) sunSign = 'Scorpio';
  else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) sunSign = 'Sagittarius';
  else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) sunSign = 'Capricorn';
  else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) sunSign = 'Aquarius';
  else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) sunSign = 'Pisces';

  const isRussianLocale = i18n.language?.toLowerCase().startsWith('ru');
  const langInstruction = isRussianLocale
    ? '\n\nCRITICAL: You MUST write ALL step text fields entirely in Russian. Do not use any English words in the output.'
    : '';

  const stepInstructionsPrompt = `You are an expert life coach and goal achievement specialist. Generate specific, actionable step instructions for completing a level in a goal.

GOAL: ${goalTitle}

LEVEL INFORMATION:
- Level Number: ${levelNumber} of ${totalLevels}
- Level Name: ${levelName}
- Progress: This is level ${levelNumber} out of ${totalLevels} total levels

PERSONAL INFORMATION:
- Birth Date: ${birthDateStr}${birthTimeStr}${locationStr}
- Sun Sign: ${sunSign}
${whatYouLove ? `- What they love: ${whatYouLove}` : ''}
${whatYouGoodAt ? `- What they are good at: ${whatYouGoodAt}` : ''}
${whatWorldNeeds ? `- What the world needs: ${whatWorldNeeds}` : ''}
${whatCanBePaidFor ? `- What can be paid for: ${whatCanBePaidFor}` : ''}
${fear ? `- Their fear: ${fear}` : ''}
${whatExcites ? `- What excites them: ${whatExcites}` : ''}

INSTRUCTIONS:
Generate EXACTLY 3 specific, actionable step instructions that will help the user complete this level and move closer to their goal.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 3 steps (no more, no less) - this prevents overwhelming the user
- Each step must be SPECIFIC and ACTIONABLE (not vague concepts)
- Each step must be MEASURABLE (user knows when it's complete)
- Steps should be SEQUENTIAL (each builds on the previous)
- Steps should be REALISTIC and ACHIEVABLE for this level
- Each step should be concise (max 15 words)
- Steps should directly relate to completing "${levelName}" (Level ${levelNumber})
- Each step must bring the user closer to completing this specific level
- Consider their Sun sign (${sunSign}) and Ikigai responses if relevant
- Address their fears or leverage what excites them if relevant
- Focus on what's needed to complete Level ${levelNumber}, not the entire goal

EXAMPLES OF GOOD STEPS:
- "Research 5 companies in your field and list their job openings"
- "Write 3 bullet points describing your recent project accomplishments"
- "Create a portfolio website with your 5 best projects"
- "Send personalized pitch emails to 10 potential clients this week"
- "Schedule 3 informational interviews with professionals in your target industry"

EXAMPLES OF BAD STEPS (avoid these):
- "Research career options" (too vague)
- "Work on your resume" (not specific)
- "Practice speaking" (not measurable)
- "Daily journaling" (not directly related to level completion)

OUTPUT FORMAT (JSON only, no other text):
Return a JSON array with EXACTLY 3 steps (no more, no less):
[
  { "text": "First specific actionable step to complete this level (max 15 words)" },
  { "text": "Second specific actionable step to complete this level (max 15 words)" },
  { "text": "Third specific actionable step to complete this level (max 15 words)" }
]

CRITICAL REQUIREMENTS:
- Return EXACTLY 3 steps - no more, no less
- Each step must directly help complete "${levelName}" (Level ${levelNumber})
- Steps should be sequential and build on each other
- Each step must be specific, actionable, and measurable
- Steps should progress the user toward completing this specific level
- Consider the goal context: "${goalTitle}"
- Each step should bring the user closer to completing Level ${levelNumber}

IMPORTANT: 
- Return ONLY valid JSON array
- No markdown, no code blocks, no explanations
- EXACTLY 3 steps (required, not optional)
- Each step must be unique and directly related to completing this level${langInstruction}`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: stepInstructionsPrompt,
      },
    ];

    // Use Sonnet for step instructions
    const systemMsg = `You are an expert life coach and goal achievement specialist. Generate specific, actionable step instructions.${isRussianLocale ? ' Always respond in Russian.' : ''}`;
    const response = await tryModel(apiKey, 'claude-sonnet-4-5', apiMessages, systemMsg, 500, 'goals');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const responseData = await response.json();
    const responseText = responseData.content?.[0]?.text || '';
    
    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    }
    
    // Parse JSON
    const steps = JSON.parse(cleanedResponse) as LevelStepInstruction[];
    
    // Validate and ensure we have exactly 3 steps
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('Invalid response format');
    }
    
    // Ensure steps have text property and limit to exactly 3 steps
    const validSteps = steps
      .filter(step => step && step.text && step.text.trim().length > 0)
      .slice(0, 3) // Exactly 3 steps max
      .map(step => ({ text: step.text.trim() }));
    
    // Ensure exactly 3 steps (add fallback if needed)
    while (validSteps.length < 3) {
      const stepNumber = validSteps.length + 1;
      const fallbackSteps = isRussianLocale
        ? [
            `Исследуй и подготовься к: ${levelName}`,
            `Сделай конкретный шаг к: ${levelName}`,
            `Заверши и проверь прогресс: ${levelName}`,
          ]
        : [
            `Research and prepare for ${levelName}`,
            `Take concrete action toward ${levelName}`,
            `Complete and verify ${levelName} progress`,
          ];
      validSteps.push({ text: fallbackSteps[stepNumber - 1] || (isRussianLocale ? `Выполни шаг ${stepNumber}: ${levelName}` : `Complete step ${stepNumber} for ${levelName}`) });
    }
    
    // Ensure we have exactly 3 steps (remove extras if somehow more than 3)
    return validSteps.slice(0, 3);
  } catch (error) {
    console.error('Error generating level step instructions:', error);
    return isRussianLocale
      ? [
          { text: `Исследуй и подготовься к: ${levelName}` },
          { text: `Сделай конкретный шаг к: ${levelName}` },
          { text: `Заверши и проверь прогресс: ${levelName}` },
        ]
      : [
          { text: `Research and prepare for ${levelName}` },
          { text: `Take concrete action toward ${levelName}` },
          { text: `Complete and verify ${levelName} progress` },
        ];
  }
}

export async function generateStepDescription(
  goalTitle: string,
  stepNumber: number,
  stepName: string,
  totalSteps: number,
  birthMonth: string,
  birthDate: string,
  birthYear: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string,
  whatYouLove?: string,
  whatYouGoodAt?: string,
  whatWorldNeeds?: string,
  whatCanBePaidFor?: string,
  fear?: string,
  whatExcites?: string
): Promise<string> {
  const apiKey = getApiKey('goals');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  // Format birth date and time
  const birthDateStr = `${birthMonth}/${birthDate}/${birthYear}`;
  let birthTimeStr = '';
  if (birthHour && birthMinute && birthPeriod) {
    birthTimeStr = ` at ${birthHour}:${birthMinute} ${birthPeriod}`;
  }
  const locationStr = birthCity ? ` in ${birthCity}` : '';

  // Calculate sun sign
  const month = parseInt(birthMonth);
  const day = parseInt(birthDate);
  let sunSign = '';
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) sunSign = 'Aries';
  else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) sunSign = 'Taurus';
  else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) sunSign = 'Gemini';
  else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) sunSign = 'Cancer';
  else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = 'Leo';
  else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = 'Virgo';
  else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) sunSign = 'Libra';
  else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) sunSign = 'Scorpio';
  else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) sunSign = 'Sagittarius';
  else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) sunSign = 'Capricorn';
  else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) sunSign = 'Aquarius';
  else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) sunSign = 'Pisces';

  // Calculate approximate ascendant based on birth time and location
  let ascendantInfo = '';
  if (birthHour && birthMinute && birthPeriod && birthCity) {
    let hour24 = parseInt(birthHour);
    if (birthPeriod === 'PM' && hour24 !== 12) hour24 += 12;
    if (birthPeriod === 'AM' && hour24 === 12) hour24 = 0;
    
    if (hour24 >= 6 && hour24 < 12) {
      ascendantInfo = 'Morning birth (likely Fire or Air rising sign)';
    } else if (hour24 >= 12 && hour24 < 18) {
      ascendantInfo = 'Afternoon birth (likely Earth or Air rising sign)';
    } else if (hour24 >= 18 && hour24 < 24) {
      ascendantInfo = 'Evening birth (likely Water or Earth rising sign)';
    } else {
      ascendantInfo = 'Night birth (likely Fire or Water rising sign)';
    }
  }

  const isRussianLocale = i18n.language?.toLowerCase().startsWith('ru');
  const stepLangInstruction = isRussianLocale
    ? '\n\nCRITICAL: You MUST write the entire response in Russian. All section headings and bullet points must be in Russian.'
    : '';

  const stepDescriptionPrompt = `You are an expert life coach and goal achievement specialist with deep knowledge of astrology and natal chart analysis. Generate a detailed, actionable description for a specific step in achieving a goal.

GOAL: ${goalTitle}

STEP INFORMATION:
- Step Number: ${stepNumber} of ${totalSteps}
- Step Name: ${stepName}

PERSONAL INFORMATION:
- Birth Date: ${birthDateStr}${birthTimeStr}${locationStr}
- Sun Sign: ${sunSign}
${birthTimeStr ? `- Birth Time: ${birthHour}:${birthMinute} ${birthPeriod}` : '- Birth Time: Not provided'}
${locationStr ? `- Birth Location: ${birthCity}` : '- Birth Location: Not provided'}
${ascendantInfo ? `- Ascendant/Rising Sign Indicator: ${ascendantInfo}` : '- Ascendant/Rising Sign: Not calculated (birth time and location needed)'}

${birthHour && birthMinute && birthPeriod && birthCity ? `
CRITICAL ASTROLOGICAL ANALYSIS:
You have complete birth data including time and location. Use this to create a MORE DETAILED and PERSONALIZED step description:

1. **Ascendant (Rising Sign)**: Calculated from birth time (${birthHour}:${birthMinute} ${birthPeriod}) and location (${birthCity}). Consider how their ascendant influences their approach to this step:
   - Fire Rising: Direct, action-oriented approach works best
   - Earth Rising: Practical, structured, methodical approach
   - Air Rising: Communicative, analytical, variety-focused approach
   - Water Rising: Intuitive, emotional, meaning-focused approach

2. **Birth Location Impact**: The location (${birthCity}) affects their natural rhythms and cultural context - consider this when framing instructions.

3. **Birth Time Precision**: The exact time (${birthHour}:${birthMinute} ${birthPeriod}) determines their personal timing patterns - align step instructions with their natural energy flow.

Use ALL of this astrological data to create step instructions that:
- Align with their natural personality (Sun sign: ${sunSign})
- Respect their outer expression style (Ascendant/Rising)
- Consider their birth location's influence (${birthCity})
- Work with their natural timing and energy patterns

This comprehensive astrological analysis should make the step description MORE DETAILED and PERSONALIZED.
` : `
NOTE: Birth time and/or location are missing. While you can still create good step descriptions based on Sun sign and other data, a complete natal chart analysis (including Ascendant) would provide even more personalized insights.
`}

IKIGAI RESPONSES:
${whatYouLove ? `- What they love: ${whatYouLove}` : '- What they love: Not provided'}
${whatYouGoodAt ? `- What they are good at: ${whatYouGoodAt}` : '- What they are good at: Not provided'}
${whatWorldNeeds ? `- What the world needs: ${whatWorldNeeds}` : '- What the world needs: Not provided'}
${whatCanBePaidFor ? `- What can be paid for: ${whatCanBePaidFor}` : '- What can be paid for: Not provided'}

FEARS AND MOTIVATIONS:
${fear ? `- Their fear: ${fear}` : '- Their fear: Not provided'}
${whatExcites ? `- What excites them: ${whatExcites}` : '- What excites them: Not provided'}

INSTRUCTIONS:
Generate a concise instruction for this step that helps the user understand what to do and why.

CRITICAL REQUIREMENTS:
- MAXIMUM 200 WORDS - be extremely concise
- NEVER use "**" or any bold markdown formatting
- NO STARS (⭐) in any headings or text
- Use plain text only

The instruction MUST contain these 3 sections in this order:

1. WHY THIS STEP MATTERS (2-3 sentences)
   Explain why completing this step is essential for moving forward to the next level. Connect it to their overall goal.

2. HOW TO COMPLETE IT (3-5 bullet points)
   Provide clear, actionable steps using "- " for bullets. Be specific and practical.

3. TIME ESTIMATE (1 sentence)
   State how long this step should take (e.g., "Estimated time: 2-3 hours" or "Estimated time: 1-2 days")

FORMAT EXAMPLE:
Why This Step Matters
[2-3 sentences explaining importance]

How to Complete It
- First action item
- Second action item
- Third action item

Time Estimate
Estimated time: [X hours/days]

DO NOT:
- Use "**" or any bold formatting
- Exceed 200 words
- Add motivational fluff
- Use stars (⭐)

OUTPUT FORMAT:
Return ONLY the instruction text (MAX 200 WORDS). Plain text with section headings (no bold markers). Use "- " for bullet points.${stepLangInstruction}`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: stepDescriptionPrompt,
      },
    ];

    // Use Sonnet for step instructions with reduced tokens (200 words max)
    const sysMsg = `You are an expert life coach and goal achievement specialist. Never use ** or bold markdown formatting.${isRussianLocale ? ' Always respond in Russian.' : ''}`;
    const response = await tryModel(apiKey, 'claude-sonnet-4-5', apiMessages, sysMsg, 250, 'goals');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const responseData = await response.json();
    const responseText = responseData.content?.[0]?.text || '';
    
    // Clean the response - remove markdown code blocks and bold markers if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```[a-z]*\n?/g, '').replace(/```\n?/g, '');
    }
    
    // Remove any ** bold markdown that might have slipped through
    cleanedResponse = cleanedResponse.replace(/\*\*/g, '');
    
    // Ensure the response doesn't exceed 200 words
    const words = cleanedResponse.split(/\s+/);
    if (words.length > 200) {
      cleanedResponse = words.slice(0, 200).join(' ') + '...';
    }
    
    return cleanedResponse || (isRussianLocale
      ? `Выполни "${stepName}" для продвижения к цели "${goalTitle}".`
      : `Complete ${stepName} to progress towards your goal of ${goalTitle}.`);
  } catch (error) {
    console.error('Error generating step description:', error);
    return isRussianLocale
      ? `Выполни "${stepName}" для продвижения к цели "${goalTitle}". Этот шаг является основой для движения вперёд.`
      : `Complete ${stepName} to progress towards your goal of ${goalTitle}. This step is essential for building the foundation needed to move forward.`;
  }
}

export async function generateGoalSteps(
  goalTitle: string,
  birthMonth: string,
  birthDate: string,
  birthYear: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string,
  whatYouLove?: string,
  whatYouGoodAt?: string,
  whatWorldNeeds?: string,
  whatCanBePaidFor?: string,
  fear?: string,
  whatExcites?: string,
  pathName?: string,
  pathDescription?: string
): Promise<{ goalSummary: string; estimatedDuration: string; steps: GoalStep[] }> {
  const apiKey = getApiKey('goals');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  // Format birth date and time
  const birthDateStr = `${birthMonth}/${birthDate}/${birthYear}`;
  let birthTimeStr = '';
  if (birthHour && birthMinute && birthPeriod) {
    birthTimeStr = ` at ${birthHour}:${birthMinute} ${birthPeriod}`;
  }
  const locationStr = birthCity ? ` in ${birthCity}` : '';

  // Calculate sun sign
  const month = parseInt(birthMonth);
  const day = parseInt(birthDate);
  let sunSign = '';
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) sunSign = 'Aries';
  else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) sunSign = 'Taurus';
  else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) sunSign = 'Gemini';
  else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) sunSign = 'Cancer';
  else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = 'Leo';
  else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = 'Virgo';
  else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) sunSign = 'Libra';
  else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) sunSign = 'Scorpio';
  else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) sunSign = 'Sagittarius';
  else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) sunSign = 'Capricorn';
  else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) sunSign = 'Aquarius';
  else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) sunSign = 'Pisces';

  // Calculate approximate ascendant based on birth time and location
  let ascendantInfo = '';
  if (birthHour && birthMinute && birthPeriod && birthCity) {
    let hour24 = parseInt(birthHour);
    if (birthPeriod === 'PM' && hour24 !== 12) hour24 += 12;
    if (birthPeriod === 'AM' && hour24 === 12) hour24 = 0;
    
    if (hour24 >= 6 && hour24 < 12) {
      ascendantInfo = 'Morning birth (likely Fire or Air rising sign)';
    } else if (hour24 >= 12 && hour24 < 18) {
      ascendantInfo = 'Afternoon birth (likely Earth or Air rising sign)';
    } else if (hour24 >= 18 && hour24 < 24) {
      ascendantInfo = 'Evening birth (likely Water or Earth rising sign)';
    } else {
      ascendantInfo = 'Night birth (likely Fire or Water rising sign)';
    }
  }

  const isRussianLocale = i18n.language?.toLowerCase().startsWith('ru');
  const languageInstruction = isRussianLocale
    ? '\n\nCRITICAL: You MUST write ALL output fields (goalSummary, step names, descriptions, estimatedDuration) entirely in Russian. Do not use any English words in the output.'
    : '';

  const goalStepsPrompt = `You are an expert life coach and goal achievement specialist with deep knowledge of astrology and natal chart analysis. Generate a personalized action plan for achieving a specific goal.

GOAL: ${goalTitle}
${pathName ? `\nPATH CHOSEN: ${pathName}` : ''}
${pathDescription ? `\nPATH DESCRIPTION: ${pathDescription}` : ''}

PERSONAL INFORMATION:
- Birth Date: ${birthDateStr}${birthTimeStr}${locationStr}
- Sun Sign: ${sunSign}
${birthTimeStr ? `- Birth Time: ${birthHour}:${birthMinute} ${birthPeriod}` : '- Birth Time: Not provided'}
${locationStr ? `- Birth Location: ${birthCity}` : '- Birth Location: Not provided'}
${ascendantInfo ? `- Ascendant/Rising Sign Indicator: ${ascendantInfo}` : '- Ascendant/Rising Sign: Not calculated (birth time and location needed)'}

${birthHour && birthMinute && birthPeriod && birthCity ? `
CRITICAL ASTROLOGICAL ANALYSIS:
You have complete birth data including time and location. Use this to create a MORE DETAILED and PERSONALIZED analysis:

1. **Ascendant (Rising Sign)**: Calculated from birth time (${birthHour}:${birthMinute} ${birthPeriod}) and location (${birthCity}). The ascendant represents:
   - How the person presents themselves to the world
   - Their approach to new situations and first impressions
   - Their natural defense mechanisms and outer personality
   - Their physical appearance and energy
   
   Consider how the ascendant influences their goal achievement style:
   - Fire Rising (Aries, Leo, Sagittarius): Direct, action-oriented, needs quick wins
   - Earth Rising (Taurus, Virgo, Capricorn): Practical, methodical, needs structure
   - Air Rising (Gemini, Libra, Aquarius): Communicative, analytical, needs variety
   - Water Rising (Cancer, Scorpio, Pisces): Intuitive, emotional, needs meaning

2. **Birth Location Impact**: The location (${birthCity}) affects:
   - House cusps and planetary placements
   - Cultural and environmental influences on their personality
   - Regional opportunities and challenges
   - Local timing and rhythms that resonate with them

3. **Birth Time Precision**: The exact time (${birthHour}:${birthMinute} ${birthPeriod}) determines:
   - Precise ascendant degree
   - House placements
   - Planetary aspects and angles
   - Personal timing and energy patterns

Use ALL of this astrological data to create steps that:
- Align with their natural personality (Sun sign: ${sunSign})
- Respect their outer expression style (Ascendant/Rising)
- Consider their birth location's influence (${birthCity})
- Work with their natural timing and energy patterns
- Match their astrological strengths

This comprehensive astrological analysis should make the goal steps MORE DETAILED and PERSONALIZED.
` : `
NOTE: Birth time and/or location are missing. While you can still create good steps based on Sun sign and other data, a complete natal chart analysis (including Ascendant) would provide even more personalized insights.
`}

IKIGAI RESPONSES:
${whatYouLove ? `- What they love: ${whatYouLove}` : '- What they love: Not provided'}
${whatYouGoodAt ? `- What they are good at: ${whatYouGoodAt}` : '- What they are good at: Not provided'}
${whatWorldNeeds ? `- What the world needs: ${whatWorldNeeds}` : '- What the world needs: Not provided'}
${whatCanBePaidFor ? `- What can be paid for: ${whatCanBePaidFor}` : '- What can be paid for: Not provided'}

FEARS AND MOTIVATIONS:
${fear ? `- Their fear: ${fear}` : '- Their fear: Not provided'}
${whatExcites ? `- What excites them: ${whatExcites}` : '- What excites them: Not provided'}

${pathName || pathDescription ? `
PATH CONTEXT:
${pathName ? `- Path Name: ${pathName}` : ''}
${pathDescription ? `- Path Description: ${pathDescription}` : ''}

IMPORTANT: The user has chosen a specific path (${pathName || 'their chosen path'}). When generating goal steps, you MUST:
1. Align the steps with the chosen path's theme and approach
2. Incorporate the path's philosophy and methodology into the step structure
3. Ensure the goal steps reflect the path's unique characteristics
4. Combine the goal title with the path's framework to create a cohesive quest map
5. The quest map should feel like a journey that follows the path's principles while achieving the specific goal

` : ''}

INSTRUCTIONS:
1. Create a short summary (max 20 words) of their goal that captures the essence of what they want to achieve.

2. Generate 2-4 specific, actionable steps to achieve this goal (maximum 4 steps). Each step MUST be:

   CRITICAL REQUIREMENTS:
   - SPECIFIC ACTION: Tell user exactly what to do (not vague concepts)
     ❌ BAD: "Research career options" or "Work on your resume" or "Practice speaking" or "Daily journaling"
     ✅ GOOD: "List 5 companies in your field and research their job openings" or "Write 3 bullet points describing your recent project accomplishments" or "Practice your 2-minute introduction in front of mirror for 10 minutes today"
   
   - MEASURABLE OUTCOME: User knows when it's complete
     ❌ BAD: "Research" or "Work on" or "Practice" or "Journal about"
     ✅ GOOD: "List 5 companies" or "Write 3 bullet points" or "Practice for 10 minutes"
   
   - TIME-BOUND: Clear timeframe included
     ❌ BAD: "Create portfolio" or "Send emails"
     ✅ GOOD: "Create portfolio website with 5 best projects by end of week" or "Send personalized pitch emails to 10 potential clients this week"
   
   - DIRECTLY RELATED TO GOAL: Every step must build toward the final goal
     If goal is "Become a dog trainer," steps should be: research certifications, shadow a trainer, take online course, get hands-on practice
     ❌ BAD: journaling, meditation, general reflection (unless goal is specifically about that)
     ✅ GOOD: concrete actions that directly progress toward the goal
   
   - SEQUENTIAL: Steps build on each other (step 1 enables step 2, step 2 enables step 3, etc.)
   
   - Be ordered from foundational to advanced (step 1 is the foundation, higher numbers build on previous steps)
   - Consider their astrological strengths (Sun sign: ${sunSign}) only if directly relevant
   - Leverage their Ikigai responses only if directly relevant
   - Address their fears or leverage what excites them only if directly relevant
   - Be realistic and achievable
   - Each step should be concise and fit into TWO LINES OF TEXT (max 10 words per step)
   - Use fewer words while maintaining clarity and actionability
   - Summarize information to your best ability while staying within the word limit

2. Estimate a realistic, doable timeline for completing this entire goal. Consider:
   - The complexity and scope of the goal
   - The number of steps required
   - Typical timeframes for similar goals
   - The user's personal circumstances (if relevant from their astrological profile)
   - Be realistic and achievable (e.g., "2 weeks", "1 month", "2 months", "3 months", "6 months")
   ${birthHour && birthMinute && birthPeriod && birthCity ? `Consider their natural timing patterns based on their birth chart when estimating duration.` : ''}

OUTPUT FORMAT (JSON only, no other text):
Return a JSON object with this exact structure:
{
  "goalSummary": "short summary of the goal (max 20 words)",
  "estimatedDuration": "realistic timeline for goal completion (e.g., '2 weeks', '1 month', '2 months', '3 months')",
  "steps": [
    { 
      "number": 1, 
      "text": "Level name (descriptive, 2-4 words, NO 'Level 1:' prefix, e.g., 'Foundation Building', 'Skill Development')",
      "name": "Level name (descriptive, 2-4 words, NO 'Level 1:' prefix)",
      "description": "Short description (max 15 words) of what to do in this level",
      "order": 1
    },
    { 
      "number": 2, 
      "text": "Level name (descriptive, 2-4 words, NO 'Level 2:' prefix)",
      "name": "Level name (descriptive, 2-4 words, NO 'Level 2:' prefix)",
      "description": "Short description (max 15 words) of what to do in this level",
      "order": 2
    },
    { 
      "number": 3, 
      "text": "Level name (descriptive, 2-4 words, NO 'Level 3:' prefix)",
      "name": "Level name (descriptive, 2-4 words, NO 'Level 3:' prefix)",
      "description": "Short description (max 15 words) of what to do in this level",
      "order": 3
    },
    { 
      "number": 4, 
      "text": "Level name (descriptive, 2-4 words, NO 'Level 4:' prefix)",
      "name": "Level name (descriptive, 2-4 words, NO 'Level 4:' prefix)",
      "description": "Short description (max 15 words) of what to do in this level",
      "order": 4
    }
  ]
}

CRITICAL REQUIREMENTS FOR LEVEL NAMES:
- Each "name" should be a descriptive level name (2-4 words) WITHOUT any "Level X:" prefix
- Examples of good names: "Foundation Building", "Skill Development", "Network Expansion", "Mastery Achievement"
- Examples of bad names: "Level 1: Foundation", "Step 2: Development" (DO NOT include numbers or prefixes)
- Each "description" must be SHORT (maximum 15 words) and actionable
- The "text" field should match the "name" field (for backward compatibility)

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations. Just the JSON object.${languageInstruction}`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: goalStepsPrompt,
      },
    ];

    // Use Sonnet for complex goal planning with reduced tokens
    const cachedSystemPrompt = [
      {
        type: 'text' as const,
        text: `You are an expert life coach and goal achievement specialist.${isRussianLocale ? ' Always respond in Russian.' : ''}`,
        cache_control: { type: 'ephemeral' as const },
      },
    ];
    const response = await tryModel(apiKey, 'claude-sonnet-4-5', apiMessages, cachedSystemPrompt, 500, 'goals');

    let result: { goalSummary: string; steps: GoalStep[] };
    try {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const responseData = await response.json();
      const responseText = responseData.content?.[0]?.text || JSON.stringify(responseData);
      
      console.log('Goal Steps API Response:', responseText);
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(cleanedResponse);
      console.log('Parsed Goal Steps:', parsed);
      
      // Validate and format the response
      const parsedSteps = Array.isArray(parsed.steps) && parsed.steps.length > 0
        ? parsed.steps.map((step: any) => {
            // Extract level name (prefer 'name' field, fallback to 'text', clean any "Level X:" prefixes)
            let levelName = step.name || step.text || '';
            levelName = levelName.replace(/^Level\s*\d+\s*:?\s*/i, '').trim();
            
            // Extract description (prefer 'description' field, fallback to empty)
            let description = step.description || '';
            // Ensure description is short (max 15 words)
            if (description) {
              const words = description.split(' ');
              if (words.length > 15) {
                description = words.slice(0, 15).join(' ') + '...';
              }
            }
            
            // If no name after cleaning, use fallback
            if (!levelName) {
              const fallbackNames = isRussianLocale
                ? ['Фундамент', 'Развитие навыков', 'Набор импульса', 'Мастерство']
                : ['Foundation Building', 'Skill Development', 'Momentum Building', 'Mastery Achievement'];
              levelName = fallbackNames[(step.number || 1) - 1] || (isRussianLocale ? `Уровень ${step.number || 1}` : `Level ${step.number || 1}`);
            }
            
            // If no description, create a short one from the name
            if (!description) {
              description = isRussianLocale
                ? `Выполни ${levelName.toLowerCase()} для продвижения вперёд`
                : `Complete ${levelName.toLowerCase()} to progress`;
            }
            
            return {
              number: step.number || step.order || 1,
              text: levelName, // Keep text for backward compatibility
              name: levelName, // Add name field
              description: description, // Add description field
              order: step.order || step.number || 1,
            };
          }).sort((a: any, b: any) => (a.number || a.order || 0) - (b.number || b.order || 0)).slice(0, 4) // Limit to max 4 steps
        : isRussianLocale ? [
            { number: 1, text: 'Фундамент', name: 'Фундамент', description: 'Подготовь основу и стартовый план', order: 1 },
            { number: 2, text: 'Развитие навыков', name: 'Развитие навыков', description: 'Развивай нужные навыки и знания', order: 2 },
            { number: 3, text: 'Набор импульса', name: 'Набор импульса', description: 'Поддерживай прогресс и корректируй стратегию', order: 3 },
            { number: 4, text: 'Мастерство', name: 'Мастерство', description: 'Заверши цель и отметь результат', order: 4 },
          ] : [
            { number: 1, text: 'Foundation Building', name: 'Foundation Building', description: 'Establish the groundwork and initial plan', order: 1 },
            { number: 2, text: 'Skill Development', name: 'Skill Development', description: 'Build necessary skills and knowledge', order: 2 },
            { number: 3, text: 'Momentum Building', name: 'Momentum Building', description: 'Maintain progress and adapt strategies', order: 3 },
            { number: 4, text: 'Mastery Achievement', name: 'Mastery Achievement', description: 'Complete goal and celebrate success', order: 4 },
          ];
      
      result = {
        goalSummary: parsed.goalSummary || (isRussianLocale ? `Достичь цели: ${goalTitle}` : `Achieve your goal: ${goalTitle}`),
        estimatedDuration: parsed.estimatedDuration || (isRussianLocale ? '1 месяц' : '1 month'),
        steps: parsedSteps,
      };
    } catch (parseError) {
      console.error('Error parsing goal steps JSON:', parseError);
      result = {
        goalSummary: isRussianLocale ? `Достичь цели: ${goalTitle}` : `Achieve your goal: ${goalTitle}`,
        estimatedDuration: isRussianLocale ? '1 месяц' : '1 month',
        steps: isRussianLocale ? [
          { number: 1, text: 'Фундамент', name: 'Фундамент', description: 'Подготовь основу и стартовый план', order: 1 },
          { number: 2, text: 'Развитие навыков', name: 'Развитие навыков', description: 'Развивай нужные навыки и знания', order: 2 },
          { number: 3, text: 'Набор импульса', name: 'Набор импульса', description: 'Поддерживай прогресс и корректируй стратегию', order: 3 },
          { number: 4, text: 'Мастерство', name: 'Мастерство', description: 'Заверши цель и отметь результат', order: 4 },
        ] : [
          { number: 1, text: 'Foundation Building', name: 'Foundation Building', description: 'Establish the groundwork and initial plan', order: 1 },
          { number: 2, text: 'Skill Development', name: 'Skill Development', description: 'Build necessary skills and knowledge', order: 2 },
          { number: 3, text: 'Momentum Building', name: 'Momentum Building', description: 'Maintain progress and adapt strategies', order: 3 },
          { number: 4, text: 'Mastery Achievement', name: 'Mastery Achievement', description: 'Complete goal and celebrate success', order: 4 },
        ],
      };
    }

    return result;
  } catch (error) {
    console.error('Error generating goal steps:', error);
    return {
      goalSummary: isRussianLocale ? `Достичь цели: ${goalTitle}` : `Achieve your goal: ${goalTitle}`,
      estimatedDuration: isRussianLocale ? '1 месяц' : '1 month',
      steps: isRussianLocale ? [
        { number: 1, text: 'Фундамент', name: 'Фундамент', description: 'Подготовь основу и стартовый план', order: 1 },
        { number: 2, text: 'Развитие навыков', name: 'Развитие навыков', description: 'Развивай нужные навыки и знания', order: 2 },
        { number: 3, text: 'Набор импульса', name: 'Набор импульса', description: 'Поддерживай прогресс и корректируй стратегию', order: 3 },
        { number: 4, text: 'Мастерство', name: 'Мастерство', description: 'Заверши цель и отметь результат', order: 4 },
      ] : [
        { number: 1, text: 'Foundation Building', name: 'Foundation Building', description: 'Establish the groundwork and initial plan', order: 1 },
        { number: 2, text: 'Skill Development', name: 'Skill Development', description: 'Build necessary skills and knowledge', order: 2 },
        { number: 3, text: 'Momentum Building', name: 'Momentum Building', description: 'Maintain progress and adapt strategies', order: 3 },
        { number: 4, text: 'Mastery Achievement', name: 'Mastery Achievement', description: 'Complete goal and celebrate success', order: 4 },
      ],
    };
  }
}

export interface CompleteGoal {
  name: string;
  steps: Array<{ name: string; description: string; order: number }>;
  numberOfSteps: number;
  estimatedDuration: string;
  hardnessLevel: 'Easy' | 'Medium' | 'Hard';
  fear: string;
}

export async function generateCompleteGoal(
  goalTitle: string,
  birthMonth: string,
  birthDate: string,
  birthYear: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string,
  whatYouLove?: string,
  whatYouGoodAt?: string,
  whatWorldNeeds?: string,
  whatCanBePaidFor?: string,
  fear?: string,
  whatExcites?: string
): Promise<CompleteGoal> {
  const apiKey = getApiKey('goals');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  // Format birth date and time
  const birthDateStr = `${birthMonth}/${birthDate}/${birthYear}`;
  let birthTimeStr = '';
  if (birthHour && birthMinute && birthPeriod) {
    birthTimeStr = ` at ${birthHour}:${birthMinute} ${birthPeriod}`;
  }
  const locationStr = birthCity ? ` in ${birthCity}` : '';

  // Calculate sun sign
  const month = parseInt(birthMonth);
  const day = parseInt(birthDate);
  let sunSign = '';
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) sunSign = 'Aries';
  else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) sunSign = 'Taurus';
  else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) sunSign = 'Gemini';
  else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) sunSign = 'Cancer';
  else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = 'Leo';
  else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = 'Virgo';
  else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) sunSign = 'Libra';
  else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) sunSign = 'Scorpio';
  else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) sunSign = 'Sagittarius';
  else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) sunSign = 'Capricorn';
  else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) sunSign = 'Aquarius';
  else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) sunSign = 'Pisces';

  // Calculate approximate ascendant based on birth time and location
  // Note: This is a simplified calculation - for accuracy, use a proper astrological library
  // Ascendant changes approximately every 2 hours and varies by location
  let ascendantInfo = '';
  if (birthHour && birthMinute && birthPeriod && birthCity) {
    // Convert to 24-hour format
    let hour24 = parseInt(birthHour);
    if (birthPeriod === 'PM' && hour24 !== 12) hour24 += 12;
    if (birthPeriod === 'AM' && hour24 === 12) hour24 = 0;
    
    // Approximate ascendant based on time of day (simplified)
    // Morning (6am-12pm): More likely fire/air signs
    // Afternoon (12pm-6pm): More likely earth/air signs  
    // Evening (6pm-12am): More likely water/earth signs
    // Night (12am-6am): More likely fire/water signs
    if (hour24 >= 6 && hour24 < 12) {
      ascendantInfo = 'Morning birth (likely Fire or Air rising sign)';
    } else if (hour24 >= 12 && hour24 < 18) {
      ascendantInfo = 'Afternoon birth (likely Earth or Air rising sign)';
    } else if (hour24 >= 18 && hour24 < 24) {
      ascendantInfo = 'Evening birth (likely Water or Earth rising sign)';
    } else {
      ascendantInfo = 'Night birth (likely Fire or Water rising sign)';
    }
  }

  const isRussianLocale = i18n.language?.toLowerCase().startsWith('ru');
  const completeGoalLangInstruction = isRussianLocale
    ? '\n\nCRITICAL: You MUST write ALL output fields (step names, descriptions, fear) entirely in Russian. Only the hardnessLevel field must remain in English (Easy/Medium/Hard). Do not use any English words in Russian-language fields.'
    : '';

  const completeGoalPrompt = `You are an expert life coach and goal achievement specialist with deep knowledge of astrology and natal chart analysis. Generate a complete, personalized goal with all necessary details.

GOAL TITLE: ${goalTitle}

PERSONAL INFORMATION:
- Birth Date: ${birthDateStr}${birthTimeStr}${locationStr}
- Sun Sign: ${sunSign}
${birthTimeStr ? `- Birth Time: ${birthHour}:${birthMinute} ${birthPeriod}` : '- Birth Time: Not provided'}
${locationStr ? `- Birth Location: ${birthCity}` : '- Birth Location: Not provided'}
${ascendantInfo ? `- Ascendant/Rising Sign Indicator: ${ascendantInfo}` : '- Ascendant/Rising Sign: Not calculated (birth time and location needed)'}

CRITICAL ASTROLOGICAL ANALYSIS:
${birthHour && birthMinute && birthPeriod && birthCity ? `
IMPORTANT: You have complete birth data including time and location. Use this to create a MORE DETAILED and PERSONALIZED analysis:

1. **Ascendant (Rising Sign)**: The ascendant is calculated from birth time and location. It represents:
   - How the person presents themselves to the world
   - Their approach to new situations and first impressions
   - Their natural defense mechanisms and outer personality
   - Their physical appearance and energy
   
   Consider how the ascendant influences their goal achievement style:
   - Fire Rising (Aries, Leo, Sagittarius): Direct, action-oriented, needs quick wins
   - Earth Rising (Taurus, Virgo, Capricorn): Practical, methodical, needs structure
   - Air Rising (Gemini, Libra, Aquarius): Communicative, analytical, needs variety
   - Water Rising (Cancer, Scorpio, Pisces): Intuitive, emotional, needs meaning

2. **Birth Location Impact**: The location (${birthCity}) affects:
   - House cusps and planetary placements
   - Cultural and environmental influences on their personality
   - Regional opportunities and challenges
   - Local timing and rhythms that resonate with them

3. **Birth Time Precision**: The exact time (${birthHour}:${birthMinute} ${birthPeriod}) determines:
   - Precise ascendant degree
   - House placements
   - Planetary aspects and angles
   - Personal timing and rhythms

Use ALL of this astrological data to create goals that:
- Align with their natural personality (Sun sign)
- Respect their outer expression style (Ascendant/Rising)
- Consider their birth location's influence
- Work with their natural timing and energy patterns
- Create steps that match their astrological strengths

This comprehensive astrological analysis should make the goal MORE DETAILED and PERSONALIZED than a generic goal.
` : `
NOTE: Birth time and/or location are missing. While you can still create a good goal based on Sun sign and other data, a complete natal chart analysis (including Ascendant) would provide even more personalized insights.
`}

IKIGAI RESPONSES:
${whatYouLove ? `- What they love: ${whatYouLove}` : '- What they love: Not provided'}
${whatYouGoodAt ? `- What they are good at: ${whatYouGoodAt}` : '- What they are good at: Not provided'}
${whatWorldNeeds ? `- What the world needs: ${whatWorldNeeds}` : '- What the world needs: Not provided'}
${whatCanBePaidFor ? `- What can be paid for: ${whatCanBePaidFor}` : '- What can be paid for: Not provided'}

FEARS AND MOTIVATIONS:
${fear ? `- Their fear: ${fear}` : '- Their fear: Not provided'}
${whatExcites ? `- What excites them: ${whatExcites}` : '- What excites them: Not provided'}

INSTRUCTIONS:
1. Generate 2-4 specific, actionable steps to achieve this goal (maximum 4 steps). Each step MUST be:

   CRITICAL REQUIREMENTS:
   - SPECIFIC ACTION: Tell user exactly what to do (not vague concepts)
     ❌ BAD: "Research career options" or "Work on your resume" or "Practice speaking"
     ✅ GOOD: "List 5 companies in your field and research their job openings" or "Write 3 bullet points describing your recent project accomplishments" or "Practice your 2-minute introduction in front of mirror for 10 minutes today"
   
   - MEASURABLE OUTCOME: User knows when it's complete
     ❌ BAD: "Research" or "Work on" or "Practice"
     ✅ GOOD: "List 5 companies" or "Write 3 bullet points" or "Practice for 10 minutes"
   
   - TIME-BOUND: Clear timeframe included
     ❌ BAD: "Create portfolio" or "Send emails"
     ✅ GOOD: "Create portfolio website with 5 best projects by end of week" or "Send personalized pitch emails to 10 potential clients this week"
   
   - DIRECTLY RELATED TO GOAL: Every step must build toward the final goal
     If goal is "Become a dog trainer," steps should be: research certifications, shadow a trainer, take online course, get hands-on practice
     ❌ BAD: journaling, meditation, general reflection (unless goal is specifically about that)
     ✅ GOOD: concrete actions that directly progress toward the goal
   
   - SEQUENTIAL: Steps build on each other (step 1 enables step 2, step 2 enables step 3, etc.)
   
   - Be ordered from foundational to advanced (step 1 is the foundation, higher numbers build on previous steps)
   ${birthHour && birthMinute && birthPeriod && birthCity ? `- CRITICAL: Use their COMPLETE astrological profile (Sun sign: ${sunSign}, Ascendant/Rising sign characteristics, birth location: ${birthCity}, birth time: ${birthHour}:${birthMinute} ${birthPeriod}) to create steps that align with their natural personality, energy patterns, and how they present themselves to the world. The ascendant is especially important for understanding their approach style.` : `- Consider their astrological strengths (Sun sign: ${sunSign}) only if directly relevant`}
   - Leverage their Ikigai responses only if directly relevant
   - Address their fears or leverage what excites them only if directly relevant
   - Be realistic and achievable
   - Each step should have a name (max 10 words) that is the specific action
   - Each step should have a description (max 30 words) that explains the measurable outcome and timeframe

2. Estimate how long it will take to complete the entire goal (e.g., "2 weeks", "1 month", "2 months", "3 months")
   ${birthHour && birthMinute && birthPeriod && birthCity ? `Consider their natural timing patterns based on their birth chart when estimating duration.` : ''}

3. Determine the hardness level (Easy, Medium, or Hard) based on:
   - Complexity of the goal
   - Time required
   - Skills needed
   ${birthHour && birthMinute && birthPeriod && birthCity ? `- Their COMPLETE astrological profile (Sun sign, Ascendant/Rising sign, birth location, birth time) - use this for a more nuanced assessment` : `- Their astrological profile and Ikigai responses`}

4. Identify a realistic fear or concern related to this goal (based on their provided fear: ${fear || 'general fear of failure'}). This should be specific to this goal and personalized to their situation.
   ${birthHour && birthMinute && birthPeriod && birthCity ? `Consider how their ascendant and complete natal chart might influence their fears and concerns.` : ''}

OUTPUT FORMAT (JSON only, no other text):
Return a JSON object with this exact structure:
{
  "name": "${goalTitle}",
  "steps": [
    {
      "name": "Specific action with measurable outcome and timeframe (max 10 words, e.g., 'List 5 companies and research job openings this week')",
      "description": "Clear explanation of the measurable outcome and timeframe (max 30 words)",
      "order": 1
    },
    ...
  ],
  "numberOfSteps": 4,
  "estimatedDuration": "1 month",
  "hardnessLevel": "Medium",
  "fear": "realistic fear specific to this goal (max 20 words)"
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations. Just the JSON object.${completeGoalLangInstruction}`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: completeGoalPrompt,
      },
    ];

    // Use Sonnet for complex goal planning with reduced tokens
    const cachedSystemPrompt = [
      {
        type: 'text' as const,
        text: `You are an expert life coach and goal achievement specialist.${isRussianLocale ? ' Always respond in Russian.' : ''}`,
        cache_control: { type: 'ephemeral' as const },
      },
    ];
    const response = await tryModel(apiKey, 'claude-sonnet-4-5', apiMessages, cachedSystemPrompt, 800, 'goals');

    let goal: CompleteGoal;
    try {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const responseData = await response.json();
      const responseText = responseData.content?.[0]?.text || JSON.stringify(responseData);
      
      console.log('Complete Goal API Response:', responseText);
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(cleanedResponse);
      console.log('Parsed Complete Goal:', parsed);
      
      // Validate and format the response
      const ruFallbackSteps = [
        { name: 'Определи свой путь вперёд', description: 'Уточни, чего хочешь достичь и почему это важно для тебя', order: 1 },
        { name: 'Подготовься и спланируй', description: 'Собери ресурсы и составь детальный план действий', order: 2 },
        { name: 'Сделай первый конкретный шаг', description: 'Начни реализовывать план с первого действия', order: 3 },
        { name: 'Завершить финальный этап', description: 'Выполни последний шаг и отметь своё достижение', order: 4 },
      ];
      const enFallbackSteps = [
        { name: 'Define your specific path forward', description: 'Clarify what you want to achieve and why it matters to you', order: 1 },
        { name: 'Prepare and plan your approach', description: 'Gather resources and create a detailed action plan', order: 2 },
        { name: 'Take your first concrete step', description: 'Begin implementing your plan with the first actionable task', order: 3 },
        { name: 'Complete final milestone', description: 'Finish the last step and celebrate your achievement', order: 4 },
      ];

      const parsedSteps = Array.isArray(parsed.steps) && parsed.steps.length > 0
        ? parsed.steps.map((step: any) => ({
            name: step.name || (isRussianLocale ? `Шаг ${step.order || 1}` : `Step ${step.order || 1}`),
            description: step.description || (isRussianLocale ? 'Действуй к своей цели' : 'Take action towards your goal'),
            order: step.order || 1,
          })).sort((a: any, b: any) => a.order - b.order).slice(0, 4)
        : (isRussianLocale ? ruFallbackSteps : enFallbackSteps);
      
      goal = {
        name: parsed.name || goalTitle,
        steps: parsedSteps,
        numberOfSteps: Math.min(parsed.numberOfSteps || parsedSteps.length, 4),
        estimatedDuration: parsed.estimatedDuration || (isRussianLocale ? '1 месяц' : '1 month'),
        hardnessLevel: parsed.hardnessLevel === 'Easy' || parsed.hardnessLevel === 'Medium' || parsed.hardnessLevel === 'Hard' 
          ? parsed.hardnessLevel 
          : 'Medium',
        fear: parsed.fear || fear || (isRussianLocale ? 'А вдруг не получится?' : 'What if I fail?'),
      };
    } catch (parseError) {
      console.error('Error parsing complete goal JSON:', parseError);
      goal = {
        name: goalTitle,
        steps: isRussianLocale ? [
          { name: 'Определи свой путь вперёд', description: 'Уточни, чего хочешь достичь и почему это важно для тебя', order: 1 },
          { name: 'Подготовься и спланируй', description: 'Собери ресурсы и составь детальный план действий', order: 2 },
          { name: 'Сделай первый конкретный шаг', description: 'Начни реализовывать план с первого действия', order: 3 },
          { name: 'Завершить финальный этап', description: 'Выполни последний шаг и отметь своё достижение', order: 4 },
        ] : [
          { name: 'Define your specific path forward', description: 'Clarify what you want to achieve and why it matters to you', order: 1 },
          { name: 'Prepare and plan your approach', description: 'Gather resources and create a detailed action plan', order: 2 },
          { name: 'Take your first concrete step', description: 'Begin implementing your plan with the first actionable task', order: 3 },
          { name: 'Complete final milestone', description: 'Finish the last step and celebrate your achievement', order: 4 },
        ],
        numberOfSteps: 4,
        estimatedDuration: isRussianLocale ? '1 месяц' : '1 month',
        hardnessLevel: 'Medium',
        fear: fear || (isRussianLocale ? 'А вдруг не получится?' : 'What if I fail?'),
      };
    }

    return goal;
  } catch (error) {
    console.error('Error generating complete goal:', error);
    return {
      name: goalTitle,
      steps: isRussianLocale ? [
        { name: 'Определи свой путь вперёд', description: 'Уточни, чего хочешь достичь и почему это важно для тебя', order: 1 },
        { name: 'Подготовься и спланируй', description: 'Собери ресурсы и составь детальный план действий', order: 2 },
        { name: 'Сделай первый конкретный шаг', description: 'Начни реализовывать план с первого действия', order: 3 },
        { name: 'Завершить финальный этап', description: 'Выполни последний шаг и отметь своё достижение', order: 4 },
      ] : [
        { name: 'Define your specific path forward', description: 'Clarify what you want to achieve and why it matters to you', order: 1 },
        { name: 'Prepare and plan your approach', description: 'Gather resources and create a detailed action plan', order: 2 },
        { name: 'Take your first concrete step', description: 'Begin implementing your plan with the first actionable task', order: 3 },
        { name: 'Complete final milestone', description: 'Finish the last step and celebrate your achievement', order: 4 },
      ],
      numberOfSteps: 4,
      estimatedDuration: isRussianLocale ? '1 месяц' : '1 month',
      hardnessLevel: 'Medium',
      fear: fear || (isRussianLocale ? 'А вдруг не получится?' : 'What if I fail?'),
    };
  }
}

export async function generateLoadingItems(
  goalTitle: string,
  birthMonth: string,
  birthDate: string,
  birthYear: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string,
  whatYouLove?: string,
  whatYouGoodAt?: string,
  whatWorldNeeds?: string,
  whatCanBePaidFor?: string,
  fear?: string,
  whatExcites?: string
): Promise<string[]> {
  const apiKey = getApiKey('goals');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  // Format birth date and time
  const birthDateStr = `${birthMonth}/${birthDate}/${birthYear}`;
  let birthTimeStr = '';
  if (birthHour && birthMinute && birthPeriod) {
    birthTimeStr = ` at ${birthHour}:${birthMinute} ${birthPeriod}`;
  }
  const locationStr = birthCity ? ` in ${birthCity}` : '';

  // Calculate sun sign
  const month = parseInt(birthMonth);
  const day = parseInt(birthDate);
  let sunSign = '';
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) sunSign = 'Aries';
  else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) sunSign = 'Taurus';
  else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) sunSign = 'Gemini';
  else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) sunSign = 'Cancer';
  else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = 'Leo';
  else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = 'Virgo';
  else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) sunSign = 'Libra';
  else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) sunSign = 'Scorpio';
  else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) sunSign = 'Sagittarius';
  else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) sunSign = 'Capricorn';
  else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) sunSign = 'Aquarius';
  else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) sunSign = 'Pisces';

  const loadingItemsPrompt = `You are an expert life coach. Generate personalized loading messages for a user's journey creation process.

GOAL: ${goalTitle}

PERSONAL INFORMATION:
- Birth Date: ${birthDateStr}${birthTimeStr}${locationStr}
- Sun Sign: ${sunSign}
${birthTimeStr ? `- Birth Time: ${birthHour}:${birthMinute} ${birthPeriod}` : '- Birth Time: Not provided'}
${locationStr ? `- Birth Location: ${birthCity}` : '- Birth Location: Not provided'}

IKIGAI RESPONSES:
${whatYouLove ? `- What they love: ${whatYouLove}` : '- What they love: Not provided'}
${whatYouGoodAt ? `- What they are good at: ${whatYouGoodAt}` : '- What they are good at: Not provided'}
${whatWorldNeeds ? `- What the world needs: ${whatWorldNeeds}` : '- What the world needs: Not provided'}
${whatCanBePaidFor ? `- What can be paid for: ${whatCanBePaidFor}` : '- What can be paid for: Not provided'}

FEARS AND MOTIVATIONS:
${fear ? `- Their fear: ${fear}` : '- Their fear: Not provided'}
${whatExcites ? `- What excites them: ${whatExcites}` : '- What excites them: Not provided'}

INSTRUCTIONS:
Generate 4-6 personalized loading messages that describe what's being prepared for their journey. These should:
- Be specific to their goal: "${goalTitle}"
- Reference their astrological strengths (Sun sign: ${sunSign})
- Connect to their Ikigai responses
- Address their fears and leverage what excites them
- Be encouraging and motivating
- Each message should be concise and impactful (MAXIMUM 5 WORDS PER MESSAGE)
- NO EMOJIS - just text
- Use present continuous tense (e.g., "Analyzing your...", "Mapping your...", "Building your...")
- Summarize information to your best ability while staying within 5 words

OUTPUT FORMAT (JSON only, no other text):
Return a JSON array of strings:
[
  "first personalized loading message (MAX 5 WORDS, no emojis)",
  "second personalized loading message (MAX 5 WORDS, no emojis)",
  "third personalized loading message (MAX 5 WORDS, no emojis)",
  "fourth personalized loading message (MAX 5 WORDS, no emojis)"
]

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations. Just the JSON array.`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: loadingItemsPrompt,
      },
    ];

    // Use Haiku for simple loading messages
    const response = await tryModel(apiKey, MODEL_HAIKU, apiMessages, 'You are an expert life coach.', 200, 'goals');

    let loadingItems: string[] = [];
    try {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const responseData = await response.json();
      const responseText = responseData.content?.[0]?.text || JSON.stringify(responseData);
      
      console.log('Loading Items API Response:', responseText);
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(cleanedResponse);
      console.log('Parsed Loading Items:', parsed);
      
      // Validate and format the response - ensure max 5 words per item
      loadingItems = Array.isArray(parsed) && parsed.length > 0
        ? parsed.filter((item: any) => {
            if (typeof item !== 'string' || item.trim().length === 0) return false;
            const wordCount = item.trim().split(/\s+/).length;
            return wordCount <= 5;
          }).map((item: string) => {
            // Truncate to 5 words if needed
            const words = item.trim().split(/\s+/);
            return words.slice(0, 5).join(' ');
          })
        : [
            'Analyzing your unique strengths',
            'Mapping Ikigai steps',
            'Building personalized roadmap',
            'Preparing fear strategies',
          ];
    } catch (parseError) {
      console.error('Error parsing loading items JSON:', parseError);
      // Fallback content (max 5 words each)
      loadingItems = [
        'Analyzing your unique strengths',
        'Mapping Ikigai steps',
        'Building personalized roadmap',
        'Preparing fear strategies',
      ];
    }

    return loadingItems;
  } catch (error) {
    console.error('Error generating loading items:', error);
    // Return fallback content (max 5 words each)
    return [
      'Analyzing your unique strengths',
      'Mapping Ikigai steps',
      'Building personalized roadmap',
      'Preparing fear strategies',
    ];
  }
}

/**
 * Generate a motivational sentence to inspire users to move forward with their goal
 * Based on their answers, goal information, and path choice
 */
export async function generateGoalMotivationalSentence(
  goalName: string,
  goalId?: string,
  pathName?: string,
  pathDescription?: string,
  whatYouLove?: string,
  whatYouGoodAt?: string,
  whatWorldNeeds?: string,
  whatCanBePaidFor?: string,
  fear?: string,
  whatExcites?: string
): Promise<string> {
  const apiKey = getApiKey('goals');
  
  if (!apiKey) {
    // API key check skipped - handled server-side by proxy
  }

  const motivationalPrompt = `You are an expert life coach and motivational speaker. Generate a SINGLE, powerful motivational sentence that will inspire someone to continue working toward their goal.

GOAL: ${goalName}
${pathName ? `PATH: ${pathName}` : ''}
${pathDescription ? `PATH DESCRIPTION: ${pathDescription}` : ''}

USER'S PERSONAL ANSWERS:
${whatYouLove ? `- What they love: ${whatYouLove}` : ''}
${whatYouGoodAt ? `- What they're good at: ${whatYouGoodAt}` : ''}
${whatWorldNeeds ? `- What the world needs: ${whatWorldNeeds}` : ''}
${whatCanBePaidFor ? `- What can be paid for: ${whatCanBePaidFor}` : ''}
${whatExcites ? `- What excites them: ${whatExcites}` : ''}
${fear ? `- Their fear/concern: ${fear}` : ''}

CRITICAL REQUIREMENTS:
1. Generate ONLY ONE sentence (maximum 20 words)
2. Be MOTIVATIONAL and INSPIRATIONAL - focus on forward momentum, not fear
3. Remind them WHY they're pursuing this goal based on their personal answers
4. Connect their goal to what they love, what excites them, or what they're good at
5. Use warm, encouraging language that feels personal and authentic
6. Avoid generic phrases - make it specific to their situation
7. Focus on the positive outcome and their potential, not obstacles
8. Make it feel like a gentle push forward, not pressure

EXAMPLES OF GOOD MOTIVATIONAL SENTENCES:
- "You're building something that aligns with what you love: ${whatYouLove || 'your passions'}, and that's worth every step forward."
- "Remember, this goal connects to what excites you most: ${whatExcites || 'your dreams'}. Keep moving toward that vision."
- "Your unique strengths in ${whatYouGoodAt || 'your talents'} are exactly what will make this goal achievable. Trust yourself."

EXAMPLES OF BAD SENTENCES (avoid these):
- "Don't give up" (too generic)
- "You can do it" (too cliché)
- "Remember your fear of ${fear}" (focuses on fear, not motivation)
- Long, complex sentences (keep it concise)

Return ONLY the motivational sentence, nothing else. No quotes, no explanations, just the sentence itself.`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: motivationalPrompt,
      },
    ];

    const response = await tryModel(
      apiKey,
      MODEL_HAIKU,
      apiMessages,
      'You are an expert life coach and motivational speaker. Generate inspiring, personalized motivational messages.',
      80,
      'goals'
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n')
      .trim();

    // Clean up the response - remove quotes if present
    let motivationalSentence = text.replace(/^["']|["']$/g, '').trim();
    
    // If the response is too long, truncate it
    const words = motivationalSentence.split(' ');
    if (words.length > 25) {
      motivationalSentence = words.slice(0, 25).join(' ') + '...';
    }

    return motivationalSentence || `Keep moving forward with ${goalName}. You've got this!`;
  } catch (error) {
    console.error('Error generating motivational sentence:', error);
    
    // Fallback motivational sentence
    if (whatExcites) {
      return `Remember why you started: ${whatExcites}. Keep moving forward!`;
    } else if (whatYouLove) {
      return `This goal connects to what you love: ${whatYouLove}. Trust the process!`;
    } else {
      return `Keep moving forward with ${goalName}. You've got this!`;
    }
  }
}

