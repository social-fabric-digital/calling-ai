import { trackAppSession } from '@/utils/appTracking';
import { SubscriptionProvider } from '@/components/SubscriptionProvider';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import 'react-native-reanimated';
import '@/utils/i18n';
import { loadLanguagePreference } from '@/utils/i18n';
import { ensureSuperwallInitialized } from '@/utils/superwall';
import AnimatedSplashScreen from '@/components/AnimatedSplashScreen';

// On iPad the app renders as a centered column. 74% of screen width feels natural
// on iPad Air 11-inch (820pt → ~607px) without stretching phone layouts.
const IPAD_CONTENT_RATIO = 0.74;

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

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#1f1a2a',
  },
  innerContainer: {
    flex: 1,
    width: '100%',
  },
});

export const unstable_settings = {
  initialRouteName: 'landing',
};

export default function RootLayout() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  // Only constrain width on actual tablets. On all iPhones the content fills
  // the full screen with no side gutters.
  const isTablet = Platform.isPad || (Platform.OS === 'android' && width >= 768);
  // 74% of iPad width — on iPad Air 11-inch (820pt) this gives ~607px, leaving
  // comfortable gutters without looking like a shrunken phone.
  const maxContentWidth = isTablet ? Math.round(width * IPAD_CONTENT_RATIO) : undefined;
  const lastHandledRecoveryUrlRef = useRef<string | null>(null);
  const [splashDone, setSplashDone] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const [fontsLoaded] = useFonts({
    'AnonymousPro-Regular': require('../assets/fonts/AnonymousPro-Regular.ttf'),
    'AnonymousPro-Bold': require('../assets/fonts/AnonymousPro-Bold.ttf'),
    'AnonymousPro-Italic': require('../assets/fonts/AnonymousPro-Italic.ttf'),
    'AnonymousPro-BoldItalic': require('../assets/fonts/AnonymousPro-BoldItalic.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    DMSans_700Bold,
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

        // Phase 1: language — slightly shorter to speed up perceived startup
        await Promise.all([
          loadLanguagePreference(),
          Asset.loadAsync(PRELOAD_ASSETS).catch(() => {}),
          new Promise((r) => setTimeout(r, 1800)),
        ]);
        setLoadProgress(30);

        // Phase 2: session tracking — slightly shorter hold
        await Promise.all([
          trackAppSession(),
          new Promise((r) => setTimeout(r, 1800)),
        ]);
        setLoadProgress(50);

        // Phase 3: hold timing (Superwall initializes lazily on demand).
        // Avoid eager network requests at app boot, which can throw
        // intermittent "Network request failed" errors on unstable connections.
        await Promise.all([
          new Promise((r) => setTimeout(r, 1000)),
        ]);
        setLoadProgress(85); // Atlas appears here (~6.5s in, cloud on 2nd pass)

        // Keep Atlas visible while reducing total splash duration
        const elapsed = Date.now() - splashStart;
        const remaining = Math.max(7800 - elapsed, 1800);
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

  useEffect(() => {
    const extractAuthParams = (url: string | null) => {
      if (!url) return null;
      const parsed = Linking.parse(url);
      const normalizedPath = (parsed.path || '').replace(/^\/+/, '').replace(/^--\//, '');
      const isResetPasswordPath = normalizedPath === 'reset-password' || normalizedPath.endsWith('/reset-password');
      if (!isResetPasswordPath) return null;

      const extractParts = (candidate: string) => {
        const queryPart = candidate.includes('?')
          ? candidate.split('?')[1]?.split('#')[0] || ''
          : '';
        const hashPart = candidate.includes('#') ? candidate.split('#')[1] : '';
        return { queryPart, hashPart };
      };

      const rawParts = extractParts(url);
      const decodedUrl = decodeURIComponent(url);
      const decodedParts = decodedUrl === url ? rawParts : extractParts(decodedUrl);
      const queryParams = new URLSearchParams([rawParts.queryPart, decodedParts.queryPart].filter(Boolean).join('&'));
      const fragmentParams = new URLSearchParams([rawParts.hashPart, decodedParts.hashPart].filter(Boolean).join('&'));
      const pick = (key: string) => fragmentParams.get(key) || queryParams.get(key) || '';

      const params = {
        access_token: pick('access_token'),
        refresh_token: pick('refresh_token'),
        type: pick('type'),
        code: pick('code'),
        token_hash: pick('token_hash'),
        token: pick('token') || pick('otp'),
      };

      const hasRecoveryMarkers = Boolean(
        params.access_token ||
          params.refresh_token ||
          params.code ||
          params.token_hash ||
          params.token ||
          params.type === 'recovery'
      );

      return hasRecoveryMarkers ? params : null;
    };

    const routeToResetPasswordIfNeeded = (url: string | null) => {
      if (!url) return;
      if (lastHandledRecoveryUrlRef.current === url) return;
      const recoveryParams = extractAuthParams(url);
      if (!recoveryParams) return;
      lastHandledRecoveryUrlRef.current = url;

      router.replace({
        pathname: '/reset-password',
        params: recoveryParams,
      });
    };

    Linking.getInitialURL()
      .then((url) => {
        routeToResetPasswordIfNeeded(url);
      })
      .catch(() => {});

    const subscription = Linking.addEventListener('url', ({ url }) => {
      routeToResetPasswordIfNeeded(url);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  // Always render the Stack on first render so the navigator is mounted.
  // Expo Router requires a Slot/navigator on first render; returning null causes
  // "Attempted to navigate before mounting the Root Layout" when navigating from onboarding.
  const navigator = (
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
        {fontsLoaded && <StatusBar style="dark" />}
      </SubscriptionProvider>
    </ThemeProvider>
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.innerContainer}>
          {navigator}
        </View>
        <AnimatedSplashScreen progress={0} onFinish={() => {}} />
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.innerContainer}>
        {navigator}
      </View>
      {!splashDone && (
        <AnimatedSplashScreen
          progress={loadProgress}
          onFinish={handleSplashFinish}
        />
      )}
    </View>
  );
}
