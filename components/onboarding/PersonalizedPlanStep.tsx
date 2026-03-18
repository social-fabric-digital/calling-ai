import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './styles';
import { HeadingStyle, BodyStyle } from '@/constants/theme';
import { persistOnboardingAnswer } from './persistOnboardingAnswer';

interface PersonalizedPlanStepProps {
  name?: string;
  clarityEstimateDays?: number;
  onContinue: () => void;
}

const BENEFIT_KEYS = ['insights', 'tracking', 'reflections', 'atlas'] as const;

function getRussianDayWord(days: number) {
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

export default function PersonalizedPlanStep({ name, clarityEstimateDays = 30, onContinue }: PersonalizedPlanStepProps) {
  const { t, i18n } = useTranslation();
  const [resolvedName, setResolvedName] = React.useState(name?.trim() || '');

  React.useEffect(() => {
    const propName = name?.trim() || '';
    if (propName) {
      setResolvedName(propName);
      return;
    }

    const loadStoredName = async () => {
      const storedName = (await AsyncStorage.getItem('userName'))?.trim() || '';
      if (storedName) setResolvedName(storedName);
    };

    void loadStoredName();
  }, [name]);

  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const estimateDays = Math.max(14, Math.min(75, Math.round(clarityEstimateDays)));
  const estimatePhrase = isRussian
    ? `примерно через ${estimateDays} ${getRussianDayWord(estimateDays)}`
    : `within about ${estimateDays} ${estimateDays === 1 ? 'day' : 'days'}`;
  const displayName = resolvedName.trim();
  const hasRealName =
    displayName.length > 0 &&
    !displayName.includes('{{') &&
    !displayName.includes('}}') &&
    !displayName.includes('{') &&
    !displayName.includes('}');
  const personalizedText = hasRealName
    ? isRussian
      ? `На основе твоих ответов, ${displayName}, мы ожидаем, что уже ${estimatePhrase} ты начнёшь чувствовать больше ясности и смысла.`
      : `Based on your answers, ${displayName}, we estimate you'll start feeling more clarity and purpose ${estimatePhrase}.`
    : isRussian
      ? `На основе твоих ответов мы ожидаем, что уже ${estimatePhrase} ты начнёшь чувствовать больше ясности и смысла.`
      : `Based on your answers, we estimate you'll start feeling more clarity and purpose ${estimatePhrase}.`;

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await persistOnboardingAnswer('personalizedPlanSeen', true);
    onContinue();
  };

  return (
    <View style={localStyles.container}>
      <View style={localStyles.headerSlot}>
        <Text style={[styles.aboutYouTitle, localStyles.screenHeader]}>
          {t('onboarding.yazioFlow.personalizedPlanHeader')}
        </Text>
      </View>
      <View style={[styles.lifeContextQuestionCard, localStyles.card]}>
        <Text style={localStyles.personalizedText}>
          {personalizedText}
        </Text>

        <View style={localStyles.benefitsList}>
          {BENEFIT_KEYS.map((key) => (
            <View key={key} style={localStyles.benefitRow}>
              <View style={localStyles.benefitIconWrap}>
                <MaterialIcons name="check" size={16} color="#FFFFFF" />
              </View>
              <Text style={localStyles.benefitText}>{t(`onboarding.yazioFlow.personalizedPlanBenefits.${key}`)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={localStyles.bottomButtonWrap} pointerEvents="box-none">
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueButtonText}>{t('onboarding.yazioFlow.startMyJourney')}</Text>
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
    minHeight: 80,
    justifyContent: 'center',
  },
  card: {
    marginTop: 8,
  },
  screenHeader: {
    fontSize: 24,
    lineHeight: 28,
    marginBottom: 0,
  },
  personalizedText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  benefitsList: {
    gap: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.16)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    columnGap: 10,
  },
  benefitIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    flex: 1,
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
