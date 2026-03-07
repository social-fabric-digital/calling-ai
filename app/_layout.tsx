import { trackAppSession } from '@/utils/appTracking';
import { SubscriptionProvider } from '@/components/SubscriptionProvider';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import 'react-native-reanimated';
import '@/utils/i18n';
import { loadLanguagePreference } from '@/utils/i18n';
import { ensureSuperwallInitialized } from '@/utils/superwall';
import AnimatedSplashScreen from '@/components/AnimatedSplashScreen';

// Preload splash + key background images at app bootstrap.
// This removes background pop-in when navigating between screens.
const PRELOAD_ASSETS = [
  // Splash assets
  require('../assets/images/loading_forest.png'),
  require('../assets/images/cloud.png'),
  require('../assets/images/full.deer.png'),
  // Common backgrounds
  require('../assets/images/noise.background.png'),
  require('../assets/images/welcome.png'),
  require('../assets/images/onboarding.png'),
  require('../assets/images/about.png'),
  require('../assets/images/ikigaion.png'),
  require('../assets/images/calling.png'),
  require('../assets/images/direction.png'),
  require('../assets/images/own.png'),
  require('../assets/images/account.png'),
  require('../assets/images/me.png'),
  require('../assets/images/sanctuary.png'),
  require('../assets/images/active.png'),
  require('../assets/images/yourpath.png'),
  require('../assets/images/goalmap.png'),
  require('../assets/images/level.png'),
  require('../assets/images/level1.png'),
  require('../assets/images/level2.png'),
  require('../assets/images/level3.png'),
  require('../assets/images/level4.png'),
  // Additional frequently visited screens
  require('../assets/images/progress.png'),
  require('../assets/images/moon.star.png'),
  require('../assets/images/clear.png'),
  require('../assets/images/astrology.png'),
] as const;

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
  const [splashDone, setSplashDone] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

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

  // Hide the native splash as soon as fonts are ready; animated overlay takes over
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  // Drive splash progress through real init steps
  useEffect(() => {
    async function prepare() {
      const splashStart = Date.now();

      try {
        setLoadProgress(10);

        // Phase 1: language — minimum 2.5s so cloud is just entering the screen
        await Promise.all([
          loadLanguagePreference(),
          Asset.loadAsync(PRELOAD_ASSETS).catch(() => {}),
          new Promise((r) => setTimeout(r, 2500)),
        ]);
        setLoadProgress(30);

        // Phase 2: session tracking — another 2.5s, cloud mid-screen
        await Promise.all([
          trackAppSession(),
          new Promise((r) => setTimeout(r, 2500)),
        ]);
        setLoadProgress(50);

        // Phase 3: hold timing (Superwall initializes lazily on demand).
        // Avoid eager network requests at app boot, which can throw
        // intermittent "Network request failed" errors on unstable connections.
        await Promise.all([
          new Promise((r) => setTimeout(r, 1500)),
        ]);
        setLoadProgress(85); // Atlas appears here (~6.5s in, cloud on 2nd pass)

        // Hold on Atlas for at least 2.5s so it's clearly visible
        const elapsed = Date.now() - splashStart;
        const remaining = Math.max(9500 - elapsed, 2500);
        await new Promise((r) => setTimeout(r, remaining));

        setLoadProgress(100);
      } catch (error) {
        console.warn('Error during app preparation:', error);
        setLoadProgress(100);
      }
    }

    if (fontsLoaded) {
      prepare();
    }
  }, [fontsLoaded]);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <ThemeProvider value={DefaultTheme}>
        <SubscriptionProvider>
          <Stack screenOptions={screenOptions}>
            <Stack.Screen name="landing" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="account" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="dark" />
        </SubscriptionProvider>
      </ThemeProvider>

      {!splashDone && (
        <AnimatedSplashScreen
          progress={loadProgress}
          onFinish={handleSplashFinish}
        />
      )}
    </View>
  );
}
