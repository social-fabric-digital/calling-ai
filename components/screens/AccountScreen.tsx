import { HeadingStyle, SubtitleStyle } from '@/constants/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function AccountScreen() {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{tr('Account', 'Аккаунт')}</Text>
        <Text style={styles.subtitle}>{tr('Manage your profile and settings', 'Управляй профилем и настройками')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
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
  },
});

