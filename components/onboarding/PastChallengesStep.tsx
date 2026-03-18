import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { styles } from './styles';
import { persistOnboardingAnswer, loadOnboardingAnswer } from './persistOnboardingAnswer';

interface PastChallengesStepProps {
  name?: string;
  onContinue: (values: string[]) => void;
}

const OPTIONS = ['motivation', 'life', 'plan', 'alone', 'belief'] as const;

export default function PastChallengesStep({ onContinue }: PastChallengesStepProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    loadOnboardingAnswer<string[]>('pastChallenges').then((value) => {
      if (Array.isArray(value)) setSelected(value);
    });
  }, []);

  const toggleOption = async (value: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleContinue = async () => {
    if (selected.length === 0) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await persistOnboardingAnswer('pastChallenges', selected);
    onContinue(selected);
  };

  return (
    <View style={localStyles.container}>
      <View style={localStyles.headerSlot}>
        <Text
          style={[styles.aboutYouTitle, localStyles.screenHeader]}
        >
          {t('onboarding.yazioFlow.pastChallengesQuestion')}
        </Text>
        <Text style={[styles.lifeContextSubtitleText, localStyles.screenSubtitle]}>
          {t('onboarding.yazioFlow.selectAllThatApply')}
        </Text>
      </View>
      <View style={[styles.lifeContextQuestionCard, localStyles.card]}>
        <View style={styles.lifeContextOptionsContainer}>
          {OPTIONS.map((optionId) => {
            const isSelected = selected.includes(optionId);
            return (
              <TouchableOpacity
                key={optionId}
                style={[
                  styles.lifeContextOptionButton,
                  localStyles.option,
                  isSelected && localStyles.optionSelected,
                ]}
                onPress={() => toggleOption(optionId)}
                activeOpacity={0.85}
              >
                <Text style={[styles.lifeContextOptionText, localStyles.optionText]}>
                  {t(`onboarding.yazioFlow.pastChallengesOptions.${optionId}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={localStyles.bottomButtonWrap} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.continueButton, selected.length === 0 && localStyles.continueDisabled]}
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={selected.length === 0}
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
  },
  headerSlot: {
    minHeight: 148,
    justifyContent: 'center',
  },
  screenHeader: {
    fontSize: 24,
    lineHeight: 28,
    marginBottom: 2,
  },
  screenSubtitle: {
    marginBottom: 0,
  },
  option: {
    height: 'auto',
    minHeight: 50,
    paddingVertical: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  optionSelected: {
    backgroundColor: 'rgba(186, 172, 202, 0.45)',
    borderColor: '#342846',
  },
  optionText: {
    flex: 0,
    lineHeight: 20,
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
