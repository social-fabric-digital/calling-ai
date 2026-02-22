import { BodyStyle, ButtonHeadingStyle, getHeadingFontFamily } from '@/constants/theme';
import { generateClarityMapInsight } from '@/utils/clarityMapApi';
import { generateGoalFromInsight } from '@/utils/goalGenerator';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { checkSubscriptionStatus } from '@/utils/superwall';
import { isPremium as hasSubscriptionOrTrialAccess } from '@/utils/subscription';
import { getRandomReflectionPrompt, getRandomEncouragement } from '@/utils/contentBanks';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

// ============================================
// Types
// ============================================
export interface Thought {
  id: string;
  text: string;
  category: 'important' | 'unclear' | 'not_important' | null;
  timestamp?: Date;
  x?: number;
  y?: number;
  scale?: Animated.Value;
  opacity?: Animated.Value;
  translateX?: Animated.Value;
  translateY?: Animated.Value;
  originalColor?: string;
}

export interface ClarityMapSession {
  id: string;
  timestamp: Date;
  thoughts: Thought[];
  aiSummary: {
    mainFocus: string;
    secondaryFocus?: string;
    canIgnore: string;
  };
}

interface ClarityInsightProps {
  thoughts: Thought[];
  // AI-generated insights
  heartInsight?: string;
  exploreInsight?: string;
  releaseInsight?: string;
  perspectiveShift?: string;
  userIsPremium?: boolean;
  showOpenAiReportButton?: boolean;
  hasSafetyAlert?: boolean;
  isGeneratingAiReport?: boolean;
  // Actions
  onSaveInsight?: () => void;
  onTurnIntoPath?: () => void;
  onOpenAiReport?: () => void;
  onBack?: () => void;
  onClose?: () => void;
  isCreatingPath?: boolean;
}

interface ClarityMapProps {
  onClose: () => void;
}

type ClarityMapStage = 'dump' | 'categorize' | 'insight';

// ============================================
// Organic Blob SVG Component
// ============================================
interface BlobProps {
  size: number;
  style?: any;
}

function Blob1({ size, style }: BlobProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" style={style}>
      <Path
        d="M47.7,-57.2C59.3,-47.3,64.8,-30.4,67.1,-13.3C69.4,3.8,68.5,21.1,60.4,34.6C52.3,48.1,37,57.8,20.4,63.4C3.8,69,-14.1,70.5,-29.8,65.1C-45.5,59.7,-59,47.4,-66.3,32.1C-73.6,16.8,-74.7,-1.5,-69.5,-17.5C-64.3,-33.5,-52.8,-47.2,-39.2,-56.7C-25.6,-66.2,-9.9,-71.5,4.3,-76.5C18.5,-81.5,36.1,-67.1,47.7,-57.2Z"
        fill="#FFFFFF"
        transform="translate(100 100)"
      />
    </Svg>
  );
}

function Blob2({ size, style }: BlobProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" style={style}>
      <Path
        d="M44.3,-51.5C57.5,-42.8,68.1,-28.6,71.5,-12.6C74.9,3.4,71.1,21.2,61.7,35.1C52.3,49,37.3,59,20.9,64.5C4.5,70,-13.3,71,-28.9,65.1C-44.5,59.2,-57.9,46.4,-65.2,30.8C-72.5,15.2,-73.7,-3.2,-68.4,-19.4C-63.1,-35.6,-51.3,-49.6,-37.5,-58.1C-23.7,-66.6,-7.9,-69.6,5.4,-75.8C18.7,-82,31.1,-60.2,44.3,-51.5Z"
        fill="#FFFFFF"
        transform="translate(100 100)"
      />
    </Svg>
  );
}

function Blob3({ size, style }: BlobProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" style={style}>
      <Path
        d="M39.9,-47.1C52.5,-38.5,64,-26.4,68.2,-11.8C72.4,2.8,69.3,19.9,60.5,33.2C51.7,46.5,37.2,56,21.4,61.1C5.6,66.2,-11.5,66.9,-26.8,61.5C-42.1,56.1,-55.6,44.6,-63.1,29.9C-70.6,15.2,-72.1,-2.7,-67.1,-18.4C-62.1,-34.1,-50.6,-47.6,-37.2,-55.9C-23.8,-64.2,-8.5,-67.3,3.7,-71.7C15.9,-76.1,27.3,-55.7,39.9,-47.1Z"
        fill="#FFFFFF"
        transform="translate(100 100)"
      />
    </Svg>
  );
}

// ============================================
// Thought Bubble Component
// ============================================
interface ThoughtBubbleProps {
  thought: Thought;
  index: number;
  isVisible: boolean;
  size?: 'small' | 'medium';
}

function ThoughtBubble({ thought, index, isVisible, size = 'small' }: ThoughtBubbleProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const bubbleSize = size === 'small' ? 80 : 100;
  const BlobComponent = [Blob1, Blob2, Blob3][index % 3];

  useEffect(() => {
    if (isVisible) {
      const delay = 100 + index * 80;

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();

        // Gentle floating animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(floatAnim, {
              toValue: 1,
              duration: 2000 + index * 300,
              useNativeDriver: true,
            }),
            Animated.timing(floatAnim, {
              toValue: 0,
              duration: 2000 + index * 300,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, delay);
    }
  }, [isVisible]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  return (
    <Animated.View
      style={[
        styles.thoughtBubble,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY },
          ],
        },
      ]}
    >
      <View style={styles.bubbleContainer}>
        <BlobComponent size={bubbleSize} style={styles.blobSvg} />
        <Text style={styles.bubbleText} numberOfLines={3}>
          {thought.text}
        </Text>
      </View>
    </Animated.View>
  );
}

// ============================================
// Insight Section Component
// ============================================
interface InsightSectionProps {
  emoji: string;
  title: string;
  content: string;
  thoughts: Thought[];
  index: number;
  isVisible: boolean;
  accentColor?: string;
}

