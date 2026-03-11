import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import {
    AboutYouForm,
    CallingAwaitsStep,
    CommitmentChallengeStep,
    ConsistencyPlanStep,
    CityData,
    CurrentFeelingStep,
    AtlasEncouragementStep,
    CurrentLifeContextStep,
    CustomPathDreamForm,
    CustomPathForm,
    DistractionsStep,
    FutureSelfStep,
    FutureSelfAtlasStep,
    ForgeYourOwnPathStep,
    getOnboardingSteps,
    IkigaiForm,
    InsightStatStep,
    JourneyLoadingStep,
    LoadingStep,
    MotivationEventStep,
    PathChallengeStep,
    PathExplorationStep,
    PastAttemptsStep,
    PastChallengesStep,
    PastChallengesAtlasStep,
    PersonalizedPlanStep,
    PathsAlignedStep,
    PledgeStep,
    SetbackPlanStep,
    SuccessInspirationStep,
    ThankYouAtlasStep,
    WelcomeAtlasStep,
    WhatHeldBackStep,
    WhyDifferentStep,
    WhyHereStep,
    styles,
} from '@/components/onboarding';
import PaywallStep from '@/components/onboarding/PaywallStep';
import { checkSubscriptionStatus } from '@/utils/superwall';
import { generateUnifiedDestinyProfile } from '@/utils/claudeApi';
import { trackLoginEvent } from '@/utils/appTracking';
import {
  hapticError,
  hapticHeavy,
  hapticLight,
  hapticMedium,
  hapticSuccess,
  hapticWarning,
} from '@/utils/haptics';
import { BodyStyle } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated, Dimensions, Image, Keyboard, Modal, NativeModules, Platform, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View, useWindowDimensions } from 'react-native';
import { supabase } from '../lib/supabase';

const USE_YAZIO_FLOW = true;
const YAZIO_FLOW_STEPS = [
  'aboutYou',
  'welcomeAtlas',
  'whyHere',
  'currentFeeling',
  'currentLifeContext',
  'whatHeldBack',
  'atlasEncouragement',
  'pastAttempts',
  'insightStat',
  'pastChallenges',
  'pastChallengesAtlas',
  'whyDifferent',
  'ikigai',
  'customPathDream',
  'successInspiration',
  'futureSelf',
  'futureSelfAtlas',
  'motivationEvent',
  'commitmentChallenge',
  'distractions',
  'consistencyPlan',
  'setbackPlan',
  'pledge',
  'thankYouAtlas',
  'personalizedPlan',
  'journeyLoading',
  'pathExploration',
  'paywall',
] as const;
type YazioFlowStepKey = (typeof YAZIO_FLOW_STEPS)[number];

