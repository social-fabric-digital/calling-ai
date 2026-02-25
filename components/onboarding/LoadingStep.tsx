import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Text, View, Animated, Easing, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { generateUnifiedDestinyProfile } from '@/utils/claudeApi';
import { LoadingStepProps } from './types';
import { styles } from './styles';

// ============================================
// Animated Circular Loader Component (No SVG)
// ============================================
interface LoaderProps {
  size?: number;
  strokeWidth?: number;
  isActive: boolean;
  isComplete: boolean;
  primaryColor?: string;
  accentColor?: string;
}

function AnimatedCircularLoader({
  size = 26,
  strokeWidth = 2.5,
  isActive,
  isComplete,
  primaryColor = '#342846',
  accentColor = '#bfacca',
}: LoaderProps) {
  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const checkmarkScaleAnim = useRef(new Animated.Value(0)).current;
  const completionScaleAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const sparkleAnims = useRef([...Array(6)].map(() => ({
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0),
    translate: new Animated.Value(0),
  }))).current;
  
  // Circle calculations
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Animation refs
  const rotationLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isActive && !isComplete) {
      // Start rotation
      rotationLoopRef.current = Animated.loop(
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotationLoopRef.current.start();
      
      // Start pulse
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();
      
      // Progress fills up
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
    
    return () => {
      rotationLoopRef.current?.stop();
      pulseLoopRef.current?.stop();
    };
  }, [isActive]);

  useEffect(() => {
    if (isComplete) {
      // Stop loops
      rotationLoopRef.current?.stop();
      pulseLoopRef.current?.stop();
      
      // Ensure progress is full
      progressAnim.setValue(1);
      
      // Pop animation
      Animated.sequence([
        Animated.spring(completionScaleAnim, {
          toValue: 1.3,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(completionScaleAnim, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Checkmark appears with bounce
      Animated.spring(checkmarkScaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 8,
        delay: 100,
        useNativeDriver: true,
      }).start();
      
      // Glow
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 500,
          delay: 150,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Sparkles burst outward
      sparkleAnims.forEach((anim, index) => {
        const delay = index * 25;
        Animated.parallel([
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim.scale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(anim.scale, {
              toValue: 0,
              duration: 350,
              delay: 80,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 400,
              delay: 80,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim.translate, {
              toValue: 1,
              duration: 450,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    }
  }, [isComplete]);
  
  // Interpolations
  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  // Sparkle positions (6 sparkles around the circle)
  const sparklePositions = [0, 60, 120, 180, 240, 300].map((angle) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad),
      y: Math.sin(rad),
    };
  });

  const containerSize = size + 20;
  const progressPercentage = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  return (
    <View style={[loaderStyles.container, { width: containerSize, height: containerSize }]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          loaderStyles.glow,
          {
            width: size + 14,
            height: size + 14,
            borderRadius: (size + 14) / 2,
            backgroundColor: isComplete ? '#4CAF50' : accentColor,
            opacity: glowOpacity,
          },
        ]}
      />
      
      {/* Sparkles */}
      {isComplete && sparklePositions.map((pos, index) => {
        const translateDistance = 16;
        return (
          <Animated.View
            key={index}
            style={[
              loaderStyles.sparkle,
              {
                opacity: sparkleAnims[index].opacity,
                transform: [
                  { scale: sparkleAnims[index].scale },
                  {
                    translateX: sparkleAnims[index].translate.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, pos.x * translateDistance],
                    }),
                  },
                  {
                    translateY: sparkleAnims[index].translate.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, pos.y * translateDistance],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[loaderStyles.sparkleInner, { backgroundColor: '#4CAF50' }]} />
          </Animated.View>
        );
      })}
      
      {/* Circular Progress using View with border */}
      <Animated.View
        style={{
          transform: [
            { scale: isComplete ? completionScaleAnim : pulseAnim },
            { rotate: isComplete ? '0deg' : rotation },
          ],
        }}
      >
        <View style={[loaderStyles.circleContainer, { width: size, height: size }]}>
          {/* Background circle */}
          <View
            style={[
              loaderStyles.circleBackground,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: 'rgba(52, 40, 70, 0.12)',
              },
            ]}
          />
          
          {/* Progress arc using a mask approach */}
          {!isComplete && (
            <Animated.View
              style={[
                loaderStyles.progressArc,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: strokeWidth,
                  borderColor: primaryColor,
                  borderRightColor: accentColor,
                  borderBottomColor: accentColor,
                  opacity: progressAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 0.7, 1],
                  }),
                },
              ]}
            />
          )}
          
          {/* Completed circle */}
          {isComplete && (
            <View
              style={[
                loaderStyles.circleBackground,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: strokeWidth,
                  borderColor: '#4CAF50',
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                },
              ]}
            />
          )}
          
          {/* Checkmark icon */}
          {isComplete && (
            <Animated.View
              style={[
                loaderStyles.checkmarkContainer,
                {
                  transform: [{ scale: checkmarkScaleAnim }],
                },
              ]}
            >
              <MaterialIcons name="check" size={size * 0.5} color="#4CAF50" />
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

// ============================================
// Loading Item Row Component
// ============================================
interface LoadingItemRowProps {
  text: string;
  isActive: boolean;
  isComplete: boolean;
}

function LoadingItemRow({ text, isActive, isComplete }: LoadingItemRowProps) {
  const textOpacity = useRef(new Animated.Value(0.4)).current;
  
  useEffect(() => {
    if (isActive) {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive]);

  return (
    <View style={loaderStyles.itemRow}>
      <AnimatedCircularLoader
        size={26}
        strokeWidth={2.5}
        isActive={isActive}
        isComplete={isComplete}
        primaryColor="#342846"
        accentColor="#bfacca"
      />
      <Animated.Text
        style={[
          loaderStyles.itemText,
          {
            opacity: textOpacity,
            fontWeight: isComplete ? '500' : '400',
          },
        ]}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

// ============================================
// Main Loading Step Component
// ============================================
function LoadingStep({ 
  onComplete, 
  isActive,
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
  fear,
  whatExcites,
  currentSituation,
  biggestConstraint,
  whatMattersMost,
}: LoadingStepProps) {
  const MIN_LOADING_SCREEN_MS = 3200;
  const LOADING_ITEM_TICK_MS = 1200;
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [apiCallComplete, setApiCallComplete] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [animationsComplete, setAnimationsComplete] = useState(false);
  const hasStartedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasTriggeredApiRef = useRef(false);
  const loadingStartTimeRef = useRef(0);
  
  // Deer entrance animation
  const deerScale = useRef(new Animated.Value(0.85)).current;
  const deerOpacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  const loadingItems = t('onboarding.loadingItems', { returnObjects: true }) as string[];
  const currentRunIdRef = useRef<string>('');

  const buildFallbackProfile = () => ({
    callingAwaits: {
      naturalGifts: [
        {
          name: t('onboarding.fallbackGiftCreativeName', { defaultValue: 'Creative expression' }),
          description: t('onboarding.fallbackGiftCreativeBody', {
            defaultValue: 'You naturally express ideas in ways that connect with people.',
          }),
        },
        {
          name: t('onboarding.fallbackGiftLeadershipName', { defaultValue: 'Bold leadership' }),
          description: t('onboarding.fallbackGiftLeadershipBody', {
            defaultValue: 'You can guide yourself and others through change with courage.',
          }),
        },
        {
          name: t('onboarding.fallbackGiftCommunicationName', { defaultValue: 'Clear communication' }),
          description: t('onboarding.fallbackGiftCommunicationBody', {
            defaultValue: 'You have a gift for turning complex thoughts into clear action.',
          }),
        },
        {
          name: t('onboarding.fallbackGiftMomentumName', { defaultValue: 'Project momentum' }),
          description: t('onboarding.fallbackGiftMomentumBody', {
            defaultValue: 'You can start meaningful work and keep moving it forward.',
          }),
        },
      ],
      ikigaiCircles: {
        whatYouLove: (whatYouLove || t('onboarding.whatYouLove', { defaultValue: 'What you love' })).split(' ').slice(0, 2).join(' '),
        whatYouGoodAt: (whatYouGoodAt || t('onboarding.whatYouGoodAt', { defaultValue: "What you're good at" })).split(' ').slice(0, 2).join(' '),
        whatWorldNeeds: (whatWorldNeeds || t('onboarding.whatWorldNeeds', { defaultValue: 'What the world needs' })).split(' ').slice(0, 2).join(' '),
        whatCanBePaidFor: (whatCanBePaidFor || t('onboarding.whatCanBePaidFor', { defaultValue: 'What can be paid for' })).split(' ').slice(0, 2).join(' '),
      },
      centerSummary: t('onboarding.fallbackCenterSummary', {
        defaultValue: 'A meaningful path built from your strengths, values, and next actions.',
      }),
    },
    paths: [
      {
        id: 1,
        title: t('onboarding.fallbackPath1Title', { defaultValue: 'Vision Builder' }),
        description: t('onboarding.fallbackPath1Body', {
          defaultValue: 'Turn your ideas into a clear, practical direction.',
        }),
        glowColor: '#cdbad8',
      },
      {
        id: 2,
        title: t('onboarding.fallbackPath2Title', { defaultValue: 'Growth Architect' }),
        description: t('onboarding.fallbackPath2Body', {
          defaultValue: 'Build skills and structure to move forward consistently.',
        }),
        glowColor: '#baccd7',
      },
      {
        id: 3,
        title: t('onboarding.fallbackPath3Title', { defaultValue: 'Purpose in Action' }),
        description: t('onboarding.fallbackPath3Body', {
          defaultValue: 'Focus on impact and steady progress in everyday life.',
        }),
        glowColor: '#a6a76c',
      },
    ],
  });

  const buildInputSignature = () => JSON.stringify({
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
    fear,
    whatExcites,
    currentSituation,
    biggestConstraint,
    whatMattersMost,
  });

  const startGenerationIfNeeded = async (runId?: string) => {
    if (hasTriggeredApiRef.current) return;

    const inputSignature = buildInputSignature();
    const [
      storedResponseSignature,
      storedCallingAwaits,
      storedPaths,
    ] = (await AsyncStorage.multiGet([
      'destinyProfile_responseSignature',
      'destinyProfile_callingAwaits',
      'destinyProfile_paths',
    ])).map(([, value]) => value);

    if (storedResponseSignature === inputSignature && storedCallingAwaits && storedPaths) {
      setApiCallComplete(true);
      return;
    }

    hasTriggeredApiRef.current = true;
    setApiError(null);
    setApiCallComplete(false);

    let requestId = '';
    try {
      requestId = Date.now().toString();
      if (runId) {
        currentRunIdRef.current = runId;
      }
      await AsyncStorage.multiSet([
        ['destinyProfile_requestId', requestId],
        ['destinyProfile_requestSignature', inputSignature],
        ['destinyProfile_apiCallStatus', 'in_progress'],
        ['destinyProfile_apiError', ''],
      ]);

      const profile = await generateUnifiedDestinyProfile(
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
        fear,
        whatExcites,
        currentSituation,
        biggestConstraint,
        whatMattersMost
      );

      await AsyncStorage.multiSet([
        ['destinyProfile_callingAwaits', JSON.stringify(profile.callingAwaits)],
        ['destinyProfile_paths', JSON.stringify(profile.paths)],
        ['destinyProfile_responseId', requestId],
        ['destinyProfile_responseSignature', inputSignature],
        ['destinyProfile_apiCallStatus', 'completed'],
      ]);

      setApiCallComplete(true);
    } catch (error: any) {
      const message = error?.message || 'Failed to generate your destiny profile. Please try again.';
      const isNetworkFailure =
        /network request failed|failed to fetch|fetch failed|timeout|aborted/i.test(message);

      if (isNetworkFailure) {
        // Do not block onboarding on transient network issues.
        const fallbackProfile = buildFallbackProfile();
        const responseId = requestId || Date.now().toString();
        await AsyncStorage.multiSet([
          ['destinyProfile_callingAwaits', JSON.stringify(fallbackProfile.callingAwaits)],
          ['destinyProfile_paths', JSON.stringify(fallbackProfile.paths)],
          ['destinyProfile_responseId', responseId],
          ['destinyProfile_responseSignature', inputSignature],
          ['destinyProfile_apiCallStatus', 'completed'],
          ['destinyProfile_apiError', ''],
        ]);
        setApiError(null);
        setApiCallComplete(true);
        return;
      }

      await AsyncStorage.setItem('destinyProfile_apiCallStatus', 'failed');
      await AsyncStorage.setItem('destinyProfile_apiError', message);
      await AsyncStorage.setItem('destinyProfile_responseId', requestId || Date.now().toString());
      setApiError(message);
    } finally {
      hasTriggeredApiRef.current = false;
    }
  };

  // Reset state and start polling when becoming active
  useEffect(() => {
    if (!isActive) {
      // Cleanup when becoming inactive
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Reset all state when becoming active
    setActiveIndex(-1);
    setCompletedItems(new Set());
    setApiCallComplete(false);
    setApiError(null);
    setAnimationsComplete(false);
    hasStartedRef.current = false;
    hasTriggeredApiRef.current = false;
    loadingStartTimeRef.current = Date.now();
    deerScale.setValue(0.85);
    deerOpacity.setValue(0);

    const runId = `${Date.now()}`;
    currentRunIdRef.current = runId;
    // Clear stale failed status from previous attempts before polling starts.
    AsyncStorage.multiSet([
      ['destinyProfile_apiCallStatus', 'queued'],
      ['destinyProfile_apiError', ''],
      ['destinyProfile_responseId', ''],
    ]).catch(() => {});

    startGenerationIfNeeded(runId);

    // Start polling for API completion after a short delay to ensure state is reset
    const startPollingTimer = setTimeout(() => {
      // Poll for API completion
      const pollForCompletion = async () => {
        try {
          const [status, requestId, responseId] = (await AsyncStorage.multiGet([
            'destinyProfile_apiCallStatus',
            'destinyProfile_requestId',
            'destinyProfile_responseId',
          ])).map(([, value]) => value);
          
          if (status === 'completed') {
            // Verify response data exists
            const callingAwaits = await AsyncStorage.getItem('destinyProfile_callingAwaits');
            const paths = await AsyncStorage.getItem('destinyProfile_paths');
            
            if (callingAwaits && paths) {
              setApiCallComplete(true);
              return true; // Stop polling
            }
          } else if (status === 'failed') {
            // Ignore stale failed status from earlier runs until current request settles.
            if (!requestId || !responseId || requestId !== responseId) {
              return false;
            }
            const errorMsg = await AsyncStorage.getItem('destinyProfile_apiError');
            setApiError(errorMsg || 'Failed to generate your destiny profile. Please try again.');
            return true; // Stop polling
          }
          
          return false; // Continue polling
        } catch {
          return false; // Continue polling
        }
      };

      // Check immediately first
      pollForCompletion().then(shouldStop => {
        if (!shouldStop) {
          // Start polling if not already complete
          pollIntervalRef.current = setInterval(async () => {
            const shouldStopNow = await pollForCompletion();
            if (shouldStopNow && pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }, 500);
        }
      });
    }, 100); // Small delay to ensure state is reset first

    // Cleanup
    return () => {
      clearTimeout(startPollingTimer);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isActive]);

  // Start visual loading animation with a fixed, step-by-step sequence.
  // This preserves the original experience even when API response is instant/cached.
  useEffect(() => {
    if (!isActive) {
      return;
    }

    // Small delay to ensure reset effect has completed
    const startAnimationsTimer = setTimeout(() => {
      if (hasStartedRef.current) {
        return;
      }
      hasStartedRef.current = true;
      
      // Animate deer entrance
      Animated.parallel([
        Animated.spring(deerScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(deerOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Clear any existing timers/intervals
      animationTimersRef.current.forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      animationTimersRef.current = [];
      
      // Start first item immediately
      setActiveIndex(0);
      setAnimationsComplete(false);
      setCompletedItems(new Set());

      loadingItems.forEach((_, index) => {
        const completeTimer = setTimeout(() => {
          setCompletedItems((prev) => {
            const next = new Set(prev);
            next.add(index);
            return next;
          });

          if (index < loadingItems.length - 1) {
            const nextActiveTimer = setTimeout(() => {
              setActiveIndex(index + 1);
            }, 250);
            animationTimersRef.current.push(nextActiveTimer);
          } else {
            setAnimationsComplete(true);
          }
        }, (index + 1) * LOADING_ITEM_TICK_MS);

        animationTimersRef.current.push(completeTimer);
      });
    }, 150); // Delay to ensure state reset is complete

    return () => {
      clearTimeout(startAnimationsTimer);
      animationTimersRef.current.forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      animationTimersRef.current = [];
    };
  }, [isActive, loadingItems.length]);

  // Proceed only when all bullets have completed in order AND API is done (so user can read loading text)
  useEffect(() => {
    if (!isActive) return;

    if (animationsComplete && apiCallComplete && !apiError) {
      const elapsedMs = Date.now() - loadingStartTimeRef.current;
      const remainingMs = Math.max(0, MIN_LOADING_SCREEN_MS - elapsedMs);
      const proceedTimer = setTimeout(() => {
        if (onCompleteRef.current) onCompleteRef.current();
      }, Math.max(500, remainingMs));
      return () => clearTimeout(proceedTimer);
    }
  }, [isActive, apiCallComplete, apiError, animationsComplete]);

  return (
    <View style={styles.loadingContainer}>
      <Text style={[styles.loadingTitle, isRussian && styles.loadingTitleRussian]}>
        {t('onboarding.step6Title')}
      </Text>
      
      <Animated.View
        style={{
          opacity: deerOpacity,
          transform: [{ scale: deerScale }],
        }}
      >
        <Image
          source={require('../../assets/images/applogo.png')}
          style={styles.deerFaceImage}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.loadingList}>
        {loadingItems.map((item, index) => (
          <LoadingItemRow
            key={index}
            text={item}
            isActive={activeIndex >= index}
            isComplete={completedItems.has(index)}
          />
        ))}
      </View>

      {/* Show error message if API call failed */}
      {apiError && (
        <View style={loaderStyles.errorContainer}>
          <Text style={loaderStyles.errorText}>{apiError}</Text>
          <Text style={loaderStyles.errorSubtext}>{t('common.networkErrorSubtext')}</Text>
        </View>
      )}

    </View>
  );
}

// ============================================
// Loader-specific Styles
// ============================================
const loaderStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
  },
  sparkle: {
    position: 'absolute',
    width: 6,
    height: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  circleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circleBackground: {
    position: 'absolute',
  },
  progressArc: {
    position: 'absolute',
  },
  checkmarkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  itemText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: '#342846',
    marginLeft: 12,
    flex: 1,
  },
  errorContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7D7',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: '#C53030',
    textAlign: 'center',
    marginBottom: 4,
  },
  errorSubtext: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 12,
    color: '#9B2C2C',
    textAlign: 'center',
  },
});

export default LoadingStep;
