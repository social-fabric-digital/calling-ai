import { BodyStyle, HeadingStyle, SubtitleStyle } from '@/constants/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ChapterScreen({ route }: any) {
  const chapterId = route?.params?.chapterId || 'default';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Chapter</Text>
        <Text style={styles.subtitle}>Chapter ID: {chapterId}</Text>
        <View style={styles.chapterContent}>
          <Text style={styles.contentText}>
            Your chapter content will appear here.
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

