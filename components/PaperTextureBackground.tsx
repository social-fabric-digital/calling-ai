import React from 'react';
import { StyleSheet, View, ViewStyle, Image } from 'react-native';

interface PaperTextureBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  opacity?: number;
  baseColor?: string;
}

export function PaperTextureBackground({ 
  children, 
  style,
  opacity = 1.0,
  baseColor = '#f5f2eb',
}: PaperTextureBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Base paper color - warm off-white with slight yellow/brown tint */}
      <View style={[styles.baseLayer, { backgroundColor: baseColor }]} />
      
      {/* Noise background image */}
      <Image
        source={require('../assets/images/noise.background.png')}
        style={[styles.backgroundImage, { opacity }]}
        resizeMode="cover"
      />
      
      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  baseLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  content: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
});