export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const iosConstants = (Platform.constants as { interfaceIdiom?: string } | undefined);
  const nativePlatformConstants = NativeModules?.PlatformConstants as { interfaceIdiom?: string } | undefined;
  const interfaceIdiom = iosConstants?.interfaceIdiom || nativePlatformConstants?.interfaceIdiom;
  const deviceName = String(Constants.deviceName || '').toLowerCase();
  const iosModelFromConstants = String(Constants.platform?.ios?.model || '').toLowerCase();
  const screen = Dimensions.get('screen');
  const isLikelyIpadDevice = Platform.OS === 'ios' && (
    Platform.isPad ||
    interfaceIdiom === 'pad' ||
    deviceName.includes('ipad') ||
    iosModelFromConstants.includes('ipad') ||
    Math.max(screen.width, screen.height) >= 1000
  );
  const onboardingCardInset = isLikelyIpadDevice ? 16 : undefined;
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const localeText = (english: string, russian: string) => (isRussian ? russian : english);
  const router = useRouter();
  const params = useLocalSearchParams();
  const isAddGoalFlow = typeof params.source === 'string' && params.source === 'add-goal';
  const JUST_FINISHED_ONBOARDING_KEY = '@just_finished_onboarding';
  const [currentStep, setCurrentStep] = useState(0);
  const currentStepRef = useRef(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [showIkigaiModal, setShowIkigaiModal] = useState(false);
  const [showLifeContextModal, setShowLifeContextModal] = useState(false);
  const [ikigaiModalIconFailed, setIkigaiModalIconFailed] = useState(false);
  const [ikigaiCurrentPage, setIkigaiCurrentPage] = useState(0);
  
  // Get onboarding steps with translations - recalculate when language changes
  const ONBOARDING_STEPS = useMemo(() => getOnboardingSteps(t), [t, i18n.language]);
  
  // Recalculates steps when language changes
  useEffect(() => {}, [i18n.language]);
  
  // Check if we should navigate to a specific step (e.g., from new-goal screen)
  useEffect(() => {
    if (!params.step) return;
    // In the YAZIO onboarding flow, always begin at welcomeAtlas unless this is the add-goal flow.
    if (USE_YAZIO_FLOW && !isAddGoalFlow) return;

    const targetStep = parseInt(params.step as string, 10);
    const maxStep = USE_YAZIO_FLOW ? YAZIO_FLOW_STEPS.length - 1 : ONBOARDING_STEPS.length;
    if (targetStep < 1 || targetStep > maxStep) return;

    const stepIndex = USE_YAZIO_FLOW
      ? targetStep - 1
      : ONBOARDING_STEPS.findIndex(s => s.id === targetStep);
    if (stepIndex === -1) return;

    setCurrentStep(stepIndex);
    Animated.timing(slideAnim, {
      toValue: -stepIndex * screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [params.step, screenWidth, ONBOARDING_STEPS, slideAnim, isAddGoalFlow]);
  
  // Form state for About You step
  const [name, setName] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthHour, setBirthHour] = useState('');
  const [birthMinute, setBirthMinute] = useState('');
  const [birthAmPm, setBirthAmPm] = useState('AM');
  const [dontKnowTime, setDontKnowTime] = useState(false);
  const [birthCity, setBirthCity] = useState('');
  const [birthLatitude, setBirthLatitude] = useState('');
  const [birthLongitude, setBirthLongitude] = useState('');
  const [birthTimezone, setBirthTimezone] = useState('');
  const [currentTimezone, setCurrentTimezone] = useState('');

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (!tz) return;
    setCurrentTimezone(tz);
    AsyncStorage.setItem('currentTimezone', tz).catch((error) => {
    });
  }, []);

  // Load name when pledge step (step 3) is shown
  useEffect(() => {
    if (currentStep === 2) { // Step 3 is index 2 (0-indexed)
      const loadNameForPledge = async () => {
        try {
          const savedName = await AsyncStorage.getItem('userName');
          if (savedName && savedName.trim()) {
            // Always update name when on pledge step to ensure it's current
            setName(savedName.trim());
          }
        } catch (error) {
          console.error('Error loading name for pledge:', error);
        }
      };
      loadNameForPledge();
    }
  }, [currentStep, name]);

  // Reset Path Forward forms when entering Current Life Context step (step 5, index 4)
  // This ensures the Path Forward screen doesn't appear after Ikigai
  useEffect(() => {
    if (currentStep === 4) { // Step 5 (Current Life Context) is index 4
      setShowCustomPathDreamForm(false);
      setShowCustomPathForm(false);
      setExploringPathId(null);
    }
  }, [currentStep]);
  const [citySuggestions, setCitySuggestions] = useState<CityData[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showAmPmDropdown, setShowAmPmDropdown] = useState(false);
  const [pledgeAnswer, setPledgeAnswer] = useState('');
  const [signature, setSignature] = useState('');
  const [showDontKnowTimeModal, setShowDontKnowTimeModal] = useState(false);
  const [hideBirthTimeFields, setHideBirthTimeFields] = useState(false);
  
  // Refs for auto-focus
  const birthMonthRef = useRef<TextInput>(null);
  const birthDateRef = useRef<TextInput>(null);
  const birthYearRef = useRef<TextInput>(null);
  const birthHourRef = useRef<TextInput>(null);
  const birthMinuteRef = useRef<TextInput>(null);
  
  // Ikigai form state
  const [whatYouLove, setWhatYouLove] = useState('');
  const [whatYouGoodAt, setWhatYouGoodAt] = useState('');
  const [whatWorldNeeds, setWhatWorldNeeds] = useState('');
  const [whatCanBePaidFor, setWhatCanBePaidFor] = useState('');
  const [currentSituation, setCurrentSituation] = useState('');
  const [biggestConstraint, setBiggestConstraint] = useState('');
  const [whatMattersMost, setWhatMattersMost] = useState<string[]>([]);
  
  // Path Forward form state
  const [dreamGoal, setDreamGoal] = useState('');
  const [fearOrBarrier, setFearOrBarrier] = useState('');
  
  // Custom path state
  const [showCustomPathForm, setShowCustomPathForm] = useState(false);
  const [showCustomPathDreamForm, setShowCustomPathDreamForm] = useState(false);
  type CustomPathData = {
    pathName: string;
    pathDescription: string;
    keyStrengths: string;
    desiredOutcome: string;
    timeCommitment: string;
    uniqueApproach: string;
    milestones: string[];
  };
  const [customPathData, setCustomPathData] = useState<CustomPathData | null>(null);
  
  // Path exploration state
  const [exploringPathId, setExploringPathId] = useState<number | null>(null);
  const [exploringPathName, setExploringPathName] = useState<string>('');
  const [exploringPathDescription, setExploringPathDescription] = useState<string>('');
  const [generatedPaths, setGeneratedPaths] = useState<Array<{ id: number; title: string; description: string; glowColor: string }>>([]);
  const [showPathChallenge, setShowPathChallenge] = useState(false);
  const [pathChallenge, setPathChallenge] = useState<string>('');
  const [showPredefinedGoalChallenge, setShowPredefinedGoalChallenge] = useState(false);
  const [predefinedGoalTitle, setPredefinedGoalTitle] = useState<string>('');
  const [showJourneyLoading, setShowJourneyLoading] = useState(false);
  const [journeyLoadingItems, setJourneyLoadingItems] = useState<string[]>([]);
  const [selectedGoalTitle, setSelectedGoalTitle] = useState<string>('');
  const [selectedGoalFear, setSelectedGoalFear] = useState<string>('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [userIsPremium, setUserIsPremium] = useState<boolean>(false);
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<'premium' | 'free' | null>(null);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [showExistingUserLoginButton, setShowExistingUserLoginButton] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [whyHereAnswer, setWhyHereAnswer] = useState('');
  const [currentFeelingAnswer, setCurrentFeelingAnswer] = useState('');
  const [whatHeldBackAnswers, setWhatHeldBackAnswers] = useState<string[]>([]);
  const [pastAttemptsAnswers, setPastAttemptsAnswers] = useState<string[]>([]);
  const [pastChallengesAnswers, setPastChallengesAnswers] = useState<string[]>([]);
  const [whyDifferentAnswer, setWhyDifferentAnswer] = useState('');
  const [successInspirationAnswer, setSuccessInspirationAnswer] = useState<string[]>([]);
  const [futureSelfAnswer, setFutureSelfAnswer] = useState('');
  const [motivationEventAnswer, setMotivationEventAnswer] = useState('');
  const [commitmentChallengeAnswer, setCommitmentChallengeAnswer] = useState('');
  const [distractionsAnswers, setDistractionsAnswers] = useState<string[]>([]);
  const [consistencyPlanAnswers, setConsistencyPlanAnswers] = useState<string[]>([]);
  const [setbackPlanAnswers, setSetbackPlanAnswers] = useState<string[]>([]);
  const [canShowFinalPaywall, setCanShowFinalPaywall] = useState(false);
  const [canSubmitAboutYou, setCanSubmitAboutYou] = useState(false);
  const isAdvancingStepRef = useRef(false);

  const clarityEstimateDays = useMemo(() => {
    const baseDaysByCommitment: Record<string, number> = {
      '3days': 18,
      '7days': 22,
      '14days': 30,
      '30days': 42,
      'flexible': 55,
    };

    let score = baseDaysByCommitment[commitmentChallengeAnswer] ?? 30;

    // Positive drivers that usually accelerate clarity.
    if (motivationEventAnswer && motivationEventAnswer !== 'none') score -= 4;
    score -= Math.min(consistencyPlanAnswers.length, 4) * 2;
    score -= Math.min(setbackPlanAnswers.length, 5) * 1.5;
    if (futureSelfAnswer.trim().length > 0) score -= 2;
    if (successInspirationAnswer.length > 0) score -= 1;

    // Friction signals that can slow early momentum.
    score += Math.min(distractionsAnswers.length, 4) * 2;
    score += Math.min(whatHeldBackAnswers.length, 4) * 1;
    score += Math.min(pastChallengesAnswers.length, 4) * 1;

    return Math.max(14, Math.min(75, Math.round(score)));
  }, [
    commitmentChallengeAnswer,
    consistencyPlanAnswers,
    distractionsAnswers,
    futureSelfAnswer,
    motivationEventAnswer,
    pastChallengesAnswers,
    setbackPlanAnswers,
    successInspirationAnswer,
    whatHeldBackAnswers,
  ]);

  const isTransientNetworkError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return (
      message.includes('network request failed') ||
      message.includes('failed to fetch') ||
      message.includes('fetch failed') ||
      message.includes('timeout') ||
      message.includes('aborted')
    );
  };

  const runWithNetworkRetry = async <T,>(
    operation: () => Promise<T>,
    retries = 2,
    baseDelayMs = 450
  ): Promise<T> => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!isTransientNetworkError(error) || attempt === retries) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  };
  
  // Check premium status on mount
  useEffect(() => {
    const initOnboarding = async () => {
      if (!isAddGoalFlow) {
        // Sign out any existing session for fresh onboarding
        await supabase.auth.signOut();
      }
      const premium = await checkSubscriptionStatus();
      setUserIsPremium(premium);
    };
    initOnboarding();
  }, [isAddGoalFlow]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isAddGoalFlow) return;

    const loadStoredProfile = async () => {
      try {
        const keys = [
          'userName',
          'birthMonth',
          'birthDate',
          'birthYear',
          'birthCity',
          'birthLatitude',
          'birthLongitude',
          'birthTimezone',
          'currentTimezone',
          'birthHour',
          'birthMinute',
          'birthPeriod',
          'ikigaiWhatYouLove',
          'ikigaiWhatYouGoodAt',
          'ikigaiWhatWorldNeeds',
          'ikigaiWhatCanBePaidFor',
          'fear',
          'whatExcites',
          'lifeContextSituation',
          'lifeContextConstraint',
          'lifeContextMatters',
          'destinyProfile_paths',
          'destinyProfile_responseSignature',
        ];

        const entries = await AsyncStorage.multiGet(keys);
        const entryMap = new Map(entries);
        const getValue = (key: string) => entryMap.get(key) || '';

        const storedName = getValue('userName');
        const storedBirthMonth = getValue('birthMonth');
        const storedBirthDate = getValue('birthDate');
        const storedBirthYear = getValue('birthYear');
        const storedBirthCity = getValue('birthCity');
        const storedBirthLatitude = getValue('birthLatitude');
        const storedBirthLongitude = getValue('birthLongitude');
        const storedBirthTimezone = getValue('birthTimezone');
        const storedCurrentTimezone = getValue('currentTimezone');
        const storedBirthHour = getValue('birthHour');
        const storedBirthMinute = getValue('birthMinute');
        const storedBirthPeriod = getValue('birthPeriod');
        const storedWhatYouLove = getValue('ikigaiWhatYouLove');
        const storedWhatYouGoodAt = getValue('ikigaiWhatYouGoodAt');
        const storedWhatWorldNeeds = getValue('ikigaiWhatWorldNeeds');
        const storedWhatCanBePaidFor = getValue('ikigaiWhatCanBePaidFor');
        const storedFear = getValue('fear');
        const storedWhatExcites = getValue('whatExcites');
        const storedSituationRaw = getValue('lifeContextSituation');
        const storedConstraintRaw = getValue('lifeContextConstraint');
        const storedMattersRaw = getValue('lifeContextMatters');

        let storedMatters: string[] = [];
        let storedSituation = '';
        let storedConstraint = '';
        try {
          if (storedMattersRaw) {
            const parsed = JSON.parse(storedMattersRaw);
            if (Array.isArray(parsed)) {
              storedMatters = parsed;
            }
          }
          if (storedSituationRaw) {
            const parsed = JSON.parse(storedSituationRaw);
            storedSituation = Array.isArray(parsed) ? parsed[0] || '' : '';
          }
          if (storedConstraintRaw) {
            const parsed = JSON.parse(storedConstraintRaw);
            storedConstraint = Array.isArray(parsed) ? parsed[0] || '' : '';
          }
        } catch (error) {
          // Ignore parsing errors and use defaults
        }

        if (storedName) setName(storedName);
        if (storedBirthMonth) setBirthMonth(storedBirthMonth);
        if (storedBirthDate) setBirthDate(storedBirthDate);
        if (storedBirthYear) setBirthYear(storedBirthYear);
        if (storedBirthCity) setBirthCity(storedBirthCity);
        if (storedBirthLatitude) setBirthLatitude(storedBirthLatitude);
        if (storedBirthLongitude) setBirthLongitude(storedBirthLongitude);
        if (storedBirthTimezone) setBirthTimezone(storedBirthTimezone);
        if (storedCurrentTimezone) setCurrentTimezone(storedCurrentTimezone);
        if (storedBirthHour) setBirthHour(storedBirthHour);
        if (storedBirthMinute) setBirthMinute(storedBirthMinute);
        if (storedBirthPeriod) setBirthAmPm(storedBirthPeriod);
        if (storedWhatYouLove) setWhatYouLove(storedWhatYouLove);
        if (storedWhatYouGoodAt) setWhatYouGoodAt(storedWhatYouGoodAt);
        if (storedWhatWorldNeeds) setWhatWorldNeeds(storedWhatWorldNeeds);
        if (storedWhatCanBePaidFor) setWhatCanBePaidFor(storedWhatCanBePaidFor);
        if (storedFear) setFearOrBarrier(storedFear);
        if (storedWhatExcites) setDreamGoal(storedWhatExcites);
        if (storedSituation) setCurrentSituation(storedSituation);
        if (storedConstraint) setBiggestConstraint(storedConstraint);
        if (storedMatters.length > 0) setWhatMattersMost(storedMatters);

        setShowPaywall(false);
        setShowAccountCreation(false);

        const inputSignature = JSON.stringify({
          birthMonth: storedBirthMonth,
          birthDate: storedBirthDate,
          birthYear: storedBirthYear,
          birthCity: storedBirthCity,
          birthHour: storedBirthHour,
          birthMinute: storedBirthMinute,
          birthPeriod: storedBirthPeriod,
          whatYouLove: storedWhatYouLove,
          whatYouGoodAt: storedWhatYouGoodAt,
          whatWorldNeeds: storedWhatWorldNeeds,
          whatCanBePaidFor: storedWhatCanBePaidFor,
          fear: storedFear,
          whatExcites: storedWhatExcites,
          currentSituation: storedSituation,
          biggestConstraint: storedConstraint,
          whatMattersMost: storedMatters,
        });

        const storedPaths = getValue('destinyProfile_paths');
        const storedSignature = getValue('destinyProfile_responseSignature');

        if (!storedPaths || storedSignature !== inputSignature) {
          const profile = await generateUnifiedDestinyProfile(
            storedBirthMonth || undefined,
            storedBirthDate || undefined,
            storedBirthYear || undefined,
            storedBirthCity || undefined,
            storedBirthHour || undefined,
            storedBirthMinute || undefined,
            storedBirthPeriod || undefined,
            storedWhatYouLove || undefined,
            storedWhatYouGoodAt || undefined,
            storedWhatWorldNeeds || undefined,
            storedWhatCanBePaidFor || undefined,
            storedFear || undefined,
            storedWhatExcites || undefined,
            storedSituation || undefined,
            storedConstraint || undefined,
            storedMatters
          );

          const responseId = Date.now().toString();
          await AsyncStorage.multiSet([
            ['destinyProfile_callingAwaits', JSON.stringify(profile.callingAwaits)],
            ['destinyProfile_paths', JSON.stringify(profile.paths)],
            ['destinyProfile_responseId', responseId],
            ['destinyProfile_responseSignature', inputSignature],
            ['destinyProfile_apiCallStatus', 'completed'],
          ]);
        }
      } catch (error) {
        console.error('Error loading stored profile for add-goal flow:', error);
      }
    };

    loadStoredProfile();
  }, [isAddGoalFlow]);
  
  // Helper function to create and save goal
  const createAndSaveGoal = async (overrideCustomPathData?: CustomPathData | null, overrideFear?: string) => {
    const resolvedCustomPathData = overrideCustomPathData ?? customPathData;
    const isCustomGoal = resolvedCustomPathData !== null;
    const resolvedFear = (overrideFear || fearOrBarrier || '').trim() || localeText('Fear of failure', 'Страх неудачи');
    
    try {
      // Set loading items
      const loadingItems = [
        localeText('Analyzing your strengths', 'Анализируем твои сильные стороны'),
        localeText('Building your path to the goal', 'Строим путь к твоей цели'),
        localeText('Preparing your personalized roadmap', 'Собираем персональную дорожную карту'),
        localeText('Getting your journey ready', 'Готовим твое путешествие'),
      ];
      setJourneyLoadingItems(loadingItems);
      // Show loading immediately to avoid flashing back to trajectory screen.
      setShowJourneyLoading(true);
      
      let completeGoal;
      
      if (isCustomGoal && resolvedCustomPathData && resolvedCustomPathData.milestones.length > 0) {
        // Use milestones from custom path data
        const milestoneSteps = resolvedCustomPathData.milestones.map((milestone, index) => ({
          name: milestone.trim(),
          description: milestone.trim(),
          order: index + 1,
        }));
        
        completeGoal = {
          name: resolvedCustomPathData.pathName,
          steps: milestoneSteps,
          numberOfSteps: milestoneSteps.length,
          estimatedDuration: resolvedCustomPathData.timeCommitment,
          hardnessLevel: 'Medium' as const,
          fear: resolvedFear,
        };
      } else {
        // Using fallback goal structure
        completeGoal = {
          name: selectedGoalTitle,
          steps: [
            { name: localeText('Step 1', 'Шаг 1'), description: localeText('Take the first step and build momentum.', 'Сделай первый шаг и задай импульс движению.'), order: 1 },
            { name: localeText('Step 2', 'Шаг 2'), description: localeText('Stay focused and keep moving forward.', 'Продолжай фокусироваться и набирать темп.'), order: 2 },
            { name: localeText('Step 3', 'Шаг 3'), description: localeText('Reach an important milestone.', 'Дойди до важной промежуточной точки.'), order: 3 },
            { name: localeText('Step 4', 'Шаг 4'), description: localeText('Finish your goal and celebrate the result.', 'Заверши цель и отпразднуй результат.'), order: 4 },
          ],
          numberOfSteps: 4,
          estimatedDuration: localeText('3 months', '3 месяца'),
          hardnessLevel: 'Medium' as const,
          fear: resolvedFear,
        };
      }
      
      const userSelectedDuration = isCustomGoal && resolvedCustomPathData
        ? resolvedCustomPathData.timeCommitment
        : '';

      // Save goal to AsyncStorage
      const goalToSave = {
        id: Date.now().toString(),
        name: completeGoal.name,
        steps: completeGoal.steps,
        numberOfSteps: completeGoal.numberOfSteps,
        estimatedDuration: completeGoal.estimatedDuration,
        aiEstimatedDuration: undefined,
        userSelectedDuration: userSelectedDuration || undefined,
        hardnessLevel: completeGoal.hardnessLevel,
        fear: completeGoal.fear,
        progressPercentage: 0,
        isActive: true,
        isQueued: false,
        isAiGenerated: !isCustomGoal,
        milestones: isCustomGoal ? resolvedCustomPathData?.milestones : undefined,
        createdAt: new Date().toISOString(),
        currentStepIndex: -1, // -1 means no levels completed, only level 1 is unlocked
        pathName: isCustomGoal && resolvedCustomPathData ? resolvedCustomPathData.pathName : (exploringPathName || predefinedGoalTitle || undefined),
        pathDescription: isCustomGoal && resolvedCustomPathData ? resolvedCustomPathData.pathDescription : (exploringPathDescription || undefined),
      };
      
      // Load existing goals and add new one
      const existingGoalsData = await AsyncStorage.getItem('userGoals');
      const existingGoals = existingGoalsData ? JSON.parse(existingGoalsData) : [];
      
      // Check if we already have 3 active goals
      const activeGoals = existingGoals.filter((g: any) => g.isActive === true);
      if (activeGoals.length >= 3) {
        // Mark new goal as queued
        goalToSave.isActive = false;
        goalToSave.isQueued = true;
      } else {
        // Mark new goal as active
        goalToSave.isActive = true;
        goalToSave.isQueued = false;
      }
      
      // Add new goal to the beginning of the list
      const updatedGoals = [goalToSave, ...existingGoals];
      await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));
      void hapticSuccess();
      
      // Save to Supabase
      // Map timeline to valid database values
      const mapTimeline = (t: string): string => {
        const lower = (t || '').toLowerCase();
        if (lower.includes('1') && lower.includes('3')) return '1-3 months';
        if (lower.includes('3') && lower.includes('6')) return '3-6 months';
        if (lower.includes('6') && lower.includes('12')) return '6-12 months';
        if (lower.includes('1+') || lower.includes('year')) return '1+ years';
        if (lower.includes('год') || lower.includes('лет')) return '1+ years';
        if (lower.includes('6') && lower.includes('меся')) return '6-12 months';
        if (lower.includes('3') && lower.includes('меся')) return '1-3 months';
        if (lower.includes('1') && lower.includes('меся')) return '1-3 months';
        if (lower.includes('3 month')) return '1-3 months';
        if (lower.includes('6 month')) return '6-12 months';
        return '3-6 months'; // default fallback
      };
      
      try {
        const { data: { user } } = await runWithNetworkRetry(() => supabase.auth.getUser());
        if (user) {
          const goalInsertPayload: Record<string, unknown> = {
            user_id: user.id,
            name: goalToSave.name,
            description: goalToSave.pathDescription || '',
            difficulty: 'medium',
            timeline: mapTimeline(goalToSave.estimatedDuration || ''),
            is_ai_generated: !isCustomGoal,
            status: goalToSave.isActive ? 'active' : 'queued',
          };
          // Safety guard: never send milestones to `goals` table (column does not exist).
          delete goalInsertPayload.milestones;

          const { data: newGoal, error: goalError } = await runWithNetworkRetry(() =>
            supabase
              .from('goals')
              .insert(goalInsertPayload)
              .select()
              .single()
          );
          
          if (goalError) console.error('Goal insert error:', goalError.message);

          if (newGoal && completeGoal.steps) {
            const stepsToInsert = completeGoal.steps.map((step: any, index: number) => ({
              goal_id: newGoal.id,
              text: step.name || step.description,
              completed: false,
              order_index: index,
            }));
            await runWithNetworkRetry(() => supabase.from('goal_steps').insert(stepsToInsert));
          }

          // Save selected path if it exists
          if (goalToSave.pathName) {
            await runWithNetworkRetry(() =>
              supabase.from('paths').upsert({
                user_id: user.id,
                name: goalToSave.pathName,
                description: goalToSave.pathDescription || '',
                is_selected: true,
                is_ai_generated: !isCustomGoal,
              }, { onConflict: 'user_id,name' }).select()
            );
          }
        }
      } catch (error) {
        if (isTransientNetworkError(error)) {
          console.warn('Supabase temporarily unavailable while saving goal. Local goal is preserved.');
        } else {
          console.error('Error saving goal to Supabase:', JSON.stringify(error));
        }
      }
      
    } catch (error) {
      console.error('Error creating goal:', error);
      void hapticError();
      // Fallback to placeholder loading items
      setJourneyLoadingItems([
        localeText('Analyzing your strengths', 'Анализируем твои сильные стороны'),
        localeText('Building your path to the goal', 'Строим путь к твоей цели'),
        localeText('Preparing your personalized roadmap', 'Собираем персональную дорожную карту'),
        localeText('Getting your journey ready', 'Готовим твое путешествие'),
      ]);
      setShowJourneyLoading(true);
    }
  };
  
  const handleCreateAccount = async () => {
    void hapticMedium();
    const route = pendingRoute; // Capture before any async operations
    
    if (!signupEmail.trim() || !signupPassword.trim()) {
      void hapticWarning();
      setSignupError(localeText('Please enter email and password.', 'Пожалуйста, введи email и пароль.'));
      return;
    }
    if (signupPassword.length < 6) {
      void hapticWarning();
      setSignupError(localeText('Password must be at least 6 characters.', 'Пароль должен быть не меньше 6 символов.'));
      return;
    }
    
    setSignupLoading(true);
    setSignupError('');
    setShowExistingUserLoginButton(false);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
      });
      
      if (error) {
        void hapticError();
        setSignupError(error.message);
        setShowExistingUserLoginButton(
          /already registered|already been registered|already exists|user already/i.test(error.message)
        );
        setSignupLoading(false);
        return;
      }
      
      if (data.user) {
        await trackLoginEvent();
        // Now save all onboarding data to Supabase
        try {
          // Wait for the profile trigger to create the row
          let profileExists = false;
          for (let attempt = 0; attempt < 5; attempt++) {
            const { data: profile } = await runWithNetworkRetry(() =>
              supabase
                .from('profiles')
                .select('id')
                .eq('id', data.user.id)
                .maybeSingle()
            );
            if (profile) {
              profileExists = true;
              break;
            }
            // Wait 500ms before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          if (profileExists) {
            const { error: profileError } = await runWithNetworkRetry(() =>
              supabase.from('profiles').update({
                name: name.trim() || null,
                birth_date: (birthYear?.trim() && birthMonth?.trim() && birthDate?.trim())
                  ? `${birthYear.trim()}-${birthMonth.trim().padStart(2, '0')}-${birthDate.trim().padStart(2, '0')}`
                  : null,
                birth_time: (birthHour && birthMinute && !hideBirthTimeFields)
                  ? `${birthHour.trim()}:${birthMinute.trim()} ${birthAmPm}`
                  : null,
                birth_place: birthCity.trim() || null,
                tier: route === 'premium' ? 'premium' : 'free',
              }).eq('id', data.user.id)
            );
            if (profileError) console.error('Profile update error:', profileError.message);
          } else {
            console.error('Profile row not created after 5 attempts');
          }
          
          // Save Ikigai answers
          const { error: ikigaiError } = await runWithNetworkRetry(() =>
            supabase.from('ikigai_answers').insert({
              user_id: data.user.id,
              what_you_love: whatYouLove || null,
              what_youre_good_at: whatYouGoodAt || null,
              what_world_needs: whatWorldNeeds || null,
              what_you_can_be_paid_for: whatCanBePaidFor || null,
            })
          );
          if (ikigaiError) console.error('Ikigai save error:', ikigaiError.message);
          
          // Save onboarding data (life context)
          const { error: onboardingError } = await runWithNetworkRetry(() =>
            supabase.from('onboarding_data').insert({
              user_id: data.user.id,
              current_situation: currentSituation || null,
              biggest_constraint: biggestConstraint || null,
              selected_values: whatMattersMost || [],
            })
          );
          if (onboardingError) console.error('Onboarding data save error:', onboardingError.message);
        } catch (saveError) {
          if (isTransientNetworkError(saveError)) {
            console.warn('Onboarding data sync temporarily unavailable. Account is created and local state is preserved.');
          } else {
            console.error('Error saving onboarding data to Supabase:', saveError);
          }
        }
        
        // Continue to the appropriate route
        setShowAccountCreation(false);
        setSignupLoading(false);
        void hapticSuccess();
        
        if (USE_YAZIO_FLOW) {
          await markJustFinishedOnboarding();
          router.replace('/(tabs)');
        } else if (route === 'premium') {
          setUserIsPremium(true);
          setCurrentStep(7);
          Animated.timing(slideAnim, {
            toValue: -7 * screenWidth,
            duration: 300,
            useNativeDriver: true,
          }).start();
        } else {
          setUserIsPremium(false);
          setCurrentStep(7);
          slideAnim.setValue(-7 * screenWidth);
        }
      }
    } catch (err) {
      console.error('Signup error:', err);
      void hapticError();
      setSignupError(localeText('Something went wrong. Please try again.', 'Что-то пошло не так. Попробуй еще раз.'));
      setShowExistingUserLoginButton(false);
      setSignupLoading(false);
    }
  };
  
  // Update refs when state changes
  currentStepRef.current = currentStep;
  const currentFlowStepKey: YazioFlowStepKey | null = USE_YAZIO_FLOW ? YAZIO_FLOW_STEPS[currentStep] : null;
  const totalStepCount = USE_YAZIO_FLOW ? YAZIO_FLOW_STEPS.length : ONBOARDING_STEPS.length;

  const goToNext = async (options?: { userInitiated?: boolean; showAboutYouValidationAlert?: boolean }) => {
    const userInitiated = options?.userInitiated ?? false;
    const showAboutYouValidationAlert = options?.showAboutYouValidationAlert ?? false;
    if (isAdvancingStepRef.current) {
      return;
    }
    isAdvancingStepRef.current = true;
    const step = currentStepRef.current;

    if (USE_YAZIO_FLOW) {
      const stepKey = YAZIO_FLOW_STEPS[step];

      if (stepKey === 'aboutYou') {
        const missingCore =
          !name.trim() ||
          !birthMonth.trim() ||
          !birthDate.trim() ||
          !birthYear.trim() ||
          !birthCity.trim();
        if (missingCore) {
          if (userInitiated && showAboutYouValidationAlert) {
            void hapticWarning();
            Alert.alert('', t('onboarding.fillRequiredFields'));
          }
          isAdvancingStepRef.current = false;
          return;
        }
        if (!hideBirthTimeFields && (!birthHour.trim() || !birthMinute.trim())) {
          if (userInitiated && showAboutYouValidationAlert) {
            void hapticWarning();
            Alert.alert('', t('onboarding.fillBirthTime'));
          }
          isAdvancingStepRef.current = false;
          return;
        }
      }

      if (stepKey === 'pledge') {
        if (!signature || signature.trim() === '') {
          void hapticWarning();
          Alert.alert('', isRussian ? 'Пожалуйста, поставьте подпись, чтобы продолжить.' : 'Please sign to continue.');
          isAdvancingStepRef.current = false;
          return;
        }
      }

      try {
        if (stepKey === 'aboutYou') {
          await AsyncStorage.multiSet([
            ['userName', name.trim()],
            ['birthMonth', birthMonth.trim()],
            ['birthDate', birthDate.trim()],
            ['birthYear', birthYear.trim()],
            ['birthCity', birthCity.trim()],
            ['birthLatitude', birthLatitude || ''],
            ['birthLongitude', birthLongitude || ''],
            ['birthTimezone', birthTimezone || ''],
            ['currentTimezone', currentTimezone || ''],
          ]);
          if (!hideBirthTimeFields && birthHour.trim() && birthMinute.trim()) {
            await AsyncStorage.multiSet([
              ['birthHour', birthHour.trim()],
              ['birthMinute', birthMinute.trim()],
              ['birthPeriod', birthAmPm.trim()],
            ]);
          }

          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('profiles').update({
              name: name.trim() || null,
              birth_date: `${birthYear.trim()}-${birthMonth.trim().padStart(2, '0')}-${birthDate.trim().padStart(2, '0')}`,
              birth_time: (!hideBirthTimeFields && birthHour && birthMinute)
                ? `${birthHour.trim()}:${birthMinute.trim()} ${birthAmPm}`
                : null,
              birth_place: birthCity.trim() || null,
            }).eq('id', user.id);
          }
        }

        if (stepKey === 'ikigai') {
          await AsyncStorage.multiSet([
            ['ikigaiWhatYouLove', whatYouLove.trim()],
            ['ikigaiWhatYouGoodAt', whatYouGoodAt.trim()],
            ['ikigaiWhatWorldNeeds', whatWorldNeeds.trim()],
            ['ikigaiWhatCanBePaidFor', whatCanBePaidFor.trim()],
          ]);
        }

        if (stepKey === 'currentLifeContext') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: existingOnboarding } = await supabase
              .from('onboarding_data')
              .select('id')
              .eq('user_id', user.id)
              .single();

            if (existingOnboarding) {
              await supabase.from('onboarding_data').update({
                current_situation: currentSituation,
                biggest_constraint: biggestConstraint,
                selected_values: whatMattersMost,
              }).eq('user_id', user.id);
            } else {
              await supabase.from('onboarding_data').insert({
                user_id: user.id,
                current_situation: currentSituation,
                biggest_constraint: biggestConstraint,
                selected_values: whatMattersMost,
              });
            }
          }
        }

        if (stepKey === 'pledge') {
          await AsyncStorage.setItem('pledgeSignature', signature);
        }
      } catch (error) {
        console.error('Error in Yazio flow save step:', error);
      }

      if (step < totalStepCount - 1) {
        const nextStep = step + 1;
        const nextStepKey = YAZIO_FLOW_STEPS[nextStep];
        if (nextStepKey === 'paywall' && !canShowFinalPaywall) {
          isAdvancingStepRef.current = false;
          return;
        }
        if (nextStepKey === 'journeyLoading' && journeyLoadingItems.length === 0) {
          setJourneyLoadingItems([
            localeText('Analyzing your strengths', 'Анализируем твои сильные стороны'),
            localeText('Building your path to the goal', 'Строим путь к твоей цели'),
            localeText('Preparing your personalized roadmap', 'Собираем персональную дорожную карту'),
            localeText('Getting your journey ready', 'Готовим твое путешествие'),
          ]);
        }
        Animated.timing(slideAnim, {
          toValue: -nextStep * screenWidth,
          duration: 300,
          useNativeDriver: true,
        }).start();
        setCurrentStep(nextStep);
        isAdvancingStepRef.current = false;
        return;
      }

      await markJustFinishedOnboarding();
      router.replace('/(tabs)');
      isAdvancingStepRef.current = false;
      return;
    }

    // ── Validation (outside try-catch so errors can never bypass a return) ──

    if (step === 1) {
      const missingCore =
        !name.trim() ||
        !birthMonth.trim() ||
        !birthDate.trim() ||
        !birthYear.trim() ||
        !birthCity.trim();
      if (missingCore) {
        if (userInitiated) {
          void hapticWarning();
          Alert.alert('', t('onboarding.fillRequiredFields'));
        }
        isAdvancingStepRef.current = false;
        return;
      }

      // Age gate: must be 16 or older
      const yearNum = parseInt(birthYear.trim(), 10);
      if (!isNaN(yearNum) && birthYear.trim().length === 4) {
        const today = new Date();
        const monthNum = parseInt(birthMonth.trim(), 10) || 1;
        const dayNum = parseInt(birthDate.trim(), 10) || 1;
        const birthDateObj = new Date(yearNum, monthNum - 1, dayNum);
        const age = today.getFullYear() - birthDateObj.getFullYear()
          - (today < new Date(today.getFullYear(), birthDateObj.getMonth(), birthDateObj.getDate()) ? 1 : 0);
        if (age < 16) {
          void hapticWarning();
          Alert.alert(
            isRussian ? 'Возрастное ограничение' : 'Age Restriction',
            isRussian
              ? 'Calling доступен только пользователям от 16 лет и старше.'
              : 'Calling is only available for users aged 16 and above.',
          );
          return;
        }
      }

      if (!hideBirthTimeFields && (!birthHour.trim() || !birthMinute.trim())) {
        if (userInitiated) {
          void hapticWarning();
          Alert.alert('', t('onboarding.fillBirthTime'));
        }
        isAdvancingStepRef.current = false;
        return;
      }
    }

    if (step === 2) {
      if (!signature || signature.trim() === '') {
        void hapticWarning();
        Alert.alert(
          '',
          isRussian
            ? 'Пожалуйста, поставьте подпись, чтобы продолжить.'
            : 'Please sign to continue.',
        );
        return;
      }
    }

    // ── Saves & navigation (in try-catch for error safety) ──
    try {
      if (step === 1) {
      // Fields validated above — save to AsyncStorage
      try {
        await AsyncStorage.setItem('userName', name.trim());
        await AsyncStorage.setItem('birthMonth', birthMonth.trim());
        await AsyncStorage.setItem('birthDate', birthDate.trim());
        await AsyncStorage.setItem('birthYear', birthYear.trim());
        await AsyncStorage.setItem('birthCity', birthCity.trim());
        if (birthLatitude && birthLatitude.trim()) await AsyncStorage.setItem('birthLatitude', birthLatitude.trim());
        if (birthLongitude && birthLongitude.trim()) await AsyncStorage.setItem('birthLongitude', birthLongitude.trim());
        if (birthTimezone && birthTimezone.trim()) await AsyncStorage.setItem('birthTimezone', birthTimezone.trim());
        if (currentTimezone && currentTimezone.trim()) await AsyncStorage.setItem('currentTimezone', currentTimezone.trim());
        if (!hideBirthTimeFields && birthHour.trim() && birthMinute.trim()) {
          await AsyncStorage.setItem('birthHour', birthHour.trim());
          await AsyncStorage.setItem('birthMinute', birthMinute.trim());
          await AsyncStorage.setItem('birthPeriod', birthAmPm.trim());
        }
      } catch (error) {
        console.error('Error saving user data:', error);
      }
      
      // Save to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({
            name: name.trim() || null,
            birth_date: (birthYear?.trim() && birthMonth?.trim() && birthDate?.trim()) 
              ? `${birthYear.trim()}-${birthMonth.trim().padStart(2, '0')}-${birthDate.trim().padStart(2, '0')}` 
              : null,
            birth_time: (!hideBirthTimeFields && birthHour && birthMinute) 
              ? `${birthHour.trim()}:${birthMinute.trim()} ${birthAmPm}` 
              : null,
            birth_place: birthCity.trim() || null,
          }).eq('id', user.id);
        }
      } catch (error) {
        console.error('Error saving user data to Supabase:', error);
      }
      
      // Always proceed to next step regardless of field values - no validation required
    }
    
    if (step === 2) {
      // Signature validated above — save to AsyncStorage
      try {
        await AsyncStorage.setItem('pledgeSignature', signature);
      } catch (error) {
        console.error('Error saving signature:', error);
      }
    }
    
    // Save Ikigai answers when completing Ikigai step (step index 3, which is step.id === 4)
    if (step === 3) {
      try {
        await AsyncStorage.setItem('ikigaiWhatYouLove', whatYouLove.trim());
        await AsyncStorage.setItem('ikigaiWhatYouGoodAt', whatYouGoodAt.trim());
        await AsyncStorage.setItem('ikigaiWhatWorldNeeds', whatWorldNeeds.trim());
        await AsyncStorage.setItem('ikigaiWhatCanBePaidFor', whatCanBePaidFor.trim());
      } catch (error) {
        console.error('Error saving Ikigai data:', error);
      }
      
      // Save to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: existingIkigai } = await supabase
            .from('ikigai_answers')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (existingIkigai) {
            await supabase.from('ikigai_answers').update({
              what_you_love: whatYouLove.trim(),
              what_youre_good_at: whatYouGoodAt.trim(),
              what_world_needs: whatWorldNeeds.trim(),
              what_you_can_be_paid_for: whatCanBePaidFor.trim(),
              updated_at: new Date().toISOString(),
            }).eq('user_id', user.id);
          } else {
            await supabase.from('ikigai_answers').insert({
              user_id: user.id,
              what_you_love: whatYouLove.trim(),
              what_youre_good_at: whatYouGoodAt.trim(),
              what_world_needs: whatWorldNeeds.trim(),
              what_you_can_be_paid_for: whatCanBePaidFor.trim(),
            });
          }
        }
      } catch (error) {
        console.error('Error saving Ikigai data to Supabase:', error);
      }
      
      // Ensure Path Forward form is NOT shown after Ikigai - go directly to Current Life Context
      setShowCustomPathDreamForm(false);
      setShowCustomPathForm(false);
    }
    
    // Save Current Life Context step (step index 4, which is step.id === 5)
    if (step === 4) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: existingOnboarding } = await supabase
            .from('onboarding_data')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (existingOnboarding) {
            await supabase.from('onboarding_data').update({
              current_situation: currentSituation,
              biggest_constraint: biggestConstraint,
              selected_values: whatMattersMost,
            }).eq('user_id', user.id);
          } else {
            await supabase.from('onboarding_data').insert({
              user_id: user.id,
              current_situation: currentSituation,
              biggest_constraint: biggestConstraint,
              selected_values: whatMattersMost,
            });
          }
        }
      } catch (error) {
        console.error('Error saving Current Life Context data to Supabase:', error);
      }
      
    }
    
    if (step === 6) {
      // Show the paywall only the first time user reaches Calling Awaits.
      // After account creation, pendingRoute is set and we should continue.
      if (!isAddGoalFlow && pendingRoute === null) {
        setShowPaywall(true);
        return;
      }
    }
    
    if (step < ONBOARDING_STEPS.length - 1) {
      const nextStep = step + 1;
      // Proceed with navigation - NO VALIDATION
      Animated.timing(slideAnim, {
        toValue: -nextStep * screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setCurrentStep(nextStep);
    } else {
      // Ensure name and birth date are saved before navigating (if available, not required)
      try {
        if (name && name.trim()) {
          await AsyncStorage.setItem('userName', name.trim());
        }
        // Save birth date components if available (not required)
        if (birthMonth && birthMonth.trim()) await AsyncStorage.setItem('birthMonth', birthMonth.trim());
        if (birthDate && birthDate.trim()) await AsyncStorage.setItem('birthDate', birthDate.trim());
        if (birthYear && birthYear.trim()) await AsyncStorage.setItem('birthYear', birthYear.trim());
        if (birthCity && birthCity.trim()) await AsyncStorage.setItem('birthCity', birthCity.trim());
        if (birthLatitude && birthLatitude.trim()) await AsyncStorage.setItem('birthLatitude', birthLatitude.trim());
        if (birthLongitude && birthLongitude.trim()) await AsyncStorage.setItem('birthLongitude', birthLongitude.trim());
        if (birthTimezone && birthTimezone.trim()) await AsyncStorage.setItem('birthTimezone', birthTimezone.trim());
        if (currentTimezone && currentTimezone.trim()) await AsyncStorage.setItem('currentTimezone', currentTimezone.trim());
        // Save birth time if available
        if (birthHour && birthMinute && birthHour.trim() && birthMinute.trim() && !hideBirthTimeFields) {
          await AsyncStorage.setItem('birthHour', birthHour.trim());
          await AsyncStorage.setItem('birthMinute', birthMinute.trim());
          await AsyncStorage.setItem('birthPeriod', birthAmPm.trim());
        }
      } catch (error) {
        console.error('Error saving user data:', error);
      }
      // Navigate to main app (tabs) - no validation required
      await markJustFinishedOnboarding();
      router.replace('/(tabs)');
    }
    } catch (error) {
      console.error('Error in goToNext:', error);
      void hapticError();
    } finally {
      isAdvancingStepRef.current = false;
    }
  };

  const goToPrevious = () => {
    const step = currentStepRef.current;
    // If showing custom path form, go back to paths list
    if (showCustomPathDreamForm) {
      setShowCustomPathDreamForm(false);
      return;
    }
    if (showCustomPathForm) {
      setShowCustomPathForm(false);
      return;
    }
    if (showPredefinedGoalChallenge) {
      setShowPredefinedGoalChallenge(false);
      setPredefinedGoalTitle('');
      return;
    }
    // If exploring a path, go back to paths list
    if (exploringPathId !== null) {
      setExploringPathId(null);
      setShowPathChallenge(false);
      setPathChallenge('');
      setExploringPathName('');
      return;
    }
    if (step > 0) {
      const prevStep = step - 1;
      Animated.timing(slideAnim, {
        toValue: -prevStep * screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setCurrentStep(prevStep);
    } else {
      // Go back to landing screen
      router.back();
    }
  };
  
  const handleBackFromAccountCreation = () => {
    void hapticMedium();
    setShowAccountCreation(false);
    if (isAddGoalFlow) {
      goToPrevious();
    } else if (USE_YAZIO_FLOW) {
      const paywallStepIndex = YAZIO_FLOW_STEPS.indexOf('paywall');
      if (paywallStepIndex >= 0) {
        setCurrentStep(paywallStepIndex);
        Animated.timing(slideAnim, {
          toValue: -paywallStepIndex * screenWidth,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } else {
      // Return to the paywall screen when backing out of account creation.
      setShowPaywall(true);
      setPendingRoute(null);
    }
  };

  // Step swiping disabled for onboarding - navigation only via buttons
  const markJustFinishedOnboarding = async () => {
    if (isAddGoalFlow) return;
    try {
      await AsyncStorage.setItem(JUST_FINISHED_ONBOARDING_KEY, 'true');
    } catch (error) {
      console.error('Error setting onboarding completion flag:', error);
    }
  };

  const goToNextFromUser = async (options?: { showAboutYouValidationAlert?: boolean }) => {
    if (USE_YAZIO_FLOW && currentFlowStepKey === 'aboutYou' && !canSubmitAboutYou) {
      return;
    }
    void hapticMedium();
    await goToNext({
      userInitiated: true,
      showAboutYouValidationAlert: options?.showAboutYouValidationAlert ?? false,
    });
  };

  const currentStepId = ONBOARDING_STEPS[currentStep]?.id;
  const currentYazioStep = USE_YAZIO_FLOW ? YAZIO_FLOW_STEPS[currentStep] : null;
  useEffect(() => {
    if (!USE_YAZIO_FLOW || currentYazioStep !== 'aboutYou') {
      setCanSubmitAboutYou(true);
      return;
    }

    setCanSubmitAboutYou(false);
    const timer = setTimeout(() => {
      setCanSubmitAboutYou(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentYazioStep]);

  useEffect(() => {
    if (!USE_YAZIO_FLOW) return;
    if (currentYazioStep !== 'paywall') return;
    if (canShowFinalPaywall) return;

    const personalizedPlanIndex = YAZIO_FLOW_STEPS.indexOf('personalizedPlan');
    if (personalizedPlanIndex >= 0) {
      setCurrentStep(personalizedPlanIndex);
      Animated.timing(slideAnim, {
        toValue: -personalizedPlanIndex * screenWidth,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [canShowFinalPaywall, currentYazioStep, screenWidth, slideAnim]);

  const shouldShowOnboardingBackground =
    !showJourneyLoading &&
    !showPaywall &&
    !showAccountCreation &&
    (
      USE_YAZIO_FLOW
        ? currentYazioStep !== 'paywall'
        : (currentStep <= 4 || currentStepId === 7 || currentStepId === 8 || currentStepId === 9)
    );
  const onboardingBackgroundSource =
    USE_YAZIO_FLOW
      ? (
          currentYazioStep === 'aboutYou'
            ? require('../assets/images/about.png')
            : currentYazioStep === 'pathExploration'
              ? require('../assets/images/direction.png')
              : currentYazioStep === 'welcomeAtlas' || currentYazioStep === 'atlasEncouragement' || currentYazioStep === 'pastChallengesAtlas' || currentYazioStep === 'futureSelfAtlas' || currentYazioStep === 'thankYouAtlas'
                ? require('../assets/images/ikigaion.png')
                : require('../assets/images/onboarding.png')
        )
      : currentStepId === 9
      ? require('../assets/images/own.png')
      : currentStepId === 8
        ? require('../assets/images/direction.png')
      : currentStepId === 7
        ? require('../assets/images/calling.png')
      : currentStepId === 2
        ? require('../assets/images/about.png')
      : currentStepId === 1
        ? require('../assets/images/ikigaion.png')
        : require('../assets/images/onboarding.png');

  return (
    <PaperTextureBackground>
    <View style={styles.container}>
      {shouldShowOnboardingBackground && (
        <Image
          source={onboardingBackgroundSource}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />
      )}
      {!showJourneyLoading && !showCustomPathForm && !showPredefinedGoalChallenge && !showPathChallenge && !showAccountCreation && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPressIn={() => {
              void hapticMedium();
            }}
            onPress={() => {
              goToPrevious();
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#342846" />
          </TouchableOpacity>
            <View style={styles.headerProgressContainer}>
              <View style={styles.headerProgressBar}>
                <View 
                  style={[
                    styles.headerProgressFill, 
                    { width: `${Math.min(((currentStep + 1) / totalStepCount) * 100, 100)}%` }
                  ]} 
                />
              </View>
            </View>
            {((USE_YAZIO_FLOW && currentFlowStepKey === 'ikigai') || (!USE_YAZIO_FLOW && currentStep === 3)) && (
              <TouchableOpacity 
                style={styles.ikigaiHelpButton} 
                onPressIn={() => {
                  void hapticLight();
                }}
                onPress={() => {
                  setShowIkigaiModal(true);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="help-outline" size={24} color="#342846" />
              </TouchableOpacity>
            )}
            {((USE_YAZIO_FLOW && currentFlowStepKey === 'currentLifeContext') || (!USE_YAZIO_FLOW && currentStep === 4)) && (
              <TouchableOpacity 
                style={styles.ikigaiHelpButton} 
                onPressIn={() => {
                  void hapticLight();
                }}
                onPress={() => {
                  setShowLifeContextModal(true);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="help-outline" size={24} color="#342846" />
              </TouchableOpacity>
            )}
        </View>
      )}
      {showAccountCreation && (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200, elevation: 200 }}
        >
          <View style={[styles.header, { paddingBottom: 0 }]}>
            <TouchableOpacity
              style={styles.backButton}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              activeOpacity={0.7}
              onPress={handleBackFromAccountCreation}
            >
              <MaterialIcons name="arrow-back" size={24} color="#342846" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {!USE_YAZIO_FLOW && showPaywall && !isAddGoalFlow ? (
        <PaywallStep
          onSubscribe={() => {
            void hapticHeavy();
            setPendingRoute('premium');
            setUserIsPremium(true);
            setShowPaywall(false);
            setShowAccountCreation(true);
          }}
          onBack={(meta) => {
            void hapticMedium();
            // If user backs out of paywall page 1, return to Calling Awaits (step 7),
            // not to Create Account. Mark free route so paywall does not reopen instantly.
            setPendingRoute('free');
            setUserIsPremium(false);
            setShowPaywall(false);
            setShowAccountCreation(false);
            const nextStep = 7; // Step id 8 (Paths Aligned)
            setCurrentStep(nextStep);
            Animated.timing(slideAnim, {
              toValue: -nextStep * screenWidth,
              duration: 300,
              useNativeDriver: true,
            }).start();
            void meta;
          }}
          onContinueFree={async () => {
            void hapticMedium();
            setPendingRoute('free');
            setUserIsPremium(false);
            await markJustFinishedOnboarding();
            router.replace('/(tabs)');
          }}
        />
      ) : showAccountCreation ? (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
            <Image
              source={require('../assets/images/account.png')}
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
              }}
              resizeMode="cover"
            />
            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
              <View style={{ marginTop: -195 }}>
                <Text style={{ fontFamily: 'BricolageGrotesque-Bold', fontSize: 28, color: '#342846', textAlign: 'center', marginBottom: 8 }}>
                  {localeText('CREATE ACCOUNT', 'СОЗДАЙ АККАУНТ')}
                </Text>
                <Text style={{ fontFamily: 'AnonymousPro-Regular', fontSize: 15, color: '#342846', opacity: 0.6, textAlign: 'center', marginBottom: 32 }}>
                  {localeText('Save your progress and continue on any device', 'Сохрани прогресс и продолжай путь с любого устройства')}
                </Text>
              </View>
              
              <TextInput
                style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, fontFamily: 'AnonymousPro-Regular', fontSize: 16, color: '#342846', borderWidth: 1, borderColor: 'rgba(52, 40, 70, 0.15)', marginBottom: 12, marginTop: 35 }}
                placeholder={localeText('Email', 'Эл. почта')}
                placeholderTextColor="#999"
                value={signupEmail}
                onChangeText={(value) => {
                  setSignupEmail(value);
                  setShowExistingUserLoginButton(false);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              <TextInput
                style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, fontFamily: 'AnonymousPro-Regular', fontSize: 16, color: '#342846', borderWidth: 1, borderColor: 'rgba(52, 40, 70, 0.15)', marginBottom: 24 }}
                placeholder={localeText('Password (minimum 6 characters)', 'Пароль (минимум 6 символов)')}
                placeholderTextColor="#999"
                value={signupPassword}
                onChangeText={(value) => {
                  setSignupPassword(value);
                  setShowExistingUserLoginButton(false);
                }}
                secureTextEntry
              />
              
              {signupError ? (
                <View style={{ marginBottom: 16, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'AnonymousPro-Regular', fontSize: 14, color: '#cc3333', textAlign: 'center' }}>
                    {signupError}
                  </Text>
                  {showExistingUserLoginButton && (
                    <TouchableOpacity
                      style={{ marginTop: 10, backgroundColor: '#342846', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18 }}
                      activeOpacity={0.8}
                      onPress={() => {
                        void hapticMedium();
                        setShowExistingUserLoginButton(false);
                        setSignupError('');
                        router.push({
                          pathname: '/email-login',
                          params: { email: signupEmail.trim() },
                        });
                      }}
                    >
                      <Text style={{ fontFamily: 'AnonymousPro-Regular', fontSize: 14, color: '#FFFFFF' }}>
                        {localeText('Log In', 'Войти')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
            </View>
            
              <View
                style={{
                  position: 'absolute',
                  bottom: Platform.isPad && keyboardHeight > 0 ? keyboardHeight : 0,
                  left: 0,
                  right: 0,
                  padding: 24,
                  paddingHorizontal: 40,
                  paddingBottom: 40,
                  zIndex: 1000,
                }}
              >
                <TouchableOpacity
                  style={{ backgroundColor: '#342846', borderRadius: 30, paddingVertical: 16, alignItems: 'center', opacity: signupLoading ? 0.7 : 1 }}
                  onPressIn={() => {
                    void hapticMedium();
                  }}
                  onPress={handleCreateAccount}
                  disabled={signupLoading}
                >
                  <Text style={[BodyStyle, { fontSize: 18, color: '#FFFFFF' }]}>
                    {signupLoading ? localeText('Creating account...', 'Создаем аккаунт...') : localeText('Create account', 'Создать аккаунт')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      ) : (
        <Animated.View
          style={[
            styles.slider,
            {
              transform: [{ translateX: slideAnim }],
              width: screenWidth * totalStepCount,
            },
          ]}
        >
          {USE_YAZIO_FLOW ? YAZIO_FLOW_STEPS.map((stepKey, index) => (
            <View key={`${stepKey}-${index}`} style={[styles.stepContainer, { width: screenWidth }]}>
              {stepKey === 'welcomeAtlas' ? (
                <WelcomeAtlasStep name={name} onContinue={goToNextFromUser} />
              ) : stepKey === 'aboutYou' ? (
                <AboutYouForm
                  name={name}
                  setName={setName}
                  birthMonth={birthMonth}
                  setBirthMonth={setBirthMonth}
                  birthDate={birthDate}
                  setBirthDate={setBirthDate}
                  birthYear={birthYear}
                  setBirthYear={setBirthYear}
                  birthHour={birthHour}
                  setBirthHour={setBirthHour}
                  birthMinute={birthMinute}
                  setBirthMinute={setBirthMinute}
                  birthAmPm={birthAmPm}
                  setBirthAmPm={setBirthAmPm}
                  dontKnowTime={dontKnowTime}
                  setDontKnowTime={setDontKnowTime}
                  birthCity={birthCity}
                  setBirthCity={setBirthCity}
                  setBirthLatitude={setBirthLatitude}
                  setBirthLongitude={setBirthLongitude}
                  citySuggestions={citySuggestions}
                  setCitySuggestions={setCitySuggestions}
                  showCityDropdown={showCityDropdown}
                  setShowCityDropdown={setShowCityDropdown}
                  showAmPmDropdown={showAmPmDropdown}
                  setShowAmPmDropdown={setShowAmPmDropdown}
                  hideBirthTimeFields={hideBirthTimeFields}
                  birthMonthRef={birthMonthRef}
                  birthDateRef={birthDateRef}
                  birthYearRef={birthYearRef}
                  birthHourRef={birthHourRef}
                  birthMinuteRef={birthMinuteRef}
                  setShowDontKnowTimeModal={setShowDontKnowTimeModal}
                />
              ) : stepKey === 'whyHere' ? (
                <WhyHereStep onContinue={(value) => { setWhyHereAnswer(value); void goToNextFromUser(); }} />
              ) : stepKey === 'currentFeeling' ? (
                <CurrentFeelingStep onContinue={(value) => { setCurrentFeelingAnswer(value); void goToNextFromUser(); }} />
              ) : stepKey === 'currentLifeContext' ? (
                <CurrentLifeContextStep
                  currentSituation={currentSituation}
                  setCurrentSituation={setCurrentSituation}
                  biggestConstraint={biggestConstraint}
                  setBiggestConstraint={setBiggestConstraint}
                  whatMattersMost={whatMattersMost}
                  setWhatMattersMost={setWhatMattersMost}
                  onContinue={() => goToNextFromUser()}
                  birthMonth={birthMonth}
                  birthDate={birthDate}
                  birthYear={birthYear}
                  birthCity={birthCity}
                  birthHour={birthHour}
                  birthMinute={birthMinute}
                  birthPeriod={birthAmPm}
                  whatYouLove={whatYouLove}
                  whatYouGoodAt={whatYouGoodAt}
                  whatWorldNeeds={whatWorldNeeds}
                  whatCanBePaidFor={whatCanBePaidFor}
                  fear={fearOrBarrier}
                  whatExcites={dreamGoal}
                />
              ) : stepKey === 'whatHeldBack' ? (
                <WhatHeldBackStep onContinue={(values) => { setWhatHeldBackAnswers(values); void goToNextFromUser(); }} />
              ) : stepKey === 'atlasEncouragement' ? (
                <AtlasEncouragementStep
                  currentSituation={currentSituation}
                  onContinue={goToNextFromUser}
                />
              ) : stepKey === 'pastAttempts' ? (
                <PastAttemptsStep onContinue={(values) => { setPastAttemptsAnswers(values); void goToNextFromUser(); }} />
              ) : stepKey === 'insightStat' ? (
                <InsightStatStep onContinue={goToNextFromUser} />
              ) : stepKey === 'pastChallenges' ? (
                <PastChallengesStep name={name} onContinue={(values) => { setPastChallengesAnswers(values); void goToNextFromUser(); }} />
              ) : stepKey === 'pastChallengesAtlas' ? (
                <PastChallengesAtlasStep onContinue={goToNextFromUser} />
              ) : stepKey === 'whyDifferent' ? (
                <WhyDifferentStep onContinue={(value) => { setWhyDifferentAnswer(value); void goToNextFromUser(); }} />
              ) : stepKey === 'ikigai' ? (
                <IkigaiForm
                  whatYouLove={whatYouLove}
                  setWhatYouLove={setWhatYouLove}
                  whatYouGoodAt={whatYouGoodAt}
                  setWhatYouGoodAt={setWhatYouGoodAt}
                  whatWorldNeeds={whatWorldNeeds}
                  setWhatWorldNeeds={setWhatWorldNeeds}
                  whatCanBePaidFor={whatCanBePaidFor}
                  setWhatCanBePaidFor={setWhatCanBePaidFor}
                  onPageChange={setIkigaiCurrentPage}
                  onContinue={goToNextFromUser}
                />
              ) : stepKey === 'customPathDream' ? (
                <PathsAlignedStep
                  forceTabletLayout={isLikelyIpadDevice}
                  cardHorizontalInset={onboardingCardInset}
                  hideCustomPathOption
                  birthMonth={birthMonth}
                  birthDate={birthDate}
                  birthYear={birthYear}
                  birthCity={birthCity}
                  birthHour={birthHour}
                  birthMinute={birthMinute}
                  birthPeriod={birthAmPm}
                  whatYouLove={whatYouLove}
                  whatYouGoodAt={whatYouGoodAt}
                  whatWorldNeeds={whatWorldNeeds}
                  whatCanBePaidFor={whatCanBePaidFor}
                  fear={fearOrBarrier}
                  whatExcites={dreamGoal}
                  onPathsGenerated={(paths) => {
                    setGeneratedPaths(paths);
                  }}
                  onExplorePath={(pathId) => {
                    void hapticLight();
                    const path = generatedPaths.find(p => p.id === pathId);
                    const pathTitle = path?.title || localeText('Your path', 'Твой путь');
                    setSelectedGoalTitle(pathTitle);
                    void goToNextFromUser();
                  }}
                  onWorkOnDreamGoal={() => {
                    // Hidden in this branch via hideCustomPathOption.
                  }}
                />
              ) : stepKey === 'successInspiration' ? (
                <SuccessInspirationStep onContinue={(values) => { setSuccessInspirationAnswer(values); void goToNextFromUser(); }} />
              ) : stepKey === 'futureSelf' ? (
                <FutureSelfStep onContinue={(value) => { setFutureSelfAnswer(value); void goToNextFromUser(); }} />
              ) : stepKey === 'futureSelfAtlas' ? (
                <FutureSelfAtlasStep onContinue={goToNextFromUser} />
              ) : stepKey === 'motivationEvent' ? (
                <MotivationEventStep onContinue={(value) => { setMotivationEventAnswer(value); void goToNextFromUser(); }} />
              ) : stepKey === 'pathExploration' ? (
                currentStep === index ? (
                  showCustomPathForm ? (
                    <CustomPathForm
                      cardHorizontalInset={onboardingCardInset}
                      currentStep={index}
                      totalSteps={totalStepCount}
                      onBack={() => {
                        void hapticMedium();
                        setShowCustomPathForm(false);
                      }}
                      onComplete={async (pathData) => {
                        void hapticMedium();
                        setShowCustomPathForm(false);
                        setSelectedGoalTitle(pathData.goalTitle || selectedGoalTitle || localeText('My Goal', 'Моя цель'));
                        setDreamGoal(pathData.description || dreamGoal);
                        if (pathData.challenge) {
                          setFearOrBarrier(pathData.challenge);
                          setSelectedGoalFear(pathData.challenge);
                        }
                        void goToNextFromUser();
                      }}
                    />
                  ) : (
                    <PathExplorationStep
                      pathName={selectedGoalTitle || localeText('Your personalized path', 'Твой персональный путь')}
                      pathDescription={dreamGoal || localeText('A path crafted from your onboarding answers.', 'Путь, созданный на основе твоих ответов в онбординге.')}
                      userName={name}
                      birthMonth={birthMonth}
                      birthDate={birthDate}
                      birthYear={birthYear}
                      birthCity={birthCity}
                      birthHour={birthHour}
                      birthMinute={birthMinute}
                      birthPeriod={birthAmPm}
                      whatYouLove={whatYouLove}
                      whatYouGoodAt={whatYouGoodAt}
                      whatWorldNeeds={whatWorldNeeds}
                      whatCanBePaidFor={whatCanBePaidFor}
                      fear={fearOrBarrier}
                      whatExcites={dreamGoal}
                      onWorkOnDreamGoal={() => {
                        void hapticLight();
                        setShowCustomPathForm(true);
                      }}
                      onStartJourney={(_goalId, goalTitle, goalFear) => {
                        setSelectedGoalTitle(goalTitle || selectedGoalTitle || localeText('My Goal', 'Моя цель'));
                        setSelectedGoalFear(goalFear || '');
                        setCanShowFinalPaywall(true);
                        const paywallIndex = YAZIO_FLOW_STEPS.indexOf('paywall');
                        if (paywallIndex >= 0) {
                          setCurrentStep(paywallIndex);
                          Animated.timing(slideAnim, {
                            toValue: -paywallIndex * screenWidth,
                            duration: 300,
                            useNativeDriver: true,
                          }).start();
                        }
                      }}
                    />
                  )
                ) : (
                  <View style={styles.stepContent} />
                )
              ) : stepKey === 'commitmentChallenge' ? (
                <CommitmentChallengeStep onContinue={(value) => { setCommitmentChallengeAnswer(value); void goToNextFromUser(); }} />
              ) : stepKey === 'distractions' ? (
                <DistractionsStep onContinue={(values) => { setDistractionsAnswers(values); void goToNextFromUser(); }} />
              ) : stepKey === 'consistencyPlan' ? (
                <ConsistencyPlanStep onContinue={(values) => { setConsistencyPlanAnswers(values); void goToNextFromUser(); }} />
              ) : stepKey === 'setbackPlan' ? (
                <SetbackPlanStep onContinue={(values) => { setSetbackPlanAnswers(values); void goToNextFromUser(); }} />
              ) : stepKey === 'pledge' ? (
                <PledgeStep name={name} signature={signature} setSignature={setSignature} onNext={goToNextFromUser} />
              ) : stepKey === 'thankYouAtlas' ? (
                <ThankYouAtlasStep name={name} onContinue={goToNextFromUser} />
              ) : stepKey === 'journeyLoading' ? (
                currentStep === index ? (
                  <JourneyLoadingStep
                    loadingItems={journeyLoadingItems}
                    onComplete={() => {
                      const pathExplorationIndex = YAZIO_FLOW_STEPS.indexOf('pathExploration');
                      if (pathExplorationIndex >= 0) {
                        setCurrentStep(pathExplorationIndex);
                        Animated.timing(slideAnim, {
                          toValue: -pathExplorationIndex * screenWidth,
                          duration: 300,
                          useNativeDriver: true,
                        }).start();
                      }
                    }}
                  />
                ) : (
                  <View style={styles.stepContent} />
                )
              ) : stepKey === 'personalizedPlan' ? (
                <PersonalizedPlanStep
                  name={name}
                  clarityEstimateDays={clarityEstimateDays}
                  onContinue={async () => {
                    setCanShowFinalPaywall(true);
                    if (journeyLoadingItems.length === 0) {
                      setJourneyLoadingItems([
                        localeText('Analyzing your strengths', 'Анализируем твои сильные стороны'),
                        localeText('Building your path to the goal', 'Строим путь к твоей цели'),
                        localeText('Preparing your personalized roadmap', 'Собираем персональную дорожную карту'),
                        localeText('Getting your journey ready', 'Готовим твое путешествие'),
                      ]);
                    }
                    const journeyLoadingIndex = YAZIO_FLOW_STEPS.indexOf('journeyLoading');
                    if (journeyLoadingIndex >= 0) {
                      setCurrentStep(journeyLoadingIndex);
                      Animated.timing(slideAnim, {
                        toValue: -journeyLoadingIndex * screenWidth,
                        duration: 300,
                        useNativeDriver: true,
                      }).start();
                    }
                  }}
                />
              ) : (
                canShowFinalPaywall && currentStep === index ? (
                  <PaywallStep
                    onSubscribe={() => {
                      void hapticHeavy();
                      setPendingRoute('premium');
                      setUserIsPremium(true);
                      setShowAccountCreation(true);
                    }}
                    onBack={async () => {
                      void hapticMedium();
                      setPendingRoute('free');
                      setUserIsPremium(false);
                      setCanShowFinalPaywall(false);
                      const pathExplorationIndex = YAZIO_FLOW_STEPS.indexOf('pathExploration');
                      if (pathExplorationIndex >= 0) {
                        setCurrentStep(pathExplorationIndex);
                        Animated.timing(slideAnim, {
                          toValue: -pathExplorationIndex * screenWidth,
                          duration: 300,
                          useNativeDriver: true,
                        }).start();
                      }
                    }}
                    onContinueFree={async () => {
                      void hapticMedium();
                      setPendingRoute('free');
                      setUserIsPremium(false);
                      await markJustFinishedOnboarding();
                      router.replace('/(tabs)');
                    }}
                  />
                ) : (
                  <View style={styles.stepContent} />
                )
              )}
            </View>
          )) : (
          ONBOARDING_STEPS.map((step, index) => (
          <View key={step.id} style={[styles.stepContainer, { width: screenWidth }]}>
            {step.isForm ? (
              <AboutYouForm
                name={name}
                setName={setName}
                birthMonth={birthMonth}
                setBirthMonth={setBirthMonth}
                birthDate={birthDate}
                setBirthDate={setBirthDate}
                birthYear={birthYear}
                setBirthYear={setBirthYear}
                birthHour={birthHour}
                setBirthHour={setBirthHour}
                birthMinute={birthMinute}
                setBirthMinute={setBirthMinute}
                birthAmPm={birthAmPm}
                setBirthAmPm={setBirthAmPm}
                dontKnowTime={dontKnowTime}
                setDontKnowTime={setDontKnowTime}
                birthCity={birthCity}
                setBirthCity={setBirthCity}
                setBirthLatitude={setBirthLatitude}
                setBirthLongitude={setBirthLongitude}
                citySuggestions={citySuggestions}
                setCitySuggestions={setCitySuggestions}
                showCityDropdown={showCityDropdown}
                setShowCityDropdown={setShowCityDropdown}
                showAmPmDropdown={showAmPmDropdown}
                setShowAmPmDropdown={setShowAmPmDropdown}
                hideBirthTimeFields={hideBirthTimeFields}
                birthMonthRef={birthMonthRef}
                birthDateRef={birthDateRef}
                birthYearRef={birthYearRef}
                birthHourRef={birthHourRef}
                birthMinuteRef={birthMinuteRef}
                setShowDontKnowTimeModal={setShowDontKnowTimeModal}
              />
            ) : step.id === 3 ? (
              <PledgeStep name={name} signature={signature} setSignature={setSignature} onNext={goToNextFromUser} />
            ) : step.id === 4 ? (
              <IkigaiForm
                whatYouLove={whatYouLove}
                setWhatYouLove={setWhatYouLove}
                whatYouGoodAt={whatYouGoodAt}
                setWhatYouGoodAt={setWhatYouGoodAt}
                whatWorldNeeds={whatWorldNeeds}
                setWhatWorldNeeds={setWhatWorldNeeds}
                whatCanBePaidFor={whatCanBePaidFor}
                setWhatCanBePaidFor={setWhatCanBePaidFor}
                onPageChange={setIkigaiCurrentPage}
                onContinue={goToNextFromUser}
              />
            ) : step.id === 5 ? (
              // Current Life Context step - explicitly prevent Path Forward forms from showing
              <CurrentLifeContextStep
                currentSituation={currentSituation}
                setCurrentSituation={setCurrentSituation}
                biggestConstraint={biggestConstraint}
                setBiggestConstraint={setBiggestConstraint}
                whatMattersMost={whatMattersMost}
                setWhatMattersMost={setWhatMattersMost}
                onContinue={() => goToNextFromUser()}
                birthMonth={birthMonth}
                birthDate={birthDate}
                birthYear={birthYear}
                birthCity={birthCity}
                birthHour={birthHour}
                birthMinute={birthMinute}
                birthPeriod={birthAmPm}
                whatYouLove={whatYouLove}
                whatYouGoodAt={whatYouGoodAt}
                whatWorldNeeds={whatWorldNeeds}
                whatCanBePaidFor={whatCanBePaidFor}
                fear={fearOrBarrier}
                whatExcites={dreamGoal}
              />
            ) : step.id === 6 ? (
              <LoadingStep 
                isActive={currentStep === 5}
                onComplete={() => goToNext()}
                birthMonth={birthMonth}
                birthDate={birthDate}
                birthYear={birthYear}
                birthCity={birthCity}
                birthHour={birthHour}
                birthMinute={birthMinute}
                birthPeriod={birthAmPm}
                whatYouLove={whatYouLove}
                whatYouGoodAt={whatYouGoodAt}
                whatWorldNeeds={whatWorldNeeds}
                whatCanBePaidFor={whatCanBePaidFor}
                fear={fearOrBarrier}
                whatExcites={dreamGoal}
                currentSituation={currentSituation}
                biggestConstraint={biggestConstraint}
                whatMattersMost={whatMattersMost}
              />
            ) : step.id === 7 ? (
              <CallingAwaitsStep 
                userName={name}
                birthMonth={birthMonth}
                birthDate={birthDate}
                birthYear={birthYear}
                birthCity={birthCity}
                birthHour={birthHour}
                birthMinute={birthMinute}
                birthPeriod={birthAmPm}
                whatYouLove={whatYouLove}
                whatYouGoodAt={whatYouGoodAt}
                whatWorldNeeds={whatWorldNeeds}
                whatCanBePaidFor={whatCanBePaidFor}
                fear={fearOrBarrier}
                whatExcites={dreamGoal}
                isActive={currentStep === 6}
                onContinue={() => goToNextFromUser()}
              />
            ) : step.id === 8 ? (
              showJourneyLoading ? (
                <JourneyLoadingStep
                  loadingItems={journeyLoadingItems}
                  onComplete={async () => {
                    setShowJourneyLoading(false);
                    if (exploringPathId) {
                      // Navigate directly to tabs
                      await markJustFinishedOnboarding();
                      router.replace('/(tabs)');
                    } else if (customPathData) {
                      // Navigate directly to tabs
                      await markJustFinishedOnboarding();
                      router.replace('/(tabs)');
                    } else {
                      // If "Work on my goal" was clicked, navigate to new goal screen
                      router.push({
                        pathname: '/new-goal',
                        params: { fromOnboarding: 'true' },
                      });
                    }
                  }}
                />
              ) : (showCustomPathDreamForm && step.id === 8) ? (
                // Only show CustomPathDreamForm on step 8 (Paths Aligned), not on other steps
                <CustomPathDreamForm
                  onBack={() => {
                    void hapticMedium();
                    goToPrevious();
                  }}
                  onComplete={async (pathData) => {
                    void hapticMedium();
                    // Generate meaningful milestones from the user's input
                    const generatedMilestones: string[] = [];

                    // Milestone 1: Based on starting point
                    if (pathData.startingPoint && pathData.startingPoint.trim()) {
                      generatedMilestones.push(`Leverage your foundation: ${pathData.startingPoint.trim().substring(0, 80)}`);
                    } else {
                      generatedMilestones.push(localeText('Research the topic and build a strong foundation', 'Изучи тему и подготовь прочную базу'));
                    }

                    // Milestone 2: First action step based on the dream
                    if (pathData.pathDescription && pathData.pathDescription.trim()) {
                      generatedMilestones.push(`Take the first step toward: ${pathData.pathDescription.trim().substring(0, 80)}`);
                    } else {
                      generatedMilestones.push(localeText('Take the first meaningful step', 'Сделай первый значимый шаг'));
                    }

                    // Milestone 3: Overcome the obstacle
                    if (pathData.mainObstacle && pathData.mainObstacle.trim() && pathData.mainObstacle !== 'Other') {
                      generatedMilestones.push(`Overcome your challenge: ${pathData.mainObstacle.trim().substring(0, 80)}`);
                    } else if (pathData.obstacleOther && pathData.obstacleOther.trim()) {
                      generatedMilestones.push(`Overcome your challenge: ${pathData.obstacleOther.trim().substring(0, 80)}`);
                    } else {
                      generatedMilestones.push(localeText('Work through your main challenge', 'Пройди через главный вызов'));
                    }

                    // Milestone 4: Reach the goal
                    if (pathData.pathName && pathData.pathName.trim()) {
                      generatedMilestones.push(`Achieve your dream: ${pathData.pathName.trim().substring(0, 80)}`);
                    } else {
                      generatedMilestones.push(localeText('Reach your goal and celebrate the result', 'Достигни цели и отпразднуй результат'));
                    }

                    // Save custom path data
                    const nextCustomPathData = {
                      pathName: pathData.pathName,
                      pathDescription: pathData.pathDescription,
                      keyStrengths: pathData.startingPoint,
                      desiredOutcome: pathData.pathDescription,
                      timeCommitment: pathData.timeline || '3 months',
                      uniqueApproach: pathData.mainObstacle + (pathData.obstacleOther ? ': ' + pathData.obstacleOther : ''),
                      milestones: generatedMilestones,
                    };
                    setCustomPathData(nextCustomPathData);
                    setDreamGoal(pathData.pathDescription);
                    const challengeText = pathData.mainObstacle + (pathData.obstacleOther ? ': ' + pathData.obstacleOther : '');
                    setFearOrBarrier(challengeText);
                    setShowCustomPathDreamForm(false);
                    setSelectedGoalTitle(pathData.pathName);
                    // Create and save goal, then show journey loading
                    // Create and save goal, then show journey loading
                    await createAndSaveGoal(nextCustomPathData, challengeText);
                  }}
                />
              ) : (showCustomPathForm && step.id === 8) ? (
                // Only show CustomPathForm on step 8 (Paths Aligned), not on other steps
                // Step 8 is at index 7 (0-indexed), so pass 7 to maintain progress
                <CustomPathForm
                  cardHorizontalInset={onboardingCardInset}
                  currentStep={7}
                  totalSteps={ONBOARDING_STEPS.length}
                  onBack={() => {
                    void hapticMedium();
                    goToPrevious();
                  }}
                  onComplete={async (pathData) => {
                    void hapticMedium();
                    // Save custom path data
                    const nextCustomPathData = {
                      pathName: pathData.goalTitle,
                      pathDescription: pathData.description,
                      keyStrengths: '',
                      desiredOutcome: pathData.description,
                      timeCommitment: pathData.targetTimeline,
                      uniqueApproach: pathData.milestones.join(', '),
                      milestones: pathData.milestones.filter(m => m.trim()),
                    };
                    setCustomPathData(nextCustomPathData);
                    setShowCustomPathForm(false);
                    setSelectedGoalTitle(pathData.goalTitle);
                    // Store challenge if provided
                    if (pathData.challenge) {
                      setFearOrBarrier(pathData.challenge);
                    }
                    // Create and save goal, then show journey loading
                    await createAndSaveGoal(nextCustomPathData, pathData.challenge);
                  }}
                />
              ) : showPredefinedGoalChallenge ? (
                <PathChallengeStep
                  pathName={predefinedGoalTitle}
                  selectedGoalFear={selectedGoalFear}
                  onContinue={async (challenge) => {
                    void hapticMedium();
                    setFearOrBarrier(challenge);
                    setShowPredefinedGoalChallenge(false);
                    // Create and save goal, then show journey loading
                    await createAndSaveGoal(customPathData, challenge);
                  }}
                  onBack={() => {
                    void hapticLight();
                    setShowPredefinedGoalChallenge(false);
                    setPredefinedGoalTitle('');
                    setSelectedGoalFear('');
                  }}
                />
              ) : showPathChallenge && exploringPathId ? (
                <PathChallengeStep
                  pathName={exploringPathName}
                  onContinue={(challenge) => {
                    void hapticMedium();
                    setPathChallenge(challenge);
                    setShowPathChallenge(false);
                  }}
                  onBack={() => {
                    void hapticLight();
                    setShowPathChallenge(false);
                    setExploringPathId(null);
                    setPathChallenge('');
                  }}
                />
              ) : exploringPathId ? (
                <PathExplorationStep
                  pathName={exploringPathName}
                  pathDescription={exploringPathDescription}
                  userName={name}
                  birthMonth={birthMonth}
                  birthDate={birthDate}
                  birthYear={birthYear}
                  birthCity={birthCity}
                  birthHour={birthHour}
                  birthMinute={birthMinute}
                  birthPeriod={birthAmPm}
                  whatYouLove={whatYouLove}
                  whatYouGoodAt={whatYouGoodAt}
                  whatWorldNeeds={whatWorldNeeds}
                  whatCanBePaidFor={whatCanBePaidFor}
                  fear={pathChallenge || fearOrBarrier}
                  whatExcites={dreamGoal}
                  onWorkOnDreamGoal={() => {
                    void hapticLight();
                    // Show custom path form to create custom goal
                    // Keep exploringPathId so back button returns to PathExplorationStep
                    setShowCustomPathForm(true);
                  }}
                  onStartJourney={async (goalId, goalTitle, goalFear) => {
                    void hapticMedium();
                    // Use goal title from PathExplorationStep, or fallback to path title
                    const path = generatedPaths.find(p => p.id === goalId);
                    const finalGoalTitle = goalTitle || path?.title || localeText('Your personalized goal', 'Твоя персональная цель');
                    setSelectedGoalTitle(finalGoalTitle);
                    setSelectedGoalFear((goalFear || '').trim());
                    // Show challenge step first
                    setPredefinedGoalTitle(finalGoalTitle);
                    setShowPredefinedGoalChallenge(true);
                  }}
                />
              ) : (
                <PathsAlignedStep 
                  forceTabletLayout={isLikelyIpadDevice}
                  cardHorizontalInset={onboardingCardInset}
                  birthMonth={birthMonth}
                  birthDate={birthDate}
                  birthYear={birthYear}
                  birthCity={birthCity}
                  birthHour={birthHour}
                  birthMinute={birthMinute}
                  birthPeriod={birthAmPm}
                  whatYouLove={whatYouLove}
                  whatYouGoodAt={whatYouGoodAt}
                  whatWorldNeeds={whatWorldNeeds}
                  whatCanBePaidFor={whatCanBePaidFor}
                  fear={fearOrBarrier}
                  whatExcites={dreamGoal}
                  onPathsGenerated={(paths) => {
                    setGeneratedPaths(paths);
                  }}
                  onExplorePath={(pathId) => {
                    void hapticLight();
                    // Get path name from generated paths
                    const path = generatedPaths.find(p => p.id === pathId);
                    // Use the path title directly (already formatted as "The [Name]")
                    const pathTitle = path?.title || `The Path ${pathId}`;
                    setExploringPathName(pathTitle);
                    setExploringPathId(pathId);
                  }}
                  onWorkOnDreamGoal={() => {
                    void hapticLight();
                    // Match "Create Your Goal" flow from trajectory screen:
                    // open the direct goal-with-steps form.
                    setShowCustomPathForm(true);
                  }}
                />
              )
            ) : step.id === 9 ? (
              showJourneyLoading ? (
                <JourneyLoadingStep
                  loadingItems={journeyLoadingItems}
                  onComplete={async () => {
                    setShowJourneyLoading(false);
                    await markJustFinishedOnboarding();
                    router.replace('/(tabs)');
                  }}
                />
              ) : (
                <ForgeYourOwnPathStep
                  currentStep={8}
                  totalSteps={ONBOARDING_STEPS.length}
                  onBack={() => {
                    void hapticMedium();
                    goToPrevious();
                  }}
                  onComplete={async (pathData) => {
                    void hapticMedium();
                    const nextCustomPathData = {
                      pathName: pathData.goalTitle,
                      pathDescription: pathData.description,
                      keyStrengths: '',
                      desiredOutcome: pathData.description,
                      timeCommitment: pathData.targetTimeline,
                      uniqueApproach: pathData.milestones.join(', '),
                      milestones: pathData.milestones.filter(m => m.trim()),
                    };
                    setCustomPathData(nextCustomPathData);
                    setSelectedGoalTitle(pathData.goalTitle);
                    if (pathData.challenge) {
                      setFearOrBarrier(pathData.challenge);
                    }
                    await createAndSaveGoal(nextCustomPathData, pathData.challenge);
                  }}
                />
              )
            ) : (
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, step.id === 1 && { color: '#FFFFFF' }]}>{step.title}</Text>
                <Text style={[styles.stepText, step.id === 1 && { color: '#FFFFFF' }]}>{step.content}</Text>
                {step.showImage && (
                  <Image 
                    source={require('../assets/images/full.deer.png')}
                    style={styles.stepImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            )}
          </View>
        )))}
      </Animated.View>
      )}

      {/* Don't Know Time Modal */}
      <Modal
        visible={showDontKnowTimeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDontKnowTimeModal(false)}
      >
        <View style={styles.dontKnowTimeModalOverlay}>
          <View style={styles.dontKnowTimeModal}>
            <TouchableOpacity
              style={styles.dontKnowTimeModalCloseButton}
              onPress={() => {
                void hapticLight();
                setShowDontKnowTimeModal(false);
              }}
            >
              <Text style={styles.dontKnowTimeModalCloseX}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.dontKnowTimeModalTitle}>
              {t('onboarding.dontKnowTimeModalText')}
            </Text>
            <TouchableOpacity
              style={styles.dontKnowTimeModalConfirmButton}
              onPress={() => {
                void hapticMedium();
                setDontKnowTime(true);
                setHideBirthTimeFields(true);
                setBirthHour('');
                setBirthMinute('');
                setBirthAmPm('AM');
                setShowDontKnowTimeModal(false);
              }}
            >
              <Text style={styles.dontKnowTimeModalConfirmButtonText}>{t('onboarding.dontKnowTimeModalConfirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ikigai Help Modal */}
      {showIkigaiModal && (
        <Modal
          transparent
          visible={showIkigaiModal}
          animationType="fade"
          onRequestClose={() => setShowIkigaiModal(false)}
        >
          <View style={styles.ikigaiModalOverlay}>
            <View style={styles.ikigaiModalWrapper}>
              {ikigaiModalIconFailed ? (
                <View style={styles.ikigaiModalFallbackIconCircle}>
                  <MaterialIcons name="track-changes" size={34} color="#FFFFFF" />
                </View>
              ) : (
                <Image 
                  source={require('../assets/images/target.png')} 
                  style={styles.ikigaiModalIcon}
                  resizeMode="contain"
                  onError={() => setIkigaiModalIconFailed(true)}
                />
              )}
              <View style={styles.ikigaiModalContent}>
                <Text style={styles.ikigaiModalTitle}>{t('onboarding.ikigaiModalTitle')}</Text>
                <Text style={styles.ikigaiModalText}>
                  {t('onboarding.ikigaiModalText')}
                </Text>
                <TouchableOpacity
                  style={styles.ikigaiModalButton}
                  onPress={() => {
                    void hapticLight();
                    setShowIkigaiModal(false);
                  }}
                >
                  <Text style={styles.ikigaiModalButtonText}>{t('common.gotIt')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showLifeContextModal && (
        <Modal
          transparent
          visible={showLifeContextModal}
          animationType="fade"
          onRequestClose={() => setShowLifeContextModal(false)}
        >
          <View style={styles.ikigaiModalOverlay}>
            <View style={styles.ikigaiModalWrapper}>
              {ikigaiModalIconFailed ? (
                <View style={styles.ikigaiModalFallbackIconCircle}>
                  <MaterialIcons name="track-changes" size={34} color="#FFFFFF" />
                </View>
              ) : (
                <Image 
                  source={require('../assets/images/target.png')} 
                  style={styles.ikigaiModalIcon}
                  resizeMode="contain"
                  onError={() => setIkigaiModalIconFailed(true)}
                />
              )}
              <View style={styles.ikigaiModalContent}>
                <Text style={styles.ikigaiModalTitle}>{t('onboarding.currentLifeContext')}</Text>
                <Text style={styles.ikigaiModalText}>
                  {localeText(
                    'Understanding your current situation helps us provide personalized guidance. Be honest about where you are right now - this information helps us suggest the best path forward for you.',
                    'Понимание вашего текущего контекста помогает нам дать персональные рекомендации. Будьте честны о том, где вы находитесь сейчас — это помогает нам предложить вам лучший дальнейший путь.'
                  )}
                </Text>
                <TouchableOpacity
                  style={styles.ikigaiModalButton}
                  onPress={() => {
                    void hapticLight();
                    setShowLifeContextModal(false);
                  }}
                >
                  <Text style={styles.ikigaiModalButtonText}>{t('common.gotIt')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Hide global footer on pledge step so it cannot steal signature touches. */}
      {((!USE_YAZIO_FLOW && !showJourneyLoading && !showAccountCreation && currentStep !== 2) ||
        (USE_YAZIO_FLOW && !showJourneyLoading && !showAccountCreation && currentFlowStepKey === 'aboutYou')) && (
        <View
          style={[
            styles.footer,
            Platform.isPad && currentStep === 1 && keyboardHeight > 0
              ? { paddingBottom: keyboardHeight + 16 }
              : null,
          ]}
          pointerEvents="box-none"
        >
          {(USE_YAZIO_FLOW || (currentStep !== 3 && currentStep !== 4 && currentStep !== 5 && currentStep !== 6 && currentStep !== 7 && currentStep !== 8 && exploringPathId === null && !showCustomPathForm)) && (
            <TouchableOpacity 
              style={styles.continueButton} 
              onPressIn={() => {
                void hapticMedium();
              }}
              onPress={async () => {
                await goToNextFromUser({
                  showAboutYouValidationAlert: USE_YAZIO_FLOW && currentFlowStepKey === 'aboutYou',
                });
              }}
              disabled={USE_YAZIO_FLOW && currentFlowStepKey === 'aboutYou' && !canSubmitAboutYou}
            >
              <Text style={styles.continueButtonText}>
                {currentStep === totalStepCount - 1 ? t('common.getStarted') : t('common.continue')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
    </PaperTextureBackground>
  );
}
