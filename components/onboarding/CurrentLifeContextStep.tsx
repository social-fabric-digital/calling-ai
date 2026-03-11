import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const { t } = useTranslation();
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
      <View style={localStyles.headerSlot}>
        <Text style={[styles.aboutYouTitle, localStyles.screenHeader]} numberOfLines={2}>
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
                style={[
                  styles.lifeContextOptionButton,
                  localStyles.option,
                  isSelected && styles.lifeContextOptionSelectedSoft,
                ]}
                onPress={() => handleSelect(option.id)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.lifeContextOptionText,
                    localStyles.optionText,
                    isSelected && styles.lifeContextOptionTextSelectedSoft,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
  headerSlot: {
    height: 80,
    justifyContent: 'center',
  },
  screenHeader: {
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 0,
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

export default CurrentLifeContextStep;
