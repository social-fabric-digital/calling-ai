import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { hapticLight, hapticMedium } from '@/utils/haptics';
import { PledgeStepProps } from './types';
import { styles } from './styles';

function PledgeStep({ name, signature, setSignature, onNext }: PledgeStepProps) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(name || '');
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const currentPathRef = useRef('');

  // Sync displayName with name prop immediately when it changes
  useEffect(() => {
    if (name && name.trim()) {
      setDisplayName(name.trim());
    }
  }, [name]);

  // Load name from AsyncStorage if prop is empty
  useEffect(() => {
    const loadName = async () => {
      // Only load from AsyncStorage if name prop is empty
      if (!name || !name.trim()) {
        try {
          const savedName = await AsyncStorage.getItem('userName');
          if (savedName && savedName.trim()) {
            setDisplayName(savedName.trim());
          }
        } catch (error) {
          // Error loading name - continue without saved name
        }
      }
    };
    loadName();
  }, [name]);
  
  // Also check AsyncStorage on component mount
  useEffect(() => {
    const checkAsyncStorage = async () => {
      if (!displayName || !displayName.trim()) {
        try {
          const savedName = await AsyncStorage.getItem('userName');
          if (savedName && savedName.trim()) {
            setDisplayName(savedName.trim());
          }
        } catch (error) {
          // Error loading name - continue without saved name
        }
      }
    };
    checkAsyncStorage();
  }, []);

  // Sync paths to parent signature in an effect to avoid setState-during-render
  useEffect(() => {
    const payload =
      paths.length > 0
        ? JSON.stringify({ type: 'rn-path-signature', version: 1, paths })
        : '';
    setSignature(payload);
  }, [paths, setSignature]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const nextPath = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          currentPathRef.current = nextPath;
          setCurrentPath(nextPath);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const nextPath = `${currentPathRef.current} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          currentPathRef.current = nextPath;
          setCurrentPath(nextPath);
        },
        onPanResponderRelease: () => {
          const finalizedPath = currentPathRef.current;
          if (finalizedPath.includes(' L ')) {
            setPaths((prev) => [...prev, finalizedPath]);
          }
          currentPathRef.current = '';
          setCurrentPath('');
        },
        onPanResponderTerminate: () => {
          currentPathRef.current = '';
          setCurrentPath('');
        },
      }),
    []
  );

  return (
    <View style={[styles.pledgeContainer, styles.pledgeContentContainer]}>
      <Text style={styles.pledgeTitle}>{t('onboarding.step3Title')}</Text>
      <View style={styles.pledgeContent}>
        <Text style={styles.pledgeText}>
          {t('onboarding.pledgeText', { 
            name: (name && name.trim()) 
              ? name.trim() 
              : ((displayName && displayName.trim())
                  ? displayName.trim() 
                  : t('onboarding.pledgeNamePlaceholder'))
          })}
        </Text>
        <Text style={styles.pledgeSubtext}>
          {t('onboarding.pledgeSubtext')}
        </Text>
        
        {/* Signature Field */}
        <View style={styles.signatureContainer}>
          <View
            style={[styles.signatureWrapper, localStyles.signaturePad]}
            pointerEvents="auto"
            {...panResponder.panHandlers}
          >
            {paths.length === 0 && !currentPath ? (
              <View pointerEvents="none" style={localStyles.placeholderWrap}>
                <Text style={localStyles.placeholderText}>
                  {t('onboarding.signHere', { defaultValue: 'Sign here with your finger' })}
                </Text>
              </View>
            ) : null}

            <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%" pointerEvents="none">
              {paths.map((pathD, index) => (
                <Path
                  key={`path-${index}`}
                  d={pathD}
                  stroke="#342846"
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentPath ? (
                <Path
                  d={currentPath}
                  stroke="#342846"
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </Svg>
          </View>
          <TouchableOpacity
            style={localStyles.clearButton}
            onPress={() => {
              void hapticLight();
              setPaths([]);
              setCurrentPath('');
              currentPathRef.current = '';
              setSignature('');
            }}
          >
            <Text style={localStyles.clearButtonText}>{t('common.clear', { defaultValue: 'Clear' })}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Step-local CTA avoids z-index/footer overlay conflicts on iOS. */}
      <View style={{ paddingHorizontal: 40, paddingBottom: 40, paddingTop: 24 }}>
        <TouchableOpacity
          style={styles.continueButton}
          onPressIn={() => {
            void hapticMedium();
          }}
          onPress={() => {
            onNext();
          }}
        >
          <Text style={styles.continueButtonText}>{t('common.iVow')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default PledgeStep;

const localStyles = StyleSheet.create({
  signaturePad: {
    borderWidth: 1,
    borderColor: '#d6d0dd',
    zIndex: 5,
  },
  placeholderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#8e849b',
    fontSize: 14,
  },
  clearButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#342846',
    backgroundColor: '#fff',
  },
  clearButtonText: {
    color: '#342846',
    fontSize: 14,
  },
});
