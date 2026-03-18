import { IconSymbol } from '@/components/ui/icon-symbol';
import AtlasChat from '@/components/screens/ChatScreen';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { generateGoalMotivationalSentence, generateLevelStepInstructions } from '@/utils/claudeApi';
import { markGoalAsCompleted, trackLevelCompletionEvent, trackStepCompletionEvent } from '@/utils/goalTracking';
import i18nInstance from '@/utils/i18n';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Dimensions, Image, ImageBackground, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
// On iPad the app is constrained to 74% of window width; use this for level positioning.
const effectiveWidth = width;

// File-level fallback translator to avoid runtime ReferenceError in nested scopes.
const tr = (en: string, ru: string) =>
  i18nInstance.language?.toLowerCase().startsWith('ru') ? ru : en;

export default function GoalMapScreen() {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const unlockLevelParam = params.unlockLevel ? parseInt(params.unlockLevel as string) : null;
  const scrollToLevelParam = params.scrollToLevel ? parseInt(params.scrollToLevel as string) : null;
  const isTabletLayout = Platform.OS === 'ios' && Platform.isPad;
  const levelCardScale = isTabletLayout ? 1.5 * 1.3 : 1;
  const scaleLevelCard = (value: number) => value * levelCardScale;
  const levelIconScale = 1;
  const scaleLevelIcon = (value: number) => value * levelIconScale;
  
  // Get goal name and ID from params, fallback to default
  const goalId = (params.goalId as string) || '';
  // Goal name will be loaded from goal data (either user-inputted or AI-generated)
  const [goalName, setGoalName] = useState(tr('GOAL TITLE', 'НАЗВАНИЕ ЦЕЛИ'));
  
  // Track completed and current levels
  const [completedLevels, setCompletedLevels] = useState<number[]>([]); // Completed stages
  const [currentLevel, setCurrentLevel] = useState<number>(1); // Current active quest (Stage 1)
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockingLevel, setUnlockingLevel] = useState<number | null>(null);
  const [unlockedLevelForBanner, setUnlockedLevelForBanner] = useState<number | null>(null);
  const [showNewQuestBanner, setShowNewQuestBanner] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showGoalCompleteModal, setShowGoalCompleteModal] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0); // Progress for current quest (0/5)
  const [currentProgressTotal, setCurrentProgressTotal] = useState(5); // Total tasks (5)
  const [headingHeight, setHeadingHeight] = useState(0); // Height of the heading text
  const [goalReminder, setGoalReminder] = useState<string>(''); // Reminder/description of why user wants to achieve this goal
  const [motivationalSentence, setMotivationalSentence] = useState<string>(''); // AI-generated motivational sentence
  const [isGeneratingMotivation, setIsGeneratingMotivation] = useState(false);
  const [showEncouragementBanner, setShowEncouragementBanner] = useState(true); // Control banner visibility
  const scrollViewRef = useRef<ScrollView>(null);
  const hasOpenedLevelFromParam = useRef(false); // Track if we've already opened level from scrollToLevelParam
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bannerSlideAnim = useRef(new Animated.Value(100)).current;
  const [showLevelDetail, setShowLevelDetail] = useState<any>(null);
  
  // Starfield animation values
  const starAnim1 = useRef(new Animated.Value(1)).current;
  const starAnim2 = useRef(new Animated.Value(1)).current;
  const starAnim3 = useRef(new Animated.Value(1)).current;
  
  // Pulse animation for current level glow
  const currentGlowAnim = useRef(new Animated.Value(0.6)).current;
  
  // Animate current level glow
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(currentGlowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(currentGlowAnim, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [currentGlowAnim]);
  
  // Animate stars
  useEffect(() => {
    const createStarAnimation = (animValue: Animated.Value, duration: number, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 0.5,
            duration: duration / 2,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ])
      );
    };
    
    const anim1 = createStarAnimation(starAnim1, 4000, 0);
    const anim2 = createStarAnimation(starAnim2, 6000, 1000);
    const anim3 = createStarAnimation(starAnim3, 5000, 2000);
    
    anim1.start();
    anim2.start();
    anim3.start();
    
    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

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
          // currentStepIndex is -1-indexed: -1 = no levels completed (only level 1 unlocked), 0 = level 1 completed, 1 = levels 1-2 completed, etc.
          const completed: number[] = [];
          let stepIndex = goal.currentStepIndex !== undefined ? goal.currentStepIndex : -1;
          
          // Safeguard: If progress is 0 and currentStepIndex is 0, treat as not started (-1)
          // This handles cases where goals were created with currentStepIndex: 0 before the fix
          if (stepIndex === 0 && goal.progressPercentage === 0) {
            stepIndex = -1;
          }
          
          // Get number of steps/milestones - limit to maximum 4 levels
          const totalSteps = Math.min(goal.steps?.length || 4, 4);
          
          // If currentStepIndex is -1, no levels are completed (only level 1 is unlocked)
          // If currentStepIndex is 0, level 1 is completed
          // If currentStepIndex is 1, levels 1 and 2 are completed
          if (stepIndex >= 0) {
            for (let i = 1; i <= stepIndex + 1; i++) {
              if (i <= totalSteps && i <= 4) { // Only add if it's a valid level and max 4
                completed.push(i);
              }
            }
          }
          setCompletedLevels(completed);
          
          // Set current level (next level to complete)
          // If stepIndex is -1, current level is 1 (unlocked but not completed)
          // If stepIndex is 0, current level is 2 (level 1 completed, level 2 is next)
          // If stepIndex is 1, current level is 3 (levels 1-2 completed, level 3 is next)
          let nextLevel;
          if (stepIndex === -1) {
            // No levels completed yet, level 1 is current
            nextLevel = 1;
          } else {
            // Next level after completed ones
            nextLevel = stepIndex + 2;
          }
          // Ensure nextLevel doesn't exceed 4
          setCurrentLevel(Math.min(Math.max(nextLevel, 1), 4));
          
          // Load goal reminder (why they want to achieve this goal)
          // Using obstacle field as reminder, can be updated if a dedicated reminder field exists
          setGoalReminder(goal.obstacle || goal.fear || '');
          
          // Generate motivational sentence based on user's answers and goal
          generateMotivationalSentence(goal);
        }
      }
    } catch (error) {
      console.error('Error loading goal progress:', error);
    }
  }, [goalId]);

  // Generate motivational sentence using AI
  const generateMotivationalSentence = useCallback(async (goal: any) => {
    try {
      setIsGeneratingMotivation(true);
      
      // Load user's ikigai answers and other personal data
      const [
        whatYouLove,
        whatYouGoodAt,
        whatWorldNeeds,
        whatCanBePaidFor,
        fear,
        whatExcites,
      ] = await Promise.all([
        AsyncStorage.getItem('ikigaiWhatYouLove') || '',
        AsyncStorage.getItem('ikigaiWhatYouGoodAt') || '',
        AsyncStorage.getItem('ikigaiWhatWorldNeeds') || '',
        AsyncStorage.getItem('ikigaiWhatCanBePaidFor') || '',
        AsyncStorage.getItem('fear') || '',
        AsyncStorage.getItem('whatExcites') || '',
      ]);

      const motivationalText = await generateGoalMotivationalSentence(
        goal.name || goalName,
        goal.id,
        goal.pathName,
        goal.pathDescription,
        whatYouLove || undefined,
        whatYouGoodAt || undefined,
        whatWorldNeeds || undefined,
        whatCanBePaidFor || undefined,
        fear || goal.fear || undefined,
        whatExcites || undefined
      );

      setMotivationalSentence(motivationalText);
    } catch (error) {
      console.error('Error generating motivational sentence:', error);
      // Fallback motivational sentence
      setMotivationalSentence(`Keep moving forward with ${goal?.name || goalName}. You've got this!`);
    } finally {
      setIsGeneratingMotivation(false);
    }
  }, [goalName]);

  // Load goal progress when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadGoalProgress();
    }, [loadGoalProgress])
  );

  // Reset the flag when component mounts (only once per navigation)
  useEffect(() => {
    hasOpenedLevelFromParam.current = false;
  }, []); // Empty deps = only on mount

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
        // Banner removed - no longer showing new quest banner
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
  
  // Store step descriptions for each level
  const [stageDescriptions, setStageDescriptions] = useState<string[]>([]);

  // Load goal name and milestones when goal is loaded
  useEffect(() => {
    const loadGoalData = async () => {
      try {
        if (!goalId) return;
        
        const userGoalsData = await AsyncStorage.getItem('userGoals');
        if (userGoalsData) {
          const userGoals = JSON.parse(userGoalsData);
          const goal = userGoals.find((g: any) => g.id === goalId);
          
          if (goal) {
            // Load goal name from goal data (this is the heading for the quest map)
            // The goal name can be either user-inputted (from Custom Path) or AI-generated
            if (goal.name) {
              setGoalName(goal.name);
            } else if (params.goalName) {
              // Fallback to params if goal.name is not available
              setGoalName(params.goalName as string);
            }
            
            // Load milestone names and descriptions from goal steps
            // Note: The quest map is generated based on BOTH the user's path choice (pathName/pathDescription)
            // and goal choice combined. The steps are generated using generateGoalSteps which incorporates
            // path information, ensuring the quest map reflects the chosen path's framework and methodology.
            if (goal.steps && Array.isArray(goal.steps) && goal.steps.length > 0) {
              // Sort steps by order or number and limit to 4 levels maximum
              const sortedSteps = goal.steps.sort((a: any, b: any) => {
                const orderA = a.order || a.number || 0;
                const orderB = b.order || b.number || 0;
                return orderA - orderB;
              }).slice(0, 4); // Limit to maximum 4 levels
              
              // Extract milestone names (removing "Level X:" prefixes)
              const milestoneNames = sortedSteps.map((step: any, index: number) => {
                // Try to get name from multiple possible fields
                // Priority: name > text > description
                let stepName = step.name || step.text || step.description || '';
                
                // Clean up any "Level X:" or "Step X:" patterns
                stepName = stepName.replace(/^(Level|Step)\s*\d+\s*:?\s*/i, '').trim();
                
                // Check if the name is just "Step X" or a number
                const isStepPattern = /^(Step|Level)\s*\d+$/i.test(stepName) || /^\d+$/.test(stepName) || stepName.toLowerCase().startsWith('step');
                
                // If still empty or looks like "Step X", generate a proper level name
                if (!stepName || isStepPattern) {
                  // Generate AI-based level names based on goal context
                  const fallbackNames = [
                    tr('Foundation', 'Фундамент'),
                    tr('Skill Building', 'Развитие навыков'),
                    tr('Momentum', 'Набор импульса'),
                    tr('Mastery', 'Мастерство'),
                  ];
                  const stepIndex = (step.order || step.number || index + 1) - 1;
                  const levelNum = step.order || step.number || index + 1;
                  stepName = fallbackNames[stepIndex] || tr(`Level ${levelNum}`, `Уровень ${levelNum}`);
                }
                
                return stepName;
              });
              
              // Extract descriptions (short descriptions for each level)
              const descriptions = sortedSteps.map((step: any) => {
                // Use the description field, ensuring it's short (max 15 words)
                let desc = step.description || '';
                
                // If no description, try to create one from the name
                if (!desc && step.name) {
                  desc = tr(
                    `Complete ${step.name.toLowerCase()} to progress`,
                    `Выполни «${step.name}» для продвижения`
                  );
                } else if (!desc && step.text && !step.text.match(/^(Level|Step)\s*\d+/i)) {
                  desc = tr(
                    `Complete ${step.text.toLowerCase()} to progress`,
                    `Выполни «${step.text}» для продвижения`
                  );
                }
                
                const words = desc.split(' ');
                if (words.length > 15) {
                  desc = words.slice(0, 15).join(' ') + '...';
                }
                
                return desc || milestoneNames[sortedSteps.indexOf(step)] || '';
              });
              
              // Only update if we have valid milestone names
              if (milestoneNames.length > 0 && milestoneNames.every((name: string) => name.trim() && !name.match(/^(Level|Step)\s*\d+$/i))) {
                setStageNames(milestoneNames);
                setStageDescriptions(descriptions);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading goal data:', error);
      }
    };
    
    loadGoalData();
  }, [goalId, t]);

  // Calculate available space - heading is on same line as back/info buttons
  const buttonTop = insets.top + 20; // Original position restored
  const headingTop = buttonTop; // Heading aligned with buttons
  const tabBarHeight = Platform.OS === 'ios' ? 75 : 55;
  const availableHeight = height - headingTop - tabBarHeight - 100; // Account for heading space
  
  // Stage positions - with 40px left/right padding
  const horizontalPadding = 40;
  const circleRadius = 35; // Larger circles for unlocked stages
  const circleWidth = 70; // Circle diameter
  const cardWidth = scaleLevelCard(126); // iPad cards are 50% larger
  const cardMargin = scaleLevelCard(15); // Keep visual spacing proportional when card size grows
  const availableWidth = width - (horizontalPadding * 2);
  
  // Calculate vertical spacing - ensure all 4 levels fit on screen above the banner
  // Account for encouragement banner and continue button at bottom
  // Continue button height: ~60px, encouragement banner: ~80px (if visible)
  // Use the larger of the two, plus some spacing
  const bottomElementsHeight = 80; // Account for continue button or encouragement banner
  const bannerTop = height - tabBarHeight - bottomElementsHeight;
  
  // Circle and card dimensions
  const stageContainerSize = scaleLevelIcon(85);
  const level1CircleHeight = scaleLevelIcon(49); // Level 1 circle is smaller (30% reduction)
  const otherCircleHeight = scaleLevelIcon(70); // Other levels use standard circle size
  // Keep the absolute layout in sync with the rendered card height.
  const cardHeight = scaleLevelCard(50);
  const circleToCardSpacing = 21; // Space between circle and its card (increased by 15px from 6px to 21px)
  
  // Layout: Levels go down vertically in order: 1 → 2 → 3 → 4
  // Odd levels (1, 3) on left, Even levels (2, 4) on right
  // Progress section height: ~60px (label + track with original padding)
  const progressSectionHeight = 60;
  const headingToCardSpacing = 40; // Original spacing restored
  const bottomPadding = 20; // Original bottom padding restored
  const availableLevelHeight = bannerTop - headingTop - headingHeight - progressSectionHeight - headingToCardSpacing - bottomPadding;
  
  // Each level takes: circleHeight + circleToCardSpacing + cardHeight
  const level1Height = level1CircleHeight + circleToCardSpacing + cardHeight;
  const otherLevelHeight = otherCircleHeight + circleToCardSpacing + cardHeight;
  
  // Vertical spacing between cards (bottom of one card to top of next card)
  const verticalSpacing = isTabletLayout ? 50 : 107;
  
  // Calculate positions for all stages dynamically
  // Level 1 - starts below the progress section with exactly 10px top margin
  const level1CardTopFinal = headingTop + headingHeight + progressSectionHeight + 10; // Always 10px spacing from progress section
  const level1CardCenter = level1CardTopFinal + (cardHeight / 2);
  const level1CircleTopFinal = level1CardCenter - (level1CircleHeight / 2) + 37 + (isTabletLayout ? 40 : 0); // iPad: move level 1 number down 40px
  const level1CardBottom = level1CardTopFinal + cardHeight;
  
  // Level 2 - entire level (circle + card) starts below Level 1 card
  const level2CardTopFinal = level1CardBottom + verticalSpacing;
  const level2CardCenter = level2CardTopFinal + (cardHeight / 2);
  const level2CircleTopFinal = level2CardCenter - (otherCircleHeight / 2) + 37; // Moved icon down by 37px total
  const level2CardBottom = level2CardTopFinal + cardHeight;
  
  // Level 3 - entire level (circle + card) starts below Level 2 card
  const level3CardTopFinal = level2CardBottom + verticalSpacing;
  const level3CardCenter = level3CardTopFinal + (cardHeight / 2);
  const level3CircleTopFinal = level3CardCenter - (otherCircleHeight / 2) + 37; // Moved icon down by 37px total
  const level3CardBottom = level3CardTopFinal + cardHeight;
  
  // Level 4 - entire level (circle + card) starts below Level 3 card
  const level4CardTopFinal = level3CardBottom + verticalSpacing;
  const level4CardCenter = level4CardTopFinal + (cardHeight / 2);
  const level4CircleTopFinal = level4CardCenter - (otherCircleHeight / 2) + 37; // Moved icon down by 37px total
  
  // Right side position
  const rightSideLeft = effectiveWidth - horizontalPadding - otherCircleHeight;
  
  // Calculate card left positions
  const cardMinWidth = scaleLevelCard(140); // iPad cards are 50% larger
  const lockedCircleWidth = scaleLevelIcon(50);
  
  // Level 1 and Level 3 circles must have EXACTLY the same left position
  const leftSideCircleLeft = horizontalPadding;
  const level1CircleLeft = leftSideCircleLeft;
  const level3CircleLeft = leftSideCircleLeft;
  
  // Level 1 card position (uses level1CircleHeight = 49px)
  const level1CardLeft = horizontalPadding + level1CircleHeight + cardMargin;
  
  // Level 3 card position (uses otherCircleHeight = 70px when not locked)
  const level3CardLeft = horizontalPadding + otherCircleHeight + cardMargin;
  
  // Levels 2-4 numbered circles
  // Move circles left by 50px to match card movement, maintaining 15px spacing
  const level2CircleLeft = effectiveWidth - horizontalPadding - cardMinWidth - cardMargin - otherCircleHeight - 40 + 37 - 50;
  const level2CardLeft = level2CircleLeft + otherCircleHeight + cardMargin;

  const level4CircleLeft = effectiveWidth - horizontalPadding - cardMinWidth - cardMargin - otherCircleHeight - 40 + 37 - 50;
  const level4CardLeft = level4CircleLeft + otherCircleHeight + cardMargin;

  // Generate stage positions dynamically based on number of stages
  // Apply 165px upward offset to move all level cards and icons up (135px + 30px)
  const LEVEL_OFFSET = -195; // Move levels up to reduce excessive top gap under "ТВОЙ ПУТЬ"
  const LEVEL1_TOP_MARGIN = 12; // Prevent top clipping for level 1 icon/card
  const iPadCardsVerticalOffset = isTabletLayout ? 70 : 0;
  const iPadLevel2ExtraOffset = isTabletLayout ? 80 : 0;
  const iPadLevel3ExtraOffset = isTabletLayout ? 100 : 0;
  const iPadLevel4ExtraOffset = isTabletLayout ? 135 : 0;
  const stageVerticalOffsets = [LEVEL1_TOP_MARGIN, iPadLevel2ExtraOffset, iPadLevel3ExtraOffset, iPadLevel4ExtraOffset];
  const renderedCardTops = [level1CardTopFinal, level2CardTopFinal, level3CardTopFinal, level4CardTopFinal].map(
    (top, index) => top + LEVEL_OFFSET + iPadCardsVerticalOffset + stageVerticalOffsets[index]
  );
  const renderedCircleTops = renderedCardTops.map(
    (cardTop) => cardTop + (cardHeight / 2) - (stageContainerSize / 2)
  );
  const renderedCardCenters = renderedCardTops.map((cardTop) => cardTop + (cardHeight / 2));
  const renderedCircleCenters = renderedCircleTops.map((circleTop) => circleTop + (stageContainerSize / 2));
  const [level1CardRenderedTop, , , level4CardRenderedTop] = renderedCardTops;
  const [level2CircleRenderedCenter, level3CircleRenderedCenter, level4CircleRenderedCenter] = renderedCircleCenters.slice(1);
  
  // Calculate level 4 card bottom position (with offset) for scroll limiting
  // level4CardTopFinal is calculated from screen top, but when used in ScrollView with absolute positioning,
  // it's relative to ScrollView content (which starts at y=0 after header/progress)
  // So the actual rendered top position in ScrollView content is: level4CardTopFinal + LEVEL_OFFSET
  // And the bottom is: (level4CardTopFinal + LEVEL_OFFSET) + cardHeight
  const level4CardBottom = level4CardRenderedTop + cardHeight;
  // Content height needs to be at least the bottom of level 4 card plus some padding
  // Ensure it's at least as tall as the visible area to allow proper scrolling
  const scrollViewMinHeight = height - headingTop - headingHeight - progressSectionHeight - tabBarHeight - bottomElementsHeight;
  const maxContentHeight = Math.max(level4CardBottom + 100, scrollViewMinHeight + 50);
  
  const generateStagePositions = (numStages: number) => {
    const positions = [];
    const circleLefts = [level1CircleLeft, level2CircleLeft, level3CircleLeft, level4CircleLeft];
    const cardLefts = [level1CardLeft, level2CardLeft, level3CardLeft, level4CardLeft];
    const cardSides: ('left' | 'right')[] = ['right', 'left', 'right', 'left'];
    
    for (let i = 0; i < numStages && i < 4; i++) {
      const stageNumber = i + 1;
      const regularCircleWidth = stageNumber === 1 ? level1CircleHeight : otherCircleHeight;
      const lockedCircleAdjustment = regularCircleWidth - lockedCircleWidth;
      
      positions.push({
        circleTop: renderedCircleTops[i],
        cardTop: renderedCardTops[i],
        circleLeft: circleLefts[i],
        cardLeft: cardLefts[i],
        cardSide: cardSides[i],
        lockedCircleAdjustment,
      });
    }
    
    return positions;
  };
  
  // Get the number of milestones/stages - limit to maximum 4
  const numberOfStages = Math.min(stageNames.length, 4);
  
  const stagePositions = generateStagePositions(numberOfStages);
  const iPadCardBaseStyle = isTabletLayout
    ? {
        minWidth: scaleLevelCard(140),
        maxWidth: scaleLevelCard(210),
        borderRadius: scaleLevelCard(16),
        minHeight: scaleLevelCard(50),
      }
    : null;
  const iPadCardRightStyle = isTabletLayout
    ? {
        paddingRight: scaleLevelCard(25),
      }
    : null;
  const iPadCompletedCardPaddingStyle = isTabletLayout
    ? {
        paddingHorizontal: scaleLevelCard(10),
        paddingVertical: scaleLevelCard(10),
      }
    : null;
  const iPadCurrentCardPaddingStyle = isTabletLayout
    ? {
        paddingHorizontal: scaleLevelCard(10),
        paddingVertical: scaleLevelCard(10),
      }
    : null;
  const iPadLockedCardStyle = isTabletLayout
    ? {
        minWidth: scaleLevelCard(140),
        maxWidth: scaleLevelCard(210),
        borderRadius: scaleLevelCard(16),
        minHeight: scaleLevelCard(50),
        paddingHorizontal: scaleLevelCard(10),
        paddingVertical: scaleLevelCard(10),
      }
    : null;
  const iPadStageContainerStyle = isTabletLayout
    ? {
        width: scaleLevelIcon(85),
        height: scaleLevelIcon(85),
      }
    : null;
  const iPadRegularCircleStyle = isTabletLayout
    ? {
        width: scaleLevelIcon(70),
        height: scaleLevelIcon(70),
        borderRadius: scaleLevelIcon(35),
      }
    : null;
  const iPadLevel1CircleStyle = isTabletLayout
    ? {
        width: scaleLevelIcon(49),
        height: scaleLevelIcon(49),
        borderRadius: scaleLevelIcon(24.5),
      }
    : null;
  const iPadCurrentCircleStyle = isTabletLayout
    ? {
        width: scaleLevelIcon(85),
        height: scaleLevelIcon(85),
        borderRadius: scaleLevelIcon(42.5),
      }
    : null;
  const iPadLevel1CurrentCircleStyle = isTabletLayout
    ? {
        width: scaleLevelIcon(60),
        height: scaleLevelIcon(60),
        borderRadius: scaleLevelIcon(30),
      }
    : null;
  const iPadLockedCircleStyle = isTabletLayout
    ? {
        width: scaleLevelIcon(50),
        height: scaleLevelIcon(50),
        borderRadius: scaleLevelIcon(25),
      }
    : null;
  const iPadCurrentNumberStyle = isTabletLayout ? { fontSize: Math.round(32 * levelIconScale) } : null;
  const iPadLevel1CurrentNumberStyle = isTabletLayout ? { fontSize: Math.round(22 * levelIconScale) } : null;
  const iPadCurrentNumberWhiteStyle = isTabletLayout ? { fontSize: Math.round(38 * levelIconScale) } : null;
  const iPadLevel1CurrentNumberWhiteStyle = isTabletLayout ? { fontSize: Math.round(27 * levelIconScale) } : null;

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
    // Check if completed first (completed takes precedence)
    if (completedLevels.includes(stageNumber)) return 'completed';
    // Check if it's the current level (unlocked and ready to work on)
    if (stageNumber === currentLevel) return 'current';
    // Levels less than currentLevel are unlocked but not current (only if they're not completed)
    if (stageNumber < currentLevel && !completedLevels.includes(stageNumber)) return 'unlocked';
    // Everything else is locked
    return 'locked';
  };

  // Scroll to specific level card and open it when scrollToLevelParam is present (only once)
  useEffect(() => {
    // Only run if we have the param, haven't opened yet, and we have the necessary data
    if (scrollToLevelParam && scrollToLevelParam >= 1 && scrollToLevelParam <= 4 && scrollViewRef.current && !hasOpenedLevelFromParam.current && stagePositions.length > 0 && stageNames.length > 0) {
      // Wait for layout and goal data to load before scrolling
      const scrollTimer = setTimeout(() => {
        const levelIndex = scrollToLevelParam - 1;
        if (levelIndex < stagePositions.length) {
          const targetPosition = stagePositions[levelIndex];
          // Card positions are already relative to ScrollView content (include LEVEL_OFFSET)
          // Scroll to card position with some offset for better visibility
          const scrollY = Math.max(0, targetPosition.cardTop - 80);
          
          scrollViewRef.current?.scrollTo({
            y: scrollY,
            animated: true,
          });
          
          // After scrolling, open the level detail modal
          setTimeout(() => {
            const status = getStageStatus(scrollToLevelParam);
            if (status !== 'locked') {
              const levelData = {
                number: scrollToLevelParam,
                name: stageNames[levelIndex] || tr(`Stage ${scrollToLevelParam}`, `Этап ${scrollToLevelParam}`),
                description: stageDescriptions[levelIndex] || stageNames[levelIndex] || tr('Complete this stage to progress', 'Выполни этот этап для продвижения'),
                status,
              };
              setShowLevelDetail(levelData);
              // Mark as opened AFTER successfully opening the modal
              hasOpenedLevelFromParam.current = true;
            }
          }, 400); // Small delay after scroll to ensure smooth transition
        }
      }, 600); // Delay to ensure layout and data are loaded
      
      return () => clearTimeout(scrollTimer);
    }
  }, [scrollToLevelParam, stagePositions, stageNames, stageDescriptions, completedLevels, currentLevel, numberOfStages]); // Include necessary deps

  // Helper function to remove "Level X:" prefix from stage names
  const cleanStageName = (name: string, stageNumber: number): string => {
    // Remove patterns like "Level X:", "level X:", "Level X ", "level X " (with or without colon)
    const patterns = [
      new RegExp(`^Level\\s*${stageNumber}\\s*:?\\s*`, 'i'),
      new RegExp(`^level\\s*${stageNumber}\\s*:?\\s*`, 'i'),
    ];
    
    let cleaned = name;
    for (const pattern of patterns) {
      cleaned = cleaned.replace(pattern, '').trim();
    }
    
    return cleaned || name; // Return original if cleaning results in empty string
  };

  // Show all stages (locked ones will be displayed as locked) - limit to 4 levels
  const allStages = stageNames.slice(0, 4).map((_, index) => index + 1);

  // Get the next stage to complete - use unlockedLevelForBanner if available, otherwise calculate from currentLevel
  const getNextStageInfo = () => {
    // If a level was just unlocked, use that level for the banner
    const stageToShow = unlockedLevelForBanner || currentLevel;
    if (stageToShow > numberOfStages) return null;
    return {
      stageNumber: stageToShow,
      stageName: stageNames[stageToShow - 1] || tr(`Stage ${stageToShow}`, `Этап ${stageToShow}`),
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
    
    const levelData = {
      number: stageNumber,
      name: stageNames[stageNumber - 1] || tr(`Stage ${stageNumber}`, `Этап ${stageNumber}`),
      description: stageDescriptions[stageNumber - 1] || stageNames[stageNumber - 1] || tr('Complete this stage to progress', 'Выполни этот этап для продвижения'),
      status,
    };
    setShowLevelDetail(levelData);
  };
  
  const handleContinueLevel = () => {
    if (currentLevel <= numberOfStages) {
      handleStagePress(currentLevel);
    }
  };

  const completedCount = completedLevels.length;
  const totalLevels = numberOfStages;
  
  // Calculate progress line width to stop exactly at the 4th circle
  // Line starts at left: 6px (center of circle 1)
  // To reach center of circle 4, we need to span exactly 3 segments:
  // - From circle 1 center to circle 2 center: 6px (remaining of circle 1) + 8px (gap) + 6px (to circle 2 center) = 20px
  // - From circle 2 center to circle 3 center: 6px + 8px + 6px = 20px  
  // - From circle 3 center to circle 4 center: 6px + 8px + 6px = 20px
  // Total: 3 * 20px = 60px
  // Container width: 4 circles (48px) + 3 gaps (24px) = 72px
  // Since line starts at 6px, the percentage should be: 60px / 72px = 83.33%
  // But to be more precise and account for the starting position: 60px out of 72px total = 83.33%
  const progressLineWidth = totalLevels >= 4 
    ? 60 // Use fixed pixel width: 60px spans exactly from circle 1 center to circle 4 center
    : totalLevels > 1 
    ? ((completedCount / (totalLevels - 1)) * 100) 
    : 0;
  
  // Get current level data
  const currentLevelData = currentLevel <= numberOfStages ? {
    number: currentLevel,
    name: stageNames[currentLevel - 1] || tr(`Stage ${currentLevel}`, `Этап ${currentLevel}`),
  } : null;
  const levelPathBottomPadding = currentLevelData ? 200 + insets.bottom : 120;

  return (
    <View style={styles.container}>
      {/* Goal map background image */}
      <Image
        source={require('../assets/images/goalmap.png')}
        pointerEvents="none"
        style={styles.backgroundGradient}
        resizeMode="cover"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity
          style={styles.backButtonHeader}
          onPress={() => router.push('/(tabs)/goals')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="arrow-back" size={20} color="#342846" />
        </TouchableOpacity>
        
        <View 
          style={styles.headerTitleContainer}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            if (height > 0) {
              setHeadingHeight(height);
            }
          }}
        >
          <Text style={styles.goalTitle}>{goalName.toUpperCase()}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.helperButtonHeader}
          onPress={() => {
            console.log('Helper button pressed, setting showInfoModal to true');
            setShowInfoModal(true);
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons name="help-outline" size={20} color="#342846" />
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressSection}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressLabel}>{tr('YOUR PATH', 'ТВОЙ ПУТЬ')}</Text>
          <Text style={styles.progressCount}>{Math.min(completedCount, 4)} {tr('of 4 levels completed', 'из 4 уровней завершено')}</Text>
        </View>
        <View style={styles.progressTrack}>
          {/* Progress line rendered first so it appears behind circles */}
          <View 
            style={[
              styles.progressLine,
              { width: totalLevels >= 4 ? 60 : `${progressLineWidth}%` } // Use 60px for 4 circles, percentage for others
            ]} 
          />
          {/* Circles rendered after line so they appear on top */}
          {Array.from({ length: totalLevels }).map((_, index) => {
            const levelNum = index + 1;
            const isCompleted = completedLevels.includes(levelNum);
            const isCurrent = levelNum === currentLevel;
            
            return (
              <View 
                key={levelNum}
                style={[
                  styles.progressDot,
                  isCompleted && styles.progressDotCompleted,
                  isCurrent && styles.progressDotCurrent,
                  index < totalLevels - 1 && { marginRight: 8 },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Level Path - The Main Journey */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.levelPathContainer}
        contentContainerStyle={[
          styles.levelPathContent,
          { 
            // Keep enough content height for all cards and allow smooth scrolling
            minHeight: maxContentHeight + 120,
            paddingBottom: levelPathBottomPadding,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Connecting Path Lines - SVG */}
        <View style={styles.pathLinesContainer}>
          <Svg 
            width={width} 
            height={height * 1.5} 
            style={styles.pathLinesSvg}
            preserveAspectRatio="none"
          >
            <Defs>
              <SvgLinearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#BACCD7" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#BACCD7" stopOpacity="0.3" />
              </SvgLinearGradient>
              <SvgLinearGradient id="completedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#e1e1bb" stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#e1e1bb" stopOpacity="0.5" />
              </SvgLinearGradient>
            </Defs>
            {/* Full path (dashed) - starts at level 1 card, ends at level 4 card */}
            {/* First segment: Level 1 card to Level 2 circle (15% wider) */}
            <Path
              d={`M${level1CardLeft + cardMinWidth/2},${renderedCardCenters[0]} Q${effectiveWidth * 0.3},${level2CircleRenderedCenter} ${effectiveWidth/2},${level2CircleRenderedCenter}`}
              stroke="url(#pathGradient)"
              strokeWidth="3.45"
              fill="none"
              strokeDasharray="8,8"
              opacity="0.5"
            />
            {/* Second segment: Level 2 circle to Level 3 circle */}
            <Path
              d={`M${effectiveWidth/2},${level2CircleRenderedCenter} Q${effectiveWidth * 0.7},${level3CircleRenderedCenter} ${effectiveWidth/2},${level3CircleRenderedCenter}`}
              stroke="url(#pathGradient)"
              strokeWidth="3"
              fill="none"
              strokeDasharray="8,8"
              opacity="0.5"
            />
            {/* Third segment: Level 3 circle to Level 4 card */}
            <Path
              d={`M${effectiveWidth/2},${level3CircleRenderedCenter} Q${effectiveWidth * 0.3},${level4CircleRenderedCenter} ${level4CardLeft + cardMinWidth/2},${renderedCardCenters[3]}`}
              stroke="url(#pathGradient)"
              strokeWidth="3"
              fill="none"
              strokeDasharray="8,8"
              opacity="0.5"
            />
            {/* Completed portion */}
            {completedCount > 0 && (
              <>
                {/* First segment: Level 1 card to Level 2 circle (15% wider) */}
                <Path
                  d={`M${level1CardLeft + cardMinWidth/2},${renderedCardCenters[0]} Q${effectiveWidth * 0.3},${level2CircleRenderedCenter} ${effectiveWidth/2},${level2CircleRenderedCenter}`}
                  stroke="url(#completedGradient)"
                  strokeWidth="4.6"
                  fill="none"
                />
                {/* Second segment: Level 2 circle to Level 3 circle (if completed) */}
                {completedCount >= 2 && (
                  <Path
                    d={`M${effectiveWidth/2},${level2CircleRenderedCenter} Q${effectiveWidth * 0.7},${level3CircleRenderedCenter} ${effectiveWidth/2},${level3CircleRenderedCenter}`}
                    stroke="url(#completedGradient)"
                    strokeWidth="4"
                    fill="none"
                  />
                )}
                {/* Third segment: Level 3 circle to Level 4 card (if completed) */}
                {completedCount >= 3 && (
                  <Path
                    d={`M${effectiveWidth/2},${level3CircleRenderedCenter} Q${effectiveWidth * 0.3},${level4CircleRenderedCenter} ${level4CardLeft + cardMinWidth/2},${renderedCardCenters[3]}`}
                    stroke="url(#completedGradient)"
                    strokeWidth="4"
                    fill="none"
                  />
                )}
              </>
            )}
          </Svg>
        </View>

        {/* Level Nodes */}
        <View style={styles.mapContainer}>
          {allStages.map((stageNumber) => {
          const index = stageNumber - 1; // Convert to 0-indexed
          const position = stagePositions[index];
          const status = getStageStatus(stageNumber);
          const rawStageName = stageNames[index] || tr(`Stage ${stageNumber}`, `Этап ${stageNumber}`);
          const stageName = cleanStageName(rawStageName, stageNumber); // Remove "Level X:" prefix if present
          const isFirstStage = stageNumber === 1;
          
          return (
            <React.Fragment key={stageNumber}>
              {/* Circle for Stage */}
              <TouchableOpacity
                style={[styles.stageContainer, { 
                  top: position.circleTop, 
                  left: position.circleLeft + (status === 'locked' ? position.lockedCircleAdjustment : 0),
                }, iPadStageContainerStyle]}
                onPress={() => handleStagePress(stageNumber)}
                activeOpacity={0.8}
                disabled={status === 'locked'}
              >
                {/* Glow effect for current level */}
                {status === 'current' && (
                  <Animated.View 
                    style={[
                      isFirstStage ? styles.currentGlowLevel1 : styles.currentGlow,
                      {
                        opacity: currentGlowAnim,
                        transform: [{
                          scale: currentGlowAnim.interpolate({
                            inputRange: [0.3, 0.6],
                            outputRange: [1, 1.2],
                          }),
                        }],
                      },
                    ]} 
                  />
                )}
                
                {status === 'completed' ? (
                  <ExpoLinearGradient
                    colors={['#e1e1bb', '#e1e1bb']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[
                      isFirstStage ? styles.level1CircleGradient : styles.currentCircleGradient,
                      isFirstStage ? iPadLevel1CircleStyle : iPadRegularCircleStyle,
                    ]}
                  >
                    <MaterialIcons name="check" size={Math.round((isFirstStage ? 18 : 24) * levelIconScale)} color="#342846" />
                  </ExpoLinearGradient>
                ) : status === 'current' ? (
                  <View style={[isFirstStage ? styles.level1CurrentCircle : styles.currentCircleWhite, isFirstStage ? iPadLevel1CurrentCircleStyle : iPadCurrentCircleStyle]}>
                    <Text style={[isFirstStage ? styles.currentNumberWhiteSmall : styles.currentNumberWhite, isFirstStage ? iPadLevel1CurrentNumberWhiteStyle : iPadCurrentNumberWhiteStyle]}>{stageNumber}</Text>
                  </View>
                ) : status === 'unlocked' ? (
                  <ExpoLinearGradient
                    colors={['#6B5B95', '#9B8FB8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[styles.currentCircleGradient, iPadRegularCircleStyle]}
                  >
                    <Text style={[styles.currentNumber, iPadCurrentNumberStyle]}>{stageNumber}</Text>
                  </ExpoLinearGradient>
                ) : (
                  <View style={[styles.lockedCircle, iPadLockedCircleStyle]}>
                    <MaterialIcons name="lock" size={Math.round(20 * levelIconScale)} color="rgba(255,255,255,0.5)" />
                  </View>
                )}
              </TouchableOpacity>
              
              {/* Card for Stage */}
              <TouchableOpacity
                style={[
                  styles.cardContainer, 
                  {
                    top: position.cardTop,
                    left: position.cardLeft,
                  },
                ]}
                onPress={() => handleStagePress(stageNumber)}
                activeOpacity={0.8}
                disabled={status === 'locked'}
              >
                {status === 'completed' ? (
                  <View
                    style={[
                      styles.currentLevelBox,
                      position.cardSide === 'right' ? styles.cardRight : styles.cardLeft,
                      iPadCardBaseStyle,
                      iPadCompletedCardPaddingStyle,
                      position.cardSide === 'right' ? iPadCardRightStyle : null,
                      { flexShrink: 0 },
                    ]}
                  >
                    <Text
                      style={[styles.completedLevelLabel, isRussian && styles.levelLabelRussian]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.9}
                    >
                      {tr('Level', 'Уровень')} {stageNumber}
                    </Text>
                    <Text style={styles.completedLevelNameHeading}>{stageName}</Text>
                  </View>
                ) : status === 'current' ? (
                  <View
                    style={[
                      styles.currentLevelBoxWhite,
                      position.cardSide === 'right' ? styles.cardRight : styles.cardLeft,
                      iPadCardBaseStyle,
                      iPadCurrentCardPaddingStyle,
                      position.cardSide === 'right' ? iPadCardRightStyle : null,
                      { flexShrink: 0 },
                    ]}
                  >
                    <Text
                      style={[styles.currentLevelLabelPurple, isRussian && styles.levelLabelRussian]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.9}
                    >
                      {tr('Level', 'Уровень')} {stageNumber}
                    </Text>
                    <Text style={styles.currentLevelNamePurple}>{stageName}</Text>
                  </View>
                ) : status === 'unlocked' ? (
                  <View
                    style={[
                      styles.currentLevelBox,
                      position.cardSide === 'right' ? styles.cardRight : styles.cardLeft,
                      styles.incompleteCard,
                      iPadCardBaseStyle,
                      iPadCurrentCardPaddingStyle,
                      position.cardSide === 'right' ? iPadCardRightStyle : null,
                      { flexShrink: 0 },
                    ]}
                  >
                    <Text
                      style={[styles.incompleteLevelLabel, isRussian && styles.levelLabelRussian]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.9}
                    >
                      {tr('Level', 'Уровень')} {stageNumber}
                    </Text>
                    <Text style={styles.unlockedLevelNameHeading}>{stageName}</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.lockedCalloutBox,
                      position.cardSide === 'right' ? styles.cardRight : styles.cardLeft,
                      iPadLockedCardStyle,
                      position.cardSide === 'right' ? iPadCardRightStyle : null,
                      { flexShrink: 0 },
                    ]}
                  >
                    <Text
                      style={[styles.levelLabel, isRussian && styles.levelLabelRussian]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.9}
                    >
                      {tr('Level', 'Уровень')} {stageNumber}
                    </Text>
                    <Text style={styles.levelNameHeading}>{stageName}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
        </View>
      </ScrollView>

      {/* Encouragement Banner */}
      {(motivationalSentence || isGeneratingMotivation) && showEncouragementBanner && (
        <View style={styles.encouragementBanner}>
          <View style={styles.encouragementGlow} />
          <TouchableOpacity
            style={styles.encouragementCloseButton}
            onPress={() => setShowEncouragementBanner(false)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.encouragementContent}>
            <Text style={styles.encouragementIcon}>✨</Text>
            <View style={{ marginLeft: 12, flex: 1, flexShrink: 1, width: 0, paddingRight: 30 }}>
              <Text style={styles.encouragementText}>
            {isGeneratingMotivation ? tr('Generating your motivation...', 'Генерируем твою мотивацию...') : motivationalSentence}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Continue Button (for current level) */}
      {currentLevelData && (
        <TouchableOpacity 
          style={[
            styles.continueButton,
            {
              bottom: 24 + insets.bottom + 40, // Move up by 40px and account for safe area
            },
          ]}
          onPress={completedCount >= 4 ? () => setShowGoalCompleteModal(true) : handleContinueLevel}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {completedCount >= 4 ? tr('Goal completed', 'Цель завершена') : `${tr('Continue Level', 'Продолжить уровень')} ${currentLevelData.number}`}
          </Text>
          {completedCount < 4 && (
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.continueButtonArrow}>→</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

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

      {/* Helper Modal */}
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
            activeOpacity={1}
            onPress={() => setShowInfoModal(false)}
          />
          <View style={styles.helperModal}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                console.log('Close button pressed');
                setShowInfoModal(false);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.modalCloseBtnText}>×</Text>
            </TouchableOpacity>
            
            <ScrollView 
              style={styles.helperModalScrollView}
              contentContainerStyle={styles.helperModalContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.helperIcon}>🗺️</Text>
              <Text style={styles.helperTitle}>{tr('Your goal map', 'Твоя карта цели')}</Text>
              
              <View style={styles.helperContent}>
                <View style={styles.helperItem}>
                  <View style={styles.helperItemTextContainer}>
                    <Text style={styles.helperItemTitle}>{tr('Complete levels', 'Завершай уровни')}</Text>
                    <Text style={styles.helperItemText}>
                      {tr(
                        'Each level brings you closer to your goal. Tap a level to see what to do and check off steps as you complete them.',
                        'Каждый уровень приближает тебя к цели. Нажми на уровень, чтобы увидеть, что нужно сделать, и отмечай шаги по мере выполнения.'
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.helperItem}>
                  <View style={styles.helperItemTextContainer}>
                    <Text style={styles.helperItemTitle}>{tr('Track progress', 'Отслеживай прогресс')}</Text>
                    <Text style={styles.helperItemText}>
                      {tr(
                        'Completed levels are marked with a check. The current level shows your progress percentage.',
                        'Завершенные уровни отмечаются галочкой. Текущий уровень показывает процент твоего прогресса.'
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.helperItem}>
                  <View style={styles.helperItemTextContainer}>
                    <Text style={styles.helperItemTitle}>{tr('Unlock new levels', 'Открывай новые уровни')}</Text>
                    <Text style={styles.helperItemText}>
                      {tr(
                        'New levels unlock after completing previous ones. Move forward step by step.',
                        'Новые уровни открываются после завершения предыдущих. Двигайся шаг за шагом.'
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Focus Sanctuary Promotion */}
              <View style={styles.sanctuaryPromo}>
                <View style={styles.sanctuaryGlow} />
                <View style={styles.sanctuaryContent}>
                  <Image 
                    source={require('@/assets/images/focussanctuary.png')} 
                    style={styles.sanctuaryIconImage}
                    resizeMode="contain"
                  />
                  <View style={[styles.sanctuaryTextContainer, { marginLeft: 12 }]}>
                    <Text style={styles.sanctuaryTitle}>{tr('Do not forget Focus Sanctuary', 'Не забывай про Святилище фокуса')}</Text>
                    <Text style={styles.sanctuaryText}>
                      {tr(
                        'Before completing a level, enter Focus Sanctuary to center yourself. It helps reinforce each result and prepare for your next step.',
                        'Перед завершением уровня зайди в Святилище фокуса, чтобы собраться. Это помогает закрепить каждый результат и подготовиться к следующему шагу.'
                      )}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.sanctuaryButton}
                  onPress={() => {
                    setShowInfoModal(false);
                    router.push('/(tabs)/focus');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sanctuaryButtonText}>{tr('Open sanctuary', 'Открыть святилище')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Level Detail Modal */}
      {showLevelDetail && (
        <LevelDetailModal 
          level={showLevelDetail}
          goalName={goalName}
          goalId={goalId}
          onClose={() => {
            setShowLevelDetail(null);
            // Clear the scrollToLevel param from URL when modal closes to prevent reopening
            if (scrollToLevelParam) {
              router.setParams({ scrollToLevel: undefined });
            }
          }}
          onNavigateToDetail={() => {
            setShowLevelDetail(null);
            router.push({
              pathname: '/level-detail',
              params: {
                level: showLevelDetail.number.toString(),
                goalName: goalName,
                goalId: goalId,
              },
            });
          }}
          onLevelComplete={async (completedLevelNumber: number) => {
            // Reload goal progress to update completed levels
            await loadGoalProgress();
            
            // Check if level 4 was completed (goal is complete)
            if (completedLevelNumber >= 4) {
              // Show goal completion modal
              setShowGoalCompleteModal(true);
            } else {
              // Trigger unlock animation for next level (only if not level 4)
              const nextLevel = completedLevelNumber + 1;
              if (nextLevel <= 4) {
                setUnlockingLevel(nextLevel);
                setShowUnlockModal(true);
                
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
                  setUnlockedLevelForBanner(nextLevel);
                  setUnlockingLevel(null);
                  scaleAnim.setValue(0);
                  opacityAnim.setValue(0);
                  // Banner removed - no longer showing new quest banner
                });
              }
            }
          }}
        />
      )}

      {/* Goal Completion Modal */}
      <Modal
        visible={showGoalCompleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGoalCompleteModal(false)}
      >
        <View style={styles.goalCompleteModalOverlay}>
          <View style={styles.goalCompleteModalContent}>
            <View style={styles.goalCompleteIconContainer}>
              <Text style={styles.goalCompleteIcon}>🎉</Text>
            </View>
            <Text style={styles.goalCompleteTitle}>{tr('You completed this goal!', 'Ты завершил эту цель!')}</Text>
            <Text style={styles.goalCompleteMessage}>
              {tr(
                `Congratulations! You successfully completed all 4 levels of "${goalName.charAt(0).toUpperCase() + goalName.slice(1).toLowerCase()}". This is a major achievement - you can truly be proud of your progress.`,
                `Поздравляем! Ты успешно прошел все 4 уровня цели "${goalName.charAt(0).toUpperCase() + goalName.slice(1).toLowerCase()}". Это серьезное достижение - можешь по-настоящему гордиться своим прогрессом.`
              )}
            </Text>
            <TouchableOpacity
              style={styles.goalCompleteButton}
              onPress={async () => {
                try {
                  // Mark goal as completed
                  await markGoalAsCompleted(goalId, goalName);
                  setShowGoalCompleteModal(false);
                  // Navigate to goals page with parameter to trigger removal animation
                  router.push({
                    pathname: '/(tabs)/goals',
                    params: { 
                      completedGoalId: goalId,
                      completedGoalName: goalName,
                    },
                  });
                } catch (error) {
                  console.error('Error marking goal as completed:', error);
                  // Still navigate even if marking fails
                  setShowGoalCompleteModal(false);
                  router.push('/(tabs)/goals');
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.goalCompleteButtonText}>{tr('Back to goals', 'Назад к целям')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ============================================================================
// LEVEL DETAIL MODAL COMPONENT
// ============================================================================
interface LevelDetailModalProps {
  level: {
    number: number;
    name: string;
    description: string;
    status: string;
  };
  goalName: string;
  goalId: string;
  onClose: () => void;
  onNavigateToDetail: () => void;
  onLevelComplete?: (levelNumber: number) => void;
}

const LevelDetailModal = ({ level, goalName, goalId, onClose, onNavigateToDetail, onLevelComplete }: LevelDetailModalProps) => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isTabletLayout = Platform.OS === 'ios' && Platform.isPad;
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  const [steps, setSteps] = useState<Array<{ id: number; text: string; completed: boolean }>>([]);
  const [isLoadingSteps, setIsLoadingSteps] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  // Chat with Atlas state
  const [showAtlasChat, setShowAtlasChat] = useState(false);
  const [userName, setUserName] = useState<string>('');
  
  // Floating circles animation refs
  const bubble1Anim = useRef(new Animated.Value(0)).current;
  const bubble2Anim = useRef(new Animated.Value(0)).current;
  const bubble3Anim = useRef(new Animated.Value(0)).current;
  const bubble1X = useRef(new Animated.Value(0)).current;
  const bubble2X = useRef(new Animated.Value(0)).current;
  const bubble3X = useRef(new Animated.Value(0)).current;
  const bubble1Opacity = useRef(new Animated.Value(0.15)).current;
  const bubble2Opacity = useRef(new Animated.Value(0.15)).current;
  const bubble3Opacity = useRef(new Animated.Value(0.15)).current;

  // Initialize floating bubbles animation
  useEffect(() => {
    // Floating animation for each bubble
    const createFloatAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Horizontal drift animation
    const createDriftAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 4000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 4000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Opacity pulse animation - very subtle
    const createOpacityAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 0.25,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.1,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Start animations
    createFloatAnimation(bubble1Anim, 0).start();
    createFloatAnimation(bubble2Anim, 1000).start();
    createFloatAnimation(bubble3Anim, 2000).start();

    createDriftAnimation(bubble1X, 0).start();
    createDriftAnimation(bubble2X, 1500).start();
    createDriftAnimation(bubble3X, 3000).start();

    createOpacityAnimation(bubble1Opacity, 0).start();
    createOpacityAnimation(bubble2Opacity, 1000).start();
    createOpacityAnimation(bubble3Opacity, 2000).start();

    return () => {
      bubble1Anim.stopAnimation();
      bubble2Anim.stopAnimation();
      bubble3Anim.stopAnimation();
      bubble1X.stopAnimation();
      bubble2X.stopAnimation();
      bubble3X.stopAnimation();
      bubble1Opacity.stopAnimation();
      bubble2Opacity.stopAnimation();
      bubble3Opacity.stopAnimation();
    };
  }, []);

  // Load user data and generate personalized step instructions for this level
  useEffect(() => {
    const loadAndGenerateSteps = async () => {
      try {
        setIsLoadingSteps(true);
        const stepsStorageKey = `levelSteps_${goalId}_${level.number}`;
        
        // Always load saved checked steps for this level (even if level not completed yet)
        let savedCompletedSteps = new Set<number>();
        try {
          const storageKey = `stepCompletion_${goalId}_${level.number}`;
          const savedData = await AsyncStorage.getItem(storageKey);
          if (savedData) {
            const savedIndices = JSON.parse(savedData);
            savedCompletedSteps = new Set(savedIndices);
          }
        } catch (error) {
          console.error('Error loading saved step completion:', error);
        }
        
        setCompletedSteps(savedCompletedSteps);

        // Reuse cached steps if available to avoid re-generating
        const cachedStepsRaw = await AsyncStorage.getItem(stepsStorageKey);
        if (cachedStepsRaw) {
          const cachedSteps = JSON.parse(cachedStepsRaw) as Array<{ id: number; text: string }>;
          const hydratedSteps = cachedSteps.map(step => ({
            ...step,
            completed: savedCompletedSteps.has(step.id),
          }));
          setSteps(hydratedSteps);
          setIsLoadingSteps(false);
          return;
        }
        
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
          savedUserName,
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
          AsyncStorage.getItem('userName') || '',
        ]);
        
        // Set userName for AtlasChat
        if (savedUserName) {
          setUserName(savedUserName);
        }

        // Get total levels from goal data
        let totalLevels = 4;
        try {
          const userGoalsData = await AsyncStorage.getItem('userGoals');
          if (userGoalsData) {
            const userGoals = JSON.parse(userGoalsData);
            const goal = userGoals.find((g: any) => g.id === goalId);
            if (goal && goal.numberOfSteps) {
              totalLevels = goal.numberOfSteps;
            }
          }
        } catch (error) {
          console.error('Error loading goal data:', error);
        }

        // Generate personalized step instructions for this level
        const instructions = await generateLevelStepInstructions(
          goalName,
          level.number,
          level.name,
          totalLevels,
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

        // Convert instructions to step format
        const personalizedSteps = instructions.map((instruction, index) => ({
          id: index + 1,
          text: instruction.text,
          completed: savedCompletedSteps.has(index + 1),
        }));

        setSteps(personalizedSteps);
        await AsyncStorage.setItem(
          stepsStorageKey,
          JSON.stringify(personalizedSteps.map(({ id, text }) => ({ id, text })))
        );
      } catch (error) {
        console.error('Error generating level step instructions:', error);
        // Fallback to generic steps if generation fails
        const fallbackSteps = [
          { id: 1, text: tr('Study the task and prepare for the level', 'Изучи задачу и подготовься к уровню'), completed: false },
          { id: 2, text: tr('Take the first action', 'Сделай первое действие'), completed: false },
          { id: 3, text: tr('Keep momentum and continue', 'Поддерживай импульс и продолжай'), completed: false },
          { id: 4, text: tr('Finish and lock in the result', 'Заверши и зафиксируй результат'), completed: false },
        ];
        setSteps(fallbackSteps);
        await AsyncStorage.setItem(
          `levelSteps_${goalId}_${level.number}`,
          JSON.stringify(fallbackSteps.map(({ id, text }) => ({ id, text })))
        );
      } finally {
        setIsLoadingSteps(false);
      }
    };

    loadAndGenerateSteps();
  }, [level.number, level.name, goalName, goalId]);

  const toggleStep = async (stepId: number) => {
    const newSet = new Set(completedSteps);
    const wasCompleted = newSet.has(stepId);
    if (newSet.has(stepId)) {
      newSet.delete(stepId);
    } else {
      newSet.add(stepId);
    }
    setCompletedSteps(newSet);
    
    // Save step completion to AsyncStorage
    try {
      const storageKey = `stepCompletion_${goalId}_${level.number}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
      if (!wasCompleted) {
        await trackStepCompletionEvent(goalId, goalName, level.number, stepId);
      }
    } catch (error) {
      console.error('Error saving step completion:', error);
    }
  };

  const completedStepsCount = completedSteps.size;
  const progress = steps.length > 0 ? Math.round((completedStepsCount / steps.length) * 100) : 0;

  const handleOpenAtlasChat = () => {
    setShowAtlasChat(true);
  };

  return (
    <Modal
      visible={true}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.levelModalOverlay}>
        <ImageBackground
          source={require('../assets/images/level.png')}
          style={styles.levelModal}
          resizeMode="cover"
        >
          {/* Floating Purple Circles */}
          <View style={styles.bubblesContainer} pointerEvents="none">
            <Animated.View
              style={[
                styles.floatingCircle,
                {
                  left: width * 0.1,
                  top: height * 0.2,
                  transform: [
                    {
                      translateY: bubble1Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -30],
                      }),
                    },
                    {
                      translateX: bubble1X.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 20],
                      }),
                    },
                  ],
                  opacity: bubble1Opacity,
                },
              ]}
            />

            <Animated.View
              style={[
                styles.floatingCircle,
                {
                  right: width * 0.15,
                  top: height * 0.4,
                  transform: [
                    {
                      translateY: bubble2Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -25],
                      }),
                    },
                    {
                      translateX: bubble2X.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -15],
                      }),
                    },
                  ],
                  opacity: bubble2Opacity,
                },
              ]}
            />

            <Animated.View
              style={[
                styles.floatingCircle,
                {
                  left: width * 0.2,
                  bottom: height * 0.3,
                  transform: [
                    {
                      translateY: bubble3Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -35],
                      }),
                    },
                    {
                      translateX: bubble3X.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 25],
                      }),
                    },
                  ],
                  opacity: bubble3Opacity,
                },
              ]}
            />
          </View>

          {/* Cosmic header */}
          <ExpoLinearGradient
            colors={['#1a1a2e', '#342846']}
            style={styles.levelModalHeader}
          >
            <View style={styles.levelModalStars} pointerEvents="none" />
            <TouchableOpacity
              style={styles.modalBackBtnLight}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <MaterialIcons name="arrow-back" size={22} color="#342846" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseBtnLight}
              onPress={() => {
                router.replace('/(tabs)/goals');
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={22} color="#342846" />
            </TouchableOpacity>
            
            <View style={styles.levelModalBadge}>
              <Text style={styles.levelModalNumber}>{level.number}</Text>
            </View>
            
            <Text style={styles.levelModalLabel}>
              {tr('Level', 'Уровень')} {level.number}
            </Text>
            <Text style={styles.levelModalTitle}>{level.name}</Text>
            <Text style={styles.levelModalDesc}>{level.description}</Text>
          </ExpoLinearGradient>

          {/* Steps */}
          <ScrollView
            style={styles.levelModalBody}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.levelModalBodyContent,
              isTabletLayout
                ? {
                    paddingBottom: Math.max(insets.bottom + 20, 36),
                  }
                : null,
            ]}
          >
            <View style={styles.stepsHeader}>
              <Text style={[styles.stepsTitle, isRussian && styles.stepsTitleRussian]}>
                {tr('Steps to complete', 'Шаги для завершения')}
              </Text>
              {!isLoadingSteps && <Text style={styles.stepsCount}>{completedStepsCount}/{steps.length}</Text>}
            </View>

            {isLoadingSteps ? (
              <View style={styles.loadingStepsContainer}>
                <ActivityIndicator size="small" color="#342846" />
                <Text style={styles.loadingStepsText}>{tr('Generating personalized steps...', 'Генерируем персональные шаги...')}</Text>
              </View>
            ) : (
              <View style={styles.stepsList}>
                {steps.map(step => {
                  const isCompleted = completedSteps.has(step.id);
                  return (
                    <TouchableOpacity 
                      key={step.id}
                      style={[
                        styles.stepItem,
                        isCompleted && styles.stepItemCompleted
                      ]}
                      onPress={() => toggleStep(step.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[
                        styles.stepCheckbox,
                        isCompleted && styles.stepCheckboxChecked
                      ]}>
                        {isCompleted && (
                          <MaterialIcons name="check" size={14} color="#342846" />
                        )}
                      </View>
                      <View style={{ marginLeft: 14, flex: 1 }}>
                        <Text style={[
                          styles.stepText,
                          isCompleted && styles.stepTextCompleted
                        ]}>
                          {step.text}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Progress */}
            <View style={styles.levelModalProgress}>
              <View style={styles.levelModalProgressTrack}>
                <View style={[
                  styles.levelModalProgressFill,
                  { width: `${progress}%` }
                ]} />
              </View>
              <Text style={styles.levelModalProgressText}>
                {progress}% {tr('complete', 'завершено')}
              </Text>
            </View>

            {/* Focus Sanctuary CTA */}
            <TouchableOpacity 
              style={styles.focusCta}
              onPress={() => {
                onClose();
                router.push('/(tabs)/focus');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.focusCtaIcon}>🕯️</Text>
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.focusCtaText}>{tr('Need focus? Go to Sanctuary', 'Нужен фокус? Перейди в Святилище')}</Text>
              </View>
            </TouchableOpacity>

            <View
              style={[
                styles.levelModalFooter,
                isTabletLayout
                  ? {
                      marginTop: 'auto',
                      paddingTop: 28,
                    }
                  : null,
              ]}
            >
              {/* Chat with Atlas Section */}
              <TouchableOpacity
                style={[
                  styles.chatAtlasCard,
                  isTabletLayout ? styles.chatAtlasCardTablet : null,
                ]}
                onPress={handleOpenAtlasChat}
                activeOpacity={0.8}
              >
                <View style={styles.chatAtlasAvatar}>
                  <Image
                    source={require('../assets/images/anxious.png')}
                    style={styles.chatAtlasImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.chatAtlasContent}>
                  <Text style={styles.chatAtlasTitle}>{tr('CHAT WITH ATLAS', 'ЧАТ С АТЛАСОМ')}</Text>
                  <Text style={[styles.chatAtlasSubtitle, isRussian && styles.chatAtlasSubtitleRussian]}>
                    {tr('Stuck? I am here to help!', 'Застрял? Я рядом, чтобы помочь!')}
                  </Text>
                </View>
                <View style={styles.chatAtlasChevron}>
                  <MaterialIcons name="chevron-right" size={18} color="#342846" />
                </View>
              </TouchableOpacity>

              {/* Complete Level Button */}
              <TouchableOpacity
                style={[
                  styles.completeLevelBtn,
                  isTabletLayout ? styles.completeLevelBtnTablet : null,
                  { opacity: progress === 100 ? 1 : 0.5 }
                ]}
                disabled={progress !== 100}
                onPress={async () => {
                  if (progress === 100) {
                    // Save level completion to AsyncStorage
                    try {
                      const userGoalsData = await AsyncStorage.getItem('userGoals');
                      if (userGoalsData) {
                        const userGoals = JSON.parse(userGoalsData);
                        const goalIndex = userGoals.findIndex((g: any) => g.id === goalId);

                        if (goalIndex !== -1) {
                          // Update currentStepIndex to mark this level as completed
                          // currentStepIndex is 0-indexed: level 1 completed = 0, level 2 completed = 1, etc.
                          const newStepIndex = level.number - 1;
                          userGoals[goalIndex].currentStepIndex = newStepIndex;

                          // Also update progress percentage
                          const totalSteps = userGoals[goalIndex].numberOfSteps || 4;
                          userGoals[goalIndex].progressPercentage = Math.round(((newStepIndex + 1) / totalSteps) * 100);

                          await AsyncStorage.setItem('userGoals', JSON.stringify(userGoals));

                          // Save step completion for this level
                          const storageKey = `stepCompletion_${goalId}_${level.number}`;
                          await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(completedSteps)));
                          await trackLevelCompletionEvent(goalId, goalName, level.number);

                          // Close modal
                          onClose();

                          // Trigger unlock animation for next level
                          if (onLevelComplete) {
                            onLevelComplete(level.number);
                          }
                        }
                      }
                    } catch (error) {
                      console.error('Error saving level completion:', error);
                      // Still close modal even if save fails
                      onClose();
                    }
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.completeLevelBtnText}>
                  {progress === 100 ? tr('Complete this level 🎉', 'Завершить этот уровень 🎉') : tr('Complete all steps to finish', 'Заверши все шаги, чтобы закончить')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ImageBackground>
      </View>

      {/* Atlas Chat Modal */}
      <Modal
        visible={showAtlasChat}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowAtlasChat(false)}
      >
        <AtlasChat
          onClose={() => setShowAtlasChat(false)}
          userName={userName}
          goalTitle={goalName}
          goalStepNumber={level.number}
          totalGoalSteps={4}
          goalStepLabel={level.name}
        />
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  starLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    // Simulated stars using multiple small views - in production, use a proper starfield component
  },
  starLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  starLayer3: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  cosmicGlow: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: [{ translateX: -150 }],
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(186,204,215,0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20, // Original padding restored
    position: 'relative',
    zIndex: 10,
  },
  backButtonHeader: {
    flexShrink: 0,
    zIndex: 1100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
    elevation: 11,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  helperButtonHeader: {
    flexShrink: 0,
    zIndex: 1100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(255, 255, 255, 0.65)',
    opacity: 1,
    elevation: 11,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  helperButtonText: {
    fontSize: 18,
    color: '#342846',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  goalTitle: {
    ...HeadingStyle,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 18,
    includeFontPadding: false,
    paddingVertical: 0,
    marginVertical: 0,
  },
  progressSection: {
    paddingHorizontal: 24,
    paddingBottom: 24, // Original padding restored
    position: 'relative',
    zIndex: 10,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(44, 82, 67, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  progressLabel: {
    ...HeadingStyle,
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  progressCount: {
    ...BodyStyle,
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'AnonymousPro-Regular',
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 4,
    zIndex: 1, // Ensure track container has proper stacking context
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    position: 'relative',
    zIndex: 100, // Above the line
    elevation: 10, // For Android
  },
  progressDotCompleted: {
    backgroundColor: '#e1e1bb',
    borderColor: '#e1e1bb',
  },
  progressDotCurrent: {
    backgroundColor: '#faecb3',
    borderColor: '#faecb3',
    shadowColor: '#faecb3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  progressLine: {
    position: 'absolute',
    left: 6,
    top: '50%',
    transform: [{ translateY: 3.5 }], // Moved down 5px from -1.5 to 3.5 to go through center of circles
    height: 3,
    backgroundColor: '#e1e1bb',
    borderRadius: 2,
    zIndex: -1, // Behind circles - use negative to ensure it's behind
    elevation: -1, // For Android - negative elevation puts it behind
  },
  levelPathContainer: {
    flex: 1,
    position: 'relative',
  },
  levelPathContent: {
    paddingBottom: 100, // Padding at bottom for level 4 card
    // Height will be set dynamically to prevent scrolling past level 4
  },
  pathLinesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1,
  },
  pathLinesSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
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
    alignItems: 'center', // Center circles within container
    justifyContent: 'center', // Center circles within container
    zIndex: 10, // Ensure circles are above cards
    width: 85, // Container width to accommodate largest circle (current level: 85x85)
    height: 85, // Container height to accommodate largest circle (current level: 85x85)
  },
  cardContainer: {
    position: 'absolute',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    zIndex: 1, // Cards below circles
    alignSelf: 'flex-start', // Ensure container wraps content height
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
  checkmark: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  checkmarkSmall: {
    color: '#fff',
    fontSize: 22, // Reduced proportionally for level 1
    fontWeight: 'bold',
  },
  currentCircleWhite: {
    width: 85, // Increased from 70 to make current level bigger
    height: 85,
    borderRadius: 42.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  level1CurrentCircle: {
    width: 60, // Increased from 49, proportionally larger for level 1 current
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  currentNumberWhite: {
    color: '#342846', // Purple text on white circle
    fontSize: 38, // Increased proportionally from 32 (85/70 * 32 ≈ 38.9)
    fontWeight: 'bold',
  },
  currentNumberWhiteSmall: {
    color: '#342846', // Purple text on white circle for level 1
    fontSize: 27, // Increased proportionally from 22 (60/49 * 22 ≈ 26.9)
    fontWeight: 'bold',
  },
  level1Card: {
    marginTop: 8, // Keep card below circle
    marginLeft: 12, // Card on right side of circle
    minWidth: 140, // Reduced by 30% from 200 (200 * 0.7 = 140)
    maxWidth: 196, // Reduced by 30% from 280 (280 * 0.7 = 196)
  },
  currentLevelBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 140, // Reduced by 30% from 200 (200 * 0.7 = 140)
    maxWidth: 196, // Reduced by 30% from 280 (280 * 0.7 = 196)
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 3,
    alignSelf: 'flex-start', // Ensure card wraps content height
    justifyContent: 'center',
  },
  level2Card: {
    marginTop: 8, // FIXED - same as level1Card to prevent movement
    marginLeft: -170, // Position card so its right edge aligns with circle's right edge (adjusted for max width) - FIXED
    alignSelf: 'flex-start',
    minWidth: 140, // Reduced by 30% from 200 (200 * 0.7 = 140)
    maxWidth: 196, // Reduced by 30% from 280 (280 * 0.7 = 196)
  },
  cardRight: {
    marginLeft: 0, // Cards are positioned absolutely, no margin needed
    minWidth: 140, // Reduced by 30% from 200 (200 * 0.7 = 140)
    maxWidth: 196, // Reduced by 30% from 280 (280 * 0.7 = 196)
    paddingRight: 25, // Right padding spacing for level 2 and level 4 cards
  },
  cardLeft: {
    marginRight: 0,
    marginLeft: 0, // Cards are positioned absolutely, no margin needed
    alignSelf: 'flex-start',
    minWidth: 140, // Reduced by 30% from 200 (200 * 0.7 = 140)
    maxWidth: 196, // Reduced by 30% from 280 (280 * 0.7 = 196)
  },
  levelLabel: {
    ...HeadingStyle,
    color: '#FFFFFF', // White for locked levels
    fontSize: 12,
    marginBottom: 2,
    lineHeight: 14,
    includeFontPadding: false,
  },
  completedLevelLabel: {
    ...HeadingStyle,
    color: '#342846', // Purple for completed cards
    fontSize: 12,
    marginBottom: 2,
    lineHeight: 14,
    includeFontPadding: false,
  },
  incompleteLevelLabel: {
    ...HeadingStyle,
    color: '#342846', // Purple for unlocked/incomplete cards (on white background)
    fontSize: 12,
    marginBottom: 2,
    lineHeight: 14,
    includeFontPadding: false,
  },
  incompleteCard: {
    backgroundColor: '#fff', // White background for unlocked levels
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minWidth: 140, // Reduced by 30% from 200 (200 * 0.7 = 140)
    maxWidth: 210, // Reduced by 30% from 300 (300 * 0.7 = 210)
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 50,
    alignSelf: 'flex-start', // Ensure card wraps content height
    justifyContent: 'center',
  },
  levelName: {
    ...BodyStyle,
    color: '#333C4E',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  levelNameHeading: {
    ...BodyStyle,
    color: '#FFFFFF', // White for locked levels (on dark background)
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 0,
    includeFontPadding: false,
  },
  unlockedLevelNameHeading: {
    ...BodyStyle,
    color: '#342846', // Purple for unlocked levels (on white card)
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 0,
    includeFontPadding: false,
  },
  completedLevelNameHeading: {
    ...BodyStyle,
    color: '#342846', // Purple for completed levels (on white card)
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 0,
    includeFontPadding: false,
  },
  completedStatusLabel: {
    ...HeadingStyle,
    color: '#6B8E6B', // Green for completed status
    fontSize: 10,
    textTransform: 'uppercase',
    lineHeight: 11,
    marginTop: 0,
    includeFontPadding: false,
  },
  currentLevelBoxWhite: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 140, // Reduced by 30% from 200 (200 * 0.7 = 140)
    maxWidth: 210, // Reduced by 30% from 300 (300 * 0.7 = 210)
    minHeight: 50,
    borderWidth: 2,
    borderColor: '#faecb3',
    shadowColor: '#faecb3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 6,
    alignSelf: 'flex-start', // Ensure card wraps content height
    justifyContent: 'center',
  },
  currentLevelLabelPurple: {
    ...HeadingStyle,
    color: '#342846', // Purple for current level label
    fontSize: 12,
    marginBottom: 2,
    lineHeight: 14,
    includeFontPadding: false,
  },
  levelLabelRussian: {
    fontSize: 11,
    lineHeight: 14,
  },
  currentLevelNamePurple: {
    ...BodyStyle,
    color: '#342846', // Purple for current level name
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 0,
    includeFontPadding: false,
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
  // Current Level Glow - Pulse animation
  // Centered on 85x85 circle: container is 85x85, circle is 85x85 centered by flexbox
  // Glow is 85x85, absolutely positioned. To center: left and top are already 0, which fills container = centered
  currentGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 85, // Increased to match currentCircleWhite size
    height: 85,
    borderRadius: 42.5,
    backgroundColor: 'rgba(250,236,179,0.5)',
    zIndex: 0, // Behind the circle
  },
  // Level 1 specific glow (smaller circle)
  // Container is 85x85, circle is 60x60 centered by flexbox
  // Glow is 60x60, to center: left = (85-60)/2 = 12.5, top = 12.5
  currentGlowLevel1: {
    position: 'absolute',
    left: 12.5, // (85-60)/2 = 12.5 to center 60px glow in 85px container
    top: 12.5,
    width: 60, // Match level1CurrentCircle size
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(250,236,179,0.5)',
    zIndex: 0,
  },
  // Locked Stage Styles - Different design from unlocked
  lockedCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    // Note: React Native doesn't support dashed borders, using solid with opacity for distinction
  },
  lockedCalloutBox: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 112, // Reduced by 30% from 160 (160 * 0.7 = 112)
    minHeight: 50,
    alignSelf: 'flex-start', // Ensure card wraps content height
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    justifyContent: 'center',
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
    // bottom is set dynamically in inline styles to position above continue button
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
    elevation: 9,
    zIndex: 101, // Higher than continue button (zIndex 100) to ensure it appears above
    // When goal reminder banner is visible, position above it
    marginBottom: 0, // Will be adjusted dynamically if needed
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
  goalReminderBanner: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 75 : 55,
    left: 25,
    right: 25,
    backgroundColor: '#fff',
    borderRadius: 16, // Rounded on all corners
    paddingHorizontal: 25,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 99, // Below newQuestBanner (zIndex 100) but above other content
    // When newQuestBanner is visible, it will appear above this banner
  },
  goalReminderText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
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
  // Encouragement Banner
  encouragementBanner: {
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 202, // Increased by 170px total (70px + 100px) to move banner up
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    position: 'relative',
    overflow: 'hidden',
    zIndex: 10,
  },
  encouragementGlow: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(250,236,179,0.15)',
  },
  encouragementContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 2,
    flexShrink: 1,
  },
  encouragementIcon: {
    fontSize: 24,
    flexShrink: 0,
  },
  encouragementText: {
    ...BodyStyle,
    fontSize: 15,
    color: '#FFFFFF',
    fontStyle: 'italic',
    fontFamily: 'AnonymousPro-Regular',
    flexShrink: 1,
    lineHeight: 24,
  },
  encouragementCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  // Continue Button
  continueButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 24,
    left: 24,
    right: 24,
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 8,
    zIndex: 100,
  },
  continueButtonText: {
    ...BodyStyle,
    fontSize: 14,
    fontWeight: '600',
    color: '#342846',
  },
  continueButtonArrow: {
    fontSize: 17,
    color: '#342846',
  },
  // Helper Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F3F0',
  },
  levelModalOverlay: {
    flex: 1,
    backgroundColor: '#1f1a2a',
  },
  helperModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    height: height * 0.85,
    position: 'relative',
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  helperModalScrollView: {
    flexGrow: 1,
  },
  helperModalContent: {
    padding: 32,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 32,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
    elevation: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalCloseBtnText: {
    fontSize: 28,
    color: '#342846',
    lineHeight: 28,
    fontWeight: '600',
  },
  helperIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  helperTitle: {
    ...HeadingStyle,
    fontSize: 22,
    fontWeight: '700',
    color: '#342846',
    textAlign: 'center',
    marginBottom: 24,
  },
  helperContent: {
    marginBottom: 20,
  },
  helperItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  helperItemIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  helperItemIcon: {
    fontSize: 20,
  },
  helperItemIconImage: {
    width: 24,
    height: 24,
  },
  helperItemTextContainer: {
    flex: 1,
    paddingLeft: 20,
  },
  helperItemTitle: {
    ...HeadingStyle,
    fontSize: 14,
    fontWeight: '600',
    color: '#342846',
    marginBottom: 4,
  },
  helperItemText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#7A8A9A',
    fontFamily: 'AnonymousPro-Regular',
    lineHeight: 20,
  },
  // Sanctuary Promo
  sanctuaryPromo: {
    backgroundColor: '#342846',
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    marginTop: 4,
  },
  sanctuaryGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250,236,179,0.2)',
    borderRadius: 16,
  },
  sanctuaryContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 2,
    marginBottom: 16,
  },
  sanctuaryIcon: {
    fontSize: 24,
    flexShrink: 0,
  },
  sanctuaryIconImage: {
    width: 24,
    height: 24,
    flexShrink: 0,
  },
  sanctuaryTextContainer: {
    flex: 1,
  },
  sanctuaryTitle: {
    ...HeadingStyle,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  sanctuaryText: {
    ...BodyStyle,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'AnonymousPro-Regular',
    lineHeight: 18,
  },
  sanctuaryButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 43,
    position: 'relative',
    zIndex: 2,
  },
  sanctuaryButtonText: {
    ...HeadingStyle,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  // Level Detail Modal
  levelModal: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    width: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    minHeight: '100%',
    overflow: 'hidden',
  },
  levelModalHeader: {
    padding: 24,
    paddingTop: 40,
    marginTop: 0,
    alignItems: 'center',
    position: 'relative',
  },
  levelModalStars: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.6,
  },
  modalCloseBtnLight: {
    position: 'absolute',
    top: 80,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalBackBtnLight: {
    position: 'absolute',
    top: 80,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  levelModalBadge: {
    width: 56,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  levelModalNumber: {
    ...HeadingStyle,
    fontSize: 24,
    fontWeight: '700',
    color: '#342846',
  },
  levelModalLabel: {
    ...HeadingStyle,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  levelModalTitle: {
    ...HeadingStyle,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  levelModalDesc: {
    ...BodyStyle,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'AnonymousPro-Regular',
    lineHeight: 20,
    textAlign: 'center',
  },
  levelModalBody: {
    padding: 24,
    paddingTop: 20,
  },
  levelModalBodyContent: {
    flexGrow: 1,
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepsTitle: {
    ...HeadingStyle,
    fontSize: 14,
    fontWeight: '600',
    color: '#342846',
    flexShrink: 1,
    paddingRight: 8,
  },
  stepsTitleRussian: {
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
  },
  stepsCount: {
    ...BodyStyle,
    fontSize: 13,
    color: '#7A8A9A',
    fontFamily: 'AnonymousPro-Regular',
  },
  stepsList: {
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 10,
  },
  stepItemCompleted: {
    backgroundColor: '#f5f5e8',
  },
  stepCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#BACCD7',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepCheckboxChecked: {
    backgroundColor: '#e1e1bb',
    borderColor: '#e1e1bb',
  },
  stepText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    fontFamily: 'AnonymousPro-Regular',
    flex: 1,
    lineHeight: 20,
  },
  stepTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#7A8A9A',
  },
  loadingStepsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingStepsText: {
    ...BodyStyle,
    color: '#8B8178',
    fontSize: 14,
    textAlign: 'center',
  },
  levelModalProgress: {
    marginBottom: 20,
  },
  levelModalProgressTrack: {
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  levelModalProgressFill: {
    height: '100%',
    backgroundColor: '#e1e1bb',
    borderRadius: 4,
  },
  levelModalProgressText: {
    ...BodyStyle,
    fontSize: 12,
    color: '#342846',
    fontFamily: 'AnonymousPro-Regular',
    textAlign: 'center',
  },
  focusCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#342846',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#342846',
  },
  focusCtaIcon: {
    fontSize: 16,
  },
  focusCtaText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'AnonymousPro-Regular',
  },
  levelModalFooter: {
    marginTop: 8,
  },
  completeLevelBtn: {
    width: '100%',
    minHeight: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#342846',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 25,
  },
  completeLevelBtnTablet: {
    marginTop: 0,
    marginBottom: 0,
  },
  completeLevelBtnText: {
    ...BodyStyle,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  // Floating circles styles
  bubblesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  floatingCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#342846',
    opacity: 0.15,
  },
  // Chat with Atlas styles
  chatAtlasCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: 'white',
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#a592b0',
  },
  chatAtlasCardTablet: {
    marginBottom: 24,
  },
  chatAtlasAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F6F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CDBFAD',
  },
  chatAtlasImage: {
    width: 40,
    height: 40,
  },
  chatAtlasContent: {
    flex: 1,
  },
  chatAtlasTitle: {
    ...HeadingStyle,
    fontSize: 15,
    color: '#342846',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  chatAtlasSubtitle: {
    ...BodyStyle,
    fontSize: 13,
    color: '#8B8178',
    lineHeight: 20, // Reduced by 15% from default 24 (24 * 0.85 = 20.4)
    flexShrink: 1,
  },
  chatAtlasSubtitleRussian: {
    fontSize: 12,
    lineHeight: 17,
    includeFontPadding: false,
  },
  chatAtlasChevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F6F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Chat Modal styles
  chatModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '55%',
    maxHeight: 600,
    padding: 24,
  },
  chatHeader: {
    marginBottom: 20,
  },
  chatHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CDBFAD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  chatHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatHeaderText: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'none',
  },
  closeChatButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    flex: 1,
  },
  chatContentContainer: {
    paddingBottom: 16,
  },
  atlasMessageContainer: {
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  atlasBubbleAndAvatar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  atlasAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F6F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CDBFAD',
    flexShrink: 0,
  },
  atlasAvatar: {
    width: 32,
    height: 32,
  },
  atlasMessageBubble: {
    backgroundColor: '#F8F6F3',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#CDBFAD',
    maxWidth: '85%',
  },
  atlasMessageText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  userMessageContainer: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageBubble: {
    backgroundColor: '#342846',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopRightRadius: 4,
    maxWidth: '85%',
  },
  userMessageText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#CDBFAD',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F8F6F3',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#342846',
    borderWidth: 1,
    borderColor: '#CDBFAD',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Goal Completion Modal
  goalCompleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  goalCompleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  goalCompleteIconContainer: {
    marginBottom: 20,
  },
  goalCompleteIcon: {
    fontSize: 64,
  },
  goalCompleteTitle: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 16,
  },
  goalCompleteMessage: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  goalCompleteButton: {
    backgroundColor: '#342846',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  goalCompleteButtonText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
