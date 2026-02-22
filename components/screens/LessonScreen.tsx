import { BodyStyle, HeadingStyle, SubtitleStyle } from '@/constants/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function LessonScreen({ route }: any) {
  const lessonId = route?.params?.lessonId || 'default';
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{tr('Lesson', 'Урок')}</Text>
        <Text style={styles.subtitle}>{tr('Lesson ID', 'ИД урока')}: {lessonId}</Text>
        <View style={styles.lessonContent}>
          <Text style={styles.contentText}>
            {tr('Lesson content will appear here.', 'Содержимое урока появится здесь.')}
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
  lessonContent: {
    marginTop: 20,
  },
  contentText: {
    ...BodyStyle,
    color: '#333',
    lineHeight: 24,
  },
});

