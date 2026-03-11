import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { styles } from './styles';
import { HeadingStyle, BodyStyle } from '@/constants/theme';
import { persistOnboardingAnswer } from './persistOnboardingAnswer';

interface InsightStatStepProps {
  onContinue: () => void;
}

export default function InsightStatStep({ onContinue }: InsightStatStepProps) {
  const { t } = useTranslation();
  const [displayPercent, setDisplayPercent] = useState(0);
  const countAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const countListenerId = countAnim.addListener(({ value }) => {
      setDisplayPercent(Math.round(value));
    });

    Animated.timing(countAnim, {
      toValue: 42,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    return () => {
      countAnim.removeListener(countListenerId);
      countAnim.stopAnimation();
      pulseAnim.stopAnimation();
    };
  }, [countAnim, pulseAnim]);

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await persistOnboardingAnswer('insightStatSeen', true);
    onContinue();
  };

  return (
    <View style={localStyles.container}>
      <View style={localStyles.centerContent}>
        <Animated.Text style={[localStyles.stat, { transform: [{ translateY: -100 }, { scale: pulseAnim }] }]}>
          {displayPercent}%
        </Animated.Text>
        <View style={[styles.lifeContextQuestionCard, localStyles.card]}>
          <Text style={localStyles.body}>{t('onboarding.yazioFlow.insightStatText')}</Text>
          <Image
            source={require('../../assets/images/deer.face.png')}
            style={localStyles.atlasCorner}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={localStyles.bottomButtonWrap} pointerEvents="box-none">
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueButtonText}>{t('onboarding.continue')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    marginTop: 12,
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    transform: [{ translateY: -60 }],
  },
  stat: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 64,
    lineHeight: 68,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  atlasCorner: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    width: 56,
    height: 56,
    opacity: 0.8,
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
});
