import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { loadLanguagePreference } from '@/utils/i18n';
import '@/utils/i18n'; // Initialize i18n

const LANGUAGE_STORAGE_KEY = '@selected_language';

export default function Index() {
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [hasLanguage, setHasLanguage] = useState(false);
  const [languageLoaded, setLanguageLoaded] = useState(false);

  useEffect(() => {
    const checkLanguage = async () => {
      try {
        // Check if user has explicitly selected a language (not auto-detected)
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        console.log('=== INDEX SCREEN - Checking for saved language ===');
        console.log('Saved language value:', savedLanguage);
        console.log('Saved language type:', typeof savedLanguage);
        console.log('Saved language truthy?', !!savedLanguage);
        const hasExplicitLanguage = !!savedLanguage;
        
        // Only load language preference if user has selected one before
        if (hasExplicitLanguage) {
          await loadLanguagePreference();
        }
        
        setLanguageLoaded(true);
        setHasLanguage(hasExplicitLanguage);
        console.log('Has explicit language:', hasExplicitLanguage);
        console.log('Will show language selection?', !hasExplicitLanguage);
      } catch (error) {
        console.error('Error checking language:', error);
        setHasLanguage(false);
        setLanguageLoaded(true);
      } finally {
        setIsLoading(false);
      }
    };
    checkLanguage();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#342846" />
      </View>
    );
  }

  // TEMPORARY: Force language selection screen for testing
  // Always show language selection screen (bypasses check)
  return <Redirect href="/language-selection" />;

  // If no language selected, redirect to language selection
  // if (!hasLanguage) {
  //   console.log('No language selected, redirecting to language-selection');
  //   console.log('hasLanguage:', hasLanguage, 'isLoading:', isLoading, 'languageLoaded:', languageLoaded);
  //   return <Redirect href="/language-selection" />;
  // }

  // Otherwise, go to landing
  // console.log('Language already selected, redirecting to landing');
  // console.log('hasLanguage:', hasLanguage, 'isLoading:', isLoading, 'languageLoaded:', languageLoaded);
  // return <Redirect href="/landing" />;
}

