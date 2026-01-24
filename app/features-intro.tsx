import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_WIDTH = SCREEN_WIDTH - 50; // 25px padding on each side

export default function FeaturesIntroScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleContinue = () => {
    router.push('/onboarding');
  };


  const features = [
    {
      icon: 'favorite',
      title: 'Discover your Ikigai',
      description: "Identify the intersection of what you love, what you're good at, and what the world needs.",
      why: 'Find your reason for being through guided self-reflection.',
      showWhy: true,
    },
    {
      icon: 'flag',
      title: 'Set meaningful goals',
      description: 'Transform your vision into actionable milestones aligned with your core values.',
      why: 'Helps you break down your vision into achievable steps that align with your values.',
      showWhy: true,
    },
    {
      icon: 'bar-chart',
      title: 'Track your progress',
      description: 'Visualize your growth over time with insightful analytics and daily check-ins.',
      why: 'Regular tracking helps you see patterns, celebrate wins, and stay motivated on your journey.',
      showWhy: true,
    },
    {
      icon: 'star',
      title: 'Personalized Guidance',
      description: 'Our system learns from your entries to provide tailored insights that help you stay aligned with your purpose every single day.',
    },
  ];

  return (
    <PaperTextureBackground>
      <View style={styles.container}>
        {/* Header - Fixed at top */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]} />

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Heading */}
          <Text style={styles.mainHeading}>Master Your Path</Text>

          {/* Subheading */}
          <Text style={styles.subheading}>
            Join thousands of seekers using the ancient wisdom of Ikigai to build a life of meaning and balance.
          </Text>

          {/* Feature Cards */}
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => {
              // Last card (Personalized Guidance) uses ImageBackground
              if (index === 3) {
                return (
                  <ImageBackground
                    key={index}
                    source={require('@/assets/images/goal.background.png')}
                    style={styles.card}
                    imageStyle={styles.cardBackgroundImage}
                  >
                    <View style={styles.cardContent}>
                      <View style={[styles.iconContainer, styles.iconContainerPurple]}>
                        <MaterialIcons 
                          name={feature.icon as any} 
                          size={24} 
                          color="#342846" 
                        />
                      </View>
                      <View style={styles.cardText}>
                        <Text style={[styles.cardTitle, styles.cardTitleWhite]}>{feature.title}</Text>
                        <Text style={[styles.cardDescription, styles.cardDescriptionWhite]}>{feature.description}</Text>
                        {feature.showWhy && (
                          <View style={styles.tooltip}>
                            <MaterialIcons name="auto-fix-high" size={16} color="#342846" />
                            <Text style={styles.tooltipText}>{feature.why}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </ImageBackground>
                );
              }

              // Other cards use regular View
              return (
                <View 
                  key={index} 
                  style={styles.card}
                >
                  <View style={styles.cardContent}>
                    {index < 3 ? (
                      <ImageBackground
                        source={require('@/assets/images/goal.background.png')}
                        style={styles.iconContainer}
                        imageStyle={styles.iconBackgroundImage}
                      >
                        <MaterialIcons 
                          name={feature.icon as any} 
                          size={24} 
                          color="#FFFFFF" 
                        />
                      </ImageBackground>
                    ) : (
                      <View style={[styles.iconContainer, styles.iconContainerPurple]}>
                        <MaterialIcons 
                          name={feature.icon as any} 
                          size={24} 
                          color="#342846" 
                        />
                      </View>
                    )}
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{feature.title}</Text>
                      <Text style={styles.cardDescription}>{feature.description}</Text>
                      {feature.showWhy && (
                        <View style={styles.tooltip}>
                          <MaterialIcons name="auto-fix-high" size={16} color="#342846" />
                          <Text style={styles.tooltipText}>{feature.why}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Continue Button */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <TouchableOpacity style={styles.button} onPress={handleContinue}>
              <Text style={styles.buttonText}>Continue Journey</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  mainHeading: {
    ...HeadingStyle,
    color: '#342846',
    textAlign: 'center',
    fontSize: 28,
    marginBottom: 16,
    paddingHorizontal: 25,
  },
  subheading: {
    ...BodyStyle,
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 19, // Reduced by 20% from 24 (24 * 0.8 = 19.2)
    marginBottom: 24,
    paddingHorizontal: 25,
  },
  featuresContainer: {
    paddingHorizontal: 25,
    gap: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    marginBottom: 4,
    // Shadow for 3D effect
    shadowColor: '#342846',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6, // Android shadow
  },
  cardBackgroundImage: {
    borderRadius: 12,
    resizeMode: 'cover',
  },
  cardWithPurpleBorder: {
    borderColor: '#342846',
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  iconBackgroundImage: {
    borderRadius: 24,
    resizeMode: 'cover',
  },
  iconContainerPurple: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#342846',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 8,
  },
  cardTitleWhite: {
    color: '#FFFFFF',
  },
  cardDescription: {
    ...BodyStyle,
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  cardDescriptionWhite: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  whyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
    gap: 4,
  },
  whyLabel: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'none',
  },
  whyLabelWhite: {
    color: '#FFFFFF',
  },
  whyContainer: {
    backgroundColor: 'rgba(52, 40, 70, 0.2)', // Purple with 20% opacity
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
  },
  whyText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    lineHeight: 16,
  },
  whyTextWhite: {
    color: '#FFFFFF',
  },
  tooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    marginLeft: -60, // Negative margin to align with icon's left edge (icon width 48 + marginRight 12 = 60)
    marginRight: 0, // Keep right padding same as left (16px from card edge)
    gap: 6,
  },
  tooltipText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    flex: 1,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 19,
    paddingHorizontal: 40,
    width: BUTTON_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
});
