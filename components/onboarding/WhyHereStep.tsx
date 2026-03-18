import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { styles } from './styles';
import { persistOnboardingAnswer, loadOnboardingAnswer } from './persistOnboardingAnswer';

interface WhyHereStepProps {
  onContinue: (value: string) => void;
}

const OPTIONS = ['lost', 'consistency', 'transition', 'fulfilled', 'curious'] as const;

export default function WhyHereStep({ onContinue }: WhyHereStepProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    loadOnboardingAnswer<string>('whyHere').then((value) => {
      if (value) setSelected(value);
    });
  }, []);

  const onSelect = async (value: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(value);
  };

  const handleContinue = async () => {
    if (!selected) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await persistOnboardingAnswer('whyHere', selected);
    onContinue(selected);
  };

  return (
    <View style={localStyles.container}>
      <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[styles.aboutYouTitle, localStyles.screenHeader]}>
        {t('onboarding.yazioFlow.whyHereQuestion')}
      </Text>
      <View style={[styles.lifeContextQuestionCard, localStyles.card]}>
        <View style={styles.lifeContextOptionsContainer}>
          {OPTIONS.map((optionId) => {
            const isSelected = selected === optionId;
            return (
              <TouchableOpacity
                key={optionId}
                style={[
                  styles.lifeContextOptionButton,
                  localStyles.option,
                  isSelected && styles.lifeContextOptionSelectedSoft,
                ]}
                onPress={() => onSelect(optionId)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.lifeContextOptionText,
                    localStyles.optionText,
                    isSelected && styles.lifeContextOptionTextSelectedSoft,
                  ]}
                >
                  {t(`onboarding.yazioFlow.whyHereOptions.${optionId}`)}
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
