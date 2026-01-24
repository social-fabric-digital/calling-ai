import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { HeadingStyle } from '@/constants/theme';
import { changeLanguage } from '@/utils/i18n';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import i18n from '@/utils/i18n';
import { useTranslation } from 'react-i18next';

// Available languages with flags
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export default function LanguageSelectionScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      console.log('Language selected:', languageCode);
      // Save selected language and change language
      await changeLanguage(languageCode);
      // Verify language was changed
      console.log('Language after change:', i18n.language);
      // Small delay to ensure language is fully applied and components re-render
      await new Promise(resolve => setTimeout(resolve, 300));
      // Navigate to landing screen with a key to force fresh render
      router.replace({
        pathname: '/landing',
        params: { _lang: languageCode, _ts: Date.now().toString() }
      });
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  return (
    <PaperTextureBackground>
      <View style={styles.container}>
        <Text style={styles.heading}>{t('languageSelection.selectLanguage')}</Text>
        
        <View style={styles.languagesContainer}>
          {LANGUAGES.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={styles.languageButton}
              onPress={() => handleLanguageSelect(language.code)}
              activeOpacity={0.8}
            >
              <Text style={styles.flagEmoji}>{language.flag}</Text>
              <Text style={styles.languageName}>{language.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  heading: {
    ...HeadingStyle,
    fontSize: 24,
    marginBottom: 60,
    textAlign: 'center',
    color: '#342846',
  },
  languagesContainer: {
    flexDirection: 'row',
    gap: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    paddingVertical: 30,
    paddingHorizontal: 40,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flagEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  languageName: {
    fontSize: 18,
    color: '#342846',
    fontFamily: 'BricolageGrotesque-Medium',
    textAlign: 'center',
  },
});
