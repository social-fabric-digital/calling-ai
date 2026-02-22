import { BodyStyle, HeadingStyle } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

const brandColors = {
  primary: '#342846',
  text: '#342846',
  success: '#4CAF50',
};

interface MoodLoggedCardProps {
  emoji: string;
  moodText: string;
  moodValue?: number;
  onUpdatePress: () => void;
}

export function MoodLoggedCard({ emoji, moodText, moodValue, onUpdatePress }: MoodLoggedCardProps) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);

  const getMoodLabel = (): string => {
    // Prefer numeric mood value when available for deterministic localization.
    if (typeof moodValue === 'number') {
      if (moodValue < 20) return tr('Very hard', 'Тяжело');
      if (moodValue < 40) return tr('Not great', 'Не очень');
      if (moodValue < 60) return tr('Okay', 'Нормально');
      if (moodValue < 80) return tr('Good', 'Хорошо');
      return tr('Great!', 'Отлично!');
    }

    // Fallback: localize by emoji bucket.
    if (emoji === '😢') return tr('Very hard', 'Тяжело');
    if (emoji === '😞') return tr('Not great', 'Не очень');
    if (emoji === '😐') return tr('Okay', 'Нормально');
    if (emoji === '🙂') return tr('Good', 'Хорошо');
    if (emoji === '😊') return tr('Great!', 'Отлично!');

    // Final fallback for legacy/misc stored text values.
    const raw = (moodText || '').trim().toLowerCase();
    if (raw === 'very hard' || raw === 'тяжело') return tr('Very hard', 'Тяжело');
    if (raw === 'not great' || raw === 'не очень') return tr('Not great', 'Не очень');
    if (raw === 'okay' || raw === 'нормально') return tr('Okay', 'Нормально');
    if (raw === 'good' || raw === 'хорошо') return tr('Good', 'Хорошо');
    if (raw === 'great!' || raw === 'great' || raw === 'отлично!') return tr('Great!', 'Отлично!');
    return isRussian ? 'Нормально' : 'Okay';
  };

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
          <Text style={styles.title}>{tr('Mood today', 'Настроение сегодня')}</Text>
          <Text style={styles.moodText}>{getMoodLabel()}</Text>
        </View>
        <Pressable 
          style={({ pressed }) => [
            styles.updateButton,
            pressed && styles.updateButtonPressed,
          ]}
          onPress={handleUpdate}
        >
          <Text style={styles.updateButtonText}>{tr('Update', 'Изменить')}</Text>
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
