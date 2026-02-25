import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const INSTALL_DATE_KEY = '@app_install_date';
const LAST_REVIEW_PROMPT_AT_KEY = '@last_store_review_prompt_at';
const DAILY_INSIGHT_VIEW_COUNT_KEY = '@daily_insight_view_count';

const MIN_DAYS_AFTER_INSTALL = 3;
const PROMPT_COOLDOWN_DAYS = 30;
const LONG_FOCUS_SESSION_SECONDS = 30 * 60;
const DAILY_INSIGHT_PROMPT_THRESHOLD = 3;

function daysBetween(fromIso: string, to: Date): number {
  const fromDate = new Date(fromIso);
  if (Number.isNaN(fromDate.getTime())) return Number.POSITIVE_INFINITY;
  const diffMs = to.getTime() - fromDate.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

async function getInstallDateIso(): Promise<string> {
  const existing = await AsyncStorage.getItem(INSTALL_DATE_KEY);
  if (existing) return existing;

  const nowIso = new Date().toISOString();
  await AsyncStorage.setItem(INSTALL_DATE_KEY, nowIso);
  return nowIso;
}

export async function initializeStoreReviewInstallDate(): Promise<void> {
  try {
    await getInstallDateIso();
  } catch {
    // no-op
  }
}

async function isEligibleByInstallAge(now: Date): Promise<boolean> {
  const installDateIso = await getInstallDateIso();
  return daysBetween(installDateIso, now) >= MIN_DAYS_AFTER_INSTALL;
}

async function isEligibleByCooldown(now: Date): Promise<boolean> {
  const lastPromptIso = await AsyncStorage.getItem(LAST_REVIEW_PROMPT_AT_KEY);
  if (!lastPromptIso) return true;
  return daysBetween(lastPromptIso, now) >= PROMPT_COOLDOWN_DAYS;
}

async function canShowReviewPromptNow(): Promise<boolean> {
  const now = new Date();
  const [installEligible, cooldownEligible, reviewAvailable] = await Promise.all([
    isEligibleByInstallAge(now),
    isEligibleByCooldown(now),
    StoreReview.isAvailableAsync(),
  ]);

  return installEligible && cooldownEligible && reviewAvailable;
}

async function requestReviewIfEligible(): Promise<boolean> {
  const eligible = await canShowReviewPromptNow();
  if (!eligible) return false;

  await StoreReview.requestReview();
  await AsyncStorage.setItem(LAST_REVIEW_PROMPT_AT_KEY, new Date().toISOString());
  return true;
}

export async function maybePromptForGoalCompletionReview(): Promise<boolean> {
  try {
    return await requestReviewIfEligible();
  } catch {
    return false;
  }
}

export async function maybePromptForLongFocusSessionReview(completedSeconds: number): Promise<boolean> {
  if (completedSeconds < LONG_FOCUS_SESSION_SECONDS) return false;

  try {
    return await requestReviewIfEligible();
  } catch {
    return false;
  }
}

export async function trackDailyInsightViewAndMaybePromptReview(): Promise<boolean> {
  try {
    const currentCountRaw = await AsyncStorage.getItem(DAILY_INSIGHT_VIEW_COUNT_KEY);
    const currentCount = Number.parseInt(currentCountRaw ?? '0', 10);
    const nextCount = Number.isNaN(currentCount) ? 1 : currentCount + 1;
    await AsyncStorage.setItem(DAILY_INSIGHT_VIEW_COUNT_KEY, String(nextCount));

    if (nextCount !== DAILY_INSIGHT_PROMPT_THRESHOLD) return false;
    return await requestReviewIfEligible();
  } catch {
    return false;
  }
}
