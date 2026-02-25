import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { generateGoalSteps, generateStepDescription, generateLevelStepInstructions } from '@/utils/claudeApi';
import { trackStepCompletionEvent } from '@/utils/goalTracking';
import { checkSubscriptionStatus } from '@/utils/superwall';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Dimensions, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function LevelDetailScreen() {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const levelNumber = params.level ? parseInt(params.level as string) : 1;
  const goalName = params.goalName as string || tr('Get an internship', 'Получить стажировку');
  const goalId = params.goalId as string || ''; // Goal ID for marking as completed
  const userName = params.userName as string || tr('Friend', 'Друг');
  
  // State for dynamic step data
  const [stepName, setStepName] = useState<string>('');
  const [stepDescription, setStepDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fear, setFear] = useState<string>(tr('fear of rejection', 'страх отказа'));
  const [totalLevels, setTotalLevels] = useState<number>(4); // Default to 4 levels
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set()); // Track completed step indices
  const [stepInstructions, setStepInstructions] = useState<Array<{ text: string; icon?: string }>>([]); // AI-generated step instructions
  
  // Get fallback level data from translations
  const fallbackLevelData = t('levelDetail.fallbackLevels', { returnObjects: true }) as any;
  const fallbackLevel = fallbackLevelData[levelNumber.toString()] || fallbackLevelData['1'];
  const currentStepName = stepName || fallbackLevel.name;
  const currentDescription = stepDescription || fallbackLevel.description;
  const currentFear = fear || fallbackLevel.fear;
  
  const [showFearChat, setShowFearChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'atlas' | 'user'; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [showNeedTimeModal, setShowNeedTimeModal] = useState(false);

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

  const loadStepCompletion = async (): Promise<Set<number>> => {
    try {
      if (!goalId || !levelNumber) return new Set<number>();
      const storageKey = `stepCompletion_${goalId}_${levelNumber}`;
      const savedData = await AsyncStorage.getItem(storageKey);
      if (!savedData) return new Set<number>();
      const savedIndices = JSON.parse(savedData) as number[];
      return new Set(savedIndices);
    } catch (error) {
      console.error('Error loading step completion:', error);
      return new Set<number>();
    }
  };

  // Save step completion state to AsyncStorage
  const saveStepCompletion = async (completedIndices: number[]) => {
    try {
      if (!goalId || !levelNumber) return;
      
      const storageKey = `stepCompletion_${goalId}_${levelNumber}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(completedIndices));
    } catch (error) {
      console.error('Error saving step completion:', error);
    }
  };

  // Toggle step completion
  const toggleStepCompletion = (stepId: number) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      const wasCompleted = newSet.has(stepId);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      // Save to AsyncStorage
      saveStepCompletion(Array.from(newSet));
      if (!wasCompleted) {
        trackStepCompletionEvent(goalId, goalName, levelNumber, stepId).catch((error) => {
          console.error('Error tracking step completion:', error);
        });
      }
      return newSet;
    });
  };

  // Reset completion state when level or goal changes
  useEffect(() => {
    // Reset completion state when level/goal changes
    // This ensures fresh start for each level
    setCompletedSteps(new Set());
  }, [levelNumber, goalId]);

  // Load user data and generate step content
  useEffect(() => {
    const loadStepData = async () => {
      try {
        setIsLoading(true);
        const savedCompletion = await loadStepCompletion();
        setCompletedSteps(savedCompletion);

        const userIsPremium = await checkSubscriptionStatus();
        if (!userIsPremium) {
          const userGoalsData = await AsyncStorage.getItem('userGoals');
          const userGoals = userGoalsData ? JSON.parse(userGoalsData) : [];
          const goal = userGoals.find((g: any) => g.id === goalId);

          if (goal && Array.isArray(goal.steps) && goal.steps.length > 0) {
            const sortedSteps = goal.steps
              .slice()
              .sort((a: any, b: any) => {
                const orderA = a.order || a.number || 0;
                const orderB = b.order || b.number || 0;
                return orderA - orderB;
              });

            setTotalLevels(sortedSteps.length);
            const currentStep = sortedSteps.find((step: any) => {
              const stepNumber = step.order || step.number;
              return stepNumber === levelNumber;
            }) || sortedSteps[levelNumber - 1];

            if (currentStep) {
              const levelName = currentStep.name || currentStep.text || `${tr('Level', 'Уровень')} ${levelNumber}`;
              const description = currentStep.description || levelName;
              setStepName(levelName);
              setStepDescription(description);
              setStepInstructions([{ text: description }]);
            } else {
              setStepInstructions([]);
            }
          } else {
            setStepInstructions([]);
          }

          setIsLoading(false);
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

        if (fearData) {
          setFear(fearData);
        }

        // Generate goal steps to get step names
        const goalStepsResult = await generateGoalSteps(
          goalName,
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

        // Find the step for current level number
        const currentStep = goalStepsResult.steps.find(step => step.number === levelNumber);
        const totalSteps = goalStepsResult.steps.length;
        
        // Store totalSteps for navigation
        setTotalLevels(totalSteps);

        if (currentStep) {
          setStepName(currentStep.text);
          
          // Generate detailed description for this step
          const description = await generateStepDescription(
            goalName,
            levelNumber,
            currentStep.text,
            totalSteps,
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
          
          setStepDescription(description);
          
          // Generate AI step instructions for this level
          // These are fresh instructions generated specifically for this level
          const instructions = await generateLevelStepInstructions(
            goalName,
            levelNumber,
            currentStep.text,
            totalSteps,
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
          
          setStepInstructions(instructions);
          
          // Save step instructions for future use
          if (goalId && levelNumber) {
            try {
              const storageKey = `stepInstructions_${goalId}_${levelNumber}`;
              await AsyncStorage.setItem(storageKey, JSON.stringify(instructions));
            } catch (error) {
              console.error('Error saving step instructions:', error);
            }
          }
          
          console.log(`Generated ${instructions.length} step instructions for level ${levelNumber}`);
        } else {
          // Fallback if step not found
          setStepName(fallbackLevel.name);
          setStepDescription(fallbackLevel.description);
          setStepInstructions([]);
          setCompletedSteps(savedCompletion);
        }
      } catch (error) {
        console.error('Error loading step data:', error);
        // Use fallback data on error
        setStepName(fallbackLevel.name);
        setStepDescription(fallbackLevel.description);
        setStepInstructions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadStepData();
  }, [levelNumber, goalName, goalId]);

  // Get level badge image based on level number
  const getLevelBadgeImage = () => {
    switch (levelNumber) {
      case 1:
        return require('../assets/images/level1.png');
      case 2:
        return require('../assets/images/level2.png');
      case 3:
        return require('../assets/images/level3.png');
      case 4:
        return require('../assets/images/level4.png');
      default:
        return require('../assets/images/level1.png');
    }
  };

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      setChatMessages([...chatMessages, { type: 'user', text: chatInput.trim() }]);
      setChatInput('');
      // TODO: Send to AI and get response
    }
  };

  const handleOpenFearChat = () => {
    setShowFearChat(true);
    // Initialize with Atlas's message about the fear
    const initialMessage = tr(
      `I understand this feels difficult because of "${currentFear}". Let's break down how to move through this fear and keep going with confidence. What worries you the most right now?`,
      `Я понимаю, что тебе непросто из-за "${currentFear}". Давай разберем, как пройти через этот страх и двигаться дальше увереннее. Что именно тебя больше всего тревожит?`
    );
    setChatMessages([{ type: 'atlas', text: initialMessage }]);
  };

  // Parse description into step items for the new design
  const parseSteps = (description: string): Array<{ icon: string; text: string }> => {
    if (!description) return [];
    
    // Remove stars
    let text = description.replace(/⭐/g, '').trim();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const steps: Array<{ icon: string; text: string }> = [];
    const iconMap: { [key: string]: string } = {
      'research': 'search',
      'search': 'search',
      'find': 'search',
      'look': 'search',
      'write': 'description',
      'note': 'description',
      'list': 'description',
      'document': 'description',
      'people': 'people',
      'team': 'people',
      'leadership': 'people',
      'contact': 'people',
      'network': 'people',
      'board': 'people',
      'analyze': 'bar-chart',
      'track': 'bar-chart',
      'measure': 'bar-chart',
      'data': 'bar-chart',
      'progress': 'bar-chart',
      'key': 'bar-chart',
      'decision': 'bar-chart',
      'create': 'create',
      'build': 'build',
      'develop': 'code',
      'practice': 'fitness-center',
      'prepare': 'event-note',
    };
    
    // Find bullet points or numbered items
    for (const line of lines) {
      // Match bullet points (various formats)
      const bulletMatch = line.match(/^[-•*]\s*(.+)$/);
      const numberMatch = line.match(/^\d+[.)]\s*(.+)$/);
      
      if (bulletMatch || numberMatch) {
        const stepText = (bulletMatch?.[1] || numberMatch?.[1] || '').trim();
        if (stepText && stepText.length > 5) { // Only add if meaningful text
          // Determine icon based on keywords
          const lowerText = stepText.toLowerCase();
          let icon = 'check-circle'; // default icon
          
          for (const [keyword, iconName] of Object.entries(iconMap)) {
            if (lowerText.includes(keyword)) {
              icon = iconName;
              break;
            }
          }
          
          steps.push({ icon, text: stepText });
        }
      }
    }
    
    // If no bullets found, try to split by common patterns or sentences
    if (steps.length === 0) {
      // Look for "How to Complete" section and extract steps
      let inStepsSection = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^(How to Complete|What You'll Do|Steps|Instructions)/i)) {
          inStepsSection = true;
          continue;
        }
        if (inStepsSection && line.length > 10 && !line.match(/^(Why|Time|Estimated|Note)/i)) {
          const lowerText = line.toLowerCase();
          let icon = 'check-circle';
          for (const [keyword, iconName] of Object.entries(iconMap)) {
            if (lowerText.includes(keyword)) {
              icon = iconName;
              break;
            }
          }
          steps.push({ icon, text: line });
        }
      }
      
      // If still no steps, try to split long sentences
      if (steps.length === 0) {
        const fullText = lines.join(' ');
        // Try to find action items in the text
        const sentences = fullText.split(/[.!?]/).filter(s => s.trim().length > 15);
        sentences.slice(0, 4).forEach(sentence => {
          const trimmed = sentence.trim();
          if (trimmed.length > 10) {
            const lowerText = trimmed.toLowerCase();
            let icon = 'check-circle';
            for (const [keyword, iconName] of Object.entries(iconMap)) {
              if (lowerText.includes(keyword)) {
                icon = iconName;
                break;
              }
            }
            steps.push({ icon, text: trimmed });
          }
        });
      }
    }
    
    // Limit to 4 steps max and ensure we have at least one
    const finalSteps = steps.slice(0, 4);
    return finalSteps.length > 0 ? finalSteps : [{ icon: 'check-circle', text: currentStepName }];
  };

  // Parse description into sections with headings (keeping for fallback)
  const parseDescription = (description: string): Array<{ type: 'heading' | 'text' | 'bullet'; content: string }> => {
    if (!description) return [];
    
    // Remove stars
    let text = description.replace(/⭐/g, '').trim();
    
    const sections: Array<{ type: 'heading' | 'text' | 'bullet'; content: string }> = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      // Check if this is a heading (common heading patterns - case insensitive)
      const isTimeEstimate = line.match(/^(Time Estimate|Estimated Time)/i);
      const isHeading = line.match(/^(Why This Step Matters|How to Complete It|Why This Matters|How to Complete|What You'll Do)/i);
      
      if (isTimeEstimate) {
        // Skip the "Time Estimate" heading, just show the content as text
        i++;
        
        // Collect text until next heading or bullet points
        const textLines: string[] = [];
        while (i < lines.length) {
          const nextLine = lines[i];
          // Stop if we hit another heading
          if (nextLine.match(/^(Why|How|Time|What|Estimated)/i) && !nextLine.startsWith('-')) {
            break;
          }
          // Stop if we hit a bullet point (but include it)
          if (nextLine.startsWith('-')) {
            break;
          }
          textLines.push(nextLine);
          i++;
        }
        
        if (textLines.length > 0) {
          // Remove "Estimated time:" prefix if present
          let timeText = textLines.join('\n');
          timeText = timeText.replace(/^Estimated time:\s*/i, '').trim();
          sections.push({ type: 'text', content: timeText });
        }
      } else if (isHeading) {
        sections.push({ type: 'heading', content: line });
        i++;
        
        // Collect text until next heading or bullet points
        const textLines: string[] = [];
        while (i < lines.length) {
          const nextLine = lines[i];
          // Stop if we hit another heading
          if (nextLine.match(/^(Why|How|Time|What|Estimated)/i) && !nextLine.startsWith('-')) {
            break;
          }
          // Stop if we hit a bullet point (but include it)
          if (nextLine.startsWith('-')) {
            break;
          }
          textLines.push(nextLine);
          i++;
        }
        
        if (textLines.length > 0) {
          sections.push({ type: 'text', content: textLines.join('\n') });
        }
      } else if (line.startsWith('-')) {
        // Bullet point
        sections.push({ type: 'bullet', content: line.substring(1).trim() });
        i++;
      } else {
        // Regular text - check if it might be a heading (short line, no lowercase start, not a sentence)
        const mightBeHeading = line.length < 60 && 
                               !line.startsWith('-') && 
                               !line.match(/^[a-z]/) &&
                               !line.includes('.') &&
                               (i === 0 || sections.length === 0 || sections[sections.length - 1].type === 'heading');
        
        if (mightBeHeading && i === 0) {
          // First line that looks like a heading
          sections.push({ type: 'heading', content: line });
          i++;
        } else {
          // Regular text
          const textLines: string[] = [line];
          i++;
          while (i < lines.length) {
            const nextLine = lines[i];
            // Stop if we hit a heading
            if (nextLine.match(/^(Why|How|Time|What|Estimated)/i) && !nextLine.startsWith('-')) {
              break;
            }
            // Stop if we hit a bullet point
            if (nextLine.startsWith('-')) {
              break;
            }
            textLines.push(nextLine);
            i++;
          }
          sections.push({ type: 'text', content: textLines.join('\n') });
        }
      }
    }
    
    return sections;
  };

  return (
    <PaperTextureBackground>
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

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Navigate to goals screen as fallback if back doesn't work
              try {
                if (router.canGoBack && router.canGoBack()) {
                  router.back();
                } else {
                  router.push('/(tabs)/goals');
                }
              } catch (error) {
                // Fallback: navigate directly to goals screen
                router.push('/(tabs)/goals');
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.backButtonCircle}>
              <MaterialIcons name="arrow-back" size={20} color="#342846" />
            </View>
          </TouchableOpacity>

          {/* Progress Badge */}
          <View style={styles.progressBadge}>
            <View style={styles.progressBadgeCircle}>
              <Text style={styles.progressBadgeNumber}>{levelNumber}</Text>
            </View>
            <Text style={styles.progressBadgeText}>{tr('of', 'из')} {totalLevels}</Text>
          </View>

          {/* Exit Button */}
          <TouchableOpacity
            style={styles.exitButton}
            onPress={() => router.push('/(tabs)/goals')}
            activeOpacity={0.8}
          >
            <View style={styles.exitButtonCircle}>
              <MaterialIcons name="close" size={20} color="#342846" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Goal Card */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#342846" />
            <Text style={styles.loadingText}>{tr('Loading step...', 'Загрузка шага...')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.goalCard}>
              {/* Decorative circles */}
              <View style={styles.goalCardCircle1} />
              <View style={styles.goalCardCircle2} />
              
              <View style={styles.goalCardContent}>
                {/* Today's Goal Badge */}
                <View style={styles.goalBadge}>
                  <IconSymbol name="target" size={14} color="#CDBFAD" />
                  <Text style={styles.goalBadgeText}>{tr('Today\'s goal', 'Цель на сегодня')}</Text>
                </View>
                
                {/* Goal Title */}
                <Text style={styles.goalTitle}>{currentStepName.replace(/⭐/g, '').trim()}</Text>
                
                {/* Goal Description */}
                {currentDescription && (
                  <Text style={styles.goalDescription}>
                    {parseDescription(currentDescription)
                      .filter(s => s.type === 'text')
                      .map(s => s.content)
                      .join(' ')
                      .substring(0, 100)}
                    {parseDescription(currentDescription)
                      .filter(s => s.type === 'text')
                      .map(s => s.content)
                      .join(' ').length > 100 ? '...' : ''}
                  </Text>
                )}
              </View>
            </View>

            {/* Steps Section */}
            <View style={styles.stepsSection}>
              <Text style={styles.stepsHeading}>{tr('How to complete', 'Как выполнить')}</Text>
              
              {stepInstructions.length > 0 ? (
                // Use AI-generated step instructions
                stepInstructions.map((step, index) => {
                  // Map step keywords to MaterialIcons names based on text content
                  const getIconName = (text: string): any => {
                    const lowerText = text.toLowerCase();
                    if (lowerText.includes('research') || lowerText.includes('search') || lowerText.includes('find') || lowerText.includes('look')) {
                      return 'search';
                    } else if (lowerText.includes('write') || lowerText.includes('note') || lowerText.includes('list') || lowerText.includes('document')) {
                      return 'description';
                    } else if (lowerText.includes('people') || lowerText.includes('team') || lowerText.includes('contact') || lowerText.includes('network') || lowerText.includes('interview') || lowerText.includes('meet')) {
                      return 'people';
                    } else if (lowerText.includes('analyze') || lowerText.includes('track') || lowerText.includes('measure') || lowerText.includes('data') || lowerText.includes('progress')) {
                      return 'bar-chart';
                    } else if (lowerText.includes('create') || lowerText.includes('build') || lowerText.includes('develop') || lowerText.includes('make')) {
                      return 'create';
                    } else if (lowerText.includes('practice') || lowerText.includes('exercise')) {
                      return 'fitness-center';
                    } else if (lowerText.includes('schedule') || lowerText.includes('plan') || lowerText.includes('prepare')) {
                      return 'event-note';
                    }
                    return 'check-circle';
                  };
                  
                  const stepId = index + 1;
                  const isCompleted = completedSteps.has(stepId);
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => toggleStepCompletion(stepId)}
                      activeOpacity={0.7}
                    >
                      <Animated.View 
                        style={[
                          styles.stepCard,
                          isCompleted && styles.stepCardCompleted,
                          { opacity: isLoading ? 0 : 1 }
                        ]}
                      >
                        {/* Checkbox */}
                        <View style={[
                          styles.stepCheckbox,
                          isCompleted && styles.stepCheckboxCompleted
                        ]}>
                          {isCompleted && (
                            <MaterialIcons name="check" size={16} color="#342846" />
                          )}
                        </View>
                        
                        <View style={styles.stepIconContainer}>
                          <MaterialIcons 
                            name={getIconName(step.text)} 
                            size={20} 
                            color={isCompleted ? "#8B8178" : "#342846"} 
                          />
                        </View>
                        <Text style={[
                          styles.stepText,
                          isCompleted && styles.stepTextCompleted
                        ]}>{step.text}</Text>
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                // Fallback to parsed steps if AI generation failed
                parseSteps(currentDescription).map((step, index) => {
                  const getIconName = (iconKey: string): any => {
                    const iconMap: { [key: string]: any } = {
                      'search': 'search',
                      'description': 'description',
                      'people': 'people',
                      'bar-chart': 'bar-chart',
                      'create': 'create',
                      'build': 'build',
                      'code': 'code',
                      'fitness-center': 'fitness-center',
                      'event-note': 'event-note',
                      'check-circle': 'check-circle',
                    };
                    return iconMap[iconKey] || 'check-circle';
                  };
                  
                  const stepId = index + 1;
                  const isCompleted = completedSteps.has(stepId);
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => toggleStepCompletion(stepId)}
                      activeOpacity={0.7}
                    >
                      <Animated.View 
                        style={[
                          styles.stepCard,
                          isCompleted && styles.stepCardCompleted,
                          { opacity: isLoading ? 0 : 1 }
                        ]}
                      >
                        {/* Checkbox */}
                        <View style={[
                          styles.stepCheckbox,
                          isCompleted && styles.stepCheckboxCompleted
                        ]}>
                          {isCompleted && (
                            <MaterialIcons name="check" size={16} color="#342846" />
                          )}
                        </View>
                        
                        <View style={styles.stepIconContainer}>
                          <MaterialIcons 
                            name={getIconName(step.icon)} 
                            size={20} 
                            color={isCompleted ? "#8B8178" : "#342846"} 
                          />
                        </View>
                        <Text style={[
                          styles.stepText,
                          isCompleted && styles.stepTextCompleted
                        ]}>{step.text}</Text>
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* Chat with Atlas Section */}
        <TouchableOpacity
          style={styles.chatAtlasCard}
          onPress={handleOpenFearChat}
          activeOpacity={0.8}
        >
          <View style={styles.chatAtlasAvatar}>
            <Image
              source={require('../assets/images/applogo.png')}
              style={styles.chatAtlasImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.chatAtlasContent}>
            <Text style={styles.chatAtlasTitle}>{tr('Chat with Atlas', 'Чат с Атласом')}</Text>
            <Text style={styles.chatAtlasSubtitle}>{tr('Stuck? I am here to help!', 'Застрял? Я рядом, чтобы помочь!')}</Text>
          </View>
          <View style={styles.chatAtlasChevron}>
            <MaterialIcons name="chevron-right" size={18} color="#342846" />
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* I did it Button */}
          <TouchableOpacity
            style={styles.didItButton}
            onPress={() => {
              router.push({
                pathname: '/level-complete',
                params: {
                  level: levelNumber.toString(),
                  goalName: goalName,
                  goalId: goalId,
                  userName: userName,
                  totalLevels: totalLevels.toString(),
                },
              });
            }}
            activeOpacity={0.9}
          >
            <MaterialIcons name="check" size={18} color="#fff" />
            <Text style={styles.didItButtonText}>{t('levelDetail.iDidIt')}</Text>
          </TouchableOpacity>

          {/* Later Button */}
          <TouchableOpacity
            style={styles.laterButton}
            onPress={() => {
              setShowNeedTimeModal(true);
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="schedule" size={16} color="#8B8178" />
            <Text style={styles.laterButtonText}>{tr('Later', 'Позже')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fear Chat Modal */}
      <Modal
        visible={showFearChat}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFearChat(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.chatContainer}>
            {/* Chat Header */}
            <View style={styles.chatHeader}>
              {/* Handle */}
              <View style={styles.chatHandle} />
              <View style={styles.chatHeaderContent}>
                <Text style={styles.chatHeaderText}>{tr('Chat with Atlas', 'Чат с Атласом')}</Text>
                <TouchableOpacity
                  onPress={() => setShowFearChat(false)}
                  style={styles.closeChatButton}
                >
                  <MaterialIcons name="close" size={18} color="#342846" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Chat Content */}
            <ScrollView 
              style={styles.chatContent} 
              contentContainerStyle={styles.chatContentContainer}
            >
              {chatMessages.map((message, index) => (
                message.type === 'atlas' ? (
                  <View key={index} style={styles.atlasMessageContainer}>
                    <View style={styles.atlasBubbleAndAvatar}>
                      <View style={styles.atlasAvatarContainer}>
                        <Image
                          source={require('../assets/images/applogo.png')}
                          style={styles.atlasAvatar}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.atlasMessageBubble}>
                        <Text style={styles.atlasMessageText}>{message.text}</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View key={index} style={styles.userMessageContainer}>
                    <View style={styles.userMessageBubble}>
                      <Text style={styles.userMessageText}>{message.text}</Text>
                    </View>
                  </View>
                )
              ))}
            </ScrollView>

            {/* Chat Input */}
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder={tr('Type a message...', 'Напиши сообщение...')}
                placeholderTextColor="#8B8178"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={handleSendMessage}
                numberOfLines={1}
              />
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={handleSendMessage}
              >
                <MaterialIcons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Need Time Modal */}
      <Modal
        visible={showNeedTimeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNeedTimeModal(false)}
      >
        <View style={styles.needTimeModalOverlay}>
          <View style={styles.needTimeModalContent}>
            {/* Close Button - Top Right */}
            <TouchableOpacity
              style={styles.needTimeModalCloseButton}
              onPress={() => {
                setShowNeedTimeModal(false);
                // Navigate back to goals screen
                try {
                  if (router.canGoBack && router.canGoBack()) {
                    router.back();
                  } else {
                    router.push('/(tabs)/goals');
                  }
                } catch (error) {
                  router.push('/(tabs)/goals');
                }
              }}
            >
              <Text style={styles.needTimeModalCloseButtonText}>✕</Text>
            </TouchableOpacity>
            
            <Text style={styles.needTimeModalTitle}>{t('levelDetail.needTimeTitle')}</Text>
            <Text style={styles.needTimeModalMessage}>
              {t('levelDetail.needTimeMessage')}
            </Text>
            
            <TouchableOpacity
              style={styles.needTimeModalDoItButton}
              onPress={() => {
                setShowNeedTimeModal(false);
                router.push('/(tabs)/focus');
              }}
            >
              <Text style={styles.needTimeModalDoItButtonText}>{t('levelDetail.readyNow')}</Text>
            </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  backButton: {
    alignSelf: 'flex-start',
    zIndex: 10,
  },
  backButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CDBFAD',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButton: {
    alignSelf: 'flex-start',
    zIndex: 10,
  },
  exitButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CDBFAD',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#342846',
    fontWeight: 'bold',
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#CDBFAD',
  },
  progressBadgeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBadgeNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },
  progressBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#342846',
    letterSpacing: -0.2,
  },
  levelBadgeTop: {
    width: 60,
    height: 60,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
  goalCard: {
    backgroundColor: '#342846',
    borderRadius: 24,
    padding: 28,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  goalCardCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    backgroundColor: 'rgba(205, 191, 173, 0.1)',
    borderRadius: 60,
  },
  goalCardCircle2: {
    position: 'absolute',
    bottom: -60,
    left: -20,
    width: 140,
    height: 140,
    backgroundColor: 'rgba(205, 191, 173, 0.05)',
    borderRadius: 70,
  },
  goalCardContent: {
    position: 'relative',
    zIndex: 1,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(205, 191, 173, 0.2)',
    borderRadius: 20,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  goalBadgeText: {
    ...HeadingStyle,
    fontSize: 11,
    color: '#CDBFAD',
    letterSpacing: 0.8,
  },
  goalTitle: {
    ...HeadingStyle,
    fontSize: 28,
    color: 'white',
    marginBottom: 8,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  goalDescription: {
    fontSize: 14,
    color: 'rgba(205, 191, 173, 0.8)',
    lineHeight: 21,
  },
  stepsSection: {
    marginBottom: 24,
  },
  stepsHeading: {
    ...HeadingStyle,
    fontSize: 12,
    color: '#342846',
    letterSpacing: 1.2,
    marginBottom: 16,
    opacity: 0.5,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#CDBFAD',
  },
  stepCardCompleted: {
    opacity: 0.7,
  },
  stepCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CDBFAD',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  stepCheckboxCompleted: {
    backgroundColor: '#CDBFAD',
    borderColor: '#CDBFAD',
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8F6F3',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepText: {
    ...BodyStyle,
    color: '#342846',
    paddingTop: 8,
    flex: 1,
  },
  stepTextCompleted: {
    color: '#8B8178',
    textDecorationLine: 'line-through',
  },
  levelName: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
    width: '100%',
  },
  instructionsFrame: {
    backgroundColor: '#342846',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    width: '100%',
  },
  instructionHeading: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  instructionText: {
    ...BodyStyle,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  instructionBullet: {
    ...BodyStyle,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    marginLeft: 0,
    paddingLeft: 0, // Remove left padding since text is centered
  },
  chatAtlasCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: 'white',
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#CDBFAD',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#342846',
    marginBottom: 2,
  },
  chatAtlasSubtitle: {
    fontSize: 13,
    color: '#8B8178',
  },
  chatAtlasChevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F6F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dearFaceContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 65, // Moved down 65px total (30px + 20px + 15px)
  },
  dearFaceImage: {
    width: width * 0.3, // Made smaller (reduced from 0.39)
    height: width * 0.3,
  },
  chatFearButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    marginTop: 30, // Moved down 30px
    alignSelf: 'center',
    minHeight: 44,
  },
  chatFearButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 16,
  },
  didItButton: {
    backgroundColor: '#342846',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  didItButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  laterButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#CDBFAD',
  },
  laterButtonText: {
    ...BodyStyle,
    color: '#8B8178',
    fontSize: 15,
    fontWeight: '600',
  },
  needTimeButton: {
    borderRadius: 999,
    overflow: 'hidden',
    flex: 1,
    minHeight: 44,
  },
  needTimeButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needTimeButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: '600',
  },
  // Chat Modal Styles
  modalOverlay: {
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
  closeChatButtonText: {
    fontSize: 24,
    color: '#342846',
    fontWeight: 'bold',
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
    marginTop: 'auto',
    gap: 10,
  },
  chatInput: {
    flex: 1,
    ...BodyStyle,
    borderWidth: 1.5,
    borderColor: '#CDBFAD',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: '#342846',
    fontSize: 14,
    backgroundColor: '#FEFDFB',
  },
  sendButton: {
    backgroundColor: '#342846',
    borderRadius: 26,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  needTimeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  needTimeModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    position: 'relative',
  },
  needTimeModalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  needTimeModalCloseButtonText: {
    fontSize: 24,
    color: '#342846',
    fontWeight: 'bold',
  },
  needTimeModalTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  needTimeModalMessage: {
    ...BodyStyle,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  needTimeModalDoItButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
  },
  needTimeModalDoItButtonText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

