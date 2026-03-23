import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { checkSubscriptionStatus, triggerPaywall } from '@/utils/superwall';

interface PaywallStepProps {
  onSubscribe: () => void;
  onContinueFree: (meta?: { shown: boolean }) => void;
}

let onboardingPaywallIsPresenting = false;
let onboardingPaywallPresentedOnce = false;

export default function PaywallStep({ onSubscribe, onContinueFree }: PaywallStepProps) {
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Opening paywall...');
  const [showFallbackContinue, setShowFallbackContinue] = useState(false);
  const hasAttemptedPresentationRef = useRef(false);
  const isPaywallPresentingRef = useRef(false);
  const onSubscribeRef = useRef(onSubscribe);
  const onContinueFreeRef = useRef(onContinueFree);

  useEffect(() => {
    onSubscribeRef.current = onSubscribe;
    onContinueFreeRef.current = onContinueFree;
  }, [onSubscribe, onContinueFree]);

  useEffect(() => {
    let cancelled = false;
    if (onboardingPaywallIsPresenting) {
      return () => {};
    }
    if (onboardingPaywallPresentedOnce) {
      onContinueFreeRef.current({ shown: false });
      return () => {};
    }
    if (hasAttemptedPresentationRef.current || isPaywallPresentingRef.current) {
      return () => {};
    }
    hasAttemptedPresentationRef.current = true;
    isPaywallPresentingRef.current = true;
    onboardingPaywallIsPresenting = true;
    onboardingPaywallPresentedOnce = true;

    const triggerWithTimeout = async (placement: string, timeoutMs = 120000) => {
      const timeoutResult = { shown: false, purchased: false, timedOut: true };
      const paywallPromise = triggerPaywall(placement).then((result) => ({ ...result, timedOut: false }));
      const timeoutPromise = new Promise<typeof timeoutResult>((resolve) =>
        setTimeout(() => resolve(timeoutResult), timeoutMs)
      );
      return Promise.race([paywallPromise, timeoutPromise]);
    };

    const fallbackTimer = setTimeout(() => {
      if (!cancelled && loading && __DEV__) {
        setShowFallbackContinue(true);
      }
    }, 12000);

    const showPaywall = async () => {
      try {
        // This opens the Superwall paywall and waits until user purchases or dismisses.
        let result = await triggerWithTimeout('onboarding_paywall');

        // Some builds can race against native startup; retry once.
        if (!result.shown && !result.purchased) {
          setStatusText('Retrying paywall...');
          await new Promise((resolve) => setTimeout(resolve, 500));
          result = await triggerWithTimeout('onboarding_paywall');
        }

        let { purchased, shown } = result;
        // If paywall was not shown, allow entitlement check (restore / prior subscription).
        // If user dismissed a visible paywall (X, etc.), do not treat cached state as purchase.
        if (!purchased && !shown) {
          const activeSubscription = await checkSubscriptionStatus();
          if (activeSubscription) {
            purchased = true;
          }
        }

        if (!cancelled) {
          setLoading(false);
          setShowFallbackContinue(false);
        }

        if (!shown && !purchased) {
          // Not always a bug: placement rules can intentionally skip paywall.
          // Keep this as a warning so production logs are less noisy.
          console.warn(
            'Paywall not shown for onboarding_paywall placement. Continuing free flow.'
          );
        }

        if (cancelled) return;
        if (purchased) {
          onSubscribeRef.current();
        } else {
          // Any non-purchase exit (X, Android back, skipped paywall): continue as free user → Create Account.
          onContinueFreeRef.current({ shown: !!shown });
        }
      } catch (error) {
        console.error('PaywallStep failed, continuing free flow:', error);
        if (!cancelled) {
          setLoading(false);
          setShowFallbackContinue(false);
          onContinueFreeRef.current({ shown: false });
        }
      } finally {
        isPaywallPresentingRef.current = false;
        onboardingPaywallIsPresenting = false;
      }
    };

    void showPaywall();
    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.statusText}>{statusText}</Text>
      {showFallbackContinue && (
        <TouchableOpacity
          style={styles.fallbackButton}
          onPress={() => {
            setLoading(false);
            setShowFallbackContinue(false);
            onContinueFree({ shown: false });
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.fallbackButtonText}>Continue</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statusText: {
    marginTop: 12,
    color: '#342846',
    fontSize: 14,
  },
  fallbackButton: {
    marginTop: 16,
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
