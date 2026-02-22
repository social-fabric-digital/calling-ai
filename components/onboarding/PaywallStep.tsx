import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { triggerPaywall } from '@/utils/superwall';

interface PaywallStepProps {
  onSubscribe: () => void;
  onContinueFree: (meta?: { shown: boolean }) => void;
}

export default function PaywallStep({ onSubscribe, onContinueFree }: PaywallStepProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const showPaywall = async () => {
      // This opens the Superwall paywall
      // It waits until user either purchases or dismisses
      let result = await triggerPaywall('onboarding_paywall');

      // Some TestFlight builds can race against native startup; retry once.
      if (!result.shown && !result.purchased) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        result = await triggerPaywall('onboarding_paywall');
      }

      const { purchased, shown } = result;
      if (!shown && !purchased) {
        console.error(
          'PAYWALL STILL NOT SHOWN. Check Superwall dashboard placement/audience and API key injection in EAS env.'
        );
      }
      
      setLoading(false);
      
      // Only treat as subscribe flow if the paywall was actually shown.
      // This prevents skipping straight to account creation on ambiguous entitlement states.
      if (purchased && shown) {
        onSubscribe();
      } else {
        onContinueFree({ shown });
      }
    };

    showPaywall();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
