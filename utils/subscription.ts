import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const SUBSCRIPTION_KEY = '@subscription_status';

export type SubscriptionTier = 'free' | 'premium';

/**
 * Check if the current user has premium access.
 * Checks Supabase first, falls back to AsyncStorage.
 */
export const isPremium = async (): Promise<boolean> => {
  try {
    // Check Supabase first
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tier, trial_active, trial_end_date')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const tierValue = typeof profile.tier === 'string' ? profile.tier.toLowerCase() : '';

        // Premium/trial tiers are treated as active access.
        if (tierValue === 'premium' || tierValue === 'trial') return true;

        // Trial can be represented by a boolean alone or with an end date.
        if (profile.trial_active) {
          if (!profile.trial_end_date) return true;
          const trialEnd = new Date(profile.trial_end_date);
          if (!Number.isNaN(trialEnd.getTime()) && trialEnd > new Date()) return true;
        }
      }
    }

    // Fallback to local storage
    const localStatus = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
    return localStatus === 'premium';
  } catch (error) {
    console.error('Error checking premium status:', error);
    // Fallback to local storage on error
    const localStatus = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
    return localStatus === 'premium';
  }
};

/**
 * Update subscription status both locally and in Supabase.
 */
export const setSubscriptionStatus = async (tier: SubscriptionTier): Promise<void> => {
  try {
    await AsyncStorage.setItem(SUBSCRIPTION_KEY, tier);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/set-subscription-tier`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ tier }),
        }
      );
      if (!response.ok) {
        console.error('Failed to update tier via Edge Function:', await response.text());
      }
    }
  } catch (error) {
    console.error('Error setting subscription status:', error);
  }
};

/**
 * Quick synchronous-like check using cached value.
 * Call loadSubscriptionCache() on app start, then use this for instant checks.
 */
let cachedTier: SubscriptionTier = 'free';

export const loadSubscriptionCache = async (): Promise<void> => {
  const premium = await isPremium();
  cachedTier = premium ? 'premium' : 'free';
};

export const isPremiumCached = (): boolean => {
  return cachedTier === 'premium';
};
