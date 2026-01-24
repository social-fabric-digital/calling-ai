import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
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

// Mood emojis from lowest to highest sentiment
const getMoodEmoji = (value: number): string => {
  "worklet";
  if (value < 20) return '😢';      // Very sad
  if (value < 40) return '😞';      // Sad
  if (value < 60) return '😐';      // Neutral/Okay
  if (value < 80) return '🙂';      // Happy
  return '😊';                       // Very happy
};

const getMoodText = (value: number): string => {
  if (value < 20) return 'Not Great';
  if (value < 40) return 'Not Good';
  if (value < 60) return 'Okay';
  if (value < 80) return 'Good';
  return 'Great!';
};

interface MoodSliderProps {
  onMoodChange?: (emoji: string, text: string, value: number) => void;
  onInteractionStart?: () => void;
  initialValue?: number;
  showBalloon?: boolean; // Control balloon visibility externally
}

export function MoodSlider({ 
  onMoodChange, 
  onInteractionStart,
  initialValue = 50,
  showBalloon = false,
}: MoodSliderProps) {
  const [sliderWidth, setSliderWidth] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState('😐');
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const x = useSharedValue(0);
  const progress = useSharedValue(initialValue);
  const isPanActive = useSharedValue(false);
  const hasUserInteracted = useSharedValue(false);

  // Initialize after mount with delay for navigation safety
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Update emoji when progress changes
  const updateEmoji = (value: number) => {
    const emoji = getMoodEmoji(value);
    const text = getMoodText(value);
    setCurrentEmoji(emoji);
    if (onMoodChange) {
      onMoodChange(emoji, text, value);
    }
  };

  // Notify parent when interaction starts
  const notifyInteractionStart = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      if (onInteractionStart) {
        onInteractionStart();
      }
    }
  };

  // Update x position when slider width is known and component is ready
  useEffect(() => {
    if (sliderWidth > 0 && isReady) {
      x.value = (initialValue / 100) * sliderWidth;
    }
  }, [sliderWidth, isReady, initialValue]);

  // Calculate balloon visibility based on interaction or external control
  const balloonVisible = useDerivedValue(() => {
    return isPanActive.value || hasUserInteracted.value || showBalloon;
  });

  const knobScale = useDerivedValue(() => {
    return withSpring(balloonVisible.value ? 1 : 0);
  });

  // Update emoji reactively
  useDerivedValue(() => {
    runOnJS(updateEmoji)(progress.value);
  });

  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .onBegin(() => {
      if (!isReady) return;
      isPanActive.value = true;
      hasUserInteracted.value = true;
      runOnJS(notifyInteractionStart)();
    })
    .onChange((ev) => {
      if (!isReady || sliderWidth === 0) return;
      const newX = clamp(x.value + ev.changeX, 0, sliderWidth);
      x.value = newX;
      progress.value = 100 * (newX / sliderWidth);
    })
    .onEnd(() => {
      isPanActive.value = false;
      // Keep hasUserInteracted true so balloon stays visible
    });

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
    return {
      width: x.value,
    };
  });

  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setSliderWidth(width);
  };

  if (!isReady) {
    return <View style={styles.slider} />;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View 
        style={styles.slider} 
        hitSlop={hitSlop}
        onLayout={handleLayout}
      >
        <Animated.View style={[styles.ballon, ballonStyle]}>
          <View style={styles.textContainer}>
            <Text style={styles.emojiText}>{currentEmoji}</Text>
          </View>
        </Animated.View>
        <Animated.View style={[styles.progress, progressStyle]} />
        <Animated.View style={[styles.knob, animatedStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
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
    width: "90%",
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
