import ClarityMap from '@/components/ClarityMap';
import { GuideModal, shouldShowGuideOnStartup } from '@/components/GuideModal';
import { MoodLoggedCard } from '@/components/MoodLoggedCard';
import { MoodSelector } from '@/components/MoodSelector';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { ChatMessage } from '@/utils/claudeApi';
import { getTodaysMood, MoodEntry } from '@/utils/moodStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Dimensions, Image, ImageBackground, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const ATLAS_CHAT_STORAGE_KEY = '@atlas_chat_messages';
const QUESTION_DAY_KEY = '@question_day';
const LAST_QUESTION_DATE_KEY = '@last_question_date';


export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  
  // Get translated questions from i18n
  const QUESTION_BANK = useMemo(() => {
    return t('home.questions', { returnObjects: true }) as string[];
  }, [t, i18n.language]);
  
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
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [moodSelected, setMoodSelected] = useState<string | null>(null);
  const [dailyAnswer, setDailyAnswer] = useState('');
  const [userName, setUserName] = useState<string>('');
  const [answerCaptured, setAnswerCaptured] = useState(false);
  const [showEnvelope, setShowEnvelope] = useState(false);
  const [answerCapturedToday, setAnswerCapturedToday] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>(QUESTION_BANK[0]);
  const [questionDay, setQuestionDay] = useState<number>(1);
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
  
  // Guide modal state
  const [showGuideModal, setShowGuideModal] = useState(false);
  
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showClarityMap, setShowClarityMap] = useState(false);
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
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'atlas' | 'user'; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [birthMonth, setBirthMonth] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');
  const [birthCity, setBirthCity] = useState<string>('');
  const [birthHour, setBirthHour] = useState<string>('');
  const [birthMinute, setBirthMinute] = useState<string>('');
  const [birthPeriod, setBirthPeriod] = useState<string>('');
  
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

  // Load user name, question day, and check if answer was captured today
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Load user name
        const name = await AsyncStorage.getItem('userName');
        if (name) {
          setUserName(name);
        }
        
        // Load birth date information
        const month = await AsyncStorage.getItem('birthMonth');
        const date = await AsyncStorage.getItem('birthDate');
        const year = await AsyncStorage.getItem('birthYear');
        const city = await AsyncStorage.getItem('birthCity');
        const hour = await AsyncStorage.getItem('birthHour');
        const minute = await AsyncStorage.getItem('birthMinute');
        const period = await AsyncStorage.getItem('birthPeriod');
        
        if (month) setBirthMonth(month);
        if (date) setBirthDate(date);
        if (year) setBirthYear(year);
        if (city) setBirthCity(city);
        if (hour) setBirthHour(hour);
        if (minute) setBirthMinute(minute);
        if (period) setBirthPeriod(period);
        
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
        
        // TEMPORARY: Always show question/field for testing
        // Check if answer was captured today
        const lastAnswerDate = await AsyncStorage.getItem('lastAnswerDate');
        
        // For testing: always show the question and field
        // Comment out the lines below to restore daily hiding behavior
        setAnswerCapturedToday(false);
        setAnswerCaptured(false);
        setShowEnvelope(false);
        
        /* Uncomment below to restore daily hiding behavior
        if (lastAnswerDate === today) {
          // Answer was already captured today, hide question and field completely
          setAnswerCapturedToday(true);
          setAnswerCaptured(true);
          // Don't show envelope animation if already answered today
        } else {
          // New day, reset the answer state
          setAnswerCapturedToday(false);
          setAnswerCaptured(false);
          setShowEnvelope(false);
        }
        */
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
      await AsyncStorage.setItem('lastAnswer', dailyAnswer);
      
      // Save to userAnswers array for the "Me" screen
      const answersData = await AsyncStorage.getItem('userAnswers');
      const answers = answersData ? JSON.parse(answersData) : [];
      
      // Check if there's already an answer for today
      const todayAnswerIndex = answers.findIndex((a: any) => a.date === todayISO);
      
      const questionText = currentQuestion;
      
      if (todayAnswerIndex >= 0) {
        // Update existing answer
        answers[todayAnswerIndex].answer = dailyAnswer;
        answers[todayAnswerIndex].question = questionText;
      } else {
        // Add new answer
        const newAnswer = {
          date: todayISO,
          question: questionText,
          answer: dailyAnswer,
        };
        answers.unshift(newAnswer); // Add to beginning
        // Keep only last 100 answers
        if (answers.length > 100) {
          answers.splice(100);
        }
      }
      
      await AsyncStorage.setItem('userAnswers', JSON.stringify(answers));
      
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
        return <Text style={styles.reportBodyText}>No report available.</Text>;
      }

      const lines = text.split('\n');
      const formattedElements: React.ReactNode[] = [];
      
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

      let dateAdded = false;
      
      lines.forEach((line, index) => {
        try {
          const trimmedLine = line.trim();
          
          // Skip empty lines
          if (!trimmedLine) {
            formattedElements.push(<Text key={`space-${index}`}>{'\n'}</Text>);
            return;
          }
          
          // Check if this is the date heading (first line or contains today's date)
          if (!dateAdded && (index === 0 || (todayDateStr && trimmedLine.includes(todayDateStr)) || trimmedLine.match(/^\w+day, \w+ \d+, \d{4}$/))) {
            formattedElements.push(
              <Text key={`date-${index}`} style={styles.reportDateHeading}>
                {todayDateStr && trimmedLine.includes(todayDateStr) ? trimmedLine : todayDateStr}
              </Text>
            );
            dateAdded = true;
            return;
          }
          
          // Check if this is a section heading (handle markdown ** or plain text)
          const headingMatch = trimmedLine.match(/^\*\*(.+?)\*\*$/) || 
                              trimmedLine.match(/^(.+?)$/);
          
          if (headingMatch) {
            const headingText = headingMatch[1]?.trim() || '';
            if (headingText === 'What to Focus On Today' || 
                headingText === 'What to Be Cautious Of' || 
                headingText === 'Daily Tips' ||
                headingText.startsWith('What to Focus On Today') ||
                headingText.startsWith('What to Be Cautious Of') ||
                headingText.startsWith('Daily Tips')) {
              const cleanHeading = headingText.split(':')[0].trim();
              formattedElements.push(
                <Text key={`heading-${index}`} style={styles.reportSectionHeading}>
                  {cleanHeading}
                </Text>
              );
              return;
            }
          }
          
          // Regular text
          formattedElements.push(
            <Text key={`text-${index}`} style={styles.reportBodyText}>
              {trimmedLine}
              {'\n'}
            </Text>
          );
        } catch (lineError) {
          console.error(`Error processing line ${index}:`, lineError);
          // Skip problematic lines
        }
      });

      // If no date heading was found, add it at the top
      if (!dateAdded && todayDateStr) {
        formattedElements.unshift(
          <Text key="date-top" style={styles.reportDateHeading}>
            {todayDateStr}
          </Text>
        );
      }

      return formattedElements.length > 0 ? formattedElements : <Text style={styles.reportBodyText}>No report available.</Text>;
    } catch (error) {
      console.error('Error in formatReportText:', error);
      return <Text style={styles.reportBodyText}>Error displaying report. Please try again.</Text>;
    }
  };

  // Handle Cosmic Insight click
  const handleCosmicInsightClick = async () => {
    try {
      // Get today's date for cache key
      const today = new Date();
      const todayKey = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const cacheKey = `daily-report-${todayKey}`;
      
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
      
      if (!birthMonth || !birthDate || !birthYear) {
        alert(t('home.birthDateMissing'));
        return;
      }
      
      setShowAstrologyModal(true);
      setIsLoadingReport(true);
      setAstrologyReport('');
      setQueueSkipped(false);
      
      // Check for cached report first
      try {
        const cachedReport = await AsyncStorage.getItem(cacheKey);
        if (cachedReport) {
          console.log('✅ Found cached report for today!');
          console.log('📄 Cached report length:', cachedReport.length);
          setIsLoadingReport(false);
          setAstrologyReport(cachedReport);
          return;
        } else {
          console.log('❌ No cached report found. Will generate new report.');
        }
      } catch (error) {
        console.error('Error checking cache:', error);
        setIsLoadingReport(false);
        setAstrologyReport('Error loading cached report. Please try again.');
      }
      
      // Clear any existing timer
      if (queueTimerRef.current) {
        clearTimeout(queueTimerRef.current);
        queueTimerRef.current = null;
      }
      
      // Start 30 second queue timer
      queueTimerRef.current = setTimeout(async () => {
        try {
          if (!queueSkipped) {
            await generateReport(cacheKey);
          }
        } catch (error) {
          console.error('Error in queue timer:', error);
          setIsLoadingReport(false);
          setAstrologyReport('Error generating report. Please try again.');
        }
      }, 30000);
    } catch (error) {
      console.error('Error in handleCosmicInsightClick:', error);
      setIsLoadingReport(false);
      setShowAstrologyModal(false);
      alert('An error occurred. Please try again.');
    }
  };

  // Generate report function
  const generateReport = async (cacheKey: string) => {
    try {
      console.log('🔮 Generating NEW astrology report...');
      console.log('📤 Sending birth data to Claude:', {
        month: birthMonth,
        date: birthDate,
        year: birthYear,
        city: birthCity || 'not provided',
        hour: birthHour || 'not provided',
        minute: birthMinute || 'not provided',
        period: birthPeriod || 'not provided',
      });
      
      // AI generation disabled to save credits
      // const report = await generateAstrologyReport(
      //   birthMonth!,
      //   birthDate!,
      //   birthYear!,
      //   birthCity || undefined,
      //   birthHour || undefined,
      //   birthMinute || undefined,
      //   birthPeriod || undefined
      // );
      
      // Using placeholder report instead
      const report = 'Your astrological profile is being prepared. This feature is temporarily disabled.';
      
      console.log('✅ Using placeholder report (AI generation disabled)');
      console.log('📏 Report length:', report?.length);
      console.log('📄 Report preview (first 300 chars):', report?.substring(0, 300));
      
      if (report && typeof report === 'string' && report.trim()) {
        // Save to cache
        try {
          await AsyncStorage.setItem(cacheKey, report);
          console.log('💾 Report saved to cache with key:', cacheKey);
        } catch (cacheError) {
          console.error('⚠️ Failed to save report to cache:', cacheError);
        }
        
        setIsLoadingReport(false);
        setAstrologyReport(report);
        console.log('✨ Report displayed in modal');
      } else {
        console.log('❌ Report is empty or invalid');
        setIsLoadingReport(false);
        setAstrologyReport('No report generated. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error generating astrology report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setIsLoadingReport(false);
      setAstrologyReport(`${t('home.errorGeneratingReport')}: ${errorMessage}. Please try again later.`);
    }
  };

  // Handle Skip Queue button
  const handleSkipQueue = async () => {
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];
    const cacheKey = `daily-report-${todayKey}`;
    
    setQueueSkipped(true);
    if (queueTimerRef.current) {
      clearTimeout(queueTimerRef.current);
    }
    await generateReport(cacheKey);
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
          name: 'Week Warrior',
          description: '7 day streak',
          dateEarned: todayISO,
          icon: '🔥',
        });
      }
      if (streak >= 30 && !badgeIds.has('streak_30')) {
        badges.push({
          id: 'streak_30',
          name: 'Monthly Master',
          description: '30 day streak',
          dateEarned: todayISO,
          icon: '⭐',
        });
      }
      if (streak >= 100 && !badgeIds.has('streak_100')) {
        badges.push({
          id: 'streak_100',
          name: 'Century Champion',
          description: '100 day streak',
          dateEarned: todayISO,
          icon: '🏆',
        });
      }

      // Answer count badges
      const answerCount = answers.length;
      if (answerCount >= 10 && !badgeIds.has('answers_10')) {
        badges.push({
          id: 'answers_10',
          name: 'Getting Started',
          description: '10 answers submitted',
          dateEarned: todayISO,
          icon: '📝',
        });
      }
      if (answerCount >= 50 && !badgeIds.has('answers_50')) {
        badges.push({
          id: 'answers_50',
          name: 'Reflection Master',
          description: '50 answers submitted',
          dateEarned: todayISO,
          icon: '📚',
        });
      }
      if (answerCount >= 100 && !badgeIds.has('answers_100')) {
        badges.push({
          id: 'answers_100',
          name: 'Wisdom Seeker',
          description: '100 answers submitted',
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
      const userMessage = { type: 'user' as const, text: userMessageText };
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
        const aiResponse = "I'm here to help! This feature is temporarily disabled. Please check back soon.";

        // Add AI response
        const aiMessage = { type: 'atlas' as const, text: aiResponse };
        setChatMessages([...updatedMessages, aiMessage]);
      } catch (error) {
        console.error('Error getting Atlas response:', error);
        const errorMessage = t('home.atlasError');
        const errorResponse = { type: 'atlas' as const, text: errorMessage };
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
          setChatMessages([{ type: 'atlas', text: initialMessage }]);
        }
      } catch (error) {
        console.error('Error loading Atlas chat messages:', error);
        // Fallback to initial message on error
        const initialMessage = "Hello! I'm Atlas, your journey guide. How can I help you today?";
        setChatMessages([{ type: 'atlas', text: initialMessage }]);
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
      
      {/* Guide Button - Top Right */}
      <TouchableOpacity
        style={[styles.guideButton, { top: Math.max(50, insets.top + 10) }]}
        onPress={() => setShowGuideModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.guideButtonText}>?</Text>
      </TouchableOpacity>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingTop: Math.max(40, insets.top + 10) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date - Top Left */}
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>

        {/* Greeting - Left Aligned - Fixed position below date */}
        <Text style={styles.greeting}>{t('home.hello')}, {userName || t('home.user')}</Text>

        {/* Dividing Bar */}
        <View style={styles.dividingBar} />

        {/* Question of the Day Heading - Hide when answer is saved */}
        {!answerCapturedToday && !showEnvelope && (
          <Text style={styles.sectionHeading}>{t('home.questionOfTheDay')}</Text>
        )}

        {/* Question and Answer Card */}
        {!answerCapturedToday && !showEnvelope && (
          <View style={styles.questionCard}>
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
        )}

        {/* Envelope animation - shown during transformation */}
        {showEnvelope && (
          <View style={styles.questionCard}>
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

        {/* Explore Heading */}
        <Text style={styles.sectionHeading}>{t('home.explore')}</Text>

        {/* Four sections grid */}
        <View style={styles.gridContainer}>
          {/* Row 1 */}
          <View style={styles.gridRow}>
            <Animated.View style={{ transform: [{ scale: cosmicInsightScale }] }}>
              <TouchableOpacity 
                style={[styles.gridButton, styles.gridButtonLeft]} 
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

            <Animated.View style={{ transform: [{ scale: clarityMapScale }] }}>
              <TouchableOpacity 
                style={[styles.gridButton, styles.gridButtonRight]} 
                activeOpacity={1}
                onPress={() => handleRectanglePress(clarityMapScale, () => setShowClarityMap(true))}
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
          <View style={styles.gridRow}>
            <Animated.View style={{ transform: [{ scale: progressScale }] }}>
              <TouchableOpacity
                style={[styles.gridButton, styles.gridButtonLeft]}
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

            <Animated.View style={{ transform: [{ scale: ikigaiScale }] }}>
              <TouchableOpacity 
                style={[styles.gridButton, styles.gridButtonRight]} 
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

        {/* Mood Card - Show logged state or selector based on state */}
        {todaysMood && !showMoodSelector ? (
          <MoodLoggedCard 
            emoji={todaysMood.emoji}
            moodText={todaysMood.text}
            onUpdatePress={handleUpdateMood}
          />
        ) : (
          <ImageBackground
            source={require('../../assets/images/goal.background.png')}
            style={styles.moodCard}
            imageStyle={styles.moodCardImage}
          >
            <Text style={styles.moodCardTitle}>How are you feeling today?</Text>
            <MoodSelector showQuestion={false} onMoodSaved={handleMoodSaved} />
          </ImageBackground>
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

        {/* Feeling Anxious Section */}
        <TouchableOpacity 
          style={styles.feelingAnxiousCard}
          onPress={handleOpenAtlasChat}
          activeOpacity={0.8}
        >
          <View style={styles.feelingAnxiousContent}>
            <View style={styles.feelingAnxiousTextContainer}>
              <Text style={styles.feelingAnxiousHeading}>{t('home.feelingAnxious')}</Text>
              <Text style={styles.feelingAnxiousBody}>
                {t('home.feelingAnxiousBody')}
              </Text>
            </View>
            <Image
              source={require('../../assets/images/deer.face.png')}
              style={styles.feelingAnxiousImage}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Clarity Map */}
      {showClarityMap && (
        <ClarityMap onClose={() => setShowClarityMap(false)} />
      )}

      {/* Astrology Report Modal - Full Screen */}
      <Modal
        visible={showAstrologyModal}
        animationType="fade"
        transparent={false}
        onRequestClose={() => {
          try {
            setShowAstrologyModal(false);
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
            {/* Queue background image - only show during loading/queue screen */}
            {isLoadingReport && (
              <ImageBackground
                source={require('../../assets/images/queue.png')}
                style={styles.queueBackground}
                imageStyle={styles.queueBackgroundImage}
                resizeMode="cover"
              />
            )}
            {/* Cosmic Insight background image - only show when report is displayed */}
            {astrologyReport && astrologyReport.trim().length > 0 && !isLoadingReport && (
              <ImageBackground
                source={require('../../assets/images/cosmic.insight.png')}
                style={styles.cosmicInsightBackground}
                imageStyle={styles.cosmicInsightBackgroundImage}
                resizeMode="cover"
              />
            )}
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
                setShowAstrologyModal(false);
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
                <Text style={styles.queueHeading}>{t('home.cosmicInsightQueue')}</Text>
                <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
                <Text style={styles.fullScreenLoadingText}>
                  {t('home.cosmicInsightQueueText')}
                </Text>
                <TouchableOpacity
                  style={styles.skipQueueButton}
                  onPress={handleSkipQueue}
                  activeOpacity={0.8}
                >
                  <Text style={styles.skipQueueButtonText}>{t('home.skipQueue')}</Text>
                </TouchableOpacity>
              </View>
            ) : astrologyReport && astrologyReport.trim().length > 0 ? (
              <View style={styles.fullScreenTextContainer}>
                {/* Semi-transparent dark blue overlay */}
                <View style={styles.textOverlay} />
                <View style={styles.reportTextWrapper}>
                  {(() => {
                    try {
                      return formatReportText(astrologyReport);
                    } catch (error) {
                      console.error('Error rendering report text:', error);
                      return <Text style={styles.reportBodyText}>Error displaying report. Please try again.</Text>;
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
        <KeyboardAvoidingView
          style={styles.chatModalFullScreen}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Chat Header */}
          <View style={[styles.chatHeader, { paddingTop: insets.top + 16 }]}>
            <Text style={styles.chatHeaderText}>{t('home.atlasIsHere')}</Text>
            <TouchableOpacity
              onPress={() => setShowAtlasChat(false)}
              style={styles.closeChatButton}
            >
              <Text style={styles.closeChatButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Chat Content */}
          <ScrollView 
            style={styles.chatContent} 
            contentContainerStyle={styles.chatContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {chatMessages.map((message, index) => (
              message.type === 'atlas' ? (
                <View key={index} style={styles.atlasMessageContainer}>
                  <View style={styles.atlasBubbleAndAvatar}>
                    <View style={styles.atlasMessageBubble}>
                      <Text style={styles.atlasMessageText}>{message.text}</Text>
                    </View>
                    <Image
                      source={require('../../assets/images/deer.face.png')}
                      style={styles.atlasAvatar}
                      resizeMode="contain"
                    />
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
            {isChatLoading && (
              <View style={styles.atlasMessageContainer}>
                <View style={styles.atlasBubbleAndAvatar}>
                  <View style={styles.atlasMessageBubble}>
                    <ActivityIndicator size="small" color="#342846" />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Chat Input */}
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder={t('home.askForHelp')}
              placeholderTextColor="#999"
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={handleSendChatMessage}
              numberOfLines={1}
              editable={!isChatLoading}
            />
            <TouchableOpacity 
              style={[styles.sendButton, isChatLoading && styles.sendButtonDisabled]}
              onPress={handleSendChatMessage}
              disabled={isChatLoading}
            >
              <Text style={styles.sendButtonText}>{t('home.send')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </KeyboardAvoidingView>
      
      {/* Guide Modal */}
      <GuideModal 
        visible={showGuideModal} 
        onClose={() => setShowGuideModal(false)} 
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  homeBackground: {
    flex: 1,
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
  },
  contentContainer: {
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 20,
  },
  guideButton: {
    position: 'absolute',
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  guideButtonText: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  dateText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'left',
  },
  greeting: {
    ...HeadingStyle,
    color: '#FFFFFF',
    textAlign: 'left',
    marginBottom: 16,
  },
  dividingBar: {
    height: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.3,
    marginBottom: 24,
  },
  sectionHeading: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 20,
    marginBottom: 16,
    textAlign: 'left',
  },
  questionCard: {
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
  questionCardText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'left',
  },
  answerFieldCard: {
    borderWidth: 1,
    borderColor: '#342846',
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
    padding: 20,
    marginBottom: 24,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
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
  reportDateHeading: {
    ...HeadingStyle,
    color: '#fff',
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  reportSectionHeading: {
    ...HeadingStyle,
    color: '#fff',
    fontSize: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  reportBodyText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
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
