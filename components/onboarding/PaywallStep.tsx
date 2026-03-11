import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { checkSubscriptionStatus, triggerPaywall } from '@/utils/superwall';

interface PaywallStepProps {
  onSubscribe: () => void;
  onContinueFree: (meta?: { shown: boolean }) => void;
  onBack?: (meta?: { shown: boolean }) => void;
}

let onboardingPaywallIsPresenting = false;
let onboardingPaywallPresentedOnce = false;

export default function PaywallStep({ onSubscribe, onContinueFree, onBack }: PaywallStepProps) {
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Opening paywall...');
  const [showFallbackContinue, setShowFallbackContinue] = useState(false);
  const hasAttemptedPresentationRef = useRef(false);
  const isPaywallPresentingRef = useRef(false);
  const onSubscribeRef = useRef(onSubscribe);
  const onContinueFreeRef = useRef(onContinueFree);
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onSubscribeRef.current = onSubscribe;
    onContinueFreeRef.current = onContinueFree;
    onBackRef.current = onBack;
  }, [onSubscribe, onContinueFree, onBack]);

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

        let { purchased, shown, dismissed } = result;
        // If user explicitly dismisses a visible paywall (e.g., back arrow),
        // do not reinterpret that as a purchase based on cached entitlement state.
        // Only entitlement-check when paywall was not shown.
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
          console.error(
            'PAYWALL STILL NOT SHOWN. Check Superwall dashboard placement/audience and API key injection in EAS env.'
          );
        }

        if (cancelled) return;
        if (purchased) {
          onSubscribeRef.current();
        } else if (dismissed || shown) {
          onBackRef.current?.({ shown: true });
        } else {
          onContinueFreeRef.current({ shown });
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
