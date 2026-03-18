import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

interface CompletedGoal {
  id: string;
  name: string;
  dateCompleted: string;
  category?: string;
  description?: string;
  xpEarned?: number;
}

export default function CompletedGoalsScreen() {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [completedGoals, setCompletedGoals] = useState<CompletedGoal[]>([]);
  const [totalXP, setTotalXP] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [consistency, setConsistency] = useState<number>(0);
  const [milestones, setMilestones] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    loadCompletedGoals();
    loadUserName();
  }, []);

  const loadUserName = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      if (name) {
        setUserName(name);
      }
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  const loadCompletedGoals = async () => {
    try {
      const goalsData = await AsyncStorage.getItem('completedGoals');
      if (goalsData) {
        const completedGoalsList: CompletedGoal[] = JSON.parse(goalsData);
        
        // Load userGoals to get additional data
        const userGoalsData = await AsyncStorage.getItem('userGoals');
        const userGoals = userGoalsData ? JSON.parse(userGoalsData) : [];
        
        // Enrich completed goals with data from userGoals
        const enrichedGoals = completedGoalsList.map((completedGoal) => {
          const originalGoal = userGoals.find((g: any) => g.id === completedGoal.id);
          
          // Calculate XP based on goal complexity
          let xpEarned = completedGoal.xpEarned;
          if (!xpEarned && originalGoal) {
            const baseXP = 100;
            const stepsMultiplier = originalGoal.numberOfSteps || 1;
            const hardnessMultiplier = originalGoal.hardnessLevel === 'Hard' ? 1.5 : originalGoal.hardnessLevel === 'Medium' ? 1.2 : 1;
            xpEarned = Math.round(baseXP * stepsMultiplier * hardnessMultiplier);
          } else if (!xpEarned) {
            xpEarned = 150; // Default XP
          }
          
          // Determine category based on goal name or use default
          let category = completedGoal.category;
          if (!category && originalGoal) {
            const nameLower = completedGoal.name.toLowerCase();
            if (nameLower.includes('focus') || nameLower.includes('productivity') || nameLower.includes('work')) {
              category = tr('Focus', 'Фокус');
            } else if (nameLower.includes('meditation') || nameLower.includes('mindful') || nameLower.includes('zen')) {
              category = tr('Calm', 'Спокойствие');
            } else if (nameLower.includes('health') || nameLower.includes('fitness') || nameLower.includes('detox')) {
              category = tr('Health', 'Здоровье');
            } else if (nameLower.includes('skill') || nameLower.includes('learn') || nameLower.includes('speaking')) {
              category = tr('Skill', 'Навык');
            }
          }
          
          // Generate description if not present
          let description = completedGoal.description;
          if (!description && originalGoal) {
            const steps = originalGoal.steps || [];
            if (steps.length > 0) {
              description = tr(
                `Successfully completed all ${steps.length} steps. Goal "${completedGoal.name}" achieved!`,
                `Успешно завершены все ${steps.length} шагов. Цель "${completedGoal.name}" достигнута!`
              );
            } else {
              description = tr(
                `Successfully completed goal "${completedGoal.name}". Great result!`,
                `Успешно завершена цель "${completedGoal.name}". Отличный результат!`
              );
            }
          } else if (!description) {
            description = tr(
              `Successfully completed goal "${completedGoal.name}". Great result!`,
              `Успешно завершена цель "${completedGoal.name}". Отличный результат!`
            );
          }
          
          return {
            ...completedGoal,
            xpEarned,
            category: category || tr('Focus', 'Фокус'),
            description,
          };
        });
        
        // Sort by date completed (newest first)
        enrichedGoals.sort((a, b) => 
          new Date(b.dateCompleted).getTime() - new Date(a.dateCompleted).getTime()
        );
        
        setCompletedGoals(enrichedGoals);
        
        // Calculate stats
        const total = enrichedGoals.reduce((sum, goal) => sum + (goal.xpEarned || 0), 0);
        setTotalXP(total);
        setCompletedCount(enrichedGoals.length);
        
        // Calculate consistency based on completion frequency
        if (enrichedGoals.length > 0) {
          const dates = enrichedGoals.map(g => new Date(g.dateCompleted).getTime()).sort((a, b) => b - a);
          const daysBetween = dates.length > 1 ? 
            (dates[0] - dates[dates.length - 1]) / (1000 * 60 * 60 * 24) : 0;
          const consistencyValue = daysBetween > 0 ? 
            Math.min(100, Math.round((enrichedGoals.length / Math.max(daysBetween, 1)) * 100)) : 100;
          setConsistency(consistencyValue);
        } else {
          setConsistency(0);
        }
        
        // Calculate milestones (goals with significant achievements - XP >= 200)
        const milestoneCount = enrichedGoals.filter(g => (g.xpEarned || 0) >= 200).length;
        setMilestones(milestoneCount);
      }
    } catch (error) {
      console.error('Error loading completed goals:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRussian ? 'ru-RU' : 'en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category?: string) => {
    const categoryColors: { [key: string]: { bg: string; text: string } } = {
      [tr('Focus', 'Фокус')]: { bg: 'rgba(91, 58, 143, 0.1)', text: '#5b3a8f' },
      [tr('Calm', 'Спокойствие')]: { bg: 'rgba(107, 142, 127, 0.1)', text: '#6b8e7f' },
      [tr('Health', 'Здоровье')]: { bg: 'rgba(139, 107, 74, 0.1)', text: '#8b6b4a' },
      [tr('Skill', 'Навык')]: { bg: 'rgba(125, 91, 166, 0.1)', text: '#7d5ba6' },
    };
    return categoryColors[category || ''] || { bg: 'rgba(186, 204, 215, 0.1)', text: '#7a8a9a' };
  };

  const getCurrentDate = (): string => {
    const today = new Date();
    return today.toLocaleDateString(isRussian ? 'ru-RU' : 'en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <PaperTextureBackground>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 48) + 30 }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <View style={styles.backButtonIcon}>
              <Text style={styles.backButtonText}>←</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerSubtitle}>{t('completedGoals.growthHistory')}</Text>
            <Text style={styles.headerTitle}>{t('completedGoals.achievedGoals')}</Text>
          </View>
          <View style={styles.profilePicture}>
            <Text style={styles.profileInitial}>
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Total Impact Score Card */}
          <View style={styles.impactCard}>
            <View style={styles.impactContent}>
              <Text style={styles.impactLabel}>{t('completedGoals.totalImpactScore')}</Text>
              <View style={styles.impactXPContainer}>
                <Text style={styles.impactXP}>{totalXP.toLocaleString()}</Text>
                <Text style={styles.impactXPUnit}>{t('completedGoals.xp')}</Text>
              </View>
              <View style={styles.impactStats}>
                <View style={styles.impactStat}>
                  <Text style={styles.impactStatLabel}>{t('completedGoals.completed')}</Text>
                  <Text style={styles.impactStatValue}>{completedCount}</Text>
                </View>
                <View style={styles.impactStat}>
                  <Text style={styles.impactStatLabel}>{t('completedGoals.consistency')}</Text>
                  <Text style={styles.impactStatValue}>{consistency}%</Text>
                </View>
                <View style={styles.impactStat}>
                  <Text style={styles.impactStatLabel}>{t('completedGoals.milestones')}</Text>
                  <Text style={styles.impactStatValue}>{milestones}</Text>
                </View>
              </View>
            </View>
            <View style={styles.impactIcon}>
              <Text style={styles.starIcon}>⭐</Text>
            </View>
          </View>

          {/* Recent Successes Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, styles.sectionTitleCentered]}>{t('completedGoals.recentSuccesses')}</Text>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterIcon}>↓</Text>
                <Text style={styles.filterText}>{tr('Newest first', 'Сначала новые')}</Text>
              </TouchableOpacity>
            </View>
            {completedGoals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{t('completedGoals.noCompletedGoals')}</Text>
              </View>
            ) : (
              <View style={styles.goalsList}>
                {completedGoals.map((goal) => {
                  const categoryColors = getCategoryColor(goal.category);
                  return (
                    <View key={goal.id} style={styles.goalCard}>
                      <View style={styles.goalCardHeader}>
                        <View style={styles.goalCardHeaderLeft}>
                          <View style={styles.goalIconContainer}>
                            <Text style={styles.goalCheckmark}>✓</Text>
                          </View>
                          <View style={styles.goalCardInfo}>
                            <Text style={styles.goalCardName}>{goal.name.toUpperCase()}</Text>
                            <Text style={styles.goalCardDate}>{tr('Completed', 'Завершено')} {formatDate(goal.dateCompleted)}</Text>
                          </View>
                        </View>
                        {goal.category && (
                          <View style={[styles.goalCategoryTag, { backgroundColor: categoryColors.bg }]}>
                            <Text style={[styles.goalCategoryText, { color: categoryColors.text }]}>
                              {goal.category}
                            </Text>
                          </View>
                        )}
                      </View>
                      {goal.description && (
                        <View style={styles.goalDescription}>
                          <Text style={styles.goalDescriptionText}>"{goal.description}"</Text>
                        </View>
                      )}
                      <View style={styles.goalCardFooter}>
                        <View style={styles.goalXPContainer}>
                          <View style={styles.goalXPIcon}>
                            <Text style={styles.goalXPIconText}>⭐</Text>
                          </View>
                          <Text style={styles.goalXPText}>+{goal.xpEarned || 0} {tr('xp', 'опыта')}</Text>
                        </View>
                        <TouchableOpacity style={styles.detailsButton}>
                          <Text style={styles.detailsButtonText}>{tr('Details', 'Подробнее')}</Text>
                          <Text style={styles.detailsArrow}>→</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Ready for Next Goal Card */}
          {completedGoals.length > 0 && (
            <View style={styles.nextGoalCard}>
              <Text style={styles.nextGoalIcon}>👑</Text>
              <Text style={styles.nextGoalTitle}>{tr('Ready for the next goal?', 'Готов к следующей цели?')}</Text>
              <Text style={styles.nextGoalSubtext}>
                {tr('You have already completed your main current goals. Time to level up.', 'Ты уже закрыл основные текущие цели. Время выйти на новый уровень.')}
              </Text>
              <TouchableOpacity 
                style={styles.setNewGoalButton}
                onPress={() => router.push('/new-goal')}
              >
                <Text style={styles.setNewGoalIcon}>+</Text>
                <Text style={styles.setNewGoalText}>{tr('Set a new goal', 'Поставить новую цель')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(186, 204, 215, 0.2)',
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
  },
  backButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(186, 204, 215, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#342846',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginLeft: 12,
  },
  headerSubtitle: {
    ...BodyStyle,
    color: '#7a8a9a',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    maxWidth: Platform.isPad ? 350 : undefined,
    alignSelf: 'center',
  },
  headerTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#342846',
    backgroundColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  impactCard: {
    backgroundColor: '#342846',
    borderRadius: 16,
    padding: 24,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  impactContent: {
    flex: 1,
  },
  impactLabel: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  impactXPContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  impactXP: {
    ...HeadingStyle,
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    lineHeight: 48,
  },
  impactXPUnit: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginLeft: 8,
    marginBottom: 8,
  },
  impactStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 16,
    gap: 16,
  },
  impactStat: {
    flex: 1,
  },
  impactStatLabel: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  impactStatValue: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  impactIcon: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    fontSize: 64,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  sectionTitleCentered: {
    textAlign: 'center',
    flex: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(186, 204, 215, 0.2)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 20, // Minimum 20px padding (was 12)
    gap: 6,
  },
  filterIcon: {
    fontSize: 14,
    color: '#342846',
  },
  filterText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    fontWeight: '500',
  },
  goalsList: {
    gap: 16,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(186, 204, 215, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  goalCardHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  goalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 197, 232, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  goalCheckmark: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 24,
    fontWeight: 'bold',
  },
  goalCardInfo: {
    flex: 1,
  },
  goalCardName: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  goalCardDate: {
    ...BodyStyle,
    color: '#7a8a9a',
    fontSize: 12,
  },
  goalCategoryTag: {
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 20, // Minimum 20px padding (was 8)
    height: 23,
    justifyContent: 'center',
  },
  goalCategoryText: {
    ...BodyStyle,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  goalDescription: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(52, 40, 70, 0.1)',
    paddingLeft: 20, // Minimum 20px padding (was 15)
    marginBottom: 16,
    minHeight: 54,
    justifyContent: 'center',
  },
  goalDescriptionText: {
    ...BodyStyle,
    color: '#7a8a9a',
    fontSize: 14,
    lineHeight: 22.75,
    fontStyle: 'italic',
  },
  goalCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(186, 204, 215, 0.2)',
    paddingTop: 8,
  },
  goalXPContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalXPIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(186, 204, 215, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  goalXPIconText: {
    fontSize: 12,
  },
  goalXPText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsArrow: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    fontWeight: 'bold',
  },
  nextGoalCard: {
    backgroundColor: 'rgba(186, 204, 215, 0.1)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(186, 204, 215, 0.6)',
    padding: 24,
    alignItems: 'center',
    marginTop: 40,
  },
  nextGoalIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  nextGoalTitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  nextGoalSubtext: {
    ...BodyStyle,
    color: '#7a8a9a',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  setNewGoalButton: {
    backgroundColor: '#342846',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    width: '100%',
    justifyContent: 'center',
  },
  setNewGoalIcon: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  setNewGoalText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    borderWidth: 1,
    borderColor: 'rgba(186, 204, 215, 0.4)',
    alignItems: 'center',
  },
  emptyText: {
    ...BodyStyle,
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

