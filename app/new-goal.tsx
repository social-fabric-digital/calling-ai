import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import { generateCompleteGoal } from '@/utils/claudeApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function NewGoalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const isFromOnboarding = params.fromOnboarding === 'true'; // Check if coming from onboarding
  const [dreamAnswer, setDreamAnswer] = useState('');
  const [fearAnswer, setFearAnswer] = useState('');
  const [showAssistanceModal, setShowAssistanceModal] = useState(false);
  const [assistanceType, setAssistanceType] = useState<'dream' | 'fear' | null>(null);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showQueueList, setShowQueueList] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);

  const handleAssistance = (type: 'dream' | 'fear') => {
    setAssistanceType(type);
    setShowAssistanceModal(true);
  };

  const handleStartGoal = async () => {
    if (!dreamAnswer.trim() || !fearAnswer.trim()) {
      alert('Please fill in both dream and fear fields.');
      return;
    }

    if (isFromOnboarding) {
      // If coming from onboarding, navigate to action plan step (step 9, index 8)
      router.push({
        pathname: '/onboarding',
        params: { step: '9' },
      });
      return;
    }

    // Create goal for non-onboarding flow
    setIsCreatingGoal(true);
    try {
      // Load user data from AsyncStorage
      const birthMonth = await AsyncStorage.getItem('birthMonth') || '';
      const birthDate = await AsyncStorage.getItem('birthDate') || '';
      const birthYear = await AsyncStorage.getItem('birthYear') || '';
      const birthCity = await AsyncStorage.getItem('birthCity') || undefined;
      const birthHour = await AsyncStorage.getItem('birthHour') || undefined;
      const birthMinute = await AsyncStorage.getItem('birthMinute') || undefined;
      const birthPeriod = await AsyncStorage.getItem('birthPeriod') || undefined;
      const whatYouLove = await AsyncStorage.getItem('whatYouLove') || undefined;
      const whatYouGoodAt = await AsyncStorage.getItem('whatYouGoodAt') || undefined;
      const whatWorldNeeds = await AsyncStorage.getItem('whatWorldNeeds') || undefined;
      const whatCanBePaidFor = await AsyncStorage.getItem('whatCanBePaidFor') || undefined;

      // AI generation disabled to save credits
      // Generate complete goal using AI
      // const completeGoal = await generateCompleteGoal(
      //   dreamAnswer.trim(),
      //   birthMonth,
      //   birthDate,
      //   birthYear,
      //   birthCity,
      //   birthHour,
      //   birthMinute,
      //   birthPeriod,
      //   whatYouLove,
      //   whatYouGoodAt,
      //   whatWorldNeeds,
      //   whatCanBePaidFor,
      //   fearAnswer.trim(),
      //   dreamAnswer.trim() // Using dream as whatExcites
      // );
      
      // Using fallback goal structure instead
      const completeGoal = {
        name: dreamAnswer.trim() || 'Your Goal',
        steps: [
          { name: 'Step 1', description: 'Begin your journey by taking the first action.', order: 1 },
          { name: 'Step 2', description: 'Continue building momentum with focused effort.', order: 2 },
          { name: 'Step 3', description: 'Reach a significant milestone in your progress.', order: 3 },
          { name: 'Step 4', description: 'Complete your goal and celebrate your achievement.', order: 4 },
        ],
        numberOfSteps: 4,
        estimatedDuration: '3 months',
        hardnessLevel: 'Medium' as const,
        fear: fearAnswer.trim() || 'Fear of failure',
      };

      // Load existing goals
      const existingGoalsData = await AsyncStorage.getItem('userGoals');
      const existingGoals = existingGoalsData ? JSON.parse(existingGoalsData) : [];

      // Check how many active goals exist
      const activeGoals = existingGoals.filter((g: any) => g.isActive === true);
      const isQueued = activeGoals.length >= 3;

      // Create goal object
      const newGoal = {
        id: Date.now().toString(),
        name: completeGoal.name,
        steps: completeGoal.steps,
        numberOfSteps: completeGoal.numberOfSteps,
        estimatedDuration: completeGoal.estimatedDuration,
        hardnessLevel: completeGoal.hardnessLevel,
        fear: completeGoal.fear || fearAnswer.trim(),
        progressPercentage: 0,
        isActive: !isQueued,
        isQueued: isQueued,
        createdAt: new Date().toISOString(),
        currentStepIndex: 0,
      };

      // Add new goal to the beginning of the list
      const updatedGoals = [newGoal, ...existingGoals];
      await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));

      setIsCreatingGoal(false);

      // Show appropriate modal based on whether goal is queued
      if (isQueued) {
        setShowQueueModal(true);
      } else {
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      setIsCreatingGoal(false);
      alert(t('newGoal.createError'));
    }
  };

  return (
    <PaperTextureBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Arrow */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        {/* Heading */}
        <Text style={styles.heading}>{t('newGoal.heading')}</Text>

        {/* First Question */}
        <View style={styles.questionContainer}>
          <Image 
            source={require('../assets/images/dream.png')}
            style={styles.dreamIcon}
            resizeMode="contain"
          />
          <Text style={styles.question}>{t('newGoal.dreamQuestion')}</Text>
        </View>
        <Text style={styles.bodyText}>{t('newGoal.dreamSubtext')}</Text>

        {/* First Answer Field */}
        <View style={styles.answerField}>
          <TextInput
            style={styles.answerInput}
            value={dreamAnswer}
            onChangeText={setDreamAnswer}
            placeholder=""
            placeholderTextColor="#999"
            multiline
          />
        </View>

        {/* Assistance Button for First Field */}
        <TouchableOpacity
          style={styles.assistanceButton}
          onPress={() => handleAssistance('dream')}
        >
          <Text style={styles.lightBulbEmoji}>💡</Text>
        </TouchableOpacity>

        {/* Second Question */}
        <View style={styles.questionContainer}>
          <Image 
            source={require('../assets/images/fear.png')}
            style={styles.dreamIcon}
            resizeMode="contain"
          />
          <Text style={styles.question}>What specific fear holds you back?</Text>
        </View>
        <Text style={styles.bodyText}>Identifying the wall is the first step to climbing over it. Be as specific as possible.</Text>

        {/* Second Answer Field */}
        <View style={styles.answerField}>
          <TextInput
            style={styles.answerInput}
            value={fearAnswer}
            onChangeText={setFearAnswer}
            placeholder=""
            placeholderTextColor="#999"
            multiline
          />
        </View>

        {/* Assistance Button for Second Field */}
        <TouchableOpacity
          style={styles.assistanceButton}
          onPress={() => handleAssistance('fear')}
        >
          <Text style={styles.lightBulbEmoji}>💡</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Start the Goal Button - Fixed at Bottom */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={[styles.startGoalButton, isCreatingGoal && styles.startGoalButtonDisabled]}
          onPress={handleStartGoal}
          disabled={isCreatingGoal}
        >
          <Text style={styles.startGoalButtonText}>
            {isCreatingGoal ? t('newGoal.creatingGoal') : t('newGoal.startGoal')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Assistance Text Modal */}
      <Modal
        visible={showAssistanceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAssistanceModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAssistanceModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.assistanceTextContainer}
          >
            <TouchableOpacity
              onPress={() => setShowAssistanceModal(false)}
              style={styles.closeAssistanceButton}
            >
              <Text style={styles.closeAssistanceButtonText}>✕</Text>
            </TouchableOpacity>
            <ScrollView 
              style={styles.assistanceScrollView}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.assistanceText}>
                {assistanceType === 'dream'
                  ? "Here are some ideas to help you identify a dream that excites and scares you:\n\n• Starting your own business\n• Changing careers completely\n• Moving to a new city or country\n• Learning a new skill or language\n• Pursuing a creative passion\n• Building meaningful relationships\n\nThink about what makes you feel both excited and nervous - that's often where growth happens!"
                  : "Here are some common fears that hold people back:\n\n• Fear of failure or rejection\n• Fear of what others will think\n• Fear of the unknown\n• Fear of not being good enough\n• Fear of losing security or stability\n• Fear of making the wrong decision\n\nWhat specific fear resonates with you? Be honest and specific about what's holding you back."}
              </Text>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Goal Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.back();
        }}
      >
        <View style={styles.queueModalOverlay}>
          <View style={styles.queueModalContainer}>
            <Text style={styles.queueModalTitle}>{t('newGoal.successTitle')}</Text>
            <Text style={styles.queueModalText}>
              {t('newGoal.successText')}
            </Text>
            
            <View style={styles.queueModalButtons}>
              <TouchableOpacity
                style={styles.viewQueueButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.back();
                }}
              >
                <Text style={styles.viewQueueButtonText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Goal Queue Modal */}
      <Modal
        visible={showQueueModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQueueModal(false)}
      >
        <View style={styles.queueModalOverlay}>
          <View style={styles.queueModalContainer}>
            <Text style={styles.queueModalTitle}>{t('newGoal.queueTitle')}</Text>
            <Text style={styles.queueModalText}>
              {t('newGoal.queueText')}
            </Text>
            
            <View style={styles.queueModalButtons}>
              <TouchableOpacity
                style={styles.viewQueueButton}
                onPress={() => {
                  setShowQueueModal(false);
                  setShowQueueList(true);
                }}
              >
                <Text style={styles.viewQueueButtonText}>{t('newGoal.viewQueue')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => {
                  setShowQueueModal(false);
                  router.back();
                }}
              >
                <Text style={styles.emptyButtonText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Queue List Modal */}
      <Modal
        visible={showQueueList}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQueueList(false)}
      >
        <View style={styles.queueListOverlay}>
          <View style={styles.queueListContainer}>
            <View style={styles.queueListHeader}>
              <Text style={styles.queueListTitle}>{t('newGoal.myQueue')}</Text>
              <TouchableOpacity
                onPress={() => setShowQueueList(false)}
                style={styles.closeQueueButton}
              >
                <Text style={styles.closeQueueButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.queueListContent}>
              {/* Example queued goals - in production, load from storage */}
              <View style={styles.queuedGoalItem}>
                <View style={styles.queuedGoalInfo}>
                  <Text style={styles.queuedGoalText} numberOfLines={2}>
                    {dreamAnswer || 'New Goal'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.startNowButton}
                  onPress={() => {
                    // TODO: Move goal from queue to active goals
                    setShowQueueList(false);
                    router.back();
                  }}
                >
                  <Text style={styles.startNowButtonText}>Start now anyway</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 100, // Space for bottom button
    alignItems: 'flex-start',
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 28,
    color: '#342846',
    fontWeight: 'bold',
  },
  heading: {
    ...HeadingStyle,
    color: '#342846',
    marginBottom: 40,
    fontSize: 24,
    textAlign: 'center',
    width: '100%',
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 16,
    width: '100%',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  question: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    flex: 1,
    textAlign: 'left',
  },
  bodyText: {
    ...BodyStyle,
    color: '#342846',
    marginBottom: 20,
    fontSize: 12,
    width: '100%',
    textAlign: 'left',
    opacity: 0.7,
    lineHeight: 16,
  },
  dreamIcon: {
    width: 60,
    height: 60,
    marginRight: 12,
  },
  answerField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    overflow: 'visible', // Changed to visible to allow shadow to show
    marginBottom: 32,
    minHeight: 130,
    width: '100%',
    alignSelf: 'flex-start', // Align to left
    marginTop: 16, // Spacing between body text and answer field
    // Subtle brown shadow
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8, // For Android
  },
  answerInput: {
    ...BodyStyle,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 12,
    color: '#342846',
    fontSize: 14,
    minHeight: 130,
    textAlignVertical: 'top',
    lineHeight: 19.2,
  },
  reminderTip: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    marginTop: 50,
    marginBottom: 32,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  assistanceButton: {
    alignSelf: 'center',
    marginTop: -24,
    marginBottom: 32,
    padding: 8,
  },
  lightBulbEmoji: {
    fontSize: 24,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  startGoalButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  startGoalButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
  },
  startGoalButtonDisabled: {
    opacity: 0.6,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistanceTextContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    maxWidth: '85%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeAssistanceButton: {
    alignSelf: 'flex-end',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeAssistanceButtonText: {
    fontSize: 24,
    color: '#342846',
    fontWeight: 'bold',
  },
  assistanceScrollView: {
    maxHeight: 400,
  },
  assistanceText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  // Queue Modal Styles
  queueModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 19, // Reduced by 20% (from 24 to 19)
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  queueModalTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  queueModalText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  queueModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  viewQueueButton: {
    flex: 1,
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewQueueButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18, // Reduced line height
  },
  emptyButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    textAlign: 'center',
  },
  // Queue List Modal Styles
  queueListOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  queueListContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    maxHeight: 600,
  },
  queueListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  queueListTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 20,
  },
  closeQueueButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeQueueButtonText: {
    fontSize: 24,
    color: '#342846',
    fontWeight: 'bold',
  },
  queueListContent: {
    flex: 1,
    padding: 20,
  },
  queuedGoalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  queuedGoalInfo: {
    flex: 1,
  },
  queuedGoalText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    lineHeight: 22,
  },
  startNowButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
  },
  startNowButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

