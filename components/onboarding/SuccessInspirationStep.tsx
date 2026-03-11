import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { styles } from './styles';
import { loadOnboardingAnswer, persistOnboardingAnswer } from './persistOnboardingAnswer';

interface SuccessInspirationStepProps {
  onContinue: (values: string[]) => void;
}

const OPTIONS = ['consistency', 'vision', 'support', 'belief', 'daily', 'resilience', 'planning'] as const;

export default function SuccessInspirationStep({ onContinue }: SuccessInspirationStepProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    loadOnboardingAnswer<string[] | string>('successInspiration').then((value) => {
      if (Array.isArray(value)) {
        setSelected(value);
      } else if (typeof value === 'string' && value) {
        // Backward compatibility with previously saved single-choice value.
        setSelected([value]);
      }
    });
  }, []);

  const handleSelect = async (value: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleContinue = async () => {
    if (selected.length === 0) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await persistOnboardingAnswer('successInspiration', selected);
    onContinue(selected);
  };

  return (
    <View style={localStyles.container}>
      <View style={localStyles.headerSlot}>
        <Text style={[styles.aboutYouTitle, localStyles.screenHeader]}>
          {t('onboarding.yazioFlow.successInspirationQuestion')}
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
                  isSelected && styles.lifeContextOptionSelectedSoft,
                ]}
                onPress={() => handleSelect(optionId)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.lifeContextOptionText,
                    localStyles.optionText,
                    isSelected && styles.lifeContextOptionTextSelectedSoft,
                  ]}
                >
                  {t(`onboarding.yazioFlow.successInspirationOptions.${optionId}`)}
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
    minHeight: 116,
    justifyContent: 'center',
  },
  screenHeader: {
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 4,
  },
  screenSubtitle: {
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
