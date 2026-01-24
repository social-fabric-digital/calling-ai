import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { saveMood } from '@/utils/moodStorage';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MoodSlider } from './MoodSlider';

// Brand colors
export const brandColors = {
  primary: '#342846',
  secondary: '#bfacca',
  text: '#342846',
  success: '#4CAF50',
};

interface MoodSelectorProps {
  showQuestion?: boolean;
  onMoodSaved?: () => void;
}

export function MoodSelector({ showQuestion = true, onMoodSaved }: MoodSelectorProps) {
  const [currentMoodText, setCurrentMoodText] = useState('Okay');
  const [currentEmoji, setCurrentEmoji] = useState('😐');
  const [currentValue, setCurrentValue] = useState(50);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const savedValueRef = useRef<number | null>(null);
  const lastMoodTextRef = useRef<string>('Okay'); // Track last mood for haptic feedback
  const saveButtonOpacity = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // Set loading to false on mount - parent handles checking for existing mood
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleMoodChange = (emoji: string, text: string, value: number) => {
    // Trigger light haptic when mood category changes
    if (text !== lastMoodTextRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      lastMoodTextRef.current = text;
    }
    
    setCurrentMoodText(text);
    setCurrentEmoji(emoji);
    setCurrentValue(value);
    
    // Only reset saved state if the value has actually changed from what was saved
    if (isSaved && savedValueRef.current !== null) {
      const valueChanged = Math.abs(value - savedValueRef.current) > 1;
      if (valueChanged) {
        setIsSaved(false);
        savedValueRef.current = null;
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
        Animated.spring(saveButtonOpacity, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const handleInteractionStart = () => {
    setHasInteracted(true);
  };

  // Animate save button appearance when user interacts (only if not already saved)
  useEffect(() => {
    if (hasInteracted && !isSaved && !isLoading) {
      Animated.spring(saveButtonOpacity, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [hasInteracted, isSaved, isLoading]);

  const handleSave = () => {
    if (isSaving) return;
    setIsSaving(true);
    
    // Save mood
    saveMood(currentEmoji, currentMoodText, currentValue)
      .then(() => {
        // Success haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setIsSaved(true);
        setIsSaving(false);
        setHasInteracted(false);
        savedValueRef.current = currentValue;
        
        // Notify parent that mood was saved
        if (onMoodSaved) {
          onMoodSaved();
        }
        
        // Reset animations
        saveButtonOpacity.setValue(0);
        successOpacity.setValue(0);
      })
      .catch((error) => {
        console.error('Error saving mood:', error);
        setIsSaving(false);
      });
  };

  const handleUpdateMood = () => {
    // Medium haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Allow user to update their mood by showing the slider again
    setIsSaved(false);
    setHasInteracted(true); // Show the slider
    savedValueRef.current = null;
    
    Animated.timing(successOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.spring(saveButtonOpacity, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  // Show loading state while checking for today's mood
  if (isLoading) {
    return (
      <View style={styles.container}>
        {showQuestion && (
          <Text style={styles.question}>How are you feeling today?</Text>
        )}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showQuestion && (
        <Text style={styles.question}>How are you feeling today?</Text>
      )}
      
      {/* The Slider - only show when not in saved state */}
      {!isSaved && (
        <>
          <View style={styles.sliderContainer}>
            <MoodSlider 
              onMoodChange={handleMoodChange}
              onInteractionStart={handleInteractionStart}
              initialValue={currentValue}
              showBalloon={hasInteracted}
            />
          </View>
          
          {/* Show selected mood text */}
          <Text style={styles.selectedMood}>
            {currentMoodText}
          </Text>
          
          {/* Save Button - appears after interaction */}
          {hasInteracted && (
            <Animated.View style={[styles.saveButtonContainer, { opacity: saveButtonOpacity }]}>
              <Pressable 
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.saveButtonPressed,
                ]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save Mood'}
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </>
      )}
      
      {/* Success State - show when saved */}
      {isSaved && (
        <Animated.View style={[styles.successContainer, { opacity: successOpacity }]}>
          <View style={styles.successBadge}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successText}>Mood logged for today!</Text>
          <Text style={styles.successSubtext}>
            You're feeling {currentMoodText.toLowerCase()} {currentEmoji}
          </Text>
          <Pressable 
            style={styles.updateButton}
            onPress={handleUpdateMood}
          >
            <Text style={styles.updateButtonText}>Update mood</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    width: '100%',
    paddingTop: 100,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  question: {
    ...HeadingStyle,
    fontSize: 24,
    color: brandColors.text,
    marginBottom: 50,
    textAlign: 'center',
  },
  sliderContainer: {
    width: '100%',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  selectedMood: {
    ...BodyStyle,
    marginTop: 15,
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.text,
  },
  saveButtonContainer: {
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 0,
  },
  saveButton: {
    backgroundColor: brandColors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    alignItems: 'center',
  },
  saveButtonPressed: {
    backgroundColor: '#2a1f38',
    transform: [{ scale: 0.98 }],
  },
  saveButtonText: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: brandColors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  successText: {
    ...HeadingStyle,
    fontSize: 16,
    color: brandColors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  successSubtext: {
    ...BodyStyle,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  updateButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  updateButtonText: {
    ...BodyStyle,
    fontSize: 14,
    color: brandColors.primary,
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#666',
  },
});
