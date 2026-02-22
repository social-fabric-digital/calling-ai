import i18n from './i18n';

const isRussian = () => i18n.language?.startsWith('ru');

export interface GoalStep {
  name: string;
  description: string;
  order: number;
}

export interface GeneratedGoal {
  name: string;
  steps: GoalStep[];
  numberOfSteps: number;
  estimatedDuration: string; // e.g., "2 weeks", "1 month", "3 months"
  hardnessLevel: 'Easy' | 'Medium' | 'Hard';
  fear?: string;
}

export async function generateGoalFromInsight(insight: string): Promise<GeneratedGoal> {
  const prompt = `You are a helpful life coach helping someone turn their clarity insight into an actionable goal with concrete steps.

Here is their clarity insight:
${insight}

Based on this insight, generate a goal that:
1. Extracts the main actionable goal from the insight (what they should focus on)
2. Breaks it down into EXACTLY 4 concrete, achievable levels/steps - no more, no less
3. Estimates how long it will take to complete the entire goal (e.g., "2 weeks", "1 month", "2 months", "3 months")
4. Determines the hardness level (Easy, Medium, or Hard) based on complexity and time required
5. Identifies any underlying fear or concern related to this goal (optional)

IMPORTANT: You MUST create exactly 4 levels. Each level should build on the previous one, progressing from initial steps to completion.

Format your response as JSON:
{
  "name": "Goal name (concise, actionable)",
  "steps": [
    {
      "name": "Level name (descriptive, 2-4 words, NO 'Level 1:' prefix)",
      "description": "Short description (max 15 words) of what to do in this level",
      "order": 1
    },
    {
      "name": "Level name (descriptive, 2-4 words, NO 'Level 2:' prefix)",
      "description": "Short description (max 15 words) of what to do in this level",
      "order": 2
    },
    {
      "name": "Level name (descriptive, 2-4 words, NO 'Level 3:' prefix)",
      "description": "Short description (max 15 words) of what to do in this level",
      "order": 3
    },
    {
      "name": "Level name (descriptive, 2-4 words, NO 'Level 4:' prefix)",
      "description": "Short description (max 15 words) of what to do in this level",
      "order": 4
    }
  ],
  "numberOfSteps": 4,
  "estimatedDuration": "1 month",
  "hardnessLevel": "Medium",
  "fear": "Optional fear or concern"
}

CRITICAL REQUIREMENTS:
- Each step "name" should be a descriptive level name (2-4 words) WITHOUT any "Level X:" prefix
- Examples of good names: "Foundation Building", "Skill Development", "Network Expansion", "Mastery Achievement"
- Examples of bad names: "Level 1: Foundation", "Step 2: Development" (DO NOT include numbers or prefixes)
- Each "description" must be SHORT (maximum 15 words) and actionable
- Descriptions should be concise summaries, not detailed instructions

Return ONLY valid JSON, no other text.
${isRussian() ? '\nIMPORTANT: All goal name, step names, descriptions, duration and fear fields must be in Russian.' : ''}`;

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
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 700,
        system: [
          {
            type: 'text',
            text: `You are a helpful life coach helping someone turn their clarity insight into an actionable goal with concrete steps. Generate comprehensive, detailed goals that are realistic and achievable. Provide thorough analysis and create well-structured, actionable plans.${isRussian() ? ' Respond in Russian only.' : ''}`,
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
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n');
    
    // Extract JSON from response (handle cases where there might be markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?/g, '');
    }
    
    const goal = JSON.parse(jsonText) as GeneratedGoal;
    
    // Validate and set defaults
    if (!goal.name) {
      goal.name = isRussian() ? 'Достигнуть ясности и роста' : 'Achieve clarity and growth';
    }
    if (!goal.steps || goal.steps.length === 0) {
      goal.steps = [];
    }
    
    // Ensure exactly 4 steps/levels
    if (goal.steps.length > 4) {
      goal.steps = goal.steps.slice(0, 4);
    }
    
    // Clean up step names - remove "Level X:" prefixes if present
    goal.steps = goal.steps.map(step => {
      // Remove "Level X:" or "Level X " patterns from the beginning
      const cleanedName = step.name.replace(/^Level\s*\d+\s*:?\s*/i, '').trim();
      // Ensure description is short (max 15 words)
      const words = step.description.split(' ');
      const shortDescription = words.length > 15 ? words.slice(0, 15).join(' ') + '...' : step.description;
      
      return {
        ...step,
        name: cleanedName || step.name,
        description: shortDescription,
      };
    });
    
    // Pad to 4 steps if less than 4
    while (goal.steps.length < 4) {
      const stepNumber = goal.steps.length + 1;
      const defaultSteps = [
        { name: isRussian() ? 'Фундамент' : 'Foundation Building', description: isRussian() ? 'Подготовь основу и стартовый план' : 'Establish the groundwork and initial plan', order: 1 },
        { name: isRussian() ? 'Развитие навыков' : 'Skill Development', description: isRussian() ? 'Развивай нужные навыки и знания' : 'Build necessary skills and knowledge', order: 2 },
        { name: isRussian() ? 'Набор импульса' : 'Momentum Building', description: isRussian() ? 'Поддерживай прогресс и корректируй стратегию' : 'Maintain progress and adapt strategies', order: 3 },
        { name: isRussian() ? 'Мастерство' : 'Mastery Achievement', description: isRussian() ? 'Заверши цель и отметь результат' : 'Complete goal and celebrate success', order: 4 },
      ];
      goal.steps.push({
        name: defaultSteps[stepNumber - 1]?.name || (isRussian() ? `Уровень ${stepNumber}` : `Level ${stepNumber}`),
        description: defaultSteps[stepNumber - 1]?.description || (isRussian() ? 'Продолжай двигаться к цели' : 'Continue working towards your goal'),
        order: stepNumber,
      });
    }
    
    // Always set numberOfSteps to 4
    goal.numberOfSteps = 4;
    
    if (!goal.estimatedDuration) {
      goal.estimatedDuration = isRussian() ? '1 месяц' : '1 month';
    }
    if (!goal.hardnessLevel) {
      goal.hardnessLevel = 'Medium';
    }
    
    return goal;
  } catch (error) {
    console.error('Error generating goal from insight:', error);
    
    // Fallback goal with 4 levels
    return {
      name: isRussian() ? 'Достигнуть ясности и роста' : 'Achieve clarity and growth',
      steps: [
        {
          name: isRussian() ? 'Фундамент' : 'Foundation Building',
          description: isRussian() ? 'Подготовь основу и стартовый план' : 'Establish groundwork and initial plan',
          order: 1,
        },
        {
          name: isRussian() ? 'Развитие навыков' : 'Skill Development',
          description: isRussian() ? 'Развивай нужные навыки и знания' : 'Build necessary skills and knowledge',
          order: 2,
        },
        {
          name: isRussian() ? 'Набор импульса' : 'Momentum Building',
          description: isRussian() ? 'Поддерживай прогресс и корректируй стратегию' : 'Maintain progress and adapt strategies',
          order: 3,
        },
        {
          name: isRussian() ? 'Мастерство' : 'Mastery Achievement',
          description: isRussian() ? 'Заверши цель и отметь результат' : 'Complete goal and celebrate success',
          order: 4,
        },
      ],
      numberOfSteps: 4,
      estimatedDuration: isRussian() ? '1 месяц' : '1 month',
      hardnessLevel: 'Medium' as const,
    };
  }
}

