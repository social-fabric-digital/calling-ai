import { BodyStyle, HeadingStyle, SubtitleStyle } from '@/constants/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function LessonScreen({ route }: any) {
  const lessonId = route?.params?.lessonId || 'default';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Lesson</Text>
        <Text style={styles.subtitle}>Lesson ID: {lessonId}</Text>
        <View style={styles.lessonContent}>
          <Text style={styles.contentText}>
            Your lesson content will appear here.
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

