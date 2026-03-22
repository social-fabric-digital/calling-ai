import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import CustomPathForm from '@/components/onboarding/CustomPathForm';
import { generateGoalSteps } from '@/utils/claudeApi';
import { hapticError, hapticMedium, hapticSuccess } from '@/utils/haptics';
import { checkSubscriptionStatus } from '@/utils/superwall';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import i18n from '@/utils/i18n';
import { useTranslation } from 'react-i18next';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function NewGoalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ fromOnboarding?: string }>();
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);

  const handleBackNavigation = async () => {
    void hapticMedium();
    const openedFromOnboarding = params.fromOnboarding === 'true';
    if (openedFromOnboarding) {
      const userIsPremium = await checkSubscriptionStatus();
      if (!userIsPremium) {
        // Free users that came from onboarding should return to Calling Awaits,
        // not to later path-selection steps they never visited.
        router.replace('/onboarding?step=7');
        return;
      }
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/goals');
  };

  const handleComplete = async (pathData: {
    goalTitle: string;
    description: string;
    milestones: string[];
    targetTimeline: string;
    challenge?: string;
  }) => {
    void hapticMedium();
    setIsCreatingGoal(true);
    try {
      const userIsPremium = await checkSubscriptionStatus();
      // Load user data from AsyncStorage
      const [
        birthMonth,
        birthDate,
        birthYear,
        birthCity,
        birthHour,
        birthMinute,
        birthPeriod,
        whatYouLove,
        whatYouGoodAt,
        whatWorldNeeds,
        whatCanBePaidFor,
        fearData,
        whatExcites,
      ] = await Promise.all([
        AsyncStorage.getItem('birthMonth') || '',
        AsyncStorage.getItem('birthDate') || '',
        AsyncStorage.getItem('birthYear') || '',
        AsyncStorage.getItem('birthCity') || '',
        AsyncStorage.getItem('birthHour') || '',
        AsyncStorage.getItem('birthMinute') || '',
        AsyncStorage.getItem('birthPeriod') || '',
        AsyncStorage.getItem('ikigaiWhatYouLove') || '',
        AsyncStorage.getItem('ikigaiWhatYouGoodAt') || '',
        AsyncStorage.getItem('ikigaiWhatWorldNeeds') || '',
        AsyncStorage.getItem('ikigaiWhatCanBePaidFor') || '',
        AsyncStorage.getItem('fear') || '',
        AsyncStorage.getItem('whatExcites') || '',
      ]);

      // Get path information if available
      const pathName = pathData.goalTitle; // The goal title serves as the path name in custom paths
      const pathDescription = pathData.description;

      let milestoneSteps;
      const userSelectedDuration = pathData.targetTimeline?.trim() || '';
      let aiEstimatedDuration = '';
      let estimatedDuration = userSelectedDuration || '1 month';

      if (userIsPremium) {
        // Generate goal steps using AI
        const goalStepsResult = await generateGoalSteps(
          pathData.goalTitle,
          birthMonth || '1',
          birthDate || '1',
          birthYear || '2000',
          birthCity || undefined,
          birthHour || undefined,
          birthMinute || undefined,
          birthPeriod || undefined,
          whatYouLove || undefined,
          whatYouGoodAt || undefined,
          whatWorldNeeds || undefined,
          whatCanBePaidFor || undefined,
          fearData || undefined,
          whatExcites || undefined,
          pathName,
          pathDescription
        );

        aiEstimatedDuration = goalStepsResult.estimatedDuration || '';
        estimatedDuration = aiEstimatedDuration || userSelectedDuration || '1 month';

        // Use AI-generated steps if available, otherwise use milestones
        if (goalStepsResult.steps && goalStepsResult.steps.length > 0) {
          // Use AI-generated steps with proper name and description fields
          milestoneSteps = goalStepsResult.steps.map((step: any) => {
            // Extract level name (prefer name field, fallback to text)
            let levelName = step.name || step.text || '';
            levelName = levelName.replace(/^(Level|Step)\s*\d+\s*:?\s*/i, '').trim();
            
            const isRussian = i18n.language?.startsWith('ru');
            const ruFallbackNames = ['Фундамент', 'Развитие навыков', 'Набор импульса', 'Мастерство'];
            const enFallbackNames = ['Foundation Building', 'Skill Development', 'Momentum Building', 'Mastery Achievement'];

            // Extract description
            let description = step.description || '';
            if (!description && levelName) {
              description = isRussian
                ? `Выполни «${levelName}» для продвижения вперёд`
                : `Complete ${levelName.toLowerCase()} to progress`;
            }
            
            // Ensure description is short
            if (description) {
              const words = description.split(' ');
              if (words.length > 15) {
                description = words.slice(0, 15).join(' ') + '...';
              }
            }
            
            // Fallback if no name
            if (!levelName) {
              const fallbackNames = isRussian ? ruFallbackNames : enFallbackNames;
              levelName = fallbackNames[(step.number || step.order || 1) - 1] || (isRussian ? `Уровень ${step.number || step.order || 1}` : `Level ${step.number || step.order || 1}`);
            }
            
            return {
              name: levelName,
              description: description || (isRussian ? `Выполни «${levelName}» для продвижения вперёд` : `Complete ${levelName.toLowerCase()} to progress`),
              order: step.order || step.number || 1,
              number: step.number || step.order || 1,
              text: levelName, // Keep for backward compatibility
            };
          });
        } else {
          const isRussian = i18n.language?.startsWith('ru');
          const ruFb = ['Фундамент', 'Развитие навыков', 'Набор импульса', 'Мастерство'];
          const enFb = ['Foundation Building', 'Skill Development', 'Momentum Building', 'Mastery Achievement'];
          milestoneSteps = pathData.milestones.map((milestone, index) => {
            let cleanName = milestone.replace(/^(Level|Step)\s*\d+\s*:?\s*/i, '').trim();
            if (!cleanName || /^(Step|Level)\s*\d+$/i.test(cleanName)) {
              cleanName = (isRussian ? ruFb : enFb)[index] || (isRussian ? `Уровень ${index + 1}` : `Level ${index + 1}`);
            }
            return {
              name: cleanName,
              description: isRussian ? `Выполни «${cleanName}» для продвижения вперёд` : `Complete ${cleanName.toLowerCase()} to progress`,
              order: index + 1,
              number: index + 1,
              text: cleanName,
            };
          });
        }
      } else {
        // Free users: use manual milestones without AI
        const isRussian = i18n.language?.startsWith('ru');
        const ruFb = ['Фундамент', 'Развитие навыков', 'Набор импульса', 'Мастерство'];
        const enFb = ['Foundation Building', 'Skill Development', 'Momentum Building', 'Mastery Achievement'];
        milestoneSteps = pathData.milestones.map((milestone, index) => {
          let cleanName = milestone.replace(/^(Level|Step)\s*\d+\s*:?\s*/i, '').trim();
          if (!cleanName || /^(Step|Level)\s*\d+$/i.test(cleanName)) {
            cleanName = (isRussian ? ruFb : enFb)[index] || (isRussian ? `Уровень ${index + 1}` : `Level ${index + 1}`);
          }
          return {
            name: cleanName,
            description: isRussian ? `Выполни «${cleanName}» для продвижения вперёд` : `Complete ${cleanName.toLowerCase()} to progress`,
            order: index + 1,
            number: index + 1,
            text: cleanName,
          };
        });
      }

      // Create complete goal object
      const isRussian = i18n.language?.startsWith('ru');
      const completeGoal = {
        name: pathData.goalTitle,
        steps: milestoneSteps,
        numberOfSteps: milestoneSteps.length,
        estimatedDuration: estimatedDuration,
        hardnessLevel: 'Medium' as const,
        fear: pathData.challenge || fearData || (isRussian ? 'Страх неудачи' : 'Fear of failure'),
      };

      // Load existing goals
      const existingGoalsData = await AsyncStorage.getItem('userGoals');
      const existingGoals = existingGoalsData ? JSON.parse(existingGoalsData) : [];

      // Check how many active goals exist
      const activeGoals = existingGoals.filter((g: any) => g.isActive === true);
      const isQueued = activeGoals.length >= 3;

      // Create goal object
      // Set currentStepIndex to -1 so only level 1 is unlocked initially (not completed)
      const goalToSave = {
        id: Date.now().toString(),
        name: completeGoal.name,
        steps: completeGoal.steps,
        numberOfSteps: completeGoal.numberOfSteps,
        estimatedDuration: completeGoal.estimatedDuration,
        aiEstimatedDuration: aiEstimatedDuration || undefined,
        userSelectedDuration: userSelectedDuration || undefined,
        hardnessLevel: completeGoal.hardnessLevel,
        fear: completeGoal.fear,
        isAiGenerated: userIsPremium,
        milestones: userIsPremium ? undefined : pathData.milestones.filter(m => m.trim()),
        obstacle: '', // No obstacle page in this flow
        progressPercentage: 0,
        isActive: !isQueued,
        isQueued: isQueued,
        createdAt: new Date().toISOString(),
        currentStepIndex: -1, // -1 means no levels completed, only level 1 is unlocked
        pathName: pathName,
        pathDescription: pathDescription,
      };

      // Add new goal to the beginning of the list
      const updatedGoals = [goalToSave, ...existingGoals];
      await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));

      setIsCreatingGoal(false);
      void hapticSuccess();

      // Navigate back to goals screen
      router.back();
    } catch (error) {
      console.error('Error creating goal:', error);
      void hapticError();
      setIsCreatingGoal(false);
      alert(t('newGoal.createError') || 'Error creating goal. Please try again.');
    }
  };

  return (
    <PaperTextureBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Image
          source={require('../assets/images/active.png')}
          pointerEvents="none"
          style={styles.backgroundImage}
          resizeMode="cover"
        />

        {/* Back Arrow Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackNavigation}
        >
          <MaterialIcons name="arrow-back" size={24} color="#342846" />
        </TouchableOpacity>

        {/* Exit Button */}
        <TouchableOpacity
          style={styles.exitButton}
          onPress={handleBackNavigation}
        >
          <MaterialIcons name="close" size={24} color="#342846" />
        </TouchableOpacity>

        <View style={styles.contentOffset}>
          <CustomPathForm 
            onComplete={handleComplete}
            hideHeader={true}
            hideHeaderTopPadding={0}
            heroTitle={t('onboarding.createYourPath')}
            heroSubtitle={t('onboarding.buildYourRoute')}
            fixedMilestoneCount={4}
          />
        </View>
      </KeyboardAvoidingView>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  contentOffset: {
    flex: 1,
    marginTop: 84,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
