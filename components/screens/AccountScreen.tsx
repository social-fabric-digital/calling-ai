import { HeadingStyle, SubtitleStyle } from '@/constants/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AccountScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Manage your profile and settings</Text>
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

