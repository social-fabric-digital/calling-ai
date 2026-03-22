import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { styles } from './styles';
import { loadOnboardingAnswer, persistOnboardingAnswer } from './persistOnboardingAnswer';

interface SetbackPlanStepProps {
  onContinue: (values: string[]) => void;
}

const OPTIONS = ['why', 'trust', 'progress', 'restart', 'atlas', 'routine', 'microGoal'] as const;

export default function SetbackPlanStep({ onContinue }: SetbackPlanStepProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState('');

  useEffect(() => {
    loadOnboardingAnswer<string[] | string>('setbackPlan').then((value) => {
      if (Array.isArray(value) && value.length > 0) {
        setSelected(value[0]);
      } else if (typeof value === 'string' && value) {
        setSelected(value);
      }
    });
  }, []);

  const selectOption = async (value: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(value);
  };

  const handleContinue = async () => {
    if (!selected) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const payload = [selected];
    await persistOnboardingAnswer('setbackPlan', payload);
    onContinue(payload);
  };

  return (
    <View style={localStyles.container}>
      <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={localStyles.headerSlot}>
          <Text style={[styles.aboutYouTitle, localStyles.screenHeader]}>
            {t('onboarding.yazioFlow.setbackPlanQuestion')}
          </Text>
        </View>
        <View style={[styles.lifeContextQuestionCard, localStyles.card]}>
          <View style={styles.lifeContextOptionsContainer}>
            {OPTIONS.map((optionId) => {
              const isSelected = selected === optionId;
              return (
                <TouchableOpacity
                  key={optionId}
                  style={[styles.lifeContextOptionButton, localStyles.option, isSelected && localStyles.optionSelected]}
                  onPress={() => selectOption(optionId)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.lifeContextOptionText, localStyles.optionText]}>
                    {t(`onboarding.yazioFlow.setbackPlanOptions.${optionId}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  card: {
    marginTop: 8,
  },
  headerSlot: {
    minHeight: 120,
    justifyContent: 'flex-start',
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
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  optionSelected: {
    backgroundColor: 'rgba(186, 172, 202, 0.72)',
    borderWidth: 1.5,
    borderColor: '#342846',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 4,
  },
  optionText: {
    flex: 0,
    lineHeight: 20,
  },
  continueDisabled: {
    opacity: 0.45,
  },
  bottomButtonWrap: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
});
