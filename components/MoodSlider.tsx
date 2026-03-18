import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { PanResponder, Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

// Helper function
const clamp = (a: number, min = 0, max = 1) => {
  "worklet";
  return Math.min(max, Math.max(min, a));
};

const hitSlop = {
  left: 25,
  bottom: 25,
  right: 25,
  top: 25,
};

export const layout = {
  spacing: 8,
  radius: 8,
  knobSize: 24,
  indicatorSize: 48,
};

// Brand colors
const brandColors = {
  primary: '#342846',
  light: '#34284655',
  dark: '#342846DD',
};

const isTabletIOS = Platform.OS === 'ios' && Platform.isPad;

// Mood emojis from lowest to highest sentiment
const getMoodEmoji = (value: number): string => {
  "worklet";
  if (value < 20) return '🌧';      // Very hard
  if (value < 40) return '🥀';      // Not great
  if (value < 60) return '🌱';      // Okay
  if (value < 80) return '🌳';      // Good
  return '🌟';                       // Great
};

const getMoodText = (value: number, isRussian: boolean): string => {
  if (value < 20) return isRussian ? 'Тяжело' : 'Very hard';
  if (value < 40) return isRussian ? 'Не очень' : 'Not great';
  if (value < 60) return isRussian ? 'Нормально' : 'Okay';
  if (value < 80) return isRussian ? 'Хорошо' : 'Good';
  return isRussian ? 'Отлично!' : 'Great!';
};

interface MoodSliderProps {
  onMoodChange?: (emoji: string, text: string, value: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  initialValue?: number;
  showBalloon?: boolean; // Control balloon visibility externally
}

export function MoodSlider({ 
  onMoodChange, 
  onInteractionStart,
  onInteractionEnd,
  initialValue = 50,
  showBalloon = false,
}: MoodSliderProps) {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const [sliderWidth, setSliderWidth] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState('🌱');
  const [hasInteracted, setHasInteracted] = useState(false);
  const lastNotifiedValueRef = useRef<number>(-1);
  const lastNotifiedEmojiRef = useRef<string>('');
  
  const x = useSharedValue(0);
  const progress = useSharedValue(initialValue);
  const isPanActive = useSharedValue(false);
  const hasUserInteracted = useSharedValue(false);

  // Initialize as soon as mounted so first drag is responsive.
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Update emoji when progress changes
  const updateEmoji = (roundedValue: number) => {
    const safeValue = Math.max(0, Math.min(100, roundedValue));
    const emoji = getMoodEmoji(safeValue);
    const text = getMoodText(safeValue, Boolean(isRussian));

    // Skip duplicate notifications to keep dragging smooth on JS thread.
    if (emoji === lastNotifiedEmojiRef.current && roundedValue === lastNotifiedValueRef.current) {
      return;
    }

    lastNotifiedEmojiRef.current = emoji;
    lastNotifiedValueRef.current = roundedValue;

    if (emoji !== currentEmoji) {
      setCurrentEmoji(emoji);
    }

    if (onMoodChange) {
      onMoodChange(emoji, text, roundedValue);
    }
  };

  // Notify parent when interaction starts
  const notifyInteractionStart = () => {
    if (onInteractionStart) {
      onInteractionStart();
    }

    // Track first interaction locally (used for UI state), but do not
    // gate parent notifications because each drag should disable parent scroll.
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  };

  // Update x position when slider width is known and component is ready
  useEffect(() => {
    if (sliderWidth > 0 && isReady) {
      const knobHalf = layout.knobSize / 2;
      const effectiveWidth = sliderWidth - layout.knobSize;
      // Map initialValue (0-100) to x position accounting for knob size
      const xPosition = knobHalf + (initialValue / 100) * effectiveWidth;
      x.value = xPosition;
      progress.value = initialValue;
    }
  }, [sliderWidth, isReady, initialValue]);

  // Calculate balloon visibility based on interaction or external control
  const balloonVisible = useDerivedValue(() => {
    return isPanActive.value || hasUserInteracted.value || showBalloon;
  });

  const knobScale = useDerivedValue(() => {
    return withSpring(balloonVisible.value ? 1 : 0);
  });

  // Notify JS only when rounded value changes (avoids per-frame bridge churn).
  useAnimatedReaction(
    () => Math.round(progress.value),
    (nextRounded, prevRounded) => {
      if (nextRounded !== prevRounded) {
        runOnJS(updateEmoji)(nextRounded);
      }
    }
  );

  // Create PanResponder for better gesture handling
  // Use refs to access current values in PanResponder callbacks
  const isReadyRef = useRef(isReady);
  const sliderWidthRef = useRef(sliderWidth);
  const gestureGrantedRef = useRef(false);
  const panStartKnobXRef = useRef(0);
  
  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);
  
  useEffect(() => {
    sliderWidthRef.current = sliderWidth;
  }, [sliderWidth]);

  const updateFromTouchX = (touchX: number) => {
    if (!Number.isFinite(touchX)) {
      return;
    }
    const currentWidth = sliderWidthRef.current;
    const knobHalf = layout.knobSize / 2;
    const minX = knobHalf;
    const maxX = currentWidth - knobHalf;
    const clampedX = Math.max(minX, Math.min(maxX, touchX));

    x.value = clampedX;

    // Calculate progress: map from [minX, maxX] to [0, 100]
    const effectiveWidth = maxX - minX;
    const progressValue = effectiveWidth > 0 ? ((clampedX - minX) / effectiveWidth) * 100 : 50;
    progress.value = Math.max(0, Math.min(100, progressValue));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Once gesture is granted, always capture movement for smooth sliding
        if (gestureGrantedRef.current) {
          return true;
        }
        // Capture if horizontal movement is detected or if movement is small (for taps)
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy) || Math.abs(dx) > 3;
      },
      onStartShouldSetPanResponderCapture: () => true, // Capture gesture before ScrollView can handle it
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        // Once gesture is granted, always capture movement
        if (gestureGrantedRef.current) {
          return true;
        }
        // Capture if horizontal movement is detected (slider interaction)
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy) || Math.abs(dx) > 3;
      },
      onPanResponderGrant: (evt) => {
        if (!isReadyRef.current || sliderWidthRef.current === 0) return;
        gestureGrantedRef.current = true;
        isPanActive.value = true;
        hasUserInteracted.value = true;
        notifyInteractionStart();

        panStartKnobXRef.current = x.value;

        // Snap immediately to tap location when available.
        const localTouchX = evt.nativeEvent?.locationX;
        if (typeof localTouchX === 'number' && Number.isFinite(localTouchX)) {
          updateFromTouchX(localTouchX);
          panStartKnobXRef.current = localTouchX;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isReadyRef.current || sliderWidthRef.current === 0) return;
        const nextX = panStartKnobXRef.current + gestureState.dx;
        updateFromTouchX(nextX);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderRelease: () => {
        gestureGrantedRef.current = false;
        isPanActive.value = false;
        x.value = withSpring(x.value, { damping: 20, stiffness: 280, mass: 0.25 });
        progress.value = withSpring(progress.value, { damping: 20, stiffness: 280, mass: 0.25 });
        // Keep hasUserInteracted true so balloon stays visible
        if (onInteractionEnd) {
          onInteractionEnd();
        }
      },
      onPanResponderTerminate: () => {
        gestureGrantedRef.current = false;
        isPanActive.value = false;
        x.value = withSpring(x.value, { damping: 20, stiffness: 280, mass: 0.25 });
        progress.value = withSpring(progress.value, { damping: 20, stiffness: 280, mass: 0.25 });
        if (onInteractionEnd) {
          onInteractionEnd();
        }
      },
    })
  ).current;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      borderWidth: interpolate(
        knobScale.value,
        [0, 1],
        [layout.knobSize / 2, 2],
        Extrapolation.CLAMP
      ),
      transform: [
        {
          translateX: x.value,
        },
        {
          scale: knobScale.value + 1,
        },
      ],
    };
  });

  const ballonSpringyX = useDerivedValue(() => {
    return withSpring(x.value);
  });

  const ballonAngle = useDerivedValue(() => {
    return (
      90 +
      (Math.atan2(-layout.indicatorSize * 2, ballonSpringyX.value - x.value) *
        180) /
        Math.PI
    );
  });

  const ballonStyle = useAnimatedStyle(() => {
    return {
      opacity: knobScale.value,
      transform: [
        { translateX: ballonSpringyX.value },
        { scale: knobScale.value },
        {
          translateY: interpolate(
            knobScale.value,
            [0, 1],
            [0, -layout.indicatorSize]
          ),
        },
        {
          rotate: `${ballonAngle.value}deg`,
        },
      ],
    };
  });

  const progressStyle = useAnimatedStyle(() => {
    // Progress bar should extend to the center of the knob
    // Since knob is centered on x, progress width is x.value
    return {
      width: x.value,
    };
  });

  const sliderRef = useRef<View>(null);
  
  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setSliderWidth(width);
    }
  };

  if (!isReady) {
    return <View style={styles.sliderWrapper} />;
  }

  return (
    <View 
      ref={sliderRef}
      style={styles.sliderWrapper}
      onLayout={handleLayout}
      hitSlop={hitSlop}
      {...panResponder.panHandlers}
      collapsable={false}
    >
      <View 
        style={styles.slider}
      >
        <Animated.View style={[styles.ballon, ballonStyle]}>
          <View style={styles.textContainer}>
            <Text style={styles.emojiText}>{currentEmoji}</Text>
          </View>
        </Animated.View>
        <Animated.View style={[styles.progress, progressStyle]} />
        <Animated.View style={[styles.knob, animatedStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderWrapper: {
    width: "100%",
    height: isTabletIOS ? 72 : 56, // Give iPad a larger touch target
    justifyContent: "center",
    alignItems: "center",
  },
  knob: {
    width: layout.knobSize,
    height: layout.knobSize,
    borderRadius: layout.knobSize / 2,
    backgroundColor: "#fff",
    borderWidth: layout.knobSize / 2,
    borderColor: brandColors.primary,
    position: "absolute",
    left: -layout.knobSize / 2,
  },
  slider: {
    width: "100%",
    backgroundColor: brandColors.light,
    height: 5,
    justifyContent: "center",
  },
  textContainer: {
    width: 50,
    height: 70,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: brandColors.primary,
    position: "absolute",
    top: -layout.knobSize,
  },
  emojiText: {
    fontSize: 28,
    color: "white",
  },
  ballon: {
    alignItems: "center",
    justifyContent: "center",
    width: 4,
    height: layout.indicatorSize,
    bottom: -layout.knobSize / 2,
    borderRadius: 2,
    backgroundColor: brandColors.primary,
    position: "absolute",
  },
  progress: {
    height: 5,
    backgroundColor: brandColors.dark,
    position: "absolute",
  },
});
