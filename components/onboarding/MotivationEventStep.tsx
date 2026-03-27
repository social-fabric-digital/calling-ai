import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  isOnboardingNarrowWidth,
  ONBOARDING_QUESTION_HEADER,
  ONBOARDING_QUESTION_OPTION,
  ONBOARDING_QUESTION_OPTION_TEXT,
  ONBOARDING_QUESTION_OPTIONS_GAP,
} from './responsiveTokens';
import { styles } from './styles';
import { loadOnboardingAnswer, persistOnboardingAnswer } from './persistOnboardingAnswer';

interface MotivationEventStepProps {
  onContinue: (value: string) => void;
}

const OPTIONS = [
  'birthday',
  'career',
  'relationship',
  'deadline',
  'health',
  'trip',
  'family',
  'none',
] as const;

export default function MotivationEventStep({ onContinue }: MotivationEventStepProps) {
  const { t } = useTranslation();
  const { width: viewportWidth } = useWindowDimensions();
  const isNarrowScreen = isOnboardingNarrowWidth(viewportWidth);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    loadOnboardingAnswer<string>('motivationEvent').then((value) => {
      if (value) setSelected(value);
    });
  }, []);

  const handleSelect = async (value: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(value);
  };

  const handleContinue = async () => {
    if (!selected) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await persistOnboardingAnswer('motivationEvent', selected);
    onContinue(selected);
  };

  return (
    <View style={[localStyles.container, isNarrowScreen && localStyles.containerNarrow]}>
      <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={localStyles.headerSlot}>
          <Text style={[styles.aboutYouTitle, localStyles.screenHeader, isNarrowScreen && localStyles.screenHeaderNarrow]}>
            {t('onboarding.yazioFlow.motivationEventQuestion')}
          </Text>
        </View>
        <View style={[styles.lifeContextQuestionCard, localStyles.card]}>
          <View style={[styles.lifeContextOptionsContainer, isNarrowScreen && { gap: ONBOARDING_QUESTION_OPTIONS_GAP.narrow }]}>
            {OPTIONS.map((optionId) => {
              const isSelected = selected === optionId;
              return (
                <TouchableOpacity
                  key={optionId}
                  style={[
                    styles.lifeContextOptionButton,
                    localStyles.option,
                    isNarrowScreen && localStyles.optionNarrow,
                    isSelected && styles.lifeContextOptionSelectedSoft,
                  ]}
                  onPress={() => handleSelect(optionId)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.lifeContextOptionText,
                      localStyles.optionText,
                      isNarrowScreen && localStyles.optionTextNarrow,
                      isSelected && styles.lifeContextOptionTextSelectedSoft,
                    ]}
                  >
                    {t(`onboarding.yazioFlow.motivationEventOptions.${optionId}`)}
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
  containerNarrow: {
    paddingTop: 16,
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
    fontSize: ONBOARDING_QUESTION_HEADER.fontSize,
    lineHeight: ONBOARDING_QUESTION_HEADER.lineHeight,
    marginBottom: 0,
  },
  screenHeaderNarrow: {
    fontSize: ONBOARDING_QUESTION_HEADER.narrowFontSize,
    lineHeight: ONBOARDING_QUESTION_HEADER.narrowLineHeight,
  },
  option: {
    height: 'auto',
    minHeight: ONBOARDING_QUESTION_OPTION.minHeight,
    paddingVertical: ONBOARDING_QUESTION_OPTION.paddingVertical,
  },
  optionNarrow: {
    minHeight: ONBOARDING_QUESTION_OPTION.narrowMinHeight,
    paddingVertical: ONBOARDING_QUESTION_OPTION.narrowPaddingVertical,
  },
  optionText: {
    flex: 0,
    lineHeight: 20,
  },
  optionTextNarrow: {
    fontSize: ONBOARDING_QUESTION_OPTION_TEXT.narrowFontSize,
    lineHeight: ONBOARDING_QUESTION_OPTION_TEXT.narrowLineHeight,
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
