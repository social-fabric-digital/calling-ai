import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CompletedGoal {
  id: string;
  name: string;
  dateCompleted: string;
  dateStarted: string;
  overallMood: string | null;
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


