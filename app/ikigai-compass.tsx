import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { FrostedCardLayer } from '@/components/FrostedCardLayer';
import { ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import { generateIkigaiConclusion } from '@/utils/claudeApi';
import { checkSubscriptionStatus, triggerPaywall } from '@/utils/superwall';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const PREMIUM_STATUS_CACHE_TTL_MS = 5 * 60 * 1000;
let premiumStatusCache: { value: boolean; timestamp: number } | null = null;

// ============================================
// Types
// ============================================
interface IkigaiSummaryProps {
  whatYouLove?: string;
  whatYouGoodAt?: string;
  whatWorldNeeds?: string;
  whatCanBePaidFor?: string;
  ikigaiConclusion?: string;
  onEdit?: (category: string) => void;
  onBack?: () => void;
}

interface IkigaiCategory {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  answer: string;
  displayAnswer?: string;
}

// ============================================
// Noise Texture Overlay Component
// ============================================
function NoiseTexture() {
  return (
    <View style={styles.noiseOverlay} pointerEvents="none">
      {/* This creates a subtle noise effect using semi-transparent dots */}
      <View style={styles.noisePattern} />
    </View>
  );
}

// ============================================
// Quote Card Component
// ============================================
interface QuoteCardProps {
  category: IkigaiCategory;
  index: number;
  isVisible: boolean;
  onEdit: (categoryId: string) => void;
}

function QuoteCard({ category, index, isVisible, onEdit }: QuoteCardProps) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (isVisible) {
      const delay = 200 + index * 120;

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
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 9,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);
    }
  }, [isVisible]);

  const iconName = category.icon as keyof typeof MaterialIcons.glyphMap;
  const hasAnswer = category.answer && category.answer.trim().length > 0;
  const cardAnswer = category.answer;

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={(e) => {
          e.stopPropagation();
          onEdit(category.id);
        }}
        style={styles.cardTouchable}
      >
        {/* Card shell */}
        <LinearGradient
          colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.6)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <FrostedCardLayer />
          {/* Noise texture overlay */}
          <View style={styles.cardNoiseOverlay} />

          {/* Header row */}
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <MaterialIcons name={iconName} size={22} color="#342846" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.cardTitle}>{category.title}</Text>
              <Text style={styles.cardSubtitle}>{category.subtitle}</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => onEdit(category.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="edit" size={18} color="rgba(52,40,70,0.7)" />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Answer area */}
          <View style={styles.answerContainer}>
            <View style={styles.answerBackgroundWrapper}>
              <View style={styles.answerBackground}>
                <Text style={[styles.answerText, !hasAnswer && styles.emptyAnswerText]}>
                  {hasAnswer ? cardAnswer : (isRussian ? 'Нажми, чтобы добавить ответ...' : 'Tap to add an answer...')}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================
// Conclusion Card Component
// ============================================
interface ConclusionCardProps {
  conclusion?: string;
  isVisible: boolean;
  isComplete: boolean;
  isGenerating?: boolean;
  isLocked?: boolean;
  onPress?: () => void;
}

