import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import { getCompletedGoals, CompletedGoal } from '@/utils/goalTracking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, ImageBackground, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

// Firework Effect Component
function FireworkEffect() {
  const sparkles = Array.from({ length: 8 }, (_, i) => {
    const animValue = useRef(new Animated.Value(0)).current;
    const rotation = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      // Animate sparkle movement
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(animValue, {
              toValue: 1,
              duration: 1500 + i * 100,
              useNativeDriver: true,
            }),
            Animated.timing(rotation, {
              toValue: 1,
              duration: 1000 + i * 50,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 1500 + i * 100,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, []);

    const angle = (i / 8) * Math.PI * 2;
    const radius = 30 + i * 5;
    
    const translateX = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, Math.cos(angle) * radius],
    });
    
    const translateY = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, Math.sin(angle) * radius],
    });
    
    const rotate = rotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
    
    const opacity = animValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 0],
    });
    
    const scale = animValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1.2, 0],
    });

    return { translateX, translateY, rotate, opacity, scale };
  });

  return (
    <View style={styles.fireworkContainer}>
      {sparkles.map((sparkle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.sparkle,
            {
              transform: [
                { translateX: sparkle.translateX },
                { translateY: sparkle.translateY },
                { rotate: sparkle.rotate },
                { scale: sparkle.scale },
              ],
              opacity: sparkle.opacity,
            },
          ]}
        >
          <Text style={styles.sparkleText}>✨</Text>
        </Animated.View>
      ))}
    </View>
  );
}

interface Goal {
  id: string;
  name: string;
  steps: any[];
  numberOfSteps: number;
  estimatedDuration: string;
  hardnessLevel: string;
  fear: string;
  progressPercentage: number;
  isActive: boolean;
  isQueued?: boolean;
  createdAt: string;
  currentStepIndex: number;
}

