import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle, SubtitleStyle } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const LANGUAGE_STORAGE_KEY = '@selected_language';

export default function AccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);

  const handleResetLanguage = async () => {
    Alert.alert(
      t('account.resetLanguageTitle'),
      t('account.resetLanguageMessage'),
      [
        {
          text: t('account.cancel'),
          style: 'cancel',
        },
        {
          text: t('account.reset'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsResetting(true);
              // Clear the saved language
              await AsyncStorage.removeItem(LANGUAGE_STORAGE_KEY);
              console.log('Language preference cleared');
              // Navigate back to landing screen
              router.replace('/landing');
            } catch (error) {
              console.error('Error resetting language:', error);
              Alert.alert(t('account.error'), t('account.resetLanguageError'));
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <PaperTextureBackground>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('account.title')}</Text>
          <Text style={styles.subtitle}>{t('account.subtitle')}</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('account.languageSettings')}</Text>
            <TouchableOpacity
              style={[styles.resetButton, isResetting && styles.resetButtonDisabled]}
              onPress={handleResetLanguage}
              disabled={isResetting}
            >
              <Text style={styles.resetButtonText}>
                {isResetting ? t('account.resetting') : t('account.changeLanguage')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.resetButtonDescription}>
              {t('account.resetLanguageDescription')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    ...HeadingStyle,
    color: '#342846',
    marginBottom: 8,
  },
  subtitle: {
    ...SubtitleStyle,
    color: '#666',
    paddingTop: 12,
    maxWidth: Platform.isPad ? 350 : undefined,
    alignSelf: 'center',
    textAlign: 'center',
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 16,
  },
  resetButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    fontSize: 15,
  },
  resetButtonDescription: {
    ...BodyStyle,
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
});

