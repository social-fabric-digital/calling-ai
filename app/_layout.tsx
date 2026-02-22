import { trackAppSession } from '@/utils/appTracking';
import { SubscriptionProvider } from '@/components/SubscriptionProvider';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import '@/utils/i18n';
import { loadLanguagePreference } from '@/utils/i18n';
import { syncNotificationScheduleWithPreferences } from '@/utils/notifications';
import { ensureSuperwallInitialized } from '@/utils/superwall';

// Keep the splash screen visible while we fetch resources
let splashScreenPrevented = false;
const preventSplashAutoHide = async () => {
  if (!splashScreenPrevented) {
    try {
      await SplashScreen.preventAutoHideAsync();
      splashScreenPrevented = true;
    } catch (error) {
      // Ignore errors - splash screen might not be available in all environments
    }
  }
};
preventSplashAutoHide().catch(() => {});

// Move screenOptions outside component to prevent re-renders
const screenOptions = {
  headerShown: false,
  gestureEnabled: false,
};

export default function RootLayout() {
  const [languageLoaded, setLanguageLoaded] = useState(false);
  const splashHiddenRef = useRef(false);
  
  // Initialize Superwall
  useEffect(() => {
    const initSuperwall = async () => {
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        return;
      }
      try {
        const initialized = await ensureSuperwallInitialized();
        if (initialized) {
          console.log('Superwall initialized successfully');
        } else {
          console.log('Superwall initialization skipped');
        }
      } catch (error) {
        console.log('Superwall init error (expected in Expo Go):', error);
      }
    };
    initSuperwall();
  }, []);
  
  // Load saved language preference on app start
  useEffect(() => {
    trackAppSession().catch(error => {
      console.error('Error tracking app session:', error);
    });

    syncNotificationScheduleWithPreferences().catch((error) => {
      console.error('Error syncing notification schedule:', error);
    });
    
    const initLanguage = async () => {
      try {
        await loadLanguagePreference();
        setLanguageLoaded(true);
      } catch (error) {
        console.error('Error loading language preference:', error);
        setLanguageLoaded(true);
      }
    };
    initLanguage();
  }, []);
  
  const [fontsLoaded] = useFonts({
    'AnonymousPro-Regular': require('../assets/fonts/AnonymousPro-Regular.ttf'),
    'AnonymousPro-Bold': require('../assets/fonts/AnonymousPro-Bold.ttf'),
    'AnonymousPro-Italic': require('../assets/fonts/AnonymousPro-Italic.ttf'),
    'AnonymousPro-BoldItalic': require('../assets/fonts/AnonymousPro-BoldItalic.ttf'),
    'BricolageGrotesque-Regular': require('../assets/fonts/BricolageGrotesque-Regular.ttf'),
    'BricolageGrotesque-Bold': require('../assets/fonts/BricolageGrotesque-Bold.ttf'),
    'BricolageGrotesque-Medium': require('../assets/fonts/BricolageGrotesque-Medium.ttf'),
    'BricolageGrotesque-SemiBold': require('../assets/fonts/BricolageGrotesque-SemiBold.ttf'),
    'BricolageGrotesque-Light': require('../assets/fonts/BricolageGrotesque-Light.ttf'),
    'BricolageGrotesque-ExtraLight': require('../assets/fonts/BricolageGrotesque-ExtraLight.ttf'),
    'BricolageGrotesque-ExtraBold': require('../assets/fonts/BricolageGrotesque-ExtraBold.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
    'Montserrat-VariableFont_wght': require('../assets/fonts/Montserrat-VariableFont_wght.ttf'),
    'Montserrat-Italic-VariableFont_wght': require('../assets/fonts/Montserrat-Italic-VariableFont_wght.ttf'),
  });

  useEffect(() => {
    const hideSplash = async () => {
      if (fontsLoaded && languageLoaded && !splashHiddenRef.current) {
        splashHiddenRef.current = true;
        
        try {
          if (!splashScreenPrevented) {
            await preventSplashAutoHide();
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
          await SplashScreen.hideAsync();
        } catch (error: any) {
          const errorMessage = error?.message || String(error || '');
          if (errorMessage.includes('No native splash screen registered')) {
            return;
          }
        }
      }
    };
    
    hideSplash().catch(() => {});
  }, [fontsLoaded, languageLoaded]);

  if (!fontsLoaded || !languageLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <SubscriptionProvider>
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="landing" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="account" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="edit-birth-data" />
          <Stack.Screen name="privacy-policy" />
          <Stack.Screen name="ai-goal-picker" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="dark" />
      </SubscriptionProvider>
    </ThemeProvider>
  );
}