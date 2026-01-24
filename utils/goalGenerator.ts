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
      "name": "Level 1: Step name",
      "description": "Detailed description of what to do",
      "order": 1
    },
    {
      "name": "Level 2: Step name",
      "description": "Detailed description of what to do",
      "order": 2
    },
    {
      "name": "Level 3: Step name",
      "description": "Detailed description of what to do",
      "order": 3
    },
    {
      "name": "Level 4: Step name",
      "description": "Detailed description of what to do",
      "order": 4
    }
  ],
  "numberOfSteps": 4,
  "estimatedDuration": "1 month",
  "hardnessLevel": "Medium",
  "fear": "Optional fear or concern"
}

Return ONLY valid JSON, no other text.`;

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
        system: 'You are a helpful life coach helping someone turn their clarity insight into an actionable goal with concrete steps. Generate comprehensive, detailed goals that are realistic and achievable. Provide thorough analysis and create well-structured, actionable plans.',
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
      goal.name = 'Achieve clarity and growth';
    }
    if (!goal.steps || goal.steps.length === 0) {
      goal.steps = [];
    }
    
    // Ensure exactly 4 steps/levels
    if (goal.steps.length > 4) {
      goal.steps = goal.steps.slice(0, 4);
    }
    
    // Pad to 4 steps if less than 4
    while (goal.steps.length < 4) {
      const stepNumber = goal.steps.length + 1;
      const defaultSteps = [
        { name: 'Reflect and plan', description: 'Take time to understand your goals and create a plan', order: 1 },
        { name: 'Take initial action', description: 'Begin working towards your goal with small steps', order: 2 },
        { name: 'Build momentum', description: 'Continue making progress and adjust as needed', order: 3 },
        { name: 'Complete and celebrate', description: 'Finish your goal and celebrate your achievement', order: 4 },
      ];
      goal.steps.push({
        name: defaultSteps[stepNumber - 1]?.name || `Level ${stepNumber}`,
        description: defaultSteps[stepNumber - 1]?.description || 'Continue working towards your goal',
        order: stepNumber,
      });
    }
    
    // Always set numberOfSteps to 4
    goal.numberOfSteps = 4;
    
    if (!goal.estimatedDuration) {
      goal.estimatedDuration = '1 month';
    }
    if (!goal.hardnessLevel) {
      goal.hardnessLevel = 'Medium';
    }
    
    return goal;
  } catch (error) {
    console.error('Error generating goal from insight:', error);
    
    // Fallback goal with 4 levels
    return {
      name: 'Achieve clarity and growth',
      steps: [
        {
          name: 'Reflect on your insight',
          description: 'Take time to understand what your clarity insight means for you',
          order: 1,
        },
        {
          name: 'Create an action plan',
          description: 'Break down your goal into smaller, manageable tasks',
          order: 2,
        },
        {
          name: 'Take consistent action',
          description: 'Work on your goal regularly and track your progress',
          order: 3,
        },
        {
          name: 'Complete and celebrate',
          description: 'Finish your goal and acknowledge your achievement',
          order: 4,
        },
      ],
      numberOfSteps: 4,
      estimatedDuration: '1 month',
      hardnessLevel: 'Medium' as const,
    };
  }
}

