import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import PathExplorationStep from '@/components/onboarding/PathExplorationStep';
import PathsAlignedStep from '@/components/onboarding/PathsAlignedStep';
import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { GeneratedPath, generateGoalSteps, generateUnifiedDestinyProfile } from '@/utils/claudeApi';

type ProfileContext = {
  birthMonth: string;
  birthDate: string;
  birthYear: string;
  birthCity: string;
  birthHour: string;
  birthMinute: string;
  birthPeriod: string;
  whatYouLove: string;
  whatYouGoodAt: string;
  whatWorldNeeds: string;
  whatCanBePaidFor: string;
  fear: string;
  whatExcites: string;
  currentSituation: string;
  biggestConstraint: string;
  whatMattersMost: string[];
};

const AI_DIRECTIONS_REGEN_TRACKING_KEY = 'aiDirectionsRegenerationsByMonth';
const AI_GOALS_REGEN_TRACKING_KEY = 'aiGoalsRegenerationsByMonth';
const MONTHLY_REGEN_LIMIT = 3;
const fallbackStepNames = ['Foundation', 'Skill Building', 'Momentum', 'Execution'];

const getFallbackSteps = (goalTitle: string) =>
  fallbackStepNames.map((name, index) => ({
    name,
    description: `Complete ${name.toLowerCase()} to move toward ${goalTitle.toLowerCase()}.`,
    order: index + 1,
    number: index + 1,
    text: name,
  }));

const parseWhatMattersMost = (rawValue: string | null): string[] => {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    // Fallback to plain-text parsing
  }
  return rawValue.split(',').map((item) => item.trim()).filter(Boolean);
};

const loadProfileContext = async (): Promise<ProfileContext> => {
  const entries = await AsyncStorage.multiGet([
    'birthMonth',
    'birthDate',
    'birthYear',
    'birthCity',
    'birthHour',
    'birthMinute',
    'birthPeriod',
    'ikigaiWhatYouLove',
    'ikigaiWhatYouGoodAt',
    'ikigaiWhatWorldNeeds',
    'ikigaiWhatCanBePaidFor',
    'fear',
    'whatExcites',
    'currentSituation',
    'biggestConstraint',
    'whatMattersMost',
  ]);

  const map = new Map(entries);
  return {
    birthMonth: map.get('birthMonth') || '',
    birthDate: map.get('birthDate') || '',
    birthYear: map.get('birthYear') || '',
    birthCity: map.get('birthCity') || '',
    birthHour: map.get('birthHour') || '',
    birthMinute: map.get('birthMinute') || '',
    birthPeriod: map.get('birthPeriod') || '',
    whatYouLove: map.get('ikigaiWhatYouLove') || '',
    whatYouGoodAt: map.get('ikigaiWhatYouGoodAt') || '',
    whatWorldNeeds: map.get('ikigaiWhatWorldNeeds') || '',
    whatCanBePaidFor: map.get('ikigaiWhatCanBePaidFor') || '',
    fear: map.get('fear') || '',
    whatExcites: map.get('whatExcites') || '',
    currentSituation: map.get('currentSituation') || '',
    biggestConstraint: map.get('biggestConstraint') || '',
    whatMattersMost: parseWhatMattersMost(map.get('whatMattersMost') || ''),
  };
};

