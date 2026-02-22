import ClarityMap from '@/components/ClarityMap';
import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { trackReflectionEvent } from '@/utils/appTracking';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

export default function ClarityMapScreen() {
  const router = useRouter();
  const [key, setKey] = useState(0);

  // Reset component with fresh key whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      trackReflectionEvent('clarity_map_opened').catch((error) => {
        console.error('Error tracking clarity map open:', error);
      });
      setKey(prev => prev + 1);
    }, [])
  );

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback to home if can't go back
      router.push('/(tabs)/');
    }
  };

  return (
    <PaperTextureBackground>
      <View style={styles.container}>
        <ClarityMap key={key} onClose={handleClose} />
      </View>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
