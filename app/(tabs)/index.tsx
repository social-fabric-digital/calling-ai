import { GuideModal, shouldShowGuideOnStartup } from '@/components/GuideModal';
import HomeWalkthrough, { WalkthroughTargetRect } from '@/components/HomeWalkthrough';
import { MoodLoggedCard } from '@/components/MoodLoggedCard';
import { MoodSelector } from '@/components/MoodSelector';
import { FrostedCardLayer } from '@/components/FrostedCardLayer';
import AtlasChat from '@/components/screens/ChatScreen';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { trackReflectionEvent } from '@/utils/appTracking';
import { ChatMessage } from '@/utils/claudeApi';
import { getCachedAstrologyReport, getSunSign, getPersonalizedDailyInsight } from '@/utils/astrologyCache';
import { getTodaysMood, MoodEntry } from '@/utils/moodStorage';
import { trackDailyInsightViewAndMaybePromptReview } from '@/utils/storeReview';
import { isPremium as hasSubscriptionAccess } from '@/utils/subscription';
import { checkSubscriptionStatus, triggerPaywall } from '@/utils/superwall';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Dimensions, Image, ImageBackground, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const isTabletLayout = Platform.OS === 'ios' && (Platform.isPad || Math.max(width, height) >= 1000);
const ATLAS_CHAT_STORAGE_KEY = '@atlas_chat_messages';
const QUESTION_DAY_KEY = '@question_day';
const LAST_QUESTION_DATE_KEY = '@last_question_date';
const HOME_WALKTHROUGH_DONE_KEY = '@home_walkthrough_done';
const JUST_FINISHED_ONBOARDING_KEY = '@just_finished_onboarding';


