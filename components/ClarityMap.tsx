import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { generateClarityMapInsight } from '@/utils/clarityMapApi';
import { generateGoalFromInsight } from '@/utils/goalGenerator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    Keyboard,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export interface Thought {
  id: string;
  text: string;
  category: 'important' | 'unclear' | 'not_important' | null;
  timestamp: Date;
  x: number;
  y: number;
  scale: Animated.Value;
  opacity: Animated.Value;
  translateX: Animated.Value;
  translateY: Animated.Value;
  originalColor: string; // Store original color to keep it consistent
}

export interface ClarityMapSession {
  id: string;
  timestamp: Date;
  thoughts: Thought[];
  aiSummary: {
    mainFocus: string;
    secondaryFocus?: string;
    canIgnore: string;
  };
}

type Stage = 'dump' | 'sort' | 'confirm' | 'visualize' | 'insight';

interface ClarityMapProps {
  onClose: () => void;
}

export default function ClarityMap({ onClose }: ClarityMapProps) {
  const { t, i18n } = useTranslation();
  const [stage, setStage] = useState<Stage>('dump');
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentSortIndex, setCurrentSortIndex] = useState(0);
  const [aiSummary, setAiSummary] = useState<ClarityMapSession['aiSummary'] | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [showInspirationModal, setShowInspirationModal] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isInsightSaved, setIsInsightSaved] = useState(false);
  const [showSavedPopup, setShowSavedPopup] = useState(false);
  const [showGoalCreatedPopup, setShowGoalCreatedPopup] = useState(false);
  const [createdGoalData, setCreatedGoalData] = useState<{ name: string; steps: number; duration: string; isQueued?: boolean } | null>(null);
  const [isGeneratingGoal, setIsGeneratingGoal] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [selectedCategoryScale, setSelectedCategoryScale] = useState<{ [key: string]: Animated.Value }>({});
  const sortingBlobFloatY = useRef(new Animated.Value(0)).current;
  const sortingBlobBaseY = useRef(new Animated.Value(0)).current;
  
  // Example blobs animations - positioned below subheading with 20px spacing
  const blobMaxWidth = 140; // maxWidth from styles
  const blobSpacing = 20;
  const totalWidth = (blobMaxWidth * 3) + (blobSpacing * 2); // 3 blobs + 2 gaps
  const startX = (width - totalWidth) / 2; // Center the group
  
  const exampleBlobsRef = useRef([
    { id: 'example1', text: '', translateX: new Animated.Value(0), translateY: new Animated.Value(0), x: startX, y: 0 },
    { id: 'example2', text: '', translateX: new Animated.Value(0), translateY: new Animated.Value(0), x: startX + blobMaxWidth + blobSpacing, y: 0 },
    { id: 'example3', text: '', translateX: new Animated.Value(0), translateY: new Animated.Value(0), x: startX + (blobMaxWidth + blobSpacing) * 2, y: 0 },
  ]);
  
  // Update example blob texts when language changes
  useEffect(() => {
    exampleBlobsRef.current[0].text = t('clarityMap.exampleBlob1');
    exampleBlobsRef.current[1].text = t('clarityMap.exampleBlob2');
    exampleBlobsRef.current[2].text = t('clarityMap.exampleBlob3');
  }, [t, i18n.language]);
  
  const exampleBlobs = exampleBlobsRef.current;
  
  const inactivityTimerRef = useRef<number | null>(null);
  const readyToSortOpacity = useRef(new Animated.Value(0)).current;
  const stageTransitionOpacity = useRef(new Animated.Value(1)).current;
  const placeholderTimerRef = useRef<number | null>(null);
  const floatingAnimationStops = useRef<{ [key: string]: () => void }>({});
  const thoughtsRef = useRef<Thought[]>([]); // Store thoughts in ref
  const inputRef = useRef<TextInput>(null);

  // Rotating placeholder examples
  const placeholderExamples = t('clarityMap.placeholders', { returnObjects: true }) as string[];

  // Bubble colors array
  const bubbleColors = ['#c6afb8', '#baccd7', '#a6a76c', '#c88866', '#f3df91'];
  
  // Generate organic blob shape with randomized border-radius values
  // Creates pronounced blob shapes using highly varied border radius values
  const generateBlobShape = (index: number, size: number = 125) => {
    // Use index as seed for consistent randomization per bubble
    const seed = index * 7 + 13;
    
    // Create pseudo-random function based on seed
    const random = (offset: number) => {
      const value = ((seed + offset * 17) * 31) % 100;
      return value / 100; // Returns 0-1
    };
    
    // Use provided size (default 125 for regular blobs, smaller for example blobs)
    const bubbleSize = size;
    
    // Create extreme variation for pronounced blob effect
    // Use very wide range: 20-80% of bubble size to create asymmetric blob shapes
    const minRadius = bubbleSize * 0.20; // 20% minimum (very small corner)
    const maxRadius = bubbleSize * 0.80; // 80% maximum (very large corner)
    const range = maxRadius - minRadius;
    
    // Generate 4 corner radii with extreme variation - each corner gets very different values
    // This creates an asymmetric blob shape instead of a circle
    const tl = minRadius + random(1) * range; // top-left: 20-80% of size
    const tr = minRadius + random(2) * range; // top-right: 20-80% of size
    const br = minRadius + random(3) * range; // bottom-right: 20-80% of size
    const bl = minRadius + random(4) * range; // bottom-left: 20-80% of size
    
    // Ensure at least one corner is significantly different to avoid circular shape
    // Force variation by ensuring corners aren't too similar
    const corners = [tl, tr, br, bl];
    const avg = corners.reduce((a, b) => a + b, 0) / 4;
    
    // If all corners are too similar, adjust them to create more blob-like shape
    const adjustedCorners = corners.map((corner, i) => {
      if (Math.abs(corner - avg) < range * 0.2) {
        // This corner is too similar to average, make it more extreme
        return i % 2 === 0 ? minRadius + random(i + 10) * range : maxRadius - random(i + 11) * range * 0.5;
      }
      return corner;
    });
    
    return {
      borderTopLeftRadius: adjustedCorners[0],
      borderTopRightRadius: adjustedCorners[1],
      borderBottomRightRadius: adjustedCorners[2],
      borderBottomLeftRadius: adjustedCorners[3],
    };
  };
  
  // Create thought bubble with blob-like positioning
  const createThought = (text: string): Thought => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    // Calculate positions relative to the dumpBubblesContainer
    // Container starts at: 300 (floating bubbles position)
    // Position bubbles in the same area as example blobs (centered vertically in container)
    const containerTop = 300; // Container top position (matches exampleBlobsContainer)
    const bubbleCenterY = 75; // Center bubbles vertically in the container (middle of 150px height container)
    
    // Spread bubbles across the screen with minimum spacing for readability
    let x: number;
    let y: number;
    const minSpacing = 60; // Minimum distance between bubbles (increased for readability)
    const bubbleWidth = 150; // Max bubble width
    const bubbleHeight = 100; // Approximate bubble height
    
    if (thoughts.length === 0) {
      // First bubble starts at continue button y-axis, slightly left
      x = width * 0.2;
      y = bubbleCenterY;
    } else {
      // Try to place bubble with minimum spacing from existing bubbles
      let attempts = 0;
      let validPosition = false;
      
      // Default fallback position
      x = width * 0.5;
      y = bubbleCenterY;
      
      while (!validPosition && attempts < 50) {
        // Distribute bubbles around the example blob area (same area as example blobs)
        const index = thoughts.length;
        const zones = [
          { x: width * 0.15, y: bubbleCenterY - 20 }, // Left, slightly above center
          { x: width * 0.85, y: bubbleCenterY - 15 }, // Right, slightly above center
          { x: width * 0.25, y: bubbleCenterY }, // Left, at center level
          { x: width * 0.75, y: bubbleCenterY }, // Right, at center level
          { x: width * 0.1, y: bubbleCenterY + 20 }, // Lower left, slightly below center
          { x: width * 0.9, y: bubbleCenterY + 15 }, // Lower right, slightly below center
          { x: width * 0.3, y: bubbleCenterY + 10 }, // Left side, slightly below center
          { x: width * 0.7, y: bubbleCenterY + 5 }, // Right side, slightly below center
        ];
        
        const zone = zones[index % zones.length];
        // Add random variation within the zone
        const variationX = (Math.random() - 0.5) * 60;
        const variationY = (Math.random() - 0.5) * 30;
        
        x = zone.x + variationX;
        y = zone.y + variationY;
        
        // Keep within bounds - allow bubbles to float around the example blob area
        x = Math.max(30, Math.min(width - bubbleWidth - 30, x));
        y = Math.max(bubbleCenterY - 30, Math.min(bubbleCenterY + 50, y)); // Keep bubbles around center y-axis (±30-50px range)
        
        // Check if this position is at least minSpacing away from all existing bubbles
        // Use a more generous spacing calculation that accounts for bubble size
        validPosition = true;
        for (const existingThought of thoughts) {
          const distanceX = Math.abs(x - existingThought.x);
          const distanceY = Math.abs(y - existingThought.y);
          const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
          
          // Ensure bubbles are spaced far enough apart for readability
          // Account for both bubble widths in the spacing calculation
          if (distance < minSpacing + bubbleWidth) {
            validPosition = false;
            break;
          }
        }
        
        attempts++;
      }
      
      // If we couldn't find a valid position after 50 attempts, use the last calculated position
      // This ensures we don't get stuck in an infinite loop
    }
    
    // Determine original color based on current thoughts length
    const originalColor = bubbleColors[thoughts.length % bubbleColors.length];
    
    // CRITICAL: Create fresh Animated.Value instances that have NEVER been used with native driver
    // This ensures they start in JS driver mode and can be used with useNativeDriver: false
    const scale = new Animated.Value(0.9);
    const opacity = new Animated.Value(0.8);
    const translateX = new Animated.Value(0);
    const translateY = new Animated.Value(0);
    
    // Immediately set initial values to ensure they're initialized in JS mode
    // This helps prevent any potential driver mode conflicts
    scale.setValue(0.9);
    opacity.setValue(0.8);
    translateX.setValue(0);
    translateY.setValue(0);
    
    return {
      id,
      text,
      category: null,
      timestamp: new Date(),
      x,
      y,
      scale,
      opacity,
      translateX,
      translateY,
      originalColor, // Store original color to keep it consistent
    };
  };

  // Handle input submit
  const handleSubmit = () => {
    const trimmedText = inputText.trim();
    if (!trimmedText) {
      console.log('handleSubmit: No text to submit');
      return;
    }

    console.log('handleSubmit: Submitting text:', trimmedText);
    const newThought = createThought(trimmedText);
    
    // Add to state first
    setThoughts((prevThoughts) => {
      const updated = [...prevThoughts, newThought];
      thoughtsRef.current = updated; // Update ref
      return updated;
    });
    
    // Clear input and refocus
    setInputText('');
    
    // Refocus input field after a short delay to allow state to update
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    // Use requestAnimationFrame to ensure React has rendered the new bubble before animating
    requestAnimationFrame(() => {
      try {
        // Animate bubble spawn
        // IMPORTANT: Only animate scale and opacity - NOT translateX/Y
        // This ensures translateX/Y are never touched by native driver animations
        Animated.parallel([
          Animated.spring(newThought.scale, {
            toValue: 1,
            useNativeDriver: false, // Use false to match translateX/Y and avoid driver conflicts
            tension: 50,
            friction: 7,
          }),
          Animated.timing(newThought.opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false, // Use false to match scale and avoid driver conflicts
          }),
        ]).start((finished) => {
          if (!finished) {
            console.log('Spawn animation was interrupted');
            return;
          }
          
          // CRITICAL: Add a small delay and ensure translateX/Y are clean before starting floating
          // This prevents any potential native driver conflicts
          requestAnimationFrame(() => {
            try {
              // Stop any animations on translateX/Y to ensure clean state
              newThought.translateX.stopAnimation();
              newThought.translateY.stopAnimation();
              newThought.translateX.removeAllListeners();
              newThought.translateY.removeAllListeners();
              
              // Start floating animation after spawn animation completes
              // Only if blob is not categorized
              if (!newThought.category) {
                // Small delay to ensure spawn animation completes
                setTimeout(() => {
                  try {
                    startFloatingAnimation(newThought);
                  } catch (error) {
                    console.error('Error starting floating animation:', error);
                  }
                }, 100);
              }
            } catch (error) {
              console.error('Error in spawn animation callback:', error);
            }
          });
        });
      } catch (error) {
        console.error('Error starting spawn animation:', error);
        // Fallback: set values directly
        newThought.scale.setValue(1);
        newThought.opacity.setValue(1);
      }
    });

    // Reset inactivity timer
    resetInactivityTimer();
  };

  // Floating animation for bubbles - blob-like organic movement
  const startFloatingAnimation = (thought: Thought) => {
    const thoughtId = thought.id;
    
    // Don't float if bubble has a category
    if (thought.category !== undefined && thought.category !== null) {
      return;
    }

    let shouldContinue = true;

    const createFloat = () => {
      // Re-check before each animation loop
      const currentThought = thoughtsRef.current.find(t => t.id === thoughtId);
      if (!currentThought || currentThought.category || !shouldContinue) {
        return;
      }

      const randomX = (Math.random() - 0.5) * 30;
      const randomY = (Math.random() - 0.5) * 30;

      Animated.sequence([
        Animated.timing(thought.translateX, {
          toValue: randomX,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: false, // Must use false to match other translateX animations
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(thought.translateX, {
          toValue: -randomX,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: false, // Must use false to match other translateX animations
          easing: Easing.inOut(Easing.ease),
        }),
      ]).start(() => {
        const stillValid = thoughtsRef.current.find(t => t.id === thoughtId);
        if (shouldContinue && stillValid && !stillValid.category) {
          createFloat();
        }
      });

      Animated.sequence([
        Animated.timing(thought.translateY, {
          toValue: randomY,
          duration: 2500 + Math.random() * 1000,
          useNativeDriver: false, // Must use false to match other translateY animations
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(thought.translateY, {
          toValue: -randomY,
          duration: 2500 + Math.random() * 1000,
          useNativeDriver: false, // Must use false to match other translateY animations
          easing: Easing.inOut(Easing.ease),
        }),
      ]).start();
    };

    createFloat();

    floatingAnimationStops.current[thoughtId] = () => {
      shouldContinue = false;
      thought.translateX.stopAnimation();
      thought.translateY.stopAnimation();
    };
  };

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    Animated.timing(readyToSortOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    inactivityTimerRef.current = setTimeout(() => {
      if (thoughts.length > 0 && stage === 'dump') {
        Animated.timing(readyToSortOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    }, 10000);
  };

  // Transition to sorting stage
  const handleContinueToSort = () => {
    if (thoughts.length === 0) return;

    // Fade out input
    Animated.timing(stageTransitionOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setStage('sort');
      setCurrentSortIndex(0);
      Animated.timing(stageTransitionOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  };

  // Go back to dump stage
  const handleBackToDump = () => {
    Animated.timing(stageTransitionOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setStage('dump');
      setCurrentSortIndex(0);
      Animated.timing(stageTransitionOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  };

  // Simple category selection - one bubble at a time
  const handleCategorySelect = (category: 'important' | 'unclear' | 'not_important') => {
    // Create zoom animation for the selected category card
    const categoryKey = category;
    if (!selectedCategoryScale[categoryKey]) {
      const newScale = new Animated.Value(1);
      setSelectedCategoryScale(prev => ({ ...prev, [categoryKey]: newScale }));
      
      // Zoom in animation
      Animated.sequence([
        Animated.spring(newScale, {
          toValue: 1.15,
          useNativeDriver: true,
          tension: 50,
          friction: 3,
        }),
        Animated.spring(newScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 3,
        }),
      ]).start();
    } else {
      // Zoom in animation
      Animated.sequence([
        Animated.spring(selectedCategoryScale[categoryKey], {
          toValue: 1.15,
          useNativeDriver: true,
          tension: 50,
          friction: 3,
        }),
        Animated.spring(selectedCategoryScale[categoryKey], {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 3,
        }),
      ]).start();
    }

    // Update current thought with category
    setThoughts(prev => {
      const updated = prev.map((t, i) => 
        i === currentSortIndex ? {...t, category} : t
      );
      thoughtsRef.current = updated;
      return updated;
    });

    // Move to next or finish
    if (currentSortIndex < thoughts.length - 1) {
      setCurrentSortIndex(prev => prev + 1);
      } else {
      // All bubbles sorted, transition to confirmation screen
      transitionToConfirm();
    }
  };

  // Transition to confirmation screen
  const transitionToConfirm = () => {
    Animated.timing(stageTransitionOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setStage('confirm');
      // Stop all floating animations
      Object.keys(floatingAnimationStops.current).forEach((thoughtId) => {
        const stopFloat = floatingAnimationStops.current[thoughtId];
        if (stopFloat) {
          stopFloat();
          delete floatingAnimationStops.current[thoughtId];
        }
      });

      Animated.timing(stageTransitionOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  };

  // Go back to sorting from confirmation
  const handleBackToSort = (specificIndex?: number) => {
    Animated.timing(stageTransitionOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setStage('sort');
      setCurrentSortIndex(specificIndex !== undefined ? specificIndex : 0);
      Animated.timing(stageTransitionOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  };

  // Continue from confirmation directly to insight with loading
  const handleConfirmContinue = () => {
    // Transition to insight stage immediately and start generating
    Animated.timing(stageTransitionOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setStage('insight');
      // Stop all floating animations
      Object.keys(floatingAnimationStops.current).forEach((thoughtId) => {
        const stopFloat = floatingAnimationStops.current[thoughtId];
        if (stopFloat) {
          stopFloat();
          delete floatingAnimationStops.current[thoughtId];
        }
      });

      Animated.timing(stageTransitionOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
      
      // Start generating insight
      generateInsightWithoutTransition();
    });
  };

  // Transition to visualization
  const transitionToVisualization = () => {
    Animated.timing(stageTransitionOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setStage('visualize');
      // Stop all floating animations
      Object.keys(floatingAnimationStops.current).forEach((thoughtId) => {
        const stopFloat = floatingAnimationStops.current[thoughtId];
        if (stopFloat) {
          stopFloat();
          delete floatingAnimationStops.current[thoughtId];
        }
      });

      Animated.timing(stageTransitionOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  };

  // Generate AI insight (with stage transition - used by visualize stage auto-transition)
  const generateInsight = async () => {
    setIsGeneratingSummary(true);
    
    try {
      const insightText = await generateClarityMapInsight(thoughts);
      setAiInsight(insightText);
      
      Animated.timing(stageTransitionOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setStage('insight');
        // Blur bubbles into background
        thoughts.forEach((thought) => {
          Animated.parallel([
            Animated.timing(thought.scale, {
              toValue: 0.5,
              duration: 300,
              useNativeDriver: false, // Use false to match translateX/Y and avoid driver conflicts
            }),
            Animated.timing(thought.opacity, {
              toValue: 0.2,
              duration: 300,
              useNativeDriver: false, // Use false to match scale and avoid driver conflicts
            }),
          ]).start();
        });
        
        Animated.timing(stageTransitionOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    } catch (error) {
      console.error('Error generating insight:', error);
      // Fallback insight
      setAiInsight(t('clarityMap.fallbackInsight'));
      setStage('insight');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Generate AI insight without stage transition (used when already on insight stage)
  const generateInsightWithoutTransition = async () => {
    setIsGeneratingSummary(true);
    
    try {
      const insightText = await generateClarityMapInsight(thoughts);
      setAiInsight(insightText);
      
      // Blur bubbles into background
      thoughts.forEach((thought) => {
        Animated.parallel([
          Animated.timing(thought.scale, {
            toValue: 0.5,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(thought.opacity, {
            toValue: 0.2,
            duration: 300,
            useNativeDriver: false,
          }),
        ]).start();
      });
    } catch (error) {
      console.error('Error generating insight:', error);
      // Fallback insight
      setAiInsight(t('clarityMap.fallbackInsight'));
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Save session
  const handleSave = async () => {
    if (!aiSummary) return;

    const session: ClarityMapSession = {
      id: Date.now().toString(),
      timestamp: new Date(),
      thoughts: thoughts.map(({ scale, opacity, translateX, translateY, ...rest }) => rest) as any,
      aiSummary,
    };

    try {
      const existingSessions = await AsyncStorage.getItem('clarityMapSessions');
      const sessions = existingSessions ? JSON.parse(existingSessions) : [];
      sessions.push(session);
      await AsyncStorage.setItem('clarityMapSessions', JSON.stringify(sessions));
      onClose();
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  // Save insight
  const handleSaveInsight = async () => {
    if (!aiInsight) return;
    
    try {
      // Save insight to 'me' section
      const savedInsightsData = await AsyncStorage.getItem('savedInsights');
      const savedInsights = savedInsightsData ? JSON.parse(savedInsightsData) : [];
      
      // Generate title from the first heading in the insight
      const generateInsightTitle = (text: string): string => {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        // Look for the first heading-like line
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length > 0 && 
              trimmed.length < 50 && 
              !trimmed.endsWith('.') && 
              !trimmed.endsWith(',') &&
              !trimmed.startsWith('-') &&
              !trimmed.startsWith('•')) {
            return trimmed;
          }
        }
        return t('me.clarityInsight');
      };
      
      const insightData = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        title: generateInsightTitle(aiInsight),
        insight: aiInsight,
        thoughts: thoughts.map(({ scale, opacity, translateX, translateY, ...rest }) => rest),
      };
      
      savedInsights.unshift(insightData); // Add to beginning
      await AsyncStorage.setItem('savedInsights', JSON.stringify(savedInsights));
      
      // Update state
      setIsInsightSaved(true);
      setShowSavedPopup(true);
      
      // Hide popup after 3 seconds
      setTimeout(() => {
        setShowSavedPopup(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving insight:', error);
      Alert.alert(t('clarityMap.errorSavingInsight'), t('clarityMap.errorSavingInsightMessage'));
    }
  };

  // Turn into Path handler
  const handleTurnIntoPath = async () => {
    if (!aiInsight) {
      Alert.alert('Error', 'No insight available to turn into a goal.');
      return;
    }
    
    try {
      setIsGeneratingGoal(true);
      
      // Generate goal from insight
      const generatedGoal = await generateGoalFromInsight(aiInsight);
      
      // Load existing goals
      const userGoalsData = await AsyncStorage.getItem('userGoals');
      const userGoals = userGoalsData ? JSON.parse(userGoalsData) : [];
      
      // Count active goals
      const activeGoals = userGoals.filter((g: any) => g.isActive === true);
      const MAX_ACTIVE_GOALS = 3;
      
      // Create new goal object
      const newGoal = {
        id: Date.now().toString(),
        name: generatedGoal.name,
        steps: generatedGoal.steps,
        numberOfSteps: generatedGoal.numberOfSteps,
        estimatedDuration: generatedGoal.estimatedDuration,
        hardnessLevel: generatedGoal.hardnessLevel,
        fear: generatedGoal.fear || 'unknown',
        progressPercentage: 0,
        isActive: activeGoals.length < MAX_ACTIVE_GOALS, // Only active if under limit
        isQueued: activeGoals.length >= MAX_ACTIVE_GOALS, // Queue if at limit
        createdAt: new Date().toISOString(),
        currentStepIndex: 0,
      };
      
      // Add new goal
      userGoals.unshift(newGoal);
      
      // Save goals
      await AsyncStorage.setItem('userGoals', JSON.stringify(userGoals));
      
      // If goal is active, also set as current userGoal
      if (newGoal.isActive) {
        await AsyncStorage.setItem('userGoal', JSON.stringify(newGoal));
      }
      
      // Show custom popup
      if (newGoal.isQueued) {
        // Show queue message
        setCreatedGoalData({
          name: generatedGoal.name,
          steps: generatedGoal.numberOfSteps,
          duration: generatedGoal.estimatedDuration,
          isQueued: true,
        });
      } else {
        setCreatedGoalData({
          name: generatedGoal.name,
          steps: generatedGoal.numberOfSteps,
          duration: generatedGoal.estimatedDuration,
          isQueued: false,
        });
      }
      setShowGoalCreatedPopup(true);
      setIsGeneratingGoal(false);
    } catch (error) {
      console.error('Error creating goal:', error);
      setIsGeneratingGoal(false);
      Alert.alert(t('clarityMap.errorCreatingGoal'), t('clarityMap.errorCreatingGoalMessage'));
    }
  };

  // Handle goal created popup close
  const handleGoalCreatedClose = () => {
    setShowGoalCreatedPopup(false);
    setCreatedGoalData(null);
    handleClose();
  };

  // Close handler
  const handleClose = () => {
    // Return to dump stage and reset
    setStage('dump');
    setThoughts([]);
    setAiInsight('');
    setCurrentSortIndex(0);
    setIsInsightSaved(false);
    setShowSavedPopup(false);
    setShowGoalCreatedPopup(false);
    setCreatedGoalData(null);
    setIsGeneratingGoal(false);
    onClose();
  };

  // Don't auto-center or auto-categorize - let user control everything
  // useEffect(() => {
  //   if (stage === 'sort' && thoughts.length > 0) {
  //     centerNextBubble(thoughts[0]);
  //   }
  // }, [stage]);

  // Update thoughts ref whenever thoughts change
  useEffect(() => {
    thoughtsRef.current = thoughts;
  }, [thoughts]);

  // Floating animation for sorting blob
  useEffect(() => {
    if (stage === 'sort' && currentSortIndex < thoughts.length) {
      const createFloat = () => {
        Animated.sequence([
          Animated.timing(sortingBlobFloatY, {
            toValue: -8, // Float up 8px
            duration: 1500,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(sortingBlobFloatY, {
            toValue: 8, // Float down 8px
            duration: 1500,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
        ]).start(() => {
          if (stage === 'sort' && currentSortIndex < thoughts.length) {
            createFloat();
          }
        });
      };
      createFloat();
    } else {
      sortingBlobFloatY.setValue(0);
    }
  }, [stage, currentSortIndex, thoughts.length]);

  // Handle keyboard show/hide to adjust input position
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Auto-transition from visualization to insight after 5 seconds
  useEffect(() => {
    if (stage === 'visualize') {
      const timer = setTimeout(() => {
        generateInsight();
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [stage]);

  // Rotate placeholder text
  useEffect(() => {
    if (stage === 'dump' && !inputText) {
      placeholderTimerRef.current = setInterval(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholderExamples.length);
      }, 3000);
    } else {
      if (placeholderTimerRef.current) {
        clearInterval(placeholderTimerRef.current);
      }
    }

    return () => {
      if (placeholderTimerRef.current) {
        clearInterval(placeholderTimerRef.current);
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [stage, inputText]);

  // Floating animation for example blobs
  useEffect(() => {
    if (stage === 'dump' && thoughts.length === 0) {
      const startExampleFloat = (blob: typeof exampleBlobs[0]) => {
        const createFloat = () => {
          const randomX = (Math.random() - 0.5) * 15; // Smaller movement for small blobs
          const randomY = (Math.random() - 0.5) * 15;

          Animated.sequence([
            Animated.timing(blob.translateX, {
              toValue: randomX,
              duration: 2000 + Math.random() * 1000,
              useNativeDriver: false,
              easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(blob.translateX, {
              toValue: -randomX,
              duration: 2000 + Math.random() * 1000,
              useNativeDriver: false,
              easing: Easing.inOut(Easing.ease),
            }),
          ]).start(() => {
            if (stage === 'dump' && thoughts.length === 0) {
              createFloat();
            }
          });

          Animated.sequence([
            Animated.timing(blob.translateY, {
              toValue: randomY,
              duration: 2500 + Math.random() * 1000,
              useNativeDriver: false,
              easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(blob.translateY, {
              toValue: -randomY,
              duration: 2500 + Math.random() * 1000,
              useNativeDriver: false,
              easing: Easing.inOut(Easing.ease),
            }),
          ]).start();
        };
        createFloat();
      };

      exampleBlobs.forEach(startExampleFloat);
    } else {
      // Stop animations when user starts adding thoughts
      exampleBlobs.forEach(blob => {
        blob.translateX.stopAnimation();
        blob.translateY.stopAnimation();
        blob.translateX.setValue(0);
        blob.translateY.setValue(0);
      });
    }
  }, [stage, thoughts.length]);

  const renderExampleBlob = (blob: typeof exampleBlobs[0], index: number) => {
    const blobColor = bubbleColors[index % bubbleColors.length];
    const blobShape = generateBlobShape(index, 120); // Increased size for example blobs to fit text
    const rotation = (index % 7) * 3 - 9;

    return (
      <Animated.View
        key={blob.id}
        style={[
          styles.exampleBubble,
          blobShape,
          {
            left: blob.x,
            top: blob.y,
            backgroundColor: blobColor,
            transform: [
              { translateX: blob.translateX },
              { translateY: blob.translateY },
              { rotate: `${rotation}deg` },
            ],
          },
        ]}
      >
        <Text style={styles.exampleBubbleText} numberOfLines={2}>
          {blob.text}
        </Text>
      </Animated.View>
    );
  };

  const renderBubble = (thought: Thought, index: number) => {
    const isCurrentSorting = stage === 'sort' && index === currentSortIndex;
    
    // Always use original color - never change color based on category
    const bubbleColor = thought.originalColor || bubbleColors[index % bubbleColors.length];

    // Generate organic blob shape with randomized border-radius values
    const blobShape = generateBlobShape(index);
    
    // Add slight rotation for organic blob feel
    const rotation = (index % 7) * 3 - 9; // -9 to +9 degrees rotation

    // For sorting stage, center the current bubble
    const bubbleStyle = isCurrentSorting ? {
      transform: [
        { translateX: 0 }, // Already centered via left positioning
        { translateY: sortingBlobFloatY }, // Only floating animation
        { scale: 1.2 },
        { rotate: `${rotation}deg` },
      ],
    } : {
      transform: [
        { translateX: thought.translateX },
        { translateY: thought.translateY },
        { scale: thought.scale },
        { rotate: `${rotation}deg` },
      ],
    };

    return (
      <Animated.View
        key={thought.id}
        style={[
          styles.bubble,
          blobShape,
          {
            left: isCurrentSorting ? width / 2 - 75 : thought.x, // Center horizontally when sorting
            top: isCurrentSorting ? height * 0.105 : thought.y, // Position 30% up when sorting
            backgroundColor: bubbleColor,
            ...bubbleStyle,
            opacity: thought.opacity,
          },
        ]}
      >
        <Text style={styles.bubbleText} numberOfLines={3}>
          {thought.text}
        </Text>
      </Animated.View>
    );
  };

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <LinearGradient
          colors={['#F8F9FA', '#E8ECF1', '#F0F4F8']}
          style={styles.background}
        >
        {/* Stage 1: Brain Dump */}
        {stage === 'dump' && (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View style={[styles.stageContainer, { opacity: stageTransitionOpacity }]}>
              <View style={styles.headingContainer}>
                <Text style={styles.prompt}>{t('clarityMap.heading')}</Text>
                <Text style={styles.subheading}>{t('clarityMap.subheading')}</Text>
              </View>

              {/* Example blobs - only show when no thoughts have been added */}
              {thoughts.length === 0 && (
                <View style={styles.exampleBlobsContainer}>
                  {exampleBlobs.map((blob, index) => renderExampleBlob(blob, index))}
                </View>
              )}
                
              {/* Need inspiration button - only show when no thoughts added */}
              {thoughts.length === 0 && (
                <View style={styles.inspirationContainerAbove}>
                  <TouchableOpacity 
                    style={styles.inspirationButton}
                    onPress={() => setShowInspirationModal(true)}
                    activeOpacity={0.8}
                  >
                    <Image 
                      source={require('../assets/images/star.icon.png')}
                      style={styles.inspirationStarIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.inspirationButtonText}>{t('clarityMap.needInspiration')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputContainer}>
                <LinearGradient
                  colors={['#fffffe', '#e6e6e6', '#f6fdff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.answerField}
                >
                  <TextInput
                    ref={inputRef}
                    style={styles.answerInput}
                    value={inputText}
                    onChangeText={(text) => {
                      console.log('onChangeText:', text);
                      setInputText(text);
                      resetInactivityTimer();
                    }}
                    onSubmitEditing={handleSubmit}
                    blurOnSubmit={false}
                    placeholder={placeholderExamples[placeholderIndex]}
                    placeholderTextColor="#999"
                    multiline
                    autoFocus
                  />
                </LinearGradient>
                <TouchableOpacity 
                  style={[
                    styles.submitButton,
                    (!inputText || inputText.trim().length === 0) && styles.submitButtonDisabled
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    console.log('Button pressed! inputText:', inputText, 'trimmed length:', inputText?.trim().length);
                    if (inputText && inputText.trim().length > 0) {
                      handleSubmit();
                    } else {
                      console.log('Button press ignored - no text');
                    }
                  }}
                  activeOpacity={0.8}
                  disabled={!inputText || inputText.trim().length === 0}
                >
                  <Text style={[
                    styles.submitButtonText,
                    (!inputText || inputText.trim().length === 0) && styles.submitButtonTextDisabled
                  ]}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Bubbles container positioned below answer field */}
              <View style={styles.dumpBubblesContainer}>
                {thoughts.map((thought, index) => renderBubble(thought, index))}
              </View>

              {/* Continue button - always visible when there's at least one blob */}
              {thoughts.length > 0 && (
                <View style={styles.continueButtonContainer}>
                  <TouchableOpacity style={styles.continueButton} onPress={handleContinueToSort}>
                    <Text style={styles.continueButtonText}>{t('clarityMap.continue')}</Text>
                  </TouchableOpacity>
                </View>
              )}

            </Animated.View>
          </TouchableWithoutFeedback>
        )}

        {/* Stage 2: Sorting - One bubble at a time */}
        {stage === 'sort' && currentSortIndex < thoughts.length && (
          <Animated.View style={[styles.stageContainer, { opacity: stageTransitionOpacity }]}>
            {/* Back button */}
            <TouchableOpacity style={styles.backButton} onPress={handleBackToDump}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            {/* Heading */}
            <View style={styles.sortHeadingContainer}>
              <Text style={styles.sortHeading}>{t('clarityMap.sortHeading')}</Text>
            </View>

            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {currentSortIndex + 1} of {thoughts.length} sorted
              </Text>
            </View>

            {/* Current bubble - centered */}
            <View style={styles.centeredBubbleContainer}>
              {renderBubble(thoughts[currentSortIndex], currentSortIndex)}
                  </View>

            {/* Category cards - vertical stack */}
            <View style={styles.categoryCardsContainer}>
                      <Animated.View style={{ transform: [{ scale: selectedCategoryScale['important'] || 1 }] }}>
                        <TouchableOpacity
                  style={[styles.categoryCard, { borderColor: '#ad6957' }]}
                  onPress={() => handleCategorySelect('important')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.categoryCardEmoji}>🤎</Text>
                  <Text style={styles.categoryCardHeading}>{t('clarityMap.categoryImportantHeading')}</Text>
                  <Text style={styles.categoryCardSubheading}>{t('clarityMap.categoryImportantSubheading')}</Text>
                        </TouchableOpacity>
                      </Animated.View>

                      <Animated.View style={{ transform: [{ scale: selectedCategoryScale['unclear'] || 1 }], marginTop: 12 }}>
                        <TouchableOpacity
                  style={[styles.categoryCard, { borderColor: '#95a489' }]}
                  onPress={() => handleCategorySelect('unclear')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.categoryCardEmoji}>🔍</Text>
                  <Text style={styles.categoryCardHeading}>{t('clarityMap.categoryUnclearHeading')}</Text>
                  <Text style={styles.categoryCardSubheading}>{t('clarityMap.categoryUnclearSubheading')}</Text>
                        </TouchableOpacity>
                      </Animated.View>

                <Animated.View style={{ transform: [{ scale: selectedCategoryScale['not_important'] || 1 }], marginTop: 12 }}>
                  <TouchableOpacity
                style={[styles.categoryCard, { borderColor: '#628499' }]}
                onPress={() => handleCategorySelect('not_important')}
                  activeOpacity={0.8}
                >
                <Text style={styles.categoryCardEmoji}>🕊️</Text>
                <Text style={styles.categoryCardHeading}>{t('clarityMap.categoryNotImportantHeading')}</Text>
                <Text style={styles.categoryCardSubheading}>{t('clarityMap.categoryNotImportantSubheading')}</Text>
                </TouchableOpacity>
                </Animated.View>
            </View>
          </Animated.View>
        )}

        {/* Stage 3: Confirmation - Show categorized bubbles */}
        {stage === 'confirm' && (
          <Animated.View style={[styles.stageContainer, { opacity: stageTransitionOpacity }]}>
            {/* Back button */}
            <TouchableOpacity style={styles.backButton} onPress={handleBackToSort}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            {/* Heading */}
            <View style={styles.confirmHeadingContainer}>
              <Text style={styles.confirmHeading}>{t('clarityMap.confirmHeading')}</Text>
              <Text style={styles.confirmSubheading}>{t('clarityMap.confirmSubheading')}</Text>
            </View>

            {/* Categorized bubbles grouped by category */}
            <ScrollView 
              style={styles.confirmScrollView}
              contentContainerStyle={styles.confirmContent}
              showsVerticalScrollIndicator={true}
            >
              {/* Urgent in My Heart */}
              {thoughts.filter(t => t.category === 'important').length > 0 && (
                <View style={styles.categoryGroup}>
                  <View style={styles.categoryGroupHeader}>
                    <Text style={styles.categoryGroupEmoji}>🤎</Text>
                    <Text style={styles.categoryGroupTitle}>{t('clarityMap.categoryImportantHeading')}</Text>
                  </View>
                  <View style={styles.categoryBubblesContainer}>
                    {thoughts
                      .filter(t => t.category === 'important')
                      .map((thought, index) => (
                        <View key={thought.id} style={styles.confirmBubbleCardWrapper}>
                          <TouchableOpacity
                            style={styles.confirmBubbleCard}
                            onPress={() => {
                              // Find the index of this thought and go back to sort at that index
                              const thoughtIndex = thoughts.findIndex(t => t.id === thought.id);
                              handleBackToSort(thoughtIndex);
                            }}
                          >
                            <Text style={styles.confirmBubbleText}>{thought.text}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.editBubbleButton}
                            onPress={() => {
                              const thoughtIndex = thoughts.findIndex(t => t.id === thought.id);
                              handleBackToSort(thoughtIndex);
                            }}
                          >
                            <Text style={styles.editBubbleButtonText}>✎</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                  </View>
                </View>
              )}

              {/* Explore This */}
              {thoughts.filter(t => t.category === 'unclear').length > 0 && (
                <View style={styles.categoryGroup}>
                  <View style={styles.categoryGroupHeader}>
                    <Text style={styles.categoryGroupEmoji}>🔍</Text>
                    <Text style={styles.categoryGroupTitle}>{t('clarityMap.categoryUnclearHeading')}</Text>
                  </View>
                  <View style={styles.categoryBubblesContainer}>
                    {thoughts
                      .filter(t => t.category === 'unclear')
                      .map((thought, index) => (
                        <View key={thought.id} style={styles.confirmBubbleCardWrapper}>
                          <TouchableOpacity
                            style={styles.confirmBubbleCard}
                            onPress={() => {
                              const thoughtIndex = thoughts.findIndex(t => t.id === thought.id);
                              setCurrentSortIndex(thoughtIndex);
                              handleBackToSort();
                            }}
                          >
                            <Text style={styles.confirmBubbleText}>{thought.text}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.editBubbleButton}
                            onPress={() => {
                              const thoughtIndex = thoughts.findIndex(t => t.id === thought.id);
                              setCurrentSortIndex(thoughtIndex);
                              handleBackToSort();
                            }}
                          >
                            <Text style={styles.editBubbleButtonText}>✎</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                  </View>
                </View>
              )}

              {/* Can Let Go For Now */}
              {thoughts.filter(t => t.category === 'not_important').length > 0 && (
                <View style={styles.categoryGroup}>
                  <View style={styles.categoryGroupHeader}>
                    <Text style={styles.categoryGroupEmoji}>🕊️</Text>
                    <Text style={styles.categoryGroupTitle}>{t('clarityMap.categoryNotImportantHeading')}</Text>
                  </View>
                  <View style={styles.categoryBubblesContainer}>
                    {thoughts
                      .filter(t => t.category === 'not_important')
                      .map((thought, index) => (
                        <View key={thought.id} style={styles.confirmBubbleCardWrapper}>
                          <TouchableOpacity
                            style={styles.confirmBubbleCard}
                            onPress={() => {
                              const thoughtIndex = thoughts.findIndex(t => t.id === thought.id);
                              setCurrentSortIndex(thoughtIndex);
                              handleBackToSort();
                            }}
                          >
                            <Text style={styles.confirmBubbleText}>{thought.text}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.editBubbleButton}
                            onPress={() => {
                              const thoughtIndex = thoughts.findIndex(t => t.id === thought.id);
                              setCurrentSortIndex(thoughtIndex);
                              handleBackToSort();
                            }}
                          >
                            <Text style={styles.editBubbleButtonText}>✎</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Continue button */}
            <View style={styles.confirmButtonsContainer}>
              <TouchableOpacity 
                style={styles.confirmContinueButton}
                onPress={handleConfirmContinue}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmContinueButtonText}>{t('clarityMap.continue')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Stage 4: Visualization */}
        {stage === 'visualize' && (
          <Animated.View style={[styles.stageContainer, { opacity: stageTransitionOpacity }]}>
            <View style={styles.bubblesContainer}>
              {thoughts.map((thought, index) => renderBubble(thought, index))}
            </View>
          </Animated.View>
        )}

        {/* Stage 4: Insight */}
        {stage === 'insight' && (
          <Animated.View style={[styles.stageContainer, { opacity: stageTransitionOpacity }]}>
            {/* Back button */}
            <TouchableOpacity style={styles.backButton} onPress={handleClose}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            <View style={styles.insightBubblesContainer}>
              {thoughts.map((thought, index) => renderBubble(thought, index))}
            </View>
            
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.insightContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {isGeneratingSummary ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#342846" />
                  <Text style={styles.loadingText}>{t('clarityMap.generatingInsight')}</Text>
                </View>
              ) : aiInsight ? (
                <View style={styles.insightWrapper}>
                  <Text style={styles.insightTitle}>{t('clarityMap.yourClarityInsight')}</Text>
                  <View style={styles.insightContainer}>
                    {/* Parse and render insight text with styled headings */}
                    {aiInsight.split('\n').map((line, index) => {
                      const trimmedLine = line.trim();
                      // Check if line is a section heading (no punctuation at end, shorter text)
                      const isHeading = trimmedLine.length > 0 && 
                        trimmedLine.length < 50 && 
                        !trimmedLine.endsWith('.') && 
                        !trimmedLine.endsWith(',') &&
                        !trimmedLine.endsWith('!') &&
                        !trimmedLine.endsWith('?') &&
                        !trimmedLine.startsWith('-') &&
                        !trimmedLine.startsWith('•') &&
                        (trimmedLine.includes('Acknowledgment') ||
                         trimmedLine.includes('Energy') ||
                         trimmedLine.includes('Space') ||
                         trimmedLine.includes('Let Go') ||
                         trimmedLine.includes('Momentum') ||
                         trimmedLine.includes('Empathetic') ||
                         trimmedLine.includes('What Deserves') ||
                         trimmedLine.includes('What Needs') ||
                         trimmedLine.includes('What to') ||
                         trimmedLine.includes('Forward'));
                      
                      if (trimmedLine.length === 0) {
                        return <View key={index} style={{ height: 12 }} />;
                      }
                      
                      if (isHeading) {
                        return (
                          <Text key={index} style={styles.insightSectionHeading}>
                            {trimmedLine}
                          </Text>
                        );
                      }
                      
                      return (
                        <Text key={index} style={styles.insightText}>
                          {trimmedLine}
                        </Text>
                      );
                    })}

                    <View style={styles.insightButtons}>
                    <TouchableOpacity 
                      style={styles.insightButton} 
                      onPress={handleSaveInsight}
                      disabled={isInsightSaved}
                    >
                      <Text style={styles.insightButtonText}>
                        {isInsightSaved ? t('clarityMap.insightIsSaved') : t('clarityMap.saveThisInsight')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.insightButton, styles.insightButtonSecondary]} onPress={handleTurnIntoPath}>
                      <Text style={styles.insightButtonTextSecondary}>Turn into a Path</Text>
                    </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : null}
            </ScrollView>
            
          </Animated.View>
        )}

        {/* Saved Popup Modal */}
        <Modal
          visible={showSavedPopup}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSavedPopup(false)}
        >
          <View style={styles.savedPopupModalOverlay}>
            <View style={styles.savedPopup}>
              <Text style={styles.savedPopupText}>{t('clarityMap.findInMeSection')}</Text>
            </View>
          </View>
        </Modal>

        {/* Goal Created Popup Modal */}
        <Modal
          visible={showGoalCreatedPopup}
          transparent={true}
          animationType="fade"
          onRequestClose={handleGoalCreatedClose}
        >
          <View style={styles.goalCreatedModalOverlay}>
            <View style={styles.goalCreatedPopup}>
              <Text style={styles.goalCreatedHeading}>
                {createdGoalData?.isQueued ? 'Goal Added to Queue' : 'Goal Created!'}
              </Text>
              <Text style={styles.goalCreatedBody}>
                {createdGoalData?.isQueued 
                  ? `Your goal "${createdGoalData?.name}" has been added to queue. You can have up to 3 active goals at once.`
                  : `Your goal "${createdGoalData?.name}" has been created with ${createdGoalData?.steps} steps. Estimated duration: ${createdGoalData?.duration}.`
                }
              </Text>
              <TouchableOpacity 
                style={styles.goalCreatedButton}
                onPress={handleGoalCreatedClose}
                activeOpacity={0.8}
              >
                <Text style={styles.goalCreatedButtonText}>{t('clarityMap.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Goal Generation Loading Modal */}
        <Modal
          visible={isGeneratingGoal}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.goalCreatedModalOverlay}>
            <View style={styles.goalCreatedPopup}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.goalCreatedBody}>{t('clarityMap.creatingGoal')}</Text>
            </View>
          </View>
        </Modal>

        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Inspiration Modal */}
      <Modal
        visible={showInspirationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInspirationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.inspirationCard}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowInspirationModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.inspirationCardHeading}>{t('clarityMap.inspirationModalHeading')}</Text>
            <Text style={styles.inspirationCardBody}>
              {t('clarityMap.inspirationModalBody')}
            </Text>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  background: {
    flex: 1,
  },
  stageContainer: {
    flex: 1,
    paddingTop: 100, // Reduced to move content up
    paddingHorizontal: 20,
    overflow: 'visible',
  },
  headingContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingHorizontal: 20,
  },
  prompt: {
    ...HeadingStyle,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 12,
    color: '#342846',
  },
  subheading: {
    ...BodyStyle,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    paddingHorizontal: 20,
  },
  sortHeadingContainer: {
    alignItems: 'center',
    marginTop: 50, // Increased to ensure it's below the back button
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  sortHeading: {
    ...HeadingStyle,
    fontSize: 18,
    color: '#342846',
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  progressText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
  },
  centeredBubbleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: height * 0.105, // Reduced by 30% (0.15 * 0.7 = 0.105)
    marginBottom: 0, // Positioned above the cards
  },
  categoryCardsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 101, // Moved down by additional 40% (increased from 72 to 101, 72 * 1.4 = 100.8)
    gap: 12,
    flex: 1,
    justifyContent: 'flex-start',
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  categoryCardEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  categoryCardHeading: {
    ...HeadingStyle,
    fontSize: 15,
    color: '#342846',
    marginBottom: 4,
    textAlign: 'center',
  },
  categoryCardSubheading: {
    ...BodyStyle,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  inspirationContainerAbove: {
    position: 'absolute',
    top: 390, // Position right after subheading
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 16,
  },
  inputContainer: {
    position: 'absolute',
    top: 450, // Position below subheading and example blobs area
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30, // Increased to ensure button is above TouchableWithoutFeedback
  },
  answerField: {
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 75,
    flex: 1,
  },
  answerInput: {
    ...BodyStyle,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#342846',
    fontSize: 16,
    minHeight: 75,
    maxHeight: 150,
  },
  submitButton: {
    backgroundColor: '#342846',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    marginBottom: 5,
    marginLeft: 10,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.5,
  },
  submitButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 24,
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
  dumpBubblesContainer: {
    position: 'absolute',
    top: 300, // Same position as exampleBlobsContainer, floating bubbles
    left: 0,
    right: 0,
    height: 150, // Same height as exampleBlobsContainer
    overflow: 'visible',
    zIndex: 10,
  },
  continueButtonContainer: {
    position: 'absolute',
    top: 545, // Position below answer field (450 + ~75 input height + ~20 spacing)
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  continueButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 999,
  },
  continueButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: '600',
  },
  readyToSortContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  readyToSortText: {
    ...BodyStyle,
    fontSize: 18,
    color: '#7F8C8D',
    marginBottom: 15,
  },
  bubblesContainer: {
    flex: 1,
    position: 'relative',
    minHeight: height * 0.3,
    maxHeight: height * 0.35,
    overflow: 'visible',
  },
  insightBubblesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
    overflow: 'visible',
    zIndex: 1,
  },
  exampleBlobsContainer: {
    position: 'absolute',
    top: 300, // Floating bubbles position
    left: 0,
    right: 0,
    height: 150,
    overflow: 'visible',
    zIndex: 5,
  },
  exampleBubble: {
    position: 'absolute',
    padding: 0,
    maxWidth: 140,
    minWidth: 110,
  },
  exampleBubbleText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 13,
    textAlign: 'center',
    paddingTop: 14, // Increased by 35% (from 10)
    paddingBottom: 14, // Increased by 35% (from 10)
    paddingLeft: 16, // Increased by 35% (from 12)
    paddingRight: 16, // Increased by 35% (from 12)
  },
  bubble: {
    position: 'absolute',
    padding: 0,
    maxWidth: 150,
    minWidth: 100,
  },
  bubbleText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    textAlign: 'center',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 100,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#342846',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
  },
  insightWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  insightContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    marginHorizontal: 12,
    marginTop: 0,
    marginBottom: 0,
    zIndex: 10,
    alignSelf: 'center',
    width: '100%',
  },
  insightContent: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    minHeight: height * 0.8,
  },
  insightTitle: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#342846',
    marginBottom: 20,
    textAlign: 'center',
  },
  insightSectionHeading: {
    ...HeadingStyle,
    fontSize: 18,
    color: '#342846',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  insightText: {
    ...BodyStyle,
    fontSize: 16,
    lineHeight: 24,
    color: '#342846',
    textAlign: 'left',
    marginBottom: 8,
    width: '100%',
  },
  insightButtons: {
    width: '100%',
    marginTop: 24,
  },
  insightButton: {
    backgroundColor: '#342846',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
    alignItems: 'center',
    marginVertical: 6,
  },
  insightButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
  },
  insightButtonTertiary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
  },
  insightButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  insightButtonTextSecondary: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#2C3E50',
    fontWeight: 'bold',
  },
  inspirationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  inspirationStarIcon: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  inspirationButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inspirationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalCloseButtonText: {
    fontSize: 20,
    color: '#2C3E50',
    fontWeight: 'bold',
  },
  inspirationCardHeading: {
    ...HeadingStyle,
    fontSize: 20,
    color: '#342846',
    marginBottom: 20,
    textAlign: 'center',
  },
  inspirationCardBody: {
    ...BodyStyle,
    fontSize: 16,
    color: '#34495E',
    lineHeight: 26,
  },
  confirmHeadingContainer: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  confirmHeading: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmSubheading: {
    ...BodyStyle,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  confirmScrollView: {
    flex: 1,
    marginTop: 20,
  },
  confirmContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  categoryGroup: {
    marginBottom: 30,
  },
  categoryGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingLeft: 10,
  },
  categoryGroupEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  categoryGroupTitle: {
    ...HeadingStyle,
    fontSize: 18,
    color: '#342846',
  },
  categoryBubblesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  confirmBubbleCardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  confirmBubbleCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    minWidth: 100,
    maxWidth: width * 0.45,
    flex: 1,
  },
  editBubbleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBubbleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBubbleText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#342846',
    textAlign: 'center',
  },
  confirmButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  editButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  editButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmContinueButton: {
    backgroundColor: '#342846',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
    alignItems: 'center',
    minWidth: 200,
  },
  confirmContinueButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  savedPopupModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 100,
  },
  savedPopup: {
    backgroundColor: '#342846',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10,
  },
  savedPopupText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  goalCreatedModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  goalCreatedPopup: {
    backgroundColor: '#342846',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  goalCreatedHeading: {
    ...HeadingStyle,
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  goalCreatedBody: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  goalCreatedButton: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minWidth: 120,
    alignItems: 'center',
  },
  goalCreatedButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: '600',
  },
});

