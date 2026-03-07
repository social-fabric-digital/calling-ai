import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, UIManager, View } from 'react-native';

const supportsBlurView = Boolean(UIManager.getViewManagerConfig?.('ExpoBlurView'));

interface FrostedCardLayerProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  fallbackColor?: string;
}

export function FrostedCardLayer({
  intensity = 90,
  tint = 'light',
  fallbackColor = 'rgba(255, 255, 255, 0.3)',
}: FrostedCardLayerProps) {
  if (supportsBlurView) {
    return (
      <BlurView
        intensity={intensity}
        tint={tint}
        style={styles.fill}
        pointerEvents="none"
        experimentalBlurMethod="dimezisBlurView"
      />
    );
  }

  return <View pointerEvents="none" style={[styles.fallback, { backgroundColor: fallbackColor }]} />;
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
});
