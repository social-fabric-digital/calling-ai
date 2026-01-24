import AsyncStorage from '@react-native-async-storage/async-storage';

const MOOD_STORAGE_KEY = 'mood_history';

export interface MoodEntry {
  date: string; // ISO date string (YYYY-MM-DD)
  emoji: string;
  text: string;
  value: number;
  timestamp: string; // Full ISO timestamp
}

export interface MoodHistory {
  [date: string]: MoodEntry;
}

// Get the date key in YYYY-MM-DD format
export const getDateKey = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

// Save a mood entry for today
export const saveMood = async (emoji: string, text: string, value: number): Promise<void> => {
  try {
    const history = await getMoodHistory();
    const dateKey = getDateKey();
    
    history[dateKey] = {
      date: dateKey,
      emoji,
      text,
      value,
      timestamp: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving mood:', error);
  }
};

// Get all mood history
export const getMoodHistory = async (): Promise<MoodHistory> => {
  try {
    const data = await AsyncStorage.getItem(MOOD_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error loading mood history:', error);
    return {};
  }
};

// Get mood for a specific date
export const getMoodForDate = async (date: Date): Promise<MoodEntry | null> => {
  try {
    const history = await getMoodHistory();
    const dateKey = getDateKey(date);
    return history[dateKey] || null;
  } catch (error) {
    console.error('Error getting mood for date:', error);
    return null;
  }
};

// Get moods for a week (returns array of 7 days)
export const getMoodsForWeek = async (weekStartDate: Date): Promise<(MoodEntry | null)[]> => {
  try {
    const history = await getMoodHistory();
    const moods: (MoodEntry | null)[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + i);
      const dateKey = getDateKey(date);
      moods.push(history[dateKey] || null);
    }
    
    return moods;
  } catch (error) {
    console.error('Error getting moods for week:', error);
    return Array(7).fill(null);
  }
};

// Get the start of a week (Monday)
export const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Get week label (e.g., "This Week", "Last Week", or date range)
export const getWeekLabel = (weekStartDate: Date): string => {
  const today = new Date();
  const thisWeekStart = getWeekStart(today);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  
  const weekStartTime = weekStartDate.getTime();
  
  if (weekStartTime === thisWeekStart.getTime()) {
    return 'This Week';
  } else if (weekStartTime === lastWeekStart.getTime()) {
    return 'Last Week';
  } else {
    // Show date range for older weeks
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const startMonth = weekStartDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = weekStartDate.getDate();
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const endDay = weekEnd.getDate();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    }
  }
};

// Get day names for a week
export const getDayNames = (): string[] => {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
};

// Check if a date is today
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return getDateKey(date) === getDateKey(today);
};

// Get today's mood (convenience function)
export const getTodaysMood = async (): Promise<MoodEntry | null> => {
  return getMoodForDate(new Date());
};
