import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
} from "react-native";
import { getHeadingFontFamily, Fonts } from "@/constants/theme";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const FOREST_BG  = require("@/assets/images/loading_forest.png");
const ATLAS_DEER = require("@/assets/images/full.deer.png");
const CLOUD_IMG  = require("@/assets/images/cloud.png");

const BRAND_PURPLE = "#342846";
const CLOUD_SIZE   = { width: 351, height: 220 };
const ATLAS_SIZE   = { width: 200, height: 320 };

interface AnimatedSplashScreenProps {
  progress: number;
  onFinish: () => void;
}

export default function AnimatedSplashScreen({
  progress,
  onFinish,
}: AnimatedSplashScreenProps) {
  const cloudX          = useSharedValue(-CLOUD_SIZE.width);
  const cloudY          = useSharedValue(0);
  const atlasOpacity    = useSharedValue(0);
  const atlasTranslateY = useSharedValue(40);
  const overlayOpacity  = useSharedValue(1);
  const progressDisplay = useSharedValue(0);
  const textOpacity     = useSharedValue(1);
  const scaleOut        = useSharedValue(1);

  // Cloud floating animation (loops forever)
  useEffect(() => {
    // 15s to cross — slow enough to stay on screen the full splash, slightly faster than before
    cloudX.value = -CLOUD_SIZE.width;
    cloudX.value = withRepeat(
      withTiming(SCREEN_WIDTH + CLOUD_SIZE.width, {
        duration: 15000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
    cloudY.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(14,  { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  // Smooth progress counter — tracks real progress quickly so the displayed
  // number stays close to the actual loading state
  useEffect(() => {
    const diff = progress - progressDisplay.value;
    const duration = Math.max(diff * 35, 300);
    progressDisplay.value = withTiming(progress, {
      duration,
      easing: Easing.linear,
    });
  }, [progress]);

  // Atlas reveal when the DISPLAYED number reaches 85 so the deer appears
  // at the same moment the cloud visually shows 85%
  useAnimatedReaction(
    () => progressDisplay.value >= 85,
    (isAt85, wasAt85) => {
      if (isAt85 && !wasAt85) {
        atlasOpacity.value = withTiming(1, { duration: 800 });
        atlasTranslateY.value = withTiming(0, {
          duration: 800,
          easing: Easing.out(Easing.back(1.2)),
        });
      }
    }
  );

  // Exit sequence at 100%
  const triggerExit = useCallback(() => {
    "worklet";
    runOnJS(onFinish)();
  }, [onFinish]);

  useEffect(() => {
    if (progress >= 100) {
      textOpacity.value = withDelay(400, withTiming(0, { duration: 300 }));
      scaleOut.value = withDelay(
        600,
        withTiming(1.15, { duration: 500, easing: Easing.in(Easing.quad) })
      );
      overlayOpacity.value = withDelay(
        700,
        withTiming(0, { duration: 500 }, (finished) => {
          if (finished) triggerExit();
        })
      );
    }
  }, [progress]);

  const cloudAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cloudX.value },
      { translateY: cloudY.value },
    ],
  }));

  const atlasAnimatedStyle = useAnimatedStyle(() => ({
    opacity: atlasOpacity.value,
    transform: [{ translateY: atlasTranslateY.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: scaleOut.value }],
  }));

  const percentTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, overlayAnimatedStyle]}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_PURPLE} />
      <Image source={FOREST_BG} style={styles.background} resizeMode="cover" />
      <View style={styles.gradientOverlay} />

      <Animated.View style={[styles.cloudWrapper, cloudAnimatedStyle]}>
        <Image source={CLOUD_IMG} style={styles.cloudImage} resizeMode="contain" />
        <Animated.View style={[styles.progressBadge, percentTextStyle]}>
          <ProgressText progress={progressDisplay} />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.atlasWrapper, atlasAnimatedStyle]}>
        <Image source={ATLAS_DEER} style={styles.atlasImage} resizeMode="contain" />
      </Animated.View>

      <Animated.View style={[styles.titleContainer, percentTextStyle]}>
        <Animated.Text style={styles.titleText}>CALLING</Animated.Text>
        <Animated.Text style={styles.subtitleText}>
          Preparing your sanctuary…
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

function ProgressText({ progress }: { progress: SharedValue<number> }) {
  const [display, setDisplay] = useState(0);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplay)(current);
      }
    },
    [progress]
  );

  return (
    <Animated.Text style={styles.progressText}>{display}%</Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: BRAND_PURPLE,
  },
  background: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "absolute",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
    backgroundColor: "rgba(52, 40, 70, 0.45)",
  },
  cloudWrapper: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.15,
    left: 0,
    width: CLOUD_SIZE.width,
    height: CLOUD_SIZE.height,
    alignItems: "center",
    justifyContent: "center",
  },
  cloudImage: {
    width: CLOUD_SIZE.width,
    height: CLOUD_SIZE.height,
  },
  progressBadge: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    top: CLOUD_SIZE.height * 0.28 + 10,
  },
  progressText: {
    fontFamily: getHeadingFontFamily(),
    fontSize: 28,
    fontWeight: "bold",
    color: BRAND_PURPLE,
    letterSpacing: 0,
  },
  atlasWrapper: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.18,
    alignSelf: "center",
    width: ATLAS_SIZE.width,
    height: ATLAS_SIZE.height,
  },
  atlasImage: {
    width: ATLAS_SIZE.width,
    height: ATLAS_SIZE.height,
  },
  titleContainer: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.08,
    alignSelf: "center",
    alignItems: "center",
  },
  titleText: {
    fontFamily: getHeadingFontFamily(),
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 1,
    textTransform: "uppercase",
    textShadowColor: "rgba(52, 40, 70, 0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitleText: {
    fontFamily: Fonts.subtitle,
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255,255,255,0.75)",
    marginTop: 8,
    letterSpacing: 1,
    textShadowColor: "rgba(52, 40, 70, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
