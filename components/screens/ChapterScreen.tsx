import { BodyStyle, HeadingStyle, SubtitleStyle } from '@/constants/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function ChapterScreen({ route }: any) {
  const chapterId = route?.params?.chapterId || 'default';
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 44) + 70 }]}>
        <Text style={styles.title}>{tr('Chapter', 'Глава')}</Text>
        <Text style={styles.subtitle}>{tr('Chapter ID', 'ИД главы')}: {chapterId}</Text>
        <View style={styles.chapterContent}>
          <Text style={styles.contentText}>
            {tr('Chapter content will appear here.', 'Содержимое главы появится здесь.')}
          </Text>
        </View>
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
    marginBottom: 24,
  },
  chapterContent: {
    marginTop: 20,
  },
  contentText: {
    ...BodyStyle,
    color: '#333',
    lineHeight: 24,
  },
});