export async function generateGoalIdea(
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
): Promise<GeneratedGoal> {
  // Calculate sun sign
  let sunSign = '';
  if (birthMonth && birthDate && birthYear) {
    const month = parseInt(birthMonth);
    const day = parseInt(birthDate);
    
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

  const prompt = `You are an expert life coach helping someone discover their next meaningful goal.

PERSONAL PROFILE:
${birthMonth && birthDate && birthYear ? `- Birth Date: ${birthMonth}/${birthDate}/${birthYear}` : '- Birth Date: Not provided'}
${sunSign ? `- Sun Sign: ${sunSign}` : ''}
${birthCity ? `- Birth Location: ${birthCity}` : ''}
${birthHour && birthMinute && birthPeriod ? `- Birth Time: ${birthHour}:${birthMinute} ${birthPeriod}` : ''}

IKIGAI RESPONSES:
${whatYouLove ? `- What they love: ${whatYouLove}` : '- What they love: Not provided'}
${whatYouGoodAt ? `- What they are good at: ${whatYouGoodAt}` : '- What they are good at: Not provided'}
${whatWorldNeeds ? `- What the world needs: ${whatWorldNeeds}` : '- What the world needs: Not provided'}
${whatCanBePaidFor ? `- What can be paid for: ${whatCanBePaidFor}` : '- What can be paid for: Not provided'}

MOTIVATIONS & FEARS:
${fear ? `- Their fear: ${fear}` : '- Their fear: Not provided'}
${whatExcites ? `- What excites them: ${whatExcites}` : '- What excites them: Not provided'}

Based on this profile, generate a personalized, actionable goal that:
1. Aligns with their Ikigai (the intersection of what they love, what they're good at, what the world needs, and what can be paid for)
2. Takes into account their astrological profile if available
3. Addresses their fears or leverages what excites them
4. Is realistic, achievable, and meaningful
5. Breaks down into EXACTLY 4 concrete, achievable levels/steps
6. Estimates a realistic timeline for completion
7. Determines appropriate difficulty level

IMPORTANT: You MUST create exactly 4 levels. Each level should build on the previous one, progressing from initial steps to completion.

Format your response as JSON:
{
  "name": "Goal name (concise, actionable, personalized)",
  "steps": [
    {
      "name": "Level name (descriptive, 2-4 words, NO 'Level 1:' prefix)",
      "description": "Short description (max 15 words) of what to do in this level",
      "order": 1
    },
    {
      "name": "Level name (descriptive, 2-4 words, NO 'Level 2:' prefix)",
      "description": "Short description (max 15 words) of what to do in this level",
      "order": 2
    },
    {
      "name": "Level name (descriptive, 2-4 words, NO 'Level 3:' prefix)",
      "description": "Short description (max 15 words) of what to do in this level",
      "order": 3
    },
    {
      "name": "Level name (descriptive, 2-4 words, NO 'Level 4:' prefix)",
      "description": "Short description (max 15 words) of what to do in this level",
      "order": 4
    }
  ],
  "numberOfSteps": 4,
  "estimatedDuration": "1 month",
  "hardnessLevel": "Medium",
  "fear": "Optional fear or concern related to this goal"
}

CRITICAL REQUIREMENTS:
- Each step "name" should be a descriptive level name (2-4 words) WITHOUT any "Level X:" prefix
- Examples of good names: "Foundation Building", "Skill Development", "Network Expansion", "Mastery Achievement"
- Examples of bad names: "Level 1: Foundation", "Step 2: Development" (DO NOT include numbers or prefixes)
- Each "description" must be SHORT (maximum 15 words) and actionable
- The goal should feel personalized and relevant to their unique profile
- Make it inspiring but achievable

Return ONLY valid JSON, no other text.
${isRussian() ? '\nIMPORTANT: All output fields must be in Russian.' : ''}`;

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
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 700,
        system: [
          {
            type: 'text',
            text: `You are an expert life coach helping someone discover their next meaningful goal. Generate personalized, actionable goals that align with their unique profile, Ikigai, and aspirations. Create goals that are inspiring, achievable, and deeply relevant to who they are.${isRussian() ? ' Respond in Russian only.' : ''}`,
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
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n');
    
    // Extract JSON from response
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?/g, '');
    }
    
    const goal = JSON.parse(jsonText) as GeneratedGoal;
    
    // Validate and set defaults
    if (!goal.name) {
      goal.name = isRussian() ? 'Достигнуть личного роста' : 'Achieve personal growth';
    }
    if (!goal.steps || goal.steps.length === 0) {
      goal.steps = [];
    }
    
    // Ensure exactly 4 steps/levels
    if (goal.steps.length > 4) {
      goal.steps = goal.steps.slice(0, 4);
    }
    
    // Clean up step names
    goal.steps = goal.steps.map(step => {
      const cleanedName = step.name.replace(/^Level\s*\d+\s*:?\s*/i, '').trim();
      const words = step.description.split(' ');
      const shortDescription = words.length > 15 ? words.slice(0, 15).join(' ') + '...' : step.description;
      
      return {
        ...step,
        name: cleanedName || step.name,
        description: shortDescription,
      };
    });
    
    // Pad to 4 steps if less than 4
    while (goal.steps.length < 4) {
      const stepNumber = goal.steps.length + 1;
      const defaultSteps = [
        { name: isRussian() ? 'Фундамент' : 'Foundation Building', description: isRussian() ? 'Подготовь основу и стартовый план' : 'Establish the groundwork and initial plan', order: 1 },
        { name: isRussian() ? 'Развитие навыков' : 'Skill Development', description: isRussian() ? 'Развивай нужные навыки и знания' : 'Build necessary skills and knowledge', order: 2 },
        { name: isRussian() ? 'Набор импульса' : 'Momentum Building', description: isRussian() ? 'Поддерживай прогресс и корректируй стратегию' : 'Maintain progress and adapt strategies', order: 3 },
        { name: isRussian() ? 'Мастерство' : 'Mastery Achievement', description: isRussian() ? 'Заверши цель и отметь результат' : 'Complete goal and celebrate success', order: 4 },
      ];
      goal.steps.push({
        name: defaultSteps[stepNumber - 1]?.name || (isRussian() ? `Уровень ${stepNumber}` : `Level ${stepNumber}`),
        description: defaultSteps[stepNumber - 1]?.description || (isRussian() ? 'Продолжай двигаться к цели' : 'Continue working towards your goal'),
        order: stepNumber,
      });
    }
    
    goal.numberOfSteps = 4;
    
    if (!goal.estimatedDuration) {
      goal.estimatedDuration = isRussian() ? '1 месяц' : '1 month';
    }
    if (!goal.hardnessLevel) {
      goal.hardnessLevel = 'Medium';
    }
    
    return goal;
  } catch (error) {
    console.error('Error generating goal idea:', error);
    
    // Fallback goal
    return {
      name: isRussian() ? 'Достигнуть личного роста' : 'Achieve personal growth',
      steps: [
        {
          name: isRussian() ? 'Фундамент' : 'Foundation Building',
          description: isRussian() ? 'Подготовь основу и стартовый план' : 'Establish groundwork and initial plan',
          order: 1,
        },
        {
          name: isRussian() ? 'Развитие навыков' : 'Skill Development',
          description: isRussian() ? 'Развивай нужные навыки и знания' : 'Build necessary skills and knowledge',
          order: 2,
        },
        {
          name: isRussian() ? 'Набор импульса' : 'Momentum Building',
          description: isRussian() ? 'Поддерживай прогресс и корректируй стратегию' : 'Maintain progress and adapt strategies',
          order: 3,
        },
        {
          name: isRussian() ? 'Мастерство' : 'Mastery Achievement',
          description: isRussian() ? 'Заверши цель и отметь результат' : 'Complete goal and celebrate success',
          order: 4,
        },
      ],
      numberOfSteps: 4,
      estimatedDuration: isRussian() ? '1 месяц' : '1 month',
      hardnessLevel: 'Medium' as const,
    };
  }
}

