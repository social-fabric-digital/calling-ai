import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type SkyBackgroundProps = {
  children: React.ReactNode;
  showClouds?: boolean;
};

type CloudPattern = {
  offsetMs: number;
  cycleMs: number;
  yPercent: number;
  width: number;
  height: number;
  opacity: number;
};

const FRAME_MS = 120;
const CLOUD_PATTERNS: CloudPattern[] = [
  { offsetMs: 0, cycleMs: 72_000, yPercent: 18, width: 120, height: 44, opacity: 0.2 },
  { offsetMs: 24_000, cycleMs: 88_000, yPercent: 25, width: 150, height: 54, opacity: 0.18 },
  { offsetMs: 46_000, cycleMs: 96_000, yPercent: 32, width: 110, height: 40, opacity: 0.16 },
];

export default function SkyBackground({ children, showClouds = false }: SkyBackgroundProps) {
  const [tickCount, setTickCount] = useState(0);

  useEffect(() => {
    if (!showClouds) return;

    const intervalId = setInterval(() => {
      setTickCount((value) => value + 1);
    }, FRAME_MS);

    return () => clearInterval(intervalId);
  }, [showClouds]);

  const nowMs = Date.now();

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/home.png')}
        style={styles.skyImage}
        resizeMode="cover"
      />
      {showClouds && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {CLOUD_PATTERNS.map((cloud, index) => {
            const cycle = (nowMs + cloud.offsetMs) % cloud.cycleMs;
            const t = cycle / cloud.cycleMs;
            const xPercent = -30 + t * 160;
            const bobY = Math.sin(tickCount * 0.06 + index) * 2;

            return (
              <Image
                key={`cloud-${index}`}
                source={require('../assets/images/cloud.png')}
                style={[
                  {
                    left: `${xPercent}%`,
                    top: `${cloud.yPercent}%`,
                    width: cloud.width,
                    height: cloud.height,
                    opacity: cloud.opacity,
                    transform: [{ translateY: bobY }],
                    position: 'absolute',
                  },
                ]}
                resizeMode="contain"
              />
            );
          })}
        </View>
      )}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.42)']}
        locations={[0, 0.62, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomDarkOverlay}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skyImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  bottomDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
