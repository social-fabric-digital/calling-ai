import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_SESSIONS_KEY = 'appSessions';
const LAST_SESSION_DATE_KEY = 'lastSessionDate';
const LOGIN_EVENTS_KEY = 'loginEvents';
const REFLECTION_EVENTS_KEY = 'reflectionEvents';

export type ReflectionEventType =
  | 'clarity_map_opened'
  | 'weekly_question_answered'
  | 'cosmic_insight_opened'
  | 'focus_sanctuary_opened';

interface ReflectionEvent {
  type: ReflectionEventType;
  timestamp: string; // ISO datetime
}

/**
 * Track an app session (when user opens the app)
 * Stores the date in YYYY-MM-DD format
 */
export async function trackAppSession(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get existing sessions
    const sessionsData = await AsyncStorage.getItem(APP_SESSIONS_KEY);
    const sessions: string[] = sessionsData ? JSON.parse(sessionsData) : [];
    
    // Check if we already tracked today
    const lastSessionDate = await AsyncStorage.getItem(LAST_SESSION_DATE_KEY);
    if (lastSessionDate === today) {
      // Already tracked today, no need to add again
      return;
    }
    
    // Add today's date if not already present
    if (!sessions.includes(today)) {
      sessions.push(today);
      // Keep only last 90 days to prevent storage bloat
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const cutoffDate = ninetyDaysAgo.toISOString().split('T')[0];
      
      const filteredSessions = sessions.filter(date => date >= cutoffDate);
      await AsyncStorage.setItem(APP_SESSIONS_KEY, JSON.stringify(filteredSessions));
    }
    
    // Update last session date
    await AsyncStorage.setItem(LAST_SESSION_DATE_KEY, today);
  } catch (error) {
    console.error('Error tracking app session:', error);
  }
}

/**
 * Track a user login event (successful sign-in/sign-up).
 * Stores full ISO timestamps so we can count multiple logins per week.
 */
export async function trackLoginEvent(): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    const eventsData = await AsyncStorage.getItem(LOGIN_EVENTS_KEY);
    const events: string[] = eventsData ? JSON.parse(eventsData) : [];

    events.push(nowIso);

    // Keep only last 90 days to prevent storage bloat
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffTime = cutoff.getTime();
    const filteredEvents = events.filter((iso) => new Date(iso).getTime() >= cutoffTime);

    await AsyncStorage.setItem(LOGIN_EVENTS_KEY, JSON.stringify(filteredEvents));
  } catch (error) {
    console.error('Error tracking login event:', error);
  }
}

/**
 * Get login count for the current week (Monday to Sunday).
 * Counts every login event, not just unique days.
 */
export async function getLoginCountThisWeek(): Promise<number> {
  try {
    const eventsData = await AsyncStorage.getItem(LOGIN_EVENTS_KEY);
    const events: string[] = eventsData ? JSON.parse(eventsData) : [];

    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekStartTime = monday.getTime();
    const weekEndTime = sunday.getTime();

    const weeklyLoginEvents = events.filter((iso) => {
      const eventTime = new Date(iso).getTime();
      return eventTime >= weekStartTime && eventTime <= weekEndTime;
    });

    // Backward-compatibility fallback:
    // if login events were not tracked yet, use weekly app sessions as a proxy.
    if (weeklyLoginEvents.length === 0) {
      const sessions = await getAppSessions();
      const weekStartStr = monday.toISOString().split('T')[0];
      const weekEndStr = sunday.toISOString().split('T')[0];
      return sessions.filter((date) => date >= weekStartStr && date <= weekEndStr).length;
    }

    return weeklyLoginEvents.length;
  } catch (error) {
    console.error('Error calculating login count this week:', error);
    return 0;
  }
}

