import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Daily Message Limits ──
const FREE_DAILY_LIMIT = 10;
const PREMIUM_DAILY_LIMIT = 50;

const MESSAGE_COUNT_KEY = 'atlas_daily_message_count';
const MESSAGE_DATE_KEY = 'atlas_daily_message_date';

/**
 * Get today's date string (YYYY-MM-DD) for comparison
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if user can send another message today.
 * Returns { allowed: boolean, remaining: number, limit: number }
 */
export async function checkMessageLimit(isPremium: boolean): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const today = getTodayString();

  const storedDate = await AsyncStorage.getItem(MESSAGE_DATE_KEY);
  let count = 0;

  if (storedDate === today) {
    const storedCount = await AsyncStorage.getItem(MESSAGE_COUNT_KEY);
    count = storedCount ? parseInt(storedCount, 10) : 0;
  }
  // If it's a new day, count resets to 0 automatically

  return {
    allowed: count < limit,
    remaining: Math.max(0, limit - count),
    limit,
  };
}

/**
 * Increment the daily message count. Call this AFTER a successful API response.
 */
export async function incrementMessageCount(): Promise<void> {
  const today = getTodayString();
  const storedDate = await AsyncStorage.getItem(MESSAGE_DATE_KEY);

  let count = 0;
  if (storedDate === today) {
    const storedCount = await AsyncStorage.getItem(MESSAGE_COUNT_KEY);
    count = storedCount ? parseInt(storedCount, 10) : 0;
  }

  await AsyncStorage.setItem(MESSAGE_DATE_KEY, today);
  await AsyncStorage.setItem(MESSAGE_COUNT_KEY, String(count + 1));
}

/**
 * Get current usage stats for display (e.g. "7/50 messages today")
 */
export async function getMessageUsage(isPremium: boolean): Promise<{
  used: number;
  limit: number;
}> {
  const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const today = getTodayString();
  const storedDate = await AsyncStorage.getItem(MESSAGE_DATE_KEY);

  if (storedDate !== today) {
    return { used: 0, limit };
  }

  const storedCount = await AsyncStorage.getItem(MESSAGE_COUNT_KEY);
  return {
    used: storedCount ? parseInt(storedCount, 10) : 0,
    limit,
  };
}
