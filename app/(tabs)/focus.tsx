import { FrostedCardLayer } from '@/components/FrostedCardLayer';
import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import { trackReflectionEvent } from '@/utils/appTracking';
import { hapticLight } from '@/utils/haptics';
import { maybePromptForLongFocusSessionReview } from '@/utils/storeReview';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { requireNativeModule } from 'expo-modules-core';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const isTabletLayout = Platform.OS === 'ios' && Platform.isPad;
const isNarrowScreen = width <= 430;
const isExpoGoClient = Constants.appOwnership === 'expo';

type TimerDuration = 5 | 15 | 30 | 60;

type AmbientTrackId = 'forest' | 'rain' | 'waves' | 'fire' | 'wind';
type AmbientSoundHandle = {
  stopAsync: () => Promise<void>;
  unloadAsync: () => Promise<void>;
  playAsync: () => Promise<void>;
};

const AMBIENT_ORDER: AmbientTrackId[] = ['forest', 'rain', 'waves', 'fire', 'wind'];

type IonIconName = ComponentProps<typeof Ionicons>['name'];

const AMBIENT_ICONS: Record<AmbientTrackId, IonIconName> = {
  forest: 'leaf-outline',
  rain: 'rainy-outline',
  waves: 'water-outline',
  fire: 'flame-outline',
  wind: 'cloud-outline',
};

const AMBIENT_SOURCES: Record<AmbientTrackId, number> = {
  forest: require('../../assets/audio/forest.mp3'),
  rain: require('../../assets/audio/rain.mp3'),
  waves: require('../../assets/audio/waves.mp3'),
  fire: require('../../assets/audio/fire.mp3'),
  wind: require('../../assets/audio/wind.mp3'),
};

type CloudPattern = {
  offsetMs: number;
  cycleMs: number;
  yPercent: number;
  width: number;
  height: number;
  opacity: number;
};

const CLOUD_PATTERNS: CloudPattern[] = [
  { offsetMs: 0, cycleMs: 72_000, yPercent: 18, width: 120, height: 44, opacity: 0.2 },
  { offsetMs: 24_000, cycleMs: 88_000, yPercent: 25, width: 150, height: 54, opacity: 0.18 },
  { offsetMs: 46_000, cycleMs: 96_000, yPercent: 32, width: 110, height: 40, opacity: 0.16 },
];

