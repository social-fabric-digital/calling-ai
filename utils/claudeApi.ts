import Constants from 'expo-constants';

// Get API key from environment variables
// Note: You'll need to set EXPO_PUBLIC_ANTHROPIC_API_KEY in your .env file
// Get your API key from: https://console.anthropic.com/
const getApiKey = () => {
  // Try multiple ways to get the API key
  const key = 
    Constants.expoConfig?.extra?.anthropicApiKey || 
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || 
    '';
  
  if (!key) {
    console.warn('⚠️ ANTHROPIC_API_KEY is not set. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file');
  }
  
  return key;
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

const ATLAS_THERAPEUTIC_PROMPT = `You are Atlas, a therapeutic AI companion. Your approach is CONCISE, THERAPEUTIC, and ROOT-FOCUSED.

CRITICAL GUIDELINES:
- Keep responses SHORT (2-4 sentences maximum)
- DO NOT guide or give advice - instead ask QUESTIONS that explore deeper
- Focus on uncovering ROOT CAUSES, not surface symptoms
- Use therapeutic questioning techniques (open-ended, reflective, exploratory)
- Avoid solutions, suggestions, or "you should" statements
- Ask questions that help the user discover insights themselves
- Be empathetic but concise - no long explanations

EXAMPLES OF GOOD RESPONSES:
- "What does that fear feel like in your body when it shows up?"
- "What's underneath that feeling?"
- "When did you first notice this pattern?"
- "What would change if that fear wasn't there?"

EXAMPLES OF BAD RESPONSES (avoid these):
- "You should try..." (too guiding)
- "Here's what I think..." (too directive)
- Long paragraphs explaining concepts (too verbose)
- "Have you considered..." (too suggestive)

Remember: Your role is to ask therapeutic questions that help users explore their inner world, not to guide them to solutions.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function tryModel(
  apiKey: string,
  model: string,
  apiMessages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  maxTokens: number = 512
): Promise<Response> {
  const requestBody = {
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: apiMessages,
  };

  console.log(`Trying model: ${model}`);

  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });
}

export async function getClaudeResponse(
  conversationHistory: ChatMessage[]
): Promise<string> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key is missing. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file and restart the app.');
  }

  try {
    // Use fetch API directly since Anthropic SDK may not work in React Native
    // Convert messages to the format expected by Claude API
    const apiMessages = conversationHistory.map((msg) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));

    // Try multiple models in order of preference
    const modelsToTry = [
      'claude-sonnet-4-20250514', // Claude Sonnet 4 (latest, for complex tasks)
      'claude-haiku-4-5-20251001', // Claude Haiku 4.5 (fallback, cost-effective)
    ];

    let lastError: Error | null = null;
    let response: Response | null = null;

    for (const model of modelsToTry) {
      try {
        response = await tryModel(apiKey, model, apiMessages, SYSTEM_PROMPT);
        
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

    return textContent.text;
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
  conversationHistory: ChatMessage[]
): Promise<string> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key is missing. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file and restart the app.');
  }

  try {
    // Convert messages to the format expected by Claude API
    const apiMessages = conversationHistory.map((msg) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));

    // Use Haiku for cost optimization (concise responses don't need Sonnet)
    const modelsToTry = [
      'claude-haiku-4-5-20251001', // Claude Haiku 4.5 (cost-effective for concise responses)
      'claude-sonnet-4-20250514', // Claude Sonnet 4 (fallback)
    ];

    let lastError: Error | null = null;
    let response: Response | null = null;

    for (const model of modelsToTry) {
      try {
        response = await tryModel(apiKey, model, apiMessages, ATLAS_THERAPEUTIC_PROMPT);
        
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

    return textContent.text;
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

// Astrology report generation
export async function generateAstrologyReport(
  birthMonth: string,
  birthDate: string,
  birthYear: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string
): Promise<string> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key is missing. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file and restart the app.');
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

For a person born on ${birthDateStr}${birthTimeStr}${locationStr}, provide a personalized daily cosmic insight report for TODAY (maximum 300 words).

IMPORTANT: This report must be personalized to THEIR specific astrological chart:
- Their Sun Sign is ${sunSign} (born ${birthDateStr})
- ${birthTimeStr ? `Their birth time is ${birthTimeStr}` : 'Birth time not provided'}
- ${locationStr ? `Their birth location is ${locationStr}` : 'Birth location not provided'}

Calculate their astrological chart (Sun sign: ${sunSign}, Moon sign, Rising sign if birth time/location available) and provide insights based on:
1. Their natal chart (their specific planetary positions at birth)
2. Current planetary transits affecting their chart TODAY
3. How today's energies interact with their personal astrological makeup

Provide a concise daily report for TODAY (${todayDateStr}) with the following structure. Start with the date as a heading, then include these sections:

HEADING: ${todayDateStr}

SECTION: What to Focus On Today
- Main opportunities and priorities for today based on current planetary transits affecting THEIR natal chart (Sun in ${sunSign})

SECTION: What to Be Cautious Of
- Things to watch out for or be mindful of today based on challenging transits to THEIR chart

SECTION: Daily Tips
- Practical advice and guidance for navigating today based on THEIR astrological profile

Format requirements:
- Start with "${todayDateStr}" as a heading
- Use "What to Focus On Today", "What to Be Cautious Of", and "Daily Tips" as section headings
- Keep it to exactly 300 words or less
- Make it warm, encouraging, and practical
- Reference their Sun sign (${sunSign}) and make it personal to THEIR chart
- Focus on TODAY's specific insights (${todayDateStr}) rather than general personality traits
- Ensure the report is personalized and references their actual astrological chart, not generic horoscope`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: astrologyPrompt,
      },
    ];

    // Try multiple models in order of preference
    const modelsToTry = [
      'claude-sonnet-4-20250514', // Claude Sonnet 4 (latest, for complex tasks)
      'claude-haiku-4-5-20251001', // Claude Haiku 4.5 (fallback, cost-effective)
    ];

    let lastError: Error | null = null;
    let response: Response | null = null;

    for (const model of modelsToTry) {
      try {
        response = await tryModel(apiKey, model, apiMessages, 'You are an expert astrologer who provides insightful, personalized astrology reports.');
        
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

    return textContent.text;
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
  whatCanBePaidFor: string
): Promise<IkigaiConclusion> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key is missing. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file and restart the app.');
  }

  const ikigaiPrompt = `You are a wise life coach and Ikigai expert. Based on a person's answers to the four dimensions of Ikigai, provide a personalized, insightful conclusion about their path and calling.

The person's answers:
- What they love: "${whatYouLove}"
- What they're good at: "${whatYouGoodAt}"
- What the world needs: "${whatWorldNeeds}"
- What they can be paid for: "${whatCanBePaidFor}"

Analyze the intersection of these four dimensions and provide your response in EXACTLY this format:

CALLING_TYPE: [Provide a concise 1-3 word conclusion about what type of calling awaits this person. Examples: "Creative Visionary", "Healing Guide", "Innovation Catalyst", "Community Builder", "Artistic Mentor", "Tech Pioneer", etc. Be specific and capture their unique essence.]

PATH_REPORT: [Provide a comprehensive, detailed report (500-700 words) about the best path forward for this person. Include:
1. A clear analysis of how their four Ikigai dimensions intersect
2. What specific calling and life path awaits them
3. Concrete opportunities that emerge from this intersection
4. Practical, actionable steps they can take to align their life with their Ikigai
5. How their passion, skills, purpose, and value create unique opportunities
6. What challenges they might face and how to overcome them
7. Long-term vision for their path

Write in a warm, encouraging, and insightful tone. Be specific and reference their actual answers. Make it comprehensive and actionable.];

IMPORTANT: Your response must start with "DESTINY_TYPE:" followed by the 1-3 word conclusion, then "PATH_REPORT:" followed by the comprehensive report.`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: ikigaiPrompt,
      },
    ];

    // Try multiple models in order of preference
    const modelsToTry = [
      'claude-sonnet-4-20250514', // Claude Sonnet 4 (latest, for complex tasks)
      'claude-haiku-4-5-20251001', // Claude Haiku 4.5 (fallback, cost-effective)
    ];

    let lastError: Error | null = null;
    let response: Response | null = null;

    for (const model of modelsToTry) {
      try {
        response = await tryModel(apiKey, model, apiMessages, 'You are a wise life coach and Ikigai expert who provides insightful, personalized guidance about life purpose and destiny.');
        
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
    const responseText = textContent.text;
    const callingTypeMatch = responseText.match(/CALLING_TYPE:\s*(.+?)(?:\n|PATH_REPORT:)/s);
    const pathReportMatch = responseText.match(/PATH_REPORT:\s*(.+?)(?:\n\n|$)/s) || responseText.match(/PATH_REPORT:\s*(.+)/s);
    
    const callingType = callingTypeMatch 
      ? callingTypeMatch[1].trim().replace(/\n/g, ' ').substring(0, 50) // Limit to reasonable length
      : 'Your Calling';
    
    const pathReport = pathReportMatch 
      ? pathReportMatch[1].trim()
      : responseText; // Fallback to full response if parsing fails

    return {
      callingType,
      pathReport,
    };
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
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key is missing. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file and restart the app.');
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
      'claude-sonnet-4-20250514', // Claude Sonnet 4 (latest, for complex tasks)
      'claude-haiku-4-5-20251001', // Claude Haiku 4.5 (fallback, cost-effective)
    ];

    let lastError: Error | null = null;
    let response: Response | null = null;

    for (const model of modelsToTry) {
      try {
        response = await tryModel(apiKey, model, apiMessages, 'You are a compassionate life coach and personal growth expert who provides insightful, personalized analysis and guidance.');
        
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

    return textContent.text;
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
): Promise<GeneratedPath[]> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key is missing. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file and restart the app.');
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

  const pathsPrompt = `You are an expert astrologer and career counselor. Generate 3 personalized career/life paths for a person based on their complete profile.

PERSONAL INFORMATION:
- Birth Date: ${birthDateStr}${birthTimeStr}${locationStr}
- Sun Sign: ${sunSign}
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
- Consider their Sun sign (${sunSign}), Ikigai responses, fears, and excitements
- Be inspiring and aligned with their true purpose

OUTPUT FORMAT (JSON only, no other text):
Return a JSON array with exactly 3 objects. Each object must have:
- "title": A short, compelling title for the path (max 50 characters)
- "description": A concise description explaining why this path aligns with their destiny (max 100 characters)
- "glowColor": One of these colors: "#c6afb8" (dusty rose), "#baccd7" (soft blue), "#a6a76c" (sage green)

Example format:
[
  {
    "title": "Creative Writing and Content",
    "description": "Your Aries energy and love for words align perfectly with creative expression that inspires others.",
    "glowColor": "#c6afb8"
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

    // Use Sonnet for complex calling path analysis with reduced max_tokens
    const response = await tryModel(apiKey, 'claude-sonnet-4-20250514', apiMessages, 'You are an expert astrologer and career counselor.', 400);

    // Parse the JSON response
    let paths: GeneratedPath[] = [];
    try {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Unknown error';
        
        // Handle rate limit errors gracefully
        if (response.status === 429) {
          console.warn('Rate limit exceeded, using fallback paths');
          throw new Error('RATE_LIMIT_EXCEEDED');
        }
        
        throw new Error(`API error: ${response.status} - ${errorMessage}`);
      }

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
          glowColor: path.glowColor || '#c6afb8',
        }));
      }
    } catch (parseError: any) {
      console.error('Error parsing paths JSON:', parseError);
      
      // If rate limit exceeded, return fallback immediately
      if (parseError?.message === 'RATE_LIMIT_EXCEEDED') {
        return [
          {
            id: 1,
            title: 'Creative Expression',
            description: 'A path aligned with your unique talents and passions.',
            glowColor: '#c6afb8',
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
      }
      
      console.error('Response status:', response.status);
      // Fallback to default paths
      paths = [
        {
          id: 1,
          title: 'Creative Expression',
          description: 'A path aligned with your unique talents and passions.',
          glowColor: '#c6afb8',
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
    }

    return paths;
  } catch (error) {
    console.error('Error generating calling paths:', error);
    // Return fallback paths
    return [
      {
        id: 1,
        title: 'Creative Expression',
        description: 'A path aligned with your unique talents and passions.',
        glowColor: '#c6afb8',
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
): Promise<CallingAwaitsContent> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key is missing. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file and restart the app.');
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

  const callingPrompt = `You are an expert astrologer and life coach. Generate personalized content for a user's calling profile based on their complete profile.

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
1. Generate exactly 4 natural gifts SPECIFICALLY based on their astrological chart (Sun sign: ${sunSign}), their Ikigai responses (${whatYouLove ? `"${whatYouLove}"` : 'not provided'}, ${whatYouGoodAt ? `"${whatYouGoodAt}"` : 'not provided'}, ${whatWorldNeeds ? `"${whatWorldNeeds}"` : 'not provided'}, ${whatCanBePaidFor ? `"${whatCanBePaidFor}"` : 'not provided'}), their fears (${fear || 'not provided'}), and what excites them (${whatExcites || 'not provided'}). Each gift must be personalized and specific to THIS user, not generic. Each gift should have:
   - A name: 2-4 words (e.g., "Creative self-expression", "Bold leadership")
   - A description: A short explanation (1-2 sentences, max 30 words) of what this gift means and how it applies to this specific user

2. For each Ikigai circle, create a VERY SHORT summary (2-3 words MAX) that condenses their answer:
   - "What you love" circle: Condense "${whatYouLove || 'their passions'}" to 2-3 words
   - "What you're good at" circle: Condense "${whatYouGoodAt || 'their talents'}" to 2-3 words
   - "What the world needs" circle: Condense "${whatWorldNeeds || 'world needs'}" to 2-3 words
   - "What you can be paid for" circle: Condense "${whatCanBePaidFor || 'monetizable skills'}" to 2-3 words

3. Create a center summary (max 12 words, NO word "destiny") that synthesizes their Ikigai answers into a personalized path to purpose and fulfillment. This should be primarily based on the intersection of what they love (${whatYouLove || 'not provided'}), what they're good at (${whatYouGoodAt || 'not provided'}), what the world needs (${whatWorldNeeds || 'not provided'}), and what they can be paid for (${whatCanBePaidFor || 'not provided'}). The summary should reflect their unique path forward based on these four Ikigai dimensions. You may also consider their astrological influences, fears, and excitements, but the Ikigai intersection should be the primary focus. DO NOT use the word "destiny" in the center summary.

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
    "whatYouLove": "2-3 words max",
    "whatYouGoodAt": "2-3 words max",
    "whatWorldNeeds": "2-3 words max",
    "whatCanBePaidFor": "2-3 words max"
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
    const response = await tryModel(apiKey, 'claude-sonnet-4-20250514', apiMessages, 'You are an expert astrologer and life coach.', 600);

    // Parse the JSON response
    let content: CallingAwaitsContent;
    try {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const responseData = await response.json();
      const responseText = responseData.content?.[0]?.text || JSON.stringify(responseData);
      
      console.log('Destiny Awaits API Response:', responseText);
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(cleanedResponse);
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
          whatYouLove: parsed.ikigaiCircles?.whatYouLove || (whatYouLove ? whatYouLove.split(' ').slice(0, 3).join(' ') : 'Your passions'),
          whatYouGoodAt: parsed.ikigaiCircles?.whatYouGoodAt || (whatYouGoodAt ? whatYouGoodAt.split(' ').slice(0, 3).join(' ') : 'Your talents'),
          whatWorldNeeds: parsed.ikigaiCircles?.whatWorldNeeds || (whatWorldNeeds ? whatWorldNeeds.split(' ').slice(0, 3).join(' ') : 'World needs'),
          whatCanBePaidFor: parsed.ikigaiCircles?.whatCanBePaidFor || (whatCanBePaidFor ? whatCanBePaidFor.split(' ').slice(0, 3).join(' ') : 'Monetizable skills'),
        },
        centerSummary: parsed.centerSummary ? parsed.centerSummary.replace(/calling/gi, 'path').replace(/Calling/gi, 'Path') : 'Your unique path to purpose and fulfillment.',
      };
    } catch (parseError) {
      console.error('Error parsing calling content JSON:', parseError);
      // Fallback content
      const fallbackGifts: NaturalGift[] = [
        { name: 'Creative expression', description: 'Your ability to express yourself through art, writing, or creative mediums that resonate with your inner truth.' },
        { name: 'Bold leadership', description: 'Your natural capacity to inspire and guide others toward meaningful change and transformation.' },
        { name: 'Artistic communication', description: 'Your gift for conveying complex ideas and emotions through visual, written, or spoken forms.' },
        { name: 'Initiating projects', description: 'Your talent for starting new ventures and bringing innovative ideas to life with passion and determination.' },
      ];
      content = {
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

export async function generatePathContent(
  pathTitle: string,
  pathDescription: string,
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
): Promise<PathContent> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key is missing. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file and restart the app.');
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

  const pathContentPrompt = `You are an expert astrologer and life coach. Generate personalized content for a specific life path that aligns with the user's calling.

SELECTED PATH:
- Title: ${pathTitle}
- Description: ${pathDescription}

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
1. Generate exactly 3 reasons "Why this fits you" that connect their astrological chart (Sun sign: ${sunSign}), their Ikigai responses, and their fears/motivations to this specific path. Each reason should be one sentence (max 25 words).

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

    // Use Sonnet for complex calling content analysis with reduced tokens
    const response = await tryModel(apiKey, 'claude-sonnet-4-20250514', apiMessages, 'You are an expert astrologer and life coach.', 500);

    // Parse the JSON response
    let content: PathContent;
    try {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const responseData = await response.json();
      const responseText = responseData.content?.[0]?.text || JSON.stringify(responseData);
      
      console.log('Path Content API Response:', responseText);
      
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(cleanedResponse);
      console.log('Parsed Path Content:', parsed);
      
      // Validate and format the response
      content = {
        whyFitsYou: Array.isArray(parsed.whyFitsYou) && parsed.whyFitsYou.length === 3
          ? parsed.whyFitsYou
          : [
              `Your ${sunSign} sun sign gives you natural strengths for this path.`,
              'Your Ikigai responses show alignment with this direction.',
              'This path addresses your fears while pursuing what excites you.',
            ],
        goals: Array.isArray(parsed.goals) && parsed.goals.length === 3
          ? parsed.goals.map((goal: any, index: number) => ({
              id: index + 1,
              title: goal.title || `Goal ${index + 1}`,
              fear: goal.fear || 'What if I fail?',
              timeFrame: goal.timeFrame || 'three months, four steps',
              description: goal.description || '',
            }))
          : [
              {
                id: 1,
                title: 'Become a full-time professional in this path',
                fear: fear || 'What if I go broke?',
                timeFrame: 'three months, four steps',
                description: 'Design and launch internal startups to diversify company portfolio and revenue streams.',
              },
              {
                id: 2,
                title: 'Launch your own venture in this field',
                fear: fear || 'What if I fail?',
                timeFrame: 'six months, eight steps',
                description: 'Build a sustainable business model that aligns with your values and creates meaningful impact.',
              },
              {
                id: 3,
                title: 'Create and share your work online',
                fear: fear || 'What if no one buys it?',
                timeFrame: 'two months, three steps',
                description: 'Establish your digital presence and monetize your creative work through strategic content and community building.',
              },
            ],
      };
    } catch (parseError) {
      console.error('Error parsing path content JSON:', parseError);
      // Fallback content
      content = {
        whyFitsYou: [
          `Your ${sunSign} sun sign gives you natural strengths for this path.`,
          'Your Ikigai responses show alignment with this direction.',
          'This path addresses your fears while pursuing what excites you.',
        ],
        goals: [
          {
            id: 1,
            title: 'Become a full-time professional in this path',
            fear: fear || 'What if I go broke?',
            timeFrame: 'three months, four steps',
            description: 'Design and launch internal startups to diversify company portfolio and revenue streams.',
          },
          {
            id: 2,
            title: 'Launch your own venture in this field',
            fear: fear || 'What if I fail?',
            timeFrame: 'six months, eight steps',
            description: 'Build a sustainable business model that aligns with your values and creates meaningful impact.',
          },
          {
            id: 3,
            title: 'Create and share your work online',
            fear: fear || 'What if no one buys it?',
            timeFrame: 'two months, three steps',
            description: 'Establish your digital presence and monetize your creative work through strategic content and community building.',
          },
        ],
      };
    }

    return content;
  } catch (error) {
    console.error('Error generating path content:', error);
    // Return fallback content
    return {
      whyFitsYou: [
        `Your ${sunSign} sun sign gives you natural strengths for this path.`,
        'Your Ikigai responses show alignment with this direction.',
        'This path addresses your fears while pursuing what excites you.',
      ],
      goals: [
        {
          id: 1,
          title: 'Become a full-time professional in this path',
          fear: fear || 'What if I go broke?',
          timeFrame: 'three months, four steps',
        },
        {
          id: 2,
          title: 'Launch your own venture in this field',
          fear: fear || 'What if I fail?',
          timeFrame: 'six months, eight steps',
        },
        {
          id: 3,
          title: 'Create and share your work online',
          fear: fear || 'What if no one buys it?',
          timeFrame: 'two months, three steps',
        },
      ],
    };
  }
}

export interface GoalStep {
  number: number;
  text: string;
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
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key is missing. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file and restart the app.');
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
Return ONLY the instruction text (MAX 200 WORDS). Plain text with section headings (no bold markers). Use "- " for bullet points.`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: stepDescriptionPrompt,
      },
    ];

    // Use Sonnet for step instructions with reduced tokens (200 words max)
    const response = await tryModel(apiKey, 'claude-sonnet-4-20250514', apiMessages, 'You are an expert life coach and goal achievement specialist. Never use ** or bold markdown formatting.', 300);

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
    
    return cleanedResponse || `Complete ${stepName} to progress towards your goal of ${goalTitle}.`;
  } catch (error) {
    console.error('Error generating step description:', error);
    // Return fallback description
    return `Complete ${stepName} to progress towards your goal of ${goalTitle}. This step is essential for building the foundation needed to move forward.`;
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
  whatExcites?: string
): Promise<{ goalSummary: string; steps: GoalStep[] }> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key is missing. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file and restart the app.');
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

  const goalStepsPrompt = `You are an expert life coach and goal achievement specialist with deep knowledge of astrology and natal chart analysis. Generate a personalized action plan for achieving a specific goal.

GOAL: ${goalTitle}

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

OUTPUT FORMAT (JSON only, no other text):
Return a JSON object with this exact structure:
{
  "goalSummary": "short summary of the goal (max 20 words)",
  "steps": [
    { "number": 1, "text": "specific action with measurable outcome and timeframe (MAX 10 WORDS, e.g., 'List 5 companies and research job openings this week')" },
    { "number": 2, "text": "specific action building on step 1 with measurable outcome and timeframe (MAX 10 WORDS, e.g., 'Write 3 bullet points describing project accomplishments today')" },
    { "number": 3, "text": "specific action building on step 2 with measurable outcome and timeframe (MAX 10 WORDS)" },
    { "number": 4, "text": "specific action building on step 3 with measurable outcome and timeframe (MAX 10 WORDS)" }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations. Just the JSON object.`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: goalStepsPrompt,
      },
    ];

    // Use Sonnet for complex goal planning with reduced tokens
    const response = await tryModel(apiKey, 'claude-sonnet-4-20250514', apiMessages, 'You are an expert life coach and goal achievement specialist.', 600);

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
        ? parsed.steps.map((step: any) => ({
            number: step.number || 1,
            text: step.text || 'Take action towards your goal',
          })).sort((a: GoalStep, b: GoalStep) => a.number - b.number).slice(0, 4) // Limit to max 4 steps
        : [
            { number: 1, text: 'Define your specific path forward' },
            { number: 2, text: 'Prepare and plan your approach' },
            { number: 3, text: 'Take your first concrete step' },
            { number: 4, text: 'Complete final milestone' },
          ];
      
      result = {
        goalSummary: parsed.goalSummary || `Achieve your goal: ${goalTitle}`,
        steps: parsedSteps,
      };
    } catch (parseError) {
      console.error('Error parsing goal steps JSON:', parseError);
      // Fallback content
      result = {
        goalSummary: `Achieve your goal: ${goalTitle}`,
        steps: [
          { number: 1, text: 'Define your specific path forward' },
          { number: 2, text: 'Prepare and plan your approach' },
          { number: 3, text: 'Take your first concrete step' },
          { number: 4, text: 'Complete final milestone' },
        ],
      };
    }

    return result;
  } catch (error) {
    console.error('Error generating goal steps:', error);
    // Return fallback content
    return {
      goalSummary: `Achieve your goal: ${goalTitle}`,
      steps: [
        { number: 5, text: 'Complete final milestone' },
        { number: 4, text: 'Build momentum with consistent action' },
        { number: 3, text: 'Take your first concrete step' },
        { number: 2, text: 'Prepare and plan your approach' },
        { number: 1, text: 'Define your specific path forward' },
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
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key is missing. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file and restart the app.');
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

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations. Just the JSON object.`;

  try {
    const apiMessages: Array<{ role: string; content: string }> = [
      {
        role: 'user',
        content: completeGoalPrompt,
      },
    ];

    // Use Sonnet for complex goal planning with reduced tokens
    const response = await tryModel(apiKey, 'claude-sonnet-4-20250514', apiMessages, 'You are an expert life coach and goal achievement specialist.', 800);

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
      const parsedSteps = Array.isArray(parsed.steps) && parsed.steps.length > 0
        ? parsed.steps.map((step: any) => ({
            name: step.name || `Step ${step.order || 1}`,
            description: step.description || 'Take action towards your goal',
            order: step.order || 1,
          })).sort((a: any, b: any) => a.order - b.order).slice(0, 4) // Limit to max 4 steps
        : [
            { name: 'Define your specific path forward', description: 'Clarify what you want to achieve and why it matters to you', order: 1 },
            { name: 'Prepare and plan your approach', description: 'Gather resources and create a detailed action plan', order: 2 },
            { name: 'Take your first concrete step', description: 'Begin implementing your plan with the first actionable task', order: 3 },
            { name: 'Complete final milestone', description: 'Finish the last step and celebrate your achievement', order: 4 },
          ];
      
      goal = {
        name: parsed.name || goalTitle,
        steps: parsedSteps,
        numberOfSteps: Math.min(parsed.numberOfSteps || parsedSteps.length, 4), // Ensure max 4 steps
        estimatedDuration: parsed.estimatedDuration || '1 month',
        hardnessLevel: parsed.hardnessLevel === 'Easy' || parsed.hardnessLevel === 'Medium' || parsed.hardnessLevel === 'Hard' 
          ? parsed.hardnessLevel 
          : 'Medium',
        fear: parsed.fear || fear || 'What if I fail?',
      };
    } catch (parseError) {
      console.error('Error parsing complete goal JSON:', parseError);
      // Fallback content
      goal = {
        name: goalTitle,
        steps: [
          { name: 'Define your specific path forward', description: 'Clarify what you want to achieve and why it matters to you', order: 1 },
          { name: 'Prepare and plan your approach', description: 'Gather resources and create a detailed action plan', order: 2 },
          { name: 'Take your first concrete step', description: 'Begin implementing your plan with the first actionable task', order: 3 },
          { name: 'Complete final milestone', description: 'Finish the last step and celebrate your achievement', order: 4 },
        ],
        numberOfSteps: 4,
        estimatedDuration: '1 month',
        hardnessLevel: 'Medium',
        fear: fear || 'What if I fail?',
      };
    }

    return goal;
  } catch (error) {
    console.error('Error generating complete goal:', error);
    // Return fallback content
    return {
      name: goalTitle,
      steps: [
        { name: 'Define your specific path forward', description: 'Clarify what you want to achieve and why it matters to you', order: 1 },
        { name: 'Prepare and plan your approach', description: 'Gather resources and create a detailed action plan', order: 2 },
        { name: 'Take your first concrete step', description: 'Begin implementing your plan with the first actionable task', order: 3 },
        { name: 'Complete final milestone', description: 'Finish the last step and celebrate your achievement', order: 4 },
      ],
      numberOfSteps: 4,
      estimatedDuration: '1 month',
      hardnessLevel: 'Medium',
      fear: fear || 'What if I fail?',
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
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('API key is missing. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file and restart the app.');
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

    // Use Haiku for simple loading messages (cost optimization)
    const response = await tryModel(apiKey, 'claude-haiku-4-5-20251001', apiMessages, 'You are an expert life coach.');

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

