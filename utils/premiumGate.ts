import { checkSubscriptionStatus, triggerPaywall } from './superwall';

/**
 * Check if user can access a premium feature.
 * If not subscribed, shows paywall.
 * Returns true if user can proceed (was subscribed or just purchased).
 */
export async function gatePremiumFeature(featureName?: string): Promise<boolean> {
  const isSubscribed = await checkSubscriptionStatus();

  if (isSubscribed) {
    return true;
  }

  // Show paywall
  const { purchased } = await triggerPaywall('feature_locked');
  return purchased;
}
