import { BodyStyle, HeadingStyle } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const GUIDE_DISMISSED_KEY = '@guide_dismissed';

const brandColors = {
  primary: '#342846',
  secondary: '#bfacca',
  text: '#342846',
  background: '#FFFFFF',
  border: 'rgba(52, 40, 70, 0.15)',
};

interface GuideSection {
  id: string;
  icon: string | number; // Can be emoji string or require() image
  iconType: 'emoji' | 'image';
  title: string;
  whatItDoes: string;
  whenToUse: string;
  howItHelps: string;
}

const guideSections: GuideSection[] = [
  {
    id: 'clarity-map',
    icon: require('../assets/images/claritymap.png'),
    iconType: 'image',
    title: 'Clarity Map',
    whatItDoes: 'Sort your racing thoughts in 3 minutes',
    whenToUse: 'Use this when your mind feels cluttered or overwhelmed',
    howItHelps: 'See what deserves your attention, what to explore, and what to let go',
  },
  {
    id: 'ikigai-compass',
    icon: require('../assets/images/ikigaicompass.png'),
    iconType: 'image',
    title: 'Your Ikigai Compass',
    whatItDoes: 'Your personalized purpose and path',
    whenToUse: 'Visit when you need direction or feel lost',
    howItHelps: 'Reminds you of your deeper purpose and keeps you aligned',
  },
  {
    id: 'progress',
    icon: require('../assets/images/progress.png'),
    iconType: 'image',
    title: 'Progress This Week',
    whatItDoes: 'Track your weekly activity and growth',
    whenToUse: 'Check in to see how you\'re doing and claim badges',
    howItHelps: 'Celebrate your wins and build momentum',
  },
  {
    id: 'focus-sanctuary',
    icon: require('../assets/images/focussanctuary.png'),
    iconType: 'image',
    title: 'Focus Sanctuary',
    whatItDoes: 'Meditate while watching a forest grow',
    whenToUse: 'Use when you need to calm down or center yourself',
    howItHelps: 'Find peace without pressure or instructions',
  },
  {
    id: 'today-insight',
    icon: require('../assets/images/focus.png'),
    iconType: 'image',
    title: 'Today\'s Insight',
    whatItDoes: 'Your daily cosmic guidance and reflection',
    whenToUse: 'Check in each morning to set your intention for the day',
    howItHelps: 'Receive personalized insights that help you navigate your day with clarity and purpose',
  },
];

interface GuideSectionItemProps {
  section: GuideSection;
  isExpanded: boolean;
  onToggle: () => void;
}

function GuideSectionItem({ section, isExpanded, onToggle }: GuideSectionItemProps) {
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(250); // Higher default fallback
  const contentRef = useRef<View>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue: isExpanded ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExpanded]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const maxHeight = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(contentHeight, 280)], // Ensure at least 280px to fit all content
  });

  const opacity = animatedHeight.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const measureContent = () => {
    if (contentRef.current) {
      contentRef.current.measure((x, y, width, height) => {
        if (height > 0) {
          setContentHeight(height + 20); // Add padding
        }
      });
    }
  };

  return (
    <View style={styles.sectionContainer}>
      <Pressable
        style={({ pressed }) => [
          styles.sectionHeader,
          pressed && styles.sectionHeaderPressed,
        ]}
        onPress={onToggle}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.iconContainer}>
            {section.iconType === 'image' ? (
              <Image 
                source={section.icon as number} 
                style={styles.sectionIconImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.sectionIcon}>{section.icon}</Text>
            )}
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        </View>
        <Animated.Text style={[styles.chevron, { transform: [{ rotate }] }]}>
          ▼
        </Animated.Text>
      </Pressable>

      {/* Hidden view to measure full content height - always measure */}
      <View 
        style={styles.hiddenMeasureView}
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          if (height > 0) {
            setContentHeight(Math.max(height + 30, 300)); // Ensure minimum 300px, add extra padding
          }
        }}
      >
        <View style={styles.bulletPoint}>
          <Text style={styles.bulletLabel}>What it does:</Text>
          <Text style={styles.bulletText}>{section.whatItDoes}</Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bulletLabel}>When to use:</Text>
          <Text style={styles.bulletText}>{section.whenToUse}</Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bulletLabel}>How it helps:</Text>
          <Text style={styles.bulletText}>{section.howItHelps}</Text>
        </View>
      </View>

      <Animated.View style={[styles.sectionContent, { maxHeight, opacity }]}>
        <View ref={contentRef}>
          <View style={styles.bulletPoint}>
            <Text style={styles.bulletLabel}>What it does:</Text>
            <Text style={styles.bulletText}>{section.whatItDoes}</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bulletLabel}>When to use:</Text>
            <Text style={styles.bulletText}>{section.whenToUse}</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bulletLabel}>How it helps:</Text>
            <Text style={styles.bulletText}>{section.howItHelps}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

interface GuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export function GuideModal({ visible, onClose }: GuideModalProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      backdropAnim.setValue(0);
    }
  }, [visible]);

  const handleToggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleClose = async () => {
    // Animate out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (dontShowAgain) {
        AsyncStorage.setItem(GUIDE_DISMISSED_KEY, 'true');
      }
      onClose();
    });
  };

  const handleDontShowAgain = () => {
    setDontShowAgain(!dontShowAgain);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={styles.backdropPressable} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>How to Use Calling</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Sections */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {guideSections.map((section) => (
            <GuideSectionItem
              key={section.id}
              section={section}
              isExpanded={expandedSection === section.id}
              onToggle={() => handleToggleSection(section.id)}
            />
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={styles.dontShowContainer}
            onPress={handleDontShowAgain}
          >
            <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
              {dontShowAgain && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.dontShowText}>Don't show on startup</Text>
          </Pressable>

          <TouchableOpacity style={styles.closeButtonFull} onPress={handleClose}>
            <Text style={styles.closeButtonFullText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

// Check if guide should be shown on startup
export async function shouldShowGuideOnStartup(): Promise<boolean> {
  try {
    const dismissed = await AsyncStorage.getItem(GUIDE_DISMISSED_KEY);
    return dismissed !== 'true';
  } catch {
    return true;
  }
}

// Reset guide dismissed preference
export async function resetGuideDismissed(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GUIDE_DISMISSED_KEY);
  } catch {
    // Ignore errors
  }
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropPressable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: brandColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
    position: 'relative',
  },
  headerTitle: {
    ...HeadingStyle,
    fontSize: 20,
    color: brandColors.text,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: brandColors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionContainer: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 40, 70, 0.04)',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  sectionHeaderPressed: {
    backgroundColor: 'rgba(52, 40, 70, 0.08)',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionIcon: {
    fontSize: 24,
    lineHeight: 24,
  },
  sectionIconImage: {
    width: 35,
    height: 35,
  },
  titleContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  sectionTitle: {
    ...HeadingStyle,
    fontSize: 16,
    color: brandColors.text,
    lineHeight: 20,
  },
  chevron: {
    fontSize: 12,
    color: brandColors.text,
    opacity: 0.6,
  },
  hiddenMeasureView: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    width: '100%',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  bulletPoint: {
    marginBottom: 10,
    paddingLeft: 36,
    paddingRight: 8,
  },
  bulletLabel: {
    ...BodyStyle,
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  bulletText: {
    ...BodyStyle,
    fontSize: 14,
    color: brandColors.text,
    lineHeight: 20,
    flexShrink: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: brandColors.border,
  },
  dontShowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: brandColors.primary,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: brandColors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dontShowText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#666',
  },
  closeButtonFull: {
    backgroundColor: brandColors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeButtonFullText: {
    ...HeadingStyle,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
