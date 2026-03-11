import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

export type WalkthroughTargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface WalkthroughStep {
  key: string;
  title: string;
  description: string;
}

interface HomeWalkthroughProps {
  visible: boolean;
  step: WalkthroughStep | null;
  stepIndex: number;
  totalSteps: number;
  targetRect: WalkthroughTargetRect | null;
  onNext: () => void;
  onSkip: () => void;
  onDone: () => void;
}

export default function HomeWalkthrough({
  visible,
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onSkip,
  onDone,
}: HomeWalkthroughProps) {
  const { i18n } = useTranslation();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  if (!step) return null;

  const isLastStep = stepIndex === totalSteps - 1;
  const tooltipMaxWidth = screenWidth >= 900 ? 360 : 280;
  const tooltipWidth = Math.min(tooltipMaxWidth, screenWidth - 32);
  const tooltipHeight = 124;
  const targetPaddingHorizontal = 18;
  const targetPaddingVertical = 10;

  let tooltipTop = screenHeight * 0.6;
  let tooltipLeft = (screenWidth - tooltipWidth) / 2;

  if (targetRect) {
    const targetBottom = targetRect.y + targetRect.height;
    const preferredTop = targetBottom + 14;
    const fallbackTop = targetRect.y - tooltipHeight - 14;
    tooltipTop = preferredTop + tooltipHeight < screenHeight - 24 ? preferredTop : Math.max(24, fallbackTop);
    tooltipLeft = Math.min(
      screenWidth - tooltipWidth - 16,
      Math.max(16, targetRect.x + targetRect.width / 2 - tooltipWidth / 2)
    );
  }

  const holeLeft = targetRect ? Math.max(0, targetRect.x - targetPaddingHorizontal) : 0;
  const holeTop = targetRect ? Math.max(0, targetRect.y - targetPaddingVertical) : 0;
  const holeRight = targetRect
    ? Math.min(screenWidth, targetRect.x + targetRect.width + targetPaddingHorizontal)
    : 0;
  const holeBottom = targetRect
    ? Math.min(screenHeight, targetRect.y + targetRect.height + targetPaddingVertical)
    : 0;
  const holeWidth = Math.max(0, holeRight - holeLeft);
  const holeHeight = Math.max(0, holeBottom - holeTop);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.root}>
        {targetRect ? (
          <>
            <View
              style={[
                styles.overlay,
                { top: 0, left: 0, right: 0, height: holeTop },
              ]}
            />
            <View
              style={[
                styles.overlay,
                {
                  top: holeTop,
                  left: 0,
                  width: holeLeft,
                  height: holeHeight,
                },
              ]}
            />
            <View
              style={[
                styles.overlay,
                {
                  top: holeTop,
                  left: holeRight,
                  right: 0,
                  height: holeHeight,
                },
              ]}
            />
            <View
              style={[
                styles.overlay,
                {
                  top: holeBottom,
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.highlight,
                {
                  left: holeLeft,
                  top: holeTop,
                  width: holeWidth,
                  height: holeHeight,
                },
              ]}
            />
          </>
        ) : (
          <Pressable style={styles.overlay} onPress={onSkip} />
        )}

        <View style={[styles.tooltip, { top: tooltipTop, left: tooltipLeft, width: tooltipWidth }]}>
          <Text style={styles.stepCounter}>
            {stepIndex + 1}/{totalSteps}
          </Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>{tr('Skip', 'Пропустить')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={isLastStep ? onDone : onNext}
              style={styles.nextButton}
            >
              <Text style={styles.nextText}>{isLastStep ? tr('Done', 'Готово') : tr('Next', 'Далее')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  highlight: {
    position: 'absolute',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  stepCounter: {
    ...BodyStyle,
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  title: {
    ...HeadingStyle,
    fontSize: 14,
    color: '#342846',
    marginBottom: 6,
  },
  description: {
    ...BodyStyle,
    fontSize: 13,
    lineHeight: 18,
    color: '#342846',
  },
  actions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#666',
  },
  nextButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  nextText: {
    ...ButtonHeadingStyle,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