export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  
  // Get translated questions from i18n
  const QUESTION_BANK = useMemo(() => {
    return t('home.questions', { returnObjects: true }) as string[];
  }, [t, i18n.language]);
  const walkthroughSteps = useMemo(
    () => [
      {
        key: 'cosmicInsight',
        title: isRussian ? 'ИНСАЙТ НА СЕГОДНЯ' : "TODAY'S INSIGHT",
        description: isRussian ? 'Ежедневная подсказка для фокуса.' : 'Daily guidance for focus.',
      },
      {
        key: 'clarityMap',
        title: isRussian ? 'КАРТА ЯСНОСТИ' : 'CLARITY MAP',
        description: isRussian ? 'Разбери мысли за 3 минуты.' : 'Sort your thoughts in 3 minutes.',
      },
      {
        key: 'progress',
        title: isRussian ? 'ПРОГРЕСС' : 'PROGRESS',
        description: isRussian ? 'Смотри свои серии и импульс.' : 'See your streak and momentum.',
      },
      {
        key: 'ikigai',
        title: isRussian ? 'КОМПАС ИКИГАЙ' : 'IKIGAI COMPASS',
        description: isRussian ? 'Вернись к своему предназначению.' : 'Reconnect with your purpose.',
      },
      {
        key: 'atlas',
        title: isRussian ? 'ЧАТ С АТЛАСОМ' : 'CHAT WITH ATLAS',
        description: isRussian ? 'Быстро разберись со стрессом.' : 'Get quick help with stress.',
      },
    ],
    [isRussian]
  );
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [moodSelected, setMoodSelected] = useState<string | null>(null);
  const [dailyAnswer, setDailyAnswer] = useState('');
  const [userName, setUserName] = useState<string>('');
  const trimmedUserName = userName.trim();
  const [goalTitle, setGoalTitle] = useState<string>('');
  const [goalStepLabel, setGoalStepLabel] = useState<string>('');
  const [goalStepNumber, setGoalStepNumber] = useState<number | undefined>(undefined);
  const [totalGoalSteps, setTotalGoalSteps] = useState<number | undefined>(undefined);
  const [answerCaptured, setAnswerCaptured] = useState(false);
  const [showEnvelope, setShowEnvelope] = useState(false);
  const [answerCapturedToday, setAnswerCapturedToday] = useState(false);
  const [questionDay, setQuestionDay] = useState<number>(1);
  const [currentQuestion, setCurrentQuestion] = useState<string>(QUESTION_BANK[0]);
  // Persist daily-answer state consistently across dev/prod so the question
  // does not reappear after submission on simulator reloads.
  const ignorePersistedDailyAnswerInDev = false;
  
  // Debug: Log current language and force re-render on language change
  useEffect(() => {
    console.log('HomeScreen - Current language:', i18n.language);
  }, [i18n.language]);
  
  // Update current question when language changes
  useEffect(() => {
    const questionIndex = questionDay - 1;
    if (QUESTION_BANK[questionIndex]) {
      setCurrentQuestion(QUESTION_BANK[questionIndex]);
    }
  }, [QUESTION_BANK, questionDay]);
  const scaleAnim = useState(new Animated.Value(1))[0];
  
  // Radiating effect state
  const [showRadiatingEffect, setShowRadiatingEffect] = useState(false);
  const [radiatingPosition, setRadiatingPosition] = useState({ x: 0, y: 0 });
  const moodButtonRefs = {
    progress: useRef<View>(null),
    finding: useRef<View>(null),
    stuck: useRef<View>(null),
  };
  const radiatingAnim1 = useRef(new Animated.Value(0)).current;
  const radiatingAnim2 = useRef(new Animated.Value(0)).current;
  const radiatingAnim3 = useRef(new Animated.Value(0)).current;
  const radiatingOpacity1 = useRef(new Animated.Value(1)).current;
  const radiatingOpacity2 = useRef(new Animated.Value(1)).current;
  const radiatingOpacity3 = useRef(new Animated.Value(1)).current;
  
  // Animated values for selected mood card colors
  const moodCardBackgroundAnim = useRef(new Animated.Value(0)).current; // 0 = purple, 1 = white
  const moodCardTextAnim = useRef(new Animated.Value(0)).current; // 0 = white, 1 = purple
  
  // Astrology report state
  const [showAstrologyModal, setShowAstrologyModal] = useState(false);
  const [astrologyReport, setAstrologyReport] = useState<string>('');
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [queueSkipped, setQueueSkipped] = useState(false);
  
  // Mood tracking state
  const [todaysMood, setTodaysMood] = useState<MoodEntry | null>(null);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [isSliderInteracting, setIsSliderInteracting] = useState(false);
  const [headerContentHeight, setHeaderContentHeight] = useState(0);
  
  // Guide modal state
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showHomeWalkthrough, setShowHomeWalkthrough] = useState(false);
  const [walkthroughStepIndex, setWalkthroughStepIndex] = useState(0);
  const [walkthroughTargetRect, setWalkthroughTargetRect] = useState<WalkthroughTargetRect | null>(null);

  const cosmicInsightRef = useRef<View>(null);
  const clarityMapRef = useRef<View>(null);
  const progressRef = useRef<View>(null);
  const ikigaiRef = useRef<View>(null);
  const atlasRef = useRef<View>(null);
  const homeScrollRef = useRef<ScrollView>(null);
  
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueStartTimeRef = useRef<number | null>(null);
  const insightRequestIdRef = useRef(0);
  const [showAtlasChat, setShowAtlasChat] = useState(false);
  
  // Animated values for rectangle button press effects
  const cosmicInsightScale = useRef(new Animated.Value(1)).current;
  const clarityMapScale = useRef(new Animated.Value(1)).current;
  const progressScale = useRef(new Animated.Value(1)).current;
  const ikigaiScale = useRef(new Animated.Value(1)).current;
  
  // Keyboard-like press animation function
  const handleRectanglePress = (scaleAnim: Animated.Value, callback: () => void) => {
    // Dip down animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95, // Dip down 5%
        duration: 100,
        useNativeDriver: true,
      }),
      // Bounce back up with spring
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Execute the callback after a short delay
    setTimeout(() => {
      callback();
    }, 150);
  };
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'atlas' | 'user'; text: string; timestamp?: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [birthMonth, setBirthMonth] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');
  const [birthCity, setBirthCity] = useState<string>('');
  const [birthHour, setBirthHour] = useState<string>('');
  const [birthMinute, setBirthMinute] = useState<string>('');
  const [birthPeriod, setBirthPeriod] = useState<string>('');
  const [birthLatitude, setBirthLatitude] = useState<string>('');
  const [birthLongitude, setBirthLongitude] = useState<string>('');
  const [birthTimezone, setBirthTimezone] = useState<string>('');
  const [currentTimezone, setCurrentTimezone] = useState<string>('');
  const [insightProfileMessage, setInsightProfileMessage] = useState<string>('');
  
  // Space animation refs
  const starAnimations = useRef(
    Array.from({ length: 50 }, () => ({
      opacity: new Animated.Value(Math.random() * 0.5 + 0.3),
      scale: new Animated.Value(Math.random() * 0.5 + 0.5),
      x: Math.random() * width,
      y: Math.random() * height,
    }))
  ).current;
  
  // Create shooting stars with even distribution - one of each type per pattern
  // Ensure no repeating patterns next to each other
  const shootingStarAnimations = useRef(
    (() => {
      const starTypes = ['comet', 'star', 'stars'];
      const stars: any[] = [];
      const totalStars = 9; // Multiple of 3 for even distribution
      
      // Distribute stars evenly across the screen
      const sectionsX = 3; // Divide screen into 3 horizontal sections
      const sectionsY = 3; // Divide screen into 3 vertical sections
      
      for (let i = 0; i < totalStars; i++) {
        const typeIndex = i % starTypes.length; // Cycle through types: comet, star, stars, comet, star, stars...
        const type = starTypes[typeIndex];
        
        // Calculate position in grid to spread them out
        const sectionX = (i % sectionsX);
        const sectionY = Math.floor(i / sectionsX);
        
        // Add randomness within each section to avoid exact grid pattern
        const xVariation = (Math.random() - 0.5) * (width / sectionsX * 0.6);
        const yVariation = (Math.random() - 0.5) * (height / sectionsY * 0.6);
        
        const x = (sectionX * (width / sectionsX)) + (width / sectionsX / 2) + xVariation;
        const y = (sectionY * (height * 0.5 / sectionsY)) + (height * 0.5 / sectionsY / 2) + yVariation;
        
        stars.push({
          translateX: new Animated.Value(0),
          translateY: new Animated.Value(0),
          opacity: new Animated.Value(0),
          scale: new Animated.Value(Math.random() * 0.4 + 0.3), // Smaller scale (0.3 to 0.7)
          rotation: new Animated.Value(0),
          type: type,
          x: x,
          y: y,
        });
      }
      
      return stars;
    })()
  ).current;

  // Pulsating stars - different animation type
  const pulsatingStarAnimations = useRef(
    Array.from({ length: 6 }, () => {
      const starTypes = ['comet', 'star', 'stars'];
      const randomType = starTypes[Math.floor(Math.random() * starTypes.length)];
      return {
        opacity: new Animated.Value(0.3),
        scale: new Animated.Value(0.5),
        x: Math.random() * width,
        y: Math.random() * height,
        type: randomType,
      };
    })
  ).current;
  
  // Animation refs for envelope transformation
  const envelopeAnim = useRef(new Animated.Value(1)).current;
  const envelopeTranslateX = useRef(new Animated.Value(0)).current;
  const envelopeTranslateY = useRef(new Animated.Value(0)).current;
  const envelopeRotation = useRef(new Animated.Value(0)).current;
  const envelopeOpacity = useRef(new Animated.Value(1)).current;
  const fieldOpacity = useRef(new Animated.Value(1)).current;
  const questionOpacity = useRef(new Animated.Value(1)).current;
  
  // Confetti pieces
  const confettiPieces = useRef(
    Array.from({ length: 15 }, () => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      rotation: new Animated.Value(0),
      startX: Math.random() * width,
      startY: Math.random() * (height * 0.3) + height * 0.1,
    }))
  ).current;
  
  // Debounce timer for detecting when user finishes typing
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedDailyQuestionLayoutRef = useRef(false);

  // Load user name, question day, and check if answer was captured today
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Load user name
        const name = await AsyncStorage.getItem('userName');
        if (name) {
          setUserName(name);
        }
        
        // Load active goal title
        const goalsData = await AsyncStorage.getItem('userGoals');
        if (goalsData) {
          const goals = JSON.parse(goalsData);
          const activeGoal = goals.find((g: any) => g.isActive === true);
          if (activeGoal) {
            setGoalTitle(activeGoal.name);
            const steps = Array.isArray(activeGoal.steps) ? activeGoal.steps : [];
            const totalSteps = steps.length > 0 ? Math.min(steps.length, 4) : 4;
            const stepIndex =
              typeof activeGoal.currentStepIndex === 'number' ? activeGoal.currentStepIndex : -1;
            const isCompleted = stepIndex >= totalSteps - 1;
            const currentStepNumber = isCompleted
              ? totalSteps
              : Math.min(Math.max(stepIndex + 2, 1), totalSteps);

            setTotalGoalSteps(totalSteps);
            setGoalStepNumber(currentStepNumber);

            const stepName =
              steps[currentStepNumber - 1]?.name || steps[currentStepNumber - 1]?.text || '';
            if (stepName) {
              setGoalStepLabel(stepName);
            }
          }
        }
        
        // Load birth date information
        const month = await AsyncStorage.getItem('birthMonth');
        const date = await AsyncStorage.getItem('birthDate');
        const year = await AsyncStorage.getItem('birthYear');
        const city = await AsyncStorage.getItem('birthCity');
        const hour = await AsyncStorage.getItem('birthHour');
        const minute = await AsyncStorage.getItem('birthMinute');
        const period = await AsyncStorage.getItem('birthPeriod');
        const latitude = await AsyncStorage.getItem('birthLatitude');
        const longitude = await AsyncStorage.getItem('birthLongitude');
        const storedBirthTimezone = await AsyncStorage.getItem('birthTimezone');
        const storedCurrentTimezone = await AsyncStorage.getItem('currentTimezone');
        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        
        if (month) setBirthMonth(month);
        if (date) setBirthDate(date);
        if (year) setBirthYear(year);
        if (city) setBirthCity(city);
        if (hour) setBirthHour(hour);
        if (minute) setBirthMinute(minute);
        if (period) setBirthPeriod(period);
        if (latitude) setBirthLatitude(latitude);
        if (longitude) setBirthLongitude(longitude);
        if (storedBirthTimezone) setBirthTimezone(storedBirthTimezone);
        const effectiveCurrentTimezone = storedCurrentTimezone || deviceTimezone;
        if (effectiveCurrentTimezone) {
          setCurrentTimezone(effectiveCurrentTimezone);
          await AsyncStorage.setItem('currentTimezone', effectiveCurrentTimezone);
        }
        
        // Load question day and last question date
        const storedDay = await AsyncStorage.getItem(QUESTION_DAY_KEY);
        const lastQuestionDate = await AsyncStorage.getItem(LAST_QUESTION_DATE_KEY);
        const today = new Date().toDateString();
        
        let currentDay = 1;
        if (storedDay) {
          currentDay = parseInt(storedDay, 10);
        }
        
        // Check if it's a new day
        if (lastQuestionDate !== today) {
          // New day - increment question day (cycle through 40 questions)
          currentDay = currentDay >= 40 ? 1 : currentDay + 1;
          await AsyncStorage.setItem(QUESTION_DAY_KEY, currentDay.toString());
          await AsyncStorage.setItem(LAST_QUESTION_DATE_KEY, today);
        }
        
        setQuestionDay(currentDay);
        // Set current question (day 1 = index 0, day 2 = index 1, etc.)
        const questionIndex = currentDay - 1;
        setCurrentQuestion(QUESTION_BANK[questionIndex]);
        
        // Check if answer was already captured today and persist hidden state.
        const lastAnswerDate = await AsyncStorage.getItem('lastAnswerDate');
        if (!ignorePersistedDailyAnswerInDev && lastAnswerDate === today) {
          setAnswerCapturedToday(true);
          setAnswerCaptured(true);
          setShowEnvelope(false);
        } else {
          setAnswerCapturedToday(false);
          setAnswerCaptured(false);
          setShowEnvelope(false);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

  // Check if mood was already logged today
  useEffect(() => {
    const checkTodaysMood = async () => {
      try {
        const mood = await getTodaysMood();
        if (mood) {
          setTodaysMood(mood);
          setShowMoodSelector(false);
        } else {
          setTodaysMood(null);
          setShowMoodSelector(true);
        }
      } catch (error) {
        console.error('Error checking today\'s mood:', error);
        setShowMoodSelector(true);
      }
    };
    checkTodaysMood();
  }, []);

  // Callback when mood is saved from MoodSelector
  const handleMoodSaved = async () => {
    const mood = await getTodaysMood();
    if (mood) {
      setTodaysMood(mood);
      setShowMoodSelector(false);
    }
  };

  // Callback when user wants to update their mood
  const handleUpdateMood = () => {
    setShowMoodSelector(true);
  };

  // Check if guide should be shown on startup (only once, initially)
  useEffect(() => {
    const checkGuide = async () => {
      try {
        const justFinishedOnboarding = await AsyncStorage.getItem(JUST_FINISHED_ONBOARDING_KEY);
        if (justFinishedOnboarding === 'true') {
          return;
        }

        // Check if guide has been shown before
        const guideShownBefore = await AsyncStorage.getItem('@guide_shown_before');
        const shouldShow = await shouldShowGuideOnStartup();
        
        // Only show if it hasn't been shown before AND user hasn't dismissed it
        if (!guideShownBefore && shouldShow) {
          // Delay slightly so the home screen loads first
          setTimeout(() => {
            setShowGuideModal(true);
            // Mark that guide has been shown
            AsyncStorage.setItem('@guide_shown_before', 'true');
          }, 500);
        }
      } catch (error) {
        console.error('Error checking guide:', error);
      }
    };
    checkGuide();
  }, []);

  // Show guided walkthrough after onboarding completion
  useEffect(() => {
    const checkHomeWalkthrough = async () => {
      try {
        const [justFinishedOnboarding, walkthroughDone] = await AsyncStorage.multiGet([
          JUST_FINISHED_ONBOARDING_KEY,
          HOME_WALKTHROUGH_DONE_KEY,
        ]);

        const justFinished = justFinishedOnboarding[1] === 'true';
        const done = walkthroughDone[1] === 'true';

        if (justFinished && done) {
          await AsyncStorage.removeItem(JUST_FINISHED_ONBOARDING_KEY);
          return;
        }

        if (justFinished && !done) {
          setTimeout(() => {
            setWalkthroughStepIndex(0);
            setShowHomeWalkthrough(true);
          }, 700);
        }
      } catch (error) {
        console.error('Error checking home walkthrough:', error);
      }
    };
    checkHomeWalkthrough();
  }, []);

  // Re-measure highlight target whenever walkthrough step changes
  useEffect(() => {
    if (!showHomeWalkthrough) return;
    const step = walkthroughSteps[walkthroughStepIndex];
    if (!step) return;
    measureWalkthroughTarget(step.key);
  }, [showHomeWalkthrough, walkthroughStepIndex, walkthroughSteps, headerContentHeight]);

  // Debug: Log when astrology report state changes
  useEffect(() => {
    try {
      console.log('astrologyReport state changed:', {
        hasReport: !!astrologyReport,
        reportLength: astrologyReport?.length || 0,
        isLoading: isLoadingReport,
        showModal: showAstrologyModal,
      });
    } catch (error) {
      console.error('Error logging astrology report state:', error);
    }
  }, [astrologyReport, isLoadingReport, showAstrologyModal]);

  // Animate stars twinkling
  useEffect(() => {
    if (!showAstrologyModal) return;

    try {
      const twinkleAnimations = starAnimations.map((star) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(star.opacity, {
              toValue: Math.random() * 0.5 + 0.5,
              duration: Math.random() * 2000 + 1000,
              useNativeDriver: true,
            }),
            Animated.timing(star.opacity, {
              toValue: Math.random() * 0.3 + 0.2,
              duration: Math.random() * 2000 + 1000,
              useNativeDriver: true,
            }),
          ])
        );
      });

      const scaleAnimations = starAnimations.map((star) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(star.scale, {
              toValue: Math.random() * 0.3 + 0.7,
              duration: Math.random() * 1500 + 800,
              useNativeDriver: true,
            }),
            Animated.timing(star.scale, {
              toValue: Math.random() * 0.5 + 0.5,
              duration: Math.random() * 1500 + 800,
              useNativeDriver: true,
            }),
          ])
        );
      });

      const allAnimations = Animated.parallel([...twinkleAnimations, ...scaleAnimations]);
      allAnimations.start();

      return () => {
        try {
          allAnimations.stop();
        } catch (error) {
          // Ignore cleanup errors
        }
      };
    } catch (error) {
      console.error('Error setting up star animations:', error);
      return undefined;
    }
  }, [showAstrologyModal]);

  // Animate pulsating stars
  useEffect(() => {
    if (!showAstrologyModal) return;

    try {
      const pulseAnimations: Animated.CompositeAnimation[] = [];
      
      const animatePulsatingStars = () => {
        pulsatingStarAnimations.forEach((star: any) => {
          // Create pulsating animation
          const pulseAnimation = Animated.loop(
            Animated.sequence([
              Animated.parallel([
                Animated.timing(star.opacity, {
                  toValue: 1,
                  duration: 1500 + Math.random() * 1000,
                  useNativeDriver: true,
                }),
                Animated.timing(star.scale, {
                  toValue: 1.2,
                  duration: 1500 + Math.random() * 1000,
                  useNativeDriver: true,
                }),
              ]),
              Animated.parallel([
                Animated.timing(star.opacity, {
                  toValue: 0.3,
                  duration: 1500 + Math.random() * 1000,
                  useNativeDriver: true,
                }),
                Animated.timing(star.scale, {
                  toValue: 0.5,
                  duration: 1500 + Math.random() * 1000,
                  useNativeDriver: true,
                }),
              ]),
            ])
          );
          pulseAnimation.start();
          pulseAnimations.push(pulseAnimation);
        });
      };

      animatePulsatingStars();

      return () => {
        try {
          pulseAnimations.forEach(anim => {
            try {
              anim.stop();
            } catch (e) {
              // Ignore individual stop errors
            }
          });
        } catch (error) {
          // Ignore cleanup errors
        }
      };
    } catch (error) {
      console.error('Error setting up pulsating star animations:', error);
      return undefined;
    }
  }, [showAstrologyModal]);

  // Animate shooting stars
  useEffect(() => {
    if (!showAstrologyModal) return;

    const createShootingStar = (index: number) => {
      // Stagger delays more to avoid patterns
      const delay = index * 2000 + Math.random() * 3000;
      
      setTimeout(() => {
        // Use the pre-distributed y position for starting point
        const star = shootingStarAnimations[index];
        const startX = -50;
        const startY = star.y || Math.random() * height * 0.6; // Use distributed y position
        const endX = width + 50;
        // Vary the end Y to create diagonal movement, but keep it spread out
        const endY = startY + Math.random() * 200 + 100;
        const size = Math.random() * 0.4 + 0.3; // Smaller size (0.3 to 0.7)
        const rotation = Math.random() * 360;

        shootingStarAnimations[index].opacity.setValue(0);
        shootingStarAnimations[index].translateX.setValue(startX);
        shootingStarAnimations[index].translateY.setValue(startY);
        shootingStarAnimations[index].scale.setValue(size);
        if (shootingStarAnimations[index].rotation) {
          shootingStarAnimations[index].rotation.setValue(rotation);
        }

        Animated.sequence([
          Animated.parallel([
            Animated.timing(shootingStarAnimations[index].opacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(shootingStarAnimations[index].translateX, {
              toValue: endX,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(shootingStarAnimations[index].translateY, {
              toValue: endY,
              duration: 2000,
              useNativeDriver: true,
            }),
            shootingStarAnimations[index].rotation ? Animated.timing(shootingStarAnimations[index].rotation, {
              toValue: rotation + 180,
              duration: 2000,
              useNativeDriver: true,
            }) : Animated.timing(shootingStarAnimations[index].opacity, {
              toValue: 1,
              duration: 1,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(shootingStarAnimations[index].opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Restart after a delay
          setTimeout(() => createShootingStar(index), Math.random() * 4000 + 2000);
        });
      }, delay);
    };

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    shootingStarAnimations.forEach((_, index) => {
      const timeout = setTimeout(() => createShootingStar(index), index * 1500);
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [showAstrologyModal]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  // Smoothly animate layout when daily question/envelope state changes.
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (!hasMountedDailyQuestionLayoutRef.current) {
      hasMountedDailyQuestionLayoutRef.current = true;
      return;
    }
    LayoutAnimation.configureNext(
      LayoutAnimation.create(280, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    );
  }, [showEnvelope, answerCapturedToday]);

  // Handle answer input change with debounce
  const handleAnswerChange = (text: string) => {
    setDailyAnswer(text);
    
    // Clear existing timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    
    // If text is empty, reset captured state
    if (!text.trim()) {
      setAnswerCaptured(false);
      setShowEnvelope(false);
      return;
    }
    
    // Don't auto-save - only save when user clicks "Save Entry" button
  };

  // Capture answer and trigger animations
  const captureAnswer = async () => {
    if (answerCaptured) return;
    const normalizedAnswer = dailyAnswer.trim();
    if (!normalizedAnswer) return;
    
    setAnswerCaptured(true);
    
    // Trigger confetti animation
    triggerConfetti();
    
    // After confetti starts, transform to envelope and fly away
    setTimeout(() => {
      transformToEnvelope();
    }, 500);
    
    // Save the answer date to AsyncStorage after animation starts
    // (but don't set answerCapturedToday yet - let animation play first)
    try {
      const today = new Date().toDateString();
      const todayISO = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      await AsyncStorage.setItem('lastAnswerDate', today);
      await AsyncStorage.setItem('lastAnswer', normalizedAnswer);
      
      // Save to userAnswers array for the "Me" screen
      const answersData = await AsyncStorage.getItem('userAnswers');
      const answers = answersData ? JSON.parse(answersData) : [];
      
      // Check if there's already an answer for today
      const todayAnswerIndex = answers.findIndex((a: any) => a.date === todayISO);
      
      const questionText = currentQuestion;
      
      if (todayAnswerIndex >= 0) {
        // Update existing answer
        answers[todayAnswerIndex].answer = normalizedAnswer;
        answers[todayAnswerIndex].question = questionText;
      } else {
        // Add new answer
        const newAnswer = {
          date: todayISO,
          question: questionText,
          answer: normalizedAnswer,
        };
        answers.unshift(newAnswer); // Add to beginning
        // Keep only last 100 answers
        if (answers.length > 100) {
          answers.splice(100);
        }
      }
      
      await AsyncStorage.setItem('userAnswers', JSON.stringify(answers));
      await trackReflectionEvent('weekly_question_answered', { dedupeByDay: true });
      
      // Save to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const todayISO = new Date().toISOString().split('T')[0];
          // Check if there's already an entry for today
          const { data: existing } = await supabase
            .from('daily_answers')
            .select('id')
            .eq('user_id', user.id)
            .gte('created_at', todayISO + 'T00:00:00')
            .lt('created_at', todayISO + 'T23:59:59')
            .maybeSingle();
          
          if (existing) {
            await supabase.from('daily_answers').update({
              question_text: questionText,
              answer_text: normalizedAnswer,
            }).eq('id', existing.id);
          } else {
            await supabase.from('daily_answers').insert({
              user_id: user.id,
              question_text: questionText,
              answer_text: normalizedAnswer,
            });
          }
        }
      } catch (err) {
        console.error('Supabase daily answer save error:', err);
      }
      
      // Update streak and check for badges
      await updateStreakAndBadges();
    } catch (error) {
      console.error('Error saving answer date:', error);
    }
  };

  // Trigger confetti animation
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

      // Random movement direction
      const moveX = (Math.random() - 0.5) * 200;
      const moveY = (Math.random() - 0.5) * 200;

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

  // Format report text with proper heading styles
  const formatReportText = (text: string) => {
    try {
      if (!text || typeof text !== 'string') {
        console.error('formatReportText: Invalid text input', text);
        return <Text style={styles.reportBodyText}>{tr('Report unavailable.', 'Отчет недоступен.')}</Text>;
      }

      // Remove all asterisks from the text
      const cleanedText = text.replace(/\*\*/g, '').replace(/\*/g, '');
      const lines = cleanedText.split('\n');

      let todayDateStr = '';
      try {
        const today = new Date();
        todayDateStr = today.toLocaleDateString(i18n.language || 'en', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } catch (dateError) {
        console.error('Error formatting date:', dateError);
        todayDateStr = new Date().toLocaleDateString('en', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }

      let detectedDate: string | null = null;
      const sections: Array<{ heading: string; paragraphs: string[] }> = [];
      let currentSection: { heading: string; paragraphs: string[] } = { heading: '', paragraphs: [] };

      const pushCurrentSection = () => {
        const hasContent = currentSection.heading || currentSection.paragraphs.some((p) => p.trim());
        if (hasContent) {
          sections.push({
            heading: currentSection.heading || tr('Insight', 'Инсайт'),
            paragraphs: currentSection.paragraphs,
          });
        }
        currentSection = { heading: '', paragraphs: [] };
      };

      const sectionHeadingPairs = [
        { en: 'your cosmic shield for today', ru: 'твой космический щит на сегодня' },
        { en: 'what the universe wants you to know', ru: 'что вселенная хочет, чтобы ты знал(а)' },
        { en: 'what the universe wants you to know', ru: 'что вселенная хочет, чтобы ты знал' },
        { en: 'your protected windows', ru: 'твои защищённые окна' },
        { en: 'your protected windows', ru: 'твои защищенные окна' },
        { en: "tonight's gentle landing", ru: 'мягкое завершение вечера' },
        { en: 'your anchor for today', ru: 'твой якорь на сегодня' },
      ];

      const normalizeSectionKey = (value: string) =>
        value
          .toLowerCase()
          .replace(/\*\*/g, '')
          .replace(/[#:.,!?()[\]{}"'`]/g, ' ')
          .replace(/[—–-]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/ё/g, 'е')
          .trim();

      const findSectionHeading = (line: string) => {
        const normalizedLine = normalizeSectionKey(line);
        return sectionHeadingPairs.find(
          ({ en, ru }) => {
            const enKey = normalizeSectionKey(en);
            const ruKey = normalizeSectionKey(ru);
            return (
              normalizedLine === enKey ||
              normalizedLine.startsWith(enKey) ||
              normalizedLine.includes(enKey) ||
              normalizedLine === ruKey ||
              normalizedLine.startsWith(ruKey) ||
              normalizedLine.includes(ruKey)
            );
          }
        );
      };

      // Helper function to check if a line is a section heading
      const isSectionHeading = (line: string): boolean => Boolean(findSectionHeading(line));

      const getLocalizedSectionHeading = (heading: string): string => {
        const normalized = normalizeSectionKey(heading);
        if (normalized.includes('cosmic shield') || normalized.includes('космический щит')) {
          return tr('Your Cosmic Shield for Today', 'Твой Космический Щит на Сегодня');
        }
        if (normalized.includes('universe wants') || normalized.includes('вселенная')) {
          return tr('What the Universe Wants You to Know', 'Что Вселенная Хочет, Чтобы Ты Знал(а)');
        }
        if (normalized.includes('protected windows') || normalized.includes('защищ')) {
          return tr('Your Protected Windows', 'Твои Защищённые Окна');
        }
        if (normalized.includes('gentle landing') || normalized.includes('завершение вечера')) {
          return tr("Tonight's Gentle Landing", 'Мягкое Завершение Вечера');
        }
        if (normalized.includes('anchor') || normalized.includes('якорь')) {
          return tr('Your Anchor for Today', 'Твой Якорь на Сегодня');
        }
        return heading;
      };
      
      // Helper function to check if a line is the main title
      const isMainTitle = (line: string): boolean => {
        const normalizedLine = line.trim().toLowerCase();
        return normalizedLine.includes(tr('cosmic weather for today', 'космическая погода на сегодня'));
      };

      const getSectionEmoji = (heading: string) => {
        const normalized = normalizeSectionKey(heading);
        if (normalized.includes('shield') || normalized.includes('щит')) return '🛡️';
        if (normalized.includes('universe wants') || normalized.includes('вселенная')) return '⚠️';
        if (normalized.includes('protected windows') || normalized.includes('защищенные окна')) return '⏰';
        if (normalized.includes('gentle landing') || normalized.includes('завершение вечера')) return '🌙';
        if (normalized.includes('anchor') || normalized.includes('якорь')) return '🧘';
        return '✨';
      };

      const shouldHideSection = (): boolean => false;

      const extractTimeReference = (paragraph: string): { time: string | null; text: string } => {
        const rangeRegex = /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\s*[-–]\s*\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/i;
        const singleRegex = /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/i;

        const match = paragraph.match(rangeRegex) || paragraph.match(singleRegex);
        if (!match || match.index === undefined) {
          return { time: null, text: paragraph };
        }

        const start = match.index;
        const end = start + match[0].length;
        const cleaned = `${paragraph.slice(0, start)} ${paragraph.slice(end)}`
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/^[-:–]\s*/, '');

        return { time: match[0].toUpperCase(), text: cleaned };
      };

      const splitIntoSentences = (value: string): string[] =>
        value
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter(Boolean);

      const hasAstroJargon = (sentence: string): boolean =>
        /\b(saturn|jupiter|mars|venus|mercury|pluto|uranus|neptune|transit|retrograde|aspect|conjunction|opposition|trine|sextile|natal|moon in|sun in|rising sign|ascendant|house\b|planetary|waxing moon|waning moon|growing moon)\b/i.test(
          sentence
        );

      // Enforce direct, practical copy in the UI even if model output is verbose.
      const sanitizeReportParagraph = (paragraph: string): string => {
        const sentences = splitIntoSentences(paragraph);
        if (sentences.length === 0) return paragraph.trim();

        const practicalSentences = sentences.filter((s) => !hasAstroJargon(s));
        const trimmed = practicalSentences.slice(0, 2);

        if (trimmed.length === 0) {
          return tr(
            'Focus on one clear priority today and keep your communication simple.',
            'Сфокусируйся сегодня на одном четком приоритете и говори проще.'
          );
        }

        return trimmed.join(' ').replace(/\s+/g, ' ').trim();
      };

      lines.forEach((line, index) => {
        try {
          const trimmedLine = line.trim();

          // Keep paragraph spacing inside the current section
          if (!trimmedLine) {
            if (currentSection.paragraphs.length > 0 && currentSection.paragraphs[currentSection.paragraphs.length - 1] !== '') {
              currentSection.paragraphs.push('');
            }
            return;
          }

          // Remove the top "Today's cosmic weather..." title entirely
          if (isMainTitle(trimmedLine)) {
            return;
          }

          // Capture date line if present
          if (!detectedDate && (index === 0 || (todayDateStr && trimmedLine.includes(todayDateStr)) || trimmedLine.match(/^\w+day, \w+ \d+, \d{4}$/))) {
            detectedDate = todayDateStr && trimmedLine.includes(todayDateStr) ? trimmedLine : todayDateStr;
            return;
          }

          // Check if this is a section heading
          if (isSectionHeading(trimmedLine)) {
            pushCurrentSection();
            currentSection.heading = trimmedLine.split(':')[0].trim();
            return;
          }

          // Regular text
          const cleanText = trimmedLine.replace(/\*\*/g, '').replace(/\*/g, '');

          if (!currentSection.heading && sections.length === 0) {
            currentSection.heading = tr('Insight', 'Инсайт');
          }
          currentSection.paragraphs.push(cleanText);
        } catch (lineError) {
          console.error(`Error processing line ${index}:`, lineError);
          // Skip problematic lines
        }
      });

      pushCurrentSection();

      if (!detectedDate && todayDateStr) {
        detectedDate = todayDateStr;
      }

      const summaryLine = tr(
        'In short: today is best for focused and mindful action.',
        'Коротко: сегодня тебе лучше всего подойдет сфокусированное и осознанное действие.'
      );

      return (
        <View>
          {detectedDate ? (
            <Text style={styles.reportDateHeading}>{detectedDate}</Text>
          ) : null}

          <Text style={styles.reportSummaryLine}>{summaryLine}</Text>

          {sections.length > 0 ? (
            sections
              .filter((section) => !shouldHideSection(section.heading))
              .map((section, sectionIndex) => (
              <View key={`section-${sectionIndex}`} style={styles.reportSectionCard}>
                <View style={styles.reportSectionHeaderRow}>
                  <Text style={styles.reportSectionEmoji}>{getSectionEmoji(section.heading)}</Text>
                  <Text style={styles.reportSectionHeading}>{getLocalizedSectionHeading(section.heading)}</Text>
                </View>

                <View style={styles.reportSectionBody}>
                  {section.paragraphs.map((paragraph, paragraphIndex) => {
                    if (!paragraph.trim()) {
                      return <View key={`space-${sectionIndex}-${paragraphIndex}`} style={styles.reportParagraphSpacer} />;
                    }

                    const { time, text: paragraphText } = extractTimeReference(paragraph);
                    const cleanedParagraph = sanitizeReportParagraph(paragraphText);
                    const normalizedHeading = normalizeSectionKey(section.heading);
                    const isProtectedWindowsSection =
                      normalizedHeading.includes('protected windows') ||
                      normalizedHeading.includes('защищ');
                    const finalParagraph = isProtectedWindowsSection
                      ? cleanedParagraph
                          .replace(/[()]/g, '')
                          .replace(/\b(before|after)\b/gi, '')
                          .replace(/\s{2,}/g, ' ')
                          .replace(/\s+([:;,.!?])/g, '$1')
                          .trim()
                      : cleanedParagraph;
                    return (
                      <View key={`p-${sectionIndex}-${paragraphIndex}`} style={styles.reportParagraphBlock}>
                        {time ? <Text style={styles.reportTimeBadge}>{time}</Text> : null}
                        {finalParagraph ? <Text style={styles.reportBodyText}>{finalParagraph}</Text> : null}
                      </View>
                    );
                  })}
                </View>
              </View>
              ))
          ) : (
            <Text style={styles.reportBodyText}>{tr('Report unavailable.', 'Отчет недоступен.')}</Text>
          )}
        </View>
      );
    } catch (error) {
      console.error('Error in formatReportText:', error);
      return <Text style={styles.reportBodyText}>{tr('Error displaying report. Please try again.', 'Ошибка отображения отчета. Попробуй еще раз.')}</Text>;
    }
  };

  const handleClarityMapPress = async () => {
    try {
      router.push('/clarity-map');
    } catch (error) {
      console.error('Error accessing clarity map:', error);
    }
  };

  // Handle Cosmic Insight click
  const handleCosmicInsightClick = async () => {
    try {
      void trackDailyInsightViewAndMaybePromptReview();
      const requestId = ++insightRequestIdRef.current;
      // Get today's date for cache key
      const today = new Date();
      const todayKey = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const cacheKey = `daily-report-${todayKey}`;
      const insightLanguage: 'en' | 'ru' = i18n.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
      const premiumInsightCacheKey = `premium-daily-report-${insightLanguage}-${todayKey}`;
      
      console.log('🌟 Cosmic Insight clicked');
      console.log('📅 Today\'s date:', todayKey);
      console.log('🔑 Cache key:', cacheKey);
      console.log('📊 Birth data loaded:', {
        month: birthMonth,
        date: birthDate,
        year: birthYear,
        city: birthCity,
        hour: birthHour,
        minute: birthMinute,
        period: birthPeriod,
      });
      
      setShowAstrologyModal(true);
      setInsightProfileMessage('');
      setQueueSkipped(false);
      await trackReflectionEvent('cosmic_insight_opened');

      if (!birthMonth || !birthDate || !birthYear) {
        setInsightProfileMessage(
          tr(
            'Complete your profile for personalized insights (About You step). Showing a supportive insight for today.',
            'Заполни профиль для персонализированных инсайтов (шаг «О тебе»). Пока показываем поддерживающий инсайт на сегодня.'
          )
        );
      }
      
      // Note: Caching is now handled inside getPersonalizedDailyInsight()
      // The personalized function uses its own cache key based on birth data
      
      // Clear any existing timer
      if (queueTimerRef.current) {
        clearTimeout(queueTimerRef.current);
        queueTimerRef.current = null;
      }

      const userIsPremium = await (async () => {
        // Treat active free-trial users as premium access for insight queue skipping.
        const [superwallAccess, subscriptionAccess] = await Promise.all([
          checkSubscriptionStatus(),
          hasSubscriptionAccess(),
        ]);
        return superwallAccess || subscriptionAccess;
      })();

      if (userIsPremium) {
        const cachedPremiumInsight = await AsyncStorage.getItem(premiumInsightCacheKey);
        if (cachedPremiumInsight && cachedPremiumInsight.trim()) {
          setQueueSkipped(true);
          setIsLoadingReport(false);
          setAstrologyReport(cachedPremiumInsight);
          return;
        }

        setIsLoadingReport(true);
        setAstrologyReport('');
        setQueueSkipped(true);
        await generateReport(cacheKey, null, requestId, {
          persistPremiumCacheKey: premiumInsightCacheKey,
        });
        return;
      }

      // For free users: Start generating immediately but ensure loading shows for exactly 30 seconds
      setIsLoadingReport(true);
      setAstrologyReport('');
      const startTime = Date.now();
      queueStartTimeRef.current = startTime;
      
      // Start generating the report immediately (don't wait)
      generateReport(cacheKey, startTime, requestId).catch((error) => {
        console.error('Error generating report:', error);
        setIsLoadingReport(false);
        setAstrologyReport(tr('Failed to generate report. Please try again.', 'Не удалось создать отчет. Попробуй еще раз.'));
      });
    } catch (error) {
      console.error('Error in handleCosmicInsightClick:', error);
      setIsLoadingReport(false);
      setShowAstrologyModal(false);
      alert(tr('Something went wrong. Please try again.', 'Произошла ошибка. Попробуй еще раз.'));
    }
  };

  // Generate report function
  const generateReport = async (
    _cacheKey: string,
    startTime: number | null,
    requestId: number,
    options?: { persistPremiumCacheKey?: string }
  ) => {
    try {
      const isStaleRequest = () => requestId !== insightRequestIdRef.current;
      let report: string | null = null;
      const insightLanguage: 'en' | 'ru' = i18n.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';

      const [
        ikigaiWhatYouLove,
        ikigaiWhatYouGoodAt,
        ikigaiWhatWorldNeeds,
        ikigaiWhatCanBePaidFor,
        lifeContextSituation,
        lifeContextConstraint,
        lifeContextMatters,
        userGoalsRaw,
      ] = await Promise.all([
        AsyncStorage.getItem('ikigaiWhatYouLove'),
        AsyncStorage.getItem('ikigaiWhatYouGoodAt'),
        AsyncStorage.getItem('ikigaiWhatWorldNeeds'),
        AsyncStorage.getItem('ikigaiWhatCanBePaidFor'),
        AsyncStorage.getItem('lifeContextSituation'),
        AsyncStorage.getItem('lifeContextConstraint'),
        AsyncStorage.getItem('lifeContextMatters'),
        AsyncStorage.getItem('userGoals'),
      ]);

      let whatMattersMost: string[] = [];
      if (lifeContextMatters) {
        try {
          whatMattersMost = JSON.parse(lifeContextMatters);
        } catch (e) {
          console.warn('Failed to parse lifeContextMatters:', e);
        }
      }

      let goals: Array<{ title: string }> = [];
      if (userGoalsRaw) {
        try {
          const parsedGoals = JSON.parse(userGoalsRaw) as Array<{ name?: string; title?: string; isActive?: boolean }>;
          goals = (Array.isArray(parsedGoals) ? parsedGoals : [])
            .filter((goal) => goal.isActive !== false)
            .map((goal) => ({ title: goal.title || goal.name || '' }))
            .filter((goal) => goal.title.trim().length > 0);
        } catch (error) {
          console.warn('Failed to parse goals from storage:', error);
        }
      }

      const parsedLat = Number.parseFloat(birthLatitude || '');
      const parsedLon = Number.parseFloat(birthLongitude || '');

      const insightParams = {
        language: insightLanguage,
        userName: userName || undefined,
        birthMonth: birthMonth || '',
        birthDate: birthDate || '',
        birthYear: birthYear || '',
        birthCity: birthCity || undefined,
        birthHour: birthHour || undefined,
        birthMinute: birthMinute || undefined,
        birthPeriod: birthPeriod || undefined,
        birthLatitude: Number.isFinite(parsedLat) ? parsedLat : undefined,
        birthLongitude: Number.isFinite(parsedLon) ? parsedLon : undefined,
        birthTimezone: birthTimezone || undefined,
        currentTimezone: currentTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
        goals,
        ikigaiData: (ikigaiWhatYouLove || ikigaiWhatYouGoodAt || ikigaiWhatWorldNeeds || ikigaiWhatCanBePaidFor)
          ? {
              whatYouLove: ikigaiWhatYouLove || undefined,
              whatYouGoodAt: ikigaiWhatYouGoodAt || undefined,
              whatWorldNeeds: ikigaiWhatWorldNeeds || undefined,
              whatCanBePaidFor: ikigaiWhatCanBePaidFor || undefined,
            }
          : undefined,
        lifeContext: (lifeContextSituation || lifeContextConstraint || whatMattersMost.length > 0)
          ? {
              currentSituation: lifeContextSituation || undefined,
              biggestConstraint: lifeContextConstraint || undefined,
              whatMattersMost: whatMattersMost.length > 0 ? whatMattersMost : undefined,
            }
          : undefined,
      };

      if (startTime !== null) {
        const elapsedBeforeCall = Date.now() - startTime;
        const remainingBudget = Math.max(0, 30000 - elapsedBeforeCall);
        const personalizedPromise = getPersonalizedDailyInsight(insightParams);

        const raceResult = await Promise.race<
          { type: 'report'; value: string } | { type: 'timeout' }
        >([
          personalizedPromise.then((value) => ({ type: 'report' as const, value })),
          new Promise<{ type: 'timeout' }>((resolve) => {
            setTimeout(() => resolve({ type: 'timeout' }), remainingBudget);
          }),
        ]);

        if (raceResult.type === 'report') {
          report = raceResult.value;
        } else {
          console.warn('⏱️ Insight timed out after 30s; showing fallback first');
          let fallbackReport = '';
          try {
            if (birthMonth && birthDate) {
              const sunSign = getSunSign(birthMonth, birthDate);
              fallbackReport = await getCachedAstrologyReport(
                sunSign,
                birthYear && birthMonth && birthDate ? `${birthYear}-${birthMonth}-${birthDate}` : undefined,
                birthHour && birthMinute && birthPeriod ? `${birthHour}:${birthMinute} ${birthPeriod}` : undefined,
                birthCity || undefined,
              );
            }
          } catch (fallbackError) {
            console.warn('⚠️ Fallback insight fetch failed after timeout:', fallbackError);
          }

          if (!isStaleRequest()) {
            setIsLoadingReport(false);
            setAstrologyReport(
              fallbackReport && fallbackReport.trim()
                ? fallbackReport
                : tr('Today\'s insight took longer than 30 seconds to generate. Please try again in a minute.', 'Инсайт на сегодня формировался дольше 30 секунд. Попробуй еще раз через минуту.')
            );
          }

          personalizedPromise
            .then((lateReport) => {
              if (!isStaleRequest() && lateReport && lateReport.trim()) {
                setAstrologyReport(lateReport);
                console.log('✅ Replaced fallback with personalized insight');
              }
            })
            .catch((lateError) => {
              console.warn('⚠️ Personalized insight failed after timeout fallback:', lateError);
            });

          return;
        }
      } else {
        report = await getPersonalizedDailyInsight(insightParams);
      }
      
      console.log('📏 Report length:', report?.length);
      console.log('📄 Report preview (first 300 chars):', report?.substring(0, 300));
      
      // For free users: Ensure loading screen shows for exactly 30 seconds
      // This applies whether the report was cached or newly generated
      if (startTime !== null) {
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, 30000 - elapsed);
        
        if (remainingTime > 0) {
          console.log(`⏳ Waiting ${remainingTime}ms to complete 30 second queue...`);
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
      }
      
      if (report && typeof report === 'string' && report.trim()) {
        if (isStaleRequest()) return;
        if (options?.persistPremiumCacheKey) {
          await AsyncStorage.setItem(options.persistPremiumCacheKey, report);
        }
        setIsLoadingReport(false);
        setAstrologyReport(report);
        console.log('✨ Report displayed in modal');
      } else {
        if (isStaleRequest()) return;
        console.log('❌ Report is empty or invalid');
        setIsLoadingReport(false);
        setAstrologyReport(tr('Report was not generated. Please try again.', 'Отчет не был создан. Попробуй еще раз.'));
      }
    } catch (error) {
      if (requestId !== insightRequestIdRef.current) return;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setIsLoadingReport(false);
      if (errorMessage === 'INSIGHT_TIMEOUT_30S') {
        console.warn('⏱️ Personalized insight timed out after 30s; trying cached sign-based fallback');
        try {
          const sunSign = getSunSign(birthMonth, birthDate);
          const fallbackReport = await getCachedAstrologyReport(
            sunSign,
            `${birthYear}-${birthMonth}-${birthDate}`,
            birthHour && birthMinute && birthPeriod ? `${birthHour}:${birthMinute} ${birthPeriod}` : undefined,
            birthCity || undefined,
          );

          if (fallbackReport && fallbackReport.trim()) {
            setAstrologyReport(fallbackReport);
          } else {
            setAstrologyReport(tr('Today\'s insight took longer than 30 seconds to generate. Please try again in a minute.', 'Инсайт на сегодня формировался дольше 30 секунд. Попробуй еще раз через минуту.'));
          }
        } catch (fallbackError) {
          console.warn('⚠️ Fallback insight fetch failed after timeout:', fallbackError);
          setAstrologyReport(tr('Today\'s insight took longer than 30 seconds to generate. Please try again in a minute.', 'Инсайт на сегодня формировался дольше 30 секунд. Попробуй еще раз через минуту.'));
        }
      } else {
        console.error('❌ Error generating personalized daily insight:', error);
        setAstrologyReport(`${t('home.errorGeneratingReport')}: ${errorMessage}. ${tr('Please try later.', 'Попробуй позже.')}`);
      }
    }
  };

  // Handle Skip Queue button
  const handleSkipQueue = async () => {
    console.log('[TodayInsight] Skip wait button pressed');
    const requestId = ++insightRequestIdRef.current;
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];
    const cacheKey = `daily-report-${todayKey}`;
    const insightLanguage: 'en' | 'ru' = i18n.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
    const premiumInsightCacheKey = `premium-daily-report-${insightLanguage}-${todayKey}`;
    
    const userIsPremium = await (async () => {
      const [superwallAccess, subscriptionAccess] = await Promise.all([
        checkSubscriptionStatus(),
        hasSubscriptionAccess(),
      ]);
      return superwallAccess || subscriptionAccess;
    })();
    console.log('[TodayInsight] Initial premium status before skip:', userIsPremium);
    if (!userIsPremium) {
      console.log('[TodayInsight] Free user detected, triggering paywall: skip_wait');
      const paywallResult = await triggerPaywall('skip_wait');
      console.log('[TodayInsight] skip_wait paywall result:', paywallResult);

      // Verify entitlement after the paywall closes; some purchase flows may
      // return without a direct "purchased" result but still activate subscription.
      const premiumAfterPaywall = await checkSubscriptionStatus();
      console.log('[TodayInsight] Premium status after paywall:', premiumAfterPaywall);
      if (!premiumAfterPaywall) {
        console.log('[TodayInsight] Paywall dismissed/no active subscription; keeping queue state');
        return;
      }
      console.log('[TodayInsight] Subscription active; skipping queue and generating immediately');
    }

    setQueueSkipped(true);
    if (queueTimerRef.current) {
      clearTimeout(queueTimerRef.current);
      queueTimerRef.current = null;
    }
    queueStartTimeRef.current = null;
    await generateReport(cacheKey, null, requestId, {
      persistPremiumCacheKey: premiumInsightCacheKey,
    });
  };

  // Transform answer field to envelope and fly away
  const transformToEnvelope = () => {
    setShowEnvelope(true);
    
    // Scale up to bigger envelope size (1.5x instead of 0.3x)
    Animated.timing(envelopeAnim, {
      toValue: 1.5,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      // Fly away animation - slower (3000ms instead of 1500ms)
      Animated.parallel([
        Animated.timing(envelopeTranslateX, {
          toValue: width * 0.8,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(envelopeTranslateY, {
          toValue: -height * 0.8,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(envelopeRotation, {
          toValue: 360,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(envelopeOpacity, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // After envelope flies away completely:
        // 1. Fade out the question and field
        Animated.parallel([
          Animated.timing(fieldOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(questionOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // 2. Hide question and field
          setShowEnvelope(false);
          setAnswerCapturedToday(true);
        });
      });
    });
  };

  // Update streak and check for badges
  const updateStreakAndBadges = async () => {
    try {
      const answersData = await AsyncStorage.getItem('userAnswers');
      if (!answersData) return;

      const answers = JSON.parse(answersData);
      if (answers.length === 0) return;

      // Calculate streak
      const sortedAnswers = answers.sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayAnswer = sortedAnswers.find((answer: any) => {
        const answerDate = new Date(answer.date);
        answerDate.setHours(0, 0, 0, 0);
        return answerDate.getTime() === today.getTime();
      });

      if (todayAnswer) {
        let currentDate = new Date(today);
        for (const answer of sortedAnswers) {
          const answerDate = new Date(answer.date);
          answerDate.setHours(0, 0, 0, 0);
          
          if (answerDate.getTime() === currentDate.getTime()) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else if (answerDate.getTime() < currentDate.getTime()) {
            break;
          }
        }
      }

      // Check for badges based on streak
      const badgesData = await AsyncStorage.getItem('userBadges');
      const badges = badgesData ? JSON.parse(badgesData) : [];
      const badgeIds = new Set(badges.map((b: any) => b.id));

      const todayISO = new Date().toISOString().split('T')[0];

      // Streak badges
      if (streak >= 7 && !badgeIds.has('streak_7')) {
        badges.push({
          id: 'streak_7',
          name: tr('Weekly Warrior', 'Воин недели'),
          description: tr('7 day streak', 'Серия 7 дней'),
          dateEarned: todayISO,
          icon: '🔥',
        });
      }
      if (streak >= 30 && !badgeIds.has('streak_30')) {
        badges.push({
          id: 'streak_30',
          name: tr('Master of the Month', 'Мастер месяца'),
          description: tr('30 day streak', 'Серия 30 дней'),
          dateEarned: todayISO,
          icon: '⭐',
        });
      }
      if (streak >= 100 && !badgeIds.has('streak_100')) {
        badges.push({
          id: 'streak_100',
          name: tr('Century Champion', 'Чемпион сотни'),
          description: tr('100 day streak', 'Серия 100 дней'),
          dateEarned: todayISO,
          icon: '🏆',
        });
      }

      // Answer count badges
      const answerCount = answers.length;
      if (answerCount >= 10 && !badgeIds.has('answers_10')) {
        badges.push({
          id: 'answers_10',
          name: tr('Path Beginning', 'Начало пути'),
          description: tr('10 answers submitted', 'Отправлено 10 ответов'),
          dateEarned: todayISO,
          icon: '📝',
        });
      }
      if (answerCount >= 50 && !badgeIds.has('answers_50')) {
        badges.push({
          id: 'answers_50',
          name: tr('Reflection Master', 'Мастер рефлексии'),
          description: tr('50 answers submitted', 'Отправлено 50 ответов'),
          dateEarned: todayISO,
          icon: '📚',
        });
      }
      if (answerCount >= 100 && !badgeIds.has('answers_100')) {
        badges.push({
          id: 'answers_100',
          name: tr('Wisdom Seeker', 'Искатель мудрости'),
          description: tr('100 answers submitted', 'Отправлено 100 ответов'),
          dateEarned: todayISO,
          icon: '✨',
        });
      }

      await AsyncStorage.setItem('userBadges', JSON.stringify(badges));
    } catch (error) {
      console.error('Error updating streak and badges:', error);
    }
  };

  // Reset answer field for next use (only called when resetting for new day)
  const resetAnswerField = () => {
    setAnswerCaptured(false);
    setAnswerCapturedToday(false);
    setShowEnvelope(false);
    setDailyAnswer('');
    envelopeAnim.setValue(1);
    envelopeTranslateX.setValue(0);
    envelopeTranslateY.setValue(0);
    envelopeRotation.setValue(0);
    envelopeOpacity.setValue(1);
    fieldOpacity.setValue(1);
    questionOpacity.setValue(1);
  };

  const handleSendChatMessage = async () => {
    if (chatInput.trim() && !isChatLoading) {
      const userMessageText = chatInput.trim();
      setChatInput('');
      setIsChatLoading(true);

      // Add user message
      const userMessage = { type: 'user' as const, text: userMessageText, timestamp: new Date().toISOString() };
      const updatedMessages = [...chatMessages, userMessage];
      setChatMessages(updatedMessages);

      try {
        // Convert messages to Claude API format
        const conversationHistory: ChatMessage[] = updatedMessages.map((msg) => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.text,
        }));

        // AI generation disabled to save credits
        // const aiResponse = await getAtlasChatResponse(conversationHistory);
        
        // Using placeholder response instead
        const aiResponse = tr('I am here to help! This feature is temporarily unavailable. Check back soon.', 'Я рядом, чтобы помочь! Эта функция временно отключена. Загляни чуть позже.');

        // Add AI response
        const aiMessage = { type: 'atlas' as const, text: aiResponse, timestamp: new Date().toISOString() };
        setChatMessages([...updatedMessages, aiMessage]);
      } catch (error) {
        console.error('Error getting Atlas response:', error);
        const errorMessage = t('home.atlasError');
        const errorResponse = { type: 'atlas' as const, text: errorMessage, timestamp: new Date().toISOString() };
        setChatMessages([...updatedMessages, errorResponse]);
      } finally {
        setIsChatLoading(false);
      }
    }
  };

  // Load chat messages from storage when component mounts
  useEffect(() => {
    const loadChatMessages = async () => {
      try {
        const storedMessages = await AsyncStorage.getItem(ATLAS_CHAT_STORAGE_KEY);
        if (storedMessages) {
          const parsedMessages = JSON.parse(storedMessages);
          setChatMessages(parsedMessages);
        } else {
          // Only set initial message if no stored messages exist
          const initialMessage = t('home.atlasGreeting');
          setChatMessages([{ type: 'atlas', text: initialMessage, timestamp: new Date().toISOString() }]);
        }
      } catch (error) {
        console.error('Error loading Atlas chat messages:', error);
        // Fallback to initial message on error
        const initialMessage = tr('Hi! I\'m Atlas, your guide. How can I help today?', 'Привет! Я Атлас, твой проводник. Чем помочь сегодня?');
        setChatMessages([{ type: 'atlas', text: initialMessage, timestamp: new Date().toISOString() }]);
      }
    };
    loadChatMessages();
  }, []);

  // Save chat messages to storage whenever they change
  useEffect(() => {
    const saveChatMessages = async () => {
      try {
        if (chatMessages.length > 0) {
          await AsyncStorage.setItem(ATLAS_CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
        }
      } catch (error) {
        console.error('Error saving Atlas chat messages:', error);
      }
    };
    saveChatMessages();
  }, [chatMessages]);

  const handleOpenAtlasChat = () => {
    setShowAtlasChat(true);
  };

  const handleMoodSelect = async (mood: string) => {
    setMoodSelected(mood);
    
    // Reset color animations when a new mood is selected
    moodCardBackgroundAnim.setValue(0);
    moodCardTextAnim.setValue(0);
    
    // Get button position for radiating effect
    const buttonRef = moodButtonRefs[mood as keyof typeof moodButtonRefs]?.current;
    if (buttonRef) {
      buttonRef.measureInWindow((x, y, width, height) => {
        setRadiatingPosition({ 
          x: x + width / 2, 
          y: y + height / 2 
        });
        
        // Reset radiating animations
        radiatingAnim1.setValue(0);
        radiatingAnim2.setValue(0);
        radiatingAnim3.setValue(0);
        radiatingOpacity1.setValue(1);
        radiatingOpacity2.setValue(1);
        radiatingOpacity3.setValue(1);
        
        // Show radiating effect
        setShowRadiatingEffect(true);
        
        // Radiating light effect animation
        Animated.parallel([
          // First circle
          Animated.parallel([
            Animated.timing(radiatingAnim1, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(radiatingOpacity1, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          // Second circle (delayed)
          Animated.parallel([
            Animated.timing(radiatingAnim2, {
              toValue: 1,
              duration: 1000,
              delay: 100,
              useNativeDriver: true,
            }),
            Animated.timing(radiatingOpacity2, {
              toValue: 0,
              duration: 1000,
              delay: 100,
              useNativeDriver: true,
            }),
          ]),
          // Third circle (more delayed)
          Animated.parallel([
            Animated.timing(radiatingAnim3, {
              toValue: 1,
              duration: 1200,
              delay: 200,
              useNativeDriver: true,
            }),
            Animated.timing(radiatingOpacity3, {
              toValue: 0,
              duration: 1200,
              delay: 200,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setShowRadiatingEffect(false);
          
          // After radiating effect, animate card to white background and purple text
          Animated.parallel([
            Animated.timing(moodCardBackgroundAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: false, // Colors can't use native driver
            }),
            Animated.timing(moodCardTextAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: false, // Colors can't use native driver
            }),
          ]).start();
        });
      });
    }
    
    // Animation when mood is selected
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Save mood to AsyncStorage
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      await AsyncStorage.setItem(`mood_${today}`, mood);
      
      // Also update the last answer entry if it exists for today
      const answersData = await AsyncStorage.getItem('userAnswers');
      const answers = answersData ? JSON.parse(answersData) : [];
      const todayAnswerIndex = answers.findIndex((a: any) => a.date === today);
      
      if (todayAnswerIndex >= 0) {
        answers[todayAnswerIndex].mood = mood;
        await AsyncStorage.setItem('userAnswers', JSON.stringify(answers));
      }
    } catch (error) {
      console.error('Error saving mood:', error);
    }
  };

  const measureWalkthroughTarget = (stepKey: string) => {
    const refMap: Record<string, React.RefObject<View>> = {
      cosmicInsight: cosmicInsightRef,
      clarityMap: clarityMapRef,
      progress: progressRef,
      ikigai: ikigaiRef,
      atlas: atlasRef,
    };

    const targetRef = refMap[stepKey];
    if (!targetRef?.current) {
      setWalkthroughTargetRect(null);
      return;
    }

    const measure = (attempt = 0) => {
      targetRef.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setWalkthroughTargetRect({ x, y, width, height });
          return;
        }

        // Retry briefly while layout settles after step changes / programmatic scroll.
        if (attempt < 2) {
          requestAnimationFrame(() => measure(attempt + 1));
          return;
        }

        setWalkthroughTargetRect(null);
      });
    };

    if (stepKey === 'atlas') {
      // Atlas card can be below the fold; snap scroll first so step 5 is always visible.
      homeScrollRef.current?.scrollToEnd({ animated: false });
      requestAnimationFrame(() => requestAnimationFrame(() => measure()));
      return;
    }

    requestAnimationFrame(() => measure());
  };

  const closeWalkthrough = async () => {
    setShowHomeWalkthrough(false);
    setWalkthroughStepIndex(0);
    setWalkthroughTargetRect(null);
    try {
      await AsyncStorage.setItem(HOME_WALKTHROUGH_DONE_KEY, 'true');
      await AsyncStorage.removeItem(JUST_FINISHED_ONBOARDING_KEY);
    } catch (error) {
      console.error('Error persisting walkthrough completion:', error);
    }
  };

  const goToNextWalkthroughStep = () => {
    if (walkthroughStepIndex >= walkthroughSteps.length - 1) {
      closeWalkthrough();
      return;
    }
    setWalkthroughStepIndex((prev) => prev + 1);
  };

  const headerTopOffset = Math.max(50, insets.top + 10);
  const headerTotalHeight = headerTopOffset + headerContentHeight;
  const isHomeAnsweredLayout = answerCapturedToday && !showEnvelope;

  return (
    <ImageBackground
      source={require('../../assets/images/moon.star.png')}
      style={styles.homeBackground}
      imageStyle={styles.homeBackgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      
      {/* Settings Button - Top Right (left of guide) */}
      <TouchableOpacity
        style={[styles.settingsButton, { top: headerTopOffset }]}
        onPress={() => router.push('/settings')}
        activeOpacity={0.8}
      >
        <Ionicons name="settings-outline" size={20} color="#342846" />
      </TouchableOpacity>

      {/* Guide Button - Top Right */}
      <TouchableOpacity
        style={[styles.guideButton, { top: headerTopOffset }]}
        onPress={() => setShowGuideModal(true)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="help-outline" size={20} color="#342846" style={styles.guideButtonIcon} />
      </TouchableOpacity>
      
      {/* Fixed Header - Absolutely Positioned */}
      <View
        pointerEvents="box-none"
        style={[styles.fixedHeader, { top: headerTopOffset }]}
        onLayout={(event) => {
          const { height: measuredHeight } = event.nativeEvent.layout;
          if (measuredHeight !== headerContentHeight) {
            setHeaderContentHeight(measuredHeight);
          }
        }}
      >
        {/* Date - Top Left */}
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>

        {/* Greeting - Left Aligned - Fixed position below date */}
        <Text style={styles.greeting}>
          {trimmedUserName ? `${t('home.hello')}, ${trimmedUserName}` : t('home.hello')}
        </Text>

        {/* Dividing Bar */}
        <View style={styles.dividingBar} />
      </View>
      
      <View style={[styles.scrollContainer, { marginTop: headerTotalHeight }]}>
        <ScrollView 
          ref={homeScrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingTop: 0 },
            isHomeAnsweredLayout && styles.contentContainerAnswered,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={false}
          scrollEnabled={!isSliderInteracting && !isHomeAnsweredLayout}
        >

        {/* Reserve daily question space to avoid layout jumps below */}
        <View style={styles.dailyQuestionSection}>
          {!answerCapturedToday && !showEnvelope && (
            <>
              <Text style={styles.sectionHeading}>{t('home.questionOfTheDay')}</Text>
              <View style={styles.questionCard}>
                <FrostedCardLayer />
                <Text style={styles.questionCardText}>{currentQuestion}</Text>
                <View style={styles.answerFieldCard}>
                  <TextInput
                    style={styles.answerInputCard}
                    value={dailyAnswer}
                    onChangeText={handleAnswerChange}
                    placeholder={t('home.enterAnswer')}
                    placeholderTextColor="#999"
                    multiline
                    editable={!answerCaptured}
                  />
                </View>
                {dailyAnswer.trim() && !answerCaptured && (
                  <TouchableOpacity
                    style={styles.saveEntryButton}
                    onPress={() => {
                      if (dailyAnswer.trim() && !answerCaptured) {
                        captureAnswer();
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.saveEntryButtonText}>{t('home.saveEntry')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* Envelope animation - shown during transformation */}
          {showEnvelope && (
            <View style={[styles.questionCard, styles.questionCardEnvelope]}>
              <FrostedCardLayer />
              <Animated.View
                style={[
                  styles.envelopeContainer,
                  {
                    transform: [
                      { scale: envelopeAnim },
                      { translateX: envelopeTranslateX },
                      { translateY: envelopeTranslateY },
                      {
                        rotate: envelopeRotation.interpolate({
                          inputRange: [0, 360],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                    opacity: envelopeOpacity,
                  },
                ]}
              >
                <View style={styles.envelope}>
                  <Text style={styles.envelopeEmoji}>✉️</Text>
                </View>
              </Animated.View>
            </View>
          )}
        </View>

        {/* Confetti Pieces */}
        {answerCaptured && (
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

        <View style={isHomeAnsweredLayout ? [styles.homeAnsweredContent, isTabletLayout && styles.homeAnsweredContentTablet] : undefined}>
          <View>
            {/* Explore Heading */}
            <Text
              style={[
                styles.sectionHeading,
                answerCapturedToday && !showEnvelope && styles.exploreHeadingAnswered,
              ]}
            >
              {t('home.explore')}
            </Text>

            {/* Four sections grid */}
            <View style={styles.gridContainer}>
              {/* Row 1 */}
              <View style={[styles.gridRow, isTabletLayout && styles.gridRowTablet]}>
                <Animated.View
                  ref={cosmicInsightRef as any}
                  collapsable={false}
                  style={[
                    styles.gridButtonLeft,
                    isTabletLayout && styles.gridButtonColumnTablet,
                    { transform: [{ scale: cosmicInsightScale }] },
                  ]}
                >
                  <TouchableOpacity 
                    style={[styles.gridButton, isTabletLayout && styles.gridButtonTablet]} 
                    activeOpacity={1}
                    onPress={() => handleRectanglePress(cosmicInsightScale, handleCosmicInsightClick)}
                  >
                    <ImageBackground
                      source={require('../../assets/images/rectangle.png')}
                      style={styles.buttonGradient}
                      imageStyle={styles.buttonImageStyle}
                    >
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.buttonTitle}>{t('home.cosmicInsight')}</Text>
                    </View>
                    </ImageBackground>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View
                  ref={clarityMapRef as any}
                  collapsable={false}
                  style={[
                    styles.gridButtonRight,
                    isTabletLayout && styles.gridButtonColumnTablet,
                    { transform: [{ scale: clarityMapScale }] },
                  ]}
                >
                  <TouchableOpacity 
                    style={[styles.gridButton, isTabletLayout && styles.gridButtonTablet]} 
                    activeOpacity={1}
                    onPress={() => handleRectanglePress(clarityMapScale, handleClarityMapPress)}
                  >
                    <ImageBackground
                      source={require('../../assets/images/rectangle.png')}
                      style={styles.buttonGradient}
                      imageStyle={styles.buttonImageStyle}
                    >
                      <View style={styles.buttonTextContainer}>
                        <Text style={styles.buttonTitle}>{t('home.clarityMap')}</Text>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Row 2 */}
              <View style={[styles.gridRow, isTabletLayout && styles.gridRowTablet]}>
                <Animated.View
                  ref={progressRef as any}
                  collapsable={false}
                  style={[
                    styles.gridButtonLeft,
                    isTabletLayout && styles.gridButtonColumnTablet,
                    { transform: [{ scale: progressScale }] },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.gridButton, isTabletLayout && styles.gridButtonTablet]}
                    activeOpacity={1}
                    onPress={() => handleRectanglePress(progressScale, () => router.push('/progress'))}
                  >
                    <ImageBackground
                      source={require('../../assets/images/rectangle.png')}
                      style={styles.buttonGradient}
                      imageStyle={styles.buttonImageStyle}
                    >
                      <View style={styles.buttonTextContainer}>
                        <Text style={styles.buttonTitle}>{t('home.progressThisWeek')}</Text>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View
                  ref={ikigaiRef as any}
                  collapsable={false}
                  style={[
                    styles.gridButtonRight,
                    isTabletLayout && styles.gridButtonColumnTablet,
                    { transform: [{ scale: ikigaiScale }] },
                  ]}
                >
                  <TouchableOpacity 
                    style={[styles.gridButton, isTabletLayout && styles.gridButtonTablet]} 
                    activeOpacity={1}
                    onPress={() => handleRectanglePress(ikigaiScale, () => router.push('/ikigai-compass'))}
                  >
                    <ImageBackground
                      source={require('../../assets/images/rectangle.png')}
                      style={styles.buttonGradient}
                      imageStyle={styles.buttonImageStyle}
                    >
                      <View style={styles.buttonTextContainer}>
                        <Text style={styles.buttonTitle}>{t('home.ikigaiCompass')}</Text>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>

            <Text style={styles.sectionHeading}>{tr('How are you feeling today?', 'Как ты себя сегодня чувствуешь?')}</Text>

            {/* Mood Card - Show logged state or selector based on state */}
            {todaysMood && !showMoodSelector ? (
              <MoodLoggedCard 
                emoji={todaysMood.emoji}
                moodText={todaysMood.text}
                moodValue={todaysMood.value}
                onUpdatePress={handleUpdateMood}
                containerStyle={isTabletLayout ? styles.moodLoggedCardTablet : undefined}
              />
            ) : (
              <View style={[styles.moodCard, isTabletLayout && styles.moodCardTablet]}>
                <FrostedCardLayer />
                <View pointerEvents="auto">
                  <MoodSelector 
                    showQuestion={false} 
                    onMoodSaved={handleMoodSaved}
                    onInteractionStart={() => setIsSliderInteracting(true)}
                    onInteractionEnd={() => setIsSliderInteracting(false)}
                  />
                </View>
              </View>
            )}
              
              {/* Radiating light effect - centered on selected button */}
              {showRadiatingEffect && moodSelected && (
                <View 
                  style={styles.radiatingContainer}
                  pointerEvents="none"
                >
                  <Animated.View
                    style={[
                      styles.radiatingCircle,
                      {
                        left: radiatingPosition.x - 100,
                        top: radiatingPosition.y - 100,
                        transform: [
                          {
                            scale: radiatingAnim1.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 3],
                            }),
                          },
                        ],
                        opacity: radiatingOpacity1,
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.radiatingCircle,
                      {
                        left: radiatingPosition.x - 100,
                        top: radiatingPosition.y - 100,
                        transform: [
                          {
                            scale: radiatingAnim2.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 3.5],
                            }),
                          },
                        ],
                        opacity: radiatingOpacity2,
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.radiatingCircle,
                      {
                        left: radiatingPosition.x - 100,
                        top: radiatingPosition.y - 100,
                        transform: [
                          {
                            scale: radiatingAnim3.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 4],
                            }),
                          },
                        ],
                        opacity: radiatingOpacity3,
                      },
                    ]}
                  />
                </View>
              )}
          </View>

          {/* Feeling Anxious Section */}
          <View
            ref={atlasRef}
            collapsable={false}
            style={isTabletLayout ? styles.feelingAnxiousSectionTablet : undefined}
          >
            <Text style={styles.sectionHeading}>{t('home.feelingAnxious')}</Text>
            <TouchableOpacity 
              style={styles.feelingAnxiousCard}
              onPress={handleOpenAtlasChat}
              activeOpacity={0.8}
            >
              <View style={styles.feelingAnxiousContent}>
                <View style={styles.feelingAnxiousTextContainer}>
                  <Text style={styles.feelingAnxiousBody}>
                    {t('home.feelingAnxiousBody')}
                  </Text>
                </View>
                <Image
                  source={require('../../assets/images/anxious.png')}
                  style={styles.feelingAnxiousImage}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </View>

      {/* Astrology Report Modal - Full Screen */}
      <Modal
        visible={showAstrologyModal}
        animationType="fade"
        transparent={false}
        onRequestClose={() => {
          try {
            insightRequestIdRef.current += 1; // Invalidate in-flight insight updates
            setShowAstrologyModal(false);
            setInsightProfileMessage('');
            if (queueTimerRef.current) {
              clearTimeout(queueTimerRef.current);
              queueTimerRef.current = null;
            }
          } catch (error) {
            console.error('Error closing modal:', error);
          }
        }}
      >
        <View style={styles.fullScreenModal}>
          {/* Animated Space Background - Full Screen */}
          <View style={styles.spaceBackground}>
            {/* Always-on background to prevent white flash during state transitions */}
            <ImageBackground
              source={require('../../assets/images/astrology.png')}
              style={styles.astrologyBackground}
              imageStyle={styles.astrologyBackgroundImage}
              resizeMode="cover"
            />
            {/* Galaxy gradient background - hide during queue, show during initial load, fade when report appears */}
            {!isLoadingReport && (
              <LinearGradient
                colors={['#0a0a1a', '#1a1a3a', '#2a1a4a', '#1a1a3a', '#0a0a1a']}
                style={[
                  styles.galaxyGradient,
                  astrologyReport && astrologyReport.trim().length > 0 && { opacity: 0 }
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}
            
            {/* Twinkling stars - hide during queue screen */}
            {!isLoadingReport && starAnimations.map((star, index) => (
              <Animated.View
                key={`star-${index}`}
                style={[
                  styles.star,
                  {
                    left: star.x,
                    top: star.y,
                    opacity: star.opacity,
                    transform: [{ scale: star.scale }],
                  },
                ]}
              >
                <View style={styles.starCore} />
              </Animated.View>
            ))}
            
            {/* Shooting stars - Using comet.png, star.png, stars.png - keep during queue */}
            {shootingStarAnimations.map((shootingStar: any, index) => {
              const getStarImage = () => {
                switch (shootingStar.type) {
                  case 'comet':
                    return require('../../assets/images/comet.png');
                  case 'star':
                    return require('../../assets/images/star.png');
                  case 'stars':
                    return require('../../assets/images/stars.png');
                  default:
                    return require('../../assets/images/star.png');
                }
              };

              return (
                <Animated.View
                  key={`shooting-star-${index}`}
                  style={[
                    styles.shootingStarContainer,
                    {
                      opacity: shootingStar.opacity,
                      transform: [
                        { translateX: shootingStar.translateX },
                        { translateY: shootingStar.translateY },
                        { rotate: shootingStar.rotation ? shootingStar.rotation.interpolate({
                          inputRange: [0, 360],
                          outputRange: ['0deg', '360deg'],
                        }) : '45deg' },
                        { scale: shootingStar.scale },
                      ],
                    },
                  ]}
                >
                  <Image
                    source={getStarImage()}
                    style={styles.shootingStarImage}
                    resizeMode="contain"
                  />
                </Animated.View>
              );
            })}

            {/* Pulsating stars - Using comet.png, star.png, stars.png - hide during queue */}
            {!isLoadingReport && pulsatingStarAnimations.map((pulsatingStar: any, index) => {
              const getStarImage = () => {
                switch (pulsatingStar.type) {
                  case 'comet':
                    return require('../../assets/images/comet.png');
                  case 'star':
                    return require('../../assets/images/star.png');
                  case 'stars':
                    return require('../../assets/images/stars.png');
                  default:
                    return require('../../assets/images/star.png');
                }
              };

              return (
                <Animated.View
                  key={`pulsating-star-${index}`}
                  style={[
                    styles.pulsatingStarContainer,
                    {
                      left: pulsatingStar.x,
                      top: pulsatingStar.y,
                      opacity: pulsatingStar.opacity,
                      transform: [{ scale: pulsatingStar.scale }],
                    },
                  ]}
                >
                  <Image
                    source={getStarImage()}
                    style={styles.pulsatingStarImage}
                    resizeMode="contain"
                  />
                </Animated.View>
              );
            })}
          </View>
          
          {/* Close Button */}
          <TouchableOpacity
            onPress={() => {
              try {
                insightRequestIdRef.current += 1; // Invalidate in-flight insight updates
                setShowAstrologyModal(false);
                setInsightProfileMessage('');
                if (queueTimerRef.current) {
                  clearTimeout(queueTimerRef.current);
                  queueTimerRef.current = null;
                }
              } catch (error) {
                console.error('Error closing modal:', error);
              }
            }}
            style={styles.fullScreenCloseButton}
          >
            <Text style={styles.fullScreenCloseText}>✕</Text>
          </TouchableOpacity>
          
          {/* Text Content with Overlay */}
          <ScrollView 
            style={styles.fullScreenScrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.fullScreenContent}
          >
            {isLoadingReport ? (
              <View style={styles.fullScreenLoadingContainer}>
                {queueSkipped ? (
                  // Premium / trial users: simple spinner, no queue language
                  <>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.fullScreenLoadingText}>
                      {t('home.generatingInsight', {
                        defaultValue: tr('Generating your insight...', 'Генерируем Ваш инсайт...'),
                      })}
                    </Text>
                  </>
                ) : (
                  // Free users: full queue UI with 30-second wait and skip button
                  <>
                    <Text style={styles.queueHeading}>
                      {t('home.cosmicInsightQueue', {
                        defaultValue: tr('Insight queue', 'Очередь инсайта'),
                      })}
                    </Text>
                    <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
                    <Text style={styles.fullScreenLoadingText}>
                      {t('home.cosmicInsightQueueText', {
                        defaultValue: tr(
                          'We are preparing your personalized insight. Please wait a moment.',
                          'Мы готовим Ваш персональный инсайт. Пожалуйста, подождите немного.'
                        ),
                      })}
                    </Text>
                    <TouchableOpacity
                      style={styles.skipQueueButton}
                      onPress={handleSkipQueue}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.skipQueueButtonText}>
                        {t('home.skipQueue', { defaultValue: tr('Skip queue', 'Пропустить очередь') })}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : astrologyReport && astrologyReport.trim().length > 0 ? (
              <View style={styles.fullScreenTextContainer}>
                {/* Semi-transparent dark blue overlay */}
                <View style={styles.textOverlay} />
                <View style={styles.reportTextWrapper}>
                  {insightProfileMessage ? (
                    <Text style={styles.reportProfileHint}>{insightProfileMessage}</Text>
                  ) : null}
                  {(() => {
                    try {
                      return formatReportText(astrologyReport);
                    } catch (error) {
                      console.error('Error rendering report text:', error);
                      return <Text style={styles.reportBodyText}>{tr('Error displaying report. Please try again.', 'Ошибка отображения отчета. Попробуй еще раз.')}</Text>;
                    }
                  })()}
                </View>
              </View>
            ) : (
              <View style={styles.fullScreenLoadingContainer}>
                <Text style={styles.fullScreenLoadingText}>{t('home.noReportAvailable')}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Atlas Chat Modal - Full Screen */}
      <Modal
        visible={showAtlasChat}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowAtlasChat(false)}
      >
        <AtlasChat
          onClose={() => setShowAtlasChat(false)}
          userName={userName}
          goalTitle={goalTitle}
          goalStepLabel={goalStepLabel}
          goalStepNumber={goalStepNumber}
          totalGoalSteps={totalGoalSteps}
        />
      </Modal>
      </KeyboardAvoidingView>
      
      {/* Guide Modal */}
      <HomeWalkthrough
        visible={showHomeWalkthrough}
        step={walkthroughSteps[walkthroughStepIndex] || null}
        stepIndex={walkthroughStepIndex}
        totalSteps={walkthroughSteps.length}
        targetRect={walkthroughTargetRect}
        onNext={goToNextWalkthroughStep}
        onSkip={closeWalkthrough}
        onDone={closeWalkthrough}
      />

      {/* Guide Modal */}
      <GuideModal 
        visible={showGuideModal} 
        onClose={() => setShowGuideModal(false)}
        onReplayWalkthrough={() => {
          setTimeout(() => {
            setWalkthroughStepIndex(0);
            setWalkthroughTargetRect(null);
            setShowHomeWalkthrough(true);
          }, 220);
        }}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  homeBackground: {
    flex: 1,
    backgroundColor: '#1f1a2a',
    width: '100%',
    height: '100%',
  },
  homeBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
    marginTop: 0,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  contentContainerAnswered: {
    flexGrow: 1,
  },
  homeAnsweredContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  homeAnsweredContentTablet: {
    justifyContent: 'flex-start',
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  settingsButton: {
    position: 'absolute',
    right: 72,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    elevation: 11,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  guideButton: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
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
  guideButtonText: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  guideButtonIcon: {
    opacity: 1,
  },
  fixedHeader: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1000,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    elevation: 10, // For Android
  },
  dateText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'left',
  },
  greeting: {
    ...HeadingStyle,
    color: '#342846',
    textAlign: 'left',
    marginBottom: 16,
  },
  dividingBar: {
    height: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.55,
    marginBottom: 0,
  },
  sectionHeading: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'left',
  },
  questionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 14,
  },
  dailyQuestionSection: {
    overflow: 'visible',
    marginTop: 20,
  },
  questionCardEnvelope: {
    overflow: 'visible',
  },
  questionCardText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'left',
  },
  exploreHeadingAnswered: {
    marginTop: 20,
  },
  answerFieldCard: {
    borderWidth: 0,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    minHeight: 100,
  },
  answerInputCard: {
    ...BodyStyle,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 12,
    color: '#342846',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveEntryButton: {
    backgroundColor: '#342846',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveEntryButtonText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  exploreContainer: {
    marginBottom: 24,
  },
  exploreCard: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#342846',
    marginBottom: 12,
  },
  exploreCardGradient: {
    padding: 20,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  exploreCardTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    textAlign: 'left',
    marginBottom: 4,
  },
  exploreCardSubtitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    textAlign: 'left',
    opacity: 0.7,
  },
  moodCard: {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    padding: 20,
    marginBottom: 24,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 14,
    overflow: 'hidden',
  },
  moodCardTablet: {
    marginBottom: 0,
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  moodLoggedCardTablet: {
    marginBottom: 0,
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  moodCardImage: {
    borderRadius: 12,
    resizeMode: 'cover',
  },
  moodCardTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'left',
  },
  moodButtonsVertical: {
    width: '100%',
  },
  moodButtonVerticalTouchable: {
    width: '100%',
    marginBottom: 12,
  },
  moodButtonVertical: {
    backgroundColor: '#342846',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodButtonVerticalText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  feelingAnxiousCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  feelingAnxiousSectionTablet: {
    marginTop: 30,
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  feelingAnxiousContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feelingAnxiousTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  feelingAnxiousHeading: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'left',
  },
  feelingAnxiousBody: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    textAlign: 'left',
    lineHeight: 20,
  },
  feelingAnxiousImage: {
    width: 80,
    height: 80,
  },
  questionAnswerSection: {
    minHeight: 180,
    marginBottom: -8,
    position: 'relative',
    width: '100%',
  },
  questionContainer: {
    minHeight: 60,
    marginBottom: 16,
    width: '100%',
  },
  question: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 0,
    fontSize: 18,
    lineHeight: 22, // Reduced line spacing
  },
  answerFieldContainer: {
    marginBottom: 0,
    minHeight: 75,
    height: 75,
    position: 'relative',
    width: '100%',
  },
  answerField: {
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    overflow: 'visible', // Changed to visible to allow shadow to show
    minHeight: 75, // Reduced by 25% (from 100 to 75)
    backgroundColor: '#FFFFFF',
    position: 'relative',
    // Subtle brown shadow
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8, // For Android
  },
  checkmarkButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  envelopeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 75,
  },
  envelope: {
    width: 60,
    height: 60,
    backgroundColor: 'transparent', // Removed blue background
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeEmoji: {
    fontSize: 48, // Made bigger (from 32 to 48)
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
  answerInput: {
    ...BodyStyle,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 12,
    color: '#342846',
    fontSize: 16,
    minHeight: 75, // Reduced by 25% (from 100 to 75)
    textAlignVertical: 'top',
  },
  gridContainer: {
    marginBottom: 24,
    marginTop: 0,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 24, // Increased gap from 16 to 24 for more spacing between cards
  },
  gridRowTablet: {
    justifyContent: 'center',
    gap: 16,
  },
  gridButton: {
    width: (((width - 50 - 24) / 2) + 50) * 0.9 * 0.8 * 1.1, // Width increased by 10% (multiply by 1.1) - fixed width for all rectangles (25px padding on each side)
    height: ((72 * 1.4) + 45) * 0.75, // Original height (146px) decreased by 25% = ~110px - fixed height for all rectangles
    borderRadius: 8,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12, // For Android
  },
  gridButtonTablet: {
    width: 320,
    maxWidth: '100%',
  },
  gridButtonColumnTablet: {
    marginLeft: 0,
  },
  gridButtonLeft: {
    marginLeft: -5, // Move left column 5px to the left
  },
  gridButtonRight: {
    marginLeft: -50, // Move right column 50px to the left
  },
  gridButtonInner: {
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
    flex: 1,
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonImageStyle: {
    borderRadius: 8,
    resizeMode: 'stretch',
  },
  buttonTextContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20 * 1.4, // Increased padding by 40% (from 20 to 28)
    paddingVertical: 20 * 1.4,
    width: '100%',
  },
  buttonTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 16, // Reduced from 18
    textAlign: 'center',
    lineHeight: 20, // Added line height for better two-line text spacing
    width: '100%',
    alignSelf: 'center',
  },
  buttonSubtitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.7,
    flexShrink: 1,
    lineHeight: 14,
  },
  moodQuestion: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    marginBottom: -2,
    marginTop: 8,
    fontSize: 16,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20, // Minimum 20px padding (was 0)
    paddingTop: 25,
    gap: 8, // Spacing between buttons
  },
  moodButton: {
    backgroundColor: '#342846',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20, // Minimum 20px padding (was 10)
    flex: 1, // Equal width for all buttons
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: ((width - 50 - 16) / 2) * 0.9, // 10% smaller than grid button width
  },
  moodButtonTouchable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodButtonSelected: {
    backgroundColor: '#342846',
  },
  moodButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 11, // Further reduced font size
    textAlign: 'center',
    lineHeight: 14,
  },
  radiatingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  radiatingCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 10,
  },
  dearFaceContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 10,
    paddingTop: 30,
  },
  dearFaceImage: {
    width: width * 0.35,
    height: width * 0.35,
    marginBottom: 8,
  },
  dearFaceText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 20, // Reduced line spacing by 12% (from default ~23 to 20)
  },
  fullScreenModal: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#1f1a2a',
  },
  spaceBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  astrologyBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  astrologyBackgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  queueBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  queueBackgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cosmicInsightBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  cosmicInsightBackgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  galaxyGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  starCore: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  shootingStarContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  shootingStarImage: {
    width: 30,
    height: 30,
  },
  pulsatingStarContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  pulsatingStarImage: {
    width: 18,
    height: 18,
  },
  fullScreenCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  fullScreenScrollView: {
    flex: 1,
    width: '100%',
    zIndex: 10,
    position: 'relative',
  },
  fullScreenContent: {
    paddingTop: 100,
    paddingBottom: 50,
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  fullScreenTextContainer: {
    position: 'relative',
    width: '100%',
    minHeight: 200,
  },
  textOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 26, 58, 0.7)',
    borderRadius: 15,
  },
  fullScreenReportText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 18,
    lineHeight: 28,
    padding: 25,
    zIndex: 10,
    position: 'relative',
  },
  fullScreenLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    zIndex: 10,
    position: 'relative',
  },
  queueHeading: {
    ...HeadingStyle,
    color: '#fff',
    fontSize: 28,
    marginBottom: 10,
    textAlign: 'center',
  },
  fullScreenLoadingText: {
    ...BodyStyle,
    marginTop: 20,
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 26,
  },
  skipQueueButton: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#fff',
  },
  skipQueueButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#342846',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#342846',
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
    maxHeight: height * 0.7,
  },
  modalBodyContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    ...BodyStyle,
    marginTop: 15,
    color: '#342846',
    textAlign: 'center',
  },
  reportContainer: {
    padding: 15,
    width: '100%',
    flex: 1,
  },
  astrologyReportText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    lineHeight: 24,
    width: '100%',
  },
  reportTextWrapper: {
    padding: 25,
    zIndex: 10,
    position: 'relative',
  },
  reportProfileHint: {
    ...BodyStyle,
    color: '#f7ddff',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    textAlign: 'center',
  },
  reportMainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#342846',
    marginBottom: 8,
    marginTop: 4,
    textAlign: 'center',
  },
  reportDateHeading: {
    ...HeadingStyle,
    color: '#fff',
    fontSize: 24,
    marginBottom: 14,
    textAlign: 'center',
  },
  reportSummaryLine: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 14,
    opacity: 0.95,
    paddingHorizontal: 8,
  },
  reportSectionCard: {
    backgroundColor: '#ffffff10',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  reportSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  reportSectionEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  reportSectionHeading: {
    ...HeadingStyle,
    color: '#fff',
    fontSize: 17,
    marginTop: 0,
    marginBottom: 0,
    flexShrink: 1,
  },
  reportSectionBody: {
    paddingTop: 2,
  },
  reportParagraphSpacer: {
    height: 8,
  },
  reportParagraphBlock: {
    marginBottom: 10,
  },
  reportTimeBadge: {
    ...BodyStyle,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(205, 186, 216, 0.45)',
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6,
    overflow: 'hidden',
  },
  reportBodyText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 2,
  },
  // Chat Modal Styles - Full Screen
  chatModalFullScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    // paddingTop will be set dynamically via inline style to account for safe area
  },
  chatHeaderText: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 20,
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
    padding: 16,
  },
  atlasMessageContainer: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  atlasBubbleAndAvatar: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  atlasMessageBubble: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 12,
    borderTopLeftRadius: 4,
    maxWidth: '85%',
  },
  atlasAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginLeft: 0,
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
    borderRadius: 16,
    padding: 12,
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
    paddingHorizontal: 20,
    paddingTop: 23.04,
    paddingBottom: 60, // Increased by another 30px (30 + 30 = 60)
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    maxWidth: '70%',
    ...BodyStyle,
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 12,
    color: '#342846',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 48, // Match send button height (12*2 + 24 for text)
  },
  sendButton: {
    backgroundColor: '#342846',
    borderRadius: 8,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 12,
    justifyContent: 'center',
    minWidth: 80,
    maxWidth: 100,
    minHeight: 48, // Explicit height to match input (12*2 + 24 for text)
    marginLeft: 15, // Move right 15px
  },
  sendButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
