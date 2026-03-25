import { supabase } from '@/lib/supabase';
import { Thought } from '@/components/ClarityMap';
import i18n from './i18n';

const isRussian = () => i18n.language?.startsWith('ru');

export async function generateClarityMapSummary(
  thoughts: Thought[]
): Promise<{
  mainFocus: string;
  secondaryFocus?: string;
  canIgnore: string;
}> {
  // Validate input
  if (!thoughts || thoughts.length === 0) {
    return {
      mainFocus: isRussian() ? 'Найди момент, чтобы увидеть, что для тебя сейчас важнее всего.' : 'Take time to reflect on what matters most.',
      canIgnore: isRussian() ? 'Отпусти то, что больше не поддерживает тебя.' : 'Let go of what no longer serves you.',
    };
  }

  // Group thoughts by category
  const important = thoughts.filter((t) => t.category === 'important').map((t) => t.text);
  const unclear = thoughts.filter((t) => t.category === 'unclear').map((t) => t.text);
  const notImportant = thoughts.filter((t) => t.category === 'not_important').map((t) => t.text);

  // Build prompt for Claude
  const prompt = `You are a supportive, warm guide helping someone clarify their thoughts. Based on their categorized thoughts, provide a gentle, affirming summary.
${isRussian() ? '\nIMPORTANT: Respond only in Russian. Never use English.' : ''}

Important thoughts (what matters to them):
${important.length > 0 ? important.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'None'}

Unclear thoughts (what feels confusing):
${unclear.length > 0 ? unclear.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'None'}

Not important right now (what they can let go):
${notImportant.length > 0 ? notImportant.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'None'}

Provide a warm, supportive summary with:
1. ONE main focus (from Important items - choose the most central/actionable one)
2. ONE secondary focus (optional, only if there are multiple Important items worth noting)
3. ONE thing to let go (from Not important items - something that can be released)

Tone: Warm, affirming, supportive, zero productivity pressure. Make it feel like a gentle friend helping them see what matters.

Format your response as:
MAIN FOCUS: [your main focus text]
SECONDARY FOCUS: [your secondary focus text, or omit if not applicable]
CAN IGNORE: [what they can let go]`;

  try {
    const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_KEY_CLARITY || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
    
    if (!apiKey) {
      throw new Error('API key missing');
    }

    const response = await fetch('https://unyrkyvyngafjubjhkkf.supabase.co/functions/v1/claude-proxy', {
      method: 'POST',
      headers: await (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const h: Record<string, string> = {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31',
        };
        if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
        return h;
      })(),
      body: JSON.stringify({
        feature: 'clarity',
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: [
          {
            type: 'text',
            text: `You are a warm, supportive guide helping people clarify their thoughts. Generate comprehensive summaries that thoroughly analyze and synthesize the user's categorized thoughts.${isRussian() ? ' Respond only in Russian.' : ''}`,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    // Safely access content array
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      throw new Error('Invalid API response structure');
    }
    
    const text = data.content[0]?.text || '';

    // Parse response
    const mainFocusMatch = text.match(/MAIN FOCUS:\s*(.+?)(?=SECONDARY FOCUS:|CAN IGNORE:|$)/is);
    const secondaryFocusMatch = text.match(/SECONDARY FOCUS:\s*(.+?)(?=CAN IGNORE:|$)/is);
    const canIgnoreMatch = text.match(/CAN IGNORE:\s*(.+?)$/is);

    return {
      mainFocus: mainFocusMatch?.[1]?.trim() || important[0] || 'Take time to reflect on what matters most.',
      secondaryFocus: secondaryFocusMatch?.[1]?.trim(),
      canIgnore: canIgnoreMatch?.[1]?.trim() || notImportant[0] || 'Let go of what no longer serves you.',
    };
  } catch (error) {
    console.error('Error generating clarity map summary:', error);
    
    // Fallback summary
    return {
      mainFocus: important[0] || (isRussian() ? 'Найди минуту, чтобы понять, что для тебя по-настоящему важно.' : 'Take a moment to reflect on what matters most to you.'),
      secondaryFocus: important.length > 1 ? important[1] : undefined,
      canIgnore: notImportant[0] || (isRussian() ? 'Отпусти то, что больше не помогает тебе двигаться вперед.' : 'Let go of what no longer serves you.'),
    };
  }
}

export async function generateClarityMapInsight(
  thoughts: Thought[],
  userName?: string,
  birthMonth?: string,
  birthDate?: string,
  birthYear?: string,
  birthCity?: string,
  birthHour?: string,
  birthMinute?: string,
  birthPeriod?: string
): Promise<string> {
  // Validate input
  if (!thoughts || thoughts.length === 0) {
    return isRussian()
      ? 'Найди минуту, чтобы увидеть, что для тебя важнее всего. Твои мысли подсказывают, на чем стоит сфокусироваться, а что можно отпустить.'
      : 'Take a moment to reflect on what matters most to you. Your thoughts reveal what deserves your attention and what can be released for now. Trust yourself to focus on what truly matters.';
  }

  // Group thoughts by category - map to user-friendly names
  const urgentThoughts = thoughts.filter((t) => t.category === 'important').map((t) => t.text);
  const exploreThoughts = thoughts.filter((t) => t.category === 'unclear').map((t) => t.text);
  const letGoThoughts = thoughts.filter((t) => t.category === 'not_important').map((t) => t.text);

  // Prepare astrological context if available
  let astroContext = '';
  if (birthMonth && birthDate && birthYear) {
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

    astroContext = `\n\nASTROLOGICAL CONTEXT:
- Name: ${userName || 'The user'}
- Birth Date: ${birthDateStr}${birthTimeStr}${locationStr}
- Sun Sign: ${sunSign}
${birthTimeStr ? `- Birth Time: ${birthHour}:${birthMinute} ${birthPeriod}` : `- Birth Time: ${isRussian() ? 'Not provided' : 'Not provided'}`}
${locationStr ? `- Birth Location: ${birthCity}` : `- Birth Location: ${isRussian() ? 'Not provided' : 'Not provided'}`}

Use this astrological information to provide deeper insight into WHY they might have certain desires, challenges, or patterns in their thoughts. Connect their categorized thoughts to their astrological chart - for example, explain how their Sun sign influences what they prioritize, or how planetary placements might explain certain challenges they're experiencing.`;
  }

  // Build prompt for Claude with new format
  const prompt = `You are a compassionate life coach and astrologer helping someone gain clarity about what truly matters.

The user has sorted their thoughts into three categories:

Urgent in My Heart (needs attention now):
${urgentThoughts.length > 0 ? urgentThoughts.join('\n') : 'None specified'}

Explore This (worth understanding better):
${exploreThoughts.length > 0 ? exploreThoughts.join('\n') : 'None specified'}

Can Let Go For Now (safe to release):
${letGoThoughts.length > 0 ? letGoThoughts.join('\n') : 'None specified'}${astroContext}

Generate a thoughtful, personalized reflection (maximum 200 words total) with FIVE distinct sections. Each section MUST have a heading on its own line (no asterisks, no bold markers, just the heading text).

IMPORTANT: ${astroContext ? 'Incorporate astrological insights naturally throughout the reflection. Use their Sun sign and birth chart to explain WHY they might have certain desires or challenges. Make astrological connections subtle and meaningful - explain how their chart influences their priorities, patterns, or struggles. Keep it under 200 words total.' : 'Provide a warm, emotionally intelligent reflection.'}

SECTION 1 - Heading: "Empathetic Acknowledgment" (2-3 sentences)
- Name the emotional weight they're holding
- Acknowledge the difficulty without judgment
- Mirror back themes you see in their thoughts

SECTION 2 - Heading: "What Deserves Your Energy" (3-4 sentences)
- Specific reference to their actual urgent thought(s)
- The "why" - connect to their values, identity, purpose${astroContext ? ', and astrological chart (e.g., how their Sun sign influences what they prioritize)' : ''}
- The transformation - who they're becoming by addressing this
- Empowerment - this is worthy of their energy

SECTION 3 - Heading: "What Needs Space" (2-3 sentences)
- Acknowledge the uncertainty in their explore thoughts
- Reframe waiting as part of the process, not weakness
- Permission to wonder without deciding
- Trust in timing - clarity comes through exploration

SECTION 4 - Heading: "What to Let Go" (3-4 sentences)
- Specific thought they can release
- Why it's stealing energy from what matters${astroContext ? ' (consider astrological patterns that might explain why this is challenging for them)' : ''}
- What they'll gain by letting go (mental space, peace, energy)
- Permission/reassurance - it's okay to release this
- Reframe - letting go is strength, not avoidance

SECTION 5 - Heading: "Forward Momentum" (2-3 sentences)
- Affirmation of what they already have (clarity, capability)
- Simple directive - what to focus on now
- Trust builder - they can do this
- Empowering close - they're already on the path

CRITICAL FORMATTING RULES:
- Each section heading must be on its own line, plain text (e.g., "Empathetic Acknowledgment")
- NEVER use asterisks or bold markers like ** around headings
- Add a blank line before each heading for separation
- Keep total word count between 150-200 words

Tone: Warm, emotionally intelligent, deeply validating. Like a wise friend who truly sees them. No generic advice or productivity language. Personal, as if you know their specific situation. Hopeful but grounded.
${isRussian() ? '\nIMPORTANT: Return the full response only in Russian.' : ''}`;

  try {
    const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_KEY_CLARITY || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
    
    if (!apiKey) {
      throw new Error('API key missing');
    }

    const response = await fetch('https://unyrkyvyngafjubjhkkf.supabase.co/functions/v1/claude-proxy', {
      method: 'POST',
      headers: await (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const h: Record<string, string> = {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31',
        };
        if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
        return h;
      })(),
      body: JSON.stringify({
        feature: 'clarity',
        model: 'claude-sonnet-4-5',
        max_tokens: 500,
        system: [
          {
            type: 'text',
            text: `You are a compassionate life coach and astrologer helping someone gain clarity about what truly matters. Provide thoughtful, personalized reflections that are warm, emotionally intelligent, and deeply validating. When astrological information is provided, naturally incorporate it to explain WHY they might have certain desires or challenges. Format your response with clear section headings on their own lines. NEVER use asterisks or markdown bold formatting. Keep responses concise (maximum 200 words total).${isRussian() ? ' Respond only in Russian.' : ''}`,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    // Safely access content array
    if (!data.content || !Array.isArray(data.content)) {
      throw new Error('Invalid API response structure');
    }
    
    const insightText = data.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n');
    
    return insightText;
  } catch (error) {
    console.error('Error generating clarity map insight:', error);
    
    // Fallback insight
    return isRussian()
      ? 'Найди минуту, чтобы увидеть, что для тебя важнее всего. Твои мысли показывают, чему стоит дать внимание, а что можно отпустить.'
      : 'Take a moment to reflect on what matters most to you. Your thoughts reveal what deserves your attention and what can be released for now. Trust yourself to focus on what truly matters.';
  }
}

