import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { gatePremiumFeature } from '@/utils/premiumGate';
import { maybePromptForGoalCompletionReview } from '@/utils/storeReview';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Firework Effect Component
function FireworkEffect() {
  const sparkles = Array.from({ length: 8 }, (_, i) => {
    const animValue = useRef(new Animated.Value(0)).current;
    const rotation = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      // Animate sparkle movement
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(animValue, {
              toValue: 1,
              duration: 1500 + i * 100,
              useNativeDriver: true,
            }),
            Animated.timing(rotation, {
              toValue: 1,
              duration: 1000 + i * 50,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 1500 + i * 100,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, []);

    const angle = (i / 8) * Math.PI * 2;
    const radius = 30 + i * 5;
    
    const translateX = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, Math.cos(angle) * radius],
    });
    
    const translateY = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, Math.sin(angle) * radius],
    });
    
    const rotate = rotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
    
    const opacity = animValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 0],
    });
    
    const scale = animValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1.2, 0],
    });

    return { translateX, translateY, rotate, opacity, scale };
  });

  return (
    <View style={styles.fireworkContainer}>
      {sparkles.map((sparkle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.sparkle,
            {
              transform: [
                { translateX: sparkle.translateX },
                { translateY: sparkle.translateY },
                { rotate: sparkle.rotate },
                { scale: sparkle.scale },
              ],
              opacity: sparkle.opacity,
            },
          ]}
        >
          <Text style={styles.sparkleText}>✨</Text>
        </Animated.View>
      ))}
    </View>
  );
}

interface Goal {
  id: string;
  name: string;
  steps: any[];
  numberOfSteps: number;
  estimatedDuration: string;
  aiEstimatedDuration?: string;
  userSelectedDuration?: string;
  hardnessLevel: string;
  fear: string;
  progressPercentage: number;
  isActive: boolean;
  isQueued?: boolean;
  isAiGenerated?: boolean;
  milestones?: string[];
  createdAt: string;
  currentStepIndex: number;
}

const normalizeDifficulty = (difficulty?: string): 'easy' | 'medium' | 'hard' => {
  const value = (difficulty || '').trim().toLowerCase();
  if (value === 'easy' || value === 'легкий' || value === 'лёгкий') return 'easy';
  if (value === 'hard' || value === 'сложный') return 'hard';
  return 'medium';
};

const getDifficultyLabelRu = (difficulty?: string): string => {
  const normalized = normalizeDifficulty(difficulty);
  if (normalized === 'easy') return 'Легкий';
  if (normalized === 'hard') return 'Сложный';
  return 'Средний';
};

const getDifficultyLabel = (difficulty: string, isRussian: boolean): string => {
  const normalized = normalizeDifficulty(difficulty);
  if (normalized === 'easy') return isRussian ? 'Легкий' : 'Easy';
  if (normalized === 'hard') return isRussian ? 'Сложный' : 'Hard';
  return isRussian ? 'Средний' : 'Medium';
};

const localizeDuration = (duration: string | undefined, isRussian: boolean): string => {
  if (isRussian) {
    return localizeDurationRu(duration);
  }
  const value = (duration || '').trim();
  if (!value) return '1-2 months';
  const lower = value.toLowerCase();
  if (lower.includes('year') && (lower.includes('1+') || lower.includes('plus'))) {
    return '1+ year';
  }
  return value;
};

const localizeDurationRu = (duration?: string): string => {
  const value = (duration || '').trim();
  if (!value) return '1-2 месяца';

  const lower = value.toLowerCase();
  if (/[а-яё]/i.test(value)) return value;

  if (lower.includes('week')) {
    const match = lower.match(/(\d+)\s*-\s*(\d+)/);
    if (match) return `${match[1]}-${match[2]} недель`;
    const one = lower.match(/(\d+)/);
    if (one) return `${one[1]} недель`;
    return 'несколько недель';
  }

  if (lower.includes('month')) {
    const range = lower.match(/(\d+)\s*-\s*(\d+)/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      const unit = end >= 5 ? 'месяцев' : 'месяца';
      return `${start}-${end} ${unit}`;
    }
    const single = lower.match(/(\d+)/);
    if (single) {
      const n = Number(single[1]);
      if (n === 1) return '1 месяц';
      if (n >= 2 && n <= 4) return `${n} месяца`;
      return `${n} месяцев`;
    }
    return 'несколько месяцев';
  }

  if (lower.includes('year') && (lower.includes('1+') || lower.includes('plus'))) {
    return '1+ лет';
  }

  if (lower.includes('year')) {
    const single = lower.match(/(\d+)/);
    if (single) {
      const n = Number(single[1]);
      if (n === 1) return '1 год';
      if (n >= 2 && n <= 4) return `${n} года`;
      return `${n} лет`;
    }
    return 'несколько лет';
  }

  if (lower === 'six months') return '6 месяцев';
  if (lower === 'three months') return '3 месяца';

  return value;
};

// ============================================================================
// ACTIVE GOALS SCREEN
// A gentle, non-overwhelming goals management interface
// Max 3 active goals to maintain focus, with queue for additional goals
// ============================================================================

