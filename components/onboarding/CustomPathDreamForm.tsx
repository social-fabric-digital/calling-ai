import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
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
      left: Math.random() * (width - 100) + 20,
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

      <View style={styles.stepContent}>
        <View style={styles.stepIconContainer}>
          <LinearGradient
            colors={['#342846', '#4a3a5c']}
            style={styles.stepIconGradient}
          >
            <MaterialIcons name="stars" size={32} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={styles.stepTitle}>{isRussian ? 'НАЗОВИ СВОЮ МЕЧТУ' : 'NAME YOUR DREAM'}</Text>
        <Text style={styles.stepSubtitle}>
          {isRussian
            ? 'Кем ты хочешь стать? Дай своему пути название, которое тебя вдохновляет.'
            : 'Who do you want to become? Give your path a name that inspires you.'}
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
                  onPress={() => onChange(suggestion)}
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
        <View style={styles.stepIconContainer}>
          <LinearGradient
            colors={['#5c4a6e', '#7a6890']}
            style={styles.stepIconGradient}
          >
            <MaterialIcons name="brush" size={32} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={styles.stepTitle}>{isRussian ? 'ОПИШИ КАРТИНУ' : 'PAINT THE PICTURE'}</Text>
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

        <View style={[styles.promptContainer, styles.step2PromptContainer]}>
          <Text style={styles.promptTitle}>{isRussian ? 'Подумай о:' : 'Think about:'}</Text>
          <View style={[styles.promptRow, styles.step2PromptRow]}>
            <View style={[styles.promptItem, styles.step2PromptItem]}>
              <MaterialIcons name="wb-sunny" size={18} color="#bfacca" />
              <Text style={styles.promptText}>{isRussian ? 'Твоей повседневной жизни' : 'Your daily life'}</Text>
            </View>
            <View style={[styles.promptItem, styles.step2PromptItem]}>
              <MaterialIcons name="people" size={18} color="#bfacca" />
              <Text style={styles.promptText}>{isRussian ? 'Кому ты помогаешь' : 'Who you help'}</Text>
            </View>
            <View style={[styles.promptItem, styles.step2PromptItem]}>
              <MaterialIcons name="emoji-emotions" size={18} color="#bfacca" />
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

