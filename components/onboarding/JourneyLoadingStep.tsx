import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Text, View, Animated, Easing, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { JourneyLoadingStepProps } from './types';
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
      
      // Animate glow
      Animated.timing(glowOpacity, {
        toValue: 0.4,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      // Animate checkmark
      Animated.spring(checkmarkScaleAnim, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }).start();
      
      // Animate completion scale
      Animated.sequence([
        Animated.spring(completionScaleAnim, {
          toValue: 1.15,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(completionScaleAnim, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Animate sparkles
      sparkleAnims.forEach((anim, index) => {
        Animated.parallel([
          Animated.timing(anim.scale, {
            toValue: 1,
            duration: 300,
            delay: index * 50,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 300,
            delay: index * 50,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translate, {
            toValue: 1,
            duration: 400,
            delay: index * 50,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [isComplete]);

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
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
// Main Journey Loading Step Component
// ============================================
function JourneyLoadingStep({ onComplete, loadingItems }: JourneyLoadingStepProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const runIdRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const defaultLoadingItems = React.useMemo(
    () => [
      t('onboarding.loadingItems.analyzingStrengths', { defaultValue: 'Analyzing your strengths' }),
      t('onboarding.loadingItems.buildingPath', { defaultValue: 'Building your path to the goal' }),
      t('onboarding.loadingItems.preparingRoadmap', { defaultValue: 'Preparing your personalized roadmap' }),
      t('onboarding.loadingItems.gettingReady', { defaultValue: 'Getting your journey ready' }),
    ],
    [t]
  );
  const sanitizedLoadingItems = React.useMemo(
    () =>
      (Array.isArray(loadingItems) ? loadingItems : [])
        .map((item) => String(item ?? '').trim())
        .filter((item) => item.length > 0),
    [loadingItems]
  );
  const effectiveLoadingItems = sanitizedLoadingItems.length >= 2 ? sanitizedLoadingItems : defaultLoadingItems;
  const loadingSequenceKey = effectiveLoadingItems.join('|');
  
  // Deer entrance animation
  const deerScale = useRef(new Animated.Value(0.85)).current;
  const deerOpacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    runIdRef.current += 1;
    const currentRunId = runIdRef.current;
    setActiveIndex(-1);
    setCompletedItems(new Set());

    // Animate deer entrance
    deerScale.setValue(0.85);
    deerOpacity.setValue(0);
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

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      });

    const runSequence = async () => {
      if (effectiveLoadingItems.length === 0) {
        if (runIdRef.current === currentRunId && onCompleteRef.current) {
          onCompleteRef.current();
        }
        return;
      }

      for (let index = 0; index < effectiveLoadingItems.length; index += 1) {
        if (runIdRef.current !== currentRunId) return;
        setActiveIndex(index);
        await sleep(1300);
        if (runIdRef.current !== currentRunId) return;
        setCompletedItems((prev) => {
          const next = new Set(prev);
          next.add(index);
          return next;
        });
        await sleep(220);
      }

      await sleep(550);
      if (runIdRef.current === currentRunId && onCompleteRef.current) {
        onCompleteRef.current();
      }
    };

    void runSequence();

    return () => {
      runIdRef.current += 1;
    };
  }, [deerOpacity, deerScale, loadingSequenceKey]);

  return (
    <View style={styles.journeyLoadingContainer}>
      <Text style={styles.journeyLoadingTitle}>{t('onboarding.weAreCreatingYourJourney')}</Text>
      
      <Animated.View
        style={{
          opacity: deerOpacity,
          transform: [{ scale: deerScale }],
        }}
      >
        <Image
          source={require('../../assets/images/deer.face.png')}
          style={styles.journeyDeerImage}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.journeyLoadingList}>
        {effectiveLoadingItems.map((item, index) => (
          <LoadingItemRow
            key={index}
            text={item}
            isActive={activeIndex >= index}
            isComplete={completedItems.has(index)}
          />
        ))}
      </View>
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
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'center',
    marginBottom: 20,
    gap: 16,
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 16,
  },
  itemText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'left',
    flexShrink: 1,
  },
});

export default JourneyLoadingStep;
