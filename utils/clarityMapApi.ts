import { Thought } from '@/components/ClarityMap';

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
      mainFocus: 'Take time to reflect on what matters most.',
      canIgnore: 'Let go of what no longer serves you.',
    };
  }

  // Group thoughts by category
  const important = thoughts.filter((t) => t.category === 'important').map((t) => t.text);
  const unclear = thoughts.filter((t) => t.category === 'unclear').map((t) => t.text);
  const notImportant = thoughts.filter((t) => t.category === 'not_important').map((t) => t.text);

  // Build prompt for Claude
  const prompt = `You are a supportive, warm guide helping someone clarify their thoughts. Based on their categorized thoughts, provide a gentle, affirming summary.

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
    const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
    
    if (!apiKey) {
      throw new Error('API key missing');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are a warm, supportive guide helping people clarify their thoughts. Generate comprehensive summaries that thoroughly analyze and synthesize the user\'s categorized thoughts.',
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
      mainFocus: important[0] || 'Take a moment to reflect on what matters most to you.',
      secondaryFocus: important.length > 1 ? important[1] : undefined,
      canIgnore: notImportant[0] || 'Let go of what no longer serves you.',
    };
  }
}

export async function generateClarityMapInsight(
  thoughts: Thought[]
): Promise<string> {
  // Validate input
  if (!thoughts || thoughts.length === 0) {
    return 'Take a moment to reflect on what matters most to you. Your thoughts reveal what deserves your attention and what can be released for now. Trust yourself to focus on what truly matters.';
  }

  // Group thoughts by category - map to user-friendly names
  const urgentThoughts = thoughts.filter((t) => t.category === 'important').map((t) => t.text);
  const exploreThoughts = thoughts.filter((t) => t.category === 'unclear').map((t) => t.text);
  const letGoThoughts = thoughts.filter((t) => t.category === 'not_important').map((t) => t.text);

  // Build prompt for Claude with new format
  const prompt = `You are a compassionate life coach helping someone gain clarity about what truly matters.

The user has sorted their thoughts into three categories:

Urgent in My Heart (needs attention now):
${urgentThoughts.length > 0 ? urgentThoughts.join('\n') : 'None specified'}

Explore This (worth understanding better):
${exploreThoughts.length > 0 ? exploreThoughts.join('\n') : 'None specified'}

Can Let Go For Now (safe to release):
${letGoThoughts.length > 0 ? letGoThoughts.join('\n') : 'None specified'}

Generate a thoughtful, personalized reflection (150-200 words total) with FIVE distinct sections. Each section MUST have a heading on its own line (no asterisks, no bold markers, just the heading text).

SECTION 1 - Heading: "Empathetic Acknowledgment" (2-3 sentences)
- Name the emotional weight they're holding
- Acknowledge the difficulty without judgment
- Mirror back themes you see in their thoughts

SECTION 2 - Heading: "What Deserves Your Energy" (3-4 sentences)
- Specific reference to their actual urgent thought(s)
- The "why" - connect to their values, identity, or purpose
- The transformation - who they're becoming by addressing this
- Empowerment - this is worthy of their energy

SECTION 3 - Heading: "What Needs Space" (2-3 sentences)
- Acknowledge the uncertainty in their explore thoughts
- Reframe waiting as part of the process, not weakness
- Permission to wonder without deciding
- Trust in timing - clarity comes through exploration

SECTION 4 - Heading: "What to Let Go" (3-4 sentences)
- Specific thought they can release
- Why it's stealing energy from what matters
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

Tone: Warm, emotionally intelligent, deeply validating. Like a wise friend who truly sees them. No generic advice or productivity language. Personal, as if you know their specific situation. Hopeful but grounded.`;

  try {
    const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
    
    if (!apiKey) {
      throw new Error('API key missing');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: 'You are a compassionate life coach helping someone gain clarity about what truly matters. Provide thoughtful, personalized reflections that are warm, emotionally intelligent, and deeply validating. Format your response with clear section headings on their own lines. NEVER use asterisks or markdown bold formatting. Keep responses concise (150-200 words total).',
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
    return 'Take a moment to reflect on what matters most to you. Your thoughts reveal what deserves your attention and what can be released for now. Trust yourself to focus on what truly matters.';
  }
}

