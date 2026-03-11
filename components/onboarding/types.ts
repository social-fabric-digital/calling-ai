import { ReactNode } from 'react';
import { TextInput } from 'react-native';

export interface CityData {
  id?: string;
  name: string;
  country: string;
  displayName?: string;
  lat?: number;
  lon?: number;
  nameRu?: string; // Russian name for Cyrillic support
}

export interface AboutYouFormProps {
  name: string;
  setName: (value: string) => void;
  birthMonth: string;
  setBirthMonth: (value: string) => void;
  birthDate: string;
  setBirthDate: (value: string) => void;
  birthYear: string;
  setBirthYear: (value: string) => void;
  birthHour: string;
  setBirthHour: (value: string) => void;
  birthMinute: string;
  setBirthMinute: (value: string) => void;
  birthAmPm: string;
  setBirthAmPm: (value: string) => void;
  dontKnowTime: boolean;
  setDontKnowTime: (value: boolean) => void;
  birthCity: string;
  setBirthCity: (value: string) => void;
  setBirthLatitude: (value: string) => void;
  setBirthLongitude: (value: string) => void;
  citySuggestions: CityData[];
  setCitySuggestions: (value: CityData[]) => void;
  showCityDropdown: boolean;
  setShowCityDropdown: (value: boolean) => void;
  showAmPmDropdown: boolean;
  setShowAmPmDropdown: (value: boolean) => void;
  hideBirthTimeFields: boolean;
  birthMonthRef: React.RefObject<TextInput | null>;
  birthDateRef: React.RefObject<TextInput | null>;
  birthYearRef: React.RefObject<TextInput | null>;
  birthHourRef: React.RefObject<TextInput | null>;
  birthMinuteRef: React.RefObject<TextInput | null>;
  setShowDontKnowTimeModal: (value: boolean) => void;
}

export interface PledgeStepProps {
  name: string;
  signature: string;
  setSignature: (value: string) => void;
  // Local next handler for the pledge "I Vow" button.
  onNext: () => void;
}

export interface IkigaiFormProps {
  whatYouLove: string;
  setWhatYouLove: (value: string) => void;
  whatYouGoodAt: string;
  setWhatYouGoodAt: (value: string) => void;
  whatWorldNeeds: string;
  setWhatWorldNeeds: (value: string) => void;
  whatCanBePaidFor: string;
  setWhatCanBePaidFor: (value: string) => void;
  onPageChange?: (page: number) => void;
  onContinue?: () => Promise<void>;
}

export interface LoadingStepProps {
  onComplete?: () => void;
  isActive: boolean;
  // All onboarding data needed for unified API call
  birthMonth?: string;
  birthDate?: string;
  birthYear?: string;
  birthCity?: string;
  birthHour?: string;
  birthMinute?: string;
  birthPeriod?: string;
  whatYouLove?: string;
  whatYouGoodAt?: string;
  whatWorldNeeds?: string;
  whatCanBePaidFor?: string;
  fear?: string;
  whatExcites?: string;
  currentSituation?: string;
  biggestConstraint?: string;
  whatMattersMost?: string[];
}

export interface CallingAwaitsStepProps {
  userName: string;
  birthMonth?: string;
  birthDate?: string;
  birthYear?: string;
  birthCity?: string;
  birthHour?: string;
  birthMinute?: string;
  birthPeriod?: string;
  whatYouLove?: string;
  whatYouGoodAt?: string;
  whatWorldNeeds?: string;
  whatCanBePaidFor?: string;
  fear?: string;
  whatExcites?: string;
  onContinue?: () => void;
  isActive?: boolean;
}

export interface PathsAlignedStepProps {
  onExplorePath?: (pathId: number) => void;
  onWorkOnDreamGoal?: () => void;
  forceTabletLayout?: boolean;
  cardHorizontalInset?: number;
  hideCustomPathOption?: boolean;
  headerTopMargin?: number;
  headerExtraContent?: ReactNode;
  onPathsGenerated?: (paths: Array<{ id: number; title: string; description: string; glowColor: string }>) => void;
  birthMonth?: string;
  birthDate?: string;
  birthYear?: string;
  birthCity?: string;
  birthHour?: string;
  birthMinute?: string;
  birthPeriod?: string;
  whatYouLove?: string;
  whatYouGoodAt?: string;
  whatWorldNeeds?: string;
  whatCanBePaidFor?: string;
  fear?: string;
  whatExcites?: string;
}

