import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CompletedGoal {
  id: string;
  name: string;
  dateCompleted: string;
  dateStarted: string;
  overallMood: string | null;
}

const LEVEL_COMPLETION_EVENTS_KEY = 'levelCompletionEvents';
const STEP_COMPLETION_EVENTS_KEY = 'stepCompletionEvents';

export interface LevelCompletionEvent {
  goalId: string;
  goalName: string;
  levelNumber: number;
  completedAt: string; // ISO timestamp
}

export interface StepCompletionEvent {
  goalId: string;
  goalName: string;
  levelNumber: number;
  stepId: number;
  completedAt: string; // ISO timestamp
}

/**
 * Mark a goal as completed
 * @param goalId - Unique identifier for the goal
 * @param goalName - Name of the goal
 */
export async function markGoalAsCompleted(goalId: string, goalName: string): Promise<void> {
  try {
    let dateStarted = new Date().toISOString().split('T')[0];
    let overallMood: string | null = null;
    
    // Mark goal as inactive in userGoals and get start date and moods
    const userGoalsData = await AsyncStorage.getItem('userGoals');
    if (userGoalsData) {
      const userGoals: any[] = JSON.parse(userGoalsData);
      const goalIndex = userGoals.findIndex((g: any) => g.id === goalId);
      if (goalIndex !== -1) {
        userGoals[goalIndex].isActive = false;
        
        // Get start date from createdAt
        if (userGoals[goalIndex].createdAt) {
          const createdAtDate = new Date(userGoals[goalIndex].createdAt);
          dateStarted = createdAtDate.toISOString().split('T')[0];
        }
        
        // Calculate overall mood from moods array
        if (userGoals[goalIndex].moods && Array.isArray(userGoals[goalIndex].moods)) {
          const moods = userGoals[goalIndex].moods.filter((m: any) => m !== null && m !== undefined);
          if (moods.length > 0) {
            // Count occurrences of each mood
            const moodCounts: { [key: string]: number } = {};
            moods.forEach((mood: string) => {
              moodCounts[mood] = (moodCounts[mood] || 0) + 1;
            });
            
            // Find the most frequent mood
            let maxCount = 0;
            let mostFrequentMood = null;
            Object.keys(moodCounts).forEach((mood) => {
              if (moodCounts[mood] > maxCount) {
                maxCount = moodCounts[mood];
                mostFrequentMood = mood;
              }
            });
            
            overallMood = mostFrequentMood;
          }
        }
        
        await AsyncStorage.setItem('userGoals', JSON.stringify(userGoals));
      }
    }
    
    // Add to completed goals
    const goalsData = await AsyncStorage.getItem('completedGoals');
    const goals: CompletedGoal[] = goalsData ? JSON.parse(goalsData) : [];
    
    // Check if goal is already completed
    const existingGoalIndex = goals.findIndex(g => g.id === goalId);
    if (existingGoalIndex !== -1) {
      // Update existing completed goal with mood and start date
      goals[existingGoalIndex].dateStarted = dateStarted;
      goals[existingGoalIndex].overallMood = overallMood;
      await AsyncStorage.setItem('completedGoals', JSON.stringify(goals));
      return;
    }
    
    // Add new completed goal
    const todayISO = new Date().toISOString().split('T')[0];
    goals.push({
      id: goalId,
      name: goalName,
      dateCompleted: todayISO,
      dateStarted: dateStarted,
      overallMood: overallMood,
    });
    
    await AsyncStorage.setItem('completedGoals', JSON.stringify(goals));
  } catch (error) {
    console.error('Error marking goal as completed:', error);
    throw error;
  }
}

/**
 * Get all completed goals
 */
export async function getCompletedGoals(): Promise<CompletedGoal[]> {
  try {
    const goalsData = await AsyncStorage.getItem('completedGoals');
    return goalsData ? JSON.parse(goalsData) : [];
  } catch (error) {
    console.error('Error getting completed goals:', error);
    return [];
  }
}

/**
 * Track a level completion event for weekly progress analytics.
 * Stores one event per goalId + levelNumber (deduplicated).
 */
export async function trackLevelCompletionEvent(goalId: string, goalName: string, levelNumber: number): Promise<void> {
  try {
    if (!goalId || !levelNumber) return;

    const eventsData = await AsyncStorage.getItem(LEVEL_COMPLETION_EVENTS_KEY);
    const events: LevelCompletionEvent[] = eventsData ? JSON.parse(eventsData) : [];

    const existingIndex = events.findIndex(
      (event) => event.goalId === goalId && event.levelNumber === levelNumber
    );

    const newEvent: LevelCompletionEvent = {
      goalId,
      goalName,
      levelNumber,
      completedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      events[existingIndex] = newEvent;
    } else {
      events.push(newEvent);
    }

    // Keep only recent history to avoid storage bloat
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 180);
    const cutoffTs = cutoff.getTime();
    const recentEvents = events.filter((event) => new Date(event.completedAt).getTime() >= cutoffTs);

    await AsyncStorage.setItem(LEVEL_COMPLETION_EVENTS_KEY, JSON.stringify(recentEvents));
  } catch (error) {
    console.error('Error tracking level completion event:', error);
  }
}

/**
 * Get all tracked level completion events.
 */
export async function getLevelCompletionEvents(): Promise<LevelCompletionEvent[]> {
  try {
    const eventsData = await AsyncStorage.getItem(LEVEL_COMPLETION_EVENTS_KEY);
    return eventsData ? JSON.parse(eventsData) : [];
  } catch (error) {
    console.error('Error getting level completion events:', error);
    return [];
  }
}

/**
 * Track a step completion event for weekly progress analytics.
 * Stores one event per goalId + levelNumber + stepId (deduplicated).
 */
export async function trackStepCompletionEvent(
  goalId: string,
  goalName: string,
  levelNumber: number,
  stepId: number
): Promise<void> {
  try {
    if (!goalId || !levelNumber || !stepId) return;

    const eventsData = await AsyncStorage.getItem(STEP_COMPLETION_EVENTS_KEY);
    const events: StepCompletionEvent[] = eventsData ? JSON.parse(eventsData) : [];

    const existingIndex = events.findIndex(
      (event) =>
        event.goalId === goalId &&
        event.levelNumber === levelNumber &&
        event.stepId === stepId
    );

    const newEvent: StepCompletionEvent = {
      goalId,
      goalName,
      levelNumber,
      stepId,
      completedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      events[existingIndex] = newEvent;
    } else {
      events.push(newEvent);
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 180);
    const cutoffTs = cutoff.getTime();
    const recentEvents = events.filter((event) => new Date(event.completedAt).getTime() >= cutoffTs);

    await AsyncStorage.setItem(STEP_COMPLETION_EVENTS_KEY, JSON.stringify(recentEvents));
  } catch (error) {
    console.error('Error tracking step completion event:', error);
  }
}

/**
 * Get all tracked step completion events.
 */
export async function getStepCompletionEvents(): Promise<StepCompletionEvent[]> {
  try {
    const eventsData = await AsyncStorage.getItem(STEP_COMPLETION_EVENTS_KEY);
    return eventsData ? JSON.parse(eventsData) : [];
  } catch (error) {
    console.error('Error getting step completion events:', error);
    return [];
  }
}