// GoalCard Component
const GoalCard = ({ goal, displayData, onDelete, isActive, removalAnimation }: {
  goal: Goal;
  displayData: {
    progress: number;
    currentLevel: number;
    totalLevels: number;
    nextStep: string;
    difficulty: string;
    insight: string;
    insightDisplay: { icon: string; label: string };
    color: string;
  };
  onDelete: () => void;
  isActive: boolean;
  removalAnimation?: Animated.Value;
}) => {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  
  const handleNextStepPress = () => {
    // Navigate to goal map and scroll to the specific level card
    router.push({
      pathname: '/goal-map',
      params: {
        goalName: goal.name,
        goalId: goal.id,
        scrollToLevel: displayData.currentLevel.toString(), // Level to scroll to
      },
    });
  };
  const cardStyle = removalAnimation ? {
    opacity: removalAnimation,
    transform: [
      { scale: removalAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
      { translateY: removalAnimation.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) },
    ],
  } : { opacity: isActive ? 1 : 0.7, transform: [{ scale: isActive ? 1 : 0.95 }] };

  // Ensure we're deleting the correct goal by using the goal.id directly
  const handleDelete = () => {
    console.log('GoalCard delete button clicked for goal:', goal.id, goal.name);
    onDelete();
  };

  const getStatusLabel = () => {
    if (displayData.progress === 0) return tr('Ready to start', 'Готово к старту');
    if (displayData.progress === 100) return tr('Completed!', 'Завершено!');
    return tr('In progress', 'В процессе');
  };

  const getDifficultyColor = (difficulty: string) => {
    const normalized = normalizeDifficulty(difficulty);
    if (normalized === 'easy') return '#e1e1bb';
    if (normalized === 'medium') return '#faecb3';
    return '#d4a5a5';
  };

  // Get time commitment - prefer AI timeline, then user-selected, then stored estimate
  const getTimeCommitment = () => {
    const aiDuration = goal.aiEstimatedDuration?.trim();
    if (aiDuration) return localizeDuration(aiDuration, isRussian);

    const userDuration = goal.userSelectedDuration?.trim();
    if (userDuration) return localizeDuration(userDuration, isRussian);

    if (goal.estimatedDuration) return localizeDuration(goal.estimatedDuration, isRussian);

    // Fallback estimates based on difficulty if no AI-generated duration exists
    const normalized = normalizeDifficulty(displayData.difficulty);
    if (normalized === 'easy') return tr('2-4 weeks', '2-4 недели');
    if (normalized === 'hard') return tr('3-6 months', '3-6 месяцев');
    return tr('1-2 months', '1-2 месяца');
  };

  // Use the same gradient for all cards as per design
  const gradientColors: [string, string, string] = ['#7B6A95', '#9B8BB5', '#a592b0'];

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      {/* Card gradient background */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      />
      
      {/* Card gradient background overlay */}
      <View style={styles.cardBg} />

      {/* Top row: status + remove */}
      <View style={styles.cardTopRow}>
        <View style={styles.statusPill}>
          <View style={[
            styles.statusDot,
            { backgroundColor: displayData.progress === 0 ? '#a592b0' : '#e1e1bb', marginRight: 8 }
          ]} />
          <Text style={styles.statusText}>{getStatusLabel()}</Text>
        </View>
        <TouchableOpacity 
          style={styles.removeBtn} 
          onPress={handleDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <Path d="M18 6L6 18M6 6L18 18" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Goal Name */}
      <Text style={styles.cardTitle}>{goal.name}</Text>

      {/* Info chips row */}
      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <Text style={[styles.chipLabel, { marginBottom: 4 }]}>{tr('Difficulty', 'Сложность')}</Text>
          <View style={styles.chipValue}>
            <View style={[
              styles.chipDot,
              { backgroundColor: getDifficultyColor(displayData.difficulty), marginRight: 6 }
            ]} />
            <Text style={styles.chipText}>{getDifficultyLabel(displayData.difficulty, isRussian)}</Text>
          </View>
        </View>
        <View style={styles.chipDivider} />
        <View style={styles.chip}>
          <Text style={[styles.chipLabel, { marginBottom: 4 }]}>{tr('Time', 'Время')}</Text>
          <Text style={styles.chipText}>{getTimeCommitment()}</Text>
        </View>
      </View>

      {/* Inner Insight */}
      <View style={styles.insightRow}>
        <Text style={[styles.insightEmoji, { marginRight: 12 }]}>{displayData.insightDisplay.icon}</Text>
        <View style={styles.insightContent}>
          <Text style={[styles.insightLabel, { marginBottom: 2 }]}>{displayData.insightDisplay.label}</Text>
          <Text style={styles.insightValue}>{displayData.insight}</Text>
        </View>
      </View>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLevel}>{tr('Level', 'Уровень')} {displayData.currentLevel} {tr('of', 'из')} {displayData.totalLevels}</Text>
          <Text style={styles.progressPercent}>{displayData.progress}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[
            styles.progressFill,
            { width: `${Math.max(displayData.progress, 2)}%` }
          ]} />
        </View>
      </View>

      {/* Next Step */}
      <View style={styles.nextLevel}>
        <Text style={styles.nextLevelLabel}>{tr('Next step', 'Следующий шаг')}</Text>
        <TouchableOpacity 
          style={styles.nextLevelCard}
          onPress={handleNextStepPress}
          activeOpacity={0.8}
        >
          <View style={[styles.nextLevelNumber, { marginRight: 12 }]}>
            <Text style={styles.nextLevelNumberText}>{displayData.currentLevel}</Text>
          </View>
          <Text style={styles.nextLevelName}>{displayData.nextStep}</Text>
          <View style={{ marginLeft: 'auto' }}>
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <Path d="M9 18L15 12L9 6" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// AddGoalModal Component
const AddGoalModal = ({ onClose, onViewQueue, canAddActive, queueCount, onGoalCreated }: {
  onClose: () => void;
  onViewQueue: () => void;
  canAddActive: boolean;
  queueCount: number;
  onGoalCreated?: () => void;
}) => {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  const [isStartingAiFlow, setIsStartingAiFlow] = useState(false);
  
  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.modal,
              {
                width: Math.min(windowWidth * 0.95, 500),
                minHeight: Math.min(windowHeight * 0.8, 560),
                maxHeight: Math.min(windowHeight * 0.95, 680),
              },
            ]}
          >
          <View style={styles.addGoalModalHeader}>
            <View style={styles.addGoalModalCloseRow}>
              <TouchableOpacity
                style={[styles.helperButton, styles.addGoalModalCloseButton]}
                onPress={onClose}
              >
                <MaterialIcons name="close" size={22} color="#342846" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalTitle}>{tr('Add a new goal', 'Добавить новую цель')}</Text>
          </View>

          <View style={styles.modalNotice}>
            <Text style={styles.noticeIcon}>💡</Text>
            <Text style={styles.noticeText}>
              {!canAddActive
                ? tr(
                    'You already have 3 active goals. New goals will be queued until you complete or remove one. This helps you stay focused!',
                    'У тебя уже 3 активные цели. Новые цели будут добавлены в очередь, пока ты не завершишь или не уберешь одну. Так тебе легче держать фокус!'
                  )
                : tr(
                    `You can keep up to 3 active goals. ${queueCount > 0 ? `${queueCount} goal(s) are waiting in queue.` : 'Use this space to add your next goal.'}`,
                    `Можно держать до 3 активных целей. ${queueCount > 0 ? `В очереди ждут: ${queueCount}.` : 'Используй это окно, чтобы добавить следующую цель.'}`
                  )}
            </Text>
          </View>

          <View style={styles.modalOptions}>
            <TouchableOpacity
              style={[styles.optionButton, isStartingAiFlow && styles.optionButtonDisabled]}
              onPress={async () => {
                if (isStartingAiFlow) return;
                setIsStartingAiFlow(true);
                try {
                  const canProceed = await gatePremiumFeature('ai_custom_goal');
                  if (!canProceed) {
                    return;
                  }
                  onClose();
                  router.push('/ai-goal-picker');
                } finally {
                  setIsStartingAiFlow(false);
                }
              }}
              disabled={isStartingAiFlow}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}>
                {isStartingAiFlow ? (
                  <ActivityIndicator size="small" color="#342846" />
                ) : (
                  <Image
                    source={require('../../assets/images/star.png')}
                    style={styles.optionIconImage}
                    resizeMode="contain"
                  />
                )}
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{tr('Ask AI to pick a goal for me', 'Попросить ИИ подобрать цель под меня')}</Text>
                <Text style={styles.optionDesc}>
                  {tr('Get personalized paths and goals based on your story', 'Получи персональные пути и цели на основе твоей истории')}
                </Text>
              </View>
              {!isStartingAiFlow && (
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <Path d="M9 18L15 12L9 6" stroke="#7A8A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </Svg>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                onClose();
                router.push('/new-goal');
              }}
            >
              <View style={styles.optionIcon}>
                <Image
                  source={require('../../assets/images/love.png')}
                  style={styles.optionIconImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{tr('Create your own path', 'Создать свой путь')}</Text>
                <Text style={styles.optionDesc}>{tr('Build a goal with your own milestones', 'Собери цель с собственными этапами')}</Text>
              </View>
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path d="M9 18L15 12L9 6" stroke="#7A8A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </Svg>
            </TouchableOpacity>
          </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// QueueModal Component
const QueueModal = ({ goals, onClose, onActivate, onDelete, canActivate, activeCount }: {
  goals: Goal[];
  onClose: () => void;
  onActivate: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  canActivate: boolean;
  activeCount: number;
}) => {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  const normalizeGoalBlocker = (raw?: string) => {
    const value = String(raw || '').trim();
    if (!value) return tr('Reflection', 'Рефлексия');
    const lower = value.toLowerCase();
    const isPromptLike =
      lower.includes("what's your biggest constraint right now") ||
      lower.includes('what is your biggest constraint right now') ||
      lower.includes('biggest constraint right now') ||
      lower.includes('current life context') ||
      lower.includes('что сейчас мешает') ||
      lower.includes('самое большое ограничение');
    return isPromptLike ? tr('Reflection', 'Рефлексия') : value;
  };
  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.queueModalOverlay}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <View style={styles.queueModalContent}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.helperButton, styles.queueModalCloseButton]}
          >
            <MaterialIcons name="close" size={22} color="#342846" />
          </TouchableOpacity>
          <View style={[styles.modalHeader, styles.queueModalHeader]}>
            <View style={[styles.modalTitleContainer, styles.queueModalTitleContainer]}>
              <Text style={[styles.modalTitle, styles.queueModalTitle]}>{tr('Queued goals', 'Цели в очереди')}</Text>
            </View>
          </View>

          <Text style={[styles.queueExplainer, styles.queueModalSubheading]}>
            {tr('These goals are waiting for a free slot. You can keep up to 3 active goals at once.', 'Эти цели ждут свободного места. Одновременно можно держать до 3 активных целей.')}
            {activeCount < 3 && tr(` You can activate now: ${3 - activeCount}.`, ` Сейчас можно активировать ещё: ${3 - activeCount}.`)}
          </Text>

          {goals.length === 0 ? (
            <View style={styles.emptyQueue}>
              <Image 
                source={require('../../assets/images/star.png')} 
                style={styles.emptyQueueIcon}
                resizeMode="contain"
              />
              <Text style={styles.emptyQueueText}>{tr('No queued goals yet', 'В очереди пока нет целей')}</Text>
              <Text style={styles.emptyQueueSubtext}>{tr('Goals added while at the limit will appear here', 'Цели, добавленные при заполненном лимите, появятся здесь')}</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.queueList} 
              contentContainerStyle={styles.queueListContent}
              showsVerticalScrollIndicator={true}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              bounces={true}
              alwaysBounceVertical={false}
              keyboardShouldPersistTaps="handled"
            >
              {goals.map(goal => (
                <View key={goal.id} style={styles.queueItem}>
                  <View style={styles.queueItemInfo}>
                    <Text
                      style={styles.queueItemName}
                      android_hyphenationFrequency="none"
                      textBreakStrategy="simple"
                    >
                      {goal.name}
                    </Text>
                    <Text style={styles.queueItemMeta}>
                      {getDifficultyLabel(goal.hardnessLevel, isRussian) || tr('Medium', 'Средний')} • {normalizeGoalBlocker(goal.fear)}
                    </Text>
                  </View>
                  <View style={styles.queueItemActions}>
                    <TouchableOpacity
                      style={[styles.activateButton, { opacity: canActivate ? 1 : 0.5 }]}
                      onPress={() => {
                        console.log('Activate button pressed for goal:', goal.id, goal.name);
                        console.log('canActivate:', canActivate);
                        if (canActivate) {
                          onActivate(goal);
                        } else {
                          console.log('Activate button disabled - cannot activate');
                        }
                      }}
                      disabled={!canActivate}
                    >
                      <Text style={styles.activateButtonText}>{tr('Activate', 'Активировать')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteQueueButton}
                      onPress={() => onDelete(goal)}
                    >
                      <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <Path d="M18 6L6 18M6 6L18 18" stroke="#7A8A9A" strokeWidth="2" strokeLinecap="round"/>
                      </Svg>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};
// DeleteConfirmModal Component
const DeleteConfirmModal = ({ onConfirm, onCancel }: {
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.deleteConfirmModalOverlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity style={styles.confirmModal} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.confirmIcon}>🌙</Text>
          <Text style={styles.confirmTitle}>{tr('Let this goal go?', 'Отпустить эту цель?')}</Text>
          <Text style={styles.confirmText}>
            {tr('It is okay to release what no longer helps you. This goal will be removed from active goals.', 'Это нормально - отпускать то, что больше тебе не помогает. Цель будет удалена из списка активных.')}
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>{tr('Keep it', 'Оставить')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={onConfirm}>
              <Text style={styles.deleteButtonText}>{tr('Release', 'Отпустить')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default function GoalsScreen() {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  const normalizeGoalBlocker = (raw?: string) => {
    const value = String(raw || '').trim();
    if (!value) return tr('Reflection', 'Рефлексия');
    const lower = value.toLowerCase();
    const isPromptLike =
      lower.includes("what's your biggest constraint right now") ||
      lower.includes('what is your biggest constraint right now') ||
      lower.includes('biggest constraint right now') ||
      lower.includes('current life context') ||
      lower.includes('что сейчас мешает') ||
      lower.includes('самое большое ограничение');
    return isPromptLike ? tr('Reflection', 'Рефлексия') : value;
  };
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [queuedGoals, setQueuedGoals] = useState<Goal[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [requireGoalSelectionAfterDelete, setRequireGoalSelectionAfterDelete] = useState(false);
  const [showGoalSelectionRequiredModal, setShowGoalSelectionRequiredModal] = useState(false);
  const [showGoalCompletedPopup, setShowGoalCompletedPopup] = useState(false);
  const [completedGoalName, setCompletedGoalName] = useState<string>('');
  const [removingGoalId, setRemovingGoalId] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const lastHandledCompletedGoalId = useRef<string | null>(null);

  const clearCompletedGoalParams = useCallback(() => {
    router.setParams({
      completedGoalId: undefined,
      completedGoalName: undefined,
    });
  }, [router]);
  
  // Animation refs for goal removal
  const removalAnimations = useRef<{ [key: string]: Animated.Value }>({}).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const mainScrollViewRef = useRef<ScrollView>(null);
  
  // Color palette for goal cards - gradient purple colors
  const goalColors = ['#7B6A95', '#9B8BB5', '#a592b0'];
  
  // Load active goals and queued goals from AsyncStorage
  const loadGoals = useCallback(async () => {
    try {
      const userGoalsData = await AsyncStorage.getItem('userGoals');
      if (userGoalsData) {
        const allGoals: Goal[] = JSON.parse(userGoalsData);
        
        // Filter out invalid goals (must have name and id)
        const validGoals = allGoals.filter((g: Goal) => {
          return g && g.id && g.name && g.name.trim() !== '';
        });
        
        // Sort goals by creation date (newest first)
        const sortedGoals = validGoals.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA; // Newest first
        });
        
        // Filter to only active goals (max 3), prioritizing newest
        // But ensure we keep all active goals if there are 3 or fewer
        const activeGoalsList = sortedGoals.filter((g: Goal) => g.isActive === true);
        const active = activeGoalsList.length <= 3 
          ? activeGoalsList 
          : activeGoalsList.slice(0, 3);
        
        console.log('Loaded goals:', {
          total: allGoals.length,
          valid: validGoals.length,
          active: active.length,
          activeGoals: active.map(g => ({ id: g.id, name: g.name, isActive: g.isActive, createdAt: g.createdAt })),
          allGoals: sortedGoals.map(g => ({ id: g.id, name: g.name, isActive: g.isActive, isQueued: g.isQueued, createdAt: g.createdAt })),
        });
        
        setActiveGoals(active);
        if (active.length > 0) {
          setRequireGoalSelectionAfterDelete(false);
          setShowGoalSelectionRequiredModal(false);
        }
        
        // Get queued goals
        const queued = sortedGoals
          .filter((g: Goal) => g.isQueued === true);
        setQueuedGoals(queued);
        
        // If we filtered out invalid goals, save the cleaned list back
        if (validGoals.length !== allGoals.length) {
          console.log(`Filtered out ${allGoals.length - validGoals.length} invalid goals`);
          await AsyncStorage.setItem('userGoals', JSON.stringify(sortedGoals));
        }
      } else {
        console.log('No goals found in AsyncStorage');
      }
      
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Reload when screen comes into focus - ensure fresh data
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        loadGoals();
      }, 100);
      return () => clearTimeout(timer);
    }, [loadGoals])
  );

  // Handle completed goal removal animation and popup
  useEffect(() => {
    const completedGoalId = params.completedGoalId as string;
    const completedGoalNameParam = params.completedGoalName as string;

    if (!completedGoalId || !completedGoalNameParam) {
      return;
    }

    if (lastHandledCompletedGoalId.current === completedGoalId) {
      return;
    }

    lastHandledCompletedGoalId.current = completedGoalId;
    void maybePromptForGoalCompletionReview();

    if (!showGoalCompletedPopup) {
      // Find the goal in active goals
      const goalToRemove = activeGoals.find(g => g.id === completedGoalId);
      
      if (goalToRemove) {
        setCompletedGoalName(completedGoalNameParam);
        setRemovingGoalId(completedGoalId);
        
        // Create animation for this goal if it doesn't exist
        if (!removalAnimations[completedGoalId]) {
          removalAnimations[completedGoalId] = new Animated.Value(1);
        }
        
        const anim = removalAnimations[completedGoalId];
        
        // Animate removal: fade out and slide down
        Animated.sequence([
          Animated.parallel([
            Animated.timing(anim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          // Remove goal from active goals after animation
          setActiveGoals(prev => prev.filter(g => g.id !== completedGoalId));
          setRemovingGoalId(null);
          
          // Show popup after removal animation
          setTimeout(() => {
            setShowGoalCompletedPopup(true);
            clearCompletedGoalParams();
          }, 200);
        });
      } else {
        // Goal already removed, just show popup
        setCompletedGoalName(completedGoalNameParam);
        setShowGoalCompletedPopup(true);
        clearCompletedGoalParams();
      }
    }
  }, [params.completedGoalId, params.completedGoalName, activeGoals, showGoalCompletedPopup, clearCompletedGoalParams]);
  
  // Get insight display based on fear/insight type
  const getInsightDisplay = (fearText: string | undefined): { icon: string; label: string } => {
    if (!fearText) return { icon: '💫', label: tr('Reflection', 'Рефлексия') };
    const lowerFear = fearText.toLowerCase();
    if (lowerFear.includes('fear') || lowerFear.includes('afraid') || lowerFear.includes('worried')) {
      return { icon: '🌙', label: tr('Inner fear', 'Внутренний страх') };
    } else if (lowerFear.includes('challenge') || lowerFear.includes('difficult') || lowerFear.includes('hard')) {
      return { icon: '🌱', label: tr('Growth zone', 'Зона роста') };
    } else {
      return { icon: '✨', label: tr('Insight', 'Инсайт') };
    }
  };
  
  // Handle delete goal
  const handleDeleteGoal = async (goalId: string) => {
    try {
      console.log('Deleting goal with ID:', goalId);
      const goalToDelete = activeGoals.find(g => g.id === goalId);
      console.log('Goal to delete:', goalToDelete?.name);
      
      const userGoalsData = await AsyncStorage.getItem('userGoals');
      if (userGoalsData) {
        const deletingLastActiveGoal = activeGoals.length <= 1;
        const allGoals: Goal[] = JSON.parse(userGoalsData);
        const updatedGoals = allGoals.filter(g => {
          const shouldKeep = g.id !== goalId;
          if (!shouldKeep) {
            console.log('Removing goal:', g.id, g.name);
          }
          return shouldKeep;
        });
        await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('goals').delete().eq('user_id', user.id).eq('name', goalToDelete?.name || '');
          }
        } catch (err) { console.error('Supabase goal delete error:', err); }
        
        const currentActiveCount = activeGoals.length;
        setActiveGoals(prev => {
          const filtered = prev.filter(g => g.id !== goalId);
          console.log('Active goals after filter:', filtered.map(g => ({ id: g.id, name: g.name })));
          return filtered;
        });
        setShowDeleteConfirm(null);
        
        // Adjust current card index if needed
        setCurrentCardIndex(prev => {
          const newActiveCount = currentActiveCount - 1;
          if (prev >= newActiveCount && prev > 0) {
            return prev - 1;
          }
          return prev;
        });
        
        // Note: Queued goals will NOT be automatically activated
        // User must manually activate goals from the queue using the "Activate" button
        
        await loadGoals();
        if (deletingLastActiveGoal) {
          setRequireGoalSelectionAfterDelete(true);
          setShowQueueModal(true);
        }
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };
  
  // Handle add goal from queue
  const handleAddGoalFromQueue = async (goal: Goal) => {
    console.log('=== ACTIVATE GOAL ===');
    console.log('Goal to activate:', goal.id, goal.name);
    console.log('Current active goals:', activeGoals.length);
    
    // Double-check we have space before activating
    if (activeGoals.length >= 3) {
      console.log('❌ Cannot activate: already have 3 active goals');
      return;
    }
    
    try {
      const userGoalsData = await AsyncStorage.getItem('userGoals');
      if (!userGoalsData) {
        console.error('❌ No goals data found in AsyncStorage');
        return;
      }
      
      const allGoals: Goal[] = JSON.parse(userGoalsData);
      
      // Count active goals in storage to ensure we don't exceed limit
      const activeCountInStorage = allGoals.filter(g => g.isActive === true).length;
      console.log('Active goals in storage:', activeCountInStorage);
      
      if (activeCountInStorage >= 3) {
        console.log('❌ Cannot activate: storage already has 3 active goals');
        await loadGoals();
        return;
      }
      
      // Update the goal to be active and not queued
      const updatedGoal = { ...goal, isActive: true, isQueued: false };
      const updatedGoals = allGoals.map(g => 
        g.id === goal.id ? updatedGoal : g
      );
      
      console.log('✅ Updating goal in storage to active');
      
      // Update AsyncStorage
      await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('goals').update({ status: 'active' }).eq('user_id', user.id).eq('name', goal.name);
        }
      } catch (err) { console.error('Supabase goal activate error:', err); }
      
      // Remove from queued goals state immediately
      setQueuedGoals(prev => prev.filter(g => g.id !== goal.id));
      
      // Reload goals - this will update activeGoals state
      await loadGoals();
      
      console.log('✅ Goals reloaded');
      
      // Close modal
      setShowQueueModal(false);
      setRequireGoalSelectionAfterDelete(false);
      setShowGoalSelectionRequiredModal(false);
      
    } catch (error) {
      console.error('❌ Error activating goal:', error);
      await loadGoals();
    }
  };
  
  // Handle delete queued goal
  const handleDeleteQueuedGoal = async (goal: Goal) => {
    try {
      const userGoalsData = await AsyncStorage.getItem('userGoals');
      if (userGoalsData) {
        const allGoals: Goal[] = JSON.parse(userGoalsData);
        const updatedGoals = allGoals.filter(g => g.id !== goal.id);
        await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));
        setQueuedGoals(prev => prev.filter(g => g.id !== goal.id));
        loadGoals();
      }
    } catch (error) {
      console.error('Error deleting queued goal:', error);
    }
  };
  
  // Swipe handling for carousel
  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const cardWidth = width; // Full width for paging
    const index = Math.round(scrollPosition / cardWidth);
    if (index >= 0 && index < activeGoals.length) {
      setCurrentCardIndex(index);
    }
  };

  // Center the current card when component loads or when index changes
  useEffect(() => {
    if (activeGoals.length > 0 && scrollViewRef.current) {
      // Small delay to ensure ScrollView is rendered
      const timer = setTimeout(() => {
        const cardWidth = width;
        scrollViewRef.current?.scrollTo({
          x: currentCardIndex * cardWidth,
          animated: true,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeGoals.length, currentCardIndex]);
  
  const currentGoal = activeGoals[currentCardIndex] || activeGoals[0];
  
  // Calculate progress and level info for a goal
  const getGoalDisplayData = (goal: Goal) => {
    const totalSteps = goal.numberOfSteps || 4;
    const completedSteps = goal.currentStepIndex !== undefined ? goal.currentStepIndex + 1 : 0;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    const currentLevel = Math.floor(completedSteps / (totalSteps / 4)) + 1;
    
    // Get the next step name (the step after currentStepIndex)
    let nextStep = tr('Start your path', 'Начни свой путь');
    if (goal.steps && goal.steps.length > 0) {
      const nextStepIndex = goal.currentStepIndex !== undefined ? goal.currentStepIndex + 1 : 0;
      if (nextStepIndex < goal.steps.length) {
        nextStep = goal.steps[nextStepIndex]?.name || tr('Start your path', 'Начни свой путь');
      }
    }
    
    return {
      progress,
      currentLevel: Math.min(currentLevel, 4),
      totalLevels: 4,
      nextStep,
      difficulty: goal.hardnessLevel || tr('Medium', 'Средний'),
      insight: normalizeGoalBlocker(goal.fear),
      insightDisplay: getInsightDisplay(normalizeGoalBlocker(goal.fear)),
      color: goalColors[activeGoals.findIndex(g => g.id === goal.id) % goalColors.length],
    };
  };
  
  const currentGoalDisplay = currentGoal ? getGoalDisplayData(currentGoal) : null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={mainScrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 44, height: 44 }} />
          <TouchableOpacity
            style={styles.helperButton}
            onPress={() => setShowHelpModal(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="help-outline" size={24} color="#342846" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{tr('ACTIVE GOALS', 'АКТИВНЫЕ ЦЕЛИ')}</Text>
          <Text style={styles.subtitle}>{tr('Focus on what matters most', 'Фокусируйся на самом важном')}</Text>
        </View>

        {/* Pagination Dots */}
        {activeGoals.length > 1 && (
          <View style={styles.pagination}>
            {activeGoals.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dot,
                  index === currentCardIndex && styles.dotActive
                ]}
                onPress={() => {
                  setCurrentCardIndex(index);
                  const cardWidth = width; // Full width for paging
                  scrollViewRef.current?.scrollTo({
                    x: index * cardWidth,
                    animated: true,
                  });
                }}
              />
            ))}
          </View>
        )}

        {/* Goal Cards Carousel */}
        {activeGoals.length > 0 ? (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            style={styles.carouselContainer}
            contentContainerStyle={[
              styles.carouselContent,
              activeGoals.length === 1 && styles.carouselContentSingle
            ]}
          >
            {activeGoals.map((goal, index) => {
              const displayData = getGoalDisplayData(goal);
              // Create a stable delete handler that captures the correct goal ID
              const handleDeleteClick = () => {
                const goalIdToDelete = goal.id;
                console.log('Delete button clicked - Goal ID:', goalIdToDelete, 'Goal Name:', goal.name, 'Index:', index);
                setShowDeleteConfirm(goalIdToDelete);
              };
              
              return (
                <View key={goal.id} style={styles.cardWrapper}>
                  <GoalCard
                    goal={goal}
                    displayData={displayData}
                    onDelete={handleDeleteClick}
                    isActive={index === currentCardIndex}
                    removalAnimation={removingGoalId === goal.id ? removalAnimations[goal.id] : undefined}
                  />
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyText}>{tr('No active goals yet', 'Пока нет активных целей')}</Text>
            <Text style={styles.emptySubtext}>{tr('Start your path: add your first goal', 'Начни путь: добавь первую цель')}</Text>
          </View>
        )}

        {/* Continue Quest Button */}
        {activeGoals.length > 0 && currentGoal && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.push({
              pathname: '/goal-map',
              params: { goalName: currentGoal.name, goalId: currentGoal.id }
            })}
          >
            <Text style={styles.continueButtonText}>
              {tr('Continue quest', 'Продолжить квест')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Queue Preview Section */}
        <View style={styles.queueSection}>
          <TouchableOpacity
            style={styles.queueButton}
            onPress={() => setShowQueueModal(true)}
          >
            <Text style={styles.queueText}>
              {tr('View queued goals', 'Посмотреть цели в очереди')}
            </Text>
            {queuedGoals.length > 0 && (
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>{queuedGoals.length}</Text>
              </View>
            )}
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <Path d="M9 18L15 12L9 6" stroke="#7A8A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Add New Goal Button */}
        <View style={styles.addNewGoalSection}>
          <TouchableOpacity
            style={styles.addNewGoalButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addNewGoalText}>{tr('Add new goal', 'Добавить новую цель')}</Text>
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <Path d="M9 18L15 12L9 6" stroke="#342846" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Goal Completed Popup */}
      <Modal
        visible={showGoalCompletedPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGoalCompletedPopup(false)}
      >
        <View style={styles.goalCompletedPopupOverlay}>
          <View style={styles.goalCompletedPopupContent}>
            <TouchableOpacity
              style={styles.goalCompletedCloseButton}
              onPress={() => setShowGoalCompletedPopup(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.goalCompletedCloseButtonText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.goalCompletedIconContainer}>
              <Text style={styles.goalCompletedIcon}>🎉</Text>
            </View>
            <Text style={styles.goalCompletedTitle}>{tr('Goal completed!', 'Цель завершена!')}</Text>
            <Text style={styles.goalCompletedMessage}>
              {tr(
                `Goal "${completedGoalName ? completedGoalName.charAt(0).toUpperCase() + completedGoalName.slice(1).toLowerCase() : ''}" moved to completed.`,
                `Цель "${completedGoalName ? completedGoalName.charAt(0).toUpperCase() + completedGoalName.slice(1).toLowerCase() : ''}" перенесена в завершенные.`
              )}
            </Text>
            <View style={styles.goalCompletedButtons}>
              <TouchableOpacity
                style={styles.goalCompletedButtonPrimary}
                onPress={() => {
                  setShowGoalCompletedPopup(false);
                  router.push('/(tabs)/me');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.goalCompletedButtonPrimaryText}>{tr('Open in "Me"', 'Открыть в «Я»')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Goal Modal */}
      {showAddModal && (
        <AddGoalModal
          onClose={() => setShowAddModal(false)}
          onViewQueue={() => {
            setShowAddModal(false);
            setShowQueueModal(true);
          }}
          canAddActive={activeGoals.length < 3}
          queueCount={queuedGoals.length}
          onGoalCreated={() => {
            loadGoals();
          }}
        />
      )}

      {/* Queue Modal */}
      {showQueueModal && (
        <QueueModal
          goals={queuedGoals}
          onClose={() => {
            setShowQueueModal(false);
            if (requireGoalSelectionAfterDelete && activeGoals.length === 0) {
              setShowGoalSelectionRequiredModal(true);
            }
          }}
          onActivate={handleAddGoalFromQueue}
          onDelete={handleDeleteQueuedGoal}
          canActivate={activeGoals.length < 3}
          activeCount={activeGoals.length}
        />
      )}

      <Modal
        visible={showGoalSelectionRequiredModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowGoalSelectionRequiredModal(false);
          setShowQueueModal(true);
        }}
      >
        <View style={styles.goalCompletedPopupOverlay}>
          <View style={styles.goalCompletedPopupContent}>
            <View style={styles.goalCompletedIconContainer}>
              <Text style={styles.goalCompletedIcon}>🎯</Text>
            </View>
            <Text style={styles.goalCompletedTitle}>{tr('Choose a goal', 'Выбери цель')}</Text>
            <Text style={styles.goalCompletedMessage}>
              {tr(
                'You removed all active goals. Please choose one from queue to continue.',
                'Ты удалил(а) все активные цели. Пожалуйста, выбери одну из очереди, чтобы продолжить.'
              )}
            </Text>
            <View style={styles.goalCompletedButtons}>
              <TouchableOpacity
                style={styles.goalCompletedButtonPrimary}
                onPress={() => {
                  setShowGoalSelectionRequiredModal(false);
                  setShowQueueModal(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.goalCompletedButtonPrimaryText}>
                  {tr('Open queued goals', 'Открыть очередь целей')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          onConfirm={() => handleDeleteGoal(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      )}

      {/* Help Modal */}
      <Modal
        visible={showHelpModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.helpModalOverlay}>
          <TouchableOpacity
            style={styles.helpModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowHelpModal(false)}
          />
          <View style={styles.helpModalContent}>
            <TouchableOpacity
              onPress={() => setShowHelpModal(false)}
              style={[styles.helperButton, styles.helpModalCloseButton]}
            >
              <MaterialIcons name="close" size={22} color="#342846" />
            </TouchableOpacity>
            <View style={styles.helpModalHeader}>
              <View style={styles.helpModalTitleContainer}>
                <Image
                  source={require('../../assets/images/target_1.png')}
                  style={styles.helpModalHeaderIcon}
                  resizeMode="contain"
                />
                <Text style={styles.helpModalTitle}>{tr('Active goals', 'Активные цели')}</Text>
                <Text style={styles.helpModalSubtitle}>
                  {tr('This is your active goals dashboard. You can keep up to 3 active goals at once to stay focused and move deeper.', 'Это твой дашборд активных целей. Одновременно можно держать до 3 активных целей, чтобы сохранять фокус и двигаться по-настоящему глубоко.')}
                </Text>
              </View>
            </View>
            
            <ScrollView 
              style={styles.helpModalScroll} 
              contentContainerStyle={styles.helpModalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.helpQuickGrid}>
                <View style={styles.helpQuickCard}>
                  <Text style={styles.helpQuickTitle}>{tr('Browse', 'Просмотр')}</Text>
                  <Text style={styles.helpQuickText}>
                    {tr('Swipe to switch goals.', 'Свайпай для переключения целей.')}
                  </Text>
                </View>
                <View style={styles.helpQuickCard}>
                  <Text style={styles.helpQuickTitle}>{tr('Continue', 'Продолжить')}</Text>
                  <Text style={styles.helpQuickText}>
                    {tr('Tap "Continue quest" to jump back in.', 'Нажми «Продолжить квест», чтобы вернуться в работу.')}
                  </Text>
                </View>
                <View style={styles.helpQuickCard}>
                  <Text style={styles.helpQuickTitle}>{tr('Queue', 'Очередь')}</Text>
                  <Text style={styles.helpQuickText}>
                    {tr('Extra goals go to queue until a slot opens.', 'Лишние цели попадают в очередь, пока не освободится слот.')}
                  </Text>
                </View>
                <View style={styles.helpQuickCard}>
                  <Text style={styles.helpQuickTitle}>{tr('Release', 'Отпустить')}</Text>
                  <Text style={styles.helpQuickText}>
                    {tr('Remove goals that no longer matter.', 'Удаляй цели, которые больше не важны.')}
                  </Text>
                </View>
              </View>

              <View style={styles.helpLimitCard}>
                <Text style={styles.helpLimitTitle}>{tr('3 active goals max', 'Максимум 3 активные цели')}</Text>
                <Text style={styles.helpLimitText}>
                  {tr(
                    'Keeping only three active goals helps you move deeper without overload. Finish or release one to activate the next queued goal.',
                    'Ограничение до трех активных целей помогает идти глубже без перегруза. Заверши или отпусти одну цель, чтобы активировать следующую из очереди.'
                  )}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#342846',
    fontWeight: 'bold',
  },
  goalPlusButton: {
    alignSelf: 'flex-end',
  },
  goalPlusText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
  heading: {
    ...HeadingStyle,
    color: '#342846',
    marginBottom: 24,
    fontSize: 24,
    textAlign: 'center',
    width: '100%',
  },
  goalsScrollView: {
    marginBottom: 20,
  },
  goalsScrollContent: {
    paddingHorizontal: 0,
  },
  goalCardWrapper: {
    width: width - 40, // Full width minus horizontal padding (20 * 2)
    paddingHorizontal: 0,
  },
  goalCard: {
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 0,
  },
  goalNameContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 60,
  },
  goalName: {
    ...HeadingStyle,
    color: '#ffffff',
    fontSize: 22,
    textAlign: 'center',
    zIndex: 1,
  },
  fireworkContainer: {
    position: 'absolute',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  sparkle: {
    position: 'absolute',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleText: {
    fontSize: 16,
  },
  hardnessLevelContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  hardnessLevelLabel: {
    ...HeadingStyle,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  hardnessLevelFrame: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 20, // Minimum 20px padding (was 12)
    paddingVertical: 6,
    marginTop: 4,
  },
  hardnessLevelValue: {
    ...BodyStyle,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  fearContainer: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  fearLabel: {
    ...HeadingStyle,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  fearFrame: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 20, // Minimum 20px padding (was 12)
    paddingVertical: 6,
    marginTop: 4,
    width: '100%',
  },
  fearValue: {
    ...BodyStyle,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 20,
    backgroundColor: '#e6e6e6',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#342846', // Purple color
    borderRadius: 10,
  },
  progressPercentage: {
    ...BodyStyle,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 50,
  },
  nextLevelContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  nextLevelNameFrame: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  continueQuestButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 32,
  },
  continueQuestButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
  },
  checkCuteGoalsButton: {
    backgroundColor: '#faecb3',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#342846',
  },
  checkCuteGoalsButtonText: {
    ...ButtonHeadingStyle,
    color: '#342846',
    fontSize: 16,
  },
  achievementsHeading: {
    ...HeadingStyle,
    color: '#342846',
    marginTop: 32,
    marginBottom: 24,
    fontSize: 24,
    textAlign: 'center',
    width: '100%',
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    padding: 20,
    marginHorizontal: 0,
    minHeight: 200,
    justifyContent: 'space-between',
  },
  achievementCardName: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  viewAchievementButton: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  viewAchievementButtonBackground: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAchievementButtonImage: {
    borderRadius: 999,
    resizeMode: 'cover',
  },
  viewAchievementButtonText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  goalSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  goalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
  },
  goalDotActive: {
    backgroundColor: '#342846',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  noGoalsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  noGoalsText: {
    ...BodyStyle,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeading: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalGoalName: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalCompletionText: {
    ...BodyStyle,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalInfoContainer: {
    width: '100%',
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalInfoLabel: {
    ...BodyStyle,
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalInfoValue: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
  modalCloseButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 40,
    minWidth: 120,
  },
  modalCloseButtonText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // ActiveGoalsScreen styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 0,
  },
  helperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addNewGoalSection: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 16,
  },
  addNewGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  addNewGoalText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    fontWeight: '600',
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    ...HeadingStyle,
    fontSize: 28,
    fontWeight: '700',
    color: '#342846',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    ...BodyStyle,
    fontSize: 14,
    color: '#7A8A9A',
    textAlign: 'center',
    marginTop: 0,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginBottom: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BACCD7',
  },
  dotActive: {
    backgroundColor: '#342846',
    width: 28,
    borderRadius: 4,
  },
  carouselContainer: {
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  carouselContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselContentSingle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    width: width, // Full viewport width for proper paging
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24, // Padding for card spacing
    overflow: 'hidden',
  },
  card: {
    width: width - 48, // Full width minus padding
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 420,
    flexDirection: 'column',
    backgroundColor: '#7B6A95', // Fallback background color (matches gradient start)
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 8,
    zIndex: 1,
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  cardBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    opacity: 0.1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    zIndex: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...BodyStyle,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  removeBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...HeadingStyle,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    lineHeight: 26,
    position: 'relative',
    zIndex: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 16,
    position: 'relative',
    zIndex: 2,
  },
  chip: {
    flex: 1,
    flexDirection: 'column',
  },
  chipLabel: {
    ...HeadingStyle,
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
  },
  chipValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#FFFFFF',
  },
  chipDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 18,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginBottom: 20,
    position: 'relative',
    zIndex: 2,
  },
  insightEmoji: {
    fontSize: 20,
  },
  insightContent: {
    flexDirection: 'column',
    flex: 1,
  },
  insightLabel: {
    ...HeadingStyle,
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
  },
  insightValue: {
    ...BodyStyle,
    fontSize: 14,
    color: '#FFFFFF',
  },
  progressSection: {
    marginBottom: 18,
    position: 'relative',
    zIndex: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLevel: {
    ...BodyStyle,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  progressPercent: {
    ...HeadingStyle,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  nextLevel: {
    marginTop: 'auto',
    position: 'relative',
    zIndex: 2,
  },
  nextLevelLabel: {
    ...HeadingStyle,
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  nextLevelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  nextLevelNumber: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextLevelNumberText: {
    ...HeadingStyle,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextLevelName: {
    ...BodyStyle,
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    ...HeadingStyle,
    fontSize: 18,
    fontWeight: '600',
    color: '#342846',
  },
  emptySubtext: {
    ...BodyStyle,
    fontSize: 14,
    color: '#7A8A9A',
    textAlign: 'center',
  },
  continueButton: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    backgroundColor: '#342846',
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  continueButtonText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  queueSection: {
    marginTop: 20,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  queueButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  queueIcon: {
    fontSize: 20,
  },
  queueText: {
    flex: 1,
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    fontWeight: '600',
  },
  queueBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    backgroundColor: '#a592b0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueBadgeText: {
    ...HeadingStyle,
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(52, 40, 70, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    minHeight: 400,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  addGoalModalHeader: {
    marginBottom: 20,
  },
  addGoalModalCloseRow: {
    width: '100%',
    alignItems: 'flex-end',
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    ...HeadingStyle,
    fontSize: 20,
    fontWeight: '700',
    color: '#342846',
    textAlign: 'center',
  },
  modalClose: {
    padding: 4,
    position: 'absolute',
    right: 0,
  },
  modalCloseText: {
    fontSize: 28,
    color: '#7A8A9A',
    lineHeight: 28,
  },
  addGoalModalCloseButton: {
    marginBottom: 15,
  },
  modalNotice: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE8D6',
  },
  noticeIcon: {
    fontSize: 20,
  },
  noticeText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    paddingRight: 20,
  },
  modalOptions: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
  },
  optionButtonDisabled: {
    opacity: 0.6,
  },
  optionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 14,
  },
  optionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  optionIconText: {
    fontSize: 24,
  },
  optionIconImage: {
    width: 22,
    height: 22,
  },
  optionContent: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    ...HeadingStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#342846',
  },
  optionDesc: {
    ...BodyStyle,
    fontSize: 13,
    color: '#7A8A9A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 8,
  },
  queueExplainer: {
    ...BodyStyle,
    fontSize: 14,
    color: '#7A8A9A',
    marginBottom: 20,
    textAlign: 'center',
  },
  queueModalHeader: {
    width: '100%',
    justifyContent: 'center',
    marginBottom: 8,
  },
  queueModalTitleContainer: {
    width: '100%',
    alignItems: 'center',
  },
  queueModalTitle: {
    textAlign: 'center',
    width: '100%',
  },
  queueModalSubheading: {
    width: '100%',
    alignSelf: 'center',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  queueList: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  queueListContent: {
    paddingBottom: 20,
    gap: 12,
  },
  queueItem: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    width: '100%',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    marginBottom: 10,
  },
  queueItemInfo: {
    width: '100%',
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 0,
    paddingRight: 0,
    gap: 4,
  },
  queueItemName: {
    ...HeadingStyle,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: '#342846',
    flexShrink: 1,
  },
  queueItemMeta: {
    ...BodyStyle,
    fontSize: 12,
    color: '#7A8A9A',
  },
  activateButton: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#342846',
    borderRadius: 20,
  },
  activateButtonText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  queueItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  deleteQueueButton: {
    padding: 6,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  emptyQueue: {
    alignItems: 'center',
    padding: 40,
  },
  emptyQueueIcon: {
    width: 52,
    height: 52,
    marginBottom: 12,
  },
  emptyQueueText: {
    ...HeadingStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#342846',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyQueueSubtext: {
    ...BodyStyle,
    fontSize: 13,
    textAlign: 'center',
    color: '#7A8A9A',
  },
  // Goal Completed Popup
  goalCompletedPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  goalCompletedPopupContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    borderWidth: 2,
    borderColor: '#342846',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  goalCompletedIconContainer: {
    marginBottom: 20,
  },
  goalCompletedIcon: {
    fontSize: 64,
  },
  goalCompletedTitle: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 12,
  },
  goalCompletedMessage: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  goalCompletedButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  goalCompletedButtonSecondary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    minHeight: 50,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#342846',
  },
  goalCompletedButtonSecondaryText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    fontWeight: '600',
  },
  goalCompletedButtonPrimary: {
    flex: 1,
    backgroundColor: '#342846',
    borderRadius: 999,
    minHeight: 50,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCompletedButtonPrimaryText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  goalCompletedCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  goalCompletedCloseButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  confirmModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  confirmIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  confirmTitle: {
    ...HeadingStyle,
    fontSize: 20,
    fontWeight: '700',
    color: '#342846',
    marginBottom: 12,
    textAlign: 'center',
    width: '100%',
  },
  confirmText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#7A8A9A',
    marginBottom: 24,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 50,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#342846',
    borderRadius: 50,
    alignItems: 'center',
  },
  deleteButtonText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#FFFFFF',
  },
  deleteConfirmModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  queueModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  queueModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 59,
    paddingBottom: 24,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 400,
    minHeight: 675,
    maxHeight: '90%',
    borderWidth: 2,
    borderColor: '#342846',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  queueModalCloseButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 2,
  },
  // Help Modal Styles
  helpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  helpModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    minHeight: 720,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  helpModalIcon: {
    width: 62,
    height: 62,
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  helpModalTopIconWrap: {
    width: 62,
    height: 62,
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpModalTopIconImage: {
    width: 62,
    height: 62,
  },
  helpModalHeader: {
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
  helpModalCloseButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 2,
  },
  helpModalTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 20,
  },
  helpModalHeaderIcon: {
    width: 68,
    height: 68,
    marginBottom: 12,
  },
  helpModalTitle: {
    ...HeadingStyle,
    fontSize: 24,
    fontWeight: '700',
    color: '#342846',
    textAlign: 'center',
    marginBottom: 8,
  },
  helpModalSubtitle: {
    ...BodyStyle,
    fontSize: 14,
    color: '#7A8A9A',
    textAlign: 'center',
    lineHeight: 20,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 4,
  },
  helpModalScroll: {
    flex: 1,
    minHeight: 0,
  },
  helpModalScrollContent: {
    padding: 24,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 14,
  },
  helpQuickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  helpQuickCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    minHeight: 132,
  },
  helpQuickIcon: {
    fontSize: 18,
    marginBottom: 8,
  },
  helpQuickTitle: {
    ...HeadingStyle,
    fontSize: 14,
    color: '#342846',
    marginBottom: 6,
  },
  helpQuickText: {
    ...BodyStyle,
    fontSize: 12,
    color: '#5B536B',
    lineHeight: 18,
  },
  helpLimitCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE8D6',
    padding: 14,
  },
  helpLimitTitle: {
    ...HeadingStyle,
    fontSize: 14,
    color: '#342846',
    marginBottom: 6,
    textAlign: 'left',
  },
  helpLimitText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#5B536B',
    lineHeight: 20,
  },
  helpSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  helpSectionTitle: {
    ...HeadingStyle,
    fontSize: 16,
    fontWeight: '700',
    color: '#342846',
    marginBottom: 12,
    alignSelf: 'center',
    width: '100%',
    textAlign: 'center',
  },
  helpSectionText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    lineHeight: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  helpBulletPoint: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  helpBullet: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    marginRight: 8,
    lineHeight: 22,
  },
  helpBulletText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    lineHeight: 22,
    flex: 1,
  },
  helpBold: {
    fontWeight: '600',
  },
});
