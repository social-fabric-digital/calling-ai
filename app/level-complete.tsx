import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import { markGoalAsCompleted, trackLevelCompletionEvent } from '@/utils/goalTracking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Modal, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

export default function LevelCompleteScreen() {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  const router = useRouter();
  const params = useLocalSearchParams();
  const levelNumber = params.level ? parseInt(params.level as string) : 1;
  const totalLevels = params.totalLevels ? parseInt(params.totalLevels as string) : 4;
  const goalName = params.goalName as string || tr('Get an internship', 'Получить стажировку'); // Dynamic goal name
  const goalId = params.goalId as string || ''; // Goal ID for marking as completed
  const userName = params.userName as string || tr('Friend', 'Друг'); // Dynamic user name
  const isLastLevel = levelNumber >= totalLevels;

  // Mark goal as completed when last level is finished
  useEffect(() => {
    if (isLastLevel && goalId) {
      markGoalAsCompleted(goalId, goalName).catch((error) => {
        console.error('Error marking goal as completed:', error);
      });
    }
  }, [isLastLevel, goalId, goalName]);

  const [feelingSelected, setFeelingSelected] = useState<string | null>(null);
  const [showGoalCompletionCelebration, setShowGoalCompletionCelebration] = useState(false);

  // Celebration animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const confettiPieces = useRef(
    Array.from({ length: 20 }, () => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      rotation: new Animated.Value(0),
      delay: Math.random() * 2000,
      startX: Math.random() * width,
      startY: Math.random() * (height * 0.6) + height * 0.2,
    }))
  ).current;
  const balloons = useRef(
    Array.from({ length: 5 }, () => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(0),
      delay: Math.random() * 3000,
    }))
  ).current;
  
  // Goal completion celebration balloons
  const celebrationBalloons = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      translateY: new Animated.Value(height + 100),
      opacity: new Animated.Value(0),
      translateX: new Animated.Value((width / 12) * i + (width / 24) - 20),
      rotation: new Animated.Value(0),
      scale: new Animated.Value(0.8),
      delay: i * 150,
    }))
  ).current;

  // Trigger celebration animation on mount
  useEffect(() => {
    // Subtle pulse animation for heading
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Confetti popping animation - random intervals
    const confettiInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * confettiPieces.length);
      const confetti = confettiPieces[randomIndex];
      
      // Use stored random position or generate new one
      const startX = confetti.startX || Math.random() * width;
      const startY = confetti.startY || Math.random() * (height * 0.6) + height * 0.2;
      
      // Reset values and set initial position (relative to center)
      confetti.translateX.setValue(startX - width / 2);
      confetti.translateY.setValue(startY - height / 2);
      confetti.opacity.setValue(0);
      confetti.scale.setValue(0);
      confetti.rotation.setValue(0);

      // Random movement direction
      const moveX = (Math.random() - 0.5) * 150;
      const moveY = (Math.random() - 0.5) * 150;

      Animated.parallel([
        Animated.sequence([
          Animated.timing(confetti.opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(confetti.opacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(confetti.scale, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(confetti.scale, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(confetti.translateX, {
          toValue: startX - width / 2 + moveX,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(confetti.translateY, {
          toValue: startY - height / 2 + moveY,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(confetti.rotation, {
          toValue: Math.random() * 720,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }, 800); // Pop confetti every 800ms

    // Balloons flying from bottom to top
    balloons.forEach((balloon, index) => {
      const startX = (width / balloons.length) * index + (width / balloons.length / 2);
      
      Animated.sequence([
        Animated.delay(balloon.delay),
        Animated.parallel([
          Animated.timing(balloon.opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(balloon.translateY, {
            toValue: -height - 100,
            duration: 4000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.timing(balloon.translateX, {
            toValue: (Math.random() - 0.5) * 50,
            duration: 4000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(balloon.opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset and restart balloon animation
        balloon.translateY.setValue(0);
        balloon.translateX.setValue(0);
        balloon.opacity.setValue(0);
        balloon.delay = Math.random() * 3000;
      });
    });

    return () => {
      clearInterval(confettiInterval);
    };
  }, []);

  // Show goal completion celebration when last level is completed
  useEffect(() => {
    if (isLastLevel) {
      // Show celebration modal after a short delay
      setTimeout(() => {
        setShowGoalCompletionCelebration(true);
        
        // Animate celebration balloons rising up continuously
        const animateBalloon = (balloon: typeof celebrationBalloons[0], index: number) => {
          // Reset balloon position
          balloon.translateY.setValue(height + 100);
          balloon.opacity.setValue(0);
          balloon.scale.setValue(0.8);
          balloon.rotation.setValue(0);
          
          Animated.sequence([
            Animated.delay(balloon.delay),
            Animated.parallel([
              Animated.timing(balloon.opacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(balloon.translateY, {
                toValue: -height - 100,
                duration: 5000 + Math.random() * 2000,
                useNativeDriver: true,
              }),
              Animated.timing(balloon.rotation, {
                toValue: Math.random() * 20 - 10, // Random rotation between -10 and 10 degrees
                duration: 3000,
                useNativeDriver: true,
              }),
              Animated.timing(balloon.scale, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }),
            ]),
          ]).start(() => {
            // Restart animation when balloon reaches top
            setTimeout(() => {
              animateBalloon(balloon, index);
            }, 500);
          });
        };
        
        celebrationBalloons.forEach((balloon, index) => {
          animateBalloon(balloon, index);
        });
      }, 500);
    }
  }, [isLastLevel]);

  // Dynamic rewards based on level
  const levelRewards = {
    1: {
      badge: tr('Reward: strong researcher', 'Награда: сильный исследователь'),
      badgeImage: require('../assets/images/trophy.png'),
      points: tr('Confidence + 25 points', 'Уверенность + 25 очков'),
      pointsImage: require('../assets/images/fire.png'),
      skill: tr('Your research skills', 'Твои исследовательские навыки'),
      skillImage: require('../assets/images/stars.png'),
    },
    2: {
      badge: tr('Reward: communication master', 'Награда: мастер коммуникации'),
      badgeImage: require('../assets/images/medal.png'),
      points: tr('Confidence + 30 points', 'Уверенность + 30 очков'),
      pointsImage: require('../assets/images/fire.png'),
      skill: tr('Your writing skills', 'Твои навыки письма'),
      skillImage: require('../assets/images/stars.png'),
    },
    3: {
      badge: tr('Reward: person of action', 'Награда: человек действия'),
      badgeImage: require('../assets/images/trophy.png'),
      points: tr('Confidence + 35 points', 'Уверенность + 35 очков'),
      pointsImage: require('../assets/images/fire.png'),
      skill: tr('Your execution skills', 'Твои навыки применения'),
      skillImage: require('../assets/images/stars.png'),
    },
    4: {
      badge: tr('Reward: goal achiever', 'Награда: достигатель целей'),
      badgeImage: require('../assets/images/medal.png'),
      points: tr('Confidence + 50 points', 'Уверенность + 50 очков'),
      pointsImage: require('../assets/images/fire.png'),
      skill: tr('Your persistence', 'Твоя настойчивость'),
      skillImage: require('../assets/images/trophy.png'),
    },
  };

  const currentRewards = levelRewards[levelNumber as keyof typeof levelRewards] || levelRewards[1];

  const handleShare = async () => {
    try {
      await Share.share({
        message: tr(
          `I just completed level ${levelNumber} for "${goalName}"! 🎉`,
          `Я только что завершил(а) уровень ${levelNumber} в цели "${goalName}"! 🎉`
        ),
        title: tr('Level complete!', 'Уровень пройден!'),
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSeeNextLevel = async () => {
    // Save level completion to goal progress
    if (goalId) {
      try {
        const userGoalsData = await AsyncStorage.getItem('userGoals');
        if (userGoalsData) {
          const userGoals = JSON.parse(userGoalsData);
          const goalIndex = userGoals.findIndex((g: any) => g.id === goalId);
          
          if (goalIndex !== -1) {
            // Update currentStepIndex to mark this level as completed
            // currentStepIndex is 0-indexed: level 1 completed = 0, level 2 completed = 1, etc.
            // So if levelNumber is 1, we set currentStepIndex to 0
            // If levelNumber is 2, we set currentStepIndex to 1, etc.
            const newStepIndex = levelNumber - 1;
            userGoals[goalIndex].currentStepIndex = newStepIndex;
            
            // Also update progress percentage
            const totalSteps = userGoals[goalIndex].numberOfSteps || 4;
            userGoals[goalIndex].progressPercentage = Math.round(((newStepIndex + 1) / totalSteps) * 100);
            
            // Save mood for this level if selected
            if (feelingSelected) {
              if (!userGoals[goalIndex].moods) {
                userGoals[goalIndex].moods = [];
              }
              // Store mood for this level (levelNumber - 1 is the index)
              userGoals[goalIndex].moods[newStepIndex] = feelingSelected;
            }
            
            await AsyncStorage.setItem('userGoals', JSON.stringify(userGoals));
            await trackLevelCompletionEvent(goalId, goalName, levelNumber);
          }
        }
      } catch (error) {
        console.error('Error saving level completion:', error);
      }
    }

    if (isLastLevel) {
      // Show celebration modal instead of navigating immediately
      setShowGoalCompletionCelebration(true);
    } else {
      // Navigate back to goal map with the next level number and goal info
      const nextLevel = levelNumber + 1;
      router.push({
        pathname: '/goal-map',
        params: { 
          unlockLevel: nextLevel,
          goalName: goalName,
          goalId: goalId,
        },
      });
    }
  };

  return (
    <PaperTextureBackground>
      <View style={styles.container}>
      {/* Confetti Pieces */}
      <View style={styles.celebrationContainer} pointerEvents="none">
        {confettiPieces.map((confetti, index) => (
          <Animated.View
            key={`confetti-${index}`}
            style={[
              styles.confettiPiece,
              {
                transform: [
                  { translateX: confetti.translateX },
                  { translateY: confetti.translateY },
                  { scale: confetti.scale },
                  {
                    rotate: confetti.rotation.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
                opacity: confetti.opacity,
              },
            ]}
          >
            <Text style={styles.confettiText}>🎉</Text>
          </Animated.View>
        ))}
      </View>

      {/* Balloons */}
      <View style={styles.balloonsContainer} pointerEvents="none">
        {balloons.map((balloon, index) => (
          <Animated.View
            key={`balloon-${index}`}
            style={[
              styles.balloon,
              {
                left: (width / balloons.length) * index + (width / balloons.length / 2) - 15,
                transform: [
                  { translateY: balloon.translateY },
                  { translateX: balloon.translateX },
                ],
                opacity: balloon.opacity,
              },
            ]}
          >
            <Text style={styles.balloonText}>🎈</Text>
          </Animated.View>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Level Complete Heading */}
        <Animated.View
          style={[
            styles.headingContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Text style={styles.levelCompleteHeading}>{t('levelComplete.levelCompleteHeading', { level: levelNumber })}</Text>
        </Animated.View>

      {/* Goal Name Field */}
      <View style={styles.goalNameField}>
        <Text style={styles.goalNameFieldText}>{goalName}</Text>
      </View>

      {/* Congratulations Text */}
      <Text style={styles.congratulationsText}>
        {t('levelComplete.congratulations', { userName, goalName })}
      </Text>

      {/* Rewards Unlocked Heading */}
      <Text style={styles.rewardsHeading}>{t('levelComplete.rewardsUnlocked')}</Text>

      {/* Rewards List */}
      <View style={styles.rewardsContainer}>
        <View style={styles.rewardItem}>
          <Image source={currentRewards.badgeImage} style={styles.rewardBadge} resizeMode="contain" />
          <Text style={styles.rewardText}>{currentRewards.badge}</Text>
        </View>
        <View style={styles.rewardItem}>
          <Image source={currentRewards.pointsImage} style={styles.rewardBadge} resizeMode="contain" />
          <Text style={styles.rewardText}>{currentRewards.points}</Text>
        </View>
        <View style={styles.rewardItem}>
          <Image source={currentRewards.skillImage} style={styles.rewardBadge} resizeMode="contain" />
          <Text style={styles.rewardText}>{currentRewards.skill}</Text>
        </View>
      </View>


      {/* Share Button */}
      <TouchableOpacity
        style={styles.shareButton}
        onPress={handleShare}
      >
        <Text style={styles.shareButtonText}>{t('levelComplete.share')}</Text>
      </TouchableOpacity>

      {/* How Did It Feel Question */}
      <Text style={styles.feelingQuestion}>{tr('How are you feeling?', 'Как ты себя чувствуешь?')}</Text>

      {/* Feeling Buttons */}
      <View style={styles.feelingButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.feelingButton,
            feelingSelected === 'great' && styles.feelingButtonSelected,
          ]}
          onPress={() => setFeelingSelected('great')}
        >
          <Text style={[
            styles.feelingButtonText,
            feelingSelected === 'great' && styles.feelingButtonTextSelected,
          ]}>
            {t('levelComplete.great')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.feelingButton,
            feelingSelected === 'okay' && styles.feelingButtonSelected,
          ]}
          onPress={() => setFeelingSelected('okay')}
        >
          <Text style={[
            styles.feelingButtonText,
            feelingSelected === 'okay' && styles.feelingButtonTextSelected,
          ]}>
            {t('levelComplete.okay')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.feelingButton,
            feelingSelected === 'hard' && styles.feelingButtonSelected,
          ]}
          onPress={() => setFeelingSelected('hard')}
        >
          <Text style={[
            styles.feelingButtonText,
            feelingSelected === 'hard' && styles.feelingButtonTextSelected,
          ]}>
            {t('levelComplete.hard')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* See Next Level / Back to Goals Button */}
      <TouchableOpacity
        style={styles.seeNextLevelButton}
        onPress={handleSeeNextLevel}
      >
        <Text style={styles.seeNextLevelButtonText}>
          {isLastLevel ? t('levelComplete.backToGoals') : t('levelComplete.seeNextLevel')}
        </Text>
      </TouchableOpacity>

      {/* Proud Text */}
      <Text style={styles.proudText}>{tr('We are very proud of you.', 'Мы очень гордимся тобой.')}</Text>
      </ScrollView>

      {/* Goal Completion Celebration Modal */}
      <Modal
        visible={showGoalCompletionCelebration}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowGoalCompletionCelebration(false);
          router.push('/(tabs)/goals');
        }}
      >
        <View style={styles.celebrationModalOverlay}>
          {/* Celebration Balloons */}
          <View style={styles.celebrationBalloonsContainer} pointerEvents="none">
            {celebrationBalloons.map((balloon, index) => (
              <Animated.View
                key={`celebration-balloon-${index}`}
                style={[
                  styles.celebrationBalloon,
                  {
                    left: balloon.translateX,
                    transform: [
                      { translateY: balloon.translateY },
                      {
                        rotate: balloon.rotation.interpolate({
                          inputRange: [-10, 10],
                          outputRange: ['-10deg', '10deg'],
                        }),
                      },
                      { scale: balloon.scale },
                    ],
                    opacity: balloon.opacity,
                  },
                ]}
              >
                <Text style={styles.celebrationBalloonEmoji}>🎈</Text>
              </Animated.View>
            ))}
          </View>

          {/* Celebration Content */}
          <View style={styles.celebrationContent}>
            <Animated.View
              style={[
                styles.celebrationHeadingContainer,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Text style={styles.celebrationHeading}>{tr('CONGRATULATIONS, YOU DID IT!', 'ПОЗДРАВЛЯЕМ, ТЫ СПРАВИЛСЯ!')}</Text>
            </Animated.View>
            
            <Text style={styles.celebrationSubtext}>
              You've completed all levels and achieved your goal!
            </Text>

            <TouchableOpacity
              style={styles.celebrationExitButton}
              onPress={() => {
                setShowGoalCompletionCelebration(false);
                router.push('/(tabs)/goals');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.celebrationExitButtonText}>{tr('Exit', 'Выйти')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  celebrationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -10, // Half of confetti width
    marginTop: -10, // Half of confetti height
  },
  confettiText: {
    fontSize: 20,
  },
  balloonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height,
    zIndex: 1,
    pointerEvents: 'none',
  },
  balloon: {
    position: 'absolute',
    bottom: -50,
  },
  balloonText: {
    fontSize: 30,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 140, // Moved down by 40px (from 60 + 40 = 100, but we want more so 140)
    paddingBottom: 20,
    alignItems: 'center',
  },
  headingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCompleteHeading: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 28,
    marginBottom: 24,
    textAlign: 'center',
  },
  goalNameField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalNameFieldText: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  congratulationsText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 18, // Decreased from 24 to 18 for tighter spacing
  },
  rewardsHeading: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  rewardsContainer: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center', // Centered all rewards
    paddingHorizontal: 20,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: '100%',
  },
  rewardBadge: {
    width: 24,
    height: 24,
    marginRight: 12,
    alignSelf: 'center',
  },
  rewardText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    lineHeight: 20,
  },
  shareButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 32,
  },
  shareButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: '600',
  },
  feelingQuestion: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  feelingButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    width: '100%',
    justifyContent: 'center',
  },
  feelingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  feelingButtonSelected: {
    backgroundColor: 'rgba(52, 40, 70, 0.2)', // Water/transparent blue effect
    borderColor: '#342846',
  },
  feelingButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: '600',
  },
  feelingButtonTextSelected: {
    color: '#342846',
  },
  seeNextLevelButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  seeNextLevelButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
  },
  proudText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    textAlign: 'center',
  },
  celebrationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationBalloonsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  celebrationBalloon: {
    position: 'absolute',
    bottom: -100,
    width: 40,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationBalloonEmoji: {
    fontSize: 40,
  },
  celebrationContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  celebrationHeadingContainer: {
    marginBottom: 20,
  },
  celebrationHeading: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 22,
    textAlign: 'center',
  },
  celebrationSubtext: {
    ...BodyStyle,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  celebrationExitButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 50,
    minWidth: 120,
    alignItems: 'center',
  },
  celebrationExitButtonText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

