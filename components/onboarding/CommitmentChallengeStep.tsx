import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { styles } from './styles';
import { HeadingStyle } from '@/constants/theme';
import { isOnboardingNarrowWidth, ONBOARDING_QUESTION_HEADER } from './responsiveTokens';
import { loadOnboardingAnswer, persistOnboardingAnswer } from './persistOnboardingAnswer';

interface CommitmentChallengeStepProps {
  onContinue: (value: string) => void;
}

const OPTIONS = ['3days', '7days', '14days', '30days', 'flexible'] as const;

export default function CommitmentChallengeStep({ onContinue }: CommitmentChallengeStepProps) {
  const { t } = useTranslation();
  const { width: viewportWidth } = useWindowDimensions();
  const isNarrowScreen = isOnboardingNarrowWidth(viewportWidth);
  const [selected, setSelected] = useState('');
  const pulseA = useRef(new Animated.Value(0)).current;
  const pulseB = useRef(new Animated.Value(0)).current;
  const pulseC = useRef(new Animated.Value(0)).current;
  const pulseLoopsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    loadOnboardingAnswer<string>('commitmentChallenge').then((value) => {
      if (value) setSelected(value);
    });
  }, []);

  useEffect(() => {
    pulseLoopsRef.current.forEach((loop) => loop.stop());
    pulseLoopsRef.current = [];

    const resetPulseValues = () => {
      pulseA.setValue(0);
      pulseB.setValue(0);
      pulseC.setValue(0);
    };

    if (!selected) {
      resetPulseValues();
      return;
    }

    const createPulseLoop = (value: Animated.Value, delayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(value, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const loops = [
      createPulseLoop(pulseA, 0),
      createPulseLoop(pulseB, 350),
      createPulseLoop(pulseC, 700),
    ];
    pulseLoopsRef.current = loops;
    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
      resetPulseValues();
    };
  }, [selected, pulseA, pulseB, pulseC]);

  const handleSelect = async (value: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(value);
  };

  const handleContinue = async () => {
    if (!selected) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await persistOnboardingAnswer('commitmentChallenge', selected);
    onContinue(selected);
  };

  return (
    <View style={[localStyles.container, isNarrowScreen && { paddingTop: 16 }]}>
      <View style={[localStyles.headerSlot, isNarrowScreen && { minHeight: 90 }]}>
        <Text
          style={[styles.aboutYouTitle, localStyles.screenHeader, isNarrowScreen && localStyles.screenHeaderNarrow]}
        >
          {t('onboarding.yazioFlow.commitmentChallengeQuestion')}
        </Text>
      </View>
      <View style={localStyles.centeredCardSlot}>
        <View style={[styles.lifeContextQuestionCard, localStyles.card]}>
          {Boolean(selected) && (
            <View style={localStyles.radiationLayer} pointerEvents="none">
              <View style={localStyles.glowBase} />
              {[pulseA, pulseB, pulseC].map((pulse, index) => (
                <Animated.View
                  key={`radiation-${index}`}
                  style={[
                    localStyles.radiationGlow,
                    {
                      opacity: pulse.interpolate({
                        inputRange: [0, 0.18, 1],
                        outputRange: [0, 0.22, 0],
                      }),
                      transform: [
                        {
                          scale: pulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.72, 2.15],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ))}
            </View>
          )}
          <View style={localStyles.pillWrap}>
            {OPTIONS.map((optionId) => {
              const isSelected = selected === optionId;
              return (
                <TouchableOpacity
                  key={optionId}
                  style={[localStyles.pill, isSelected && localStyles.pillSelected]}
                  onPress={() => handleSelect(optionId)}
                  activeOpacity={0.85}
                >
                  <Text style={[localStyles.pillText, isSelected && localStyles.pillTextSelected]}>
                    {t(`onboarding.yazioFlow.commitmentChallengeOptions.${optionId}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
      <View style={localStyles.bottomButtonWrap}>
        <TouchableOpacity
          style={[styles.continueButton, !selected && localStyles.continueDisabled]}
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={!selected}
        >
          <Text style={styles.continueButtonText}>{t('onboarding.continue')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 0,
  },
  card: {
    overflow: 'visible',
  },
  centeredCardSlot: {
    flex: 1,
    justifyContent: 'center',
  },
  headerSlot: {
    minHeight: 120,
    justifyContent: 'flex-start',
  },
  screenHeader: {
    fontSize: ONBOARDING_QUESTION_HEADER.fontSize,
    lineHeight: ONBOARDING_QUESTION_HEADER.lineHeight,
    marginBottom: 2,
  },
  screenHeaderNarrow: {
    fontSize: ONBOARDING_QUESTION_HEADER.narrowFontSize,
    lineHeight: ONBOARDING_QUESTION_HEADER.narrowLineHeight,
  },
  challengeHeader: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 0,
    textTransform: 'none',
    marginTop: 40,
  },
  pillWrap: {
    zIndex: 2,
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  radiationLayer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 1,
  },
  glowBase: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: 'rgba(131, 98, 171, 0.2)',
    shadowColor: '#6D45A0',
    shadowOpacity: 0.38,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  radiationGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 999,
    backgroundColor: 'rgba(166, 129, 214, 0.26)',
    shadowColor: '#8D5ED0',
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  pill: {
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.25)',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  pillSelected: {
    backgroundColor: 'rgba(186, 172, 202, 0.72)',
    borderWidth: 1.5,
    borderColor: '#342846',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 4,
  },
  pillText: {
    ...styles.lifeContextOptionText,
    flex: 0,
    color: '#342846',
  },
  pillTextSelected: {
    color: '#342846',
    fontWeight: '600',
  },
  continueDisabled: {
    opacity: 0.45,
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
