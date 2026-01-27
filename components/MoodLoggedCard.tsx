import { BodyStyle, HeadingStyle } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

const brandColors = {
  primary: '#342846',
  text: '#342846',
  success: '#4CAF50',
};

interface MoodLoggedCardProps {
  emoji: string;
  moodText: string;
  onUpdatePress: () => void;
}

export function MoodLoggedCard({ emoji, moodText, onUpdatePress }: MoodLoggedCardProps) {
  const handleUpdate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpdatePress();
  };

  return (
    <ImageBackground
      source={require('../assets/images/goal.background.png')}
      style={styles.container}
      imageStyle={styles.containerImage}
    >
      <View style={styles.content}>
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Today's mood</Text>
          <Text style={styles.moodText}>{moodText}</Text>
        </View>
        <Pressable 
          style={({ pressed }) => [
            styles.updateButton,
            pressed && styles.updateButtonPressed,
          ]}
          onPress={handleUpdate}
        >
          <Text style={styles.updateButtonText}>Update</Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  containerImage: {
    borderRadius: 12,
    resizeMode: 'cover',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    padding: 16,
  },
  emojiContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emoji: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...BodyStyle,
    fontSize: 12,
    color: brandColors.text, // Use brand purple color (#342846)
    marginBottom: 2,
  },
  moodText: {
    ...HeadingStyle,
    fontSize: 18,
    color: brandColors.text,
    fontWeight: '600',
  },
  updateButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: brandColors.primary,
    borderRadius: 8,
  },
  updateButtonPressed: {
    backgroundColor: '#2a1f38',
    transform: [{ scale: 0.98 }],
  },
  updateButtonText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