export default function FocusScreen() {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const focusSubtitlePrimary = isRussian
    ? 'Это место, где ты превращаешься в ясность и рост, и фокусируешься на своих целях.'
    : 'It is a place for you to transform into clarity and growth, while focusing on your goals.';
  const [selectedDuration, setSelectedDuration] = useState<TimerDuration | null>(null);
  const [preSelectedDuration, setPreSelectedDuration] = useState<TimerDuration | null>(null); // Duration selected but timer not started
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Tree data structure for 4-phase animation system
  type TreeState = 'small' | 'transforming' | 'mature' | 'hidden';
  
  interface Tree {
    id: string;
    angle: number; // Angle in degrees for circular positioning
    radius: number; // Distance from center
    state: TreeState;
    smallOpacity: Animated.Value;
    smallScale: Animated.Value;
    oneOpacity: Animated.Value;
    oneScale: Animated.Value;
    translateY: Animated.Value;
    rotation: Animated.Value;
    spawnTime: number; // When this tree should appear (percentage 0-1)
    transformTime: number; // When this tree should transform (percentage 0-1)
  }
  
  const [trees, setTrees] = useState<Tree[]>([]);
  const [showForest, setShowForest] = useState(false);
  const [showDeer, setShowDeer] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedTime, setCompletedTime] = useState<number>(0);
  const [showAtlasPopup, setShowAtlasPopup] = useState(false);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [showSeed, setShowSeed] = useState(false); // Show seed for first 8% of timer
  const [cloudTick, setCloudTick] = useState(0);
  const [showFocusGuideModal, setShowFocusGuideModal] = useState(false);
  const [ambientSoundsEnabled, setAmbientSoundsEnabled] = useState(true);
  const [selectedAmbientId, setSelectedAmbientId] = useState<AmbientTrackId>('forest');
  const nextTreeIdRef = useRef(1); // Track next tree ID for continuous spawning
  const lastSpawnTimeRef = useRef(0); // Track when last tree was spawned
  
  // Animation refs for forest and deer
  const forestOpacity = useRef(new Animated.Value(0)).current;
  const forestScale = useRef(new Animated.Value(0.9)).current;
  const deerOpacity = useRef(new Animated.Value(0)).current;
  const deerTranslateX = useRef(new Animated.Value(-width)).current;
  const deerScale = useRef(new Animated.Value(1)).current;
  const deerBreathScale = useRef(new Animated.Value(1)).current;
  
  // Animation refs for Atlas popup
  const atlasPopupTranslateX = useRef(new Animated.Value(width)).current;
  
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimeRef = useRef(0); // Track elapsed time in seconds
  const phaseRefs = useRef({
    phase1Complete: false,
    phase2Started: false,
    phase2Complete: false,
    phase3Started: false,
    phase4Started: false,
  }).current;

  const soundRef = useRef<AmbientSoundHandle | null>(null);
  const expoAudioRef = useRef<null | {
    setAudioModeAsync: (config: {
      playsInSilentModeIOS?: boolean;
      staysActiveInBackground?: boolean;
      shouldDuckAndroid?: boolean;
      playThroughEarpieceAndroid?: boolean;
    }) => Promise<void>;
    Sound: {
      createAsync: (
        source: number,
        initialStatus: { isLooping?: boolean; volume?: number }
      ) => Promise<{ sound: AmbientSoundHandle }>;
    };
  }>(null);
  const ambientUnavailableRef = useRef(false);
  const checkedNativeAvRef = useRef(false);

  const getExpoAudio = React.useCallback(async () => {
    if (expoAudioRef.current) return expoAudioRef.current;
    if (ambientUnavailableRef.current) return null;
    if (!checkedNativeAvRef.current) {
      checkedNativeAvRef.current = true;
      try {
        requireNativeModule('ExponentAV');
      } catch (error) {
        ambientUnavailableRef.current = true;
        setAmbientSoundsEnabled(false);
        console.warn('Focus ambient sound unavailable: native ExponentAV module missing.', error);
        return null;
      }
    }
    if (isExpoGoClient) {
      // Expo Go runtimes can miss `expo-av` native module (`ExponentAV`).
      ambientUnavailableRef.current = true;
      setAmbientSoundsEnabled(false);
      console.warn('Focus ambient sound is disabled in Expo Go runtime.');
      return null;
    }
    try {
      const mod = await import('expo-av');
      const audioModule = mod.Audio as unknown as NonNullable<typeof expoAudioRef.current>;
      expoAudioRef.current = audioModule;
      return expoAudioRef.current;
    } catch (error) {
      ambientUnavailableRef.current = true;
      setAmbientSoundsEnabled(false);
      console.warn('Focus ambient sound unavailable in this client:', error);
      return null;
    }
  }, []);

  const unloadAmbientSound = React.useCallback(async () => {
    const s = soundRef.current;
    soundRef.current = null;
    if (!s) return;
    try {
      await s.stopAsync();
    } catch {
      /* ignore */
    }
    try {
      await s.unloadAsync();
    } catch {
      /* ignore */
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      trackReflectionEvent('focus_sanctuary_opened').catch((error) => {
        console.error('Error tracking focus sanctuary open:', error);
      });
      return () => {
        void unloadAmbientSound();
      };
    }, [unloadAmbientSound])
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCloudTick((value) => value + 1);
    }, 120);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const pairs = await AsyncStorage.multiGet(['focusAmbientEnabled', 'focusAmbientTrackId']);
        const map = Object.fromEntries(pairs) as Record<string, string | null>;
        if (!alive) return;
        if (map.focusAmbientEnabled === 'false') setAmbientSoundsEnabled(false);
        const id = map.focusAmbientTrackId;
        if (id && AMBIENT_ORDER.includes(id as AmbientTrackId)) {
          setSelectedAmbientId(id as AmbientTrackId);
          // If user previously picked a sound, keep ambient toggle ON by default.
          setAmbientSoundsEnabled(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem('focusAmbientEnabled', ambientSoundsEnabled ? 'true' : 'false');
  }, [ambientSoundsEnabled]);

  useEffect(() => {
    void AsyncStorage.setItem('focusAmbientTrackId', selectedAmbientId);
  }, [selectedAmbientId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const shouldPlay = isRunning && !isPaused && ambientSoundsEnabled;
      if (!shouldPlay) {
        await unloadAmbientSound();
        return;
      }
      await unloadAmbientSound();
      if (cancelled) return;
      const ExpoAudio = await getExpoAudio();
      if (!ExpoAudio) return;
      try {
        await ExpoAudio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch {
        /* ignore */
      }
      try {
        const { sound } = await ExpoAudio.Sound.createAsync(AMBIENT_SOURCES[selectedAmbientId], {
          isLooping: true,
          volume: 0.4,
        });
        if (cancelled) {
          await sound.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = sound;
        await sound.playAsync();
      } catch (e) {
        console.warn('Focus ambient sound failed:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isRunning, isPaused, ambientSoundsEnabled, selectedAmbientId, unloadAmbientSound, getExpoAudio]);

  // Calculate center Y position - trees must be within 20px below heading and 20px above timer
  // Trees are positioned absolutely within treeContainer, which is flex: 1 between heading and timer
  const getCenterTreeY = () => {
    // Heading: marginTop: 64, fontSize: 36, approximate lineHeight: ~45
    // Heading bottom = 64 + 45 = 109px from container top
    // Add 20px margin below heading
    const headingBottom = 64 + 45 + 20; // ~129px from container top (treeContainer starts after heading)
    
    // treeContainer is flex: 1, so it takes up space between heading and timer
    // Timer has marginBottom: 20, minHeight: 80
    // We need to calculate where timer would be relative to treeContainer
    // Since treeContainer is flex: 1, it fills available space, and timer is below it
    // For absolute positioning within treeContainer, we calculate relative to treeContainer's bounds
    
    // Get treeContainer height - it's flex: 1, so it fills space between heading and timer
    // Container has paddingTop: 60, paddingBottom: 100
    // Heading takes ~109px from top
    // Timer takes ~100px from bottom (marginBottom: 20 + minHeight: 80)
    // treeContainer height ≈ height - 60 (paddingTop) - 109 (heading) - 100 (timer area) - 100 (paddingBottom)
    // Actually simpler: treeContainer is flex:1, so it's the middle section
    
    // For centering: use the middle of the treeContainer
    // Since trees are absolutely positioned, we need to calculate relative to treeContainer
    // The treeContainer starts after heading (~109px from container top, ~169px from screen top)
    // And ends before timer
    
    // Calculate available height for treeContainer
    // Container total height = height
    // Container paddingTop = 60
    // Heading height = 64 + 45 = 109
    // Container paddingBottom = 100  
    // Timer area = 20 (marginBottom) + 80 (minHeight) = 100
    // treeContainer available height = height - 60 - 109 - 100 - 100 = height - 369
    
    // But actually, since treeContainer is flex: 1, it automatically fills the space
    // For absolute positioning within treeContainer, we use percentages or calculate based on container
    
    // Center the trees in the middle of the screen vertically
    // Screen center = height / 2
    // But we need to account for heading and timer
    // Better: center between heading bottom (with 20px margin) and timer top (with 20px margin)
    
    // Heading bottom from screen top: 60 (paddingTop) + 64 + 45 = 169
    // Heading bottom with margin: 169 + 20 = 189
    
    // Timer: container paddingBottom: 100, timer marginBottom: 20, timer height: 80
    // Timer top from screen bottom: 100 + 20 + 80 = 200
    // Timer top from screen top: height - 200
    // Timer top with margin: height - 200 - 20 = height - 220
    
    const headingBottomFromScreen = 60 + 64 + 45 + 20; // 189px from screen top
    const timerTopFromScreen = height - 100 - 20 - 80 - 20; // height - 220 (20px margin above timer)
    
    // Center point between heading and timer
    const centerY = (headingBottomFromScreen + timerTopFromScreen) / 2;
    
    // But trees are positioned absolutely within treeContainer
    // treeContainer starts at: 60 (paddingTop) + 109 (heading) = 169px from screen top
    // So centerY relative to treeContainer = centerY - 169
    
    const treeContainerTop = 60 + 64 + 45; // 169px from screen top (heading bottom)
    const centerTreeYRelativeToContainer = centerY - treeContainerTop;
    
    return centerTreeYRelativeToContainer;
  };

  // Create a new tree dynamically
  const createNewTree = (spawnTime: number, angle: number, radius: number): Tree => {
    const TRANSFORM_DELAY = 10; // seconds after spawn to transform
    const treeId = nextTreeIdRef.current;
    nextTreeIdRef.current += 1;
    return {
      id: `tree-${treeId}`,
      angle,
      radius,
      state: 'hidden',
      smallOpacity: new Animated.Value(0),
      smallScale: new Animated.Value(0),
      oneOpacity: new Animated.Value(0),
      oneScale: new Animated.Value(1),
      translateY: new Animated.Value(0),
      rotation: new Animated.Value((Math.random() - 0.5) * 10), // -5° to +5° variation
      spawnTime,
      transformTime: spawnTime + TRANSFORM_DELAY,
    };
  };

  // Initialize trees when timer starts
  const initializeTrees = (duration: number) => {
    const centerX = width / 2;
    // Position center tree perfectly centered between heading and timer
    const centerY = getCenterTreeY();
    // Use larger radius to spread trees around screen
    const maxRadius = Math.min(width * 0.35, (height - 200) * 0.25);
    const radius = maxRadius; // Spread trees wider across the screen
    
    // Trees start appearing after 10 seconds (time-based, not percentage-based)
    const TREE_START_TIME = 10; // seconds
    const TRANSFORM_DELAY = 10; // seconds after spawn to transform
    
    // Create center tree (Phase 1) - spawns at 10 seconds
    const centerTree: Tree = {
      id: 'center',
      angle: 0,
      radius: 0,
      state: 'small',
      smallOpacity: new Animated.Value(0),
      smallScale: new Animated.Value(0.6),
      oneOpacity: new Animated.Value(0),
      oneScale: new Animated.Value(1),
      translateY: new Animated.Value(20),
      rotation: new Animated.Value(0),
      spawnTime: TREE_START_TIME, // Start at 10 seconds
      transformTime: TREE_START_TIME + TRANSFORM_DELAY, // Transform 10 seconds after spawn
    };
    
    // Start with just the center tree - new trees will spawn continuously during the session
    setTrees([centerTree]);
    nextTreeIdRef.current = 1;
    lastSpawnTimeRef.current = 0;
  };

  // Timer logic with 4-phase animation system
  useEffect(() => {
    if (isRunning && !isPaused && timeRemaining > 0 && selectedDuration) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1;
          const elapsed = (selectedDuration || 0) * 60 - newTime;
          elapsedTimeRef.current = elapsed;
          
          const totalSeconds = selectedDuration * 60;
          const progress = elapsed / totalSeconds; // 0 to 1 (still used for Phase 3 and 4)
          const remainingSeconds = newTime;
          
          // Phase 1: Center tree growth (starts at 10 seconds elapsed)
          if (elapsed >= 10 && !phaseRefs.phase1Complete && trees.length > 0) {
            const centerTree = trees.find(t => t.id === 'center');
            if (centerTree && centerTree.state === 'small') {
              // Start center tree growth animation when spawn time is reached
              // Check if animation hasn't started yet (opacity is 0)
              if (elapsed >= centerTree.spawnTime) {
                Animated.parallel([
                  Animated.timing(centerTree.smallOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                  }),
                  Animated.timing(centerTree.smallScale, {
                    toValue: 1,
                    duration: 10000, // 10 seconds growth animation
                    useNativeDriver: true,
                  }),
                  Animated.timing(centerTree.translateY, {
                    toValue: 0,
                    duration: 10000,
                    useNativeDriver: true,
                  }),
                ]).start();
              }
              
              // Transform center tree after spawnTime + transform delay
              if (elapsed >= centerTree.transformTime) {
                centerTree.state = 'transforming';
                // Cross-fade transition
                centerTree.oneOpacity.setValue(0);
                Animated.parallel([
                  Animated.timing(centerTree.smallOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                  }),
                  Animated.timing(centerTree.oneOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                  }),
                ]).start(() => {
                  centerTree.state = 'mature';
                  phaseRefs.phase1Complete = true;
                });
              }
            }
          }
          
          // Phase 2: Continuous circular forest growth (starts at 10 seconds elapsed)
          // Stop spawning once late stages begin, otherwise duplicate trees keep appearing near completion.
          if (elapsed >= 10 && progress < 0.7) {
            if (!phaseRefs.phase2Started) {
              phaseRefs.phase2Started = true;
            }
            
            // Continuously spawn new trees every 5 seconds
            const SPAWN_INTERVAL = 5; // Spawn a new tree every 5 seconds
            // Use variable radius to spread trees around screen
            const maxRadius = Math.min(width * 0.35, (height - 200) * 0.25);
            const radius = maxRadius; // Use larger radius for better screen coverage
            const TREE_START_TIME = 10;
            
            // Check if it's time to spawn a new tree (only spawn one per interval)
            const timeSinceLastSpawn = elapsed - lastSpawnTimeRef.current;
            if (timeSinceLastSpawn >= SPAWN_INTERVAL && elapsed >= TREE_START_TIME) {
              // Generate random angle for new tree
              const angle = Math.random() * 360;
              const newTree = createNewTree(elapsed, angle, radius);
              
              setTrees((prevTrees) => [...prevTrees, newTree]);
              lastSpawnTimeRef.current = elapsed;
            }
            
            // Spawn trees sequentially based on elapsed time
            trees.forEach((tree) => {
              // Spawn hidden trees when their time comes
              if (tree.id !== 'center' && tree.state === 'hidden' && elapsed >= tree.spawnTime) {
                tree.state = 'small';
                const spawnDuration = 800; // 800ms spawn animation
                
                Animated.parallel([
                  Animated.timing(tree.smallOpacity, {
                    toValue: 1,
                    duration: spawnDuration,
                    useNativeDriver: true,
                  }),
                  Animated.sequence([
                    Animated.timing(tree.smallScale, {
                      toValue: 0.6,
                      duration: spawnDuration / 2,
                      useNativeDriver: true,
                    }),
                    Animated.timing(tree.smallScale, {
                      toValue: 1,
                      duration: spawnDuration / 2,
                      useNativeDriver: true,
                    }),
                  ]),
                ]).start();
              }
              
              // Transform small trees to mature trees based on elapsed time
              if (tree.id !== 'center' && tree.state === 'small' && elapsed >= tree.transformTime) {
                tree.state = 'transforming';
                tree.oneOpacity.setValue(0);
                Animated.parallel([
                  Animated.timing(tree.smallOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                  }),
                  Animated.timing(tree.oneOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                  }),
                ]).start(() => {
                  tree.state = 'mature';
                });
              }
            });
          }
          
          // Phase 3: Forest completion (70-90%) - Disabled
          if (progress >= 0.7 && progress < 0.9 && !phaseRefs.phase3Started) {
            phaseRefs.phase3Started = true;
            setShowForest(false); // Keep forest hidden
            
            // Fade out ALL individual trees (not just mature ones)
            trees.forEach((tree) => {
              // Fade out small trees
              if (tree.state === 'small' || tree.state === 'transforming') {
                Animated.timing(tree.smallOpacity, {
                  toValue: 0,
                  duration: 1000,
                  useNativeDriver: true,
                }).start(() => {
                  tree.state = 'hidden';
                });
              }
              // Fade out mature trees
              if (tree.state === 'mature') {
                Animated.timing(tree.oneOpacity, {
                  toValue: 0,
                  duration: 1000,
                  useNativeDriver: true,
                }).start(() => {
                  tree.state = 'hidden';
                });
              }
            });
            
            // Fade in forest
            forestOpacity.setValue(0);
            forestScale.setValue(0.9);
            Animated.parallel([
              Animated.timing(forestOpacity, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(forestScale, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
            ]).start();
          }
          
          // Show Atlas popup 10 seconds before Atlas appears (10 seconds before 90% progress)
          const atlasAppearsAt = 0.9 * totalSeconds; // 90% of total duration
          const popupShowsAt = atlasAppearsAt - 10; // 10 seconds before
          const popupProgressThreshold = popupShowsAt / totalSeconds;
          
          if (progress >= popupProgressThreshold && progress < 0.9 && !showAtlasPopup) {
            setShowAtlasPopup(true);
            // Slide in from right
            atlasPopupTranslateX.setValue(width);
            Animated.timing(atlasPopupTranslateX, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }).start();
          }
          
          // Hide popup when Atlas appears
          if (progress >= 0.9 && showAtlasPopup) {
            Animated.timing(atlasPopupTranslateX, {
              toValue: width,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              setShowAtlasPopup(false);
            });
          }
          
          // Phase 4: Atlas arrival (90-100%)
          if (progress >= 0.9 && !phaseRefs.phase4Started) {
            phaseRefs.phase4Started = true;
            setShowDeer(true);
            
            // Deer slides in from left
            deerTranslateX.setValue(-width);
            deerOpacity.setValue(0);
            
            Animated.parallel([
              Animated.timing(deerTranslateX, {
                toValue: width * 0.6, // 60% from left (center-right)
                duration: 2500,
                useNativeDriver: true,
              }),
              Animated.timing(deerOpacity, {
                toValue: 1,
                duration: 2500,
                useNativeDriver: true,
              }),
            ]).start(() => {
              // Start breathing animation
              const breathingAnimation = Animated.loop(
                Animated.sequence([
                  Animated.timing(deerBreathScale, {
                    toValue: 1.02,
                    duration: 2000,
                    useNativeDriver: true,
                  }),
                  Animated.timing(deerBreathScale, {
                    toValue: 1.0,
                    duration: 2000,
                    useNativeDriver: true,
                  }),
                ])
              );
              breathingAnimation.start();
            });
          }
          
          if (newTime <= 0) {
            setIsRunning(false);
            setShowForest(false); // Ensure forest is hidden
            setShowDeer(false); // Ensure deer is hidden
            setShowCompletionPopup(true);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning, isPaused, timeRemaining, selectedDuration, trees, showAtlasPopup]);

  const selectDuration = (duration: TimerDuration) => {
    void hapticLight();
    if (isTabletLayout) {
      // iPad flow: start immediately when a duration is tapped.
      setPreSelectedDuration(duration);
      setSelectedDuration(duration);
      setTimeRemaining(duration * 60);
      setIsRunning(true);
      setIsPaused(false);
      elapsedTimeRef.current = 0;

      // Reset phase refs
      phaseRefs.phase1Complete = false;
      phaseRefs.phase2Started = false;
      phaseRefs.phase2Complete = false;
      phaseRefs.phase3Started = false;
      phaseRefs.phase4Started = false;

      // Reset states
      setShowForest(false);
      setShowDeer(false);
      setShowSeed(true);

      // Initialize trees and animation values
      initializeTrees(duration);
      forestOpacity.setValue(0);
      forestScale.setValue(0.9);
      deerOpacity.setValue(0);
      deerTranslateX.setValue(-width);
      deerScale.setValue(1);
      deerBreathScale.setValue(1);
      return;
    }
    setPreSelectedDuration(duration);
  };

  const startTimer = () => {
    if (!preSelectedDuration) return;
    
    setSelectedDuration(preSelectedDuration);
    setTimeRemaining(preSelectedDuration * 60);
    setIsRunning(true);
    setIsPaused(false);
    elapsedTimeRef.current = 0;
    
    // Reset phase refs
    phaseRefs.phase1Complete = false;
    phaseRefs.phase2Started = false;
    phaseRefs.phase2Complete = false;
    phaseRefs.phase3Started = false;
    phaseRefs.phase4Started = false;
    
    // Reset states
    setShowForest(false);
    setShowDeer(false);
    setShowSeed(true); // Show seed when timer starts
    
    // Initialize trees
    initializeTrees(preSelectedDuration);
    
    // Reset animation values
    forestOpacity.setValue(0);
    forestScale.setValue(0.9);
    deerOpacity.setValue(0);
    deerTranslateX.setValue(-width);
    deerScale.setValue(1);
    deerBreathScale.setValue(1);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(0);
    setSelectedDuration(null);
    setPreSelectedDuration(null);
    elapsedTimeRef.current = 0;
    
    // Reset phase refs
    phaseRefs.phase1Complete = false;
    phaseRefs.phase2Started = false;
    phaseRefs.phase2Complete = false;
    phaseRefs.phase3Started = false;
    phaseRefs.phase4Started = false;
    
    // Reset states
    setTrees([]);
    setShowForest(false);
    setShowDeer(false);
    setShowSeed(false);
    setShowAtlasPopup(false);
    
    // Reset refs
    nextTreeIdRef.current = 1;
    lastSpawnTimeRef.current = 0;
    
    // Reset animation values
    forestOpacity.setValue(0);
    forestScale.setValue(0.9);
    deerOpacity.setValue(0);
    deerTranslateX.setValue(-width);
    deerScale.setValue(1);
    deerBreathScale.setValue(1);
    atlasPopupTranslateX.setValue(width);
  };

  const handleDone = () => {
    const completedSeconds = elapsedTimeRef.current;
    const completedHours = completedSeconds / 3600;

    // Fire-and-forget: save in background, don't block navigation
    void maybePromptForLongFocusSessionReview(completedSeconds);
    void (async () => {
      try {
        const existingHoursData = await AsyncStorage.getItem('focusHours');
        const existingHours = existingHoursData ? parseFloat(existingHoursData) : 0;
        const newTotalHours = existingHours + completedHours;
        await AsyncStorage.setItem('focusHours', newTotalHours.toString());

        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ focus_hours: newTotalHours }).eq('id', user.id);
        }
      } catch (err) {
        console.error('Error saving focus hours:', err);
      }
    })();

    // Navigate immediately — no delay, no confetti
    router.replace('/(tabs)');
  };

  // Confetti pieces for celebration
  const confettiPieces = useRef(
    Array.from({ length: 50 }, () => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      rotation: new Animated.Value(0),
      startX: Math.random() * width, // Distribute across full width
      startY: Math.random() * height, // Distribute across full height
    }))
  ).current;

  const triggerConfetti = () => {
    confettiPieces.forEach((confetti) => {
      const startX = confetti.startX;
      const startY = confetti.startY;
      
      // Reset values
      confetti.translateX.setValue(startX - width / 2);
      confetti.translateY.setValue(startY - height / 2);
      confetti.opacity.setValue(0);
      confetti.scale.setValue(0);
      confetti.rotation.setValue(0);

      // Random movement direction - larger range for full screen coverage
      const moveX = (Math.random() - 0.5) * width * 0.8;
      const moveY = (Math.random() - 0.5) * height * 0.8;

      Animated.parallel([
        Animated.sequence([
          Animated.timing(confetti.opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(confetti.opacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(confetti.scale, {
            toValue: 1.5,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(confetti.scale, {
            toValue: 0.2,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(confetti.translateX, {
          toValue: startX - width / 2 + moveX,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(confetti.translateY, {
          toValue: startY - height / 2 + moveY,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(confetti.rotation, {
          toValue: Math.random() * 720,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const animationImageMap = [
    require('../../assets/images/seed.png'),
    require('../../assets/images/seed2.png'),
    require('../../assets/images/seed3.png'),
    require('../../assets/images/tree.png'),
    require('../../assets/images/tree2.png'),
    require('../../assets/images/tree3.png'),
    require('../../assets/images/tree4.png'),
    require('../../assets/images/tree5.png'),
    require('../../assets/images/tree6.png'),
    require('../../assets/images/tree7.png'),
    require('../../assets/images/tree8.png'),
  ];

  const getAnimationFrameIndex = (): number => {
    if (!selectedDuration || !isRunning) {
      return 0;
    }

    const totalSeconds = selectedDuration * 60;
    const elapsed = totalSeconds - timeRemaining;
    const progress = Math.min(Math.max(elapsed / totalSeconds, 0), 1);
    const imageIndex = Math.floor(progress * (animationImageMap.length - 1));
    return Math.min(Math.max(imageIndex, 0), animationImageMap.length - 1);
  };

  // Return a single frame image (original behavior: discrete image switching).
  const getAnimationFrame = () => {
    return animationImageMap[getAnimationFrameIndex()];
  };

  const getSessionProgress = (): number => {
    if (!selectedDuration || !isRunning) {
      return 0;
    }

    const totalSeconds = selectedDuration * 60;
    const elapsed = totalSeconds - timeRemaining;
    return Math.min(Math.max(elapsed / totalSeconds, 0), 1);
  };

  // Keep stage updates synchronized with the live sanctuary growth phases.
  const getStage = (): { number: number; name: string } => {
    const progress = getSessionProgress();
    let stageNumber = 1;

    if (showDeer || progress >= 0.85) {
      stageNumber = 5;
    } else if (showForest || progress >= 0.65 || trees.length >= 12) {
      stageNumber = 4;
    } else if (progress >= 0.45 || trees.length >= 7) {
      stageNumber = 3;
    } else if (progress >= 0.2 || trees.length >= 2) {
      stageNumber = 2;
    }

    return { number: stageNumber, name: t(`focus.stages.${stageNumber}`) };
  };

  const insets = useSafeAreaInsets();
  const headerTopOffset = Math.max(60, insets.top + 20);
  /** Match Home tab guide button vertical position */
  const guideButtonTop = Math.max(50, insets.top + 10);
  const focusGuideMinHeight = height <= 700 ? 500 : height <= 840 ? 560 : 620;
  const focusGuideScrollMinHeight = height <= 700 ? 170 : height <= 840 ? 220 : 280;
  const isShortRunningLayout = height <= 840;
  const runningCircleOuterSize = Math.min(
    width * (isShortRunningLayout ? 0.72 : 0.78),
    isShortRunningLayout ? 286 : 324
  );
  const runningCircleInnerSize = Math.round(runningCircleOuterSize * 0.926);
  const runningCircleOuterRadius = runningCircleOuterSize / 2;
  const runningCircleInnerRadius = runningCircleInnerSize / 2;
  const runningStageBadgeBottom = Math.max(16, Math.round(runningCircleInnerSize * 0.06));
  const animationFrame = getAnimationFrame();
  const currentStage = getStage();
  const showDurationSelectionClouds = !selectedDuration && !isRunning;
  const nowMs = Date.now();
  const toNormalCase = (value: string) =>
    value ? `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}` : value;

  const renderAmbientControls = (layout: 'running' | 'card') => {
    const onCard = layout === 'card';
    const useCardTheme = onCard || layout === 'running';
    const compact = isNarrowScreen;
    return (
      <View
        style={[
          styles.ambientSoundsSection,
          layout === 'running' && styles.ambientSoundsSectionOnRunningTimer,
          onCard && styles.ambientSoundsSectionPreStart,
          useCardTheme && styles.ambientSoundsSectionCardHighlight,
        ]}
      >
        <Text
          style={[
            styles.ambientSoundCaption,
            useCardTheme && styles.selectDurationText,
            useCardTheme && compact && styles.selectDurationTextCompact,
            useCardTheme && styles.ambientSoundCaptionOnCard,
          ]}
        >
          {t('focus.ambient.hint')}
        </Text>
        <View style={styles.ambientSoundRow}>
          {AMBIENT_ORDER.map((trackId, index) => {
            const isLast = index === AMBIENT_ORDER.length - 1;
            return (
              <TouchableOpacity
                key={trackId}
                style={[
                  styles.ambientSoundButton,
                  compact && styles.ambientSoundButtonCompact,
                  isLast ? { marginRight: 0 } : { marginRight: compact ? 7 : 12 },
                  selectedAmbientId === trackId && styles.ambientSoundButtonActive,
                  useCardTheme && selectedAmbientId === trackId && styles.ambientSoundButtonActiveOnCard,
                  !ambientSoundsEnabled && styles.ambientSoundButtonDisabled,
                ]}
                onPress={() => {
                  void hapticLight();
                  setSelectedAmbientId(trackId);
                }}
                disabled={!ambientSoundsEnabled}
                accessibilityRole="button"
                accessibilityLabel={t(`focus.ambient.tracks.${trackId}`)}
              >
                <Ionicons
                  name={AMBIENT_ICONS[trackId]}
                  size={compact ? 20 : 24}
                  color={useCardTheme ? '#342846' : '#ffffff'}
                />
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.ambientSoundSwitchRow}>
          <Text
            style={[
              styles.ambientSoundSwitchLabel,
              useCardTheme && styles.ambientSoundSwitchLabelOnCard,
            ]}
          >
            {t('focus.ambient.enabled')}
          </Text>
          <Switch
            value={ambientSoundsEnabled}
            onValueChange={setAmbientSoundsEnabled}
            trackColor={{ false: '#767577', true: useCardTheme ? '#cdbad8' : '#bda5c9' }}
            thumbColor="#f4f3f4"
          />
        </View>
      </View>
    );
  };

  return (
    <PaperTextureBackground baseColor="#1f1a2a">
      <View style={styles.container}>
        <Image
          source={
            selectedDuration && isRunning
              ? require('../../assets/images/ikigaion.png')
              : require('../../assets/images/sanctuary.png')
          }
          pointerEvents="none"
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      {showDurationSelectionClouds && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {CLOUD_PATTERNS.map((cloud, index) => {
            const cycle = (nowMs + cloud.offsetMs) % cloud.cycleMs;
            const cloudPhase = cycle / cloud.cycleMs;
            const xPercent = -30 + cloudPhase * 160;
            const bobY = Math.sin(cloudTick * 0.06 + index) * 2;

            return (
              <Image
                key={`focus-cloud-${index}`}
                source={require('../../assets/images/cloud.png')}
                style={{
                  left: `${xPercent}%`,
                  top: `${cloud.yPercent}%`,
                  width: cloud.width,
                  height: cloud.height,
                  opacity: cloud.opacity * 0.8,
                  transform: [{ translateY: bobY }],
                  position: 'absolute',
                }}
                resizeMode="contain"
              />
            );
          })}
        </View>
      )}
      <View style={styles.contentContainer}>
      {!isRunning && (
        <TouchableOpacity
          style={[styles.focusGuideButton, { top: guideButtonTop }]}
          onPress={() => {
            void hapticLight();
            setShowFocusGuideModal(true);
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('focus.guide.title')}
        >
          <MaterialIcons name="help-outline" size={20} color="#342846" style={styles.focusGuideButtonIcon} />
        </TouchableOpacity>
      )}

      {/* Header - Only show when timer is running */}
      {selectedDuration && isRunning && (
        <View style={[styles.timerHeader, { paddingTop: headerTopOffset }]}>
          {/* Title - Centered */}
          <Text style={styles.timerHeaderTitle}>{t('focus.focusSanctuary')}</Text>
        </View>
      )}

      {/* Focus Heading - Only show when timer is not running and portfolio is shown */}
      {!selectedDuration && !isRunning && (
        <View style={[styles.focusHeaderBlock, { marginTop: headerTopOffset - 60 }]}>
          <Text style={styles.focusHeading}>
            {t('focus.focusSanctuary')}
          </Text>
          <Text style={styles.focusSubtitlePrimary}>
            {focusSubtitlePrimary}
          </Text>
        </View>
      )}

      {/* Tree Animation Container - Hide when timer is running (new design shows tree in circle) */}
      {!isRunning && (
        <View style={styles.treeContainer} pointerEvents="box-none">
          {/* Show tent image on initial screen (before timer starts) */}
          {!selectedDuration && (
          <View style={styles.tentContainer} pointerEvents="none">
            {/* Blur effect behind tent */}
            <View style={styles.tentBlur} />
            <Image
              source={require('../../assets/images/tent.png')}
              style={styles.tentImage}
              resizeMode="contain"
            />
          </View>
        )}
        
        {/* Render all trees dynamically - hide when forest appears and when completion popup is open */}
        {!showForest && !showCompletionPopup && trees.map((tree) => {
          // Center tree position - centered horizontally
          const centerTreeX = width / 2;
          const centerTreeY = getCenterTreeY(); // Positioned so lowest tree is 20px above timer
          
          // Increase tree size by 45% from previous (was 1.89, now 1.89 * 1.45 = 2.74)
          const centerTreeSize = width * 0.15 * 2.74;
          
          // For center tree, use center position
          const isCenterTree = tree.id === 'center';
          
          let finalX = centerTreeX;
          let finalY = centerTreeY;
          let treeSize = centerTreeSize;
          
          // For circular trees, spread them around the screen using variable radius
          if (!isCenterTree && tree.radius > 0) {
            // Use a larger radius to spread trees around the screen
            // Calculate radius based on available screen space
            // Use minimum of width/3 or height/4 to ensure trees stay on screen
            const maxRadius = Math.min(width * 0.35, (height - 200) * 0.25); // Spread trees wider
            
            // Use the tree's stored radius, but scale it up for better distribution
            const effectiveRadius = Math.max(tree.radius, maxRadius);
            
            // Calculate position based on angle with larger radius
            // Angles: 0=right, 90=down, 180=left, 270=up, 45=down-right, etc.
            const offsetX = effectiveRadius * Math.cos((tree.angle * Math.PI) / 180);
            const offsetY = effectiveRadius * Math.sin((tree.angle * Math.PI) / 180);
            
            finalX = centerTreeX + offsetX;
            finalY = centerTreeY + offsetY;
            treeSize = centerTreeSize * 0.8; // 20% smaller (80% of original size)
          }
          
          return (
            <View key={tree.id} style={{ 
              position: 'absolute', 
              left: finalX - treeSize / 2, 
              top: finalY - treeSize / 2,
              zIndex: isCenterTree ? 2 : 0, // Center tree should appear above timer
            }}>
              {/* Small tree (if state is small or transforming) */}
              {(tree.state === 'small' || tree.state === 'transforming') && (
                <Animated.View
                  style={{
                    opacity: tree.smallOpacity,
                    transform: [
                      { scale: tree.smallScale },
                      { translateY: tree.translateY },
                      {
                        rotate: tree.rotation.interpolate({
                          inputRange: [-10, 10],
                          outputRange: ['-10deg', '10deg'],
                        }),
                      },
                    ],
                  }}
                >
                  <Image
                    source={require('../../assets/images/seed.png')}
                    style={{ width: treeSize, height: treeSize }}
                    resizeMode="contain"
                  />
                </Animated.View>
              )}
              
              {/* Mature tree (if state is transforming or mature) */}
              {(tree.state === 'transforming' || tree.state === 'mature') && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    opacity: tree.oneOpacity,
                    transform: [
                      { scale: tree.oneScale },
                      {
                        rotate: tree.rotation.interpolate({
                          inputRange: [-10, 10],
                          outputRange: ['-10deg', '10deg'],
                        }),
                      },
                    ],
                  }}
                >
                  <Image
                    source={require('../../assets/images/one.tree.png')}
                    style={{ width: treeSize * 1.2, height: treeSize * 1.2 }}
                    resizeMode="contain"
                  />
                </Animated.View>
              )}
            </View>
          );
        })}

        </View>
      )}

      {/* Atlas Popup - 20px above timer */}
      {showAtlasPopup && selectedDuration && (
        <Animated.View
          style={[
            styles.atlasPopupContainer,
            {
              transform: [{ translateX: atlasPopupTranslateX }],
            },
          ]}
        >
          <View style={styles.atlasPopup}>
            <Image
              source={require('../../assets/images/full.deer.png')}
              style={styles.atlasPopupAvatar}
              resizeMode="contain"
            />
            <View style={styles.atlasPopupTextWrap}>
              <Text style={styles.atlasPopupTitle}>
                {isRussian ? 'Атлас скоро появится' : 'Atlas will appear soon'}
              </Text>
              <Text style={styles.atlasPopupText}>
                {isRussian ? 'Держи фокус, он уже рядом.' : 'Keep going, he is almost here.'}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Atlas image pop-in near completion */}
      {showDeer && selectedDuration && !showCompletionPopup && (
        <Animated.View
          style={[
            styles.deerContainer,
            {
              opacity: deerOpacity,
              transform: [
                { translateX: deerTranslateX },
                { scale: deerBreathScale },
              ],
            },
          ]}
        >
          <Image
            source={require('../../assets/images/full.deer.png')}
            style={styles.deerImage}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      {/* Timer Display - New Design when timer is running */}
      {selectedDuration && isRunning ? (
        <>
          {/* Circular Frame with Tree and Stage Badge */}
          <View
            style={[
              styles.timerCircleContainer,
              {
                marginTop: isShortRunningLayout ? 56 : 82,
                marginBottom: isShortRunningLayout ? 14 : 22,
              },
            ]}
          >
            {/* Outer circle with blur effect */}
            <View
              style={[
                styles.timerCircleOuter,
                {
                  width: runningCircleOuterSize,
                  height: runningCircleOuterSize,
                  borderRadius: runningCircleOuterRadius,
                },
              ]}
            >
              <FrostedCardLayer intensity={100} tint="light" fallbackColor="rgba(255, 255, 255, 0.08)" />
              {/* Inner circle border */}
              <View
                style={[
                  styles.timerCircleInner,
                  {
                    width: runningCircleInnerSize,
                    height: runningCircleInnerSize,
                    borderRadius: runningCircleInnerRadius,
                  },
                ]}
              >
                {/* Animation Image - Progresses through seed, seed2, seed3, tree, tree2, tree3, tree4, tree5, tree6, tree7, tree8 */}
                <View
                  style={[
                    styles.timerSeedContainer,
                    {
                      width: runningCircleInnerSize,
                      height: runningCircleInnerSize,
                      borderRadius: runningCircleInnerRadius,
                    },
                  ]}
                >
                  <Image
                    source={animationFrame}
                    style={[
                      styles.timerSeedImage,
                      { width: runningCircleInnerSize, height: runningCircleInnerSize },
                    ]}
                    resizeMode="contain"
                  />
                </View>
                {/* Stage Badge */}
                <View style={[styles.stageBadge, { bottom: runningStageBadgeBottom }]}>
                  <Text style={styles.stageBadgeText}>
                    {toNormalCase(t('focus.stage'))} {currentStage.number}: {toNormalCase(currentStage.name)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {renderAmbientControls('running')}

          {/* Timer Display - Below the card */}
          <View style={styles.timerDisplayContainer}>
            <Text style={[styles.timerDisplayText, isShortRunningLayout && styles.timerDisplayTextCompact]}>
              {formatTime(timeRemaining)}
            </Text>
          </View>
        </>
      ) : selectedDuration ? (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
        </View>
      ) : (
        <>
          {/* Light bulb icon above duration selection */}
          <View
            style={[
              styles.durationSelectionFrame,
              !preSelectedDuration && styles.durationSelectionFrameCompact,
              isTabletLayout && styles.durationSelectionFrameTablet,
            ]}
          >
          <FrostedCardLayer />
          <Text
            style={[
              styles.selectDurationText,
              isNarrowScreen && styles.selectDurationTextCompact,
            ]}
          >
            {t('focus.selectDuration')}
          </Text>
          
          <View
            style={[
              styles.timerOptionsContainer,
              isTabletLayout && styles.timerOptionsContainerTablet,
              !isTabletLayout && isNarrowScreen && styles.timerOptionsContainerNarrow,
            ]}
          >
            <TouchableOpacity
              style={[
                styles.timerOptionCircle,
                isTabletLayout && styles.timerOptionCircleTablet,
                !isTabletLayout && isNarrowScreen && styles.timerOptionCircleNarrow,
                !isTabletLayout && isNarrowScreen && styles.timerOptionCircleNarrowSpacing,
                preSelectedDuration === 5 && styles.timerOptionCircleSelected
              ]}
              onPress={() => selectDuration(5)}
            >
              <Text style={[
                styles.timerOptionNumber,
                !isTabletLayout && isNarrowScreen && styles.timerOptionNumberNarrow,
                preSelectedDuration === 5 && styles.timerOptionNumberSelected
              ]}>5</Text>
              <Text style={[
                styles.timerOptionLabel,
                !isTabletLayout && isNarrowScreen && styles.timerOptionLabelNarrow,
                preSelectedDuration === 5 && styles.timerOptionLabelSelected
              ]}>{t('focus.minutes')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timerOptionCircle,
                isTabletLayout && styles.timerOptionCircleTablet,
                !isTabletLayout && isNarrowScreen && styles.timerOptionCircleNarrow,
                !isTabletLayout && isNarrowScreen && styles.timerOptionCircleNarrowSpacing,
                preSelectedDuration === 15 && styles.timerOptionCircleSelected
              ]}
              onPress={() => selectDuration(15)}
            >
              <Text style={[
                styles.timerOptionNumber,
                !isTabletLayout && isNarrowScreen && styles.timerOptionNumberNarrow,
                preSelectedDuration === 15 && styles.timerOptionNumberSelected
              ]}>15</Text>
              <Text style={[
                styles.timerOptionLabel,
                !isTabletLayout && isNarrowScreen && styles.timerOptionLabelNarrow,
                preSelectedDuration === 15 && styles.timerOptionLabelSelected
              ]}>{t('focus.minutes')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timerOptionCircle,
                isTabletLayout && styles.timerOptionCircleTablet,
                !isTabletLayout && isNarrowScreen && styles.timerOptionCircleNarrow,
                !isTabletLayout && isNarrowScreen && styles.timerOptionCircleNarrowSpacing,
                preSelectedDuration === 30 && styles.timerOptionCircleSelected
              ]}
              onPress={() => selectDuration(30)}
            >
              <Text style={[
                styles.timerOptionNumber,
                !isTabletLayout && isNarrowScreen && styles.timerOptionNumberNarrow,
                preSelectedDuration === 30 && styles.timerOptionNumberSelected
              ]}>30</Text>
              <Text style={[
                styles.timerOptionLabel,
                !isTabletLayout && isNarrowScreen && styles.timerOptionLabelNarrow,
                preSelectedDuration === 30 && styles.timerOptionLabelSelected
              ]}>{t('focus.minutes')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timerOptionCircle,
                isTabletLayout && styles.timerOptionCircleTablet,
                !isTabletLayout && isNarrowScreen && styles.timerOptionCircleNarrow,
                !isTabletLayout && isNarrowScreen && styles.timerOptionCircleNarrowSpacing,
                preSelectedDuration === 60 && styles.timerOptionCircleSelected
              ]}
              onPress={() => selectDuration(60)}
            >
              <Text style={[
                styles.timerOptionNumber,
                !isTabletLayout && isNarrowScreen && styles.timerOptionNumberNarrow,
                preSelectedDuration === 60 && styles.timerOptionNumberSelected
              ]}>60</Text>
              <Text style={[
                styles.timerOptionLabel,
                !isTabletLayout && isNarrowScreen && styles.timerOptionLabelNarrow,
                preSelectedDuration === 60 && styles.timerOptionLabelSelected
              ]}>{t('focus.minutes')}</Text>
            </TouchableOpacity>
          </View>

          {renderAmbientControls('card')}
          
          {preSelectedDuration && (
            <TouchableOpacity
              style={styles.startGrowingButton}
              onPress={startTimer}
            >
              <Text style={styles.startGrowingButtonText}>{t('focus.startGrowing')}</Text>
            </TouchableOpacity>
          )}
        </View>
        </>
      )}

      {/* Confetti Pieces */}
      {showConfetti && (
        <View style={styles.confettiContainer} pointerEvents="none">
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
      )}

      {/* Bottom Buttons - New Design when timer is running */}
      {selectedDuration && isRunning ? (
        <View style={styles.timerButtonsContainer}>
          <TouchableOpacity
            style={styles.timerResetButton}
            onPress={resetTimer}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
            <Text style={styles.timerResetButtonText}>{t('focus.reset')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timerDoneButton}
            onPress={handleDone}
          >
            <Ionicons name="checkmark" size={24} color="#342846" />
            <Text style={styles.timerDoneButtonText}>{t('focus.imDone')}</Text>
          </TouchableOpacity>
        </View>
      ) : selectedDuration ? (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetTimer}
          >
            <Text style={styles.resetButtonText}>{t('focus.reset')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDone}
          >
            <LinearGradient
              colors={['#ffffff', '#e6e6e6', '#d4d4d4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.doneButtonGradient}
            >
              <Text style={styles.doneButtonText}>{t('focus.imDone')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null}
      </View>

      {/* Completion Popup */}
      <Modal
        visible={showCompletionPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          // Reset all state
          setShowCompletionPopup(false);
          setShowForest(false);
          setShowDeer(false);
          setSelectedDuration(null);
          setPreSelectedDuration(null);
          setTimeRemaining(0);
          setIsRunning(false);
          setIsPaused(false);
          // Navigate to home screen
          router.replace('/(tabs)');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.completionPopup}>
            <Text style={styles.completionPopupText}>
              {isRussian ? 'Поздравляем, ты успешно завершил задачу!' : 'Congratulations, you successfully completed the session!'}
            </Text>
            <TouchableOpacity
              style={styles.completionPopupButton}
              onPress={() => {
                // Reset all state
                setShowCompletionPopup(false);
                setShowForest(false);
                setShowDeer(false);
                setSelectedDuration(null);
                setPreSelectedDuration(null);
                setTimeRemaining(0);
                setIsRunning(false);
                setIsPaused(false);
                // Navigate to home screen
                router.replace('/(tabs)');
              }}
            >
              <Text style={styles.completionPopupButtonText}>Yay!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFocusGuideModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFocusGuideModal(false)}
      >
        <View style={styles.focusGuideModalOverlay}>
          <TouchableOpacity
            style={styles.focusGuideModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowFocusGuideModal(false)}
          />
          <View style={[styles.focusGuideModalCard, { minHeight: focusGuideMinHeight }]}>
            <TouchableOpacity
              style={styles.focusGuideModalClose}
              onPress={() => setShowFocusGuideModal(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <MaterialIcons name="close" size={22} color="#342846" />
            </TouchableOpacity>
            <View style={styles.focusGuideModalHeader}>
              <View style={styles.focusGuideModalTitleContainer}>
                <Image
                  source={require('../../assets/images/focus.png')}
                  style={styles.focusGuideModalHeaderIcon}
                  resizeMode="contain"
                />
                <Text style={styles.focusGuideModalTitle}>{t('focus.guide.title')}</Text>
                <Text style={styles.focusGuideModalSubtitle}>{t('focus.guide.intro')}</Text>
              </View>
            </View>
            <ScrollView
              style={[styles.focusGuideScroll, { minHeight: focusGuideScrollMinHeight }]}
              contentContainerStyle={styles.focusGuideScrollContent}
              showsVerticalScrollIndicator
            >
              <View style={styles.focusGuideQuickGrid}>
                <View style={styles.focusGuideQuickCard}>
                  <Text style={styles.focusGuideQuickTitle}>{t('focus.guide.quickTimerTitle')}</Text>
                  <Text style={styles.focusGuideQuickText}>{t('focus.guide.quickTimerBody')}</Text>
                </View>
                <View style={styles.focusGuideQuickCard}>
                  <Text style={styles.focusGuideQuickTitle}>{t('focus.guide.quickGrowthTitle')}</Text>
                  <Text style={styles.focusGuideQuickText}>{t('focus.guide.quickGrowthBody')}</Text>
                </View>
                <View style={styles.focusGuideQuickCard}>
                  <Text style={styles.focusGuideQuickTitle}>{t('focus.guide.quickSoundTitle')}</Text>
                  <Text style={styles.focusGuideQuickText}>{t('focus.guide.quickSoundBody')}</Text>
                </View>
                <View style={styles.focusGuideQuickCard}>
                  <Text style={styles.focusGuideQuickTitle}>{t('focus.guide.quickFinishTitle')}</Text>
                  <Text style={styles.focusGuideQuickText}>{t('focus.guide.quickFinishBody')}</Text>
                </View>
              </View>
              <View style={styles.focusGuideTipCard}>
                <Text style={styles.focusGuideTipTitle}>{t('focus.guide.tipTitle')}</Text>
                <Text style={styles.focusGuideTipText}>{t('focus.guide.tipBody')}</Text>
              </View>
            </ScrollView>
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
    backgroundColor: '#1f1a2a',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 10,
    paddingHorizontal: 20,
    position: 'relative',
  },
  /** Match Home `guideButton` (index.tsx) */
  focusGuideButton: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    opacity: 1,
    elevation: 11,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  focusGuideButtonIcon: {
    opacity: 1,
  },
  ambientSoundsSection: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  /** Between tree circle and ticking clock while session is active */
  ambientSoundsSectionOnRunningTimer: {
    marginTop: 6,
    marginBottom: 10,
  },
  /** After large timer, before “Start growing” (phone flow) */
  ambientSoundsSectionPreStart: {
    marginTop: 20,
    marginBottom: 8,
  },
  /** Distinct card-within-card highlight for ambient controls before session start. */
  ambientSoundsSectionCardHighlight: {
    borderWidth: 1.5,
    borderColor: 'rgba(52, 40, 70, 0.28)',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  preStartTimerWithSounds: {
    width: '100%',
    alignItems: 'center',
  },
  ambientSoundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientSoundButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  /** Fits 5 buttons in ~width−56 when default row would clip (e.g. 320pt-wide phones). */
  ambientSoundButtonCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 7,
  },
  ambientSoundButtonActive: {
    backgroundColor: 'rgba(205, 186, 216, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(165, 146, 176, 0.9)',
  },
  ambientSoundButtonActiveOnCard: {
    backgroundColor: 'rgba(205, 186, 216, 0.62)',
    borderColor: 'rgba(165, 146, 176, 0.95)',
  },
  ambientSoundButtonDisabled: {
    opacity: 0.45,
  },
  ambientSoundCaption: {
    ...BodyStyle,
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    maxWidth: width - 48,
  },
  ambientSoundSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  ambientSoundSwitchLabel: {
    ...BodyStyle,
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 15,
    marginRight: 12,
  },
  focusGuideModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusGuideModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  focusGuideModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  focusGuideModalClose: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 2,
  },
  focusGuideModalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  focusGuideModalTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 20,
  },
  focusGuideModalHeaderIcon: {
    width: 68,
    height: 68,
    marginBottom: 12,
  },
  focusGuideScroll: {
    flex: 1,
  },
  focusGuideScrollContent: {
    padding: 24,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 14,
  },
  focusGuideModalTitle: {
    ...HeadingStyle,
    fontSize: 24,
    fontWeight: '700',
    color: '#342846',
    textAlign: 'center',
    marginBottom: 8,
  },
  focusGuideModalSubtitle: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    textAlign: 'center',
    lineHeight: 20,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 4,
  },
  focusGuideQuickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  focusGuideQuickCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    minHeight: 120,
  },
  focusGuideQuickTitle: {
    ...HeadingStyle,
    fontSize: 14,
    color: '#342846',
    marginBottom: 6,
  },
  focusGuideQuickText: {
    ...BodyStyle,
    fontSize: 12,
    color: '#5B536B',
    lineHeight: 18,
  },
  focusGuideTipCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE8D6',
    padding: 14,
  },
  focusGuideTipTitle: {
    ...HeadingStyle,
    fontSize: 14,
    color: '#342846',
    marginBottom: 6,
    textAlign: 'left',
  },
  focusGuideTipText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#5B536B',
    lineHeight: 20,
  },
  focusGuideSection: {
    ...HeadingStyle,
    fontSize: 18,
    lineHeight: 24,
    color: '#342846',
    marginTop: 20,
    marginBottom: 8,
  },
  focusGuideSoundTitle: {
    ...HeadingStyle,
    fontSize: 17,
    lineHeight: 22,
    color: '#342846',
    marginTop: 14,
    marginBottom: 6,
  },
  focusGuideBody: {
    ...BodyStyle,
    color: '#342846',
    marginBottom: 10,
  },
  ambientSoundCaptionOnCard: {
    color: '#342846',
    lineHeight: 20,
    marginTop: 2,
    marginBottom: 12,
  },
  ambientSoundSwitchLabelOnCard: {
    color: 'rgba(52, 40, 70, 0.9)',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  focusHeaderBlock: {
    alignItems: 'center',
    marginTop: 89,
    marginBottom: 4,
    paddingHorizontal: 10,
    zIndex: 30,
    elevation: 30,
  },
  focusHeading: {
    ...HeadingStyle,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 0,
  },
  focusSubtitlePrimary: {
    ...BodyStyle,
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: Platform.isPad ? 350 : width - 24,
    alignSelf: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 20,
    paddingVertical: 10,
    minHeight: 80,
    zIndex: 1, // Ensure timer is above trees
  },
  timerText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 48,
    lineHeight: 56,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  atlasPopupContainer: {
    position: 'absolute',
    bottom: 120, // 20px above timer (timer is at bottom: 20, minHeight: 80, so 20 + 80 + 20 = 120)
    right: 0,
    zIndex: 100,
  },
  atlasPopup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 20,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 220,
  },
  atlasPopupAvatar: {
    width: 34,
    height: 34,
    marginRight: 10,
  },
  atlasPopupTextWrap: {
    flex: 1,
  },
  atlasPopupTitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.75,
    marginBottom: 2,
  },
  atlasPopupText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    opacity: 0.75,
  },
  durationSelectionFrame: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 40,
    padding: 32,
    paddingVertical: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
    marginBottom: 10,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 14,
    minHeight: 220,
    overflow: 'hidden',
  },
  durationSelectionFrameCompact: {
    minHeight: 180,
  },
  durationSelectionFrameTablet: {
    width: '70%',
    alignSelf: 'center',
    marginHorizontal: 0,
  },
  selectDurationText: {
    fontFamily: 'AnonymousPro-Regular',
    color: '#342846',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 0,
    marginTop: 0,
    letterSpacing: 0.5,
  },
  /** Small phones (e.g. iPhone 16e): match "Sound on" visual hierarchy. */
  selectDurationTextCompact: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  sliderContainer: {
    height: 24,
    width: 256,
    alignSelf: 'center',
    marginTop: 22,
    marginBottom: 22,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderLine: {
    position: 'absolute',
    height: 2,
    width: '100%',
    backgroundColor: 'rgba(52, 40, 70, 0.3)',
    top: -39, // Moved up 50px (was 11, now -39)
  },
  sliderDot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fdc700',
    shadowColor: '#facd15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
    top: -48, // Moved up 50px to align with line (was 2, now -48)
    marginLeft: -10, // Center the dot on its position
  },
  sliderDotSelected: {
    shadowOpacity: 1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  sliderDotGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(253, 199, 0, 0.35)',
    shadowColor: '#fdc700',
    shadowOpacity: 0.9,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  sliderDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  timerOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 0,
    marginTop: 20,
  },
  timerOptionsContainerTablet: {
    justifyContent: 'center',
    width: 'auto',
    alignSelf: 'center',
    gap: 16,
    marginTop: 45,
  },
  timerOptionsContainerNarrow: {
    justifyContent: 'center',
    gap: 7,
  },
  timerOptionCircle: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.44)',
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 7,
  },
  timerOptionCircleTablet: {
    marginHorizontal: 0,
  },
  timerOptionCircleNarrow: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  timerOptionCircleNarrowSpacing: {
    marginHorizontal: 3.5,
  },
  timerOptionCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: 'rgba(255, 255, 255, 0.92)',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  timerOptionNumber: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 1,
    lineHeight: 24,
    textAlign: 'center',
    includeFontPadding: false,
    width: '100%',
  },
  timerOptionNumberNarrow: {
    fontSize: 21,
    lineHeight: 22,
  },
  timerOptionNumberSelected: {
    color: '#342846',
  },
  timerOptionLabel: {
    fontFamily: 'AnonymousPro-Bold',
    color: '#7a8a9a',
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 0.2,
    textTransform: 'capitalize',
    textAlign: 'center',
    includeFontPadding: false,
    width: '100%',
    marginTop: 0,
  },
  timerOptionLabelNarrow: {
    fontSize: 10,
    lineHeight: 11,
  },
  timerOptionLabelSelected: {
    color: '#7a8a9a',
  },
  startGrowingButton: {
    backgroundColor: '#342846',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
  },
  startGrowingButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
  },
  treeContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tentContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    height: '100%',
    top: 10,
    paddingTop: 0,
  },
  tentBlur: {
    position: 'absolute',
    width: 255,
    height: 255,
    borderRadius: 128,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    // Note: React Native doesn't support CSS blur directly, 
    // but we can use a semi-transparent background to simulate the effect
  },
  tentImage: {
    width: 340,
    height: 340,
    zIndex: 1,
  },
  centerPoint: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent', // Invisible, just for reference
    marginLeft: -2,
    marginTop: -2,
    zIndex: 0,
  },
  centerTreeContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: '50%',
    left: '50%',
    // All center trees grow from the same point
  },
  treeImage: {
    width: width * 0.6,
    height: width * 0.6,
    marginLeft: -width * 0.3, // Center horizontally
    marginTop: -width * 0.3, // Center vertically
  },
  oneTreeImage: {
    width: width * 0.7, // Larger than small tree
    height: width * 0.7,
    marginLeft: -width * 0.35, // Center horizontally
    marginTop: -width * 0.35, // Center vertically
  },
  sideTreeContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: '50%',
    // Left/right positioning handled by container styles
  },
  smallTreeLeftContainer: {
    left: '50%',
    marginLeft: -width * 0.5 - width * 0.15, // Closer to center, forming forest
  },
  smallTreeRightContainer: {
    left: '50%',
    marginLeft: width * 0.15, // Closer to center, forming forest
  },
  moreSmallTreeLeftContainer: {
    left: '50%',
    marginLeft: -width * 0.5 - width * 0.1, // Medium left, closer together
  },
  moreSmallTreeRightContainer: {
    left: '50%',
    marginLeft: width * 0.1, // Medium right, closer together
  },
  evenMoreSmallTreeLeftContainer: {
    left: '50%',
    marginLeft: -width * 0.5 - width * 0.2, // Left side, not too far
  },
  evenMoreSmallTreeRightContainer: {
    left: '50%',
    marginLeft: width * 0.2, // Right side, not too far
  },
  evenMoreSmallTreeCenterLeftContainer: {
    left: '50%',
    marginLeft: -width * 0.5 - width * 0.05, // Close left to center
  },
  smallTreeImage: {
    width: width * 0.25,
    height: width * 0.25,
    marginTop: -width * 0.125, // Center vertically
  },
  forestImage: {
    width: width * 0.9 * 1.27, // 27% bigger than before
    height: width * 0.9 * 1.27, // 27% bigger than before
    marginLeft: -width * 0.45 * 1.27, // Center horizontally (adjusted for new size)
    marginTop: -width * 0.45 * 1.27, // Center vertically (adjusted for new size)
  },
  deerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: '50%',
    left: 0, // Start at left edge, translateX will move it
    marginTop: -width * 0.2, // Center vertically (half of deer image height)
    zIndex: 10,
  },
  deerImage: {
    width: width * 0.32,
    height: width * 0.32,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    marginTop: -10,
  },
  confettiText: {
    fontSize: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 0,
    marginTop: 20,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#342846',
    borderRadius: 20, // More rounded (was 8)
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 12,
  },
  resetButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  doneButton: {
    flex: 1,
    borderRadius: 20, // More rounded (was 8)
    overflow: 'hidden',
    marginLeft: 12,
  },
  doneButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent to show forest animation with Atlas in background
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionPopup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#342846',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.85,
    maxWidth: 400,
  },
  completionPopupText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  completionPopupButton: {
    backgroundColor: '#342846',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionPopupButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // New Timer Screen Styles
  timerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20, // Minimum 20px padding to ensure text doesn't touch edges
    paddingBottom: 12,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  timerHeaderTitle: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timerCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 66,
    marginBottom: 16,
  },
  timerCircleOuter: {
    width: 324,
    height: 324,
    borderRadius: 162,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  timerCircleInner: {
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: 'rgba(186, 204, 215, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timerTreeContainer: {
    width: 162,
    height: 288,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -48,
  },
  timerTreeImage: {
    width: 162,
    height: 288,
  },
  timerSeedContainer: {
    width: 300, // Match inner circle width
    height: 300, // Match inner circle height
    borderRadius: 150,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timerSeedImage: {
    width: 300, // Match inner circle size
    height: 300, // Match inner circle size
  },
  timerSeedImageLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  stageBadge: {
    position: 'absolute',
    bottom: 22,
    backgroundColor: '#342846',
    borderRadius: 15,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 6,
    minWidth: 153,
  },
  stageBadgeText: {
    ...HeadingStyle,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'none',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(186, 204, 215, 0.2)',
    padding: 24,
    width: 300,
    alignSelf: 'center',
    marginBottom: 24,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    minHeight: 95, // Reduced height since timer is outside
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  statItem: {
    marginBottom: 0,
  },
  statItemLeft: {
    marginRight: 70, // 70px spacing between Height and Vitality
  },
  statItemRight: {
    marginLeft: 0,
  },
  statLabel: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#7a8a9a',
    textTransform: 'none',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    ...HeadingStyle,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#342846',
  },
  vitalityValue: {
    color: '#6b8e7f',
  },
  statUnit: {
    fontFamily: 'AnonymousPro-Bold',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7a8a9a',
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  timerDisplayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  timerDisplayText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 38,
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  timerDisplayTextCompact: {
    fontSize: 32,
  },
  timerButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 24,
    marginTop: 0,
    marginBottom: 8,
  },
  timerResetButton: {
    flex: 1,
    backgroundColor: '#342846',
    borderRadius: 20,
    paddingVertical: isNarrowScreen ? 10 : 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginRight: 12,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  timerResetButtonText: {
    ...BodyStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  timerDoneButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#342846',
    paddingVertical: isNarrowScreen ? 10 : 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginLeft: 12,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  timerDoneButtonText: {
    ...BodyStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#342846',
    marginLeft: 8,
  },
});