function InsightSection({ 
  emoji, 
  title, 
  content, 
  thoughts, 
  index, 
  isVisible,
  accentColor = '#342846'
}: InsightSectionProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (isVisible) {
      const delay = 400 + index * 200;

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 50,
            friction: 9,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);
    }
  }, [isVisible]);

  return (
    <Animated.View
      style={[
        styles.insightSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Section Header */}
      <View style={styles.insightHeader}>
        <Text style={styles.insightEmoji}>{emoji}</Text>
        <Text style={styles.insightTitle}>{title}</Text>
      </View>

      {/* Related thoughts bubbles */}
      {thoughts.length > 0 && (
        <View style={styles.relatedThoughts}>
          {thoughts.slice(0, 3).map((thought, i) => (
            <View key={thought.id} style={styles.miniThought}>
              <Text style={styles.miniThoughtText} numberOfLines={1}>
                {thought.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* AI Insight */}
      <View style={styles.insightCard}>
        <View style={[styles.insightAccent, { backgroundColor: accentColor }]} />
        <Text style={styles.insightContent}>{content}</Text>
      </View>
    </Animated.View>
  );
}

// ============================================
// Perspective Shift Component
// ============================================
interface PerspectiveShiftProps {
  content: string;
  isVisible: boolean;
}

function PerspectiveShift({ content, isVisible }: PerspectiveShiftProps) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 40,
            friction: 9,
            useNativeDriver: true,
          }),
        ]).start();

        // Pulsing glow
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.5,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, 1000);
    }
  }, [isVisible]);

  return (
    <Animated.View
      style={[
        styles.perspectiveWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={['#342846', '#4a3a5c', '#342846']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.perspectiveCard}
      >
        {/* Glow effect */}
        <Animated.View style={[styles.perspectiveGlow, { opacity: glowAnim }]} />

        {/* Icon */}
        <View style={styles.perspectiveIconContainer}>
          <Text style={styles.perspectiveIcon}>💡</Text>
        </View>

        {/* Label */}
        <View style={styles.perspectiveDivider}>
          <View style={styles.perspectiveLine} />
          <Text style={styles.perspectiveLabel}>{t('clarityMap.anotherPerspective')}</Text>
          <View style={styles.perspectiveLine} />
        </View>

        {/* Content */}
        <Text style={styles.perspectiveContent}>{content}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ============================================
// Clarity Insight Screen Component (used internally)
// ============================================
function ClarityInsightScreen({
  thoughts,
  heartInsight,
  exploreInsight,
  releaseInsight,
  perspectiveShift,
  userIsPremium = true,
  showOpenAiReportButton = false,
  hasSafetyAlert = false,
  isGeneratingAiReport = false,
  onSaveInsight,
  onTurnIntoPath,
  onOpenAiReport,
  onBack,
  onClose,
  isCreatingPath = false,
}: ClarityInsightProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const buttonsFade = useRef(new Animated.Value(0)).current;

  // Categorize thoughts - map from API categories to display categories
  const urgentThoughts = thoughts.filter(t => t.category === 'important');
  const exploreThoughts = thoughts.filter(t => t.category === 'unclear');
  const releaseThoughts = thoughts.filter(t => t.category === 'not_important');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(true);
    });

    // Buttons fade in last
    setTimeout(() => {
      Animated.timing(buttonsFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 1400);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Header */}
        <View style={styles.navHeader}>
          {onBack && (
            <TouchableOpacity style={styles.navButton} onPress={onBack}>
              <MaterialIcons name="arrow-back" size={24} color="#342846" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {onClose && (
            <TouchableOpacity style={styles.navButtonClose} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#342846" />
            </TouchableOpacity>
          )}
        </View>

        {/* Main Title */}
        <Animated.View
          style={[
            styles.titleContainer,
            styles.insightTitleContainer,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <Text style={styles.mainTitle}>{t('clarityMap.yourClarityInsight')}</Text>
          <Text style={styles.mainSubtitle}>
            {t('clarityMap.whatYourThoughtsTellYou')}
          </Text>
        </Animated.View>

        {/* Visual Summary - Floating Bubbles */}
        <Animated.View
          style={[
            styles.bubblesContainer,
            {
              opacity: headerFade,
            },
          ]}
        >
          <View style={styles.bubblesRow}>
            {thoughts.slice(0, 4).map((thought, index) => (
              <ThoughtBubble
                key={thought.id}
                thought={thought}
                index={index}
                isVisible={isVisible}
                size="small"
              />
            ))}
          </View>
        </Animated.View>

        <View style={styles.insightContentStack}>
          {/* Insight Sections */}
          {urgentThoughts.length > 0 && heartInsight && (
            <InsightSection
              emoji="🤎"
              title={t('clarityMap.whatYourHeartSays')}
              content={heartInsight}
              thoughts={urgentThoughts}
              index={0}
              isVisible={isVisible}
              accentColor="#8B4513"
            />
          )}

          {exploreThoughts.length > 0 && exploreInsight && (
            <InsightSection
              emoji="🔍"
              title={t('clarityMap.worthExploring')}
              content={exploreInsight}
              thoughts={exploreThoughts}
              index={1}
              isVisible={isVisible}
              accentColor="#342846"
            />
          )}

          {releaseThoughts.length > 0 && releaseInsight && (
            <InsightSection
              emoji="🕊️"
              title={t('clarityMap.canLetGo')}
              content={releaseInsight}
              thoughts={releaseThoughts}
              index={2}
              isVisible={isVisible}
              accentColor="#6B8E6B"
            />
          )}

        {/* Perspective Shift - Special Card */}
        {perspectiveShift && (
          <PerspectiveShift
            content={perspectiveShift}
            isVisible={isVisible}
          />
        )}

        {showOpenAiReportButton && !hasSafetyAlert && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={onOpenAiReport}
            activeOpacity={0.9}
            disabled={isGeneratingAiReport}
          >
            <Text style={styles.upgradeButtonText}>
              {isGeneratingAiReport ? t('clarityMap.generating') : t('clarityMap.openAIReport')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        {userIsPremium && !hasSafetyAlert && (
          <Animated.View style={[styles.actionsContainer, { opacity: buttonsFade }]}>
            <TouchableOpacity
              style={[styles.primaryButton, isCreatingPath && styles.primaryButtonDisabled]}
              onPress={onTurnIntoPath}
              activeOpacity={0.9}
              disabled={!onTurnIntoPath || isCreatingPath}
            >
              {isCreatingPath ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>{t('clarityMap.creatingYourPath')}</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>{t('clarityMap.turnIntoPath')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onSaveInsight}
              activeOpacity={0.9}
            >
              <Text style={styles.secondaryButtonText}>{t('clarityMap.saveInsight')}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 90,
    paddingBottom: 40,
  },

  // Navigation
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 70,
    marginBottom: 16,
  },
  categorizeNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 70,
    marginBottom: 16,
    paddingHorizontal: 25,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bubbles Summary
  bubblesContainer: {
    alignItems: 'center',
    marginBottom: 24,
    minHeight: 100,
  },
  insightContentStack: {
    marginTop: -30,
  },
  bubblesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  thoughtBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobSvg: {
    position: 'absolute',
  },
  bubbleText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 10,
    color: '#342846',
    textAlign: 'center',
    width: 60,
    paddingHorizontal: 4,
  },

  // Title
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: -50,
  },
  insightTitleContainer: {
    marginTop: 0,
  },
  categorizeTitleContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: -80,
  },
  mainTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 26,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 12,
  },
  mainSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#342846',
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Insight Section
  insightSection: {
    marginBottom: 28,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  insightTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 16,
    color: '#342846',
    letterSpacing: 0.5,
  },
  relatedThoughts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  miniThought: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.1)',
  },
  miniThoughtText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 12,
    color: '#342846',
    maxWidth: 120,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  insightAccent: {
    width: 4,
    borderRadius: 2,
    marginRight: 16,
  },
  insightContent: {
    flex: 1,
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#342846',
    lineHeight: 24,
  },

  // Perspective Shift
  perspectiveWrapper: {
    marginTop: 8,
    marginBottom: 32,
    borderRadius: 20,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  perspectiveCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  perspectiveGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: '#f4b942',
    opacity: 0.1,
    borderRadius: 40,
  },
  perspectiveIconContainer: {
    marginBottom: 16,
  },
  perspectiveIcon: {
    fontSize: 36,
  },
  perspectiveDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  perspectiveLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  perspectiveLabel: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 16,
    letterSpacing: 0.5,
  },
  perspectiveContent: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.95,
  },
  perspectiveDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  perspectiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  // Action Buttons
  actionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#342846',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#342846',
  },
  secondaryButtonText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: '#342846',
    letterSpacing: 0.5,
  },
  upgradeButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginTop: 12,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  upgradeButtonText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: '#342846',
    letterSpacing: 0.5,
  },

  // Brain Dump Stage Styles
  thoughtsList: {
    marginBottom: 24,
    gap: 12,
  },
  thoughtItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.1)',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  thoughtItemText: {
    flex: 1,
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#342846',
    lineHeight: 22,
  },
  removeButton: {
    marginLeft: 12,
    padding: 4,
  },
  inputContainer: {
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#342846',
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.1)',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#342846',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#342846',
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    fontWeight: '600',
  },

  // Categorize Stage Styles
  categoryLegend: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(191, 172, 202, 0.16)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.16)',
  },
  categoryLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryLegendText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 12,
    color: '#342846',
  },
  categorizeThoughtItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.14)',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  categorizeThoughtText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#342846',
    lineHeight: 22,
    marginBottom: 12,
  },
  categoryButtons: {
    gap: 8,
    width: '100%',
  },
  categoryButtonsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryButtonsBottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  categoryButton: {
    width: '48%',
    minWidth: 132,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  categoryButtonSelected: {
    borderWidth: 2,
  },
  categoryButtonBottomCentered: {
    width: '52%',
  },
  categoryButtonEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryButtonText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: '#342846',
    fontWeight: '500',
    flexShrink: 0,
  },
  categoryButtonTextSelected: {
    fontWeight: '600',
  },
  categorizeSummary: {
    backgroundColor: 'rgba(186, 204, 215, 0.18)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.16)',
  },
  categorizeSummaryText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  categorizeSummaryCounts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  categorizeSummaryCount: {
    alignItems: 'center',
  },
  categorizeSummaryCountNumber: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 24,
    color: '#342846',
    marginBottom: 4,
  },
  categorizeSummaryCountLabel: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Path Created Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    paddingTop: 40,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontFamily: getHeadingFontFamily(),
    fontSize: 24,
    color: '#342846',
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  modalText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtons: {
    gap: 12,
  },
  modalPrimaryButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    width: '100%',
  },
  modalPrimaryButtonText: {
    ...ButtonHeadingStyle,
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

// ============================================
// Helper Functions
// ============================================

/**
 * Parse insight text into structured insights
 * The API returns a single text with sections, we need to extract:
 * - Heart insight: "What Deserves Your Energy" section
 * - Explore insight: "What Needs Space" section  
 * - Release insight: "What to Let Go" section
 * - Perspective shift: "Forward Momentum" section
 */
function parseInsightText(
  insightText: string,
  fallbackInsight: string,
  fallbackPerspectiveShift: string
): {
  heartInsight: string;
  exploreInsight: string;
  releaseInsight: string;
  perspectiveShift: string;
} {
  const sections: { [key: string]: string } = {
    heartInsight: '',
    exploreInsight: '',
    releaseInsight: '',
    perspectiveShift: '',
  };

  // Split by section headings
  const lines = insightText.split('\n');
  let currentSection = '';
  let currentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for section headings
    if (line.includes('What Deserves Your Energy')) {
      if (currentSection) {
        sections[currentSection] = currentContent.join(' ').trim();
      }
      currentSection = 'heartInsight';
      currentContent = [];
    } else if (line.includes('What Needs Space')) {
      if (currentSection) {
        sections[currentSection] = currentContent.join(' ').trim();
      }
      currentSection = 'exploreInsight';
      currentContent = [];
    } else if (line.includes('What to Let Go')) {
      if (currentSection) {
        sections[currentSection] = currentContent.join(' ').trim();
      }
      currentSection = 'releaseInsight';
      currentContent = [];
    } else if (line.includes('Forward Momentum')) {
      if (currentSection) {
        sections[currentSection] = currentContent.join(' ').trim();
      }
      currentSection = 'perspectiveShift';
      currentContent = [];
    } else if (currentSection && line && !line.match(/^(Empathetic Acknowledgment|What Deserves Your Energy|What Needs Space|What to Let Go|Forward Momentum)/i)) {
      // Add content to current section (skip empty lines and other headings)
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    sections[currentSection] = currentContent.join(' ').trim();
  }

  // Fallback: if parsing failed, use the full text for heart insight
  if (!sections.heartInsight && !sections.exploreInsight && !sections.releaseInsight) {
    sections.heartInsight = insightText;
  }

  return {
    heartInsight: sections.heartInsight || fallbackInsight,
    exploreInsight: sections.exploreInsight || fallbackInsight,
    releaseInsight: sections.releaseInsight || fallbackInsight,
    perspectiveShift: sections.perspectiveShift || fallbackPerspectiveShift,
  };
}

// ============================================
// Brain Dump Stage Component
// ============================================
function BrainDumpStage({
  onComplete,
  onClose,
}: {
  onComplete: (thoughts: Thought[]) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const inputRef = useRef<TextInput>(null);

  const getThoughtWord = (count: number): string => {
    if (i18n.language?.toLowerCase().startsWith('ru')) {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) return t('clarityMap.thought');
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t('clarityMap.thoughts');
      return t('clarityMap.thoughtsGenitive');
    }
    return count === 1 ? t('clarityMap.thought') : t('clarityMap.thoughts');
  };

  const handleAddThought = () => {
    const text = inputText.trim();
    if (text) {
      const newThought: Thought = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: text,
        category: null,
        timestamp: new Date(),
      };
      setThoughts([...thoughts, newThought]);
      setInputText('');
      inputRef.current?.focus();
    }
  };

  const handleRemoveThought = (id: string) => {
    setThoughts(thoughts.filter(t => t.id !== id));
  };

  const handleContinue = () => {
    const pendingText = inputText.trim();
    const thoughtsToContinue =
      pendingText.length > 0
        ? [
            ...thoughts,
            {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              text: pendingText,
              category: null,
              timestamp: new Date(),
            },
          ]
        : thoughts;

    if (thoughtsToContinue.length === 0) {
      Alert.alert(t('clarityMap.addThoughts'), t('clarityMap.pleaseAddAtLeastOneThought'));
      return;
    }
    // Pass uncategorized thoughts (including pending input) to categorization stage.
    setInputText('');
    onComplete(thoughtsToContinue);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.navHeader}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={[styles.navButtonClose, { transform: [{ translateX: -25 }] }]} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#342846" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.mainTitle}>{t('clarityMap.clearYourMind')}</Text>
            <Text style={styles.mainSubtitle}>
              {t('clarityMap.writeEverything')}
            </Text>
          </View>

          {/* Thoughts List */}
          {thoughts.length > 0 && (
            <View style={styles.thoughtsList}>
              {thoughts.map((thought) => (
                <View key={thought.id} style={styles.thoughtItem}>
                  <Text style={styles.thoughtItemText}>{thought.text}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveThought(thought.id)}
                    style={styles.removeButton}
                  >
                    <MaterialIcons name="close" size={18} color="#342846" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder={t('clarityMap.whatsOnYourMind')}
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
              onSubmitEditing={handleAddThought}
              returnKeyType="done"
            />
            {inputText.trim().length > 0 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddThought}
              >
                <Text style={styles.addButtonText}>{t('clarityMap.add')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Continue Button */}
          {thoughts.length > 0 && (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>
                {t('clarityMap.continueWithThoughts', { count: thoughts.length, word: getThoughtWord(thoughts.length) })}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================
// Categorize Stage Component
// ============================================
function CategorizeStage({
  thoughts,
  onComplete,
  onBack,
  onClose,
}: {
  thoughts: Thought[];
  onComplete: (thoughts: Thought[]) => void;
  onBack?: () => void;
  onClose?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [categorizedThoughts, setCategorizedThoughts] = useState<Thought[]>(
    thoughts.map(t => ({ ...t, category: t.category || null }))
  );
  const categoryColorMap = {
    important: '#342846',
    unclear: '#8A78A3',
    not_important: '#A592B0',
  } as const;
  const categoryBackgroundMap = {
    important: 'rgba(52, 40, 70, 0.14)',
    unclear: 'rgba(138, 120, 163, 0.16)',
    not_important: 'rgba(165, 146, 176, 0.16)',
  } as const;

  const getThoughtWord = (count: number): string => {
    if (i18n.language?.toLowerCase().startsWith('ru')) {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) return t('clarityMap.thought');
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t('clarityMap.thoughts');
      return t('clarityMap.thoughtsGenitive');
    }
    return count === 1 ? t('clarityMap.thought') : t('clarityMap.thoughts');
  };

  const handleCategorySelect = (thoughtId: string, category: 'important' | 'unclear' | 'not_important') => {
    setCategorizedThoughts(prev =>
      prev.map(thought =>
        thought.id === thoughtId ? { ...thought, category } : thought
      )
    );
  };

  const handleContinue = () => {
    const uncategorized = categorizedThoughts.filter(t => !t.category);
    if (uncategorized.length > 0) {
      Alert.alert(
        t('clarityMap.distributeAllThoughts'),
        t('clarityMap.pleaseDistributeRemaining', { count: uncategorized.length }),
        [{ text: t('clarityMap.ok') }]
      );
      return;
    }
    onComplete(categorizedThoughts);
  };

  const getCategoryColor = (category: 'important' | 'unclear' | 'not_important' | null) => {
    switch (category) {
      case 'important':
        return categoryColorMap.important;
      case 'unclear':
        return categoryColorMap.unclear;
      case 'not_important':
        return categoryColorMap.not_important;
      default:
        return 'rgba(52, 40, 70, 0.2)';
    }
  };

  const getCategoryBackgroundColor = (category: 'important' | 'unclear' | 'not_important') => {
    return categoryBackgroundMap[category];
  };

  const getCategoryEmoji = (category: 'important' | 'unclear' | 'not_important' | null) => {
    switch (category) {
      case 'important':
        return '🤎';
      case 'unclear':
        return '🔍';
      case 'not_important':
        return '🕊️';
      default:
        return '○';
    }
  };

  const getCategoryLabel = (category: 'important' | 'unclear' | 'not_important' | null) => {
    switch (category) {
      case 'important':
        return t('clarityMap.important');
      case 'unclear':
        return t('clarityMap.worthExploringShort');
      case 'not_important':
        return t('clarityMap.canLetGoShort');
      default:
        return t('clarityMap.tapToDistribute');
    }
  };

  const uncategorizedCount = categorizedThoughts.filter(t => !t.category).length;
  const importantCount = categorizedThoughts.filter(t => t.category === 'important').length;
  const unclearCount = categorizedThoughts.filter(t => t.category === 'unclear').length;
  const releaseCount = categorizedThoughts.filter(t => t.category === 'not_important').length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.categorizeNavHeader}>
          {onBack && (
            <TouchableOpacity style={styles.navButton} onPress={onBack}>
              <MaterialIcons name="arrow-back" size={24} color="#342846" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {onClose && (
            <TouchableOpacity style={styles.navButtonClose} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#342846" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.categorizeTitleContainer}>
            <Text style={styles.mainTitle}>{t('clarityMap.distributeYourThoughts')}</Text>
            <Text style={styles.mainSubtitle}>
              {t('clarityMap.tapCategoryForThought')}
            </Text>
          </View>

          {/* Category Legend */}
          <View style={styles.categoryLegend}>
            <View style={styles.categoryLegendItem}>
              <View style={[styles.categoryLegendDot, { backgroundColor: getCategoryColor('important') }]} />
              <Text style={styles.categoryLegendText}>{t('clarityMap.important')}</Text>
            </View>
            <View style={styles.categoryLegendItem}>
              <View style={[styles.categoryLegendDot, { backgroundColor: getCategoryColor('unclear') }]} />
              <Text style={styles.categoryLegendText}>{t('clarityMap.worthExploringShort')}</Text>
            </View>
            <View style={styles.categoryLegendItem}>
              <View style={[styles.categoryLegendDot, { backgroundColor: getCategoryColor('not_important') }]} />
              <Text style={styles.categoryLegendText}>{t('clarityMap.canLetGoShort')}</Text>
            </View>
          </View>

          {/* Thoughts List */}
          <View style={styles.thoughtsList}>
            {categorizedThoughts.map((thought) => (
              <View key={thought.id} style={styles.categorizeThoughtItem}>
                <Text style={styles.categorizeThoughtText}>{thought.text}</Text>
                
                {/* Category Buttons */}
                <View style={styles.categoryButtons}>
                  <View style={styles.categoryButtonsTopRow}>
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      thought.category === 'important' && styles.categoryButtonSelected,
                      { borderColor: getCategoryColor('important') },
                      thought.category === 'important' && { backgroundColor: getCategoryBackgroundColor('important') }
                    ]}
                    onPress={() => handleCategorySelect(thought.id, 'important')}
                  >
                    <Text style={styles.categoryButtonEmoji}>🤎</Text>
                    <Text style={[
                      styles.categoryButtonText,
                      thought.category === 'important' && styles.categoryButtonTextSelected
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                    android_hyphenationFrequency="none">
                      {t('clarityMap.important')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      thought.category === 'unclear' && styles.categoryButtonSelected,
                      { borderColor: getCategoryColor('unclear') },
                      thought.category === 'unclear' && { backgroundColor: getCategoryBackgroundColor('unclear') }
                    ]}
                    onPress={() => handleCategorySelect(thought.id, 'unclear')}
                  >
                    <Text style={styles.categoryButtonEmoji}>🔍</Text>
                    <Text style={[
                      styles.categoryButtonText,
                      thought.category === 'unclear' && styles.categoryButtonTextSelected
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                    android_hyphenationFrequency="none">
                      {t('clarityMap.explore')}
                    </Text>
                  </TouchableOpacity>
                  </View>

                  <View style={styles.categoryButtonsBottomRow}>
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      styles.categoryButtonBottomCentered,
                      thought.category === 'not_important' && styles.categoryButtonSelected,
                      { borderColor: getCategoryColor('not_important') },
                      thought.category === 'not_important' && { backgroundColor: getCategoryBackgroundColor('not_important') }
                    ]}
                    onPress={() => handleCategorySelect(thought.id, 'not_important')}
                  >
                    <Text style={styles.categoryButtonEmoji}>🕊️</Text>
                    <Text style={[
                      styles.categoryButtonText,
                      thought.category === 'not_important' && styles.categoryButtonTextSelected
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                    android_hyphenationFrequency="none">
                      {t('clarityMap.letGo')}
                    </Text>
                  </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Summary */}
          <View style={styles.categorizeSummary}>
            <Text style={styles.categorizeSummaryText}>
              {uncategorizedCount > 0 
                ? t('clarityMap.remainingToDistribute', { count: uncategorizedCount, word: getThoughtWord(uncategorizedCount) })
                : t('clarityMap.allThoughtsDistributed')
              }
            </Text>
            <View style={styles.categorizeSummaryCounts}>
              <View style={styles.categorizeSummaryCount}>
                <Text style={styles.categorizeSummaryCountNumber}>{importantCount}</Text>
                <Text style={styles.categorizeSummaryCountLabel}>{t('clarityMap.important')}</Text>
              </View>
              <View style={styles.categorizeSummaryCount}>
                <Text style={styles.categorizeSummaryCountNumber}>{unclearCount}</Text>
                <Text style={styles.categorizeSummaryCountLabel}>{t('clarityMap.study')}</Text>
              </View>
              <View style={styles.categorizeSummaryCount}>
                <Text style={styles.categorizeSummaryCountNumber}>{releaseCount}</Text>
                <Text style={styles.categorizeSummaryCountLabel}>{t('clarityMap.letGo')}</Text>
              </View>
            </View>
          </View>

          {/* Continue Button */}
          {uncategorizedCount === 0 && (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>
                {t('clarityMap.continueToInsights')}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================
// Main ClarityMap Component (wrapper)
// ============================================
export default function ClarityMap({ onClose }: ClarityMapProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [stage, setStage] = useState<ClarityMapStage>('dump');
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [heartInsight, setHeartInsight] = useState<string>('');
  const [exploreInsight, setExploreInsight] = useState<string>('');
  const [releaseInsight, setReleaseInsight] = useState<string>('');
  const [perspectiveShift, setPerspectiveShift] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingPath, setIsCreatingPath] = useState(false);
  const [showPathCreatedModal, setShowPathCreatedModal] = useState(false);
  const [createdPathName, setCreatedPathName] = useState('');
  const [createdPathId, setCreatedPathId] = useState<string>('');
  const [isPathQueued, setIsPathQueued] = useState(false);
  const [userIsPremium, setUserIsPremium] = useState<boolean>(true); // default true to avoid flash
  const [showOpenAiReportButton, setShowOpenAiReportButton] = useState(false);
  const [entitlementResolved, setEntitlementResolved] = useState(false);
  const [hasSafetyAlert, setHasSafetyAlert] = useState(false);
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);
  
  // User astrological data
  const [userName, setUserName] = useState<string>('');
  const [birthMonth, setBirthMonth] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');
  const [birthCity, setBirthCity] = useState<string>('');
  const [birthHour, setBirthHour] = useState<string>('');
  const [birthMinute, setBirthMinute] = useState<string>('');
  const [birthPeriod, setBirthPeriod] = useState<string>('');

  // Load user astrological data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const name = await AsyncStorage.getItem('userName');
        const month = await AsyncStorage.getItem('birthMonth');
        const date = await AsyncStorage.getItem('birthDate');
        const year = await AsyncStorage.getItem('birthYear');
        const city = await AsyncStorage.getItem('birthCity');
        const hour = await AsyncStorage.getItem('birthHour');
        const minute = await AsyncStorage.getItem('birthMinute');
        const period = await AsyncStorage.getItem('birthPeriod');
        
        if (name) setUserName(name);
        if (month) setBirthMonth(month);
        if (date) setBirthDate(date);
        if (year) setBirthYear(year);
        if (city) setBirthCity(city);
        if (hour) setBirthHour(hour);
        if (minute) setBirthMinute(minute);
        if (period) setBirthPeriod(period);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
  }, []);

  // Always start fresh when component mounts and when screen comes into focus
  const resetToFreshState = useCallback(async () => {
    try {
      // Clear any existing session data to ensure fresh start
      await AsyncStorage.removeItem('currentClarityMapSession');
      
      // Reset all state to initial values
      setStage('dump');
      setThoughts([]);
      setHeartInsight('');
      setExploreInsight('');
      setReleaseInsight('');
      setPerspectiveShift('');
      setShowOpenAiReportButton(false);
      setEntitlementResolved(false);
      setHasSafetyAlert(false);
      setIsGeneratingAiReport(false);
      setIsLoading(false);
      setIsGeneratingInsight(false);
      setIsSaving(false);
      setIsCreatingPath(false);
    } catch (error) {
      console.error('Error resetting state:', error);
      // Even if there's an error, ensure we start fresh
      setStage('dump');
    }
  }, []);

  const containsCrisisLanguage = (inputThoughts: Thought[]): boolean => {
    const text = inputThoughts.map((t) => t.text || '').join(' ').toLowerCase();
    if (!text) return false;
    const crisisPatterns = [
      /suicid/i,
      /kill myself/i,
      /end my life/i,
      /don't want to live/i,
      /do not want to live/i,
      /hurt myself/i,
      /self[\s-]?harm/i,
      /hopeless/i,
      /i want to die/i,
      /не хочу жить/i,
      /покончить с собой/i,
      /убить себя/i,
      /суицид/i,
      /самоубий/i,
      /навредить себе/i,
    ];
    return crisisPatterns.some((pattern) => pattern.test(text));
  };

  const buildBasicPerspectiveShift = (inputThoughts: Thought[]): string => {
    const firstThought = inputThoughts.find((t) => t.text?.trim())?.text?.trim() || '';
    const shortThought = firstThought.replace(/\s+/g, ' ').slice(0, 120);
    const isRu = i18n.language?.toLowerCase().startsWith('ru');
    const prefix = isRu
      ? 'Ты уже сделал важный шаг, озвучив это.'
      : 'You already took an important step by naming this.';
    const bridge = isRu
      ? ' Держись мягкого ритма и фокусируйся на одном посильном шаге сегодня.'
      : ' Keep a gentle pace and focus on one manageable step today.';
    if (!shortThought) return `${prefix}${bridge}`;
    return isRu
      ? `${prefix} Ты написал: "${shortThought}".${bridge}`
      : `${prefix} You shared: "${shortThought}".${bridge}`;
  };

  const buildPositivePerspectiveFromThoughts = (inputThoughts: Thought[]): string => {
    const firstThought = inputThoughts.find((t) => t.text?.trim())?.text?.trim() || '';
    const shortThought = firstThought.replace(/\s+/g, ' ').slice(0, 140);
    const isRu = i18n.language?.toLowerCase().startsWith('ru');
    if (!shortThought) {
      return isRu
        ? 'Ты уже сделал важный шаг: заметил свои мысли. Выбери один самый мягкий и посильный шаг на сегодня.'
        : 'You already took an important step by noticing your thoughts. Choose one gentle, manageable step for today.';
    }
    return isRu
      ? `Ты поделился мыслью: "${shortThought}". Попробуй посмотреть на неё как на сигнал о том, что тебе важно, и сделай один маленький поддерживающий шаг сегодня.`
      : `You shared: "${shortThought}". Try viewing it as a signal of what matters to you, then take one small supportive step today.`;
  };

  const compactInsightGoalFear = (rawFear?: string): string => {
    const cleaned = (rawFear || '')
      .replace(/["'`]/g, '')
      .replace(/[.,!?;:()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return 'Fear of failure';
    const words = cleaned.split(' ').filter(Boolean);
    if (words.length <= 3) return cleaned;
    return words.slice(0, 3).join(' ');
  };

  const refreshEntitlementState = useCallback(async (): Promise<boolean> => {
    try {
      const [superwallResult, profileResult] = await Promise.allSettled([
        checkSubscriptionStatus(),
        hasSubscriptionOrTrialAccess(),
      ]);
      const superwallAccess = superwallResult.status === 'fulfilled' ? superwallResult.value : false;
      const profileAccess = profileResult.status === 'fulfilled' ? profileResult.value : false;
      const hasPremiumOrTrial = superwallAccess || profileAccess;
      setUserIsPremium(hasPremiumOrTrial);
      setShowOpenAiReportButton(!hasPremiumOrTrial);
      return hasPremiumOrTrial;
    } finally {
      setEntitlementResolved(true);
    }
  }, []);

  // Reset state on mount
  useEffect(() => {
    resetToFreshState();
    refreshEntitlementState();
  }, [resetToFreshState, refreshEntitlementState]);

  // Reset state whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      resetToFreshState();
      refreshEntitlementState();
    }, [resetToFreshState, refreshEntitlementState])
  );

  const handleBrainDumpComplete = async (newThoughts: Thought[]) => {
    setThoughts(newThoughts);
    
    // Save current session
    const session = {
      thoughts: newThoughts,
      timestamp: new Date(),
    };
    await AsyncStorage.setItem('currentClarityMapSession', JSON.stringify(session));
    
    // Go to categorization stage instead of generating insights
    setStage('categorize');
  };

  const handleCategorizationComplete = async (categorizedThoughts: Thought[]) => {
    setThoughts(categorizedThoughts);
    setHasSafetyAlert(false);
    
    // Update session with categorized thoughts
    const session = {
      thoughts: categorizedThoughts,
      timestamp: new Date(),
    };
    await AsyncStorage.setItem('currentClarityMapSession', JSON.stringify(session));

    if (containsCrisisLanguage(categorizedThoughts)) {
      setHeartInsight('');
      setExploreInsight('');
      setReleaseInsight('');
      setPerspectiveShift(t('clarityMap.crisisHelpMessage'));
      setHasSafetyAlert(true);
      setStage('insight');
      return;
    }
    
    // Re-check entitlement at action time to avoid stale state and ensure
    // paid/trial users always receive personalized AI insights.
    const hasPremiumOrTrialNow = await refreshEntitlementState();

    // Strict free users: show lightweight guidance first.
    if (!hasPremiumOrTrialNow) {
      // Free tier: show lightweight local guidance first.
      // Full AI advice is generated when user taps "Open AI Report".
      setHeartInsight(getRandomReflectionPrompt());
      setExploreInsight(getRandomReflectionPrompt());
      setReleaseInsight(getRandomEncouragement());
      setPerspectiveShift(buildBasicPerspectiveShift(categorizedThoughts));
      setStage('insight');
      return;
    }
    
    // Generate insights with categorized thoughts (premium only)
    await generateInsights(categorizedThoughts);
    setStage('insight');
  };

  const handleOpenAiReport = async () => {
    // For strict free users, this button opens AI report generation directly.
    // Premium/trial users do not see this button.
    setIsGeneratingAiReport(true);
    try {
      await generateInsights(thoughts);
      setStage('insight');
    } finally {
      setIsGeneratingAiReport(false);
    }
  };


  const generateInsights = async (thoughtsToProcess: Thought[]) => {
    try {
      setIsGeneratingInsight(true);
      
      // Generate insight using API with astrological data
      const insightText = await generateClarityMapInsight(
        thoughtsToProcess,
        userName,
        birthMonth,
        birthDate,
        birthYear,
        birthCity,
        birthHour,
        birthMinute,
        birthPeriod
      );
      
      // Parse insight into sections
      const parsed = parseInsightText(
        insightText,
        t('clarityMap.fallbackInsight'),
        t('clarityMap.youAlreadyTookStep')
      );
      
      setHeartInsight(parsed.heartInsight);
      setExploreInsight(parsed.exploreInsight);
      setReleaseInsight(parsed.releaseInsight);
      const positivePerspective = parsed.perspectiveShift?.trim()
        ? parsed.perspectiveShift
        : buildPositivePerspectiveFromThoughts(thoughtsToProcess);
      setPerspectiveShift(positivePerspective);
      
      setIsGeneratingInsight(false);
    } catch (error) {
      console.error('Error generating insights:', error);
      setIsGeneratingInsight(false);
      Alert.alert(t('clarityMap.error'), t('clarityMap.failedToGenerateInsights'));
    }
  };

  // Helper function to save insight without showing alert
  const saveInsightSilently = async () => {
    try {
      // Create session object
      const session: ClarityMapSession = {
        id: Date.now().toString(),
        timestamp: new Date(),
        thoughts: thoughts,
        aiSummary: {
          mainFocus: heartInsight || 'Focus on what matters',
          secondaryFocus: exploreInsight || undefined,
          canIgnore: releaseInsight || 'Let go of what no longer serves',
        },
      };

      // Load existing sessions
      const existingSessionsData = await AsyncStorage.getItem('clarityMapSessions');
      const existingSessions = existingSessionsData ? JSON.parse(existingSessionsData) : [];
      
      // Add new session
      const updatedSessions = [...existingSessions, session];
      await AsyncStorage.setItem('clarityMapSessions', JSON.stringify(updatedSessions));
      
      // Also save insights separately for easy access
      const insightsData = {
        heartInsight,
        exploreInsight,
        releaseInsight,
        perspectiveShift,
      };
      await AsyncStorage.setItem(`clarityMapInsights_${session.id}`, JSON.stringify(insightsData));
      
      // Save to me profile's saved insights
      const insightId = Date.now().toString();
      const timestamp = new Date().toISOString();
      
      // Combine all insights into a formatted string
      const insightParts: string[] = [];
      if (heartInsight) {
        insightParts.push(t('clarityMap.whatYourHeartSays'));
        insightParts.push(heartInsight);
        insightParts.push('');
      }
      if (exploreInsight) {
        insightParts.push(t('clarityMap.worthExploring'));
        insightParts.push(exploreInsight);
        insightParts.push('');
      }
      if (releaseInsight) {
        insightParts.push(t('clarityMap.canLetGo'));
        insightParts.push(releaseInsight);
        insightParts.push('');
      }
      if (perspectiveShift) {
        insightParts.push(t('clarityMap.anotherPerspective'));
        insightParts.push(perspectiveShift);
      }
      
      const combinedInsight = insightParts.join('\n').trim();
      
      // Create saved insight object matching the SavedInsight interface
      const savedInsight = {
        id: insightId,
        timestamp: timestamp,
        insight: combinedInsight,
        thoughts: thoughts,
        title: heartInsight ? heartInsight.split('\n')[0].substring(0, 50) : t('clarityMap.clarityInsight'),
      };
      
      // Load existing saved insights
      const savedInsightsData = await AsyncStorage.getItem('savedInsights');
      const existingSavedInsights = savedInsightsData ? JSON.parse(savedInsightsData) : [];
      
      // Add new insight to the beginning of the array (most recent first)
      const updatedSavedInsights = [savedInsight, ...existingSavedInsights];
      await AsyncStorage.setItem('savedInsights', JSON.stringify(updatedSavedInsights));
      
      // Save to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Save clarity session
          const { data: sessionData } = await supabase.from('clarity_sessions').insert({
            user_id: user.id,
            user_text: thoughts.map(t => t.text).join('\n'),
            ai_insight: JSON.stringify({
              heartInsight,
              exploreInsight,
              releaseInsight,
              perspectiveShift,
            }),
          }).select('id').maybeSingle();

          // Save individual thoughts
          if (sessionData) {
            const thoughtRows = thoughts.map((t, index) => ({
              user_id: user.id,
              session_id: sessionData.id,
              text: t.text,
              category: t.category || 'explore',
              order_index: index,
            }));
            await supabase.from('clarity_thoughts').insert(thoughtRows);
          }
        }
      } catch (err) {
        console.error('Supabase clarity save error:', err);
      }
    } catch (error) {
      console.error('Error saving insight silently:', error);
    }
  };

  const handleSaveInsight = async () => {
    try {
      setIsSaving(true);
      
      await saveInsightSilently();
      
      setIsSaving(false);
      
      // Show success message with options
      Alert.alert(
        t('clarityMap.saved'),
        t('clarityMap.insightSuccessfullySaved'),
        [
          {
            text: t('clarityMap.openInMeSection'),
            onPress: () => {
              onClose();
              router.push('/(tabs)/me');
            },
          },
          {
            text: 'Close',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error saving insight:', error);
      setIsSaving(false);
      Alert.alert(t('clarityMap.error'), t('clarityMap.errorSavingInsight'));
    }
  };

  const handleTurnIntoPath = async () => {
    try {
      setIsCreatingPath(true);
      
      // Combine all insights into a single text for goal generation
      const combinedInsight = [
        heartInsight && `What Deserves Your Energy: ${heartInsight}`,
        exploreInsight && `What Needs Space: ${exploreInsight}`,
        releaseInsight && `What to Let Go: ${releaseInsight}`,
        perspectiveShift && `Forward Momentum: ${perspectiveShift}`,
      ]
        .filter(Boolean)
        .join('\n\n');
      
      // Generate goal from insight
      const generatedGoal = await generateGoalFromInsight(combinedInsight);
      const compactGoalFear = compactInsightGoalFear(generatedGoal.fear);
      
      // Load existing goals
      const existingGoalsData = await AsyncStorage.getItem('userGoals');
      const existingGoals = existingGoalsData ? JSON.parse(existingGoalsData) : [];
      
      // Check how many active goals exist
      const activeGoals = existingGoals.filter((g: any) => g.isActive === true);
      const isQueued = activeGoals.length >= 3;
      
      // Create goal object
      // Set currentStepIndex to -1 so only level 1 is unlocked initially (not completed)
      const goalToSave = {
        id: Date.now().toString(),
        name: generatedGoal.name,
        steps: generatedGoal.steps,
        numberOfSteps: generatedGoal.numberOfSteps,
        estimatedDuration: generatedGoal.estimatedDuration,
        aiEstimatedDuration: generatedGoal.estimatedDuration,
        hardnessLevel: generatedGoal.hardnessLevel,
        fear: compactGoalFear,
        obstacle: '',
        progressPercentage: 0,
        isActive: !isQueued,
        isQueued: isQueued,
        createdAt: new Date().toISOString(),
        currentStepIndex: -1, // -1 means no levels completed, only level 1 is unlocked
      };
      
      // Add new goal to the beginning of the list
      const updatedGoals = [goalToSave, ...existingGoals];
      await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));
      
      setIsCreatingPath(false);
      
      // Save the insight silently (without showing alert)
      await saveInsightSilently();
      
      // Store modal data and show white modal popup
      setCreatedPathName(generatedGoal.name);
      setCreatedPathId(goalToSave.id);
      setIsPathQueued(isQueued);
      setShowPathCreatedModal(true);
    } catch (error) {
      console.error('Error creating path:', error);
      setIsCreatingPath(false);
      Alert.alert(t('clarityMap.error'), t('clarityMap.failedToCreatePath'));
    }
  };

  // Show loading state while generating insights
  if (isGeneratingInsight) {
    return (
      <View style={styles.container}>
        <View style={styles.navHeader}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={[styles.navButtonClose, { marginRight: 25 }]} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#342846" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <ActivityIndicator size="large" color="#342846" />
          <Text style={[styles.mainSubtitle, { marginTop: 16 }]}>
            {t('clarityMap.generatingInsight')}
          </Text>
        </View>
      </View>
    );
  }

  // Show brain dump stage
  if (stage === 'dump') {
    return <BrainDumpStage onComplete={handleBrainDumpComplete} onClose={onClose} />;
  }

  // Show categorization stage
  if (stage === 'categorize') {
    return (
      <CategorizeStage
        thoughts={thoughts}
        onComplete={handleCategorizationComplete}
        onBack={() => setStage('dump')}
        onClose={onClose}
      />
    );
  }

  // Show insight stage
  return (
    <>
      <ClarityInsightScreen
        thoughts={thoughts}
        heartInsight={heartInsight}
        exploreInsight={exploreInsight}
        releaseInsight={releaseInsight}
        perspectiveShift={perspectiveShift}
        userIsPremium={userIsPremium}
        showOpenAiReportButton={entitlementResolved && showOpenAiReportButton}
        hasSafetyAlert={hasSafetyAlert}
        isGeneratingAiReport={isGeneratingAiReport}
        onSaveInsight={userIsPremium && !hasSafetyAlert && !isSaving ? handleSaveInsight : undefined}
        onTurnIntoPath={userIsPremium && !hasSafetyAlert ? (isCreatingPath ? undefined : handleTurnIntoPath) : undefined}
        onOpenAiReport={entitlementResolved && showOpenAiReportButton && !hasSafetyAlert ? handleOpenAiReport : undefined}
        onClose={onClose}
        isCreatingPath={isCreatingPath}
      />
      
      {/* Path Created Success Modal */}
      <Modal
        visible={showPathCreatedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPathCreatedModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowPathCreatedModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPathCreatedModal(false)}
              accessibilityRole="button"
              accessibilityLabel={t('clarityMap.close')}
            >
              <MaterialIcons name="close" size={22} color="#342846" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('clarityMap.pathCreated')}</Text>
            <Text style={styles.modalText}>
              {isPathQueued
                ? t('clarityMap.pathCreatedBodyQueuedSimple')
                : t('clarityMap.pathCreatedBodyActiveSimple')}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => {
                  setShowPathCreatedModal(false);
                  if (createdPathId) {
                    router.push({
                      pathname: '/goal-map',
                      params: {
                        goalName: createdPathName,
                        goalId: createdPathId,
                      },
                    });
                  } else {
                    router.push('/(tabs)/goals');
                  }
                  // Close the clarity map after navigation
                  setTimeout(() => {
                    onClose();
                  }, 100);
                }}
              >
                <Text style={styles.modalPrimaryButtonText}>{t('clarityMap.goToGoals')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
