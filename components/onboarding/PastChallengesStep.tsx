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
  ONBOARDING_QUESTION_SUBTITLE,
} from './responsiveTokens';
import { styles } from './styles';
import { persistOnboardingAnswer, loadOnboardingAnswer } from './persistOnboardingAnswer';

interface PastChallengesStepProps {
  name?: string;
  onContinue: (values: string[]) => void;
}

const OPTIONS = ['motivation', 'life', 'plan', 'alone', 'belief'] as const;

export default function PastChallengesStep({ onContinue }: PastChallengesStepProps) {
  const { t } = useTranslation();
  const { width: viewportWidth } = useWindowDimensions();
  const isNarrowScreen = isOnboardingNarrowWidth(viewportWidth);
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
    <View style={[localStyles.container, isNarrowScreen && localStyles.containerNarrow]}>
      <ScrollView
        contentContainerStyle={localStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={localStyles.headerSlot}>
          <Text style={[styles.aboutYouTitle, localStyles.screenHeader, isNarrowScreen && localStyles.screenHeaderNarrow]}>
            {t('onboarding.yazioFlow.pastChallengesQuestion')}
          </Text>
          <Text style={[styles.lifeContextSubtitleText, localStyles.screenSubtitle, isNarrowScreen && localStyles.screenSubtitleNarrow]}>
            {t('onboarding.yazioFlow.selectAllThatApply')}
          </Text>
        </View>
        <View style={[styles.lifeContextQuestionCard, localStyles.card]}>
          <View style={[styles.lifeContextOptionsContainer, isNarrowScreen && { gap: ONBOARDING_QUESTION_OPTIONS_GAP.narrow }]}>
            {OPTIONS.map((optionId) => {
              const isSelected = selected.includes(optionId);
              return (
                <TouchableOpacity
                  key={optionId}
                  style={[
                    styles.lifeContextOptionButton,
                    localStyles.option,
                    isNarrowScreen && localStyles.optionNarrow,
                    isSelected && localStyles.optionSelected,
                  ]}
                  onPress={() => toggleOption(optionId)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.lifeContextOptionText, localStyles.optionText, isNarrowScreen && localStyles.optionTextNarrow]}>
                    {t(`onboarding.yazioFlow.pastChallengesOptions.${optionId}`)}
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
    marginBottom: 2,
  },
  screenHeaderNarrow: {
    fontSize: ONBOARDING_QUESTION_HEADER.narrowFontSize,
    lineHeight: ONBOARDING_QUESTION_HEADER.narrowLineHeight,
  },
  screenSubtitle: {
    marginBottom: 0,
  },
  screenSubtitleNarrow: {
    fontSize: ONBOARDING_QUESTION_SUBTITLE.narrowFontSize,
    lineHeight: ONBOARDING_QUESTION_SUBTITLE.narrowLineHeight,
  },
  option: {
    height: 'auto',
    minHeight: ONBOARDING_QUESTION_OPTION.minHeight,
    paddingVertical: ONBOARDING_QUESTION_OPTION.paddingVertical,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  optionNarrow: {
    minHeight: ONBOARDING_QUESTION_OPTION.narrowMinHeight,
    paddingVertical: ONBOARDING_QUESTION_OPTION.narrowPaddingVertical,
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
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
});
