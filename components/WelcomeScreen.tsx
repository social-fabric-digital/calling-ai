import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle } from '@/constants/theme';
import { changeLanguage } from '@/utils/i18n';
import * as superwallUtils from '@/utils/superwall';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Dimensions, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEER_IMAGE_WIDTH = SCREEN_WIDTH * 0.85 * 1.25 * 0.75 * 0.85; // Reduced by 15%
const DEER_IMAGE_HEIGHT = DEER_IMAGE_WIDTH * (180 / 220); // Maintain aspect ratio

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
    { code: 'en' as LanguageCode, name: 'English', flag: '🇬🇧' },
    { code: 'ru' as LanguageCode, name: 'Русский', flag: '🇷🇺' },
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
      welcome: 'WELCOME TO CALLING',
      subtitle: 'Congratulations on taking one extra step towards your calling.',
      mascotMessage: "Hi there! I'm Atlas, and I'll be your gentle guide on this journey of self-discovery.",
      startButton: 'Start my journey',
      loginText: 'Already have an account?',
      loginLink: 'Login'
    },
    ru: {
      welcome: 'ДОБРО ПОЖАЛОВАТЬ В ПРЕДНАЗНАЧЕНИЕ',
      subtitle: 'Поздравляем! Вы сделали ещё один шаг к своему предназначению.',
      mascotMessage: 'Привет! Я Атлас, и я буду твоим добрым проводником в этом путешествии самопознания.',
      startButton: 'Начать путешествие',
      loginText: 'Уже есть аккаунт?',
      loginLink: 'Войти'
    },
  };

  const t = content[selectedLanguage];

  return (
    <PaperTextureBackground>
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Subtle background texture and elements */}
        <View style={styles.backgroundElements}>
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

        {/* Main Content */}
        <Animated.View 
          style={[
            styles.mainContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Welcome Text */}
          <View style={styles.welcomeSection}>
            <Text style={[styles.welcomeTitle, selectedLanguage === 'ru' && styles.welcomeTitleRussian]}>{t.welcome}</Text>
            <Text style={styles.welcomeSubtitle}>{t.subtitle}</Text>
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
            <View style={styles.speechBubble}>
              <Text style={styles.speechText}>{t.mascotMessage}</Text>
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
              <View style={styles.deerImageWrapper}>
                <Image 
                  source={require('../assets/images/deer.face.png')}
                  style={styles.deerImage}
                  resizeMode="contain"
                />
                {/* Animated Butterfly on Deer's Nose */}
                <Animated.View
                  style={[
                    styles.butterfly,
                    {
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
            {
              opacity: bottomFadeAnim,
              transform: [{ translateY: bottomSlideAnim }],
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.startButton} 
            activeOpacity={0.8}
            onPress={handleStartJourney}
          >
            <Text style={styles.startButtonText}>{t.startButton}</Text>
            <Text style={styles.startButtonArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>
              {t.loginText}{' '}
            </Text>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => router.push('/email-login')}
            >
              <Text style={styles.loginLink}>{t.loginLink}</Text>
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
      {/* Language Selector - keep outside ScrollView so overlay can't intercept options */}
      <View style={styles.languageSelector}>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setShowLanguageMenu(!showLanguageMenu)}
          activeOpacity={0.8}
        >
          <Text style={styles.languageFlag}>{currentLanguage?.flag}</Text>
          <Text style={styles.languageName}>{currentLanguage?.name}</Text>
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
                <Text style={styles.optionFlag}>{lang.flag}</Text>
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
  scrollContent: {
    flexGrow: 1,
    minHeight: '100%',
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
    top: -SCREEN_WIDTH * 0.3,
    right: -SCREEN_WIDTH * 0.3,
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6, // Same as width to ensure it's a circle
    backgroundColor: 'rgba(165,146,176,0.3)', // Changed to #a592b0
    borderRadius: SCREEN_WIDTH * 0.3, // Half of width/height to make perfect circle
    aspectRatio: 1, // Ensure it stays a circle
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

  // Language Selector
  languageSelector: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 100,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  languageFlag: {
    fontSize: 18,
    marginRight: 8,
  },
  languageName: {
    fontFamily: Platform.select({
      ios: 'AnonymousPro-Regular',
      android: 'AnonymousPro-Regular',
      default: 'monospace',
    }),
    fontSize: 14,
    color: '#342846',
    marginRight: 8,
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
  optionFlag: {
    fontSize: 20,
    marginRight: 12,
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
    paddingTop: 100,
    paddingHorizontal: 24,
    paddingBottom: 24,
    zIndex: 10,
  },

  // Welcome Section
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontFamily: Platform.select({
      ios: 'BricolageGrotesque-Bold',
      android: 'BricolageGrotesque-Bold',
      default: 'sans-serif',
    }),
    fontSize: 28,
    fontWeight: '700',
    color: '#342846',
    marginBottom: 16,
    letterSpacing: 1,
    textAlign: 'center',
  },
  welcomeTitleRussian: {
    letterSpacing: 0,
  },
  welcomeSubtitle: {
    fontFamily: Platform.select({
      ios: 'AnonymousPro-Regular',
      android: 'AnonymousPro-Regular',
      default: 'monospace',
    }),
    fontSize: 16,
    color: '#7A8A9A',
    lineHeight: 22.8, // Reduced by 5% from 24px (24 * 0.95 = 22.8)
    maxWidth: 300,
    textAlign: 'center',
    marginBottom: 12,
  },
  butterflyEmoji: {
    fontSize: 32,
  },

  // Mascot Section
  mascotSection: {
    alignItems: 'center',
  },
  speechBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    maxWidth: 280,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52,40,70,0.06)',
    position: 'relative',
  },
  speechText: {
    fontFamily: Platform.select({
      ios: 'AnonymousPro-Regular',
      android: 'AnonymousPro-Regular',
      default: 'monospace',
    }),
    fontSize: 14,
    color: '#342846',
    lineHeight: 20.9, // Reduced by 5% from 22px (22 * 0.95 = 20.9)
    textAlign: 'center',
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
    width: DEER_IMAGE_WIDTH,
    height: DEER_IMAGE_HEIGHT,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  deerImage: {
    width: DEER_IMAGE_WIDTH,
    height: DEER_IMAGE_HEIGHT,
  },
  butterfly: {
    position: 'absolute',
    top: DEER_IMAGE_HEIGHT * 0.4 + 20, // Position near deer's nose area, moved down 20px
    left: DEER_IMAGE_WIDTH * 0.5 - 10, // Center horizontally, moved left 10px
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10, // Ensure butterfly appears on top of the image
  },

  // Bottom Section
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    zIndex: 10,
  },
  startButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
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
  startButtonText: {
    ...ButtonHeadingStyle,
    color: '#FFFFFF',
    marginRight: 12,
    lineHeight: 18,
  },
  startButtonArrow: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  loginLink: {
    fontFamily: Platform.select({
      ios: 'BricolageGrotesque-SemiBold',
      android: 'BricolageGrotesque-SemiBold',
      default: 'sans-serif',
    }),
    fontSize: 14,
    fontWeight: '600',
    color: '#342846',
    textDecorationLine: 'underline',
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
