import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle } from '@/constants/theme';
import { changeLanguage } from '@/utils/i18n';
import * as superwallUtils from '@/utils/superwall';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Dimensions, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAX_DEER_WIDTH = 260;
// Module-level screen width used only for static StyleSheet values (can't use hooks here).
const STYLE_SCREEN_WIDTH = Dimensions.get('window').width;

// ============================================================================
// WELCOME SCREEN
// Combined welcome + language selection in one warm, inviting experience
// The deer mascot welcomes users and guides them to begin their journey
// ============================================================================

type LanguageCode = 'en' | 'ru';

type Content = {
  welcome: string;
  subtitle: string;
  mascotMessage: string;
  startButton: string;
  loginText: string;
  loginLink: string;
};

const WelcomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const IS_SHORT_SCREEN = SCREEN_HEIGHT < 760;
  const IS_VERY_SHORT_SCREEN = SCREEN_HEIGHT < 700;
  /** Narrow portrait width — primary driver for login row + gutters (not screen height). */
  const IS_NARROW_WIDTH = SCREEN_WIDTH < 420;
  const IS_VERY_NARROW_WIDTH = SCREEN_WIDTH < 360;
  /** Keep login CTA on same baseline across all phone widths. */
  const IS_COMPACT_LOGIN_ROW = false;
  const IS_TABLET_LAYOUT = Platform.isPad || (Platform.OS === 'android' && SCREEN_WIDTH >= 768);
  const horizontalGutter = IS_TABLET_LAYOUT ? 40 : IS_VERY_NARROW_WIDTH ? 20 : IS_NARROW_WIDTH ? 28 : 40;
  const rawDeerWidth = SCREEN_WIDTH * 0.85 * 1.25 * 0.75 * 0.85;
  const DEER_IMAGE_WIDTH =
    Math.min(rawDeerWidth, MAX_DEER_WIDTH) *
    (IS_SHORT_SCREEN ? 0.82 : 1) *
    (IS_NARROW_WIDTH ? 0.92 : 1);
  const DEER_IMAGE_HEIGHT = DEER_IMAGE_WIDTH * (180 / 220);
  const CONTENT_WIDTH = Math.min(SCREEN_WIDTH - horizontalGutter, IS_TABLET_LAYOUT ? 560 : 420);
  const BUBBLE_WIDTH = Math.min(SCREEN_WIDTH - horizontalGutter, IS_TABLET_LAYOUT ? 560 : 440);
  const LANGUAGE_BUTTON_WIDTH = Math.min(Math.max(168, SCREEN_WIDTH * 0.48), 220);

  const { i18n } = useTranslation();
  const normalizeLanguage = (lang?: string): LanguageCode =>
    lang?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(normalizeLanguage(i18n.language));
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const mascotFadeAnim = useRef(new Animated.Value(0)).current;
  const mascotSlideAnim = useRef(new Animated.Value(30)).current;
  const mascotScaleAnim = useRef(new Animated.Value(0.95)).current;
  const bottomFadeAnim = useRef(new Animated.Value(0)).current;
  const bottomSlideAnim = useRef(new Animated.Value(20)).current;
  const butterflyAnim = useRef(new Animated.Value(0)).current;
  const deerScaleAnim = useRef(new Animated.Value(1)).current;
  
  // Butterfly animation values for flying animation
  const butterflyX = useRef(new Animated.Value(0)).current;
  const butterflyY = useRef(new Animated.Value(0)).current;
  const butterflyRotation = useRef(new Animated.Value(0)).current;
  const butterflyOpacity = useRef(new Animated.Value(1)).current;
  const butterflyScale = useRef(new Animated.Value(1)).current;

  // Floating orb animations
  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;
  const orb3Y = useRef(new Animated.Value(0)).current;
  const orb1X = useRef(new Animated.Value(0)).current;
  const orb2X = useRef(new Animated.Value(0)).current;
  const orb3X = useRef(new Animated.Value(0)).current;

  // Trigger entrance animations
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    
    // Animate main content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate mascot
    Animated.parallel([
      Animated.timing(mascotFadeAnim, {
        toValue: 1,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(mascotSlideAnim, {
        toValue: 0,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(mascotScaleAnim, {
        toValue: 1,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate bottom section
    Animated.parallel([
      Animated.timing(bottomFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(bottomSlideAnim, {
        toValue: 0,
        duration: 800,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Butterfly floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(butterflyAnim, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(butterflyAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Deer gentle breath animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(deerScaleAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(deerScaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Butterfly flying animation - continuous loop (positioned on deer's nose)
    // Reset butterfly position to deer's nose area
    butterflyX.setValue(0);
    butterflyY.setValue(0);
    butterflyRotation.setValue(0);
    butterflyOpacity.setValue(1);
    butterflyScale.setValue(1);
    
    // Continuous fluttering rotation (slower)
    const flutterAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(butterflyRotation, {
          toValue: 1,
          duration: 400, // Slowed from 200ms
          useNativeDriver: true,
        }),
        Animated.timing(butterflyRotation, {
          toValue: -1,
          duration: 400, // Slowed from 200ms
          useNativeDriver: true,
        }),
      ])
    );
    
    // Continuous flying path - loops infinitely
    const flyPathAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(butterflyX, {
            toValue: SCREEN_WIDTH * 0.4, // Fly to the right
            duration: 6000, // Slowed from 3000ms
            useNativeDriver: true,
          }),
          Animated.timing(butterflyY, {
            toValue: -SCREEN_HEIGHT * 0.6, // Fly upward
            duration: 6000, // Slowed from 3000ms
            useNativeDriver: true,
          }),
          Animated.timing(butterflyScale, {
            toValue: 0.7,
            duration: 6000, // Slowed from 3000ms
            useNativeDriver: true,
          }),
        ]),
        // Fade out near the end
        Animated.timing(butterflyOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        // Reset position instantly (while invisible)
        Animated.parallel([
          Animated.timing(butterflyX, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(butterflyY, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(butterflyScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        // Fade back in
        Animated.timing(butterflyOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ])
    );
    
    flutterAnimation.start();
    flyPathAnimation.start();

    // Floating orb animations - gentle floating motion
    const orb1Float = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb1Y, {
            toValue: -15,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(orb1X, {
            toValue: 5,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb1Y, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(orb1X, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const orb2Float = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb2Y, {
            toValue: -12,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(orb2X, {
            toValue: -3,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb2Y, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(orb2X, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const orb3Float = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb3Y, {
            toValue: -10,
            duration: 3500,
            useNativeDriver: true,
          }),
          Animated.timing(orb3X, {
            toValue: 4,
            duration: 3500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb3Y, {
            toValue: 0,
            duration: 3500,
            useNativeDriver: true,
          }),
          Animated.timing(orb3X, {
            toValue: 0,
            duration: 3500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    orb1Float.start();
    orb2Float.start();
    orb3Float.start();

    return () => {
      clearTimeout(timer);
      flutterAnimation.stop();
      flyPathAnimation.stop();
      orb1Float.stop();
      orb2Float.stop();
      orb3Float.stop();
    };
  }, []);

  // Sync selectedLanguage with i18n language
  useEffect(() => {
    const currentLang = normalizeLanguage(i18n.language);
    if (currentLang && currentLang !== selectedLanguage) {
      setSelectedLanguage(currentLang);
    }
  }, [i18n.language]);

  const languages = [
    { code: 'en' as LanguageCode, name: 'English' },
    { code: 'ru' as LanguageCode, name: 'Русский' },
  ];

  const currentLanguage = languages.find(l => l.code === selectedLanguage);

  const handleLanguageChange = async (langCode: LanguageCode) => {
    setSelectedLanguage(langCode);
    setShowLanguageMenu(false);
    try {
      await changeLanguage(langCode);
      if (typeof superwallUtils.setLocaleAttribute === 'function') {
        await superwallUtils.setLocaleAttribute(langCode);
      } else {
        console.warn('Superwall locale updater is unavailable; skipping locale attribute update.');
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const handleStartJourney = () => {
    router.push('/features-intro');
  };

  // Localized content
  const content: Record<LanguageCode, Content> = {
    en: {
      welcome: 'Welcome to Calling',
      subtitle: 'Congratulations on taking one extra step towards your calling.',
      mascotMessage: "Hi there! I'm Atlas, and I'll be your gentle guide on this journey.",
      startButton: 'Start your journey',
      loginText: 'Already have an account?',
      loginLink: 'Login'
    },
    ru: {
      welcome: 'Добро пожаловать в Calling',
      subtitle: 'Поздравляем! Вы на правильном пути к наполненной жизни',
      mascotMessage: 'Привет! Я Атлас, твой добрый проводник в этом путешествии.',
      startButton: 'Начать путешествие',
      loginText: 'Уже есть аккаунт?',
      loginLink: 'Войти'
    },
  };

  const t = content[selectedLanguage];

  return (
    <PaperTextureBackground>
      <View style={styles.container}>
        <Image
          source={require('../assets/images/welcome.png')}
          pointerEvents="none"
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        {/* Keep orbs fixed; do not scroll with welcome content */}
        <View style={styles.backgroundElements} pointerEvents="none">
          <View style={styles.softGlow} />
          <Animated.View
            style={[
              styles.floatingOrb1,
              {
                transform: [
                  { translateY: orb1Y },
                  { translateX: orb1X },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.floatingOrb2,
              {
                transform: [
                  { translateY: orb2Y },
                  { translateX: orb2X },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.floatingOrb3,
              {
                transform: [
                  { translateY: orb3Y },
                  { translateX: orb3X },
                ],
              },
            ]}
          />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(24, insets.bottom + 20),
              minHeight: SCREEN_HEIGHT - insets.top - insets.bottom,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces
        >
        {/* Main Content */}
        <Animated.View 
          style={[
            styles.mainContent,
            {
              justifyContent: IS_SHORT_SCREEN || IS_NARROW_WIDTH ? 'flex-start' : 'center',
              paddingHorizontal: IS_NARROW_WIDTH ? 12 : 16,
              // Safe area + room below absolute language control (notch / Dynamic Island)
              paddingTop:
                insets.top +
                (IS_VERY_SHORT_SCREEN ? 56 : IS_SHORT_SCREEN ? 64 : IS_NARROW_WIDTH ? 72 : 84),
              paddingBottom: IS_VERY_SHORT_SCREEN ? 8 : IS_SHORT_SCREEN ? 12 : 24,
            },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Welcome Text */}
          <View
            style={[
              styles.welcomeSection,
              { width: CONTENT_WIDTH },
              (IS_SHORT_SCREEN || IS_NARROW_WIDTH) && {
                marginBottom: IS_VERY_SHORT_SCREEN ? 12 : IS_NARROW_WIDTH ? 14 : 18,
              },
            ]}
          >
            <Text
              style={[
                styles.welcomeTitle,
                selectedLanguage === 'ru' && styles.welcomeTitleRussian,
                IS_NARROW_WIDTH && styles.welcomeTitleNarrow,
                IS_VERY_NARROW_WIDTH && styles.welcomeTitleVeryNarrow,
              ]}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {t.welcome}
            </Text>
            <Text
              style={[
                styles.welcomeSubtitle,
                IS_NARROW_WIDTH && styles.welcomeSubtitleNarrow,
                IS_VERY_NARROW_WIDTH && styles.welcomeSubtitleVeryNarrow,
              ]}
              numberOfLines={4}
              adjustsFontSizeToFit
              minimumFontScale={0.88}
            >
              {t.subtitle}
            </Text>
          </View>

          {/* Deer Mascot Section */}
          <Animated.View 
            style={[
              styles.mascotSection,
              {
                opacity: mascotFadeAnim,
                transform: [
                  { translateY: mascotSlideAnim },
                  { scale: mascotScaleAnim },
                ],
              }
            ]}
          >
            {/* Speech Bubble */}
            <View
              style={[
                styles.speechBubble,
                { width: BUBBLE_WIDTH },
                (IS_SHORT_SCREEN || IS_NARROW_WIDTH) && { marginBottom: IS_NARROW_WIDTH ? 10 : 12 },
                IS_NARROW_WIDTH && { paddingHorizontal: 12 },
              ]}
            >
            <Text
              style={[
                styles.speechText,
                IS_NARROW_WIDTH && styles.speechTextNarrow,
                IS_VERY_NARROW_WIDTH && styles.speechTextVeryNarrow,
              ]}
              maxFontSizeMultiplier={1}
            >
                {t.mascotMessage}
              </Text>
              <View style={styles.speechTail} />
            </View>

            {/* Deer Image with Butterfly */}
            <Animated.View 
              style={[
                styles.mascotImageContainer,
                { transform: [{ scale: deerScaleAnim }] }
              ]}
            >
              <View style={styles.mascotGlow} />
              <View style={[styles.deerImageWrapper, { width: DEER_IMAGE_WIDTH, height: DEER_IMAGE_HEIGHT }]}>
                <Image 
                  source={require('../assets/images/anxious.png')}
                  style={{ width: DEER_IMAGE_WIDTH, height: DEER_IMAGE_HEIGHT }}
                  resizeMode="contain"
                />
                {/* Animated Butterfly on Deer's Nose */}
                <Animated.View
                  style={[
                    styles.butterfly,
                    {
                      top: DEER_IMAGE_HEIGHT * 0.4 + 20,
                      left: DEER_IMAGE_WIDTH * 0.5 - 10,
                      transform: [
                        { translateX: butterflyX },
                        { translateY: butterflyY },
                        {
                          rotate: butterflyRotation.interpolate({
                            inputRange: [-1, 1],
                            outputRange: ['-15deg', '15deg'],
                          }),
                        },
                        { scale: butterflyScale },
                      ],
                      opacity: butterflyOpacity,
                    },
                  ]}
                >
                  <Text style={styles.butterflyEmoji}>🦋</Text>
                </Animated.View>
              </View>
            </Animated.View>
          </Animated.View>
        </Animated.View>

        {/* Bottom Actions */}
        <Animated.View 
          style={[
            styles.bottomSection,
            { width: CONTENT_WIDTH },
            {
              paddingTop:
                IS_VERY_SHORT_SCREEN ? 8 : IS_SHORT_SCREEN ? 12 : IS_NARROW_WIDTH ? 14 : 20,
              paddingBottom:
                IS_VERY_SHORT_SCREEN ? 16 : IS_SHORT_SCREEN ? 24 : IS_NARROW_WIDTH ? 28 : 40,
            },
            {
              opacity: bottomFadeAnim,
              transform: [{ translateY: bottomSlideAnim }],
            }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.startButton,
              (IS_VERY_SHORT_SCREEN || IS_NARROW_WIDTH) && styles.startButtonCompact,
              IS_VERY_NARROW_WIDTH && styles.startButtonVeryNarrow,
            ]}
            activeOpacity={0.8}
            onPress={handleStartJourney}
          >
            <View style={styles.startButtonContent}>
              <Text
                style={styles.startButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                {t.startButton}
              </Text>
              <Text style={styles.startButtonArrow}>→</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.loginContainer, IS_COMPACT_LOGIN_ROW && styles.loginContainerStacked]}>
            <Text
              style={[
                styles.loginText,
                IS_COMPACT_LOGIN_ROW && styles.loginTextCompact,
                IS_VERY_NARROW_WIDTH && styles.loginTextVeryNarrow,
              ]}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {t.loginText}
            </Text>
            <TouchableOpacity
              style={[styles.loginLinkButton, IS_COMPACT_LOGIN_ROW && styles.loginLinkButtonStacked]}
              activeOpacity={0.7}
              onPress={() => router.push('/email-login')}
            >
              <Text
                style={[
                  styles.loginLink,
                  IS_COMPACT_LOGIN_ROW && styles.loginLinkCompact,
                  IS_VERY_NARROW_WIDTH && styles.loginLinkVeryNarrow,
                ]}
                maxFontSizeMultiplier={1.15}
              >
                {t.loginLink}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        </ScrollView>

      {/* Overlay to close language menu */}
      {showLanguageMenu && (
        <TouchableOpacity 
          style={styles.overlay}
          onPress={() => setShowLanguageMenu(false)}
          activeOpacity={1}
        />
      )}
      {/* Language selector stays above main content */}
      <View style={[styles.languageSelector, { top: insets.top + 10 }]}>
        <TouchableOpacity
          style={[styles.languageButton, { width: LANGUAGE_BUTTON_WIDTH }]}
          onPress={() => setShowLanguageMenu(!showLanguageMenu)}
          activeOpacity={0.8}
        >
          <Text
            style={styles.languageName}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {currentLanguage?.name}
          </Text>
          <MaterialIcons
            name="keyboard-arrow-down"
            size={16}
            color="#7A8A9A"
            style={{
              transform: [{ rotate: showLanguageMenu ? '180deg' : '0deg' }]
            }}
          />
        </TouchableOpacity>

        {/* Language Dropdown */}
        {showLanguageMenu && (
          <View style={styles.languageDropdown}>
            {languages.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  selectedLanguage === lang.code && styles.languageOptionSelected
                ]}
                onPress={() => handleLanguageChange(lang.code)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionName}>{lang.name}</Text>
                {selectedLanguage === lang.code && (
                  <MaterialIcons name="check" size={16} color="#342846" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
    </PaperTextureBackground>
  );
};

export default WelcomeScreen;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  scrollView: {
    flex: 1,
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Background Elements
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  softGlow: {
    position: 'absolute',
    top: -STYLE_SCREEN_WIDTH * 0.3,
    right: -STYLE_SCREEN_WIDTH * 0.3,
    width: STYLE_SCREEN_WIDTH * 0.6,
    height: STYLE_SCREEN_WIDTH * 0.6,
    backgroundColor: 'rgba(165,146,176,0.3)',
    borderRadius: STYLE_SCREEN_WIDTH * 0.3,
    aspectRatio: 1,
  },
  floatingOrb1: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(52,40,70,0.3)', // Changed to #342846
  },
  floatingOrb2: {
    position: 'absolute',
    top: '60%',
    right: '5%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(165,146,176,0.4)', // Changed to #a592b0
  },
  floatingOrb3: {
    position: 'absolute',
    bottom: '20%',
    left: '15%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(165,146,176,0.4)', // Changed to #a592b0
  },

  // Language Selector — `top` completed with safe area in JSX (insets.top)
  languageSelector: {
    position: 'absolute',
    right: 24,
    zIndex: 100,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    minWidth: Platform.isPad ? 140 : 150,
  },
  languageName: {
    fontFamily: Platform.select({
      ios: 'AnonymousPro-Regular',
      android: 'AnonymousPro-Regular',
      default: 'monospace',
    }),
    fontSize: 14,
    color: '#342846',
    marginRight: 6,
    flexShrink: 1,
    flexGrow: 1,
    textAlign: 'left',
  },
  languageDropdown: {
    position: 'absolute',
    top: '100%',
    marginTop: 8,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
    minWidth: 180,
    zIndex: 101,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  languageOptionSelected: {
    backgroundColor: '#F8F9FA',
  },
  optionName: {
    fontFamily: Platform.select({
      ios: 'AnonymousPro-Regular',
      android: 'AnonymousPro-Regular',
      default: 'monospace',
    }),
    fontSize: 14,
    color: '#342846',
    flex: 1,
  },

  // Main Content
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 110,
    paddingHorizontal: 16,
    paddingBottom: 24,
    zIndex: 10,
  },

  // Welcome Section
  welcomeSection: {
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontFamily: Platform.select({
      ios: 'DMSans_700Bold',
      android: 'DMSans_700Bold',
      default: 'sans-serif',
    }),
    fontSize: Platform.isPad ? 41.4 : 27.6,
    fontWeight: '700',
    color: '#342846',
    marginBottom: 16,
    letterSpacing: 0,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  welcomeTitleRussian: {
    letterSpacing: 0,
  },
  welcomeTitleNarrow: {
    fontSize: 24,
    marginBottom: 12,
  },
  welcomeTitleVeryNarrow: {
    fontSize: 22,
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontFamily: Platform.select({
      ios: 'AnonymousPro-Regular',
      android: 'AnonymousPro-Regular',
      default: 'monospace',
    }),
    fontSize: Platform.isPad ? 18 : 16,
    color: '#342846',
    lineHeight: Platform.isPad ? 28 : 24,
    alignSelf: 'center',
    textAlign: 'center',
    marginBottom: 12,
    flexShrink: 0,
    maxWidth: Platform.isPad ? 350 : undefined,
  },
  welcomeSubtitleNarrow: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 2,
  },
  welcomeSubtitleVeryNarrow: {
    fontSize: 14,
    lineHeight: 20,
  },
  butterflyEmoji: {
    fontSize: 32,
  },

  // Mascot Section
  mascotSection: {
    alignItems: 'center',
    alignSelf: 'stretch',
    overflow: 'visible',
  },
  speechBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignSelf: 'center',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(52,40,70,0.06)',
    position: 'relative',
    overflow: 'visible',
  },
  speechText: {
    fontFamily: Platform.select({
      ios: 'AnonymousPro-Regular',
      android: 'AnonymousPro-Regular',
      default: 'monospace',
    }),
    fontSize: Platform.isPad ? 18 : 15,
    color: '#342846',
    lineHeight: Platform.isPad ? 28 : 22,
    textAlign: 'center',
  },
  speechTextNarrow: {
    fontSize: 14,
    lineHeight: 20,
  },
  speechTextVeryNarrow: {
    fontSize: 13,
    lineHeight: 18,
  },
  speechTail: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    marginLeft: -12,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  mascotImageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -100,
    marginLeft: -100,
    width: 200,
    height: 200,
    backgroundColor: 'rgba(165,146,176,0.3)', // Changed to #a592b0
    borderRadius: 100,
  },
  deerImageWrapper: {
    // width/height applied inline using reactive DEER_IMAGE_WIDTH/HEIGHT
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  deerImage: {
    // width/height applied inline using reactive DEER_IMAGE_WIDTH/HEIGHT
  },
  butterfly: {
    position: 'absolute',
    // top/left applied inline using reactive DEER_IMAGE_WIDTH/HEIGHT
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Bottom Section
  bottomSection: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 20,
    paddingBottom: 48,
    zIndex: 10,
  },
  startButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: '#342846',
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 20,
  },
  startButtonCompact: {
    marginBottom: 12,
    paddingVertical: 14,
  },
  startButtonVeryNarrow: {
    paddingVertical: 12,
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
    maxWidth: '92%',
    alignSelf: 'center',
  },
  startButtonText: {
    ...BodyStyle,
    fontSize: Platform.isPad ? 18 : 16,
    color: '#FFFFFF',
    marginRight: 0,
    textAlign: 'center',
    flexShrink: 1,
  },
  startButtonArrow: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'nowrap',
    columnGap: 6,
    paddingHorizontal: 8,
  },
  loginContainerStacked: {
    flexDirection: 'column',
    rowGap: 6,
    columnGap: 0,
    paddingHorizontal: 12,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: '100%',
  },
  loginText: {
    fontFamily: Platform.select({
      ios: 'AnonymousPro-Regular',
      android: 'AnonymousPro-Regular',
      default: 'monospace',
    }),
    fontSize: 14,
    color: '#7A8A9A',
    textAlign: 'center',
    flexShrink: 1,
    marginRight: 0,
  },
  loginTextCompact: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 4,
    maxWidth: '100%',
    width: '100%',
    alignSelf: 'center',
  },
  loginTextVeryNarrow: {
    fontSize: 12,
    lineHeight: 17,
  },
  loginLinkButton: {
    paddingHorizontal: 2,
  },
  loginLinkButtonStacked: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  loginLink: {
    fontFamily: Platform.select({
      ios: 'BricolageGrotesque-Bold',
      android: 'DMSans_700Bold',
      default: 'sans-serif',
    }),
    fontSize: 14,
    fontWeight: '700',
    color: '#342846',
    textDecorationLine: 'underline',
  },
  loginLinkCompact: {
    fontSize: 15,
    textAlign: 'center',
    width: '100%',
  },
  loginLinkVeryNarrow: {
    fontSize: 14,
  },

  // Overlay
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
});