export interface PathExplorationStepProps {
  pathName: string;
  pathDescription?: string;
  userName?: string;
  onStartJourney?: (goalId: number, goalTitle?: string, goalFear?: string) => void;
  onWorkOnDreamGoal?: () => void;
  hideCustomPathOption?: boolean;
  regenerateGoalsTrigger?: number;
  customBottomActionLabel?: string;
  customBottomActionHint?: string;
  customBottomActionDisabled?: boolean;
  onCustomBottomActionPress?: () => void;
  birthMonth?: string;
  birthDate?: string;
  birthYear?: string;
  birthCity?: string;
  birthHour?: string;
  birthMinute?: string;
  birthPeriod?: string;
  whatYouLove?: string;
  whatYouGoodAt?: string;
  whatWorldNeeds?: string;
  whatCanBePaidFor?: string;
  fear?: string;
  whatExcites?: string;
}

export interface CurrentLifeContextStepProps {
  currentSituation: string;
  setCurrentSituation: (value: string) => void;
  biggestConstraint: string;
  setBiggestConstraint: (value: string) => void;
  whatMattersMost: string[];
  setWhatMattersMost: (value: string[]) => void;
  onContinue: () => void;
  // All onboarding data needed for unified API call
  birthMonth?: string;
  birthDate?: string;
  birthYear?: string;
  birthCity?: string;
  birthHour?: string;
  birthMinute?: string;
  birthPeriod?: string;
  whatYouLove?: string;
  whatYouGoodAt?: string;
  whatWorldNeeds?: string;
  whatCanBePaidFor?: string;
  fear?: string;
  whatExcites?: string;
}

export interface JourneyLoadingStepProps {
  onComplete: () => void;
  loadingItems: string[];
}

export interface CustomPathDreamFormProps {
  onComplete: (pathData: {
    pathName: string;
    pathDescription: string;
    startingPoint: string;
    mainObstacle: string;
    obstacleOther?: string;
    timeline: string;
  }) => void;
  onBack?: () => void;
  backRequestId?: number;
}

export interface CustomPathFormProps {
  onComplete: (pathData: {
    goalTitle: string;
    description: string;
    milestones: string[];
    targetTimeline: string;
    challenge?: string;
  }) => void;
  onBack?: () => void;
  currentStep?: number;
  totalSteps?: number;
  hideHeader?: boolean;
  hideHeaderTopPadding?: number;
  heroTitle?: string;
  heroSubtitle?: string;
  fixedMilestoneCount?: number;
  cardHorizontalInset?: number;
}

export interface ObstaclePageProps {
  pathName: string;
  onContinue: (obstacle: string) => void;
}

export interface PaywallStepProps {
  goalTitle: string;
  onContinue: () => void;
  onBack?: () => void;
}

export interface WelcomeAtlasStepProps {
  name?: string;
  onContinue: () => void;
}

export interface WhyHereStepProps {
  onContinue: (value: string) => void;
}

export interface CurrentFeelingStepProps {
  onContinue: (value: string) => void;
}

export interface WhatHeldBackStepProps {
  onContinue: (values: string[]) => void;
}

export interface AtlasEncouragementStepProps {
  currentSituation?: string;
  onContinue: () => void;
}

export interface PastAttemptsStepProps {
  onContinue: (values: string[]) => void;
}

export interface InsightStatStepProps {
  onContinue: () => void;
}

export interface PastChallengesStepProps {
  name?: string;
  onContinue: (values: string[]) => void;
}

export interface WhyDifferentStepProps {
  onContinue: (value: string) => void;
}

export interface SuccessInspirationStepProps {
  onContinue: (value: string) => void;
}

export interface FutureSelfStepProps {
  onContinue: (value: string) => void;
}

export interface MotivationEventStepProps {
  onContinue: (value: string) => void;
}

export interface CommitmentChallengeStepProps {
  onContinue: (value: string) => void;
}

export interface DistractionsStepProps {
  onContinue: (values: string[]) => void;
}

export interface ConsistencyPlanStepProps {
  onContinue: (values: string[]) => void;
}

export interface SetbackPlanStepProps {
  onContinue: (values: string[]) => void;
}

export interface ThankYouAtlasStepProps {
  name?: string;
  onContinue: () => void;
}

export interface PersonalizedPlanStepProps {
  name?: string;
  onContinue: () => void;
}