function Step3StartingPoint({ isActive, value, onChange, onNext, onBack }: Step3Props) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pathAnim = useRef(new Animated.Value(0)).current;

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

      // Animate the path illustration
      Animated.timing(pathAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive]);

  const canProceed = value.trim().length >= 5;

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
        <View style={styles.stepIconContainer}>
          <LinearGradient
            colors={['#6b5b7a', '#8a7a9a']}
            style={styles.stepIconGradient}
          >
            <MaterialIcons name="my-location" size={32} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Path illustration */}
        <View style={styles.pathIllustration}>
          <Animated.View
            style={[
              styles.pathDot,
              styles.pathDotStart,
              {
                opacity: pathAnim,
                transform: [{ scale: pathAnim }],
              },
            ]}
          >
            <Text style={styles.pathDotLabel}>{isRussian ? 'ТЫ' : 'YOU'}</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.pathLine,
              {
                opacity: pathAnim,
                transform: [
                  {
                    scaleX: pathAnim,
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.pathDot,
              styles.pathDotEnd,
              {
                opacity: pathAnim,
                transform: [{ scale: pathAnim }],
              },
            ]}
          >
            <MaterialIcons name="flag" size={16} color="#FFFFFF" />
          </Animated.View>
        </View>

        <Text style={styles.stepTitle}>{isRussian ? 'ТВОЯ СТАРТОВАЯ ТОЧКА' : 'YOUR STARTING POINT'}</Text>
        <Text style={styles.stepSubtitle}>
          {isRussian
            ? 'Какие важные навыки, опыт или ресурсы у тебя уже есть?'
            : 'What important skills, experience, or resources do you already have?'}
        </Text>

        <View style={styles.textAreaContainer}>
          <TextInput
            style={styles.textArea}
            placeholder={
              isRussian
                ? 'У меня есть опыт в... Я хорошо умею... Я уже знаю...'
                : 'I have experience in... I am good at... I already know...'
            }
            placeholderTextColor="rgba(52, 40, 70, 0.4)"
            value={value}
            onChangeText={onChange}
            multiline
            maxLength={250}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{value.length}/250</Text>
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
        <View style={styles.stepIconContainer}>
          <LinearGradient
            colors={['#7a6a8a', '#9a8aaa']}
            style={styles.stepIconGradient}
          >
            <MaterialIcons name="terrain" size={32} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={styles.stepTitle}>{isRussian ? 'ТВОЯ ПРОБЛЕМА' : 'YOUR CHALLENGE'}</Text>
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
        <View style={styles.stepIconContainer}>
          <LinearGradient
            colors={['#8a7a9a', '#aa9aba']}
            style={styles.stepIconGradient}
          >
            <MaterialIcons name="event" size={32} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={styles.stepTitle}>{isRussian ? 'ТВОЙ СРОК' : 'YOUR TIMELINE'}</Text>
        <Text style={styles.stepSubtitle}>
          {isRussian ? 'Когда ты хочешь увидеть ощутимый прогресс?' : 'When do you want to see meaningful progress?'}
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
                    isSelected && [styles.timelineCardSelected, { borderColor: '#342846' }],
                  ]}
                  onPress={() => onChange(timeline.id)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.timelineIconContainer,
                      { backgroundColor: isSelected ? '#342846' : 'rgba(52, 40, 70, 0.08)' },
                    ]}
                  >
                    <MaterialIcons
                      name={timeline.icon as any}
                      size={24}
                      color={isSelected ? '#FFFFFF' : '#342846'}
                    />
                  </View>
                  <View style={styles.timelineTextContainer}>
                    <Text style={[styles.timelineLabel, isSelected && { color: '#342846' }]}>
                      {timeline.label}
                    </Text>
                    <Text style={styles.timelineDescription}>{timeline.description}</Text>
                  </View>
                  {isSelected && (
                    <View style={[styles.timelineCheck, { backgroundColor: '#342846' }]}>
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    </View>
                  )}
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
          <MaterialIcons name="auto-awesome" size={18} color="#FFFFFF" />
          <Text style={styles.continueButtonText}>{isRussian ? 'Сгенерировать мои цели' : 'Generate my goals'}</Text>
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
export default function CustomPathDreamForm({ onComplete, onBack }: CustomPathDreamFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [pathData, setPathData] = useState<PathData>({
    pathName: '',
    pathDescription: '',
    startingPoint: '',
    mainObstacle: '',
    obstacleOther: undefined,
    timeline: '',
  });

  const totalSteps = 5;

  const handleNext = () => {
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
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack?.();
    }
  };

  const updatePathData = (key: keyof PathData, value: string) => {
    setPathData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                onChange={(v) => updatePathData('mainObstacle', v)}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 4 && (
              <Step5Timeline
                isActive={currentStep === 4}
                value={pathData.timeline}
                onChange={(v) => updatePathData('timeline', v)}
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
    fontFamily: 'BricolageGrotesque-Bold',
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

  // Inputs
  inputContainer: {
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
    fontSize: 18,
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
    marginBottom: 20,
  },
  suggestionLabel: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 10,
    color: 'rgba(52, 40, 70, 0.5)',
    marginBottom: 12,
    textAlign: 'center',
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
  },
  suggestionChip: {
    backgroundColor: 'rgba(52, 40, 70, 0.08)',
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
  },
  step2Subtitle: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  step2TextAreaContainer: {
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  step2PromptContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  step2PromptRow: {
    justifyContent: 'center',
    gap: 0,
  },
  step2PromptItem: {
    flex: 1,
    paddingHorizontal: 6,
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
    fontFamily: 'BricolageGrotesque-Bold',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  challengeCard: {
    width: (width - 72) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(52, 40, 70, 0.1)',
    padding: 16,
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
    height: 130,
    justifyContent: 'flex-start',
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

  // Timeline cards
  timelineContainer: {
    gap: 12,
  },
  timelineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(52, 40, 70, 0.1)',
    padding: 16,
  },
  timelineCardSelected: {
    backgroundColor: 'rgba(52, 40, 70, 0.03)',
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
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 12,
    color: '#342846',
    marginBottom: 2,
  },
  timelineDescription: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: 'rgba(52, 40, 70, 0.6)',
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
    fontFamily: 'BricolageGrotesque-Bold',
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
