import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { hapticLight, hapticMedium } from '@/utils/haptics';
import { getLifeContextQuestions } from './constants';
import { styles } from './styles';
import { CurrentLifeContextStepProps } from './types';

function CurrentLifeContextStep({
  currentSituation,
  setCurrentSituation,
  setBiggestConstraint,
  setWhatMattersMost,
  onContinue,
}: CurrentLifeContextStepProps) {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const situationQuestion = useMemo(
    () => getLifeContextQuestions(t).find((question) => question.id === 'situation'),
    [t]
  );

  const [selected, setSelected] = useState(currentSituation || '');

  useEffect(() => {
    // This step is intentionally reduced to the single "current situation" answer.
    setBiggestConstraint('');
    setWhatMattersMost([]);
  }, [setBiggestConstraint, setWhatMattersMost]);

  useEffect(() => {
    const loadSavedSituation = async () => {
      try {
        const saved = await AsyncStorage.getItem('lifeContextSituation');
        if (!saved) return;
        const parsed = JSON.parse(saved);
        const value = Array.isArray(parsed) ? parsed[0] : '';
        if (value) {
          setSelected(value);
          setCurrentSituation(value);
        }
      } catch {
        // Ignore malformed storage and continue with current state.
      }
    };

    void loadSavedSituation();
  }, [setCurrentSituation]);

  const handleSelect = (value: string) => {
    void hapticLight();
    setSelected(value);
    setCurrentSituation(value);
  };

  const handleContinue = async () => {
    if (!selected) return;
    void hapticMedium();
    try {
      await AsyncStorage.setItem('lifeContextSituation', JSON.stringify([selected]));
      await AsyncStorage.multiRemove(['lifeContextConstraint', 'lifeContextMatters']);
    } catch {
      // Continue even if local persistence fails.
    }
    onContinue();
  };

  const questionText = t('onboarding.currentSituationQuestion');
  const options = situationQuestion?.options ?? [];

  return (
    <View style={localStyles.container}>
      <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[localStyles.headerSlot, isRussian && localStyles.headerSlotRussian]}>
          <Text style={[styles.aboutYouTitle, localStyles.screenHeader, isRussian && localStyles.screenHeaderRussian]}>
            {questionText}
          </Text>
        </View>
        <View style={[styles.lifeContextQuestionCard, localStyles.card]}>
          <View style={styles.lifeContextOptionsContainer}>
            {options.map((option) => {
              const isSelected = selected === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.lifeContextOptionButton, localStyles.option, isSelected && styles.lifeContextOptionSelectedSoft]}
                  onPress={() => handleSelect(option.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.lifeContextOptionText, localStyles.optionText, isSelected && styles.lifeContextOptionTextSelectedSoft]}>
                    {option.label}
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
  headerSlot: {
    minHeight: 80,
    justifyContent: 'center',
  },
  headerSlotRussian: {
    minHeight: 116,
  },
  screenHeader: {
    fontSize: 24,
    lineHeight: 28,
    marginBottom: 0,
  },
  screenHeaderRussian: {
    fontSize: 22,
    lineHeight: 26,
  },
  card: {
    marginTop: 8,
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

export default CurrentLifeContextStep;
