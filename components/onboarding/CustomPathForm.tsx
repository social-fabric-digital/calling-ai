import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import PathChallengeStep from './PathChallengeStep';
import { CustomPathFormProps } from './types';

const { width } = Dimensions.get('window');

// ============================================
// Color Palette
// ============================================
const COLORS = {
  primary: '#342846',
  accent1: '#cdbad8',
  accent2: '#baccd7',
  white: '#FFFFFF',
  background: '#F5F3F0',
};

interface MilestoneItemProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}

// ============================================
// Animated Hero Section
// ============================================
function HeroSection({ title, subtitle }: { title?: string; subtitle?: string }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const safeTitle = (title || '').toUpperCase();
  const safeSubtitle = subtitle || '';

  useEffect(() => {
    // Initial animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  return (
    <View style={styles.heroSection}>
      <Text style={styles.heroTitle}>{safeTitle}</Text>
      <Text style={styles.heroSubtitle}>
        {safeSubtitle}
      </Text>

      {/* Icon with decorative circles */}
      <View style={styles.heroIconWrapper}>
        {/* Decorative circles */}
        <Animated.View
          style={[
            styles.heroCircle,
            styles.heroCircle1,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
        <Animated.View
          style={[
            styles.heroCircle,
            styles.heroCircle2,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />

        <Animated.View
          style={[
            styles.heroIconContainer,
            {
              transform: [{ scale: scaleAnim }, { rotate: rotation }],
            },
          ]}
        >
          <LinearGradient
            colors={[COLORS.primary, '#4a3a5c']}
            style={styles.heroIconGradient}
          >
            <MaterialIcons name="flag" size={32} color={COLORS.white} />
          </LinearGradient>
        </Animated.View>
      </View>
    </View>
  );
}

// ============================================
// Section Card Component
// ============================================
interface SectionCardProps {
  icon: string;
  iconColor: string;
  title: string;
  children: React.ReactNode;
  delay?: number;
}

function SectionCard({ icon, iconColor, title, children, delay = 0 }: SectionCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.sectionCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconContainer, { backgroundColor: iconColor + '20' }]}>
          <MaterialIcons name={icon as any} size={20} color={iconColor} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </Animated.View>
  );
}

// ============================================
// Milestone Item Component
// ============================================
function MilestoneItem({ index, value, onChange, onRemove, canRemove }: MilestoneItemProps) {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleRemove = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onRemove());
  };

  return (
    <Animated.View
      style={[
        styles.milestoneItem,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={styles.milestoneNumber}>
        <Text style={styles.milestoneNumberText}>{index + 1}</Text>
      </View>
      <TextInput
        ref={inputRef}
        style={styles.milestoneInput}
        placeholder={t('clarityMap.stepPlaceholder', { number: index + 1 })}
        placeholderTextColor="rgba(52, 40, 70, 0.4)"
        value={value}
        onChangeText={onChange}
        multiline
      />
      <View style={styles.milestoneActions}>
        <TouchableOpacity 
          style={styles.milestoneEditButton} 
          onPress={() => inputRef.current?.focus()}
        >
          <MaterialIcons name="edit" size={18} color="rgba(52, 40, 70, 0.6)" />
        </TouchableOpacity>
        {canRemove && (
          <TouchableOpacity style={styles.milestoneRemove} onPress={handleRemove}>
            <MaterialIcons name="close" size={18} color="rgba(52, 40, 70, 0.6)" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// ============================================
// Timeline Option Component
// ============================================
interface TimelineOptionProps {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  isSelected: boolean;
  onSelect: () => void;
}

function TimelineOption({ id, label, description, icon, color, isSelected, onSelect }: TimelineOptionProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
    onSelect();
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
      <Animated.View
        style={[
          styles.timelineOption,
          isSelected && [styles.timelineOptionSelected, { borderColor: COLORS.primary }],
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View
          style={[
            styles.timelineIconContainer,
            { backgroundColor: isSelected ? COLORS.primary : 'rgba(52, 40, 70, 0.08)' },
          ]}
        >
          <MaterialIcons
            name={icon as any}
            size={20}
            color={isSelected ? COLORS.white : COLORS.primary}
          />
        </View>
        <View style={styles.timelineTextContainer}>
          <Text style={[styles.timelineLabel, isSelected && { color: COLORS.primary }]}>{label}</Text>
          <Text style={styles.timelineDescription}>{description}</Text>
        </View>
        {isSelected && (
          <View style={[styles.timelineCheck, { backgroundColor: COLORS.primary }]}>
            <MaterialIcons name="check" size={14} color={COLORS.white} />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ============================================
// Inspirational Quote Component
// ============================================
function InspirationalQuote() {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      delay: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.quoteContainer, { opacity: fadeAnim }]}>
      <MaterialIcons name="format-quote" size={24} color={COLORS.accent1} />
      <Text style={styles.quoteText}>
        {t('clarityMap.goalWithoutPlan')}
      </Text>
      <Text style={styles.quoteAuthor}>
        {isRussian ? '— Антуан де Сент-Экзюпери' : '— Antoine de Saint-Exupery'}
      </Text>
    </Animated.View>
  );
}

// ============================================
// Main Component
// ============================================
export default function CustomPathForm({
  onComplete,
  onBack,
  currentStep = 7,
  totalSteps = 9,
  hideHeader = false,
  hideHeaderTopPadding = 90,
  heroTitle,
  heroSubtitle,
  fixedMilestoneCount,
}: CustomPathFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const isFixedMilestones = typeof fixedMilestoneCount === 'number' && fixedMilestoneCount > 0;
  const [milestones, setMilestones] = useState<string[]>(
    Array.from({ length: isFixedMilestones ? fixedMilestoneCount : 2 }, () => '')
  );
  const [timeline, setTimeline] = useState('');
  const [showChallengeStep, setShowChallengeStep] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const timelineOptions = [
    { id: '1-week', label: t('onboarding.oneWeek'), description: t('onboarding.quickSprint'), icon: 'bolt', color: '#4CAF50' },
    { id: '1-month', label: t('onboarding.oneMonth'), description: t('onboarding.focusedEffort'), icon: 'trending-up', color: '#2196F3' },
    { id: '3-months', label: t('onboarding.threeMonths'), description: t('onboarding.steadyProgress'), icon: 'show-chart', color: '#9C27B0' },
    { id: '6-months', label: t('onboarding.sixMonths'), description: t('onboarding.strongTransformation'), icon: 'rocket-launch', color: '#FF9800' },
    { id: '1-plus-year', label: t('onboarding.oneYearPlus'), description: t('onboarding.longTermTransformation'), icon: 'event', color: '#795548' },
  ];

  const handleAddMilestone = () => {
    if (isFixedMilestones) return;
    if (milestones.length < 6) {
      setMilestones([...milestones, '']);
    }
  };

  const handleRemoveMilestone = (index: number) => {
    if (isFixedMilestones) return;
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const handleMilestoneChange = (index: number, value: string) => {
    const newMilestones = [...milestones];
    newMilestones[index] = value;
    setMilestones(newMilestones);
  };

  const handleSubmit = () => {
    // Show challenge step instead of completing immediately
    setShowChallengeStep(true);
  };

  const handleChallengeContinue = (challenge: string) => {
    // Complete with challenge included
    onComplete({
      goalTitle: title,
      description,
      milestones: milestones.filter(m => m.trim() !== ''),
      targetTimeline: timeline,
      challenge: challenge,
    });
  };

  const handleChallengeBack = () => {
    setShowChallengeStep(false);
  };

  const canSubmit = title.trim().length > 0 && timeline.length > 0;

  // Progress bar should match step 8 (Which Direction Calls You) progress
  // Use the same calculation as main onboarding: ((currentStep + 1) / totalSteps) * 100
  // Step 8 is at index 7 (0-indexed), so progress = ((7 + 1) / 9) * 100 = 88.89%
  const onboardingProgress = ((currentStep + 1) / totalSteps) * 100;

  // Show challenge step if user has submitted the form
  if (showChallengeStep) {
    return (
      <PathChallengeStep
        pathName={title || t('clarityMap.yourGoal')}
        onContinue={handleChallengeContinue}
        onBack={handleChallengeBack}
        hideHeader={true}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        {/* Header */}
        {!hideHeader && (
          <View style={styles.header}>
            {onBack && (
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            
            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${onboardingProgress}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            hideHeader && { paddingTop: hideHeaderTopPadding }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
            {/* Hero Section */}
            <HeroSection
              title={heroTitle || t('onboarding.createYourPath')}
              subtitle={heroSubtitle || t('onboarding.buildYourRoute')}
            />

        {/* Core Objective Section */}
        <SectionCard
          icon="emoji-objects"
          iconColor={COLORS.accent1}
          title={t('clarityMap.keyGoal')}
          delay={100}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('clarityMap.goalName')}</Text>
            <Text style={styles.inputHint}>{t('clarityMap.whatDoYouWantToAchieve')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('clarityMap.goalNamePlaceholder')}
              placeholderTextColor="rgba(52, 40, 70, 0.4)"
              value={title}
              onChangeText={setTitle}
              maxLength={60}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('clarityMap.whyIsItImportant')}</Text>
            <Text style={styles.inputHint}>{t('clarityMap.connectGoalToMotivation')}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder={t('clarityMap.goalImportantPlaceholder')}
              placeholderTextColor="rgba(52, 40, 70, 0.4)"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
          </View>
        </SectionCard>

        {/* Milestones Section */}
        <SectionCard
          icon="flag"
          iconColor={COLORS.accent2}
          title={t('clarityMap.steps')}
          delay={200}
        >
          <Text style={styles.milestoneHint}>
            {t('clarityMap.breakGoalIntoSteps')}
          </Text>

          <View style={styles.milestoneList}>
            {milestones.map((milestone, index) => (
              <MilestoneItem
                key={index}
                index={index}
                value={milestone}
                onChange={(value) => handleMilestoneChange(index, value)}
                onRemove={() => handleRemoveMilestone(index)}
                canRemove={!isFixedMilestones && milestones.length > 1}
              />
            ))}
          </View>

          {!isFixedMilestones && milestones.length < 6 && (
            <TouchableOpacity
              style={styles.addMilestoneButton}
              onPress={handleAddMilestone}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={20} color={COLORS.white} />
              <Text style={styles.addMilestoneText}>{t('clarityMap.addStep')}</Text>
            </TouchableOpacity>
          )}
        </SectionCard>

            {/* Timeline Section */}
        <SectionCard
          icon="schedule"
          iconColor={COLORS.primary}
          title={t('clarityMap.deadline')}
          delay={300}
        >
          <Text style={styles.timelineHint}>
            {t('clarityMap.whenDoYouWantToAchieve')}
          </Text>

          <View style={styles.timelineGrid}>
            {timelineOptions.map((option) => (
              <TimelineOption
                key={option.id}
                {...option}
                isSelected={timeline === option.id}
                onSelect={() => setTimeline(option.id)}
              />
            ))}
          </View>
        </SectionCard>

        {/* Inspirational Quote */}
        <InspirationalQuote />

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={canSubmit ? [COLORS.primary, '#4a3a5c'] : ['#999', '#888']}
            style={styles.submitButtonGradient}
          >
            <Text style={styles.submitButtonText}>{t('clarityMap.lockInGoal')}</Text>
            <MaterialIcons name="arrow-forward" size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.white,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 30,
    position: 'relative',
    marginTop: 0,
  },
  heroIconWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  heroCircle: {
    position: 'absolute',
    borderRadius: 100,
  },
  heroCircle1: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.accent1 + '30',
    top: 0,
    left: 0,
  },
  heroCircle2: {
    width: 90,
    height: 90,
    backgroundColor: COLORS.accent2 + '40',
    top: 15,
    left: 15,
  },
  heroIconContainer: {
    zIndex: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  heroIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 26,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    marginTop: 0,
  },
  heroSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: COLORS.primary,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 0,
    width: '90%',
  },

  // Section Card
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 16,
    color: COLORS.primary,
  },

  // Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 4,
  },
  inputHint: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: COLORS.primary,
    opacity: 0.5,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: 'rgba(52, 40, 70, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.08)',
    paddingHorizontal: 16,
    paddingTop: 10, // Increased by 4px to move text down
    paddingBottom: 14, // Decreased by 4px to maintain spacing
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    lineHeight: 18, // Reduced lineHeight to match fontSize more closely
    color: COLORS.primary,
    textAlignVertical: 'center', // Center align text vertically
    includeFontPadding: false, // Prevent extra padding on Android
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top', // Top align for multiline
    paddingTop: 10, // Increased by 4px to move text down
    paddingBottom: 14, // Decreased by 4px to maintain spacing
    paddingHorizontal: 16,
    includeFontPadding: false, // Prevent extra padding on Android
  },

  // Milestones
  milestoneHint: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: COLORS.primary,
    opacity: 0.5,
    marginBottom: 16,
  },
  milestoneList: {
    gap: 12,
    marginBottom: 16,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  milestoneNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent2 + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 8,
  },
  milestoneNumberText: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 14,
    color: COLORS.primary,
  },
  milestoneInput: {
    flex: 1,
    backgroundColor: 'rgba(52, 40, 70, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.08)',
    paddingHorizontal: 14,
    paddingTop: 8, // Increased by 4px to move text down
    paddingBottom: 12, // Decreased by 4px to maintain spacing
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    lineHeight: 18, // Reduced lineHeight to match fontSize more closely
    color: COLORS.primary,
    minHeight: 48,
    textAlignVertical: 'top', // Top align for multiline
    includeFontPadding: false, // Prevent extra padding on Android
  },
  milestoneActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  milestoneEditButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  milestoneRemove: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMilestoneButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addMilestoneText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: COLORS.white,
  },

  // Timeline
  timelineHint: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: COLORS.primary,
    opacity: 0.5,
    marginBottom: 16,
  },
  timelineGrid: {
    gap: 10,
  },
  timelineOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 40, 70, 0.03)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 14,
  },
  timelineOptionSelected: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  timelineTextContainer: {
    flex: 1,
  },
  timelineLabel: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 15,
    color: COLORS.primary,
    marginBottom: 2,
  },
  timelineDescription: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: COLORS.primary,
    opacity: 0.5,
  },
  timelineCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Quote
  quoteContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  quoteText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: COLORS.primary,
    opacity: 0.6,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 24,
  },
  quoteAuthor: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: COLORS.primary,
    opacity: 0.4,
    marginTop: 8,
  },

  // Submit Button
  submitButton: {
    marginTop: 8,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 18,
    color: COLORS.white,
  },
});
