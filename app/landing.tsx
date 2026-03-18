import WelcomeScreen from '@/components/WelcomeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect } from 'react';

const DEV_ONBOARDING_STEP_KEY = '@dev_onboarding_step';

export default function LandingScreen() {
  // Clear persisted dev onboarding step when landing mounts so a full app reload
  // starts onboarding from step 0 instead of jumping to a previously saved step.
  useEffect(() => {
    if (__DEV__) {
      AsyncStorage.removeItem(DEV_ONBOARDING_STEP_KEY).catch(() => {});
    }
  }, []);

  return <WelcomeScreen />;
}
