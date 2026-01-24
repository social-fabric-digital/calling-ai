import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const LANGUAGE_STORAGE_KEY = '@selected_language';

// Import translation files
import en from './translations/en.json';
import es from './translations/es.json';
import fr from './translations/fr.json';
import de from './translations/de.json';
import it from './translations/it.json';
import pt from './translations/pt.json';
import ru from './translations/ru.json';
import ja from './translations/ja.json';
import ko from './translations/ko.json';
import zh from './translations/zh.json';
import ar from './translations/ar.json';
import hi from './translations/hi.json';

// Add more languages as needed - for now, we'll use English as fallback for unsupported languages
const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  pt: { translation: pt },
  ru: { translation: ru },
  ja: { translation: ja },
  ko: { translation: ko },
  zh: { translation: zh },
  ar: { translation: ar },
  hi: { translation: hi },
};

// Initialize i18n with default language
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    lng: 'en', // Default language - will be overridden by loadLanguagePreference
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
      prefix: '{',
      suffix: '}',
    },
    react: {
      useSuspense: false,
    },
  });

// Load saved language preference and initialize i18n with it
export const loadLanguagePreference = async (): Promise<string> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    console.log('Loading language preference. Saved language:', savedLanguage);
    if (savedLanguage && resources[savedLanguage as keyof typeof resources]) {
      // Change language immediately and wait for it to complete
      await i18n.changeLanguage(savedLanguage);
      console.log('Language loaded. Current i18n language:', i18n.language);
      return savedLanguage;
    }
    // Try to detect device language
    const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
    const normalizedLang = deviceLanguage.split('-')[0]; // e.g., 'en-US' -> 'en'
    if (resources[normalizedLang as keyof typeof resources]) {
      await i18n.changeLanguage(normalizedLang);
      return normalizedLang;
    }
    // Ensure i18n is set to English if nothing found
    await i18n.changeLanguage('en');
    return 'en';
  } catch (error) {
    console.error('Error loading language preference:', error);
    await i18n.changeLanguage('en');
    return 'en';
  }
};

// Change language and save preference
export const changeLanguage = async (languageCode: string): Promise<void> => {
  try {
    console.log('Changing language to:', languageCode);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
    await i18n.changeLanguage(languageCode);
    console.log('Language changed. Current i18n language:', i18n.language);
    // Ensure language change is fully applied before resolving
    // This helps ensure screens render with the correct language
    return new Promise((resolve) => {
      // Small delay to ensure i18n has fully updated
      setTimeout(() => {
        console.log('Language change complete. Final i18n language:', i18n.language);
        resolve();
      }, 100);
    });
  } catch (error) {
    console.error('Error changing language:', error);
    throw error;
  }
};

// Clear language preference (useful for testing or resetting)
export const clearLanguagePreference = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(LANGUAGE_STORAGE_KEY);
    // Reset to default language
    await i18n.changeLanguage('en');
  } catch (error) {
    console.error('Error clearing language preference:', error);
    throw error;
  }
};

export default i18n;
