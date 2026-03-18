import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { FrostedCardLayer } from '@/components/FrostedCardLayer';
import { useTranslation } from 'react-i18next';
import { hapticLight, hapticMedium } from '@/utils/haptics';

const { width } = Dimensions.get('window');

// ============================================
// Types
// ============================================
export interface PathChallengeStepProps {
  pathName?: string;
  selectedGoalFear?: string;
  onContinue: (challenge: string) => void;
  onBack?: () => void;
  hideHeader?: boolean;
}

const getChallenges = (isRussian: boolean) => [
  { id: 'time', icon: 'schedule', label: isRussian ? 'Мало времени' : 'Limited time', description: isRussian ? 'Плотный график, конкурирующие приоритеты' : 'Busy schedule and competing priorities' },
  { id: 'money', icon: 'account-balance-wallet', label: isRussian ? 'Финансовые ограничения' : 'Financial constraints', description: isRussian ? 'Ограниченный бюджет или ресурсы' : 'Limited budget or resources' },
  { id: 'knowledge', icon: 'school', label: isRussian ? 'Нужно больше навыков' : 'Need more skills', description: isRussian ? 'Есть пробелы в знаниях' : 'Knowledge gaps to close' },
  { id: 'confidence', icon: 'psychology', label: isRussian ? 'Неуверенность в себе' : 'Low confidence', description: isRussian ? 'Нужно укрепить уверенность и веру' : 'Need to build confidence and belief' },
  { id: 'network', icon: 'people', label: isRussian ? 'Нужны связи' : 'Need connections', description: isRussian ? 'Нужно собрать правильное окружение' : 'Need the right network' },
  { id: 'clarity', icon: 'lightbulb', label: isRussian ? 'Неясны следующие шаги' : 'Unclear next steps', description: isRussian ? 'Нужно направление и структура' : 'Need direction and structure' },
];

// ============================================
// Component
// ============================================
export default function PathChallengeStep({ pathName, selectedGoalFear, onContinue, onBack, hideHeader = false }: PathChallengeStepProps) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const challenges = getChallenges(Boolean(isRussian));
  const [selectedChallenge, setSelectedChallenge] = useState<string>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardAnims = useRef(challenges.map(() => new Animated.Value(0))).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate progress bar
    Animated.timing(progressWidth, {
      toValue: 100,
      duration: 800,
      delay: 300,
      useNativeDriver: false,
    }).start();

    // Stagger card animations
    cardAnims.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        delay: index * 80,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  const canProceed = selectedChallenge.length > 0;
  const normalizedPathName = (pathName || '').trim().replace(/\s+/g, ' ');
  const conversationalGoalName = (() => {
    if (!normalizedPathName) return '';

    const hasLetters = /[A-Za-zА-Яа-яЁё]/.test(normalizedPathName);
    if (!hasLetters) return normalizedPathName;

    // If upstream sends all-caps text, normalize to sentence case.
    if (normalizedPathName === normalizedPathName.toUpperCase()) {
      const lowered = normalizedPathName.toLowerCase();
      const sentenceCase = lowered.charAt(0).toUpperCase() + lowered.slice(1);
      return sentenceCase
        .replace(/\bai\b/g, 'AI')
        .replace(/\bui\b/g, 'UI')
        .replace(/\bux\b/g, 'UX')
        .replace(/\bml\b/g, 'ML');
    }

    return normalizedPathName;
  })();

  const handleContinue = () => {
    if (canProceed) {
      void hapticMedium();
      const selectedChallengeLabel =
        challenges.find((challenge) => challenge.id === selectedChallenge)?.label || selectedChallenge;
      onContinue(selectedChallengeLabel);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back button row */}
      {!hideHeader && (
        <View style={styles.headerButtonsRow}>
          {onBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                void hapticMedium();
                onBack();
              }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#342846" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressWidth.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      <Animated.View
        style={[
          styles.content,
          hideHeader && styles.contentNoHeader,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.stepContent}>
          <View style={styles.stepIconContainer}>
            <LinearGradient
              colors={['#7a6a8a', '#9a8aaa']}
              style={styles.stepIconGradient}
            >
              <MaterialIcons name="terrain" size={32} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={styles.stepTitle}>{isRussian ? 'Твой вызов' : 'Your challenge'}</Text>
          <Text style={styles.stepSubtitle}>
            {isRussian
              ? conversationalGoalName
                ? `Что сейчас больше всего мешает тебе двигаться к этой цели: «${conversationalGoalName}»?`
                : 'Что сейчас больше всего мешает тебе двигаться к твоей цели?'
              : conversationalGoalName
                ? `What feels like the biggest thing holding you back from this goal right now: "${conversationalGoalName}"?`
                : 'What feels like the biggest thing holding you back from your goal right now?'}
          </Text>
          <View style={styles.challengeGrid}>
            {challenges.map((challenge, index) => {
              const isSelected = selectedChallenge === challenge.id;
              return (
                <Animated.View
                  key={challenge.id}
                  style={{
                    opacity: cardAnims[index],
                    transform: [
                      {
                        scale: cardAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.challengeCard,
                      isSelected && styles.challengeCardSelected,
                    ]}
                    onPress={() => {
                      void hapticLight();
                      setSelectedChallenge(challenge.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <FrostedCardLayer />
                    <View style={[styles.challengeIconContainer, isSelected && styles.challengeIconSelected]}>
                      <MaterialIcons
                        name={challenge.icon as any}
                        size={24}
                        color={isSelected ? '#FFFFFF' : '#342846'}
                      />
                    </View>
                    <View style={styles.challengeLabelContainer}>
                      <Text 
                        style={[styles.challengeLabel, isSelected && styles.challengeLabelSelected]}
                        numberOfLines={2}
                        allowFontScaling={false}
                      >
                        {challenge.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.continueButton, !canProceed && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!canProceed}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>{isRussian ? 'Продолжить' : 'Continue'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 120,
    marginTop: 0,
  },
  contentNoHeader: {
    paddingTop: 0,
    marginTop: 0,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    marginTop: 20,
  },
  stepIconContainer: {
    alignSelf: 'center',
    marginBottom: 20,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  stepIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    ...HeadingStyle,
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 1,
    marginBottom: 28,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  challengeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  challengeCard: {
    width: (width - 72) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(52, 40, 70, 0.1)',
    padding: 16,
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
    height: 130,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  challengeCardSelected: {
    borderColor: '#342846',
    backgroundColor: 'rgba(52, 40, 70, 0.03)',
  },
  challengeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(52, 40, 70, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  challengeIconSelected: {
    backgroundColor: '#342846',
  },
  challengeLabelContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeLabel: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: '#342846',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: (width - 72) / 2 - 32, // Card width minus padding (16px * 2)
  },
  challengeLabelSelected: {
    fontWeight: '600',
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 0,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#342846',
    borderRadius: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 10,
    paddingBottom: 40,
    backgroundColor: 'transparent',
    gap: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  backButtonNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    gap: 8,
    minHeight: 50,
  },
  backButtonText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    fontWeight: '600',
    lineHeight: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    backgroundColor: '#342846',
    gap: 8,
    minHeight: 50,
    flex: 1,
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueButtonText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
