import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Dimensions, Image, InteractionManager, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PaywallScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(false);

  // Calculate due date (4 days from today)
  const getDueDate = () => {
    try {
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + 4);
      const language = i18n?.language || 'en';
      return dueDate.toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (error) {
      console.error('Error formatting due date:', error);
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + 4);
      return dueDate.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <PaperTextureBackground>
      <View style={styles.container}>
      <StatusBar style="light" />
      {/* X Button */}
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={() => {
          InteractionManager.runAfterInteractions(() => {
            router.back();
          });
        }}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      {/* Centered Image */}
      <Image
        source={require('../assets/images/paywall_top.png')}
        style={styles.paywallTopImage}
        resizeMode="cover"
      />

      {/* White Card */}
      <View style={styles.whiteCard}>
        <ScrollView
          contentContainerStyle={styles.whiteCardContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentWrapper}>
            <Text style={styles.whiteCardHeading}>{t('paywall.readyForCalling')}</Text>
            <Text style={styles.whiteCardBody}>{t('paywall.noCommitment')}</Text>

            {/* Calling Card */}
            <LinearGradient
              colors={['#fffffe', '#e6e6e6', '#f6fdff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.destinyCard}
            >
              <Text style={styles.destinyCardHeading}>{t('paywall.calling')}</Text>
              <Text style={styles.destinyCardBody}>
                {t('paywall.callingDescription')}
              </Text>
            </LinearGradient>

            {/* Free Trial Card */}
            <LinearGradient
              colors={['#fffffe', '#e6e6e6', '#f6fdff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.freeTrialCard}
            >
              {freeTrialEnabled ? (
                <Text style={styles.freeTrialText}>{t('paywall.freeTrialEnabled')}</Text>
              ) : (
                <Text style={styles.notSureText}>{t('paywall.notSure')}</Text>
              )}
              <View style={styles.switchContainer}>
                <Switch
                  value={freeTrialEnabled}
                  onValueChange={setFreeTrialEnabled}
                trackColor={{ false: 'rgba(52, 40, 70, 0.25)', true: '#342846' }} // Water drop effect with transparency when off
                thumbColor={freeTrialEnabled ? '#fff' : 'rgba(255, 255, 255, 0.9)'} // Slightly transparent white thumb for water drop effect
                ios_backgroundColor="rgba(52, 40, 70, 0.25)" // iOS background with water drop effect
                />
              </View>
            </LinearGradient>

          {/* Pricing Section */}
          {freeTrialEnabled ? (
            <>
              {/* Today and Due Date */}
              <View style={styles.pricingContainer}>
                <View style={styles.pricingRow}>
                  <View style={styles.circleWrapper}>
                    <View style={styles.circle} />
                  </View>
                  <Text style={styles.pricingLabel}>Today</Text>
                  <View style={styles.pricingAmountContainer}>
                    <Text style={styles.pricingAmount}>0.00 USD</Text>
                  </View>
                </View>
                <View style={styles.circleLineContainer}>
                  <View style={styles.verticalLine} />
                </View>
                <View style={styles.pricingRow}>
                  <View style={styles.circleWrapper}>
                    <View style={styles.circle} />
                  </View>
                  <Text style={styles.pricingLabel}>{getDueDate()}</Text>
                  <View style={styles.pricingAmountContainer}>
                    <Text style={styles.pricingAmount}>9.99 USD</Text>
                  </View>
                </View>
              </View>

              {/* Try Free Button */}
              <TouchableOpacity 
                style={styles.tryFreeButton} 
                onPress={() => {
                  InteractionManager.runAfterInteractions(() => {
                    router.replace('/(tabs)');
                  });
                }}
              >
                <Text style={styles.tryFreeButtonText}>Try free</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Skip Free Trial Section */}
              <View style={styles.pricingContainer}>
                <View style={styles.pricingRow}>
                  <View style={styles.circleWrapper}>
                    <View style={styles.circle} />
                  </View>
                  <Text style={styles.skipTrialText}>Skip free trial</Text>
                  <View style={styles.pricingAmountContainer}>
                    <Text style={styles.pricingAmount}>0.00 USD</Text>
                  </View>
                </View>
                <View style={styles.circleLineContainer}>
                  <View style={styles.verticalLine} />
                </View>
                <View style={styles.pricingRow}>
                  <View style={styles.circleWrapper}>
                    <View style={styles.circle} />
                  </View>
                  <Text style={styles.pricingLabel}>Today</Text>
                  <View style={styles.pricingAmountContainer}>
                    <Text style={styles.pricingAmount}>6.99 USD</Text>
                  </View>
                </View>
              </View>

              {/* Calling Starts Button */}
              <TouchableOpacity 
                style={styles.destinyStartsButton} 
                onPress={() => router.replace('/(tabs)')}
              >
                <Text style={styles.destinyStartsButtonText}>Calling Starts</Text>
              </TouchableOpacity>
            </>
          )}
          </View>
        </ScrollView>
      </View>
    </View>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
    paddingTop: 0, // Ensure no padding at top
  },
  scrollContent: {
    flexGrow: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#342846',
    fontWeight: 'bold',
  },
  paywallTopImage: {
    position: 'absolute',
    top: 0, // Start from the very top of the screen
    left: 0,
    right: 0,
    width: '100%',
    height: '40%', // Height adjusted so bottom touches white card border at 40%
    zIndex: 5,
  },
  whiteCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: '40%', // Increased height by 20% (from 50% to 60% of screen) so all content fits
    backgroundColor: '#fff',
    borderTopLeftRadius: 72,
    borderTopRightRadius: 72,
    borderWidth: 1,
    borderColor: '#342846',
    borderBottomWidth: 0,
    zIndex: 2,
  },
  whiteCardContent: {
    flexGrow: 1,
    paddingHorizontal: 20, // Minimum 20px horizontal padding (was 17)
    paddingVertical: 17, // Keep vertical padding as is
    paddingTop: 67, // Reduced by 20% (from 84 to 67)
    paddingBottom: 20, // Reduced padding bottom so button can be at very bottom
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },
  whiteCardHeading: {
    ...HeadingStyle,
    color: '#342846',
    marginBottom: 8, // Reduced by 30% (from 12 to 8)
    fontSize: 20, // Reduced by 30% (from ~28 to 20)
    textAlign: 'center',
  },
  whiteCardBody: {
    ...BodyStyle,
    color: '#342846',
    marginBottom: 17, // Reduced by 30% (from 24 to 17)
    textAlign: 'center',
    // Keep original font size - don't reduce body text
  },
  destinyCard: {
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    padding: 11, // Reduced by 30% (from 16 to 11)
    marginBottom: 11, // Reduced by 30% (from 16 to 11)
    alignItems: 'center', // Center content
  },
  destinyCardHeading: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 14, // Reduced by 30% (from 20 to 14)
    marginBottom: 6, // Reduced by 30% (from 8 to 6)
    textAlign: 'center', // Center heading
  },
  destinyCardBody: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14, // Keep original size - don't reduce body text
    lineHeight: 20, // Keep original line height
    textAlign: 'center', // Center body text
  },
  freeTrialCard: {
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    padding: 11, // Reduced by 30% (from 16 to 11)
    marginBottom: 17, // Reduced by 30% (from 24 to 17)
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(52, 40, 70, 0.1)', // Water drop effect background
    padding: 2,
  },
  freeTrialText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16, // Keep original size - don't reduce body text
  },
  notSureText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16, // Keep original size - don't reduce body text
  },
  enableButton: {
    backgroundColor: '#342846',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
  },
  enableButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pricingContainer: {
    marginBottom: 17, // Reduced by 30% (from 24 to 17)
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // Align pricing to the right
    marginBottom: 8,
    width: '100%',
  },
  circleWrapper: {
    width: 20,
    height: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#342846',
  },
  circleLineContainer: {
    height: 20,
    marginLeft: 10,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  verticalLine: {
    width: 1,
    height: 20,
    backgroundColor: '#342846',
    marginLeft: 3,
  },
  pricingLabel: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16, // Keep original size - don't reduce body text
    flex: 1,
  },
  pricingAmountContainer: {
    marginLeft: 'auto', // Push to the right
  },
  pricingAmount: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16, // Keep original size - don't reduce body text
    fontWeight: 'bold',
  },
  skipTrialText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16, // Keep original size - don't reduce body text
    fontWeight: 'bold',
  },
  tryFreeButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 11, // Reduced by 30% (from 16 to 11)
    paddingHorizontal: 28, // Reduced by 30% (from 40 to 28)
    alignItems: 'center',
    marginBottom: 11, // Reduced by 30% (from 16 to 11)
  },
  tryFreeButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 13, // Reduced by 30% (from 18 to 13)
    fontWeight: '600',
  },
  destinyStartsButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 11, // Reduced by 30% (from 16 to 11)
    paddingHorizontal: 28, // Reduced by 30% (from 40 to 28)
    alignItems: 'center',
    marginTop: 'auto', // Push button to bottom
    marginBottom: 20, // Small margin from bottom of screen
    alignSelf: 'stretch',
  },
  destinyStartsButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 13, // Reduced by 30% (from 18 to 13)
    fontWeight: '600',
  },
});

