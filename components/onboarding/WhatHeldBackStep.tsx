import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { styles } from './styles';
import { persistOnboardingAnswer, loadOnboardingAnswer } from './persistOnboardingAnswer';

interface WhatHeldBackStepProps {
  onContinue: (values: string[]) => void;
}

const OPTIONS = ['clarity', 'fear', 'motivation', 'responsibilities', 'selfTalk', 'finish'] as const;

export default function WhatHeldBackStep({ onContinue }: WhatHeldBackStepProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    loadOnboardingAnswer<string[]>('whatHeldBack').then((value) => {
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
    await persistOnboardingAnswer('whatHeldBack', selected);
    onContinue(selected);
  };

  return (
    <View style={localStyles.container}>
      <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={localStyles.headerSlot}>
          <Text style={[styles.aboutYouTitle, localStyles.screenHeader]}>
            {t('onboarding.yazioFlow.whatHeldBackQuestion')}
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
                  style={[styles.lifeContextOptionButton, localStyles.option, isSelected && localStyles.optionSelected]}
                  onPress={() => toggleOption(optionId)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.lifeContextOptionText, localStyles.optionText]}>
                    {t(`onboarding.yazioFlow.whatHeldBackOptions.${optionId}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View style={localStyles.bottomButtonWrap}>
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
    minHeight: 80,
    justifyContent: 'flex-start',
  },
  screenHeader: {
    fontSize: 24,
    lineHeight: 28,
    marginBottom: 4,
  },
  screenSubtitle: {
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