function ConclusionCard({ conclusion, isVisible, isComplete, isGenerating, isLocked = false, onPress }: ConclusionCardProps) {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const starRotate = useRef(new Animated.Value(0)).current;

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

        // Gentle pulse for the star
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ).start();

        // Slow star rotation
        Animated.loop(
          Animated.timing(starRotate, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: true,
          })
        ).start();
      }, 700);
    }
  }, [isVisible]);

  const rotation = starRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.conclusionWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={onPress ? 0.9 : 1}
        onPress={onPress}
        disabled={!onPress}
      >
        <LinearGradient
          colors={['#342846', '#453858', '#342846']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.conclusionCard}
        >
          {/* Noise overlay */}
          <View style={styles.cardNoiseOverlay} />

          {/* Star icon */}
          <Animated.View
            style={[
              styles.starContainer,
              {
                transform: [
                  { rotate: rotation },
                  { scale: pulseAnim },
                ],
              },
            ]}
          >
            <MaterialIcons name="auto-awesome" size={32} color="#f4b942" />
          </Animated.View>

          {/* Divider with label */}
          <View style={styles.conclusionDivider}>
            <View style={styles.conclusionDividerLine} />
            <Text style={styles.conclusionDividerText}>{isRussian ? 'Твой икигай' : 'Your Ikigai'}</Text>
            <View style={styles.conclusionDividerLine} />
          </View>

          {/* Title */}
          <Text style={styles.conclusionTitle}>
            {isLocked
              ? (isRussian ? 'ГОТОВ ЛИ ТЫ К СВОЕМУ ИКИГАЙ?' : 'ARE YOU READY FOR YOUR IKIGAI?')
              : (isRussian ? 'ТВОЙ СМЫСЛ' : 'YOUR PURPOSE')}
          </Text>

          {/* Content */}
          {isLocked ? (
            <View style={styles.lockedContent}>
              <Text style={styles.lockedSubtitle}>
                {isRussian ? 'Открой персональный смысл и путь в один шаг.' : 'Unlock your personalized purpose in one tap.'}
              </Text>
              <Image
                source={require('../assets/images/lock.png')}
                style={styles.lockIcon}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.unlockIkigaiButton}
                onPress={onPress}
                activeOpacity={0.85}
              >
                <Text style={styles.unlockIkigaiButtonText}>
                  {isRussian ? 'Разблокировать икигай' : 'Unlock Your Ikigai'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : isComplete && conclusion ? (
            <View style={styles.conclusionContent}>
              <Text style={styles.conclusionText}>{conclusion.replace(/\*\*/g, '')}</Text>
            </View>
          ) : isComplete ? (
            isGenerating ? (
              <View style={styles.incompleteContent}>
                <ActivityIndicator color="rgba(255,255,255,0.85)" />
                <Text style={styles.incompleteText}>{t('ikigaiCompass.generatingConclusion')}</Text>
              </View>
            ) : (
              <View style={styles.incompleteContent}>
                <MaterialIcons name="cloud-off" size={28} color="rgba(255,255,255,0.45)" />
                <Text style={styles.incompleteText}>{t('ikigaiCompass.conclusionLoadError')}</Text>
              </View>
            )
          ) : (
            <View style={styles.incompleteContent}>
              <MaterialIcons name="hourglass-empty" size={28} color="rgba(255,255,255,0.4)" />
              <Text style={styles.incompleteText}>
                {isRussian ? 'Заполни все четыре измерения, чтобы раскрыть свой икигай' : 'Complete all four dimensions to reveal your Ikigai'}
              </Text>
            </View>
          )}

        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================
// Main Component
// ============================================
export default function IkigaiSummaryScreen({
  whatYouLove: propWhatYouLove,
  whatYouGoodAt: propWhatYouGoodAt,
  whatWorldNeeds: propWhatWorldNeeds,
  whatCanBePaidFor: propWhatCanBePaidFor,
  ikigaiConclusion: propIkigaiConclusion,
  onEdit,
  onBack,
}: IkigaiSummaryProps) {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  const hasCyrillic = (text: string) => /[А-Яа-яЁё]/.test(text);
  const hasLatin = (text: string) => /[A-Za-z]/.test(text);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State for loaded data
  const [whatYouLove, setWhatYouLove] = useState(propWhatYouLove || '');
  const [whatYouGoodAt, setWhatYouGoodAt] = useState(propWhatYouGoodAt || '');
  const [whatWorldNeeds, setWhatWorldNeeds] = useState(propWhatWorldNeeds || '');
  const [whatCanBePaidFor, setWhatCanBePaidFor] = useState(propWhatCanBePaidFor || '');
  const [ikigaiConclusion, setIkigaiConclusion] = useState(propIkigaiConclusion || '');

  // Edit modal state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isGeneratingConclusion, setIsGeneratingConclusion] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [userIsPremium, setUserIsPremium] = useState(true);

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  const loadPremiumStatus = async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && premiumStatusCache && now - premiumStatusCache.timestamp < PREMIUM_STATUS_CACHE_TTL_MS) {
      console.log('[MyPath] Using cached premium status:', premiumStatusCache.value);
      return premiumStatusCache.value;
    }

    console.log('[MyPath] Checking premium status...');
    const startedAt = Date.now();
    const premium = await checkSubscriptionStatus();
    premiumStatusCache = { value: premium, timestamp: Date.now() };
    console.log(`[MyPath] Premium status check finished in ${Date.now() - startedAt}ms:`, premium);
    return premium;
  };

  // Load data from AsyncStorage if props are not provided
  useEffect(() => {
    const loadData = async () => {
      const startedAt = Date.now();
      console.log('[MyPath] Loading Ikigai screen data...');
      try {
        // Batch AsyncStorage reads to avoid serial IO on screen start.
        const [loveStored, goodAtStored, worldNeedsStored, paidForStored, callingType, pathReport] = (
          await AsyncStorage.multiGet([
            'ikigaiWhatYouLove',
            'ikigaiWhatYouGoodAt',
            'ikigaiWhatWorldNeeds',
            'ikigaiWhatCanBePaidFor',
            'ikigaiCallingType',
            'ikigaiPathReport',
          ])
        ).map(([, value]) => value);

        const mergeField = (prop: string | undefined, stored: string | null) => {
          const fromProp = (prop ?? '').trim();
          if (fromProp.length > 0) return fromProp;
          return (stored ?? '').trim();
        };

        const loadedLove = mergeField(propWhatYouLove, loveStored);
        const loadedGoodAt = mergeField(propWhatYouGoodAt, goodAtStored);
        const loadedWorldNeeds = mergeField(propWhatWorldNeeds, worldNeedsStored);
        const loadedPaidFor = mergeField(propWhatCanBePaidFor, paidForStored);

        /** All four passed non-empty from navigation — do not reuse cached conclusion (avoids stale text). */
        const allFourFromProps =
          (propWhatYouLove ?? '').trim() !== '' &&
          (propWhatYouGoodAt ?? '').trim() !== '' &&
          (propWhatWorldNeeds ?? '').trim() !== '' &&
          (propWhatCanBePaidFor ?? '').trim() !== '';

        setWhatYouLove(loadedLove);
        setWhatYouGoodAt(loadedGoodAt);
        setWhatWorldNeeds(loadedWorldNeeds);
        setWhatCanBePaidFor(loadedPaidFor);

        const allFilled =
          loadedLove.trim().length > 0 &&
          loadedGoodAt.trim().length > 0 &&
          loadedWorldNeeds.trim().length > 0 &&
          loadedPaidFor.trim().length > 0;

        const trimmedPropConclusion = (propIkigaiConclusion ?? '').trim();
        if (trimmedPropConclusion) {
          setIkigaiConclusion(trimmedPropConclusion);
        } else if (allFourFromProps) {
          if (allFilled) {
            setIsLoading(false);
            setIsGeneratingConclusion(true);
            const generationStartedAt = Date.now();
            console.log('[MyPath] Generating Ikigai conclusion from provided answers...');
            try {
              const conclusion = await generateIkigaiConclusion(
                loadedLove,
                loadedGoodAt,
                loadedWorldNeeds,
                loadedPaidFor,
                isRussian ? 'ru' : 'en'
              );

              const combinedConclusion = `${conclusion.callingType.replace(/\*\*/g, '')}\n\n${conclusion.pathReport.replace(/\*\*/g, '')}`;
              setIkigaiConclusion(combinedConclusion);

              await AsyncStorage.setItem('ikigaiCallingType', conclusion.callingType.replace(/\*\*/g, ''));
              await AsyncStorage.setItem('ikigaiPathReport', conclusion.pathReport.replace(/\*\*/g, ''));
              console.log(`[MyPath] Ikigai conclusion generated in ${Date.now() - generationStartedAt}ms`);
            } catch (error) {
              console.error('Error generating conclusion:', error);
            } finally {
              setIsGeneratingConclusion(false);
            }
          }
        } else if (callingType && pathReport) {
          const combinedStoredConclusion = `${callingType.replace(/\*\*/g, '')}\n\n${pathReport.replace(/\*\*/g, '')}`;

          const needsRussianRegeneration = isRussian && !hasCyrillic(combinedStoredConclusion);
          const needsEnglishRegeneration =
            !isRussian && hasCyrillic(combinedStoredConclusion) && !hasLatin(combinedStoredConclusion);
          const needsRegeneration = allFilled && (needsRussianRegeneration || needsEnglishRegeneration);

          if (!needsRegeneration) {
            setIkigaiConclusion(combinedStoredConclusion);
          } else {
            setIkigaiConclusion('');
          }
          if (needsRegeneration) {
            setIsGeneratingConclusion(true);
            try {
              const conclusion = await generateIkigaiConclusion(
                loadedLove,
                loadedGoodAt,
                loadedWorldNeeds,
                loadedPaidFor,
                isRussian ? 'ru' : 'en'
              );
              const combinedConclusion = `${conclusion.callingType.replace(/\*\*/g, '')}\n\n${conclusion.pathReport.replace(/\*\*/g, '')}`;
              setIkigaiConclusion(combinedConclusion);
              await AsyncStorage.setItem('ikigaiCallingType', conclusion.callingType.replace(/\*\*/g, ''));
              await AsyncStorage.setItem('ikigaiPathReport', conclusion.pathReport.replace(/\*\*/g, ''));
            } catch (error) {
              console.error('Error regenerating localized conclusion:', error);
            } finally {
              setIsGeneratingConclusion(false);
            }
          }
        } else if (callingType) {
          setIkigaiConclusion(callingType.replace(/\*\*/g, ''));
        } else if (pathReport) {
          setIkigaiConclusion(pathReport.replace(/\*\*/g, ''));
        } else if (allFilled) {
          setIsLoading(false);
          setIsGeneratingConclusion(true);
          const generationStartedAt = Date.now();
          console.log('[MyPath] Generating Ikigai conclusion from stored answers...');
          try {
            const conclusion = await generateIkigaiConclusion(
              loadedLove,
              loadedGoodAt,
              loadedWorldNeeds,
              loadedPaidFor,
              isRussian ? 'ru' : 'en'
            );

            const combinedConclusion = `${conclusion.callingType.replace(/\*\*/g, '')}\n\n${conclusion.pathReport.replace(/\*\*/g, '')}`;
            setIkigaiConclusion(combinedConclusion);

            await AsyncStorage.setItem('ikigaiCallingType', conclusion.callingType.replace(/\*\*/g, ''));
            await AsyncStorage.setItem('ikigaiPathReport', conclusion.pathReport.replace(/\*\*/g, ''));
            console.log(`[MyPath] Ikigai conclusion generated in ${Date.now() - generationStartedAt}ms`);
          } catch (error) {
            console.error('Error generating conclusion:', error);
          } finally {
            setIsGeneratingConclusion(false);
          }
        }
      } catch (error) {
        console.error('Error loading Ikigai data:', error);
      } finally {
        console.log(`[MyPath] Initial data load finished in ${Date.now() - startedAt}ms`);
        setIsLoading(false);
      }
    };

    loadData();
  }, [propWhatYouLove, propWhatYouGoodAt, propWhatWorldNeeds, propWhatCanBePaidFor, propIkigaiConclusion, isRussian]);

  useEffect(() => {
    const checkPremium = async () => {
      console.log('[MyPath] Verifying Superwall readiness and premium access...');
      const premium = await loadPremiumStatus();
      setUserIsPremium(premium);
    };
    checkPremium();
  }, []);

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleLockedConclusionPress = async () => {
    console.log('[MyPath] Locked Ikigai card pressed. Calling triggerPaywall("feature_locked").');
    const { shown, purchased } = await triggerPaywall('feature_locked');
    console.log('[MyPath] Paywall response:', { shown, purchased });
    const premium = await loadPremiumStatus(true);
    setUserIsPremium(premium);
  };

  // Handle edit button press
  const handleEdit = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setEditText(category.answer);
      setEditingCategory(categoryId);
    }
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingCategory) return;

    const trimmedText = editText.trim();
    
    // Update state based on category
    const storageKeyMap: Record<string, { setter: (value: string) => void; key: string }> = {
      love: { setter: setWhatYouLove, key: 'ikigaiWhatYouLove' },
      goodAt: { setter: setWhatYouGoodAt, key: 'ikigaiWhatYouGoodAt' },
      worldNeeds: { setter: setWhatWorldNeeds, key: 'ikigaiWhatWorldNeeds' },
      paidFor: { setter: setWhatCanBePaidFor, key: 'ikigaiWhatCanBePaidFor' },
    };

    const { setter, key } = storageKeyMap[editingCategory];
    if (setter && key) {
      setter(trimmedText);
      
      // Save to AsyncStorage
      try {
        await AsyncStorage.setItem(key, trimmedText);
      } catch (error) {
        console.error('Error saving answer:', error);
      }
    }

    // Close modal
    setEditingCategory(null);
    setEditText('');

    // Regenerate conclusion if all four are filled
    const updatedAnswers = {
      love: editingCategory === 'love' ? trimmedText : whatYouLove,
      goodAt: editingCategory === 'goodAt' ? trimmedText : whatYouGoodAt,
      worldNeeds: editingCategory === 'worldNeeds' ? trimmedText : whatWorldNeeds,
      paidFor: editingCategory === 'paidFor' ? trimmedText : whatCanBePaidFor,
    };

    const allFilled = Object.values(updatedAnswers).every(answer => answer.trim().length > 0);
    
    if (allFilled) {
      setIsGeneratingConclusion(true);
      try {
        const conclusion = await generateIkigaiConclusion(
          updatedAnswers.love,
          updatedAnswers.goodAt,
          updatedAnswers.worldNeeds,
          updatedAnswers.paidFor,
          isRussian ? 'ru' : 'en'
        );
        
        const combinedConclusion = `${conclusion.callingType.replace(/\*\*/g, '')}\n\n${conclusion.pathReport.replace(/\*\*/g, '')}`;
        setIkigaiConclusion(combinedConclusion);
        
        // Save conclusion to AsyncStorage (strip stars before saving)
        await AsyncStorage.setItem('ikigaiCallingType', conclusion.callingType.replace(/\*\*/g, ''));
        await AsyncStorage.setItem('ikigaiPathReport', conclusion.pathReport.replace(/\*\*/g, ''));
      } catch (error) {
        console.error('Error generating conclusion:', error);
        // Don't show error to user, just log it
      } finally {
        setIsGeneratingConclusion(false);
      }
    } else {
      // Clear conclusion if not all sections are filled
      setIkigaiConclusion('');
      await AsyncStorage.removeItem('ikigaiCallingType');
      await AsyncStorage.removeItem('ikigaiPathReport');
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditText('');
  };

  const categories: IkigaiCategory[] = [
    {
      id: 'love',
      icon: 'favorite',
      title: tr('What you love', 'Что ты любишь'),
      subtitle: tr('Your passion and what brings you joy', 'Твоя страсть и то, что приносит радость'),
      answer: whatYouLove || '',
    },
    {
      id: 'goodAt',
      icon: 'bolt',
      title: tr('What you are good at', 'В чем ты силен'),
      subtitle: tr('Your skills and natural talents', 'Твои навыки и природные таланты'),
      answer: whatYouGoodAt || '',
    },
    {
      id: 'worldNeeds',
      icon: 'public',
      title: tr('What the world needs', 'Что нужно миру'),
      subtitle: tr('Problems you want to solve', 'Проблемы, которые ты хочешь решать'),
      answer: whatWorldNeeds || '',
    },
    {
      id: 'paidFor',
      icon: 'payments',
      title: tr('What you can be paid for', 'За что тебе могут платить'),
      subtitle: tr('Your value and professional role', 'Твоя ценность и профессиональная роль'),
      answer: whatCanBePaidFor || '',
    },
  ];

  const answeredCount = categories.filter(c => c.answer.trim().length > 0).length;
  const completionPercentage = (answeredCount / 4) * 100;
  const isComplete = answeredCount === 4;

  useEffect(() => {
    if (!isLoading) {
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

    }
  }, [isLoading, completionPercentage]);

  if (isLoading) {
    return (
      <PaperTextureBackground>
        <Image
          source={require('../assets/images/yourpath.png')}
          pointerEvents="none"
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#342846" />
            <Text style={styles.loadingText}>{tr('Loading your path...', 'Загружаем твой путь...')}</Text>
          </View>
        </View>
      </PaperTextureBackground>
    );
  }

  return (
    <PaperTextureBackground>
      <Image
        source={require('../assets/images/yourpath.png')}
        pointerEvents="none"
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          {/* Header row */}
          <View style={styles.headerButtonsRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <MaterialIcons name="arrow-back" size={24} color="#342846" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{tr('My Ikigai', 'Мой икигай')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.helpButton} 
              onPress={() => setShowHelpModal(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="help-outline" size={20} color="#342846" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>
            {t('ikigaiCompass.subtitle')}
          </Text>

        </Animated.View>

        {/* Section divider */}
        <Animated.View style={[styles.sectionDivider, { opacity: headerFade }]}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionText}>{tr('Four dimensions', 'Четыре измерения')}</Text>
          <View style={styles.sectionLine} />
        </Animated.View>

        {/* Cards */}
        <View style={styles.cardsContainer}>
          {categories.map((category, index) => (
            <QuoteCard
              key={category.id}
              category={category}
              index={index}
              isVisible={isVisible}
              onEdit={() => handleEdit(category.id)}
            />
          ))}
        </View>

        {/* Conclusion */}
        <ConclusionCard
          conclusion={ikigaiConclusion}
          isVisible={isVisible}
          isComplete={isComplete}
          isGenerating={isGeneratingConclusion}
          isLocked={!userIsPremium && isComplete}
          onPress={!userIsPremium && isComplete ? handleLockedConclusionPress : undefined}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editingCategory !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCancelEdit}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingCategory && categories.find(c => c.id === editingCategory)?.title}
                </Text>
              </View>

              <Text style={styles.modalSubtitle}>
                {editingCategory && categories.find(c => c.id === editingCategory)?.subtitle}
              </Text>

              <TextInput
                style={styles.modalInput}
                value={editText}
                onChangeText={setEditText}
                placeholder={tr('Enter your answer...', 'Введи свой ответ...')}
                placeholderTextColor="#999"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                autoFocus
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.modalCancelText}>{tr('Cancel', 'Отмена')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.modalSaveText}>{tr('Save', 'Сохранить')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Help Modal */}
      {showHelpModal && (
        <Modal
          transparent
          visible={showHelpModal}
          animationType="fade"
          onRequestClose={() => setShowHelpModal(false)}
        >
          <View style={styles.helpModalOverlay}>
            <View style={styles.helpModalWrapper}>
              <Image 
                source={require('../assets/images/ikigaicompass.png')} 
                style={styles.helpModalIcon}
                resizeMode="contain"
              />
              <View style={styles.helpModalContent}>
                <Text style={styles.helpModalTitle}>{t('ikigaiCompass.helpModalTitle')}</Text>
                <Text style={styles.helpModalText}>
                  {t('ikigaiCompass.helpModalText')}
                </Text>
                <TouchableOpacity
                  style={styles.helpModalButton}
                  onPress={() => setShowHelpModal(false)}
                >
                  <Text style={styles.helpModalButtonText}>{t('common.gotIt')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      </View>
    </PaperTextureBackground>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Uses parent PaperTextureBackground
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    marginBottom: 28,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
    opacity: 1,
    elevation: 11,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  helpButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
    opacity: 1,
    elevation: 11,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  headerTitle: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#342846',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  headerSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#342846',
    textAlign: 'center',
    opacity: 0.95,
    lineHeight: 22,
    maxWidth: Platform.isPad ? 350 : 270,
    alignSelf: 'center',
    marginBottom: 24,
  },

  // Section divider
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(52, 40, 70, 0.2)',
  },
  sectionText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: '#342846',
    opacity: 0.9,
    marginHorizontal: 16,
  },

  // Cards
  cardsContainer: {
    gap: 16,
  },
  cardWrapper: {
    borderRadius: 16,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 10,
  },
  cardTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    minHeight: 160,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  cardNoiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    // You can add a noise texture image here if available
    // backgroundImage: require('../../assets/images/noise.png'),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 40, 70, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 44,
  },
  cardTitle: {
    ...HeadingStyle,
    fontSize: 15,
    color: '#342846',
    marginBottom: 3,
  },
  cardSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: '#342846',
    opacity: 0.8,
  },
  editButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(52, 40, 70, 0.2)',
    marginBottom: 16,
  },
  answerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  answerBackgroundWrapper: {
    flex: 1,
    marginLeft: 0,
    marginRight: 0,
  },
  answerBackground: {
    backgroundColor: 'rgba(255, 255, 255, 1.0)',
    borderRadius: 8,
    padding: 12,
  },
  answerText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#342846',
    lineHeight: 21.6, // Reduced by 10% from 24
  },
  emptyAnswerText: {
    fontStyle: 'italic',
    opacity: 0.5,
  },

  // Conclusion
  conclusionWrapper: {
    marginTop: 28,
    borderRadius: 20,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  conclusionCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 220,
  },
  starContainer: {
    marginBottom: 16,
  },
  conclusionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  conclusionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  conclusionDividerText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 16,
  },
  conclusionTitle: {
    ...HeadingStyle,
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  conclusionContent: {
    paddingHorizontal: 8,
  },
  lockedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  lockedSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  lockIcon: {
    width: 72,
    height: 72,
    marginTop: 15,
    marginBottom: 15,
  },
  unlockIkigaiButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  unlockIkigaiButtonText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: '#342846',
  },
  conclusionText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.95,
  },
  incompleteContent: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  incompleteText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Noise overlay
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  noisePattern: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#342846',
    opacity: 0.7,
  },

  // Edit Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalKeyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#342846',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    ...HeadingStyle,
    fontSize: 20,
    color: '#342846',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: '#342846',
    opacity: 0.6,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#342846',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#342846',
  },
  modalCancelText: {
    ...ButtonHeadingStyle,
    fontSize: 18,
    color: '#342846',
  },
  modalSaveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#342846',
  },
  modalSaveText: {
    ...ButtonHeadingStyle,
    fontSize: 18,
    color: '#FFFFFF',
  },

  // Help Modal
  helpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  helpModalWrapper: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  helpModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    paddingTop: 52,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  helpModalIcon: {
    width: 72,
    height: 72,
    zIndex: 1,
    marginBottom: -36,
  },
  helpModalTitle: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 16,
  },
  helpModalText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  helpModalButton: {
    backgroundColor: '#342846',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  helpModalButtonText: {
    fontFamily: 'AnonymousPro-Regular',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
