import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '@/utils/i18n';
import { tryModel } from '@/utils/claudeApi';
import Constants from 'expo-constants';
import { getMoodHistory, MoodEntry } from '@/utils/moodStorage';

const { width } = Dimensions.get('window');

// Get API key
const getApiKey = () => {
  return Constants.expoConfig?.extra?.anthropicApiKey || 
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
};

// Interface for weekly progress data
interface WeeklyProgressData {
  weekStart: Date;
  weekEnd: Date;
  daysActive: number;
  currentStreak: number;
  currentPath: {
    name: string;
    icon: string;
  } | null;
  currentGoal: {
    name: string;
    currentLevel: number;
    totalLevels: number;
    levelProgress: number;
    stepsCompletedThisWeek: number;
    goalId: string;
  } | null;
  clarityMapsCompleted: number;
  dailyQuestionsAnswered: number;
  cosmicInsightsViewed: number;
  focusSanctuarySessions: number;
  clarityMapFeelings: {
    clearer: number;
    same: number;
    overwhelmed: number;
  };
  patternNoticed: string | null;
  mostFrequentMood: {
    emoji: string;
    text: string;
    count: number;
  } | null;
  smallWins: string[];
  nextSmallStep: {
    suggestion: string;
    ikigaiConnection: string;
  } | null;
}

// Helper function to get current week dates (Sunday-Saturday)
const getCurrentWeekDates = (): { weekStart: Date; weekEnd: Date } => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return { weekStart: startOfWeek, weekEnd: endOfWeek };
};

// Helper function to check if date is in current week
const isDateInCurrentWeek = (date: Date, weekStart: Date, weekEnd: Date): boolean => {
  return date >= weekStart && date < weekEnd;
};

// Format date range for display
const formatDateRange = (weekStart: Date, weekEnd: Date): string => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = monthNames[weekStart.getMonth()];
  const startDay = weekStart.getDate();
  const endMonth = monthNames[weekEnd.getMonth()];
  const endDay = weekEnd.getDate();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
};

// Aggregate weekly data from AsyncStorage
const getWeeklyData = async (): Promise<WeeklyProgressData> => {
  const { weekStart, weekEnd } = getCurrentWeekDates();
  
  // Initialize default data
  const data: WeeklyProgressData = {
    weekStart,
    weekEnd,
    daysActive: 0,
    currentStreak: 0,
    currentPath: null,
    currentGoal: null,
    clarityMapsCompleted: 0,
    dailyQuestionsAnswered: 0,
    cosmicInsightsViewed: 0,
    focusSanctuarySessions: 0,
    clarityMapFeelings: {
      clearer: 0,
      same: 0,
      overwhelmed: 0,
    },
    patternNoticed: null,
    mostFrequentMood: null,
    smallWins: [],
    nextSmallStep: null,
  };
  
  try {
    // Get days active from userAnswers
    const answersData = await AsyncStorage.getItem('userAnswers');
    if (answersData) {
      const answers = JSON.parse(answersData);
      const uniqueDates = new Set<string>();
      
      answers.forEach((answer: any) => {
        if (answer.date) {
          const dateStr = answer.date;
          const answerDate = new Date(dateStr + 'T00:00:00');
          if (isDateInCurrentWeek(answerDate, weekStart, weekEnd)) {
            uniqueDates.add(dateStr);
          }
        }
      });
      
      data.daysActive = uniqueDates.size;
      
      // Calculate current streak (consecutive days from today backwards)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let streak = 0;
      let checkDate = new Date(today);
      
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (uniqueDates.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      
      data.currentStreak = streak;
      
      // Count daily questions answered (based on answers)
      data.dailyQuestionsAnswered = answers.filter((a: any) => 
        a.date && isDateInCurrentWeek(new Date(a.date + 'T00:00:00'), weekStart, weekEnd)
      ).length;
    }
    
    // Get clarity map sessions
    const clarityMapsData = await AsyncStorage.getItem('clarityMapSessions');
    if (clarityMapsData) {
      const sessions = JSON.parse(clarityMapsData);
      const weekSessions = sessions.filter((session: any) => {
        if (session.timestamp) {
          const sessionDate = new Date(session.timestamp);
          return isDateInCurrentWeek(sessionDate, weekStart, weekEnd);
        }
        return false;
      });
      
      data.clarityMapsCompleted = weekSessions.length;
      
      // Extract feelings if stored (currently not implemented, so default to 0)
      // This would need to be added to clarity map completion flow
    }
    
    // Count cosmic insights viewed (check for daily-report cache keys)
    let cosmicInsightsViewed = 0;
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const reportKeys = allKeys.filter(key => key.startsWith('daily-report-'));
      for (const key of reportKeys) {
        const dateStr = key.replace('daily-report-', '');
        const reportDate = new Date(dateStr + 'T00:00:00');
        if (isDateInCurrentWeek(reportDate, weekStart, weekEnd)) {
          const reportData = await AsyncStorage.getItem(key);
          if (reportData) {
            cosmicInsightsViewed++;
          }
        }
      }
    } catch (error) {
      console.error('Error counting cosmic insights:', error);
    }
    data.cosmicInsightsViewed = cosmicInsightsViewed;
    
    // Count focus sanctuary sessions (check for focus sessions)
    // We'll track sessions by checking if focus hours were added this week
    // For a more accurate count, we could store individual session timestamps
    let focusSanctuarySessions = 0;
    try {
      // Check if there's a focusSessions array stored
      const focusSessionsData = await AsyncStorage.getItem('focusSessions');
      if (focusSessionsData) {
        const sessions = JSON.parse(focusSessionsData);
        focusSanctuarySessions = sessions.filter((session: any) => {
          if (session.timestamp) {
            const sessionDate = new Date(session.timestamp);
            return isDateInCurrentWeek(sessionDate, weekStart, weekEnd);
          }
          return false;
        }).length;
      } else {
        // Fallback: estimate based on focus hours if available
        // This is less accurate but better than 0
        const focusHoursData = await AsyncStorage.getItem('focusHours');
        if (focusHoursData) {
          // Estimate: assume average session is 15 minutes (0.25 hours)
          // This is just a fallback - ideally we'd track individual sessions
          const totalHours = parseFloat(focusHoursData);
          // We can't accurately determine weekly sessions from total hours alone
          // So we'll default to 0 if no session tracking exists
        }
      }
    } catch (error) {
      console.error('Error counting focus sessions:', error);
    }
    data.focusSanctuarySessions = focusSanctuarySessions;
    
    // Calculate most frequent mood for the week
    try {
      const moodHistory = await getMoodHistory();
      const moodCounts: { [key: string]: { emoji: string; text: string; count: number } } = {};
      
      // Count moods for the current week
      for (const dateKey in moodHistory) {
        const moodEntry = moodHistory[dateKey];
        const moodDate = new Date(moodEntry.date + 'T00:00:00');
        
        if (isDateInCurrentWeek(moodDate, weekStart, weekEnd)) {
          const moodKey = moodEntry.text;
          if (!moodCounts[moodKey]) {
            moodCounts[moodKey] = {
              emoji: moodEntry.emoji,
              text: moodEntry.text,
              count: 0,
            };
          }
          moodCounts[moodKey].count++;
        }
      }
      
      // Find the mood with the highest count
      let mostFrequent: { emoji: string; text: string; count: number } | null = null;
      let maxCount = 0;
      
      for (const moodKey in moodCounts) {
        if (moodCounts[moodKey].count > maxCount) {
          maxCount = moodCounts[moodKey].count;
          mostFrequent = moodCounts[moodKey];
        }
      }
      
      data.mostFrequentMood = mostFrequent;
    } catch (error) {
      console.error('Error calculating most frequent mood:', error);
      data.mostFrequentMood = null;
    }
    
    // Get current active goal
    const userGoalsData = await AsyncStorage.getItem('userGoals');
    if (userGoalsData) {
      const userGoals = JSON.parse(userGoalsData);
      const activeGoal = userGoals.find((g: any) => g.isActive === true);
      
      if (activeGoal) {
        data.currentPath = {
          name: activeGoal.name || 'Your Path',
          icon: '🎯',
        };
        
        const currentStepIndex = activeGoal.currentStepIndex || 0;
        const totalSteps = activeGoal.numberOfSteps || 4;
        const currentLevel = currentStepIndex + 1;
        
        // Calculate level progress percentage
        // If currentStepIndex is 0, level 1 is in progress
        // Progress is based on how many steps are completed within the current level
        // For simplicity, estimate level progress as (currentStepIndex + 1) / totalSteps * 100
        const levelProgress = Math.round(((currentStepIndex + 1) / totalSteps) * 100);
        
        // Estimate steps completed this week (if goal was created this week, assume progress happened this week)
        let stepsCompletedThisWeek = 0;
        if (activeGoal.createdAt) {
          const createdAt = new Date(activeGoal.createdAt);
          if (isDateInCurrentWeek(createdAt, weekStart, weekEnd)) {
            stepsCompletedThisWeek = currentStepIndex + 1;
          } else if (currentStepIndex > 0) {
            // Estimate: if goal existed before week, assume at least some progress this week
            stepsCompletedThisWeek = Math.min(currentStepIndex + 1, 3);
          }
        }
        
        data.currentGoal = {
          name: activeGoal.steps?.[currentStepIndex]?.name || activeGoal.name || 'Current Goal',
          currentLevel,
          totalLevels: totalSteps,
          levelProgress,
          stepsCompletedThisWeek,
          goalId: activeGoal.id,
        };
      }
    }
    
    // Get ikigai data for next step generation
    const ikigaiLove = await AsyncStorage.getItem('ikigaiWhatYouLove');
    const ikigaiGood = await AsyncStorage.getItem('ikigaiWhatYouGoodAt');
    const ikigaiWorld = await AsyncStorage.getItem('ikigaiWhatWorldNeeds');
    const ikigaiPaid = await AsyncStorage.getItem('ikigaiWhatCanBePaidFor');
    
    // Generate AI content (will be done separately with loading states)
    // For now, set defaults
    
  } catch (error) {
    console.error('Error aggregating weekly data:', error);
  }
  
  return data;
};

