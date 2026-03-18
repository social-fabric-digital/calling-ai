import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { styles } from './styles';
import { persistOnboardingAnswer, loadOnboardingAnswer } from './persistOnboardingAnswer';
import { MoodSlider } from '@/components/MoodSlider';

interface CurrentFeelingStepProps {
  onContinue: (value: string) => void;
}

const OPTIONS = ['stuck', 'missing', 'motivated', 'overwhelmed', 'freshStart'] as const;
const OPTION_SLIDER_VALUES: Record<(typeof OPTIONS)[number], number> = {
  stuck: 10,
  missing: 30,
  overwhelmed: 50,
  motivated: 70,
  freshStart: 90,
};

const ORDERED_OPTIONS_FOR_SLIDER = [
  'stuck',
  'missing',
  'overwhelmed',
  'motivated',
  'freshStart',
] as const;

export default function CurrentFeelingStep({ onContinue }: CurrentFeelingStepProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>('');
  const [initialSliderValue, setInitialSliderValue] = useState<number>(50);

  useEffect(() => {
    loadOnboardingAnswer<string>('currentFeeling').then((value) => {
      if (value) {
        setSelected(value);
        const mappedValue = OPTION_SLIDER_VALUES[value as (typeof OPTIONS)[number]];
        if (typeof mappedValue === 'number') setInitialSliderValue(mappedValue);
      }
    });
  }, []);

  const getClosestOption = (value: number): (typeof OPTIONS)[number] => {
    let closest: (typeof OPTIONS)[number] = ORDERED_OPTIONS_FOR_SLIDER[0];
    let smallestDistance = Number.MAX_VALUE;
    ORDERED_OPTIONS_FOR_SLIDER.forEach((optionId) => {
      const distance = Math.abs(value - OPTION_SLIDER_VALUES[optionId]);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        closest = optionId;
      }
    });
    return closest;
  };

  const onSliderChange = async (value: number) => {
    const next = getClosestOption(value);
    if (next !== selected) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelected(next);
    }
  };

  const handleContinue = async () => {
    if (!selected) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await persistOnboardingAnswer('currentFeeling', selected);
    onContinue(selected);
  };

  return (
    <View style={localStyles.container}>
      <View style={localStyles.headerSlot}>
        <Text
          style={[styles.aboutYouTitle, localStyles.screenHeader]}
        >
          {t('onboarding.yazioFlow.currentFeelingQuestion')}
        </Text>
      </View>
      <View style={[styles.lifeContextQuestionCard, localStyles.card]}>
        <View style={localStyles.sliderWrap}>
          <MoodSlider
            initialValue={initialSliderValue}
            showBalloon
            onMoodChange={(_emoji, _text, value) => {
              void onSliderChange(value);
            }}
          />
        </View>
        <Text style={localStyles.selectedLabel}>
          {t(`onboarding.yazioFlow.currentFeelingOptions.${selected || 'overwhelmed'}`)}
        </Text>
      </View>

      <View style={localStyles.bottomButtonWrap} pointerEvents="box-none">
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
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  card: {
    marginTop: 8,
    minHeight: 230,
    paddingBottom: 48,
    overflow: 'visible',
    transform: [{ translateY: 70 }],
  },
  headerSlot: {
    minHeight: 120,
    justifyContent: 'center',
  },
  screenHeader: {
    fontSize: 24,
    lineHeight: 28,
    marginBottom: 0,
  },
  option: {
    height: 'auto',
    minHeight: 50,
    paddingVertical: 12,
  },
  sliderWrap: {
    paddingHorizontal: 2,
    marginTop: 78,
  },
  optionText: {
    flex: 0,
    lineHeight: 20,
    textAlign: 'center',
  },
  selectedLabel: {
    ...styles.lifeContextOptionText,
    flex: 0,
    marginTop: 6,
    textAlign: 'center',
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
