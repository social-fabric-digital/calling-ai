import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomPathDreamFormProps } from './types';
import { HeadingStyle, BodyStyle, ButtonHeadingStyle } from '@/constants/theme';
import { FrostedCardLayer } from '@/components/FrostedCardLayer';
import { hapticLight, hapticMedium } from '@/utils/haptics';

const { width, height } = Dimensions.get('window');

// ============================================
// Types
// ============================================
// Props interface imported from types.ts

interface PathData {
  pathName: string;
  pathDescription: string;
  startingPoint: string;
  mainObstacle: string;
  obstacleOther?: string;
  timeline: string;
}

interface StepProps {
  isActive: boolean;
  onNext: () => void;
  onBack?: () => void;
}

// ============================================
// Step 1: Name Your Dream
// ============================================
interface Step1Props extends StepProps {
  value: string;
  onChange: (value: string) => void;
  onBack?: () => void;
}

function Step1NameYourDream({ isActive, value, onChange, onNext, onBack }: Step1Props) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const inputRef = useRef<TextInput>(null);
  const sparkleAnims = useRef([...Array(5)].map(() => ({
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
    position: {
      top: Math.random() * 150,
      left: Math.random() * (Math.min(width, 400) - 100) + 20,
    },
  }))).current;

  useEffect(() => {
    if (isActive) {
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
      ]).start(() => {
        inputRef.current?.focus();
      });

      // Sparkle animations
      sparkleAnims.forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 400),
            Animated.parallel([
              Animated.timing(anim.opacity, {
                toValue: 0.8,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.spring(anim.scale, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
              }),
            ]),
            Animated.delay(500),
            Animated.parallel([
              Animated.timing(anim.opacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(anim.scale, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
            ]),
            Animated.delay(1000),
          ])
        ).start();
      });
    }
  }, [isActive]);

  const canProceed = value.trim().length >= 2;

  return (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Floating sparkles */}
      {sparkleAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.sparkle,
            {
              top: anim.position.top,
              left: anim.position.left,
              opacity: anim.opacity,
              transform: [{ scale: anim.scale }],
            },
          ]}
        >
          <MaterialIcons name="auto-awesome" size={16} color="#bfacca" />
        </Animated.View>
      ))}

      <View style={[styles.stepContent, styles.step1ContentOffset]}>
        <Text style={[styles.stepTitle, styles.step1Title]}>{isRussian ? 'Какое направление тебя зовёт?' : 'Which direction calls you?'}</Text>
        <Text style={styles.stepSubtitle}>
          {isRussian
            ? 'Какой путь ты хочешь пройти? Дай ему название, которое тебя вдохновляет.'
            : 'What path do you want to follow? Give it a name that inspires you.'}
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.mainInput}
            placeholder={isRussian ? 'например, автор бестселлера' : 'for example, bestselling author'}
            placeholderTextColor="rgba(52, 40, 70, 0.4)"
            value={value}
            onChangeText={onChange}
            maxLength={50}
            autoCapitalize="words"
          />
          <Text style={styles.characterCount}>{value.length}/50</Text>
        </View>

        <View style={styles.suggestionContainer}>
          <Text style={styles.suggestionLabel}>{isRussian ? 'Нужно вдохновение?' : 'Need inspiration?'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.suggestionRow}>
              {(isRussian
                ? ['Креативный предприниматель', 'Коуч по благополучию', 'Основатель техпроекта', 'Художник']
                : ['Creative entrepreneur', 'Wellness coach', 'Tech founder', 'Artist']).map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={styles.suggestionChip}
                  onPress={() => {
                    void hapticLight();
                    onChange(suggestion);
                  }}
                >
                  <Text style={styles.suggestionChipText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.continueButton, !canProceed && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!canProceed}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>{isRussian ? 'Продолжить' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ============================================
// Step 2: Paint the Picture
// ============================================
interface Step2Props extends StepProps {
  value: string;
  onChange: (value: string) => void;
  pathName: string;
}

function Step2PaintThePicture({ isActive, value, onChange, onNext, onBack, pathName }: Step2Props) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isActive) {
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
      ]).start(() => {
        setTimeout(() => inputRef.current?.focus(), 300);
      });
    }
  }, [isActive]);

  const canProceed = value.trim().length >= 10;

  return (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, styles.step2Title]}>
          {isRussian ? 'ОПИШИ КАРТИНУ' : 'PAINT THE PICTURE'}
        </Text>
        <Text style={[styles.stepSubtitle, styles.step2Subtitle]}>
          {isRussian
            ? `Опиши, как выглядит успех в роли ${pathName || 'на этом пути'}. Чем ты будешь заниматься?`
            : `Describe what success looks like as ${pathName || 'on this path'}. What will you be doing?`}
        </Text>

        <View style={[styles.textAreaContainer, styles.step2TextAreaContainer]}>
          <TextInput
            ref={inputRef}
            style={styles.textArea}
            placeholder={
              isRussian
                ? 'Я буду просыпаться с вдохновением и заниматься тем, что для меня важно...'
                : 'I will wake up inspired and work on what truly matters to me...'
            }
            placeholderTextColor="rgba(52, 40, 70, 0.4)"
            value={value}
            onChangeText={onChange}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{value.length}/300</Text>
        </View>

        <Text style={[styles.suggestionLabel, styles.step2PromptLabel]}>
          {isRussian ? 'Подумай о:' : 'Think about:'}
        </Text>
        <View style={[styles.promptContainer, styles.step2PromptContainer]}>
          <View style={[styles.promptRow, styles.step2PromptRow]}>
            <View style={[styles.promptItem, styles.step2PromptItem]}>
              <Text style={styles.promptText}>{isRussian ? 'Твоей повседневной жизни' : 'Your daily life'}</Text>
            </View>
            <View style={[styles.promptItem, styles.step2PromptItem]}>
              <Text style={styles.promptText}>{isRussian ? 'Кому ты помогаешь' : 'Who you help'}</Text>
            </View>
            <View style={[styles.promptItem, styles.step2PromptItem]}>
              <Text style={styles.promptText}>{isRussian ? 'Тем, как ты себя чувствуешь' : 'How you feel'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.continueButton, !canProceed && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!canProceed}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>{isRussian ? 'Продолжить' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ============================================
// Step 3: Your Starting Point
// ============================================
interface Step3Props extends StepProps {
  value: string;
  onChange: (value: string) => void;
}

const getStartingPointOptions = (isRussian: boolean) => [
  {
    id: 'discipline',
    label: isRussian ? 'Я умею быть последовательным(ой)' : 'I can stay consistent',
    description: isRussian ? 'Довожу начатое до конца даже в загруженные дни' : 'I follow through even on busy days',
  },
  {
    id: 'learning',
    label: isRussian ? 'Я быстро учусь' : 'I learn quickly',
    description: isRussian ? 'Быстро превращаю новую информацию в реальные действия' : 'I turn new knowledge into action fast',
  },
  {
    id: 'support',
    label: isRussian ? 'У меня есть поддержка' : 'I have support around me',
    description: isRussian ? 'Рядом есть люди, к которым я могу обратиться за помощью' : 'I have people I can lean on when needed',
  },
  {
    id: 'experience',
    label: isRussian ? 'У меня уже есть опыт' : 'I already have relevant experience',
    description: isRussian ? 'У меня уже есть навыки и прошлые результаты в этой сфере' : 'I already have skills and prior wins in this area',
  },
  {
    id: 'motivation',
    label: isRussian ? 'Я действительно мотивирован(а)' : 'I am deeply motivated',
    description: isRussian ? 'У меня есть сильная причина начать прямо сейчас' : 'I have a strong reason to start now',
  },
];

function Step3StartingPoint({ isActive, value, onChange, onNext, onBack }: Step3Props) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const options = getStartingPointOptions(Boolean(isRussian));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (isActive) {
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
    }
  }, [isActive]);

  const canProceed = value.trim().length > 0;

  return (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, styles.step3Title]}>
          {isRussian ? 'ТВОЯ СТАРТОВАЯ ТОЧКА' : 'YOUR STARTING POINT'}
        </Text>
        <Text style={styles.stepSubtitle}>
          {isRussian
            ? 'Какие важные навыки, опыт или ресурсы у тебя уже есть?'
            : 'What important skills, experience, or resources do you already have?'}
        </Text>

        <View style={styles.step3OptionsContainer}>
          {options.map((option) => {
            const isSelected = value === option.label;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.step3OptionCard, isSelected && styles.step3OptionCardSelected]}
                onPress={() => {
                  void hapticLight();
                  onChange(option.label);
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.step3OptionTitle, isSelected && styles.step3OptionTitleSelected]}>
                  {option.label}
                </Text>
                <Text style={styles.step3OptionDescription}>{option.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.continueButton, !canProceed && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!canProceed}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>{isRussian ? 'Продолжить' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ============================================
// Step 4: Your Challenge
// ============================================
interface Step4Props extends StepProps {
  value: string;
  onChange: (value: string) => void;
}

const getChallenges = (isRussian: boolean) => [
  { id: 'time', icon: 'schedule', label: isRussian ? 'Мало времени' : 'Limited time', description: isRussian ? 'Плотный график, конкурирующие приоритеты' : 'Busy schedule and competing priorities' },
  { id: 'money', icon: 'account-balance-wallet', label: isRussian ? 'Финансовые ограничения' : 'Financial constraints', description: isRussian ? 'Ограниченный бюджет или ресурсы' : 'Limited budget or resources' },
  { id: 'knowledge', icon: 'school', label: isRussian ? 'Нужно больше навыков' : 'Need more skills', description: isRussian ? 'Есть пробелы в знаниях' : 'Knowledge gaps to close' },
  { id: 'confidence', icon: 'psychology', label: isRussian ? 'Неуверенность в себе' : 'Low confidence', description: isRussian ? 'Нужно укрепить уверенность и веру' : 'Need to build confidence and self-belief' },
  { id: 'network', icon: 'people', label: isRussian ? 'Нужны связи' : 'Need connections', description: isRussian ? 'Нужно собрать правильное окружение' : 'Need the right people around you' },
  { id: 'clarity', icon: 'lightbulb', label: isRussian ? 'Неясны следующие шаги' : 'Next steps are unclear', description: isRussian ? 'Нужно направление и структура' : 'Need direction and structure' },
];

function Step4Challenge({ isActive, value, onChange, onNext, onBack }: Step4Props) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const challenges = getChallenges(Boolean(isRussian));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardAnims = useRef(challenges.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (isActive) {
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
    }
  }, [isActive]);

  const canProceed = value.length > 0;

  return (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, styles.step3Title]}>{isRussian ? 'ТВОЯ ПРОБЛЕМА' : 'YOUR CHALLENGE'}</Text>
        <Text style={styles.stepSubtitle}>
          {isRussian
            ? 'Какое главное препятствие стоит между тобой и твоей мечтой?'
            : "What's the biggest obstacle standing between you and your dream?"}
        </Text>

        <View style={styles.challengeGrid}>
          {challenges.map((challenge, index) => {
            const isSelected = value === challenge.id;
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
                  onPress={() => onChange(challenge.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.challengeOptionText}>{challenge.description}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.continueButton, !canProceed && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!canProceed}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>{isRussian ? 'Продолжить' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ============================================
// Step 5: Your Timeline
// ============================================
interface Step5Props extends StepProps {
  value: string;
  onChange: (value: string) => void;
}

const getTimelines = (isRussian: boolean) => [
  { id: '1-3', label: isRussian ? '1-3 месяца' : '1-3 months', description: isRussian ? 'Быстрые победы' : 'Quick wins', icon: 'bolt', color: '#4CAF50' },
  { id: '3-6', label: isRussian ? '3-6 месяцев' : '3-6 months', description: isRussian ? 'Стабильный рост' : 'Steady growth', icon: 'trending-up', color: '#2196F3' },
  { id: '6-12', label: isRussian ? '6-12 месяцев' : '6-12 months', description: isRussian ? 'Сильный сдвиг' : 'Major shift', icon: 'rocket-launch', color: '#9C27B0' },
  { id: '1+', label: isRussian ? '1+ лет' : '1+ years', description: isRussian ? 'Долгосрочное видение' : 'Long-term vision', icon: 'auto-awesome', color: '#FF9800' },
];

function Step5Timeline({ isActive, value, onChange, onNext, onBack }: Step5Props) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const timelines = getTimelines(Boolean(isRussian));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const timelineAnims = useRef(timelines.map(() => ({
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    if (isActive) {
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

      // Stagger timeline cards
      timelineAnims.forEach((anim, index) => {
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1,
            tension: 50,
            friction: 8,
            delay: index * 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 400,
            delay: index * 100,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [isActive]);

  const canProceed = value.length > 0;

  return (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, styles.step3Title]}>{isRussian ? 'ТВОЙ СРОК' : 'YOUR TIMELINE'}</Text>
        <Text style={styles.stepSubtitle}>
          {isRussian ? 'Какой для тебя идеальный срок, чтобы завершить одну цель?' : 'What is the ideal time for you to complete one goal?'}
        </Text>

        <View style={styles.timelineContainer}>
          {timelines.map((timeline, index) => {
            const isSelected = value === timeline.id;
            return (
              <Animated.View
                key={timeline.id}
                style={{
                  opacity: timelineAnims[index].opacity,
                  transform: [{ scale: timelineAnims[index].scale }],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.timelineCard,
                    isSelected && styles.timelineCardSelected,
                  ]}
                  onPress={() => onChange(timeline.id)}
                  activeOpacity={0.8}
                >
                  <FrostedCardLayer />
                  <View style={styles.timelineTextContainer}>
                    <Text style={[styles.timelineLabel, isSelected && { color: '#342846' }]}>
                      {timeline.label}
                    </Text>
                    <Text style={styles.timelineDescription}>{timeline.description}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.continueButton, !canProceed && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!canProceed}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>{isRussian ? 'Продолжить' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ============================================
// Step 6: Timeline Encouragement
// ============================================
interface Step6Props extends StepProps {
  timeline: string;
}

function getTimelineEncouragement(timeline: string, isRussian: boolean) {
  if (isRussian) {
    switch (timeline) {
      case '1-3':
        return 'Я, Атлас, вижу твою решимость. Отличный темп - я помогу тебе каждый день удерживать фокус и двигаться к цели.';
      case '3-6':
        return 'Мне нравится этот баланс. Я помогу тебе выстроить устойчивый ритм, чтобы ты уверенно завершил(а) свою цель.';
      case '6-12':
        return 'Это сильный, зрелый выбор. Я помогу разбить большую цель на понятные шаги и поддержу тебя на всем пути.';
      case '1+':
        return 'Долгосрочное мышление - твоя суперсила. Я буду рядом, чтобы ты двигался(лась) вперед стабильно и без перегрузки.';
      default:
        return 'Отличный старт. Я рядом, чтобы помочь тебе сохранить фокус и уверенно довести первую цель до результата.';
    }
  }

  switch (timeline) {
    case '1-3':
      return "I'm Atlas, and I can already see your momentum. Great choice - I'll help you stay focused and move forward every day.";
    case '3-6':
      return "I love this balance. I'll help you build a steady rhythm so you can finish your goal with confidence.";
    case '6-12':
      return "This is a wise and ambitious timeline. I'll help you break your big goal into clear, doable steps.";
    case '1+':
      return "Long-term thinking is powerful. I'll stay by your side so you keep progressing without burnout.";
    default:
      return "Great start. I'm here to help you stay focused and complete your first goal with confidence.";
  }
}

function Step6TimelineEncouragement({ isActive, timeline, onNext, onBack }: Step6Props) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (isActive) {
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
    }
  }, [isActive]);

  const encouragementText = getTimelineEncouragement(timeline, Boolean(isRussian));

  return (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, styles.step3Title]}>
          {isRussian ? 'ТЫ НА ВЕРНОМ ПУТИ' : 'YOU ARE ON THE RIGHT PATH'}
        </Text>
        <Text style={styles.timelineEncouragementSubtitle}>
          {isRussian
            ? 'Каждый шаг приближает тебя к цели. Не сравнивай себя с другими - двигайся в своем темпе.'
            : "Every step brings you closer to your goal. Don't worry about others - move at your own pace."}
        </Text>

        <View style={styles.timelineSpeechWrap}>
          <View style={styles.timelineEncouragementCard}>
            <Text style={styles.timelineEncouragementText}>{encouragementText}</Text>
          </View>
          <View style={styles.timelineBubbleTailWrap}>
            <View style={styles.timelineBubbleTailLarge} />
            <View style={styles.timelineBubbleTailSmall} />
          </View>
        </View>

        <View style={styles.timelineAtlasWrap}>
          <Image
            source={require('../../assets/images/deer.face.png')}
            style={styles.timelineAtlasImage}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.continueButton} onPress={onNext} activeOpacity={0.8}>
          <MaterialIcons name="auto-awesome" size={18} color="#FFFFFF" />
          <Text style={styles.continueButtonText}>{isRussian ? 'Продолжить' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ============================================
// Progress Indicator
// ============================================
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: (currentStep + 1) / totalSteps,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
      <Text style={styles.progressText}>
        Step {currentStep + 1} of {totalSteps}
      </Text>
    </View>
  );
}

// ============================================
// Main Component
// ============================================
export default function CustomPathDreamForm({ onComplete, onBack, backRequestId }: CustomPathDreamFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [pathData, setPathData] = useState<PathData>({
    pathName: '',
    pathDescription: '',
    startingPoint: '',
    mainObstacle: '',
    obstacleOther: undefined,
    timeline: '',
  });

  const totalSteps = 6;
  const lastHandledBackRequestRef = useRef<number | undefined>(backRequestId);

  const handleNext = () => {
    void hapticMedium();
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete({
        pathName: pathData.pathName,
        pathDescription: pathData.pathDescription,
        startingPoint: pathData.startingPoint,
        mainObstacle: pathData.mainObstacle,
        obstacleOther: pathData.obstacleOther,
        timeline: pathData.timeline,
      });
    }
  };

  const handleBack = () => {
    void hapticMedium();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack?.();
    }
  };

  useEffect(() => {
    if (backRequestId === undefined) return;
    if (backRequestId === lastHandledBackRequestRef.current) return;
    lastHandledBackRequestRef.current = backRequestId;
    handleBack();
  }, [backRequestId]);

  const updatePathData = (key: keyof PathData, value: string) => {
    setPathData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.isPad ? 24 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* Steps */}
          <View style={styles.stepsWrapper}>
            {currentStep === 0 && (
              <Step1NameYourDream
                isActive={currentStep === 0}
                value={pathData.pathName}
                onChange={(v) => updatePathData('pathName', v)}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 1 && (
              <Step2PaintThePicture
                isActive={currentStep === 1}
                value={pathData.pathDescription}
                onChange={(v) => updatePathData('pathDescription', v)}
                pathName={pathData.pathName}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 2 && (
              <Step3StartingPoint
                isActive={currentStep === 2}
                value={pathData.startingPoint}
                onChange={(v) => updatePathData('startingPoint', v)}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 3 && (
              <Step4Challenge
                isActive={currentStep === 3}
                value={pathData.mainObstacle}
                onChange={(v) => {
                  void hapticLight();
                  updatePathData('mainObstacle', v);
                }}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 4 && (
              <Step5Timeline
                isActive={currentStep === 4}
                value={pathData.timeline}
                onChange={(v) => {
                  void hapticLight();
                  updatePathData('timeline', v);
                }}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 5 && (
              <Step6TimelineEncouragement
                isActive={currentStep === 5}
                timeline={pathData.timeline}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...HeadingStyle,
    color: '#342846',
  },
  headerSpacer: {
    width: 44,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(52, 40, 70, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#342846',
    borderRadius: 2,
  },
  progressText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 12,
    color: 'rgba(52, 40, 70, 0.5)',
    marginTop: 8,
    textAlign: 'center',
  },

  // Steps
  stepsWrapper: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 120,
  },
  stepContent: {
    flex: 1,
    paddingTop: 20,
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
    color: '#342846',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#342846',
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 28,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  step1Title: {
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 10,
    color: '#FFFFFF',
  },
  step1ContentOffset: {
    marginTop: 30,
  },

  // Inputs
  inputContainer: {
    marginTop: 50,
    marginBottom: 24,
  },
  mainInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.15)',
    paddingHorizontal: 20,
    paddingTop: 12, // Increased by 4px to move text down
    paddingBottom: 16, // Decreased by 4px to maintain spacing
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    lineHeight: 20, // Reduced lineHeight to match fontSize more closely
    color: '#342846',
    textAlign: 'center',
    textAlignVertical: 'center', // Center align text vertically
    includeFontPadding: false, // Prevent extra padding on Android
  },
  characterCount: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 12,
    color: 'rgba(52, 40, 70, 0.4)',
    textAlign: 'right',
    marginTop: 8,
    marginRight: 4,
  },
  textAreaContainer: {
    marginBottom: 20,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.15)',
    paddingHorizontal: 20,
    paddingTop: 10, // Increased by 4px to move text down
    paddingBottom: 14, // Decreased by 4px to maintain spacing
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: '#342846',
    minHeight: 120,
    lineHeight: 24,
    textAlignVertical: 'top', // Top align for multiline
    includeFontPadding: false, // Prevent extra padding on Android
  },

  // Suggestions
  suggestionContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  suggestionLabel: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.24)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  suggestionChipText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: '#342846',
  },

  // Prompts
  promptContainer: {
    backgroundColor: 'rgba(191, 172, 202, 0.15)',
    borderRadius: 16,
    padding: 16,
  },
  promptTitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 10,
    color: '#342846',
    opacity: 0.6,
    marginBottom: 12,
  },
  promptRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  promptItem: {
    alignItems: 'center',
    gap: 6,
  },
  promptText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 12,
    color: '#342846',
    opacity: 0.7,
    textAlign: 'center',
  },
  step2Subtitle: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  step2Title: {
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 10,
  },
  step3Title: {
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 10,
  },
  step2TextAreaContainer: {
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  step2PromptContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.16)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  step2PromptLabel: {
    marginTop: 60,
    marginBottom: 12,
    transform: [{ translateY: -20 }],
  },
  step2PromptRow: {
    justifyContent: 'center',
    gap: 0,
  },
  step2PromptItem: {
    flex: 1,
    paddingHorizontal: 6,
  },

  // Step 3 options
  step3OptionsContainer: {
    gap: 15,
    marginTop: -2,
  },
  step3OptionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(52, 40, 70, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  step3OptionCardSelected: {
    backgroundColor: 'rgba(186, 172, 202, 0.45)',
    borderColor: '#342846',
  },
  step3OptionTitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 15,
    textAlign: 'left',
    fontWeight: '600',
    marginBottom: 4,
  },
  step3OptionTitleSelected: {
    color: '#342846',
  },
  step3OptionDescription: {
    ...BodyStyle,
    color: '#342846',
    opacity: 0.75,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'left',
  },

  // Path illustration
  pathIllustration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  pathDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pathDotStart: {
    backgroundColor: '#bfacca',
  },
  pathDotEnd: {
    backgroundColor: '#342846',
  },
  pathDotLabel: {
    ...HeadingStyle,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  pathLine: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(52, 40, 70, 0.2)',
    marginHorizontal: 8,
  },

  // Challenge cards
  challengeGrid: {
    gap: 15,
  },
  challengeCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 40, 70, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  challengeCardSelected: {
    backgroundColor: 'rgba(186, 172, 202, 0.45)',
    borderColor: '#342846',
  },
  challengeOptionText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'left',
  },

  // Timeline cards
  timelineContainer: {
    gap: 15,
  },
  timelineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(52, 40, 70, 0.1)',
    padding: 16,
    overflow: 'hidden',
  },
  timelineCardSelected: {
    backgroundColor: 'rgba(186, 172, 202, 0.45)',
    borderColor: '#342846',
  },
  timelineIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  timelineTextContainer: {
    flex: 1,
  },
  timelineLabel: {
    ...HeadingStyle,
    fontSize: 12,
    color: '#342846',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  timelineDescription: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: 'rgba(52, 40, 70, 0.6)',
  },
  timelineSpeechWrap: {
    width: '100%',
    marginTop: 8,
    transform: [{ translateY: 140 }],
  },
  timelineEncouragementCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.16)',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  timelineEncouragementText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  timelineEncouragementSubtitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 4,
    marginBottom: 6,
    paddingHorizontal: 10,
  },
  timelineBubbleTailWrap: {
    alignItems: 'flex-end',
    marginTop: -2,
    paddingRight: 42,
  },
  timelineBubbleTailLarge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.16)',
  },
  timelineBubbleTailSmall: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.16)',
    marginTop: 4,
    marginRight: 12,
  },
  timelineAtlasWrap: {
    alignItems: 'flex-end',
    marginTop: -6,
    paddingRight: 8,
    transform: [{ translateY: 140 }],
  },
  timelineAtlasImage: {
    width: 154,
    height: 154,
  },
  timelineCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 10,
    paddingBottom: 40,
    backgroundColor: 'transparent',
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
    paddingHorizontal: 40,
    borderRadius: 999,
    backgroundColor: '#342846',
    gap: 8,
    minHeight: 50,
    width: '100%',
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  continueButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  generateButton: {
    flex: 1,
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  generateButtonText: {
    ...HeadingStyle,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Sparkles
  sparkle: {
    position: 'absolute',
    zIndex: 10,
  },
});