// AI Generation Functions

// Generate pattern noticed from clarity maps
const generatePatternNoticed = async (clarityMapsData: any[]): Promise<string | null> => {
  if (clarityMapsData.length < 2) return null;
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    
    // Extract thoughts from clarity maps
    const thoughtsByCategory: { urgent: string[]; explore: string[]; letGo: string[] } = {
      urgent: [],
      explore: [],
      letGo: [],
    };
    
    clarityMapsData.forEach((session: any) => {
      if (session.thoughts && Array.isArray(session.thoughts)) {
        session.thoughts.forEach((thought: any) => {
          if (thought.category === 'important') {
            thoughtsByCategory.urgent.push(thought.text);
          } else if (thought.category === 'unclear') {
            thoughtsByCategory.explore.push(thought.text);
          } else if (thought.category === 'not_important') {
            thoughtsByCategory.letGo.push(thought.text);
          }
        });
      }
    });
    
    const prompt = `Analyze this user's clarity map entries from the past week:

Urgent in My Heart:
${thoughtsByCategory.urgent.join('\n- ') || 'None'}

Explore This:
${thoughtsByCategory.explore.join('\n- ') || 'None'}

Can Let Go For Now:
${thoughtsByCategory.letGo.join('\n- ') || 'None'}

Identify ONE recurring theme or pattern across their entries.

Output format:
"[Theme] appeared in ${clarityMapsData.length} of your clarity maps this week. [One sentence of gentle insight or invitation to explore further]."

Tone: Observational, curious, non-judgmental, no pressure
Keep to 2 sentences maximum
If no clear pattern, return "null"`;

    const response = await tryModel(apiKey, 'claude-sonnet-4-20250514', [
      { role: 'user', content: prompt }
    ], 'You are a compassionate observer who helps people notice patterns in their thoughts without judgment.', 200);
    
    const responseData = await response.json();
    const pattern = responseData.content?.[0]?.text?.trim();
    
    if (pattern && pattern.toLowerCase() !== 'null' && pattern.length > 10) {
      return pattern;
    }
    
    return null;
  } catch (error) {
    console.error('Error generating pattern:', error);
    return null;
  }
};

// Generate word of the week
const generateWordOfTheWeek = async (data: WeeklyProgressData): Promise<string> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      // Default words based on activity
      if (data.daysActive >= 6) return 'Achieving';
      if (data.daysActive >= 3) return 'Building';
      if (data.daysActive === 0) return 'Resting';
      return 'Exploring';
    }
    
    const prompt = `Based on this user's activity and inputs this week:

- Days active: ${data.daysActive} out of 7
- Clarity maps completed: ${data.clarityMapsCompleted}
- Goal progress: ${data.currentGoal ? `Level ${data.currentGoal.currentLevel} of ${data.currentGoal.totalLevels}` : 'No active goal'}
- Feelings after clarity maps: Clearer ${data.clarityMapFeelings.clearer}, Same ${data.clarityMapFeelings.same}, Overwhelmed ${data.clarityMapFeelings.overwhelmed}

Generate ONE word that captures the essence of their week.

Examples: "Exploring", "Building", "Processing", "Growing", "Seeking", "Settling", "Discovering", "Questioning"

Choose a word that feels validating and neutral, never negative.
Return only the single word.`;

    const response = await tryModel(apiKey, 'claude-sonnet-4-20250514', [
      { role: 'user', content: prompt }
    ], 'You are a compassionate observer who helps people understand their journey through single meaningful words.', 50);
    
    const responseData = await response.json();
    const word = responseData.content?.[0]?.text?.trim().replace(/^["']|["']$/g, '');
    
    if (word && word.length < 20) {
      return word;
    }
    
    // Fallback
    if (data.daysActive >= 6) return 'Achieving';
    if (data.daysActive >= 3) return 'Building';
    if (data.daysActive === 0) return 'Resting';
    return 'Exploring';
  } catch (error) {
    console.error('Error generating word of the week:', error);
    if (data.daysActive >= 6) return 'Achieving';
    if (data.daysActive >= 3) return 'Building';
    if (data.daysActive === 0) return 'Resting';
    return 'Exploring';
  }
};

