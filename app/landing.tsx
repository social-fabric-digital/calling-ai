import LoginBottomSheet from '@/components/LoginBottomSheet';
import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle, SubtitleStyle } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH * 0.85 * 1.25 * 0.75; // Reduced by 25% (from previous size)
const IMAGE_HEIGHT = IMAGE_WIDTH * (180 / 220); // Maintain aspect ratio
const BUTTON_WIDTH = SCREEN_WIDTH - 50; // 25px padding on each side

export default function LandingScreen() {
  const { t, i18n } = useTranslation();
  
  // Debug: Log current language
  useEffect(() => {
    console.log('LandingScreen - Current language:', i18n.language);
  }, [i18n.language]);
  const router = useRouter();
  const [showLoginSheet, setShowLoginSheet] = useState(false);

  // Landing page - only first screen now (second screen moved to features-intro)
  const currentPageData = useMemo(() => ({
    title: t('landing.welcomeTitle'),
    subtitle: t('landing.welcomeSubtitle'),
    showImage: true,
  }), [t, i18n.language]);
  
  // Butterfly animation values
  const butterflyX = useRef(new Animated.Value(0)).current;
  const butterflyY = useRef(new Animated.Value(0)).current;
  const butterflyRotation = useRef(new Animated.Value(0)).current;
  const butterflyOpacity = useRef(new Animated.Value(1)).current;
  const butterflyScale = useRef(new Animated.Value(1)).current;
  
  // Butterfly flying animation - continuous loop
  useEffect(() => {
    if (currentPageData.showImage) {
      // Reset butterfly position to deer's nose area (center of image, slightly up)
      butterflyX.setValue(0);
      butterflyY.setValue(0); // Start at nose position (relative to butterfly container)
      butterflyRotation.setValue(0);
      butterflyOpacity.setValue(1);
      butterflyScale.setValue(1);
      
      // Continuous fluttering rotation
      const flutterAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(butterflyRotation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(butterflyRotation, {
            toValue: -1,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Continuous flying path - loops infinitely
      const flyPathAnimation = Animated.loop(
        Animated.parallel([
          // Move in a curved path (up and to the right, then reset)
          Animated.sequence([
            Animated.parallel([
              Animated.timing(butterflyX, {
                toValue: SCREEN_WIDTH * 0.4, // Fly to the right
                duration: 3000,
                useNativeDriver: true,
              }),
              Animated.timing(butterflyY, {
                toValue: -SCREEN_HEIGHT * 0.6, // Fly upward
                duration: 3000,
                useNativeDriver: true,
              }),
              Animated.timing(butterflyScale, {
                toValue: 0.7,
                duration: 3000,
                useNativeDriver: true,
              }),
            ]),
            // Fade out near the end
            Animated.parallel([
              Animated.timing(butterflyOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }),
            ]),
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
          ]),
        ])
      );
      
      flutterAnimation.start();
      flyPathAnimation.start();
      
      return () => {
        flutterAnimation.stop();
        flyPathAnimation.stop();
      };
    }
  }, [currentPageData]);

  return (
    <>
      <PaperTextureBackground>
        <View style={styles.container}>
          <Text style={styles.title}>
            {currentPageData.title}
          </Text>
          <Text style={styles.subtitle}>
            {currentPageData.subtitle}
          </Text>
          
          {currentPageData.showImage && (
            <View style={styles.imageContainer}>
              <Image 
                source={require('../assets/images/deer.face.png')}
                style={styles.image}
                resizeMode="contain"
              />
              {/* Animated Butterfly */}
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
          )}
        
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => router.push('/features-intro')}
          >
            <Text style={styles.buttonText}>{t('landing.startJourney')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={() => setShowLoginSheet(true)}
          >
            <Text style={styles.loginButtonText}>
              {t('landing.alreadyHaveAccount')} <Text style={styles.loginBold}>{t('landing.login')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      </PaperTextureBackground>
      <LoginBottomSheet 
        visible={showLoginSheet} 
        onClose={() => setShowLoginSheet(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  title: {
    ...HeadingStyle,
    position: 'absolute',
    top: 100,
    left: 25,
    right: 25,
    color: '#342846',
    textAlign: 'center',
    zIndex: 1,
  },
  subtitle: {
    ...SubtitleStyle,
    position: 'absolute',
    top: 234,
    left: 25,
    right: 25,
    color: '#342846',
    textAlign: 'center',
    zIndex: 1,
  },
  imageContainer: {
    position: 'absolute',
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    alignSelf: 'center',
    top: '50%',
    marginTop: -IMAGE_HEIGHT / 2, // Center vertically
  },
  image: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  },
  butterfly: {
    position: 'absolute',
    top: IMAGE_HEIGHT * 0.4 + 20, // Position near deer's nose area, moved down 20px
    left: IMAGE_WIDTH * 0.5 - 10, // Center horizontally, moved left 10px
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10, // Ensure butterfly appears on top of the image
  },
  butterflyEmoji: {
    fontSize: 32,
  },
  indicatorContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    bottom: 200, // Position well above the footer buttons
    left: 0,
    right: 0,
    zIndex: 100, // Higher z-index to ensure visibility above cards
    gap: 12,
  },
  indicatorCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
  },
  indicatorCircleActive: {
    backgroundColor: '#baccd7',
    borderColor: '#342846',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    paddingHorizontal: 25,
    alignItems: 'center',
    zIndex: 1,
  },
  button: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 19,
    paddingHorizontal: 40,
    width: BUTTON_WIDTH,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    textAlign: 'center',
    fontSize: 15,
  },
  loginButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    ...BodyStyle,
    color: '#342846',
  },
  loginBold: {
    fontFamily: 'AnonymousPro-Bold',
    fontWeight: 'bold',
  },
});

