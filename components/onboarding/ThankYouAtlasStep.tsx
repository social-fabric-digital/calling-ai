import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './styles';
import { HeadingStyle, BodyStyle } from '@/constants/theme';
import {
  isOnboardingNarrowWidth,
  ONBOARDING_QUESTION_HEADER,
  ONBOARDING_QUESTION_SUBTITLE,
} from './responsiveTokens';
import { persistOnboardingAnswer } from './persistOnboardingAnswer';

interface ThankYouAtlasStepProps {
  name?: string;
  onContinue: () => void;
}
const ATLAS_BLOCK_BOTTOM_OFFSET = 140;

export default function ThankYouAtlasStep({ name, onContinue }: ThankYouAtlasStepProps) {
  const { t, i18n } = useTranslation();
  const { width: viewportWidth } = useWindowDimensions();
  const isNarrowScreen = isOnboardingNarrowWidth(viewportWidth);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const [resolvedName, setResolvedName] = React.useState(name?.trim() || '');
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    const propName = name?.trim() || '';
    if (propName) {
      setResolvedName(propName);
      return;
    }

    const loadStoredName = async () => {
      const storedName = (await AsyncStorage.getItem('userName'))?.trim() || '';
      if (storedName) setResolvedName(storedName);
    };

    void loadStoredName();
  }, [name]);

  const displayName = resolvedName.trim();
  const personalizedText = displayName
    ? isRussian
      ? `Спасибо за доверие, ${displayName}. Теперь ты готов(а) превратить эту ясность в действия.`
      : `Thank you for trusting me, ${displayName}. You're ready to turn this clarity into action.`
    : isRussian
      ? 'Спасибо за доверие. Теперь ты готов(а) превратить эту ясность в действия.'
      : "Thank you for trusting me. You're ready to turn this clarity into action.";
  const headingSubtitle = isRussian
    ? 'Ты уже проделал(а) важную работу. Осталось сделать следующий шаг.'
    : "You've already done important inner work. Now let's turn it into momentum.";

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await persistOnboardingAnswer('thankYouAtlasSeen', true);
    onContinue();
  };

  return (
    <Animated.View style={[localStyles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <Text style={[localStyles.heading, isNarrowScreen && localStyles.headingNarrow]}>
        {t('onboarding.yazioFlow.thankYouAtlasTitle')}
      </Text>
      <Text style={[localStyles.headingSubtitle, isNarrowScreen && localStyles.headingSubtitleNarrow]}>
        {headingSubtitle}
      </Text>

      <View style={localStyles.atlasStage}>
        <View style={localStyles.speechWrap}>
          <View style={[styles.lifeContextQuestionCard, localStyles.card]}>
            <Text style={localStyles.subheading}>{personalizedText}</Text>
          </View>
          <View style={localStyles.bubbleTailWrap}>
            <View style={localStyles.bubbleTailLarge} />
            <View style={localStyles.bubbleTailSmall} />
          </View>
        </View>

        <View style={localStyles.atlasWrap}>
          <Image
            source={require('../../assets/images/deer.face.png')}
            style={localStyles.atlasImage}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={localStyles.bottomButtonWrap} pointerEvents="box-none">
        <TouchableOpacity style={[styles.continueButton, localStyles.ctaButton]} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueButtonText}>{t('onboarding.yazioFlow.createMyJourney')}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  atlasStage: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: ATLAS_BLOCK_BOTTOM_OFFSET,
  },
  speechWrap: {
    width: '100%',
    marginTop: 15,
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
  },
  bubbleTailWrap: {
    alignItems: 'flex-end',
    marginTop: -2,
    paddingRight: 42,
  },
  bubbleTailLarge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.16)',
  },
  bubbleTailSmall: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.16)',
    marginTop: 4,
    marginRight: 12,
  },
  atlasWrap: {
    alignItems: 'flex-end',
    marginTop: -4,
    paddingRight: 8,
  },
  atlasImage: {
    width: 170,
    height: 170,
  },
  heading: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontSize: ONBOARDING_QUESTION_HEADER.fontSize,
    lineHeight: ONBOARDING_QUESTION_HEADER.lineHeight,
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'none',
  },
  headingNarrow: {
    fontSize: ONBOARDING_QUESTION_HEADER.narrowFontSize,
    lineHeight: ONBOARDING_QUESTION_HEADER.narrowLineHeight,
    marginBottom: 4,
  },
  headingSubtitle: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.92,
    marginBottom: 8,
    paddingHorizontal: 14,
  },
  headingSubtitleNarrow: {
    fontSize: ONBOARDING_QUESTION_SUBTITLE.narrowFontSize,
    lineHeight: ONBOARDING_QUESTION_SUBTITLE.narrowLineHeight,
    marginBottom: 4,
  },
  subheading: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomButtonWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingHorizontal: 40,
    paddingBottom: 40,
    zIndex: 1000,
  },
  ctaButton: {
    width: '100%',
  },
});
