import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { hapticLight, hapticMedium } from '@/utils/haptics';
import { PledgeStepProps } from './types';
import { styles } from './styles';

const FIREWORK_COLORS = ['#ff7eb6', '#ffd166', '#7bdff2', '#b8f2e6', '#f9a8ff', '#7dd3fc'];
const FIREWORK_PARTICLE_ANGLES = Array.from({ length: 20 }, (_, index) => (Math.PI * 2 * index) / 20);

type FireworkBurst = {
  id: number;
  x: number;
  y: number;
  progress: Animated.Value;
  color: string;
};

function PledgeStep({ name, signature, setSignature, onNext }: PledgeStepProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const safeAreaInsets = useSafeAreaInsets();
  const isSmallPhone = height < 760;
  const isVerySmallPhone = height < 700;
  const isTablet = width >= 768;
  const [displayName, setDisplayName] = useState(name || '');
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [fireworkBursts, setFireworkBursts] = useState<FireworkBurst[]>([]);
  const currentPathRef = useRef('');
  const hasSignatureRef = useRef(false);
  const celebrationTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const triggerFireworkBurst = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const progress = new Animated.Value(0);
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

    setFireworkBursts((prev) => [...prev, { id, x, y, progress, color }]);

    Animated.timing(progress, {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setFireworkBursts((prev) => prev.filter((burst) => burst.id !== id));
    });
  }, []);

  const triggerCelebration = useCallback(() => {
    const centerX = width / 2;
    const centerY = height / 2;
    void hapticMedium();
    triggerFireworkBurst(centerX, centerY);

    const delayedBurst = setTimeout(() => {
      triggerFireworkBurst(
        centerX + (Math.random() > 0.5 ? 70 : -70),
        centerY + (Math.random() > 0.5 ? -50 : 50)
      );
    }, 140);
    celebrationTimeoutsRef.current.push(delayedBurst);
  }, [height, triggerFireworkBurst, width]);

  // Sync displayName with name prop immediately when it changes
  useEffect(() => {
    if (name && name.trim()) {
      setDisplayName(name.trim());
    }
  }, [name]);

  // Load name from AsyncStorage if prop is empty
  useEffect(() => {
    const loadName = async () => {
      // Only load from AsyncStorage if name prop is empty
      if (!name || !name.trim()) {
        try {
          const savedName = await AsyncStorage.getItem('userName');
          if (savedName && savedName.trim()) {
            setDisplayName(savedName.trim());
          }
        } catch (error) {
          // Error loading name - continue without saved name
        }
      }
    };
    loadName();
  }, [name]);
  
  // Also check AsyncStorage on component mount
  useEffect(() => {
    const checkAsyncStorage = async () => {
      if (!displayName || !displayName.trim()) {
        try {
          const savedName = await AsyncStorage.getItem('userName');
          if (savedName && savedName.trim()) {
            setDisplayName(savedName.trim());
          }
        } catch (error) {
          // Error loading name - continue without saved name
        }
      }
    };
    checkAsyncStorage();
  }, []);

  // Sync paths to parent signature in an effect to avoid setState-during-render
  useEffect(() => {
    const payload =
      paths.length > 0
        ? JSON.stringify({ type: 'rn-path-signature', version: 1, paths })
        : '';
    setSignature(payload);
    hasSignatureRef.current = paths.length > 0;
  }, [paths, setSignature]);

  useEffect(
    () => () => {
      celebrationTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    },
    []
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const nextPath = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          currentPathRef.current = nextPath;
          setCurrentPath(nextPath);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const nextPath = `${currentPathRef.current} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          currentPathRef.current = nextPath;
          setCurrentPath(nextPath);
        },
        onPanResponderRelease: () => {
          const finalizedPath = currentPathRef.current;
          if (finalizedPath.includes(' L ')) {
            const shouldCelebrate = !hasSignatureRef.current;
            hasSignatureRef.current = true;
            setPaths((prev) => [...prev, finalizedPath]);
            if (shouldCelebrate) {
              triggerCelebration();
            }
          }
          currentPathRef.current = '';
          setCurrentPath('');
        },
        onPanResponderTerminate: () => {
          currentPathRef.current = '';
          setCurrentPath('');
        },
      }),
    [triggerCelebration]
  );

  return (
    <View
      style={[
        styles.pledgeContainer,
        styles.pledgeContentContainer,
        {
          paddingHorizontal: isTablet ? 40 : isSmallPhone ? 20 : 30,
          paddingTop: isTablet ? 52 : isSmallPhone ? 12 : 25,
          paddingBottom: isSmallPhone ? 16 : 40,
        },
      ]}
    >
      <View
        style={[
          localStyles.contentContainer,
          { paddingBottom: (isSmallPhone ? 12 : 32) + safeAreaInsets.bottom },
        ]}
      >
        <Text
          style={[
            styles.pledgeTitle,
            isSmallPhone && localStyles.pledgeTitleSmall,
            isTablet && localStyles.pledgeTitleTablet,
          ]}
        >
          {t('onboarding.step3Title')}
        </Text>
        <View style={[styles.pledgeContent, isTablet && localStyles.pledgeContentTablet]}>
          <Text style={[styles.pledgeText, isSmallPhone && localStyles.pledgeTextSmall]}>
            {t('onboarding.pledgeText', {
              name: (name && name.trim())
                ? name.trim()
                : ((displayName && displayName.trim())
                    ? displayName.trim()
                    : t('onboarding.pledgeNamePlaceholder'))
            })}
          </Text>
          <Text style={[styles.pledgeSubtext, isSmallPhone && localStyles.pledgeSubtextSmall]}>
            {t('onboarding.pledgeSubtext')}
          </Text>
          
          {/* Signature Field */}
          <View
            style={[
              styles.signatureContainer,
              {
                marginTop: isSmallPhone ? 20 : 32,
              },
            ]}
          >
            <View
              style={[
                styles.signatureWrapper,
                localStyles.signaturePad,
                {
                  height: isVerySmallPhone ? 132 : isSmallPhone ? 152 : isTablet ? 180 : 212.5,
                  maxWidth: isTablet ? 480 : 495,
                },
              ]}
              pointerEvents="auto"
              {...panResponder.panHandlers}
            >
              {paths.length === 0 && !currentPath ? (
                <View pointerEvents="none" style={localStyles.placeholderWrap}>
                  <Text style={localStyles.placeholderText}>
                    {t('onboarding.signHere', { defaultValue: 'Sign here with your finger' })}
                  </Text>
                </View>
              ) : null}

              <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%" pointerEvents="none">
                {paths.map((pathD, index) => (
                  <Path
                    key={`path-${index}`}
                    d={pathD}
                    stroke="#342846"
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {currentPath ? (
                  <Path
                    d={currentPath}
                    stroke="#342846"
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </Svg>
            </View>
            <TouchableOpacity
              style={localStyles.clearButton}
              onPress={() => {
                void hapticLight();
                setPaths([]);
                setCurrentPath('');
                currentPathRef.current = '';
                hasSignatureRef.current = false;
                celebrationTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
                celebrationTimeoutsRef.current = [];
                setFireworkBursts([]);
                setSignature('');
              }}
            >
              <Text style={localStyles.clearButtonText}>{t('common.clear', { defaultValue: 'Clear' })}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step-local CTA avoids z-index/footer overlay conflicts on iOS. */}
        <View
          style={[
            localStyles.ctaContainer,
            {
              paddingHorizontal: isTablet ? 80 : isSmallPhone ? 20 : 40,
              paddingTop: isSmallPhone ? 12 : 24,
              paddingBottom: (isSmallPhone ? 8 : 24) + safeAreaInsets.bottom,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.continueButton, localStyles.iVowButton]}
            onPressIn={() => {
              void hapticMedium();
            }}
            onPress={() => {
              onNext();
            }}
          >
            <Text style={styles.continueButtonText}>{t('common.iVow')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {fireworkBursts.length > 0 ? (
        <View pointerEvents="none" style={localStyles.celebrationLayer}>
          {fireworkBursts.map((burst) => (
            <View
              key={burst.id}
              style={[
                localStyles.burstContainer,
                {
                  left: burst.x,
                  top: burst.y,
                },
              ]}
            >
              {FIREWORK_PARTICLE_ANGLES.map((angle, index) => {
                const distance = 60 + (index % 4) * 20;
                const translateX = burst.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, Math.cos(angle) * distance],
                });
                const translateY = burst.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, Math.sin(angle) * distance],
                });
                const scale = burst.progress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.4, 1.2, 0.7],
                });
                const opacity = burst.progress.interpolate({
                  inputRange: [0, 0.75, 1],
                  outputRange: [1, 0.95, 0],
                });

                return (
                  <Animated.View
                    key={`${burst.id}-${index}`}
                    style={[
                      localStyles.particle,
                      {
                        backgroundColor: burst.color,
                        opacity,
                        transform: [{ translateX }, { translateY }, { scale }],
                      },
                    ]}
                  />
                );
              })}
              <Animated.View
                style={[
                  localStyles.sparkCore,
                  {
                    backgroundColor: burst.color,
                    opacity: burst.progress.interpolate({
                      inputRange: [0, 0.2, 1],
                      outputRange: [0, 1, 0],
                    }),
                    transform: [
                      {
                        scale: burst.progress.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.25, 1.7, 0.2],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
          ))}
        </View>
      ) : null}

    </View>
  );
}

export default PledgeStep;

const localStyles = StyleSheet.create({
  signaturePad: {
    borderWidth: 1,
    borderColor: '#d6d0dd',
    zIndex: 5,
  },
  placeholderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#8e849b',
    fontSize: 14,
  },
  clearButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#342846',
    backgroundColor: '#fff',
  },
  clearButtonText: {
    color: '#342846',
    fontSize: 14,
  },
  ctaContainer: {
    paddingHorizontal: 40,
    paddingTop: 24,
    zIndex: 2,
  },
  contentContainer: {
    flexGrow: 1,
  },
  pledgeTitleSmall: {
    marginBottom: 16,
  },
  pledgeTitleTablet: {
    marginBottom: 20,
    fontSize: 32,
    lineHeight: 40,
  },
  pledgeContentTablet: {
    maxWidth: 520,
  },
  pledgeTextSmall: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  pledgeSubtextSmall: {
    fontSize: 14,
    lineHeight: 21,
  },
  iVowButton: {
    marginBottom: 0,
  },
  celebrationLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 1,
  },
  burstContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  particle: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 999,
    marginLeft: -4.5,
    marginTop: -4.5,
  },
  sparkCore: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 999,
    marginLeft: -11,
    marginTop: -11,
  },
});
