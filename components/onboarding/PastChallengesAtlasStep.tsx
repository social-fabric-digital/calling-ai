import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { styles } from './styles';
import { HeadingStyle, BodyStyle } from '@/constants/theme';
import { persistOnboardingAnswer } from './persistOnboardingAnswer';

interface PastChallengesAtlasStepProps {
  onContinue: () => void;
}

export default function PastChallengesAtlasStep({ onContinue }: PastChallengesAtlasStepProps) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
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

  const heading = isRussian ? 'МЫ СПРАВИМСЯ ВМЕСТЕ' : 'WE WILL WORK THROUGH THIS TOGETHER';
  const message = isRussian
    ? 'Не переживай - если эти трудности снова появятся, мы пройдём через них вместе шаг за шагом.'
    : "Don't worry - if these challenges show up again, we will work through them together step by step.";

  return (
    <Animated.View style={[localStyles.container, { opacity: fadeAnim }]}>
      <Text style={localStyles.heading}>{heading}</Text>

      <Animated.View style={[localStyles.speechWrap, { transform: [{ scale: bubbleAnim }, { translateY: 70 }] }]}>
        <View style={[styles.lifeContextQuestionCard, localStyles.card]}>
          <Text style={localStyles.subheading}>{message}</Text>
        </View>
        <View style={localStyles.bubbleTailWrap}>
          <View style={localStyles.bubbleTailLarge} />
          <View style={localStyles.bubbleTailSmall} />
        </View>
      </Animated.View>

      <Animated.View style={[localStyles.atlasWrap, { transform: [{ translateY: atlasFloatAnim }, { translateY: 70 }] }]}>
        <Image
          source={require('../../assets/images/deer.face.png')}
          style={localStyles.atlasImage}
          resizeMode="contain"
        />
      </Animated.View>

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
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  speechWrap: {
    width: '100%',
    marginTop: 20,
  },
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  subheading: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    lineHeight: 24,
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.16)',
  },
  bubbleTailSmall: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