export default function AIGoalPickerScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const isRussian = useMemo(() => i18n.language?.toLowerCase().startsWith('ru'), [i18n.language]);
  const tr = (en: string, ru: string) => (isRussian ? ru : en);

  const [profile, setProfile] = useState<ProfileContext | null>(null);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedPath, setSelectedPath] = useState<GeneratedPath | null>(null);
  const [pathsVersion, setPathsVersion] = useState(0);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [regenerationsThisMonth, setRegenerationsThisMonth] = useState(0);
  const [goalRegenerationsThisMonth, setGoalRegenerationsThisMonth] = useState(0);
  const [goalRegenTrigger, setGoalRegenTrigger] = useState(0);

  const generatedPathsRef = useRef<GeneratedPath[]>([]);

  const getCurrentMonthKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const loadRegenerationCount = async () => {
    try {
      const monthKey = getCurrentMonthKey();
      const raw = await AsyncStorage.getItem(AI_DIRECTIONS_REGEN_TRACKING_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const count = Number(parsed?.[monthKey] || 0);
      setRegenerationsThisMonth(Number.isFinite(count) ? count : 0);
    } catch {
      setRegenerationsThisMonth(0);
    }
  };

  const loadGoalRegenerationCount = async () => {
    try {
      const monthKey = getCurrentMonthKey();
      const raw = await AsyncStorage.getItem(AI_GOALS_REGEN_TRACKING_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const count = Number(parsed?.[monthKey] || 0);
      setGoalRegenerationsThisMonth(Number.isFinite(count) ? count : 0);
    } catch {
      setGoalRegenerationsThisMonth(0);
    }
  };

  const incrementRegenerationCount = async () => {
    const monthKey = getCurrentMonthKey();
    const raw = await AsyncStorage.getItem(AI_DIRECTIONS_REGEN_TRACKING_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const nextCount = Number(parsed?.[monthKey] || 0) + 1;
    parsed[monthKey] = nextCount;
    await AsyncStorage.setItem(AI_DIRECTIONS_REGEN_TRACKING_KEY, JSON.stringify(parsed));
    setRegenerationsThisMonth(nextCount);
  };

  const incrementGoalRegenerationCount = async () => {
    const monthKey = getCurrentMonthKey();
    const raw = await AsyncStorage.getItem(AI_GOALS_REGEN_TRACKING_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const nextCount = Number(parsed?.[monthKey] || 0) + 1;
    parsed[monthKey] = nextCount;
    await AsyncStorage.setItem(AI_GOALS_REGEN_TRACKING_KEY, JSON.stringify(parsed));
    setGoalRegenerationsThisMonth(nextCount);
  };

  const generateAndPersistPaths = async (ctx: ProfileContext, mode: 'initial' | 'regenerate') => {
    if (mode === 'regenerate' && regenerationsThisMonth >= MONTHLY_REGEN_LIMIT) {
      Alert.alert(
        tr('Monthly limit reached', 'Достигнут лимит месяца'),
        tr(
          'You can regenerate directions up to 3 times per month.',
          'Перегенерация направлений доступна до 3 раз в месяц.'
        )
      );
      return;
    }

    setErrorMessage('');
    try {
      const profileData = await generateUnifiedDestinyProfile(
        ctx.birthMonth || undefined,
        ctx.birthDate || undefined,
        ctx.birthYear || undefined,
        ctx.birthCity || undefined,
        ctx.birthHour || undefined,
        ctx.birthMinute || undefined,
        ctx.birthPeriod || undefined,
        ctx.whatYouLove || undefined,
        ctx.whatYouGoodAt || undefined,
        ctx.whatWorldNeeds || undefined,
        ctx.whatCanBePaidFor || undefined,
        ctx.fear || undefined,
        ctx.whatExcites || undefined,
        ctx.currentSituation || undefined,
        ctx.biggestConstraint || undefined,
        ctx.whatMattersMost
      );

      const nextPaths = profileData.paths || [];
      generatedPathsRef.current = nextPaths;
      setSelectedPath(null);

      // Keep shared onboarding data key in sync so onboarding component renders identical cards.
      await AsyncStorage.setItem('destinyProfile_paths', JSON.stringify(nextPaths));

      if (mode === 'regenerate') {
        await incrementRegenerationCount();
      }

      setPathsVersion((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to generate AI paths:', error);
      setErrorMessage(
        tr(
          'Could not generate your personalized paths right now. Please try again.',
          'Не удалось создать персональные пути прямо сейчас. Попробуй еще раз.'
        )
      );
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      setIsBootLoading(true);
      try {
        const ctx = await loadProfileContext();
        setProfile(ctx);
        await loadRegenerationCount();
        await loadGoalRegenerationCount();
        await generateAndPersistPaths(ctx, 'initial');
      } finally {
        setIsBootLoading(false);
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegenerateGoalsOnly = async () => {
    if (goalRegenerationsThisMonth >= MONTHLY_REGEN_LIMIT) {
      Alert.alert(
        tr('Monthly limit reached', 'Достигнут лимит месяца'),
        tr(
          'You can regenerate goals up to 3 times per month.',
          'Перегенерация целей доступна до 3 раз в месяц.'
        )
      );
      return;
    }
    await incrementGoalRegenerationCount();
    setGoalRegenTrigger((prev) => prev + 1);
  };

  const handleStartJourney = async (goalTitle?: string) => {
    if (!profile || !selectedPath || isSavingGoal) return;
    const safeGoalTitle = (goalTitle || '').trim() || selectedPath.title;

    setIsSavingGoal(true);
    try {
      let aiEstimatedDuration = '';
      let steps = getFallbackSteps(safeGoalTitle);

      try {
        const generated = await generateGoalSteps(
          safeGoalTitle,
          profile.birthMonth || '1',
          profile.birthDate || '1',
          profile.birthYear || '2000',
          profile.birthCity || undefined,
          profile.birthHour || undefined,
          profile.birthMinute || undefined,
          profile.birthPeriod || undefined,
          profile.whatYouLove || undefined,
          profile.whatYouGoodAt || undefined,
          profile.whatWorldNeeds || undefined,
          profile.whatCanBePaidFor || undefined,
          profile.fear || undefined,
          profile.whatExcites || undefined,
          selectedPath.title,
          selectedPath.description
        );

        aiEstimatedDuration = generated.estimatedDuration || '';
        if (Array.isArray(generated.steps) && generated.steps.length > 0) {
          steps = generated.steps.map((step: any, index: number) => {
            const rawName = step?.name || step?.text || '';
            const cleanName = String(rawName).trim() || fallbackStepNames[index] || `Step ${index + 1}`;
            return {
              name: cleanName,
              description:
                String(step?.description || '').trim() ||
                `Complete ${cleanName.toLowerCase()} to move forward.`,
              order: Number(step?.order) || index + 1,
              number: Number(step?.number) || index + 1,
              text: cleanName,
            };
          });
        }
      } catch (error) {
        console.warn('Failed to generate AI steps, fallback steps used:', error);
      }

      const existingGoalsRaw = await AsyncStorage.getItem('userGoals');
      const existingGoals = existingGoalsRaw ? JSON.parse(existingGoalsRaw) : [];
      const activeGoals = existingGoals.filter((item: any) => item.isActive === true);
      const isQueued = activeGoals.length >= 3;

      const goalToSave = {
        id: Date.now().toString(),
        name: safeGoalTitle,
        steps,
        numberOfSteps: steps.length,
        estimatedDuration: aiEstimatedDuration || tr('1-2 months', '1-2 месяца'),
        aiEstimatedDuration: aiEstimatedDuration || undefined,
        hardnessLevel: 'Medium',
        fear: profile.fear || tr('Fear of failure', 'Страх неудачи'),
        progressPercentage: 0,
        isActive: !isQueued,
        isQueued,
        isAiGenerated: true,
        createdAt: new Date().toISOString(),
        currentStepIndex: -1,
        pathName: selectedPath.title,
        pathDescription: selectedPath.description,
      };

      await AsyncStorage.setItem('userGoals', JSON.stringify([goalToSave, ...existingGoals]));
      Alert.alert(
        tr('Goal created', 'Цель создана'),
        isQueued
          ? tr(
              'Your goal was added to queue because you already have 3 active goals.',
              'Цель добавлена в очередь, потому что у тебя уже 3 активные цели.'
            )
          : tr(
              'Your new goal is now active and ready to start.',
              'Твоя новая цель активна и готова к старту.'
            )
      );
      router.back();
    } catch (error) {
      console.error('Failed to save AI goal:', error);
      Alert.alert(
        tr('Could not save goal', 'Не удалось сохранить цель'),
        tr('Please try again in a moment.', 'Попробуй снова через минуту.')
      );
    } finally {
      setIsSavingGoal(false);
    }
  };

  if (isBootLoading || !profile) {
    return (
      <PaperTextureBackground>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#342846" />
          <Text style={styles.stateText}>{tr('Preparing your directions...', 'Готовим ваши направления...')}</Text>
        </View>
      </PaperTextureBackground>
    );
  }

  return (
    <PaperTextureBackground>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (selectedPath) {
                setSelectedPath(null);
                return;
              }
              router.back();
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#342846" />
          </TouchableOpacity>
          <View style={styles.topSpacer} />
        </View>

        {!!errorMessage && !selectedPath ? (
          <View style={styles.centerState}>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => generateAndPersistPaths(profile, 'initial')}>
              <Text style={styles.retryButtonText}>{tr('Try again', 'Попробовать снова')}</Text>
            </TouchableOpacity>
          </View>
        ) : selectedPath ? (
          <PathExplorationStep
            pathName={selectedPath.title}
            pathDescription={selectedPath.description}
            birthMonth={profile.birthMonth || undefined}
            birthDate={profile.birthDate || undefined}
            birthYear={profile.birthYear || undefined}
            birthCity={profile.birthCity || undefined}
            birthHour={profile.birthHour || undefined}
            birthMinute={profile.birthMinute || undefined}
            birthPeriod={profile.birthPeriod || undefined}
            whatYouLove={profile.whatYouLove || undefined}
            whatYouGoodAt={profile.whatYouGoodAt || undefined}
            whatWorldNeeds={profile.whatWorldNeeds || undefined}
            whatCanBePaidFor={profile.whatCanBePaidFor || undefined}
            fear={profile.fear || undefined}
            whatExcites={profile.whatExcites || undefined}
            hideCustomPathOption={true}
            regenerateGoalsTrigger={goalRegenTrigger}
            customBottomActionLabel={tr('Choose another goal', 'Выбрать другую цель')}
            customBottomActionHint={tr(
              `You have ${goalRegenerationsThisMonth}/${MONTHLY_REGEN_LIMIT} goal regenerations this month.`,
              `У тебя ${goalRegenerationsThisMonth}/${MONTHLY_REGEN_LIMIT} перегенераций целей в этом месяце.`
            )}
            customBottomActionDisabled={goalRegenerationsThisMonth >= MONTHLY_REGEN_LIMIT}
            onCustomBottomActionPress={handleRegenerateGoalsOnly}
            onStartJourney={(_, goalTitle) => handleStartJourney(goalTitle)}
          />
        ) : (
          <PathsAlignedStep
            key={`paths-${pathsVersion}`}
            birthMonth={profile.birthMonth || undefined}
            birthDate={profile.birthDate || undefined}
            birthYear={profile.birthYear || undefined}
            birthCity={profile.birthCity || undefined}
            birthHour={profile.birthHour || undefined}
            birthMinute={profile.birthMinute || undefined}
            birthPeriod={profile.birthPeriod || undefined}
            whatYouLove={profile.whatYouLove || undefined}
            whatYouGoodAt={profile.whatYouGoodAt || undefined}
            whatWorldNeeds={profile.whatWorldNeeds || undefined}
            whatCanBePaidFor={profile.whatCanBePaidFor || undefined}
            fear={profile.fear || undefined}
            whatExcites={profile.whatExcites || undefined}
            hideCustomPathOption={true}
            headerTopMargin={20}
            headerExtraContent={
              <View style={styles.regenerateWrap}>
                <TouchableOpacity
                  style={[
                    styles.regenerateButton,
                    regenerationsThisMonth >= MONTHLY_REGEN_LIMIT && styles.regenerateButtonDisabled,
                  ]}
                  disabled={regenerationsThisMonth >= MONTHLY_REGEN_LIMIT}
                  onPress={() => generateAndPersistPaths(profile, 'regenerate')}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="refresh" size={16} color="#342846" />
                  <Text style={styles.regenerateButtonText}>
                    {tr('Regenerate directions', 'Перегенерировать направления')}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.regenerateHint}>
                  {tr(
                    `You have ${regenerationsThisMonth}/${MONTHLY_REGEN_LIMIT} regenerations this month.`,
                    `У тебя ${regenerationsThisMonth}/${MONTHLY_REGEN_LIMIT} перегенераций в этом месяце.`
                  )}
                </Text>
              </View>
            }
            onPathsGenerated={(paths) => {
              generatedPathsRef.current = paths || [];
            }}
            onExplorePath={(pathId) => {
              const found = generatedPathsRef.current.find((path) => path.id === pathId);
              if (found) {
                setGoalRegenTrigger(0);
                setSelectedPath(found);
                return;
              }
              const fallbackPath = { id: pathId, title: tr('My Goal', 'Моя цель'), description: '' };
              setGoalRegenTrigger(0);
              setSelectedPath(fallbackPath);
            }}
          />
        )}

        {isSavingGoal && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.savingText}>{tr('Saving goal...', 'Сохраняем цель...')}</Text>
          </View>
        )}
      </View>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
  },
  topRow: {
    paddingHorizontal: 20,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchPathButton: {
    borderWidth: 1,
    borderColor: '#342846',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  switchPathButtonText: {
    fontFamily: 'AnonymousPro-Bold',
    fontSize: 11,
    color: '#342846',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  topSpacer: {
    width: 40,
    height: 40,
  },
  regenerateWrap: {
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 8,
  },
  regenerateButton: {
    borderWidth: 1,
    borderColor: '#342846',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  regenerateButtonDisabled: {
    opacity: 0.5,
  },
  regenerateButtonText: {
    fontFamily: 'AnonymousPro-Bold',
    fontSize: 12,
    color: '#342846',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  regenerateHint: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 10,
    lineHeight: 12,
    color: '#6e6480',
    maxWidth: 230,
    alignSelf: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  stateText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#342846',
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#342846',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 13,
    color: '#342846',
  },
  savingOverlay: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(52, 40, 70, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingText: {
    color: '#FFFFFF',
    fontFamily: 'AnonymousPro-Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
