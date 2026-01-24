import { BodyStyle, HeadingStyle } from '@/constants/theme';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 350; // Approximate height of the sheet

interface LoginBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function LoginBottomSheet({ visible, onClose }: LoginBottomSheetProps) {
  const { t } = useTranslation();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward swipes
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose = gestureState.dy > 100 || gestureState.vy > 0.5;
        
        if (shouldClose) {
          closeSheet();
        } else {
          // Snap back to open position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      // Reset position
      translateY.setValue(SHEET_HEIGHT);
      backdropOpacity.setValue(0);
      
      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleSignInWithApple = () => {
    // TODO: Implement Apple sign in
    console.log('Sign in with Apple');
    closeSheet();
  };

  const handleSignInWithGoogle = () => {
    // TODO: Implement Google sign in
    console.log('Sign in with Google');
    closeSheet();
  };

  const handleSignInWithEmail = () => {
    // TODO: Implement email sign in
    console.log('Sign in with Email');
    closeSheet();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: backdropOpacity,
          },
        ]}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={closeSheet}
        />
      </Animated.View>
      
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>
        
        <Text style={styles.title}>{t('loginBottomSheet.signIn')}</Text>
        
        <TouchableOpacity 
          style={[styles.button, styles.appleButton]} 
          onPress={handleSignInWithApple}
        >
          <Text style={styles.buttonText}>{t('loginBottomSheet.signInWithApple')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.googleButton]} 
          onPress={handleSignInWithGoogle}
        >
          <Text style={styles.buttonText}>{t('loginBottomSheet.signInWithGoogle')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.emailButton]} 
          onPress={handleSignInWithEmail}
        >
          <Text style={styles.buttonText}>{t('loginBottomSheet.signInWithEmail')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: '80%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
  },
  title: {
    ...HeadingStyle,
    color: '#342846',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  emailButton: {
    backgroundColor: '#342846',
  },
  buttonText: {
    ...BodyStyle,
    color: '#fff',
    fontWeight: '600',
  },
});