// Generate next small step
const generateNextSmallStep = async (
  currentGoal: WeeklyProgressData['currentGoal'],
  ikigaiData: { love: string; good: string; world: string; paid: string }
): Promise<{ suggestion: string; ikigaiConnection: string } | null> => {
  if (!currentGoal) return null;
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return {
        suggestion: 'Spend 15 minutes reflecting on your next step',
        ikigaiConnection: 'self-reflection + personal growth',
      };
    }
    
    const prompt = `User's context:
- Current path: ${currentGoal.name}
- Current goal: ${currentGoal.name}
- Current level: ${currentGoal.currentLevel} of ${currentGoal.totalLevels}
- Steps completed: Level ${currentGoal.currentLevel}
- Ikigai: love: ${ikigaiData.love || 'not specified'}, good at: ${ikigaiData.good || 'not specified'}, world needs: ${ikigaiData.world || 'not specified'}, paid for: ${ikigaiData.paid || 'not specified'}
- Time available: Assume 15-30 minutes/week

Generate ONE small, achievable next step for the coming week.

Requirements:
- Takes 15-30 minutes maximum
- Directly advances their current goal level
- Connects to at least one ikigai element
- Phrased as an invitation, not a command
- Specific and actionable

Output format (JSON):
{
  "suggestion": "Spend 15 minutes [specific action]",
  "ikigaiConnection": "[ikigai element] + [ikigai element]"
}

Tone: Encouraging, gentle, realistic`;

    const response = await tryModel(apiKey, 'claude-sonnet-4-20250514', [
      { role: 'user', content: prompt }
    ], 'You are a compassionate life coach who suggests gentle, achievable next steps.', 300);
    
    const responseData = await response.json();
    const content = responseData.content?.[0]?.text?.trim();
    
    // Try to parse JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          suggestion: parsed.suggestion || 'Spend 15 minutes reflecting on your next step',
          ikigaiConnection: parsed.ikigaiConnection || 'self-reflection + personal growth',
        };
      }
    } catch (e) {
      // If JSON parsing fails, extract suggestion from text
      const suggestionMatch = content.match(/suggestion["\s:]+"([^"]+)"/i) || content.match(/Spend \d+ minutes[^"]*/i);
      const ikigaiMatch = content.match(/ikigaiConnection["\s:]+"([^"]+)"/i) || content.match(/connects to[^"]*/i);
      
      return {
        suggestion: suggestionMatch ? suggestionMatch[1] || suggestionMatch[0] : 'Spend 15 minutes reflecting on your next step',
        ikigaiConnection: ikigaiMatch ? ikigaiMatch[1] || ikigaiMatch[0] : 'self-reflection + personal growth',
      };
    }
    
    return {
      suggestion: 'Spend 15 minutes reflecting on your next step',
      ikigaiConnection: 'self-reflection + personal growth',
    };
  } catch (error) {
    console.error('Error generating next step:', error);
    return {
      suggestion: 'Spend 15 minutes reflecting on your next step',
      ikigaiConnection: 'self-reflection + personal growth',
    };
  }
};

// Generate small wins using rule-based logic
const generateSmallWins = async (data: WeeklyProgressData, additionalData: {
  totalThoughtsSorted: number;
  completedLevelThisWeek: boolean;
  levelNumber?: number;
  stepName?: string;
  goalCompletedThisWeek: boolean;
  goalName?: string;
  firstTimeClarityMap: boolean;
  firstTimeGoalCreated: boolean;
  firstTimeCustomPath: boolean;
  firstTimeBadgeClaimed: boolean;
  daysSinceLastActivity: number;
  pathSelectedThisWeek: boolean;
  pathName?: string;
  newPathSelected?: boolean;
}): Promise<string[]> => {
  const wins: string[] = [];
  
  // WIN CATEGORY 11: Goal Completion (HIGHEST PRIORITY)
  if (additionalData.goalCompletedThisWeek && additionalData.goalName) {
    wins.push(`✓ Completed your entire goal: '${additionalData.goalName}' 🎉`);
  }
  
  // WIN CATEGORY 1: Goal Progress (HIGH PRIORITY)
  if (data.currentGoal && data.currentGoal.stepsCompletedThisWeek >= 1) {
    if (data.currentGoal.stepsCompletedThisWeek === 1 && additionalData.stepName) {
      wins.push(`✓ Completed '${additionalData.stepName}' step in your goal`);
    } else if (data.currentGoal.stepsCompletedThisWeek > 1) {
      wins.push(`✓ Completed ${data.currentGoal.stepsCompletedThisWeek} steps toward your goal`);
    }
  }
  
  // WIN CATEGORY 2: Level Completion (HIGH PRIORITY)
  if (additionalData.completedLevelThisWeek && additionalData.levelNumber) {
    wins.push(`✓ Completed Level ${additionalData.levelNumber} of your goal — huge milestone!`);
  }
  
  // WIN CATEGORY 8: First-Time Feature Usage (HIGH PRIORITY)
  if (additionalData.firstTimeClarityMap) {
    wins.push(`✓ Tried Clarity Map for the first time — brave step!`);
  }
  if (additionalData.firstTimeGoalCreated) {
    wins.push(`✓ Set your first goal — your journey has begun`);
  }
  if (additionalData.firstTimeCustomPath) {
    wins.push(`✓ Created your own custom path — bold move!`);
  }
  if (additionalData.firstTimeBadgeClaimed) {
    wins.push(`✓ Claimed your first badge!`);
  }
  
  // WIN CATEGORY 9: Return After Absence (HIGH PRIORITY)
  if (additionalData.daysSinceLastActivity >= 7 && data.daysActive >= 1) {
    wins.push(`✓ You came back — that takes courage`);
  }
  
  // WIN CATEGORY 3: Clarity Map Usage (MEDIUM PRIORITY)
  if (data.clarityMapsCompleted >= 1) {
    if (data.clarityMapsCompleted === 1) {
      wins.push(`✓ Sorted your thoughts with a Clarity Map`);
    } else if (data.clarityMapsCompleted === 2) {
      wins.push(`✓ Used Clarity Map twice to clear your mind`);
    } else if (data.clarityMapsCompleted >= 3) {
      wins.push(`✓ Processed your thoughts ${data.clarityMapsCompleted} times this week`);
    }
  }
  
  // WIN CATEGORY 4: Thoughts Processed (MEDIUM PRIORITY - only if Clarity Map win not shown)
  if (additionalData.totalThoughtsSorted >= 5 && data.clarityMapsCompleted === 0) {
    if (additionalData.totalThoughtsSorted >= 10) {
      wins.push(`✓ Sorted through ${additionalData.totalThoughtsSorted} thoughts — that's real inner work`);
    } else if (additionalData.totalThoughtsSorted >= 5) {
      wins.push(`✓ Processed ${additionalData.totalThoughtsSorted} thoughts this week`);
    }
  }
  
  // WIN CATEGORY 5: Streak Milestones (MEDIUM PRIORITY)
  if (data.currentStreak >= 2) {
    if (data.currentStreak === 7) {
      wins.push(`✓ Perfect week — 7 days connected!`);
    } else if (data.currentStreak === 6) {
      wins.push(`✓ 6-day streak — almost perfect!`);
    } else if (data.currentStreak === 5) {
      wins.push(`✓ 5-day streak — you're on fire!`);
    } else if (data.currentStreak === 4) {
      wins.push(`✓ 4-day streak — building strong momentum`);
    } else if (data.currentStreak === 3) {
      wins.push(`✓ 3-day streak — consistency is building`);
    } else if (data.currentStreak === 2) {
      wins.push(`✓ 2 days in a row — a streak has begun`);
    }
  }
  
  // WIN CATEGORY 6: Daily Reflections (MEDIUM PRIORITY)
  if (data.dailyQuestionsAnswered >= 1) {
    if (data.dailyQuestionsAnswered >= 5) {
      wins.push(`✓ Reflected ${data.dailyQuestionsAnswered} times this week`);
    } else if (data.dailyQuestionsAnswered >= 3) {
      wins.push(`✓ Took time to reflect ${data.dailyQuestionsAnswered} times`);
    } else {
      wins.push(`✓ Paused to reflect on your journey`);
    }
  }
  
  // WIN CATEGORY 10: Path Selection (MEDIUM PRIORITY)
  if (additionalData.pathSelectedThisWeek) {
    if (additionalData.newPathSelected && additionalData.pathName) {
      wins.push(`✓ Chose your path: ${additionalData.pathName}`);
    } else if (!additionalData.newPathSelected) {
      wins.push(`✓ Pivoted to a new direction — growth in action`);
    }
  }
  
  // WIN CATEGORY 7: Cosmic Insights (LOW PRIORITY)
  if (data.cosmicInsightsViewed >= 1) {
    if (data.cosmicInsightsViewed >= 6) {
      wins.push(`✓ Stayed connected to your cosmic guidance all week`);
    } else if (data.cosmicInsightsViewed >= 4) {
      wins.push(`✓ Checked in with your cosmic insights ${data.cosmicInsightsViewed} times`);
    } else {
      wins.push(`✓ Connected with your cosmic guidance`);
    }
  }
  
  // WIN CATEGORY 12: Minimum Engagement Fallback (FALLBACK)
  if (wins.length === 0 && data.daysActive >= 1) {
    wins.push(`✓ You showed up — that's the first step`);
  }
  
  // Return maximum 5 wins
  return wins.slice(0, 5);
};

// Collect additional data needed for win generation
const collectAdditionalWinData = async (
  data: WeeklyProgressData,
  clarityMaps: any[]
): Promise<{
  totalThoughtsSorted: number;
  completedLevelThisWeek: boolean;
  levelNumber?: number;
  stepName?: string;
  goalCompletedThisWeek: boolean;
  goalName?: string;
  firstTimeClarityMap: boolean;
  firstTimeGoalCreated: boolean;
  firstTimeCustomPath: boolean;
  firstTimeBadgeClaimed: boolean;
  daysSinceLastActivity: number;
  pathSelectedThisWeek: boolean;
  pathName?: string;
  newPathSelected?: boolean;
}> => {
  const { weekStart, weekEnd } = getCurrentWeekDates();
  
  // Initialize defaults
  const additionalData = {
    totalThoughtsSorted: 0,
    completedLevelThisWeek: false,
    levelNumber: undefined as number | undefined,
    stepName: undefined as string | undefined,
    goalCompletedThisWeek: false,
    goalName: undefined as string | undefined,
    firstTimeClarityMap: false,
    firstTimeGoalCreated: false,
    firstTimeCustomPath: false,
    firstTimeBadgeClaimed: false,
    daysSinceLastActivity: 0,
    pathSelectedThisWeek: false,
    pathName: undefined as string | undefined,
    newPathSelected: undefined as boolean | undefined,
  };
  
  try {
    // Count total thoughts sorted from clarity maps
    clarityMaps.forEach((session: any) => {
      if (session.thoughts && Array.isArray(session.thoughts)) {
        additionalData.totalThoughtsSorted += session.thoughts.length;
      }
    });
    
    // Check for first-time clarity map usage
    if (clarityMaps.length > 0) {
      const allClarityMapsData = await AsyncStorage.getItem('clarityMapSessions');
      if (allClarityMapsData) {
        const allSessions = JSON.parse(allClarityMapsData);
        // Check if this week's session is the first ever
        if (allSessions.length === clarityMaps.length) {
          additionalData.firstTimeClarityMap = true;
        }
      }
    }
    
    // Check goal progress and level completion
    if (data.currentGoal) {
      const userGoalsData = await AsyncStorage.getItem('userGoals');
      if (userGoalsData) {
        const userGoals = JSON.parse(userGoalsData);
        const activeGoal = userGoals.find((g: any) => g.isActive === true);
        
        if (activeGoal) {
          const currentStepIndex = activeGoal.currentStepIndex || 0;
          const totalSteps = activeGoal.numberOfSteps || 4;
          
          // Get step name if available
          if (activeGoal.steps && activeGoal.steps[currentStepIndex]) {
            additionalData.stepName = activeGoal.steps[currentStepIndex].name;
          }
          
          // Check if level was completed this week
          // A level is completed when moving from one step to the next within the same level
          // For simplicity, we'll check if the goal was created this week and has progress
          if (activeGoal.createdAt) {
            const createdAt = new Date(activeGoal.createdAt);
            if (isDateInCurrentWeek(createdAt, weekStart, weekEnd) && currentStepIndex > 0) {
              // Estimate level completion (every 4 steps is a level, or based on totalSteps)
              const stepsPerLevel = Math.ceil(totalSteps / 4);
              const previousLevel = Math.floor((currentStepIndex - 1) / stepsPerLevel);
              const currentLevel = Math.floor(currentStepIndex / stepsPerLevel);
              if (currentLevel > previousLevel) {
                additionalData.completedLevelThisWeek = true;
                additionalData.levelNumber = currentLevel + 1;
              }
            }
          }
          
          // Check if entire goal was completed
          if (currentStepIndex >= totalSteps - 1 && activeGoal.createdAt) {
            const createdAt = new Date(activeGoal.createdAt);
            if (isDateInCurrentWeek(createdAt, weekStart, weekEnd)) {
              additionalData.goalCompletedThisWeek = true;
              additionalData.goalName = activeGoal.name;
            }
          }
          
          // Check if first goal was created this week
          if (userGoals.length === 1 && activeGoal.createdAt) {
            const createdAt = new Date(activeGoal.createdAt);
            if (isDateInCurrentWeek(createdAt, weekStart, weekEnd)) {
              additionalData.firstTimeGoalCreated = true;
            }
          }
        }
      }
    }
    
    // Check for custom path creation
    try {
      const customPathsData = await AsyncStorage.getItem('customPaths');
      if (customPathsData) {
        const customPaths = JSON.parse(customPathsData);
        const weekPaths = customPaths.filter((path: any) => {
          if (path.createdAt) {
            const createdAt = new Date(path.createdAt);
            return isDateInCurrentWeek(createdAt, weekStart, weekEnd);
          }
          return false;
        });
        if (weekPaths.length > 0 && customPaths.length === weekPaths.length) {
          additionalData.firstTimeCustomPath = true;
        }
      }
    } catch (error) {
      console.error('Error checking custom paths:', error);
    }
    
    // Check for first badge claimed
    try {
      const badgesData = await AsyncStorage.getItem('userBadges');
      if (badgesData) {
        const badges = JSON.parse(badgesData);
        const weekBadges = badges.filter((badge: any) => {
          if (badge.claimedAt) {
            const claimedAt = new Date(badge.claimedAt);
            return isDateInCurrentWeek(claimedAt, weekStart, weekEnd);
          }
          return false;
        });
        if (weekBadges.length > 0 && badges.length === weekBadges.length) {
          additionalData.firstTimeBadgeClaimed = true;
        }
      }
    } catch (error) {
      console.error('Error checking badges:', error);
    }
    
    // Calculate days since last activity
    try {
      const answersData = await AsyncStorage.getItem('userAnswers');
      if (answersData) {
        const answers = JSON.parse(answersData);
        if (answers.length > 0) {
          const lastAnswer = answers[answers.length - 1];
          if (lastAnswer.date) {
            const lastDate = new Date(lastAnswer.date + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffTime = today.getTime() - lastDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            additionalData.daysSinceLastActivity = diffDays;
          }
        }
      }
    } catch (error) {
      console.error('Error calculating days since last activity:', error);
    }
    
    // Check if path was selected/changed this week
    if (data.currentPath) {
      try {
        const userGoalsData = await AsyncStorage.getItem('userGoals');
        if (userGoalsData) {
          const userGoals = JSON.parse(userGoalsData);
          const activeGoal = userGoals.find((g: any) => g.isActive === true);
          if (activeGoal && activeGoal.createdAt) {
            const createdAt = new Date(activeGoal.createdAt);
            if (isDateInCurrentWeek(createdAt, weekStart, weekEnd)) {
              additionalData.pathSelectedThisWeek = true;
              additionalData.pathName = activeGoal.name;
              additionalData.newPathSelected = true;
            }
          }
        }
      } catch (error) {
        console.error('Error checking path selection:', error);
      }
    }
  } catch (error) {
    console.error('Error collecting additional win data:', error);
  }
  
  return additionalData;
};

export default function ProgressScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [weeklyData, setWeeklyData] = useState<WeeklyProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showHelperModal, setShowHelperModal] = useState(false);
  
  // Badge modal state (keep existing badge functionality)
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeData, setBadgeData] = useState<{
    name: string;
    message: string;
    image: any;
    badgeNumber?: number;
    category?: 'career' | 'social' | 'personal' | 'progress';
  } | null>(null);
  
  // Load weekly data and generate AI content
  useEffect(() => {
    loadWeeklyData();
  }, []);
  
  const loadWeeklyData = async () => {
    setIsLoading(true);
    setIsGeneratingAI(true);
    
    try {
      // Get base data
      const data = await getWeeklyData();
      
      // Get clarity map sessions for pattern analysis
      const clarityMapsData = await AsyncStorage.getItem('clarityMapSessions');
      let clarityMaps: any[] = [];
      if (clarityMapsData) {
        const allSessions = JSON.parse(clarityMapsData);
        clarityMaps = allSessions.filter((session: any) => {
          if (session.timestamp) {
            const sessionDate = new Date(session.timestamp);
            return isDateInCurrentWeek(sessionDate, data.weekStart, data.weekEnd);
          }
          return false;
        });
      }
      
      // Collect additional data for small wins generation
      const additionalData = await collectAdditionalWinData(data, clarityMaps);
      
      // Generate AI content in parallel
      const [pattern, nextStep, wins] = await Promise.all([
        clarityMaps.length >= 2 ? generatePatternNoticed(clarityMaps) : Promise.resolve(null),
        data.currentGoal ? generateNextSmallStep(
          data.currentGoal,
          {
            love: await AsyncStorage.getItem('ikigaiWhatYouLove') || '',
            good: await AsyncStorage.getItem('ikigaiWhatYouGoodAt') || '',
            world: await AsyncStorage.getItem('ikigaiWhatWorldNeeds') || '',
            paid: await AsyncStorage.getItem('ikigaiWhatCanBePaidFor') || '',
          }
        ) : Promise.resolve(null),
        generateSmallWins(data, additionalData),
      ]);
      
      data.patternNoticed = pattern;
      data.nextSmallStep = nextStep;
      data.smallWins = wins;
      
      setWeeklyData(data);
    } catch (error) {
      console.error('Error loading weekly data:', error);
    } finally {
      setIsLoading(false);
      setIsGeneratingAI(false);
    }
  };
  
  // Badge functions (keep existing)
  const badgeImageMap: { [key: number]: any } = {
    1: require('../assets/images/badges/1.png'),
    2: require('../assets/images/badges/2.png'),
    3: require('../assets/images/badges/3.png'),
    4: require('../assets/images/badges/4.png'),
    5: require('../assets/images/badges/5.png'),
    6: require('../assets/images/badges/6.png'),
    7: require('../assets/images/badges/7.png'),
    8: require('../assets/images/badges/8.png'),
    9: require('../assets/images/badges/9.png'),
    10: require('../assets/images/badges/10.png'),
    11: require('../assets/images/badges/11.png'),
    12: require('../assets/images/badges/12.png'),
    13: require('../assets/images/badges/13.png'),
    14: require('../assets/images/badges/14.png'),
    15: require('../assets/images/badges/15.png'),
    16: require('../assets/images/badges/16.png'),
    17: require('../assets/images/badges/17.png'),
    18: require('../assets/images/badges/18.png'),
    19: require('../assets/images/badges/19.png'),
    20: require('../assets/images/badges/20.png'),
    21: require('../assets/images/badges/21.png'),
    22: require('../assets/images/badges/22.png'),
    23: require('../assets/images/badges/23.png'),
    24: require('../assets/images/badges/24.png'),
    25: require('../assets/images/badges/25.png'),
    26: require('../assets/images/badges/26.png'),
    27: require('../assets/images/badges/27.png'),
    28: require('../assets/images/badges/28.png'),
    29: require('../assets/images/badges/29.png'),
    30: require('../assets/images/badges/30.png'),
  };
  
  const getBadgeImage = (badgeNumber: number) => {
    return badgeImageMap[badgeNumber] || require('../assets/images/trophy.png');
  };
  
  const BADGE_CATEGORIES = {
    career: {
      badges: [2, 5, 7, 9, 17, 21, 22, 30],
      names: {
        2: 'Skills Upgrade',
        5: 'Growth Catalyst',
        7: 'Threshold Crosser',
        9: 'Resume Refresh',
        17: 'Time Master',
        21: 'First Application',
        22: 'Visible Voice',
        30: 'New Opportunities',
      },
    },
    social: {
      badges: [3, 10, 11, 15, 16, 18, 23, 24, 29],
      names: {
        3: 'Network Builder',
        10: 'Bridge Builder',
        11: 'Coffee Courage',
        15: 'Storm Calmer',
        16: 'Connection Master',
        18: 'Vulnerability Champion',
        23: 'Social Confidence',
        24: 'Group Participant',
        29: 'First Reach Out',
      },
    },
    personal: {
      badges: [1, 4, 6, 12, 13, 14, 19, 20, 25, 28],
      names: {
        1: 'Fear Stomper',
        4: 'Solo Summit',
        6: 'Finding Way',
        12: 'First Rep',
        13: 'Boundary Setter',
        14: 'Treasure Finder',
        19: 'Comfort Zone Exit',
        20: 'Physical Courage',
        25: 'Solo Adventure',
        28: 'Personal Transformation',
      },
    },
    progress: {
      badges: [8, 26, 27],
      names: {
        8: 'Summit Reached',
        26: 'Achievement Unlocked',
        27: 'Weekly Warrior',
      },
    },
  };
  
  const getAvailableBadgesInCategory = async (category: 'career' | 'social' | 'personal' | 'progress'): Promise<number[]> => {
    try {
      const badgesData = await AsyncStorage.getItem('userBadges');
      const existingBadges = badgesData ? JSON.parse(badgesData) : [];
      const earnedBadgeNumbers = new Set(existingBadges.map((b: any) => b.badgeNumber).filter((n: any) => n !== undefined));
      const categoryBadges = BADGE_CATEGORIES[category].badges;
      return categoryBadges.filter(badgeNum => !earnedBadgeNumbers.has(badgeNum));
    } catch (error) {
      return BADGE_CATEGORIES[category].badges;
    }
  };
  
  const getTranslatedBadgeName = (category: string, badgeNumber: number): string => {
    if (i18n.language === 'ru' || i18n.language?.startsWith('ru')) {
      const translationKey = `progress.badgeNames.${category}.${badgeNumber}`;
      const translated = t(translationKey);
      if (translated && translated !== translationKey) {
        return translated;
      }
    }
    return BADGE_CATEGORIES[category as keyof typeof BADGE_CATEGORIES]?.names[badgeNumber as any] || 'Achievement';
  };
  
  const analyzeUserGoals = async (): Promise<{
    category: 'career' | 'social' | 'personal' | 'progress';
    badgeNumber: number;
    badgeName: string;
    badgeMessage: string;
  }> => {
    try {
      const goalsData = await AsyncStorage.getItem('userGoals');
      const goals = goalsData ? JSON.parse(goalsData) : [];
      const completedGoalsData = await AsyncStorage.getItem('completedGoals');
      const completedGoals = completedGoalsData ? JSON.parse(completedGoalsData) : [];
      const allGoals = [...goals, ...completedGoals];
      
      const careerKeywords = ['job', 'career', 'interview', 'resume', 'linkedin', 'network', 'professional', 'work', 'business', 'application', 'skill', 'promotion', 'salary'];
      const socialKeywords = ['meet', 'friend', 'social', 'group', 'coffee', 'party', 'relationship', 'connection', 'community', 'team', 'together', 'share', 'communicate'];
      const personalKeywords = ['fear', 'anxiety', 'boundary', 'self-care', 'gym', 'exercise', 'health', 'mental', 'house', 'leave', 'adventure', 'solo', 'courage', 'overcome'];
      
      let careerCount = 0;
      let socialCount = 0;
      let personalCount = 0;
      
      allGoals.forEach((goal: any) => {
        const goalText = (goal.name || '').toLowerCase() + ' ' + (goal.fear || '').toLowerCase();
        if (careerKeywords.some(keyword => goalText.includes(keyword))) careerCount++;
        if (socialKeywords.some(keyword => goalText.includes(keyword))) socialCount++;
        if (personalKeywords.some(keyword => goalText.includes(keyword))) personalCount++;
      });
      
      const daysActive = weeklyData?.daysActive || 0;
      const streakDays = weeklyData?.currentStreak || 0;
      
      if (streakDays >= 7 && daysActive >= 6) {
        const availableProgressBadges = await getAvailableBadgesInCategory('progress');
        if (availableProgressBadges.length > 0) {
          const badgeNum = availableProgressBadges.includes(27) ? 27 : availableProgressBadges[0];
          return {
            category: 'progress',
            badgeNumber: badgeNum,
            badgeName: getTranslatedBadgeName('progress', badgeNum),
            badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
              ? t('progress.badgeMessages.progress7Days')
              : `You've consistently hit your goals for 7 days straight. This badge recognizes your unwavering dedication and momentum.`,
          };
        }
      }
      
      if (completedGoals.length > 0) {
        const availableProgressBadges = await getAvailableBadgesInCategory('progress');
        if (availableProgressBadges.length > 0) {
          const badgeNum = availableProgressBadges.includes(8) ? 8 : availableProgressBadges[0];
          return {
            category: 'progress',
            badgeNumber: badgeNum,
            badgeName: getTranslatedBadgeName('progress', badgeNum),
            badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
              ? t('progress.badgeMessages.progressCompleted', { count: completedGoals.length, goalLabel: completedGoals.length === 1 ? t('progress.goal') : t('progress.goals') })
              : `You've completed ${completedGoals.length} goal${completedGoals.length > 1 ? 's' : ''}. Every summit starts with a single step.`,
          };
        }
      }
      
      if (careerCount > socialCount && careerCount > personalCount) {
        const availableCareerBadges = await getAvailableBadgesInCategory('career');
        if (availableCareerBadges.length > 0) {
          const badgeIndex = (careerCount - 1) % availableCareerBadges.length;
          const badgeNum = availableCareerBadges[badgeIndex];
          return {
            category: 'career',
            badgeNumber: badgeNum,
            badgeName: getTranslatedBadgeName('career', badgeNum),
            badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
              ? t('progress.badgeMessages.careerDedication')
              : `Your dedication to professional growth is inspiring. This badge celebrates your career milestones.`,
          };
        }
      } else if (socialCount > personalCount) {
        const availableSocialBadges = await getAvailableBadgesInCategory('social');
        if (availableSocialBadges.length > 0) {
          const badgeIndex = (socialCount - 1) % availableSocialBadges.length;
          const badgeNum = availableSocialBadges[badgeIndex];
          return {
            category: 'social',
            badgeNumber: badgeNum,
            badgeName: getTranslatedBadgeName('social', badgeNum),
            badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
              ? t('progress.badgeMessages.socialCourage')
              : `Your courage in building connections is remarkable. This badge honors your social growth.`,
          };
        }
      } else if (personalCount > 0) {
        const availablePersonalBadges = await getAvailableBadgesInCategory('personal');
        if (availablePersonalBadges.length > 0) {
          const badgeIndex = (personalCount - 1) % availablePersonalBadges.length;
          const badgeNum = availablePersonalBadges[badgeIndex];
          return {
            category: 'personal',
            badgeNumber: badgeNum,
            badgeName: getTranslatedBadgeName('personal', badgeNum),
            badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
              ? t('progress.badgeMessages.personalBravery')
              : `Your bravery in facing personal challenges is inspiring. This badge celebrates your inner strength.`,
          };
        }
      }
      
      if (daysActive >= 6) {
        const availableProgressBadges = await getAvailableBadgesInCategory('progress');
        if (availableProgressBadges.length > 0) {
          const badgeNum = availableProgressBadges.includes(27) ? 27 : availableProgressBadges[0];
          return {
            category: 'progress',
            badgeNumber: badgeNum,
            badgeName: getTranslatedBadgeName('progress', badgeNum),
            badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
              ? t('progress.weeklyActivityBadge', { count: daysActive })
              : `You've been active ${daysActive} out of 7 days this week. Your commitment is inspiring.`,
          };
        }
      }
      
      const availableProgressBadges = await getAvailableBadgesInCategory('progress');
      const badgeNum = availableProgressBadges.includes(26) ? 26 : (availableProgressBadges[0] || 26);
      return {
        category: 'progress',
        badgeNumber: badgeNum,
        badgeName: getTranslatedBadgeName('progress', badgeNum),
        badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
          ? t('progress.badgeMessages.progressDefault')
          : `You're making progress! Keep showing up and watch your achievements grow.`,
      };
    } catch (error) {
      return {
        category: 'progress',
        badgeNumber: 27,
        badgeName: getTranslatedBadgeName('progress', 27),
        badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
          ? t('progress.badgeMessages.progressConsistency')
          : `You've consistently shown up this week. This badge recognizes your dedication.`,
      };
    }
  };
  
  const handleClaimBadge = async () => {
    const badgeInfo = await analyzeUserGoals();
    const badgeImage = getBadgeImage(badgeInfo.badgeNumber);
    
    setBadgeData({
      name: badgeInfo.badgeName,
      message: badgeInfo.badgeMessage,
      image: badgeImage,
      badgeNumber: badgeInfo.badgeNumber,
      category: badgeInfo.category,
    });
    setShowBadgeModal(true);
  };
  
  const handleAddToProfile = async () => {
    try {
      if (badgeData) {
        const badgesData = await AsyncStorage.getItem('userBadges');
        const badges = badgesData ? JSON.parse(badgesData) : [];
        const badgeId = `badge_${badgeData.badgeNumber}`;
        const badgeExists = badges.some((b: any) => b.badgeNumber === badgeData.badgeNumber);
        
        if (!badgeExists) {
          let badgeIcon = '🏆';
          const category = badgeData.category || 'progress';
          if (category === 'career') badgeIcon = '💼';
          else if (category === 'social') badgeIcon = '🤝';
          else if (category === 'personal') badgeIcon = '💪';
          else if (category === 'progress') badgeIcon = '⭐';
          
          badges.push({
            id: badgeId,
            name: badgeData.name,
            description: badgeData.message,
            icon: badgeIcon,
            badgeNumber: badgeData.badgeNumber,
            dateEarned: new Date().toISOString(),
          });
          
          await AsyncStorage.setItem('userBadges', JSON.stringify(badges));
          await AsyncStorage.setItem('newlyAddedBadgeId', badgeId);
        }
        
        setShowBadgeModal(false);
        router.push('/(tabs)/me');
      }
    } catch (error) {
      console.error('Error adding badge to profile:', error);
    }
  };
  
  if (isLoading || !weeklyData) {
    return (
      <PaperTextureBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#342846" />
        </View>
      </PaperTextureBackground>
    );
  }
  
  const progressPercentage = Math.round((weeklyData.daysActive / 7) * 100);
  
  return (
    <PaperTextureBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Arrow and Helper Button Container */}
        <View style={styles.topButtonsContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#342846" />
          </TouchableOpacity>
          
          {/* Helper Icon */}
          <TouchableOpacity
            style={styles.helperButton}
            onPress={() => setShowHelperModal(true)}
          >
            <MaterialIcons name="help-outline" size={24} color="#342846" />
          </TouchableOpacity>
        </View>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('progress.yourWeek')}</Text>
          <Text style={styles.dateRange}>{formatDateRange(weeklyData.weekStart, weeklyData.weekEnd)}</Text>
        </View>
        
        {/* Engagement Summary Card */}
        <View style={styles.engagementCard}>
          <LinearGradient
            colors={['#F8F9FA', '#FFFFFF']}
            style={styles.engagementCardGradient}
          >
            <View style={styles.engagementContent}>
              <Image 
                source={require('../assets/images/fire.png')} 
                style={styles.engagementIcon}
                resizeMode="contain"
              />
              <Text style={styles.engagementText}>
                {weeklyData.daysActive} of 7{'\n'}days active
              </Text>
              
              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarTrack}>
                  <LinearGradient
                    colors={['#342846', '#5A4A7A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
                  />
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
        
        {/* Claim Your Badge Button - Below Engagement Card */}
        <TouchableOpacity
          style={[
            styles.claimBadgeButton,
            weeklyData.daysActive === 7 && styles.claimBadgeButtonCelebratory
          ]}
          onPress={handleClaimBadge}
        >
          <Text style={styles.claimBadgeButtonText}>{t('progress.claimYourBadge')}</Text>
        </TouchableOpacity>
        
        {/* Section Divider */}
        <View style={styles.sectionDivider} />
        
        {/* YOUR PATH PROGRESS Section */}
        <Text style={styles.sectionHeading}>{t('progress.yourPathProgress')}</Text>
        
        {/* Path Progress Card */}
        {weeklyData.currentGoal ? (
          <View style={styles.pathProgressCard}>
            <View style={styles.pathHeader}>
              <Image 
                source={require('../assets/images/target (1).png')} 
                style={styles.pathIcon}
                resizeMode="contain"
              />
              <Text style={styles.pathName}>{weeklyData.currentPath?.name || 'Your Path'}</Text>
            </View>
            
            <Text style={styles.currentGoalLabel}>{t('progress.currentGoal')}</Text>
            <Text style={styles.currentGoalName}>"{weeklyData.currentGoal.name}"</Text>
            
            <Text style={styles.levelText}>
              {t('progress.level')} {weeklyData.currentGoal.currentLevel} {t('progress.of')} {weeklyData.currentGoal.totalLevels}
            </Text>
            
            {/* Level Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarTrackLevel}>
                <View style={[styles.progressBarFillOrange, { width: `${weeklyData.currentGoal.levelProgress}%` }]} />
              </View>
            </View>
            
            <Text style={styles.stepsCompletedText}>
              {weeklyData.currentGoal.stepsCompletedThisWeek} {t('progress.stepsCompletedThisWeek')}
            </Text>
            
            <TouchableOpacity
              style={styles.viewGoalMapButton}
              onPress={() => router.push(`/goal-map?goalId=${weeklyData.currentGoal!.goalId}`)}
            >
              <Text style={styles.viewGoalMapButtonText}>{t('progress.viewGoalMap')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pathProgressCard}>
            <Text style={styles.noActiveGoalText}>{t('progress.noActiveGoal')}</Text>
          </View>
        )}
        
        {/* Section Divider */}
        <View style={styles.sectionDivider} />
        
        {/* THIS WEEK'S REFLECTIONS Section */}
        <Text style={styles.sectionHeading}>{t('progress.thisWeeksReflections')}</Text>
        
        {/* Reflections Summary Card */}
        <View style={styles.reflectionsCard}>
          <View style={styles.reflectionRow}>
            <Image 
              source={require('../assets/images/claritymap.png')} 
              style={styles.reflectionIcon}
              resizeMode="contain"
            />
            <Text style={styles.reflectionLabel}>{t('progress.clarityMapsCompleted')}:</Text>
            <Text style={styles.reflectionCount}>{weeklyData.clarityMapsCompleted}</Text>
          </View>
          <View style={styles.reflectionRow}>
            <Image 
              source={require('../assets/images/question (2).png')} 
              style={styles.reflectionIcon}
              resizeMode="contain"
            />
            <Text style={styles.reflectionLabel}>{t('progress.dailyQuestionsAnswered')}:</Text>
            <Text style={styles.reflectionCount}>{weeklyData.dailyQuestionsAnswered}</Text>
          </View>
          <View style={styles.reflectionRow}>
            <Image 
              source={require('../assets/images/focus.png')} 
              style={styles.reflectionIcon}
              resizeMode="contain"
            />
            <Text style={styles.reflectionLabel}>{t('progress.cosmicInsightsViewed')}:</Text>
            <Text style={styles.reflectionCount}>{weeklyData.cosmicInsightsViewed}</Text>
          </View>
          <View style={styles.reflectionRow}>
            <Image 
              source={require('../assets/images/focussanctuary.png')} 
              style={styles.reflectionIcon}
              resizeMode="contain"
            />
            <Text style={styles.reflectionLabel}>{t('progress.focusSanctuarySessions')}:</Text>
            <Text style={styles.reflectionCount}>{weeklyData.focusSanctuarySessions}</Text>
          </View>
        </View>
        
        {/* Pattern Noticed Card - Only show if 2+ clarity maps and pattern found */}
        {weeklyData.clarityMapsCompleted >= 2 && weeklyData.patternNoticed && (
          <View style={styles.patternCard}>
            <LinearGradient
              colors={['#F5F3F8', '#FFFFFF']}
              style={styles.patternCardGradient}
            >
              <Text style={styles.patternHeading}>🔄 {t('progress.patternNoticed')}</Text>
              <Text style={styles.patternText}>{weeklyData.patternNoticed}</Text>
            </LinearGradient>
          </View>
        )}
        
        {/* Section Divider */}
        <View style={styles.sectionDivider} />
        
        {/* YOUR WEEK IN FEELINGS Section */}
        <Text style={styles.sectionHeading}>{t('progress.yourWeekInFeelings')}</Text>
        
        {/* Feelings Summary Card */}
        {weeklyData.mostFrequentMood ? (
          <View style={styles.feelingsCard}>
            <View style={styles.feelingRow}>
              <Text style={styles.feelingEmoji}>{weeklyData.mostFrequentMood.emoji}</Text>
              <Text style={styles.feelingLabel}>{weeklyData.mostFrequentMood.text}</Text>
              <Text style={styles.feelingCount}>{weeklyData.mostFrequentMood.count} {t('progress.times')}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.feelingsCard}>
            <Text style={styles.feelingsIntro}>{t('progress.noMoodDataThisWeek')}</Text>
          </View>
        )}
        
        {/* Section Divider */}
        <View style={styles.sectionDivider} />
        
        {/* SMALL WINS THIS WEEK Section */}
        <Text style={styles.sectionHeading}>
          {t('progress.smallWinsThisWeek')} 🎉
        </Text>
        
        {/* Small Wins Card */}
        <ImageBackground 
          source={require('../assets/images/goal.background.png')} 
          style={styles.smallWinsCard} 
          imageStyle={styles.smallWinsCardImage}
          resizeMode="cover"
        >
          {weeklyData.smallWins.map((win, index) => (
            <View key={index}>
              <View style={styles.winField}>
                <View style={styles.winRow}>
                  <Text style={styles.winCheckmark}>✓</Text>
                  <Text style={styles.winText}>{win.replace('✓', '').trim()}</Text>
                </View>
              </View>
              {index < weeklyData.smallWins.length - 1 && (
                <View style={styles.winDivider} />
              )}
            </View>
          ))}
        </ImageBackground>
        
        {/* Section Divider */}
        <View style={styles.sectionDivider} />
        
        {/* LOOKING AHEAD Section */}
        <Text style={styles.sectionHeading}>{t('progress.lookingAhead')}</Text>
        
        {/* Looking Ahead Card */}
        {weeklyData.nextSmallStep ? (
          <View style={styles.lookingAheadCard}>
            <Text style={styles.lookingAheadHeading}>
              💡 {t('progress.yourNextSmallStep')}
            </Text>
            <Text style={styles.nextStepText}>"{weeklyData.nextSmallStep.suggestion}"</Text>
            
            {weeklyData.nextSmallStep.ikigaiConnection && (
              <>
                <View style={styles.ikigaiDivider} />
                <Text style={styles.ikigaiConnectionLabel}>
                  {t('progress.thisConnectsToYourIkigai')}
                </Text>
                <Text style={styles.ikigaiConnection}>
                  {weeklyData.nextSmallStep.ikigaiConnection}
                </Text>
              </>
            )}
          </View>
        ) : weeklyData.currentGoal ? (
          <View style={styles.lookingAheadCard}>
            <Text style={styles.lookingAheadHeading}>
              💡 {t('progress.yourNextSmallStep')}
            </Text>
            <Text style={styles.nextStepText}>
              "{t('progress.spendTimeReflecting')}"
            </Text>
          </View>
        ) : (
          <View style={styles.lookingAheadCard}>
            <Text style={styles.lookingAheadHeading}>
              💡 {t('progress.yourNextSmallStep')}
            </Text>
            <Text style={styles.nextStepText}>
              "{t('progress.explorePathsOrSetGoal')}"
            </Text>
          </View>
        )}
        
        {/* Section Divider */}
        <View style={styles.sectionDivider} />
        
        {/* New Goal Card */}
        <View style={styles.newGoalCard}>
          <Text style={styles.newGoalText}>{t('progress.readyForSomethingNew')}</Text>
          <TouchableOpacity
            style={styles.startNewGoalButton}
            onPress={() => router.push('/new-goal')}
          >
            <Text style={styles.startNewGoalButtonText}>{t('progress.startNewGoal')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Helper Modal */}
      <Modal
        visible={showHelperModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHelperModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHelperModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalIcon}>📊</Text>
            <Text style={styles.modalTitle}>{t('progress.helperModalTitle')}</Text>
            <Text style={styles.modalBody}>{t('progress.helperModalBody')}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowHelperModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>{t('common.gotIt')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      
      {/* Badge Modal (keep existing) */}
      <Modal
        visible={showBadgeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBadgeModal(false)}
      >
        <TouchableOpacity
          style={styles.badgeModalOverlay}
          activeOpacity={1}
          onPress={() => setShowBadgeModal(false)}
        >
          <TouchableOpacity
            style={styles.badgeModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {badgeData && (
              <View style={styles.badgeIconSection}>
                <View style={styles.starTopRight}>
                  <Ionicons name="star" size={24} color="#B89F70" />
                </View>
                <View style={styles.badgeImageWrapper}>
                  <Image
                    source={badgeData.image}
                    style={styles.badgeImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.starBottomLeft}>
                  <Ionicons name="star" size={24} color="#8DB596" />
                </View>
              </View>
            )}
            <View style={styles.newUnlockTag}>
              <Text style={styles.newUnlockText}>{t('progress.newUnlock')}</Text>
            </View>
            {badgeData && (
              <>
                <Text style={styles.badgeTitle}>{badgeData.name}</Text>
                <Text style={styles.badgeDescription}>{badgeData.message}</Text>
              </>
            )}
            <TouchableOpacity
              style={styles.addToProfileButton}
              onPress={handleAddToProfile}
            >
              <Text style={styles.addToProfileText}>
                {t('progress.showItOnMeScreen')}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.arrowIcon} />
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
    position: 'relative',
    paddingTop: 0,
  },
  title: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 8,
  },
  dateRange: {
    ...BodyStyle,
    fontSize: 14,
    color: '#7A8A9A',
    textAlign: 'center',
  },
  helperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 32,
  },
  sectionHeading: {
    textAlign: 'center',
    ...HeadingStyle,
    fontSize: 18,
    color: '#342846',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  // Engagement Card
  engagementCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#5A4A7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 32,
    minHeight: 180,
  },
  engagementCardGradient: {
    padding: 24,
    minHeight: 180,
  },
  engagementContent: {
    alignItems: 'center',
  },
  engagementIcon: {
    width: 40,
    height: 40,
    marginBottom: 8,
    alignSelf: 'center',
  },
  engagementText: {
    ...HeadingStyle,
    fontSize: 20,
    color: '#342846',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  progressBarContainer: {
    width: '100%',
    marginTop: 20,
    marginBottom: 24,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarTrackLevel: {
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBarFillOrange: {
    height: '100%',
    backgroundColor: '#342846',
    borderRadius: 3,
  },
  claimBadgeButton: {
    width: '100%',
    backgroundColor: '#342846',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 32,
    minHeight: 56,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  claimBadgeButtonCelebratory: {
    backgroundColor: '#5A4A7A',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  claimBadgeButtonText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  startFreshText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#7A8A9A',
    textAlign: 'center',
  },
  // Path Progress Card
  pathProgressCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BACCD7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pathIcon: {
    width: 31,
    height: 31,
    marginRight: 8,
  },
  pathName: {
    ...HeadingStyle,
    fontSize: 18,
    color: '#342846',
    fontWeight: 'bold',
  },
  currentGoalLabel: {
    ...BodyStyle,
    fontSize: 14,
    color: '#7A8A9A',
    marginBottom: 4,
  },
  currentGoalName: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    marginBottom: 16,
  },
  levelText: {
    ...HeadingStyle,
    fontSize: 14,
    color: '#342846',
    fontWeight: '600',
    marginBottom: 8,
  },
  stepsCompletedText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#7A8A9A',
    marginTop: 8,
    marginBottom: 16,
  },
  viewGoalMapButton: {
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  viewGoalMapButtonText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    fontWeight: '600',
  },
  noActiveGoalText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#7A8A9A',
    textAlign: 'center',
  },
  // New Goal Card
  newGoalCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#5A4A7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  newGoalText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#7A8A9A',
    marginBottom: 12,
    textAlign: 'center',
  },
  startNewGoalButton: {
    borderWidth: 2,
    borderColor: '#342846',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  startNewGoalButtonText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    fontWeight: '600',
  },
  // Reflections Card
  reflectionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#5A4A7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  reflectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reflectionEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  reflectionIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  reflectionLabel: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    flex: 1,
    textAlign: 'left',
  },
  reflectionCount: {
    ...HeadingStyle,
    fontSize: 16,
    color: '#342846',
    fontWeight: '600',
    textTransform: 'none',
  },
  // Pattern Card
  patternCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#342846',
    shadowColor: '#5A4A7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  patternCardGradient: {
    padding: 20,
  },
  patternHeading: {
    ...HeadingStyle,
    fontSize: 16,
    color: '#342846',
    fontWeight: '600',
    marginBottom: 12,
  },
  patternText: {
    ...BodyStyle,
    fontSize: 15,
    color: '#7A8A9A',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  // Feelings Card
  feelingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#5A4A7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  feelingsIntro: {
    ...BodyStyle,
    fontSize: 14,
    color: '#7A8A9A',
    marginBottom: 16,
  },
  feelingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  feelingEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  feelingLabel: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    flex: 1,
    textAlign: 'center',
  },
  feelingCount: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
  },
  feelingsDivider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 16,
  },
  wordOfWeekLabel: {
    ...BodyStyle,
    fontSize: 14,
    color: '#7A8A9A',
    marginBottom: 8,
  },
  wordOfWeek: {
    ...HeadingStyle,
    fontSize: 20,
    color: '#342846',
    fontWeight: 'bold',
    textTransform: 'none',
  },
  // Small Wins Card
  smallWinsCard: {
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#5A4A7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  smallWinsCardImage: {
    borderRadius: 16,
  },
  winField: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  winRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winCheckmark: {
    fontSize: 18,
    color: '#FFFFFF',
    marginRight: 12,
    marginTop: 2,
  },
  winText: {
    ...BodyStyle,
    fontSize: 15,
    color: '#342846',
    flex: 1,
    textAlign: 'center',
  },
  winDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginVertical: 12,
    marginLeft: 30,
  },
  // Looking Ahead Card
  lookingAheadCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BACCD7',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#5A4A7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  lookingAheadHeading: {
    ...HeadingStyle,
    fontSize: 16,
    color: '#342846',
    fontWeight: '600',
    marginBottom: 12,
  },
  nextStepText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    lineHeight: 24,
    marginBottom: 16,
  },
  ikigaiDivider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 16,
  },
  ikigaiConnectionLabel: {
    ...BodyStyle,
    fontSize: 14,
    color: '#7A8A9A',
    marginBottom: 4,
  },
  ikigaiConnection: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalTitle: {
    ...HeadingStyle,
    fontSize: 20,
    color: '#342846',
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'none',
  },
  modalBody: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalCloseButton: {
    backgroundColor: '#342846',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
  },
  modalCloseButtonText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Badge Modal (keep existing styles)
  badgeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  badgeModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeIconSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
    width: 160,
    height: 160,
  },
  badgeImageWrapper: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  badgeImage: {
    width: '100%',
    height: '100%',
  },
  starTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newUnlockTag: {
    backgroundColor: '#E8EDF2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  newUnlockText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 12,
    fontWeight: '500',
    color: '#6D7581',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#332D41',
    textAlign: 'center',
    marginBottom: 12,
  },
  badgeDescription: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: '#6D7581',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  addToProfileButton: {
    width: '100%',
    backgroundColor: '#342846',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addToProfileText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  arrowIcon: {
    marginLeft: 4,
  },
});
