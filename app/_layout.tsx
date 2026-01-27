import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

// import { useColorScheme } from '@/hooks/use-color-scheme'; // Temporarily disabled to fix re-render issue
// Temporarily disable i18n to test if it's causing re-render issues
// import { loadLanguagePreference } from '@/utils/i18n';
// import '@/utils/i18n'; // Initialize i18n

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Move screenOptions outside component to prevent re-renders
const screenOptions = {
  headerShown: false,
  gestureEnabled: false,
};

export default function RootLayout() {
  const [languageLoaded, setLanguageLoaded] = useState(false);
  const splashHiddenRef = useRef(false);
  
  // Load saved language preference on app start BEFORE rendering screens
  // Temporarily disabled to test re-render issue
  useEffect(() => {
    // const initLanguage = async () => {
    //   try {
    //     await loadLanguagePreference();
    //     setLanguageLoaded(true);
    //   } catch (error) {
    //     console.error('Error loading language preference:', error);
    //     setLanguageLoaded(true); // Still allow app to render even if language load fails
    //   }
    // };
    // initLanguage();
    setLanguageLoaded(true); // Set immediately for testing
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
          await SplashScreen.hideAsync();
        } catch (error) {
          // Ignore error if splash screen is already hidden
          console.log('Splash screen already hidden or not available');
        }
      }
    };
    hideSplash();
  }, [fontsLoaded, languageLoaded]);

  if (!fontsLoaded || !languageLoaded) {
    return null;
  }

  // Superwall is a native module - not available in Expo Go, so we skip it
  // In development builds, you would wrap this with <SuperwallProvider apiKey={apiKey}>
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="language-selection" />
          <Stack.Screen name="landing" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: true }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="account" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
