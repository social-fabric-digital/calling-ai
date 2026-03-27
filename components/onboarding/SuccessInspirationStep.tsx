import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  isOnboardingNarrowWidth,
  ONBOARDING_QUESTION_HEADER,
  ONBOARDING_QUESTION_OPTION,
  ONBOARDING_QUESTION_OPTION_TEXT,
  ONBOARDING_QUESTION_OPTIONS_GAP,
} from './responsiveTokens';
import { styles } from './styles';
import { loadOnboardingAnswer, persistOnboardingAnswer } from './persistOnboardingAnswer';

interface SuccessInspirationStepProps {
  onContinue: (values: string[]) => void;
}

const OPTIONS = ['consistency', 'vision', 'support', 'belief', 'daily', 'resilience', 'planning'] as const;

export default function SuccessInspirationStep({ onContinue }: SuccessInspirationStepProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const isNarrowScreen = isOnboardingNarrowWidth(viewportWidth);
  const isCompactScreen = isNarrowScreen;
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

  const optionItems = OPTIONS.map((optionId) => {
    const isSelected = selected.includes(optionId);
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
          {t(`onboarding.yazioFlow.successInspirationOptions.${optionId}`)}
        </Text>
      </TouchableOpacity>
    );
  });

  return (
    <View style={[localStyles.container, isNarrowScreen && { paddingTop: 16 }]}>
      {isCompactScreen ? (
        <ScrollView
          contentContainerStyle={[
            localStyles.scrollContent,
            { paddingBottom: 172 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[localStyles.headerSlot, isNarrowScreen && { minHeight: 86 }]}>
            <Text style={[styles.aboutYouTitle, localStyles.screenHeader, isNarrowScreen && localStyles.screenHeaderNarrow]}>
              {t('onboarding.yazioFlow.successInspirationQuestion')}
            </Text>
            <Text style={[styles.lifeContextSubtitleText, localStyles.screenSubtitle]}>
              {t('onboarding.yazioFlow.selectAllThatApply')}
            </Text>
          </View>
          <View style={[styles.lifeContextQuestionCard, localStyles.card]}>
            <View style={[styles.lifeContextOptionsContainer, isNarrowScreen && { gap: ONBOARDING_QUESTION_OPTIONS_GAP.narrow }]}>
              {optionItems}
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={localStyles.nonCompactContent}>
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
              {optionItems}
            </View>
          </View>
        </View>
      )}
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
  nonCompactContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  headerSlot: {
    minHeight: 116,
    justifyContent: 'flex-start',
  },
  screenHeader: {
    fontSize: ONBOARDING_QUESTION_HEADER.fontSize,
    lineHeight: ONBOARDING_QUESTION_HEADER.lineHeight,
    marginBottom: 4,
  },
  screenHeaderNarrow: {
    fontSize: ONBOARDING_QUESTION_HEADER.narrowFontSize,
    lineHeight: ONBOARDING_QUESTION_HEADER.narrowLineHeight,
  },
  screenSubtitle: {
    marginBottom: 0,
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
