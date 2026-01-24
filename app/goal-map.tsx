import { IconSymbol } from '@/components/ui/icon-symbol';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, ImageBackground, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

export default function GoalMapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const unlockLevelParam = params.unlockLevel ? parseInt(params.unlockLevel as string) : null;
  
  // Get goal name and ID from params, fallback to default
  const goalName = (params.goalName as string) || 'GOAL NAME';
  const goalId = (params.goalId as string) || '';
  
  // Track completed and current levels
  const [completedLevels, setCompletedLevels] = useState<number[]>([]); // Completed stages
  const [currentLevel, setCurrentLevel] = useState<number>(1); // Current active quest (Stage 1)
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockingLevel, setUnlockingLevel] = useState<number | null>(null);
  const [unlockedLevelForBanner, setUnlockedLevelForBanner] = useState<number | null>(null);
  const [showNewQuestBanner, setShowNewQuestBanner] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0); // Progress for current quest (0/5)
  const [currentProgressTotal, setCurrentProgressTotal] = useState(5); // Total tasks (5)
  const [headingHeight, setHeadingHeight] = useState(0); // Height of the heading text
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bannerSlideAnim = useRef(new Animated.Value(100)).current;

  // Load goal progress from AsyncStorage
  const loadGoalProgress = useCallback(async () => {
    try {
      if (!goalId) return;
      
      const userGoalsData = await AsyncStorage.getItem('userGoals');
      if (userGoalsData) {
        const userGoals = JSON.parse(userGoalsData);
        const goal = userGoals.find((g: any) => g.id === goalId);
        
        if (goal) {
          // Get completed levels based on currentStepIndex
          // currentStepIndex is 0-indexed: 0 = level 1 completed, 1 = levels 1-2 completed, etc.
          // So if currentStepIndex is 1, levels 1 and 2 are completed
          const completed: number[] = [];
          const stepIndex = goal.currentStepIndex || 0;
          
          // Get number of steps/milestones
          const totalSteps = goal.steps?.length || 4;
          
          // All levels up to and including currentStepIndex + 1 are completed
          // If currentStepIndex is 0, level 1 is completed
          // If currentStepIndex is 1, levels 1 and 2 are completed
          for (let i = 1; i <= stepIndex + 1; i++) {
            if (i <= totalSteps) { // Only add if it's a valid level
              completed.push(i);
            }
          }
          setCompletedLevels(completed);
          
          // Set current level (next level to complete)
          const nextLevel = stepIndex + 2; // Next level after completed ones
          setCurrentLevel(nextLevel > totalSteps ? totalSteps : (nextLevel < 1 ? 1 : nextLevel));
        }
      }
    } catch (error) {
      console.error('Error loading goal progress:', error);
    }
  }, [goalId]);

  // Load goal progress when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadGoalProgress();
    }, [loadGoalProgress])
  );

  useEffect(() => {
    if (unlockLevelParam && unlockLevelParam > currentLevel) {
      setUnlockingLevel(unlockLevelParam);
      setShowUnlockModal(true);
      setCurrentLevel(unlockLevelParam);
      
      // Animate the unlock
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(2000),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setShowUnlockModal(false);
        // Store the unlocked level for the banner before clearing unlockingLevel
        if (unlockingLevel) {
          setUnlockedLevelForBanner(unlockingLevel);
        }
        setUnlockingLevel(null);
        scaleAnim.setValue(0);
        opacityAnim.setValue(0);
        // Show the new quest banner after modal closes
        setShowNewQuestBanner(true);
        Animated.spring(bannerSlideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      });
    }
  }, [unlockLevelParam]);

  // Load milestone names from goal data, fallback to translations
  const [stageNames, setStageNames] = useState<string[]>([
    t('goalMap.stageNames.1'), // Stage 1
    t('goalMap.stageNames.2'), // Stage 2
    t('goalMap.stageNames.3'), // Stage 3
    t('goalMap.stageNames.4'), // Stage 4
  ]);

  // Load goal milestones when goal is loaded
  useEffect(() => {
    const loadGoalMilestones = async () => {
      try {
        if (!goalId) return;
        
        const userGoalsData = await AsyncStorage.getItem('userGoals');
        if (userGoalsData) {
          const userGoals = JSON.parse(userGoalsData);
          const goal = userGoals.find((g: any) => g.id === goalId);
          
          if (goal && goal.steps && Array.isArray(goal.steps) && goal.steps.length > 0) {
            // Use milestone names from goal steps
            const milestoneNames = goal.steps
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
              .map((step: any) => step.name || step.description || '');
            
            // Only update if we have valid milestone names
            if (milestoneNames.length > 0 && milestoneNames.every((name: string) => name.trim())) {
              setStageNames(milestoneNames);
            }
          }
        }
      } catch (error) {
        console.error('Error loading goal milestones:', error);
      }
    };
    
    loadGoalMilestones();
  }, [goalId, t]);

  // Calculate available space - heading is on same line as back/info buttons
  const buttonTop = insets.top + 20; // Same vertical position as back and info buttons
  const headingTop = buttonTop; // Heading aligned with buttons
  const tabBarHeight = Platform.OS === 'ios' ? 75 : 55;
  const availableHeight = height - headingTop - tabBarHeight - 100; // Account for heading space
  
  // Stage positions - with 40px left/right padding
  const horizontalPadding = 40;
  const circleRadius = 35; // Larger circles for unlocked stages
  const circleWidth = 70; // Circle diameter
  const cardWidth = 180; // Approximate card width
  const cardMargin = 8; // Margin between circle and card (8px as requested)
  const availableWidth = width - (horizontalPadding * 2);
  
  // Calculate vertical spacing - ensure all 4 levels fit on screen above the banner
  // Banner height: ~100px (padding + content)
  // Banner position: bottom: tabBarHeight (75 iOS / 55 Android)
  // So banner top is at: height - tabBarHeight - bannerHeight
  const bannerHeight = 100; // Approximate banner height with padding
  const bannerTop = height - tabBarHeight - bannerHeight;
  
  // Circle and card dimensions
  const level1CircleHeight = 49; // Level 1 circle is smaller (30% reduction)
  const otherCircleHeight = 70; // Other levels use standard circle size
  const cardHeight = 80; // Approximate card height including margins
  const circleToCardSpacing = 6; // Space between circle and its card (6px as requested)
  
  // Layout: Levels go down vertically in order: 1 → 2 → 3 → 4
  // Odd levels (1, 3) on left, Even levels (2, 4) on right
  const headingToCardSpacing = 40; // 40px spacing between heading bottom and Level 1 card
  const bottomPadding = 20; // Space between lowest card and banner
  const availableLevelHeight = bannerTop - headingTop - headingHeight - headingToCardSpacing - bottomPadding;
  
  // Each level takes: circleHeight + circleToCardSpacing + cardHeight
  const level1Height = level1CircleHeight + circleToCardSpacing + cardHeight;
  const otherLevelHeight = otherCircleHeight + circleToCardSpacing + cardHeight;
  
  // Fixed vertical spacing between cards - 90px as requested
  const verticalSpacing = 90; // 90px spacing between each card
  
  // Calculate positions for all stages dynamically
  // Level 1 - starts 40px below the last line of the heading
  const level1CardTopFinal = headingTop + headingHeight + headingToCardSpacing;
  const level1CardCenter = level1CardTopFinal + (cardHeight / 2);
  const level1CircleTopFinal = level1CardCenter - (level1CircleHeight / 2);
  const level1CardBottom = level1CardTopFinal + cardHeight;
  
  // Level 2 - entire level (circle + card) starts below Level 1 card
  const level2CardTopFinal = level1CardBottom + verticalSpacing;
  const level2CardCenter = level2CardTopFinal + (cardHeight / 2);
  const level2CircleTopFinal = level2CardCenter - (otherCircleHeight / 2);
  const level2CardBottom = level2CardTopFinal + cardHeight;
  
  // Level 3 - entire level (circle + card) starts below Level 2 card
  const level3CardTopFinal = level2CardBottom + verticalSpacing;
  const level3CardCenter = level3CardTopFinal + (cardHeight / 2);
  const level3CircleTopFinal = level3CardCenter - (otherCircleHeight / 2);
  const level3CardBottom = level3CardTopFinal + cardHeight;
  
  // Level 4 - entire level (circle + card) starts below Level 3 card
  const level4CardTopFinal = level3CardBottom + verticalSpacing;
  const level4CardCenter = level4CardTopFinal + (cardHeight / 2);
  const level4CircleTopFinal = level4CardCenter - (otherCircleHeight / 2);
  
  // Right side position
  const rightSideLeft = width - horizontalPadding - otherCircleHeight;
  
  // Calculate card left positions
  const cardMinWidth = 200;
  const lockedCircleWidth = 50;
  
  // Level 1 and Level 3 circles must have EXACTLY the same left position
  const leftSideCircleLeft = horizontalPadding;
  const level1CircleLeft = leftSideCircleLeft;
  const level3CircleLeft = leftSideCircleLeft;
  
  // Align both Level 1 and Level 3 cards to the same left position
  const leftSideCardLeft = horizontalPadding + level1CircleHeight + cardMargin;
  const level1CardLeft = leftSideCardLeft;
  const level3CardLeft = leftSideCardLeft;
  
  // Levels 2-4 numbered circles
  const level2CircleLeft = width - horizontalPadding - cardMinWidth - cardMargin - otherCircleHeight - 40;
  const level2CardLeft = level2CircleLeft + otherCircleHeight + cardMargin;
  
  const level4CircleLeft = width - horizontalPadding - cardMinWidth - cardMargin - otherCircleHeight - 40;
  const level4CardLeft = level4CircleLeft + otherCircleHeight + cardMargin;

  // Generate stage positions dynamically based on number of stages
  const generateStagePositions = (numStages: number) => {
    const positions = [];
    const cardTops = [level1CardTopFinal, level2CardTopFinal, level3CardTopFinal, level4CardTopFinal];
    const circleTops = [level1CircleTopFinal, level2CircleTopFinal, level3CircleTopFinal, level4CircleTopFinal];
    const circleLefts = [level1CircleLeft, level2CircleLeft, level3CircleLeft, level4CircleLeft];
    const cardLefts = [level1CardLeft, level2CardLeft, level3CardLeft, level4CardLeft];
    const cardSides: ('left' | 'right')[] = ['right', 'left', 'right', 'left'];
    
    for (let i = 0; i < numStages && i < 4; i++) {
      const stageNumber = i + 1;
      positions.push({
        circleTop: circleTops[i],
        cardTop: cardTops[i],
        circleLeft: circleLefts[i],
        cardLeft: cardLefts[i],
        cardSide: cardSides[i],
        lockedCircleAdjustment: stageNumber === 1 
          ? lockedCircleWidth - level1CircleHeight 
          : otherCircleHeight - lockedCircleWidth,
      });
    }
    
    return positions;
  };
  
  // Get the number of milestones/stages
  const numberOfStages = stageNames.length;
  
  const stagePositions = generateStagePositions(numberOfStages);

  // Debug: Verify card positions are in ascending order
  // console.log('Card positions:', {
  //   level1: stagePositions[0].cardTop,
  //   level2: stagePositions[1].cardTop,
  //   level3: stagePositions[2].cardTop,
  //   level4: stagePositions[3].cardTop,
  // });

  // Get stage status
  const getStageStatus = (stageNumber: number) => {
    if (stageNumber > numberOfStages) return 'locked';
    if (completedLevels.includes(stageNumber)) return 'completed';
    if (stageNumber === currentLevel) return 'current';
    if (stageNumber < currentLevel) return 'unlocked'; // Unlocked but not current
    return 'locked';
  };

  // Get the next stage to complete - use unlockedLevelForBanner if available, otherwise calculate from currentLevel
  const getNextStageInfo = () => {
    // If a level was just unlocked, use that level for the banner
    const stageToShow = unlockedLevelForBanner || currentLevel;
    if (stageToShow > numberOfStages) return null;
    return {
      stageNumber: stageToShow,
      stageName: stageNames[stageToShow - 1] || `Stage ${stageToShow}`,
    };
  };

  const nextStageInfo = getNextStageInfo();

  const handleViewQuest = () => {
    if (nextStageInfo) {
      setShowNewQuestBanner(false);
      setUnlockedLevelForBanner(null); // Clear after viewing
      router.push({
        pathname: '/level-detail',
        params: {
          level: nextStageInfo.stageNumber.toString(),
          goalName: goalName,
          goalId: goalId,
        },
      });
    }
  };

  const handleStagePress = (stageNumber: number) => {
    const status = getStageStatus(stageNumber);
    if (status === 'locked') return;
    
    router.push({
      pathname: '/level-detail',
      params: {
        level: stageNumber.toString(),
        goalName: goalName,
        goalId: goalId,
      },
    });
  };

  return (
    <ImageBackground 
      source={require('../assets/images/quest.map.png')} 
      style={styles.container}
      resizeMode="cover"
    >
      {/* Back Button - Top Left */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 20 }]}
        onPress={() => router.push('/(tabs)/goals')}
      >
        <View style={styles.circularButton}>
          <Text style={styles.backButtonText}>←</Text>
        </View>
      </TouchableOpacity>

      {/* Info Button - Top Right */}
      <TouchableOpacity 
        style={[styles.infoButton, { top: insets.top + 20 }]}
        onPress={() => setShowInfoModal(true)}
      >
        <View style={styles.circularButton}>
          <Text style={styles.infoButtonText}>i</Text>
        </View>
      </TouchableOpacity>

      {/* Heading - Same line as back/info buttons */}
      <View 
        style={[styles.headerTitleContainer, { top: headingTop }]}
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          if (height > 0) {
            setHeadingHeight(height);
          }
        }}
      >
        <Text style={styles.goalName}>{goalName.toUpperCase()}</Text>
      </View>

      {/* Quest Map Container */}
      <View style={styles.mapContainer}>
        {stagePositions.map((position, index) => {
          const stageNumber = index + 1;
          const status = getStageStatus(stageNumber);
          const stageName = stageNames[index] || `Stage ${stageNumber}`;
          const isFirstStage = stageNumber === 1;
          
          return (
            <React.Fragment key={stageNumber}>
              {/* Circle for Stage */}
              <TouchableOpacity
                style={[styles.stageContainer, { 
                  top: position.circleTop, 
                  left: position.circleLeft + (status === 'locked' ? position.lockedCircleAdjustment : 0)
                }]}
                onPress={() => handleStagePress(stageNumber)}
                activeOpacity={0.8}
                disabled={status === 'locked'}
              >
                {status === 'completed' ? (
                  <ExpoLinearGradient
                    colors={['#6B5B95', '#9B8FB8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={isFirstStage ? styles.level1CircleGradient : styles.level1CircleGradient}
                  >
                    <Text style={isFirstStage ? styles.level1Number : styles.level1Number}>{stageNumber}</Text>
                  </ExpoLinearGradient>
                ) : status === 'current' || status === 'unlocked' ? (
                  <ExpoLinearGradient
                    colors={['#6B5B95', '#9B8FB8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.currentCircleGradient}
                  >
                    <Text style={styles.currentNumber}>{stageNumber}</Text>
                  </ExpoLinearGradient>
                ) : (
                  <View style={styles.lockedCircle}>
                    <MaterialIcons name="lock" size={20} color="#333C4E" />
                  </View>
                )}
              </TouchableOpacity>
              
              {/* Card for Stage */}
              <TouchableOpacity
                style={[styles.cardContainer, { top: position.cardTop, left: position.cardLeft }]}
                onPress={() => handleStagePress(stageNumber)}
                activeOpacity={0.8}
                disabled={status === 'locked'}
              >
                {status === 'completed' ? (
                  <View style={[styles.currentLevelBox, position.cardSide === 'right' ? styles.cardRight : styles.cardLeft]}>
                    <Text style={styles.completedLevelLabel}>Level {stageNumber}</Text>
                    <Text style={styles.completedLevelNameHeading}>{stageName}</Text>
                  </View>
                ) : status === 'current' || status === 'unlocked' ? (
                  <View style={[styles.currentLevelBox, position.cardSide === 'right' ? styles.cardRight : styles.cardLeft, styles.incompleteCard]}>
                    <Text style={styles.incompleteLevelLabel}>Level {stageNumber}</Text>
                    <Text style={styles.levelNameHeading}>{stageName}</Text>
                  </View>
                ) : (
                  <View style={[styles.lockedCalloutBox, position.cardSide === 'right' ? styles.cardRight : styles.cardLeft]}>
                    <Text style={styles.levelLabel}>Level {stageNumber}</Text>
                    <Text style={styles.levelNameHeading}>{stageName}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      {/* Level Unlock Modal */}
      <Modal
        visible={showUnlockModal}
        transparent={true}
        animationType="none"
      >
        <View style={styles.unlockModalOverlay}>
          <Animated.View
            style={[
              styles.unlockModalContent,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            {unlockingLevel && (
              <>
                <View style={styles.unlockBadgeContainer}>
                  <Text style={styles.unlockBadgeText}>{unlockingLevel}</Text>
                </View>
                <Text style={styles.unlockModalText}>
                  Level {unlockingLevel} Unlocked!
                </Text>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalContent}>
            {/* Close Button - Top Right */}
            <TouchableOpacity
              style={styles.infoModalCloseButton}
              onPress={() => setShowInfoModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.infoModalCloseButtonText}>✕</Text>
            </TouchableOpacity>
            
            <Text style={styles.infoModalText}>
              {t('goalMap.questMapDescription')}
            </Text>
          </View>
        </View>
      </Modal>

      {/* New Quest Unlocked Banner */}
      {showNewQuestBanner && nextStageInfo && (
        <Animated.View
          style={[
            styles.newQuestBanner,
            {
              transform: [{ translateY: bannerSlideAnim }],
            },
          ]}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerLeft}>
              <View style={styles.bannerIconContainer}>
                <IconSymbol name="star.fill" size={24} color="#715C4C" />
              </View>
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>{t('goalMap.newQuestAvailable')}</Text>
                <Text style={styles.bannerSubtitle}>
                  {t('goalMap.completeStage', { stage: nextStageInfo.stageNumber, stageName: nextStageInfo.stageName.toLowerCase() })}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.bannerViewButton}
              onPress={handleViewQuest}
              activeOpacity={0.8}
            >
              <Text style={styles.bannerViewButtonText}>View</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
  },
  infoButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  circularButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#333C4E',
    fontWeight: '600',
  },
  infoButtonText: {
    fontSize: 18,
    color: '#333C4E',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 70, // After back button (20px left + 40px button width + 10px spacing)
    right: 70, // Before info button (20px right + 40px button width + 10px spacing)
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  goalName: {
    ...HeadingStyle,
    color: '#FFFFFF', // White color
    fontSize: 24,
    textAlign: 'center',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'visible', // Changed to visible so cards aren't clipped
    paddingHorizontal: 0, // Padding handled by individual stage positions
  },
  stageWrapper: {
    position: 'relative',
  },
  stageContainer: {
    position: 'absolute',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    zIndex: 10, // Ensure circles are above cards
  },
  cardContainer: {
    position: 'absolute',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    zIndex: 1, // Cards below circles
  },
  // Current Quest Styles
  currentCircleGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  currentNumber: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  // Level 1 specific styles - 30% smaller circle
  level1CircleGradient: {
    width: 49, // 70px * 0.7 = 49px (30% reduction)
    height: 49,
    borderRadius: 24.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  level1Number: {
    color: '#fff',
    fontSize: 22, // Reduced proportionally (32 * 0.7 ≈ 22)
    fontWeight: 'bold',
  },
  level1Card: {
    marginTop: 8, // Keep card below circle
    marginLeft: 12, // Card on right side of circle
    minWidth: 200, // Minimum width for consistency
    maxWidth: 280, // Maximum width to allow expansion for longer text
  },
  currentLevelBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 25, // 25px vertical spacing between cards
    minWidth: 200, // Minimum width for consistency
    maxWidth: 280, // Maximum width to allow expansion for longer text
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  level2Card: {
    marginTop: 8, // FIXED - same as level1Card to prevent movement
    marginLeft: -170, // Position card so its right edge aligns with circle's right edge (adjusted for max width) - FIXED
    alignSelf: 'flex-start',
    minWidth: 200, // Minimum width for consistency
    maxWidth: 280, // Maximum width to allow expansion for longer text
  },
  cardRight: {
    marginLeft: 0, // Cards are positioned absolutely, no margin needed
    minWidth: 200, // Minimum width for consistency
    maxWidth: 280, // Maximum width to allow expansion for longer text
  },
  cardLeft: {
    marginRight: 0,
    marginLeft: 0, // Cards are positioned absolutely, no margin needed
    alignSelf: 'flex-start',
    minWidth: 200, // Minimum width for consistency
    maxWidth: 280, // Maximum width to allow expansion for longer text
  },
  levelLabel: {
    ...BodyStyle,
    color: '#FFFFFF', // White for locked levels
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  completedLevelLabel: {
    ...BodyStyle,
    color: '#342846', // Purple for completed cards
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  incompleteLevelLabel: {
    ...BodyStyle,
    color: '#fff', // White for incomplete cards
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  incompleteCard: {
    backgroundColor: 'transparent', // Transparent background so white text is visible
  },
  levelName: {
    ...BodyStyle,
    color: '#333C4E',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  levelNameHeading: {
    ...HeadingStyle,
    color: '#FFFFFF', // White for non-completed levels
    fontSize: 18,
    marginBottom: 8,
  },
  completedLevelNameHeading: {
    ...HeadingStyle,
    color: '#342846', // Purple for completed levels (on white card)
    fontSize: 18,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#333C4E',
    borderRadius: 2,
  },
  progressText: {
    ...BodyStyle,
    color: '#666',
    fontSize: 12,
    minWidth: 30,
  },
  // Locked Stage Styles
  lockedCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginTop: 8,
  },
  lockedCalloutBox: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 12,
    minWidth: 160,
    marginTop: 8,
    marginBottom: 25, // 25px vertical spacing between cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  // Modal Styles
  unlockModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#342846',
  },
  unlockBadgeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#332B40',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  unlockBadgeText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  unlockModalText: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 24,
    textAlign: 'center',
  },
  // Banner Styles
  newQuestBanner: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 75 : 55,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  bannerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4C9BF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    ...HeadingStyle,
    color: '#333C4E',
    fontSize: 16,
    marginBottom: 4,
  },
  bannerSubtitle: {
    ...BodyStyle,
    color: '#333C4E',
    fontSize: 14,
    lineHeight: 18,
  },
  bannerViewButton: {
    backgroundColor: '#332B40',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  bannerViewButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  infoModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    position: 'relative',
  },
  infoModalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  infoModalCloseButtonText: {
    fontSize: 24,
    color: '#342846',
    fontWeight: 'bold',
  },
  infoModalText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 8,
  },
});
