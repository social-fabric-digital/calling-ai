import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const ONBOARDING_RESPONSES_KEY = 'onboardingResponses';
const PROFILE_RESPONSE_COLUMNS = [
  'onboarding_answers',
  'onboarding_data',
  'metadata',
  'profile_data',
  'preferences',
] as const;

type OnboardingAnswerValue = string | string[] | boolean;

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export async function loadOnboardingAnswer<T extends OnboardingAnswerValue>(
  key: string
): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_RESPONSES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    return (parsed[key] as T) ?? null;
  } catch {
    return null;
  }
}

export async function persistOnboardingAnswer(
  key: string,
  value: OnboardingAnswerValue
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_RESPONSES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const merged = isRecord(parsed) ? { ...parsed, [key]: value } : { [key]: value };
    await AsyncStorage.setItem(ONBOARDING_RESPONSES_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error('Failed to persist onboarding answer locally:', error);
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !isRecord(profile)) return;

    const targetColumn = PROFILE_RESPONSE_COLUMNS.find((column) =>
      Object.prototype.hasOwnProperty.call(profile, column)
    );

    if (!targetColumn) return;

    const existingPayload = isRecord(profile[targetColumn]) ? profile[targetColumn] : {};
    const updatedPayload = { ...existingPayload, [key]: value };

    await supabase
      .from('profiles')
      .update({ [targetColumn]: updatedPayload } as any)
      .eq('id', user.id);
  } catch (error) {
    console.error('Failed to persist onboarding answer to profile:', error);
  }
}
