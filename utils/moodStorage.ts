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

export interface WeeklyMoodSummary {
  emoji: string;
  label: string;
  count: number;
}

// Get the date key in YYYY-MM-DD format
export const getDateKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    
    // Save to Supabase
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Supabase mood save - user:', user?.id);
      if (user) {
        const localDayStart = new Date();
        localDayStart.setHours(0, 0, 0, 0);
        const nextLocalDayStart = new Date(localDayStart);
        nextLocalDayStart.setDate(nextLocalDayStart.getDate() + 1);
        const { data: existing, error: selectError } = await supabase
          .from('mood_entries')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', localDayStart.toISOString())
          .lt('created_at', nextLocalDayStart.toISOString())
          .maybeSingle();
        
        console.log('Supabase mood select result:', { existing, selectError });
        
        if (existing) {
          const { error: updateError } = await supabase.from('mood_entries').update({
            value: value,
          }).eq('id', existing.id);
          console.log('Supabase mood update result:', { updateError });
        } else {
          const { data: insertData, error: insertError } = await supabase.from('mood_entries').insert({
            user_id: user.id,
            value: value,
          });
          console.log('Supabase mood insert result:', { insertData, insertError });
        }
      }
    } catch (err) {
      console.error('Supabase mood save error:', err);
    }
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
export const getWeekLabel = (weekStartDate: Date, locale: string = 'en-US'): string => {
  const today = new Date();
  const thisWeekStart = getWeekStart(today);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  
  const weekStartTime = weekStartDate.getTime();
  
  if (weekStartTime === thisWeekStart.getTime()) {
    return locale === 'ru-RU' ? 'Эта неделя' : 'This Week';
  } else if (weekStartTime === lastWeekStart.getTime()) {
    return locale === 'ru-RU' ? 'Прошлая неделя' : 'Last Week';
  } else {
    // Show date range for older weeks
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const startMonth = weekStartDate.toLocaleDateString(locale, { month: 'short' });
    const startDay = weekStartDate.getDate();
    const endMonth = weekEnd.toLocaleDateString(locale, { month: 'short' });
    const endDay = weekEnd.getDate();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    }
  }
};

// Get day names for a week
export const getDayNames = (locale: string = 'en-US'): string[] => {
  if (locale === 'ru-RU') {
    return ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  }

  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
};

// Check if a date is today
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return getDateKey(date) === getDateKey(today);
};

// Get today's mood (convenience function)
export const getTodaysMood = async (): Promise<MoodEntry | null> => {
  const today = new Date();
  const mood = await getMoodForDate(today);
  if (!mood) return null;

  // Guard against legacy UTC-keyed entries being shown on the wrong local day.
  if (mood.timestamp) {
    const moodLocalDateKey = getDateKey(new Date(mood.timestamp));
    if (moodLocalDateKey !== getDateKey(today)) {
      return null;
    }
  }

  return mood;
};

const getMoodBucket = (value: number): number => {
  if (value < 20) return 0;
  if (value < 40) return 1;
  if (value < 60) return 2;
  if (value < 80) return 3;
  return 4;
};

const getMoodEmojiByBucket = (bucket: number): string => {
  switch (bucket) {
    case 0:
      return '🌧';
    case 1:
      return '🥀';
    case 2:
      return '🌱';
    case 3:
      return '🌳';
    default:
      return '🌟';
  }
};

const getMoodLabelByBucket = (bucket: number, locale: string = 'en-US'): string => {
  const isRu = locale === 'ru-RU' || locale.startsWith('ru');
  if (isRu) {
    switch (bucket) {
      case 0:
        return 'Тяжело';
      case 1:
        return 'Не очень';
      case 2:
        return 'Нормально';
      case 3:
        return 'Хорошо';
      default:
        return 'Отлично!';
    }
  }

  switch (bucket) {
    case 0:
      return 'Very hard';
    case 1:
      return 'Not great';
    case 2:
      return 'Okay';
    case 3:
      return 'Good';
    default:
      return 'Great!';
  }
};

/**
 * Get the most frequent mood for current week (Monday-Sunday),
 * based on the mood selected/saved for each day.
 */
export const getMostFrequentMoodThisWeek = async (locale: string = 'en-US'): Promise<WeeklyMoodSummary | null> => {
  try {
    const history = await getMoodHistory();
    const monday = getWeekStart(new Date());

    const weeklyEntries: MoodEntry[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateKey = getDateKey(date);
      const mood = history[dateKey];
      if (mood) {
        weeklyEntries.push(mood);
      }
    }

    if (weeklyEntries.length === 0) {
      return null;
    }

    const bucketStats = new Map<number, { count: number; latestTs: number }>();

    for (const entry of weeklyEntries) {
      const bucket = getMoodBucket(entry.value);
      const ts = new Date(entry.timestamp).getTime();
      const existing = bucketStats.get(bucket);
      if (existing) {
        bucketStats.set(bucket, {
          count: existing.count + 1,
          latestTs: Math.max(existing.latestTs, ts),
        });
      } else {
        bucketStats.set(bucket, { count: 1, latestTs: ts });
      }
    }

    let selectedBucket = 2;
    let selectedCount = 0;
    let selectedLatestTs = 0;

    for (const [bucket, stats] of bucketStats.entries()) {
      if (
        stats.count > selectedCount ||
        (stats.count === selectedCount && stats.latestTs > selectedLatestTs)
      ) {
        selectedBucket = bucket;
        selectedCount = stats.count;
        selectedLatestTs = stats.latestTs;
      }
    }

    return {
      emoji: getMoodEmojiByBucket(selectedBucket),
      label: getMoodLabelByBucket(selectedBucket, locale),
      count: selectedCount,
    };
  } catch (error) {
    console.error('Error getting most frequent mood this week:', error);
    return null;
  }
};
