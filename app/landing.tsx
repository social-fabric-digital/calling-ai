import WelcomeScreen from '@/components/WelcomeScreen';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

export default function LandingScreen() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // If user already has a valid session, skip welcome and go straight to the app.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(tabs)');
      } else {
        setChecked(true);
      }
    }).catch(() => {
      setChecked(true);
    });
  }, []);

  // Render nothing while we check the session to avoid a Welcome screen flash.
  if (!checked) return <View style={{ flex: 1 }} />;

  return <WelcomeScreen />;
}