export default function GoalsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<CompletedGoal[]>([]);
  const [selectedGoalIndex, setSelectedGoalIndex] = useState<number>(0);
  const [selectedAchievementIndex, setSelectedAchievementIndex] = useState<number>(0);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const achievementsScrollViewRef = useRef<ScrollView>(null);
  
  // Load active goals and completed goals from AsyncStorage
  const loadGoals = useCallback(async () => {
    try {
      const userGoalsData = await AsyncStorage.getItem('userGoals');
      if (userGoalsData) {
        const allGoals: Goal[] = JSON.parse(userGoalsData);
        // Filter to only active goals (max 3)
        const active = allGoals.filter((g: Goal) => g.isActive === true).slice(0, 3);
        setActiveGoals(active);
        
        // If no active goals, try to get first goal
        if (active.length === 0 && allGoals.length > 0) {
          setActiveGoals([allGoals[0]]);
        }
      }
      
      // Load completed goals
      const completed = await getCompletedGoals();
      setCompletedGoals(completed);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );
  
  const currentGoal = activeGoals[selectedGoalIndex] || activeGoals[0];
  
  // Helper function to truncate fear to 3 words max
  const truncateFear = (fearText: string): string => {
    if (!fearText) return t('goals.defaultGoalName');
    const words = fearText.trim().split(/\s+/);
    return words.slice(0, 3).join(' ');
  };
  
  // Helper function to format completion date
  const formatCompletionDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return t('goals.today');
      } else if (diffDays === 1) {
        return t('goals.yesterday');
      } else if (diffDays < 7) {
        return t('goals.daysAgo', { count: diffDays });
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1 ? t('goals.weekAgo', { count: weeks }) : t('goals.weeksAgo', { count: weeks });
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return months === 1 ? t('goals.monthAgo', { count: months }) : t('goals.monthsAgo', { count: months });
      } else {
        const years = Math.floor(diffDays / 365);
        return years === 1 ? t('goals.yearAgo', { count: years }) : t('goals.yearsAgo', { count: years });
      }
    } catch (error) {
      return dateString;
    }
  };
  
  // Helper function to format date as readable string
  const formatDateReadable = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.language, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  };
  
  // Helper function to get mood display text
  const getMoodDisplayText = (mood: string | null): string => {
    if (!mood) return t('goals.noMoodData');
    const moodMap: { [key: string]: string } = {
      'great': t('goals.moodGreat'),
      'okay': t('goals.moodOkay'),
      'hard': t('goals.moodHard'),
    };
    return moodMap[mood] || mood;
  };
  
  // Get current goal data or use defaults
  const goalName = currentGoal?.name || t('goals.defaultGoalName');
  const hardnessLevel = currentGoal?.hardnessLevel || 'Medium';
  const fear = truncateFear(currentGoal?.fear || '');
  const progressPercentage = currentGoal?.progressPercentage || 0;
  const nextLevel = currentGoal?.steps && currentGoal.steps.length > 0 
    ? currentGoal.steps[currentGoal.currentStepIndex || 0]?.name || t('goals.startYourJourney')
    : t('goals.defaultGoalName');

  return (
    <PaperTextureBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
      {/* Top Bar with Back Arrow and Goal + */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.goalPlusButton}
          onPress={() => router.push('/new-goal')}
        >
          <Text style={styles.goalPlusText}>{t('goals.goalPlus')}</Text>
        </TouchableOpacity>
      </View>

      {/* Active Goals Heading */}
      <Text style={styles.heading}>{t('goals.activeGoals')}</Text>

      {/* Goal Selector - Show dots if multiple goals */}
      {activeGoals.length > 1 && (
        <View style={styles.goalSelector}>
          {activeGoals.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.goalDot,
                selectedGoalIndex === index && styles.goalDotActive
              ]}
              onPress={() => {
                setSelectedGoalIndex(index);
                // Scroll to the selected goal
                const cardWidth = width - 50; // Account for padding (25 * 2)
                scrollViewRef.current?.scrollTo({
                  x: index * cardWidth,
                  animated: true,
                });
              }}
            />
          ))}
        </View>
      )}

      {/* Goal Cards - Horizontal ScrollView for swiping */}
      {activeGoals.length > 0 ? (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const scrollPosition = event.nativeEvent.contentOffset.x;
            const cardWidth = width - 50; // Account for padding (25 * 2)
            const index = Math.round(scrollPosition / cardWidth);
            if (index >= 0 && index < activeGoals.length) {
              setSelectedGoalIndex(index);
            }
          }}
          style={styles.goalsScrollView}
          contentContainerStyle={styles.goalsScrollContent}
        >
          {activeGoals.map((goal, index) => {
            const goalHardnessLevel = goal.hardnessLevel || 'Medium';
            // Show full fear text (no truncation)
            const goalFear = goal.fear || 'being rejected';
            // Calculate progress based on completed levels
            const totalSteps = goal.numberOfSteps || 4;
            const completedSteps = goal.currentStepIndex !== undefined ? goal.currentStepIndex + 1 : 0;
            const goalProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
            const goalNextLevel = goal.steps && goal.steps.length > 0 
              ? goal.steps[goal.currentStepIndex || 0]?.name || 'Start your journey'
              : 'write a cover letter';
            
            return (
              <View key={goal.id} style={styles.goalCardWrapper}>
                <ImageBackground
                  source={require('../../assets/images/goal.background.png')}
                  style={styles.goalCard}
                  resizeMode="cover"
                >
                  {/* Goal Name with Firework Effect */}
                  <View style={styles.goalNameContainer}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <FireworkEffect />
                  </View>

                  {/* Hardness Level */}
                  <View style={styles.hardnessLevelContainer}>
                    <Text style={styles.hardnessLevelLabel}>{t('goals.hardnessLevel')}</Text>
                    <View style={styles.hardnessLevelFrame}>
                      <Text style={styles.hardnessLevelValue}>{goalHardnessLevel}</Text>
                    </View>
                  </View>

                  {/* Fear */}
                  <View style={styles.fearContainer}>
                    <Text style={styles.fearLabel}>{t('goals.fear')}</Text>
                    <View style={styles.fearFrame}>
                      <Text style={styles.fearValue} numberOfLines={0}>
                        {goalFear}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarBackground}>
                      <View style={[styles.progressBarFill, { width: `${goalProgress}%` }]} />
                    </View>
                    <Text style={styles.progressPercentage}>{goalProgress}%</Text>
                  </View>

                  {/* Next Level */}
                  <View style={styles.nextLevelContainer}>
                    <Text style={styles.nextLevelLabel}>{t('goals.nextLevel')}</Text>
                    <View style={styles.nextLevelNameFrame}>
                      <Text style={styles.nextLevelName}>{goalNextLevel}</Text>
                    </View>
                  </View>
                </ImageBackground>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.noGoalsContainer}>
          <Text style={styles.noGoalsText}>{t('goals.noActiveGoals')}</Text>
        </View>
      )}

      {/* Continue Quest Button - Only show if there's a selected goal */}
      {currentGoal && (
        <TouchableOpacity
          style={styles.continueQuestButton}
          onPress={() => router.push({
            pathname: '/goal-map',
            params: { goalName: currentGoal.name, goalId: currentGoal.id }
          })}
        >
          <Text style={styles.continueQuestButtonText}>{t('goals.continueQuest')}</Text>
        </TouchableOpacity>
      )}

      {/* Achievements Section */}
      {completedGoals.length > 0 && (
        <>
          <Text style={styles.achievementsHeading}>{t('goals.achievements')}</Text>
          
          {/* Achievement Selector - Show dots if multiple achievements */}
          {completedGoals.length > 1 && (
            <View style={styles.goalSelector}>
              {completedGoals.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.goalDot,
                    selectedAchievementIndex === index && styles.goalDotActive
                  ]}
                  onPress={() => {
                    setSelectedAchievementIndex(index);
                    // Scroll to the selected achievement
                    const cardWidth = width - 50; // Account for padding (25 * 2)
                    achievementsScrollViewRef.current?.scrollTo({
                      x: index * cardWidth,
                      animated: true,
                    });
                  }}
                />
              ))}
            </View>
          )}

          {/* Achievement Cards - Horizontal ScrollView for swiping */}
          <ScrollView
            ref={achievementsScrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const scrollPosition = event.nativeEvent.contentOffset.x;
              const cardWidth = width - 50; // Account for padding (25 * 2)
              const index = Math.round(scrollPosition / cardWidth);
              if (index >= 0 && index < completedGoals.length) {
                setSelectedAchievementIndex(index);
              }
            }}
            style={styles.goalsScrollView}
            contentContainerStyle={styles.goalsScrollContent}
          >
            {completedGoals.map((goal, index) => (
              <View key={goal.id} style={styles.goalCardWrapper}>
                <View style={styles.achievementCard}>
                  {/* Goal Name */}
                  <Text style={styles.achievementCardName}>{goal.name}</Text>

                  {/* View Achievement Button */}
                  <TouchableOpacity
                    style={styles.viewAchievementButton}
                    onPress={() => {
                      setSelectedAchievementIndex(index);
                      setShowAchievementModal(true);
                    }}
                  >
                    <ImageBackground
                      source={require('../../assets/images/goal.background.png')}
                      style={styles.viewAchievementButtonBackground}
                      imageStyle={styles.viewAchievementButtonImage}
                    >
                      <Text style={styles.viewAchievementButtonText}>{t('goals.viewAchievement')}</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* Achievement Details Modal */}
      <Modal
        visible={showAchievementModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAchievementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {completedGoals[selectedAchievementIndex] && (
              <>
                <Text style={styles.modalHeading}>{completedGoals[selectedAchievementIndex].name}</Text>
                
                <View style={styles.modalInfoContainer}>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>{t('goals.startDate')}</Text>
                    <Text style={styles.modalInfoValue}>
                      {formatDateReadable(completedGoals[selectedAchievementIndex].dateStarted || completedGoals[selectedAchievementIndex].dateCompleted)}
                    </Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>{t('goals.endDate')}</Text>
                    <Text style={styles.modalInfoValue}>
                      {formatDateReadable(completedGoals[selectedAchievementIndex].dateCompleted)}
                    </Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>{t('goals.overallMood')}</Text>
                    <Text style={styles.modalInfoValue}>
                      {getMoodDisplayText(completedGoals[selectedAchievementIndex].overallMood)}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowAchievementModal(false)}
                >
                  <Text style={styles.modalCloseButtonText}>{t('common.close')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 28,
    color: '#342846',
    fontWeight: 'bold',
  },
  goalPlusButton: {
    alignSelf: 'flex-end',
  },
  goalPlusText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
  heading: {
    ...HeadingStyle,
    color: '#342846',
    marginBottom: 24,
    fontSize: 24,
    textAlign: 'center',
    width: '100%',
  },
  goalsScrollView: {
    marginBottom: 20,
  },
  goalsScrollContent: {
    paddingHorizontal: 0,
  },
  goalCardWrapper: {
    width: width - 50, // Full width minus horizontal padding (25 * 2)
    paddingHorizontal: 0,
  },
  goalCard: {
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 0,
  },
  goalNameContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 60,
  },
  goalName: {
    ...HeadingStyle,
    color: '#ffffff',
    fontSize: 22,
    textAlign: 'center',
    zIndex: 1,
  },
  fireworkContainer: {
    position: 'absolute',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  sparkle: {
    position: 'absolute',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleText: {
    fontSize: 16,
  },
  hardnessLevelContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  hardnessLevelLabel: {
    ...HeadingStyle,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  hardnessLevelFrame: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 20, // Minimum 20px padding (was 12)
    paddingVertical: 6,
    marginTop: 4,
  },
  hardnessLevelValue: {
    ...BodyStyle,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  fearContainer: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  fearLabel: {
    ...HeadingStyle,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  fearFrame: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 20, // Minimum 20px padding (was 12)
    paddingVertical: 6,
    marginTop: 4,
    width: '100%',
  },
  fearValue: {
    ...BodyStyle,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 20,
    backgroundColor: '#e6e6e6',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#342846', // Purple color
    borderRadius: 10,
  },
  progressPercentage: {
    ...BodyStyle,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 50,
  },
  nextLevelContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  nextLevelLabel: {
    ...HeadingStyle,
    color: '#ffffff',
    fontSize: 18,
    marginBottom: 4,
    textAlign: 'center',
  },
  nextLevelNameFrame: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  nextLevelName: {
    ...BodyStyle,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  continueQuestButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 32,
  },
  continueQuestButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
  },
  achievementsHeading: {
    ...HeadingStyle,
    color: '#342846',
    marginTop: 32,
    marginBottom: 24,
    fontSize: 24,
    textAlign: 'center',
    width: '100%',
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 0,
    minHeight: 200,
    justifyContent: 'space-between',
  },
  achievementCardName: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  viewAchievementButton: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  viewAchievementButtonBackground: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAchievementButtonImage: {
    borderRadius: 999,
    resizeMode: 'cover',
  },
  viewAchievementButtonText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  goalSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  goalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
  },
  goalDotActive: {
    backgroundColor: '#342846',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  noGoalsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  noGoalsText: {
    ...BodyStyle,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeading: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalGoalName: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalCompletionText: {
    ...BodyStyle,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalInfoContainer: {
    width: '100%',
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalInfoLabel: {
    ...BodyStyle,
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalInfoValue: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
  modalCloseButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 40,
    minWidth: 120,
  },
  modalCloseButtonText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
