import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import { generateGoalSteps } from '@/utils/claudeApi';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface CustomPathFormProps {
  onComplete: (pathData: {
    goalTitle: string;
    description: string;
    milestones: string[];
    targetTimeline: string;
  }) => void;
}

function CustomPathForm({ onComplete }: CustomPathFormProps) {
  const { t } = useTranslation();
  const [goalTitle, setGoalTitle] = useState('');
  const [description, setDescription] = useState('');
  const [milestones, setMilestones] = useState<string[]>(['', '']);
  const [targetTimeline, setTargetTimeline] = useState('');
  const [showMilestoneAdvice, setShowMilestoneAdvice] = useState(false);
  const [showTimelineDropdown, setShowTimelineDropdown] = useState(false);
  const [isCustomTimeline, setIsCustomTimeline] = useState(false);
  
  const timelineOptions = [
    t('onboarding.timelineOneMonth'),
    t('onboarding.timelineThreeMonths'),
    t('onboarding.timelineSixMonths'),
    t('onboarding.timelineOneYear'),
    t('onboarding.timelineCustom'),
  ];

  const handleMilestoneChange = (index: number, value: string) => {
    const newMilestones = [...milestones];
    newMilestones[index] = value;
    setMilestones(newMilestones);
  };

  const addMilestone = () => {
    if (milestones.length < 4) {
      setMilestones([...milestones, '']);
    }
  };

  const handleEstablishGoal = () => {
    if (!goalTitle.trim() || !description.trim() || milestones.filter(m => m.trim()).length === 0 || !targetTimeline.trim()) {
      alert(t('onboarding.fillRequiredFields'));
      return;
    }
    
    onComplete({
      goalTitle: goalTitle.trim(),
      description: description.trim(),
      milestones: milestones.filter(m => m.trim()),
      targetTimeline: targetTimeline.trim(),
    });
  };

  return (
    <ScrollView
      style={styles.formContainer}
      contentContainerStyle={styles.customPathFormContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Core Objective Card */}
      <View style={styles.customGoalCard}>
        <Text style={[styles.customGoalCardTitle, styles.coreObjectiveTitle]}>{t('onboarding.coreObjective')}</Text>
        
        {/* Goal Title */}
        <View style={styles.customGoalFieldContainer}>
          <Text style={styles.customGoalFieldLabel}>{t('onboarding.goalTitle')}</Text>
          <Text style={styles.customGoalFieldHelper}>{t('onboarding.goalTitleHelper')}</Text>
          <View style={styles.bodyTextFieldWrapper}>
            <TextInput
              style={styles.textField}
              value={goalTitle}
              onChangeText={setGoalTitle}
              placeholder=""
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.customGoalFieldContainer}>
          <Text style={styles.customGoalFieldLabel}>{t('onboarding.description')}</Text>
          <Text style={styles.customGoalFieldHelper}>{t('onboarding.descriptionHelper')}</Text>
          <View style={styles.bodyTextFieldWrapper}>
            <TextInput
              style={styles.textField}
              value={description}
              onChangeText={setDescription}
              placeholder=""
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>

      {/* Milestone Steps Card */}
      <View style={styles.customGoalCard}>
        <View style={styles.milestoneCardHeader}>
          <View style={styles.milestoneTitleContainer}>
            <Text style={[styles.customGoalCardTitle, styles.centeredCardTitle]}>{t('onboarding.milestoneSteps')}</Text>
          </View>
          <TouchableOpacity
            style={styles.adviceButton}
            onPress={() => setShowMilestoneAdvice(!showMilestoneAdvice)}
          >
            <MaterialIcons name="info-outline" size={20} color="#342846" />
          </TouchableOpacity>
        </View>

        {showMilestoneAdvice && (
          <View style={styles.adviceModal}>
            <Text style={styles.adviceText}>
              {t('onboarding.milestoneAdvice')}
            </Text>
          </View>
        )}

        {milestones.map((milestone, index) => (
          <View key={index} style={styles.customGoalFieldContainer}>
            <View style={styles.milestoneInputContainer}>
              <View style={styles.milestoneNumberIcon}>
                <Text style={styles.milestoneNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.milestoneTextFieldWrapper}>
                <TextInput
                  style={[styles.textField, styles.milestoneTextField]}
                  value={milestone}
                  onChangeText={(value) => handleMilestoneChange(index, value)}
                  placeholder=""
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        ))}

        {milestones.length < 4 && (
          <TouchableOpacity
            style={styles.addMilestoneButton}
            onPress={addMilestone}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.addMilestoneButtonText}>{t('onboarding.addMilestone')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Target Timeline Card */}
      <View style={styles.customGoalCard}>
        <Text style={[styles.customGoalCardTitle, styles.centeredCardTitle]}>{t('onboarding.targetTimeline')}</Text>
        <View style={styles.customGoalFieldContainer}>
          <Text style={styles.customGoalFieldHelper}>{t('onboarding.targetTimelineHelper')}</Text>
          {!isCustomTimeline ? (
            <>
              <TouchableOpacity
                style={styles.customPathDropdownButton}
                onPress={() => setShowTimelineDropdown(!showTimelineDropdown)}
              >
                <Text style={[styles.customPathDropdownText, !targetTimeline && styles.customPathDropdownPlaceholder]}>
                  {targetTimeline || t('onboarding.selectTimeline')}
                </Text>
                <Text style={styles.customPathDropdownArrow}>{showTimelineDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showTimelineDropdown && (
                <View style={styles.customPathDropdown}>
                  <ScrollView style={styles.cityDropdownScrollView} nestedScrollEnabled>
                    {timelineOptions.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.cityDropdownItem}
                        onPress={() => {
                          if (option === t('onboarding.timelineCustom')) {
                            setIsCustomTimeline(true);
                            setTargetTimeline('');
                            setShowTimelineDropdown(false);
                          } else {
                            setTargetTimeline(option);
                            setShowTimelineDropdown(false);
                            setIsCustomTimeline(false);
                          }
                        }}
                      >
                        <Text style={styles.cityDropdownText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          ) : (
            <View style={styles.bodyTextFieldWrapper}>
              <TextInput
                style={styles.textField}
                value={targetTimeline}
                onChangeText={setTargetTimeline}
                placeholder={t('onboarding.targetTimelinePlaceholder')}
                placeholderTextColor="#999"
              />
            </View>
          )}
        </View>
      </View>

      {/* Establish Goal Button */}
      <TouchableOpacity 
        style={styles.establishGoalButton}
        onPress={handleEstablishGoal}
      >
        <Text style={styles.establishGoalButtonText}>{t('onboarding.establishGoal')}</Text>
      </TouchableOpacity>

      {/* Quote */}
      <Text style={styles.goalQuote}>"{t('onboarding.goalQuote')}"</Text>
    </ScrollView>
  );
}

export default function NewGoalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);

  const handleComplete = async (pathData: {
    goalTitle: string;
    description: string;
    milestones: string[];
    targetTimeline: string;
  }) => {
    setIsCreatingGoal(true);
    try {
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
        whatExcites || undefined
      );

      // Convert milestones to steps format
      const milestoneSteps = pathData.milestones.map((milestone, index) => ({
        name: milestone,
        description: '',
        order: index + 1,
      }));

      // Create complete goal object
      const completeGoal = {
        name: pathData.goalTitle,
        steps: milestoneSteps,
        numberOfSteps: milestoneSteps.length,
        estimatedDuration: pathData.targetTimeline,
        hardnessLevel: 'Medium' as const,
        fear: fearData || 'Fear of failure',
      };

      // Load existing goals
      const existingGoalsData = await AsyncStorage.getItem('userGoals');
      const existingGoals = existingGoalsData ? JSON.parse(existingGoalsData) : [];

      // Check how many active goals exist
      const activeGoals = existingGoals.filter((g: any) => g.isActive === true);
      const isQueued = activeGoals.length >= 3;

      // Create goal object
      const goalToSave = {
        id: Date.now().toString(),
        name: completeGoal.name,
        steps: completeGoal.steps,
        numberOfSteps: completeGoal.numberOfSteps,
        estimatedDuration: completeGoal.estimatedDuration,
        hardnessLevel: completeGoal.hardnessLevel,
        fear: completeGoal.fear,
        obstacle: '', // No obstacle page in this flow
        progressPercentage: 0,
        isActive: !isQueued,
        isQueued: isQueued,
        createdAt: new Date().toISOString(),
        currentStepIndex: 0,
      };

      // Add new goal to the beginning of the list
      const updatedGoals = [goalToSave, ...existingGoals];
      await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));

      setIsCreatingGoal(false);

      // Navigate back to goals screen
      router.back();
    } catch (error) {
      console.error('Error creating goal:', error);
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
        {/* Back Arrow */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <CustomPathForm onComplete={handleComplete} />
      </KeyboardAvoidingView>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 40,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 28,
    color: '#342846',
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
  },
  customPathFormContent: {
    paddingHorizontal: 40,
    paddingTop: 100,
    paddingBottom: 100,
  },
  customGoalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#342846',
    padding: 20,
    marginBottom: 20,
  },
  customGoalCardTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'left',
  },
  coreObjectiveTitle: {
    textAlign: 'center',
  },
  centeredCardTitle: {
    textAlign: 'center',
  },
  customGoalFieldContainer: {
    marginBottom: 24,
  },
  customGoalFieldLabel: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'left',
  },
  customGoalFieldHelper: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    marginBottom: 12,
    opacity: 0.7,
    lineHeight: 16,
  },
  bodyTextFieldWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    minHeight: 50,
  },
  textField: {
    ...BodyStyle,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#342846',
    fontSize: 16,
    minHeight: 50,
  },
  milestoneCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  milestoneTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  adviceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  adviceModal: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#342846',
  },
  adviceText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    lineHeight: 20,
  },
  milestoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  milestoneNumberIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  milestoneNumberText: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    fontWeight: 'bold',
  },
  milestoneTextFieldWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    minHeight: 90,
  },
  milestoneTextField: {
    width: '100%',
  },
  addMilestoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#342846',
    marginTop: 8,
  },
  addMilestoneButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  customPathDropdownButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  customPathDropdownText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    flex: 1,
  },
  customPathDropdownPlaceholder: {
    color: '#999',
    opacity: 0.7,
  },
  customPathDropdownArrow: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    marginLeft: 8,
  },
  customPathDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 1000,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  cityDropdownScrollView: {
    maxHeight: 200,
  },
  cityDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cityDropdownText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
  establishGoalButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  establishGoalButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    fontSize: 18,
  },
  goalQuote: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
});