export async function trackReflectionEvent(
  type: ReflectionEventType,
  options?: { dedupeByDay?: boolean; minIntervalSeconds?: number }
): Promise<void> {
  try {
    const eventsData = await AsyncStorage.getItem(REFLECTION_EVENTS_KEY);
    const events: ReflectionEvent[] = eventsData ? JSON.parse(eventsData) : [];
    const now = new Date();
    const nowIso = now.toISOString();
    const minIntervalSeconds = options?.minIntervalSeconds ?? 30;

    if (minIntervalSeconds > 0) {
      const latestSameType = [...events]
        .reverse()
        .find((event) => event.type === type);

      if (latestSameType) {
        const secondsSinceLast =
          (now.getTime() - new Date(latestSameType.timestamp).getTime()) / 1000;
        if (secondsSinceLast < minIntervalSeconds) {
          return;
        }
      }
    }

    if (options?.dedupeByDay) {
      const todayKey = nowIso.split('T')[0];
      const alreadyTrackedToday = events.some((event) => {
        if (event.type !== type) return false;
        return event.timestamp.split('T')[0] === todayKey;
      });
      if (alreadyTrackedToday) return;
    }

    events.push({ type, timestamp: nowIso });

    // Keep only last 90 days to prevent storage bloat
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffTs = cutoff.getTime();
    const filteredEvents = events.filter((event) => new Date(event.timestamp).getTime() >= cutoffTs);

    await AsyncStorage.setItem(REFLECTION_EVENTS_KEY, JSON.stringify(filteredEvents));
  } catch (error) {
    console.error('Error tracking reflection event:', error);
  }
}

export async function getReflectionCountsThisWeek(): Promise<{
  clarityMaps: number;
  dailyQuestions: number;
  cosmicInsights: number;
  focusSessions: number;
}> {
  try {
    const eventsData = await AsyncStorage.getItem(REFLECTION_EVENTS_KEY);
    const events: ReflectionEvent[] = eventsData ? JSON.parse(eventsData) : [];

    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekStartTs = monday.getTime();
    const weekEndTs = sunday.getTime();

    const weekEvents = events.filter((event) => {
      const ts = new Date(event.timestamp).getTime();
      return ts >= weekStartTs && ts <= weekEndTs;
    });

    return {
      clarityMaps: weekEvents.filter((e) => e.type === 'clarity_map_opened').length,
      dailyQuestions: weekEvents.filter((e) => e.type === 'weekly_question_answered').length,
      cosmicInsights: weekEvents.filter((e) => e.type === 'cosmic_insight_opened').length,
      focusSessions: weekEvents.filter((e) => e.type === 'focus_sanctuary_opened').length,
    };
  } catch (error) {
    console.error('Error getting reflection counts this week:', error);
    return {
      clarityMaps: 0,
      dailyQuestions: 0,
      cosmicInsights: 0,
      focusSessions: 0,
    };
  }
}

/**
 * Get all app session dates
 */
export async function getAppSessions(): Promise<string[]> {
  try {
    const sessionsData = await AsyncStorage.getItem(APP_SESSIONS_KEY);
    return sessionsData ? JSON.parse(sessionsData) : [];
  } catch (error) {
    console.error('Error getting app sessions:', error);
    return [];
  }
}

/**
 * Get days active for the current week (Monday to Sunday)
 */
export async function getDaysActiveThisWeek(): Promise<number> {
  try {
    const sessions = await getAppSessions();
    
    // Get current week (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to get Monday
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    // Filter sessions within this week
    const weekStartStr = monday.toISOString().split('T')[0];
    const weekEndStr = sunday.toISOString().split('T')[0];
    
    const weekSessions = sessions.filter(date => date >= weekStartStr && date <= weekEndStr);
    
    // Return unique days count
    return new Set(weekSessions).size;
  } catch (error) {
    console.error('Error calculating days active this week:', error);
    return 0;
  }
}

/**
 * Get the date range for the current week (Monday to Sunday)
 */
export function getCurrentWeekDateRange(locale: string = 'en-US'): { start: string; end: string } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  const formatDate = (date: Date): string => {
    const month = date.toLocaleDateString(locale, { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };
  
  return {
    start: formatDate(monday),
    end: formatDate(sunday),
  };
}

/**
 * Get which days of the week are active (for visual display)
 */
export async function getActiveDaysThisWeek(): Promise<boolean[]> {
  try {
    const sessions = await getAppSessions();
    
    // Get current week (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    const weekStartStr = monday.toISOString().split('T')[0];
    const weekEndStr = sunday.toISOString().split('T')[0];
    
    const weekSessions = new Set(
      sessions.filter(date => date >= weekStartStr && date <= weekEndStr)
    );
    
    // Create array for 7 days (Monday to Sunday)
    const activeDays: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(monday);
      checkDate.setDate(monday.getDate() + i);
      const checkDateStr = checkDate.toISOString().split('T')[0];
      activeDays.push(weekSessions.has(checkDateStr));
    }
    
    return activeDays;
  } catch (error) {
    console.error('Error getting active days this week:', error);
    return [false, false, false, false, false, false, false];
  }
}
