import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { styles } from './styles';
import { HeadingStyle, BodyStyle } from '@/constants/theme';
import {
  isOnboardingNarrowWidth,
  ONBOARDING_QUESTION_HEADER,
  ONBOARDING_QUESTION_OPTION_TEXT,
  ONBOARDING_QUESTION_SUBTITLE,
} from './responsiveTokens';
import { persistOnboardingAnswer } from './persistOnboardingAnswer';

interface PastChallengesAtlasStepProps {
  onContinue: () => void;
}
const ATLAS_BLOCK_BOTTOM_OFFSET = 140;

export default function PastChallengesAtlasStep({ onContinue }: PastChallengesAtlasStepProps) {
  const { i18n } = useTranslation();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const isCompactScreen = viewportHeight < 760;
  const isNarrowScreen = isOnboardingNarrowWidth(viewportWidth);
  const atlasImageSize = Math.min(280, Math.max(180, viewportWidth * (isNarrowScreen ? 0.52 : 0.68)));
  const atlasImageTopMargin = isNarrowScreen ? -8 : isCompactScreen ? -18 : -12;
  const atlasImageBottomMargin = isNarrowScreen ? 6 : isCompactScreen ? 4 : 14;
  const thoughtBubbleWidth = Math.min(viewportWidth - 40, 420);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0.96)).current;
  const atlasFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(bubbleAnim, {
        toValue: 1,
        tension: 70,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(atlasFloatAnim, {
          toValue: -6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(atlasFloatAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();

    return () => {
      floatLoop.stop();
    };
  }, [atlasFloatAnim, bubbleAnim, fadeAnim]);

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await persistOnboardingAnswer('pastChallengesAtlasSeen', true);
    onContinue();
  };

  const heading = isRussian ? 'Мы справимся вместе' : 'We will work through this together';
  const headingSubtitle = isRussian
    ? 'Ты уже сделал(а) важный шаг. Вместе мы пройдём через любые сложности.'
    : "You've already taken an important step. Together, we'll move through any challenge.";
  const message = isRussian
    ? 'Не переживай - если эти трудности снова появятся, мы пройдём через них вместе шаг за шагом.'
    : "Don't worry - if these challenges show up again, we will work through them together step by step.";

  return (
    <Animated.View style={[localStyles.container, { opacity: fadeAnim, paddingTop: isNarrowScreen ? 16 : 30 }]}>
      <Text style={[localStyles.heading, isNarrowScreen && localStyles.headingNarrow]}>{heading}</Text>
      <Text style={[localStyles.headingSubtitle, isNarrowScreen && localStyles.headingSubtitleNarrow]}>{headingSubtitle}</Text>

      <View style={[localStyles.atlasStage, { marginBottom: isNarrowScreen ? 110 : 140 }]}>
        <View style={localStyles.atlasWrap}>
          <Animated.View style={[localStyles.thoughtBubbleWrap, { transform: [{ scale: bubbleAnim }] }]}>
            <View style={[localStyles.introField, { width: thoughtBubbleWidth, alignSelf: 'center' }]}>
              <Text style={[localStyles.subheading, isNarrowScreen && localStyles.subheadingNarrow]}>{message}</Text>
            </View>
            <View style={localStyles.tailBubbleStack}>
              <View style={[localStyles.tailBubble, localStyles.tailBubbleLarge]} />
              <View style={[localStyles.tailBubble, localStyles.tailBubbleMedium]} />
              <View style={[localStyles.tailBubble, localStyles.tailBubbleSmall]} />
            </View>
          </Animated.View>
          <Animated.View style={{ transform: [{ translateY: atlasFloatAnim }] }}>
            <Image
              source={require('../../assets/images/full.deer.png')}
              style={[
                localStyles.atlasImage,
                {
                  width: atlasImageSize,
                  height: atlasImageSize,
                  marginTop: atlasImageTopMargin,
                  marginBottom: atlasImageBottomMargin,
                },
              ]}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </View>

      <View style={localStyles.bottomButtonWrap} pointerEvents="box-none">
        <TouchableOpacity style={[styles.continueButton, localStyles.ctaButton]} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueButtonText}>{isRussian ? 'Продолжить' : 'Continue'}</Text>
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
  heading: {
    ...HeadingStyle,
    color: '#FFFFFF',
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
    textAlign: 'center',
    opacity: 0.92,
    lineHeight: 22,
    marginBottom: 8,
    paddingHorizontal: 14,
  },
  headingSubtitleNarrow: {
    fontSize: ONBOARDING_QUESTION_SUBTITLE.narrowFontSize,
    lineHeight: ONBOARDING_QUESTION_SUBTITLE.narrowLineHeight,
    marginBottom: 4,
  },
  atlasStage: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: ATLAS_BLOCK_BOTTOM_OFFSET,
  },
  subheading: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    lineHeight: 24,
  },
  subheadingNarrow: {
    fontSize: ONBOARDING_QUESTION_OPTION_TEXT.narrowFontSize + 2,
    lineHeight: ONBOARDING_QUESTION_OPTION_TEXT.narrowLineHeight + 1,
  },
  thoughtBubbleWrap: {
    width: '100%',
    alignItems: 'center',
    alignSelf: 'center',
    zIndex: 2,
    marginTop: 15,
  },
  introField: {
    backgroundColor: 'rgba(255, 255, 255, 0.93)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.22)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tailBubbleStack: {
    width: 120,
    alignItems: 'center',
    marginTop: 4,
  },
  tailBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.93)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.16)',
    borderRadius: 999,
  },
  tailBubbleLarge: {
    width: 18,
    height: 18,
  },
  tailBubbleMedium: {
    width: 12,
    height: 12,
    marginTop: 4,
    marginLeft: 20,
  },
  tailBubbleSmall: {
    width: 8,
    height: 8,
    marginTop: 4,
    marginLeft: 34,
  },
  atlasWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0,
  },
  atlasImage: {
    width: 358,
    height: 358,
    marginTop: -12,
    marginBottom: 14,
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
