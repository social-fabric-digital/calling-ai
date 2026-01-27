import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
// API calls disabled - using placeholders instead
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Dimensions, Image, ImageBackground, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SignatureCanvas from 'react-native-signature-canvas';

const { width, height } = Dimensions.get('window');

interface AboutYouFormProps {
  name: string;
  setName: (value: string) => void;
  birthMonth: string;
  setBirthMonth: (value: string) => void;
  birthDate: string;
  setBirthDate: (value: string) => void;
  birthYear: string;
  setBirthYear: (value: string) => void;
  birthHour: string;
  setBirthHour: (value: string) => void;
  birthMinute: string;
  setBirthMinute: (value: string) => void;
  birthAmPm: string;
  setBirthAmPm: (value: string) => void;
  dontKnowTime: boolean;
  setDontKnowTime: (value: boolean) => void;
  birthCity: string;
  setBirthCity: (value: string) => void;
  citySuggestions: CityData[];
  setCitySuggestions: (value: CityData[]) => void;
  showCityDropdown: boolean;
  setShowCityDropdown: (value: boolean) => void;
  showAmPmDropdown: boolean;
  setShowAmPmDropdown: (value: boolean) => void;
  hideBirthTimeFields: boolean;
  birthMonthRef: React.RefObject<TextInput | null>;
  birthDateRef: React.RefObject<TextInput | null>;
  birthYearRef: React.RefObject<TextInput | null>;
  birthHourRef: React.RefObject<TextInput | null>;
  birthMinuteRef: React.RefObject<TextInput | null>;
  setShowDontKnowTimeModal: (value: boolean) => void;
}

function AboutYouForm({
  name,
  setName,
  birthMonth,
  setBirthMonth,
  birthDate,
  setBirthDate,
  birthYear,
  setBirthYear,
  birthHour,
  setBirthHour,
  birthMinute,
  setBirthMinute,
  birthAmPm,
  setBirthAmPm,
  dontKnowTime,
  setDontKnowTime,
  birthCity,
  setBirthCity,
  citySuggestions,
  setCitySuggestions,
  showCityDropdown,
  setShowCityDropdown,
  showAmPmDropdown,
  setShowAmPmDropdown,
  hideBirthTimeFields,
  birthMonthRef,
  birthDateRef,
  birthYearRef,
  birthHourRef,
  birthMinuteRef,
  setShowDontKnowTimeModal,
}: AboutYouFormProps) {
  const { t } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);
  const cityFieldRef = useRef<View>(null);
  const [cityFieldY, setCityFieldY] = useState(0);
  const [showDateOfBirthTooltip, setShowDateOfBirthTooltip] = useState(false);
  const [showBirthTimeTooltip, setShowBirthTimeTooltip] = useState(false);
  const [showCityOfBirthTooltip, setShowCityOfBirthTooltip] = useState(false);

  // Handle name change and save to AsyncStorage immediately
  const handleNameChange = async (text: string) => {
    setName(text);
    // Save to AsyncStorage immediately so it's available for pledge step
    if (text.trim()) {
      try {
        await AsyncStorage.setItem('userName', text.trim());
      } catch (error) {
        console.error('Error saving name:', error);
      }
    }
  };

  const handleCityChange = (text: string) => {
    // Always save the city text - allows any city name, even if not in suggestions
    setBirthCity(text);
    if (text.length > 0) {
      const isRussian = t('onboarding.aboutYouTitle') === 'О ВАС';
      const searchText = text.toLowerCase();
      
      const filtered = SAMPLE_CITIES.filter(city => {
        // Check if user typed in Cyrillic (Russian characters)
        const hasCyrillic = /[а-яё]/i.test(text);
        
        if (isRussian && hasCyrillic && city.nameRu) {
          // User is typing in Russian Cyrillic and city has Russian name - search in Russian name
          return city.nameRu.toLowerCase().startsWith(searchText);
        } else {
          // For all cases: search in English name to show cities from ALL countries
          // This ensures cities from all countries are shown regardless of language selection
          return city.name.toLowerCase().startsWith(searchText);
        }
      }).slice(0, 20); // Show up to 20 suggestions
      
      setCitySuggestions(filtered);
      setShowCityDropdown(filtered.length > 0);
    } else {
      setCitySuggestions([]);
      setShowCityDropdown(false);
    }
  };

  const selectCity = (city: CityData) => {
    const isRussian = t('onboarding.aboutYouTitle') === 'О ВАС';
    // Use Russian name if available and Russian language is selected
    setBirthCity(isRussian && city.nameRu ? city.nameRu : city.name);
    setShowCityDropdown(false);
    setCitySuggestions([]);
  };

  const handleCityFieldLayout = (event: any) => {
    const { y } = event.nativeEvent.layout;
    setCityFieldY(y);
  };

  const handleCityFocus = () => {
    if (citySuggestions.length > 0) {
      setShowCityDropdown(true);
    }
    
    // Scroll to city field after a short delay to allow keyboard to appear
    setTimeout(() => {
      if (cityFieldY > 0) {
        // Scroll to the city field position with some offset to ensure it's visible above keyboard
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, cityFieldY - 150), // Offset by 150px to ensure field is visible
          animated: true,
        });
      } else {
        // Fallback: scroll to end if position not yet measured
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 300);
  };

  return (
    <>
    <ScrollView 
      ref={scrollViewRef}
      style={styles.formContainer}
      contentContainerStyle={styles.formContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.aboutYouTitle}>{t('onboarding.aboutYouTitle')}</Text>
      <Text style={styles.formBodyText}>
        {t('onboarding.helpPersonalize')}
      </Text>

      {/* Name Field */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{t('onboarding.myNameIs')}</Text>
        <View
          style={[styles.textFieldWrapper, styles.nameFieldWrapper]}
        >
          <TextInput
            style={styles.textField}
            value={name}
            onChangeText={handleNameChange}
            placeholder=""
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Birth Date Fields */}
      <View style={styles.fieldContainer}>
        <View style={styles.fieldLabelContainer}>
          <Text style={styles.fieldLabel}>{t('onboarding.dateOfBirth')}</Text>
          <Pressable
            onPress={() => setShowDateOfBirthTooltip(true)}
            style={styles.helperIcon}
          >
            <MaterialIcons name="help-outline" size={20} color="#342846" />
          </Pressable>
        </View>
        <View style={styles.dateRow}>
          <View
            style={[styles.textFieldWrapper, styles.dateField]}
          >
            <TextInput
              ref={birthMonthRef}
              style={styles.textField}
              value={birthMonth}
              onChangeText={(text) => {
                setBirthMonth(text);
                if (text.length === 2) {
                  birthDateRef.current?.focus();
                }
              }}
              placeholder={t('onboarding.mm')}
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
          <View
            style={[styles.textFieldWrapper, styles.dateField]}
          >
            <TextInput
              ref={birthDateRef}
              style={styles.textField}
              value={birthDate}
              onChangeText={(text) => {
                setBirthDate(text);
                if (text.length === 2) {
                  birthYearRef.current?.focus();
                }
              }}
              placeholder={t('onboarding.dd')}
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
          <View
            style={[styles.textFieldWrapper, styles.dateFieldYear]}
          >
            <TextInput
              ref={birthYearRef}
              style={styles.textField}
              value={birthYear}
              onChangeText={setBirthYear}
              placeholder={t('onboarding.yyyy')}
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
        </View>
      </View>

      {/* Birth Time Fields */}
      {!hideBirthTimeFields && (
        <View style={styles.fieldContainer}>
          <View style={styles.fieldLabelContainer}>
            <Text style={styles.fieldLabel}>{t('onboarding.birthTime')}</Text>
            <Pressable
              onPress={() => setShowBirthTimeTooltip(true)}
              style={styles.helperIcon}
            >
              <MaterialIcons name="help-outline" size={20} color="#342846" />
            </Pressable>
          </View>
          <View style={[
            styles.timeRow,
            t('onboarding.aboutYouTitle') === 'О ВАС' && styles.timeRowRussian
          ]}>
            <View
              style={[styles.textFieldWrapper, styles.timeField]}
            >
              <TextInput
                ref={birthHourRef}
                style={styles.textField}
                value={birthHour}
                onChangeText={(text) => {
                  setBirthHour(text);
                  if (text.length === 2) {
                    birthMinuteRef.current?.focus();
                  }
                }}
                placeholder={t('onboarding.hh')}
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={2}
                editable={!dontKnowTime}
              />
            </View>
            <View
              style={[styles.textFieldWrapper, styles.timeField]}
            >
              <TextInput
                ref={birthMinuteRef}
                style={styles.textField}
                value={birthMinute}
                onChangeText={(text) => {
                  setBirthMinute(text);
                  if (text.length === 2) {
                    birthMinuteRef.current?.blur();
                  }
                }}
                placeholder={t('onboarding.mm')}
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={2}
                editable={!dontKnowTime}
              />
            </View>
          {t('onboarding.aboutYouTitle') !== 'О ВАС' && (
            <View style={[styles.textFieldWrapper, styles.amPmField]}>
              <Pressable
                onPress={() => {
                  if (!dontKnowTime) {
                    setShowAmPmDropdown(!showAmPmDropdown);
                  }
                }}
                disabled={dontKnowTime}
                style={styles.dropdownButtonWrapper}
              >
                <View
                  style={styles.dropdownGradient}
                >
                  <View style={styles.dropdownButton}>
                    <Text style={styles.dropdownText}>{birthAmPm}</Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </View>
                </View>
              </Pressable>
              {showAmPmDropdown && !dontKnowTime && (
                <View style={styles.dropdownMenuUp} pointerEvents="box-none">
                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => {
                      setBirthAmPm(birthAmPm === 'AM' ? 'PM' : 'AM');
                      setShowAmPmDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>
                      {birthAmPm === 'AM' ? t('onboarding.pm') : t('onboarding.am')}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
      )}

      {/* Don't Know Time Checkbox */}
      {!hideBirthTimeFields && (
        <View style={styles.checkboxContainer}>
          <Pressable
            style={styles.checkbox}
            onPress={() => {
              setShowDontKnowTimeModal(true);
            }}
          >
            <View style={[styles.checkboxBox, dontKnowTime && styles.checkboxChecked]}>
              {dontKnowTime && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>{t('onboarding.dontKnowBirthTime')}</Text>
          </Pressable>
        </View>
      )}

      {/* Birth City Field */}
      <View 
        style={styles.fieldContainer} 
        ref={cityFieldRef}
        onLayout={handleCityFieldLayout}
      >
        <View style={styles.fieldLabelContainer}>
          <Text style={styles.fieldLabel}>{t('onboarding.cityOfBirth')}</Text>
          <Pressable
            onPress={() => setShowCityOfBirthTooltip(true)}
            style={styles.helperIcon}
          >
            <MaterialIcons name="help-outline" size={20} color="#342846" />
          </Pressable>
        </View>
        <View style={styles.cityFieldWrapper}>
          <View
            style={styles.textFieldWrapper}
          >
            <TextInput
              style={styles.textField}
              value={birthCity}
              onChangeText={handleCityChange}
              placeholder=""
              placeholderTextColor="#999"
              onFocus={handleCityFocus}
            />
          </View>
          {showCityDropdown && citySuggestions.length > 0 && (
            <View style={styles.cityDropdown}>
              <ScrollView 
                style={styles.cityDropdownScrollView}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {citySuggestions.map((city, index) => (
                  <Pressable
                    key={index}
                    style={styles.cityDropdownItem}
                    onPress={() => selectCity(city)}
                  >
                    <View style={styles.cityDropdownContent}>
                      <Text style={styles.cityDropdownText}>
                        {t('onboarding.aboutYouTitle') === 'О ВАС' && city.nameRu ? city.nameRu : city.name}
                      </Text>
                      <Text style={styles.cityDropdownCountry}>
                        {t('onboarding.aboutYouTitle') === 'О ВАС' && city.country === 'Russia' ? 'Россия' : city.country}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Cake Deer Image */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../assets/images/deer.cake.png')}
          style={styles.cakeImage}
          resizeMode="contain"
        />
      </View>
    </ScrollView>

    {/* Tooltip Modals */}
    <Modal
      visible={showDateOfBirthTooltip}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDateOfBirthTooltip(false)}
    >
      <Pressable
        style={styles.tooltipOverlay}
        onPress={() => setShowDateOfBirthTooltip(false)}
      >
        <View style={styles.tooltipContainer}>
          <Pressable
            onPress={() => setShowDateOfBirthTooltip(false)}
            style={styles.tooltipCloseButton}
          >
            <MaterialIcons name="close" size={24} color="#342846" />
          </Pressable>
          <Text style={styles.tooltipText}>
            This helps us understand your astrological blueprint.
          </Text>
        </View>
      </Pressable>
    </Modal>

    <Modal
      visible={showBirthTimeTooltip}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowBirthTimeTooltip(false)}
    >
      <Pressable
        style={styles.tooltipOverlay}
        onPress={() => setShowBirthTimeTooltip(false)}
      >
        <View style={styles.tooltipContainer}>
          <Pressable
            onPress={() => setShowBirthTimeTooltip(false)}
            style={styles.tooltipCloseButton}
          >
            <MaterialIcons name="close" size={24} color="#342846" />
          </Pressable>
          <Text style={styles.tooltipText}>
            Birth time gives us timing and sights for your biggest moves.
          </Text>
        </View>
      </Pressable>
    </Modal>

    <Modal
      visible={showCityOfBirthTooltip}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowCityOfBirthTooltip(false)}
    >
      <Pressable
        style={styles.tooltipOverlay}
        onPress={() => setShowCityOfBirthTooltip(false)}
      >
        <View style={styles.tooltipContainer}>
          <Pressable
            onPress={() => setShowCityOfBirthTooltip(false)}
            style={styles.tooltipCloseButton}
          >
            <MaterialIcons name="close" size={24} color="#342846" />
          </Pressable>
          <Text style={styles.tooltipText}>
            This completes your birth chart. We only need the city, no specific address.
          </Text>
        </View>
      </Pressable>
    </Modal>
  </>
  );
}

interface PledgeStepProps {
  name: string;
  signature: string;
  setSignature: (value: string) => void;
}

interface IkigaiFormProps {
  whatYouLove: string;
  setWhatYouLove: (value: string) => void;
  whatYouGoodAt: string;
  setWhatYouGoodAt: (value: string) => void;
  whatWorldNeeds: string;
  setWhatWorldNeeds: (value: string) => void;
  whatCanBePaidFor: string;
  setWhatCanBePaidFor: (value: string) => void;
  onPageChange?: (page: number) => void;
  onContinue?: () => Promise<void>;
}

interface LoadingStepProps {
  onComplete?: () => void;
  isActive: boolean;
}

interface CallingAwaitsStepProps {
  userName: string;
  birthMonth?: string;
  birthDate?: string;
  birthYear?: string;
  birthCity?: string;
  birthHour?: string;
  birthMinute?: string;
  birthPeriod?: string;
  whatYouLove?: string;
  whatYouGoodAt?: string;
  whatWorldNeeds?: string;
  whatCanBePaidFor?: string;
  fear?: string;
  whatExcites?: string;
  onContinue?: () => void;
}

interface PathsAlignedStepProps {
  onExplorePath?: (pathId: number) => void;
  onWorkOnDreamGoal?: () => void;
  onPathsGenerated?: (paths: Array<{ id: number; title: string; description: string; glowColor: string }>) => void;
  birthMonth?: string;
  birthDate?: string;
  birthYear?: string;
  birthCity?: string;
  birthHour?: string;
  birthMinute?: string;
  birthPeriod?: string;
  whatYouLove?: string;
  whatYouGoodAt?: string;
  whatWorldNeeds?: string;
  whatCanBePaidFor?: string;
  fear?: string;
  whatExcites?: string;
}

interface PathExplorationStepProps {
  pathName: string;
  pathDescription?: string;
  userName?: string;
  onStartJourney?: (goalId: number, goalTitle?: string) => void;
  onWorkOnDreamGoal?: () => void;
  birthMonth?: string;
  birthDate?: string;
  birthYear?: string;
  birthCity?: string;
  birthHour?: string;
  birthMinute?: string;
  birthPeriod?: string;
  whatYouLove?: string;
  whatYouGoodAt?: string;
  whatWorldNeeds?: string;
  whatCanBePaidFor?: string;
  fear?: string;
  whatExcites?: string;
}

function PledgeStep({ name, signature, setSignature }: PledgeStepProps) {
  const { t } = useTranslation();
  const signatureRef = useRef<any>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [displayName, setDisplayName] = useState(name || '');

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
          console.error('Error loading name for pledge:', error);
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
          console.error('Error loading name on mount:', error);
        }
      }
    };
    checkAsyncStorage();
  }, []);

  const handleSignature = (signatureData: string) => {
    setSignature(signatureData);
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setSignature('');
  };
  
  const handleTouchStart = () => {
    setIsSigning(true);
  };
  
  const handleTouchEnd = () => {
    // Delay to allow signature to complete
    setTimeout(() => {
      setIsSigning(false);
    }, 100);
  };

  const style = `
    body,html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    .m-signature-pad {
      position: absolute;
      font-size: 10px;
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 8px;
      background-color: #fff;
      box-shadow: none;
    }
    .m-signature-pad--body {
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;
      border-radius: 8px;
    }
    .m-signature-pad--body canvas {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      border-radius: 8px;
    }
    .m-signature-pad--footer {
      display: none;
    }
    button {
      display: none;
    }
  `;

  return (
    <ScrollView 
      style={styles.pledgeContainer}
      contentContainerStyle={styles.pledgeContentContainer}
      showsVerticalScrollIndicator={false}
      scrollEnabled={!isSigning}
      nestedScrollEnabled={false}
    >
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
        <View 
          style={styles.signatureContainer}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onStartShouldSetResponder={() => {
            setIsSigning(true);
            return true;
          }}
          onMoveShouldSetResponder={() => {
            setIsSigning(true);
            return true;
          }}
          onResponderRelease={() => {
            setTimeout(() => setIsSigning(false), 200);
          }}
        >
          <View style={styles.signatureWrapper}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleSignature}
              descriptionText=""
              clearText=""
              confirmText=""
              webStyle={style}
              autoClear={false}
              imageType="image/png"
              backgroundColor="#fff"
              penColor="#342846"
            />
      </View>
    </View>
      </View>
    </ScrollView>
  );
}

// Suggestion lists for each Ikigai field
const IKIGAI_SUGGESTIONS = {
  whatYouLove: [
    'Making people laugh',
    'Solving complex problems',
    'Creating art',
    'Helping others feel heard',
    'Caring for animals',
    'Teaching and sharing knowledge',
    'Exploring nature',
    'Writing stories',
    'Playing music',
    'Cooking and experimenting',
  ],
  whatYouGoodAt: [
    'Listening and understanding others',
    'Organizing and planning',
    'Creative problem-solving',
    'Communicating clearly',
    'Building relationships',
    'Analyzing data',
    'Teaching and explaining',
    'Designing and creating',
    'Leading teams',
    'Adapting to change',
  ],
  whatWorldNeeds: [
    'More empathy and understanding',
    'Environmental sustainability',
    'Mental health support',
    'Education and learning opportunities',
    'Accessible healthcare',
    'Community connection',
    'Innovation and technology',
    'Artistic expression',
    'Social justice',
    'Economic equality',
  ],
  whatCanBePaidFor: [
    'Consulting services',
    'Creative design work',
    'Coaching and mentoring',
    'Writing and content creation',
    'Teaching and training',
    'Technical development',
    'Healthcare services',
    'Business strategy',
    'Event planning',
    'Product development',
  ],
};

// Helper text descriptions for each field
const IKIGAI_HELPERS = {
  whatYouLove: 'What activities make you lose track of time and what brings you pure joy.',
  whatYouGoodAt: 'What skills come naturally to you, what do people compliment you on.',
  whatWorldNeeds: 'What problem do you want to solve? How do you want to impact others?',
  whatCanBePaidFor: 'What skills or services could generate income? Dream BIG!',
};

function IkigaiForm({
  whatYouLove,
  setWhatYouLove,
  whatYouGoodAt,
  setWhatYouGoodAt,
  whatWorldNeeds,
  setWhatWorldNeeds,
  whatCanBePaidFor,
  setWhatCanBePaidFor,
  onPageChange,
  onContinue,
}: IkigaiFormProps) {
  const { t } = useTranslation();
  const [assistanceModal, setAssistanceModal] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Get translated suggestions based on the field
  const getSuggestions = (field: string): string[] => {
    const suggestions = t(`onboarding.ikigaiSuggestions.${field}`, { returnObjects: true }) as string[];
    // Fallback to English suggestions if translation is not available
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return IKIGAI_SUGGESTIONS[field as keyof typeof IKIGAI_SUGGESTIONS] || [];
    }
    return suggestions;
  };
  
  // Pulsating animation refs for each star
  const starAnimations = useRef<Record<string, Animated.Value>>({
    whatYouLove: new Animated.Value(1),
    whatYouGoodAt: new Animated.Value(1),
    whatWorldNeeds: new Animated.Value(1),
    whatCanBePaidFor: new Animated.Value(1),
  });
  
  // Start pulsating animations for each star
  useEffect(() => {
    const fields = ['whatYouLove', 'whatYouGoodAt', 'whatWorldNeeds', 'whatCanBePaidFor'];
    fields.forEach(field => {
      const animValue = starAnimations.current[field];
      if (animValue) {
        const pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(animValue, {
              toValue: 1.15, // Reduced from 1.3 to make it more subtle
              duration: 3000, // Slowed down from 1000ms to 3000ms
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 3000, // Slowed down from 1000ms to 3000ms
              useNativeDriver: true,
            }),
          ])
        );
        pulseAnimation.start();
      }
    });
  }, []);

  const handleSuggestionSelect = (suggestion: string, field: string) => {
    switch (field) {
      case 'whatYouLove':
        setWhatYouLove(suggestion);
        break;
      case 'whatYouGoodAt':
        setWhatYouGoodAt(suggestion);
        break;
      case 'whatWorldNeeds':
        setWhatWorldNeeds(suggestion);
        break;
      case 'whatCanBePaidFor':
        setWhatCanBePaidFor(suggestion);
        break;
    }
    setAssistanceModal(null);
  };

  return (
    <>
      <View style={styles.formContainer}>
        {/* Title - Fixed at top */}
        <View style={styles.ikigaiTitleContainer}>
          <Text style={[styles.formTitle, styles.ikigaiTitleLine1]}>{t('onboarding.step4TitleLine1')}</Text>
          <Text style={styles.formTitle}>{t('onboarding.step4TitleLine2')}</Text>
        </View>

        {/* Progress Lines */}
        <View style={styles.ikigaiProgressWrapper}>
          <View style={styles.ikigaiProgressContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.ikigaiProgressLine,
                  currentPage === index && styles.ikigaiProgressLineActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Horizontal Swipeable Cards */}
        <ScrollView 
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={styles.ikigaiHorizontalScroll}
          contentContainerStyle={styles.ikigaiHorizontalContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onMomentumScrollEnd={(event) => {
            const pageIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentPage(pageIndex);
            if (onPageChange) {
              onPageChange(pageIndex);
            }
          }}
        >
        {/* What do you love? */}
        <View style={styles.ikigaiCardContainer}>
          <View style={[styles.ikigaiFieldContainer, styles.ikigaiFieldContainerRed]}>
          {/* Heading */}
          <Text style={styles.ikigaiFieldLabel}>{t('onboarding.whatDoYouLove')}</Text>
          {/* Subheading */}
          <View style={styles.fieldBodyTextContainer}>
            <Text style={styles.fieldBodyText}>{t('onboarding.whatDoYouLoveSubtext')}</Text>
          </View>
          {/* Click */}
          <Text style={styles.clickText}>{t('onboarding.click')}</Text>
          {/* Emoji */}
          <View style={styles.emojiButtonContainer}>
            <TouchableOpacity
              style={styles.starButtonCenter}
              onPress={() => setAssistanceModal('whatYouLove')}
              activeOpacity={1}
            >
              <Animated.View
                style={[
                  styles.starContainer,
                  {
                    transform: [
                      {
                        scale: starAnimations.current.whatYouLove,
                      },
                    ],
                  },
                ]}
              >
                <Image 
                  source={require('../assets/images/love.png')} 
                  style={styles.starIconImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
          <View style={styles.ikigaiTextFieldWrapper}>
            <TextInput
              style={styles.textField}
              value={whatYouLove}
              onChangeText={setWhatYouLove}
              placeholder=""
              placeholderTextColor="#999"
              multiline
            />
          </View>
          </View>
        </View>

        {/* What are you good at? */}
        <View style={styles.ikigaiCardContainer}>
          <View style={[styles.ikigaiFieldContainer, styles.ikigaiFieldContainerPurple]}>
          {/* Heading */}
          <Text style={styles.ikigaiFieldLabel}>{t('onboarding.whatAreYouGoodAt')}</Text>
          {/* Subheading */}
          <View style={styles.fieldBodyTextContainer}>
            <Text style={styles.fieldBodyText}>{t('onboarding.whatAreYouGoodAtSubtext')}</Text>
          </View>
          {/* Click */}
          <Text style={styles.clickText}>{t('onboarding.click')}</Text>
          {/* Emoji */}
          <View style={styles.emojiButtonContainer}>
            <TouchableOpacity
              style={styles.starButtonCenter}
              onPress={() => setAssistanceModal('whatYouGoodAt')}
              activeOpacity={1}
            >
              <Animated.View
                style={[
                  styles.starContainer,
                  {
                    transform: [
                      {
                        scale: starAnimations.current.whatYouGoodAt,
                      },
                    ],
                  },
                ]}
              >
                <Image 
                  source={require('../assets/images/good.png')} 
                  style={styles.starIconImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
          <View style={styles.ikigaiTextFieldWrapper}>
            <TextInput
              style={styles.textField}
              value={whatYouGoodAt}
              onChangeText={setWhatYouGoodAt}
              placeholder=""
              placeholderTextColor="#999"
              multiline
            />
          </View>
          </View>
        </View>

        {/* What does the world need? */}
        <View style={styles.ikigaiCardContainer}>
          <View style={[styles.ikigaiFieldContainer, styles.ikigaiFieldContainerGreen]}>
          {/* Heading */}
          <Text style={styles.ikigaiFieldLabel}>{t('onboarding.whatDoesWorldNeed')}</Text>
          {/* Subheading */}
          <View style={styles.fieldBodyTextContainer}>
            <Text style={styles.fieldBodyText}>{t('onboarding.whatDoesWorldNeedSubtext')}</Text>
          </View>
          {/* Click */}
          <Text style={styles.clickText}>{t('onboarding.click')}</Text>
          {/* Emoji */}
          <View style={styles.emojiButtonContainer}>
            <TouchableOpacity
              style={styles.starButtonCenter}
              onPress={() => setAssistanceModal('whatWorldNeeds')}
              activeOpacity={1}
            >
              <Animated.View
                style={[
                  styles.starContainer,
                  {
                    transform: [
                      {
                        scale: starAnimations.current.whatWorldNeeds,
                      },
                    ],
                  },
                ]}
              >
                <Image 
                  source={require('../assets/images/world.png')} 
                  style={styles.starIconImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
          <View style={styles.ikigaiTextFieldWrapper}>
            <TextInput
              style={styles.textField}
              value={whatWorldNeeds}
              onChangeText={setWhatWorldNeeds}
              placeholder=""
              placeholderTextColor="#999"
              multiline
            />
          </View>
          </View>
        </View>

        {/* What can you be paid for? */}
        <View style={styles.ikigaiCardContainer}>
          <View style={[styles.ikigaiFieldContainer, styles.ikigaiFieldContainerGold]}>
          {/* Heading */}
          <Text style={styles.ikigaiFieldLabel}>{t('onboarding.whatCanBePaidForQuestion')}</Text>
          {/* Subheading */}
          <View style={styles.fieldBodyTextContainer}>
            <Text style={styles.fieldBodyText}>{t('onboarding.whatCanBePaidForSubtext')}</Text>
          </View>
          {/* Click */}
          <Text style={styles.clickText}>{t('onboarding.click')}</Text>
          {/* Emoji */}
          <View style={styles.emojiButtonContainer}>
            <TouchableOpacity
              style={styles.starButtonCenter}
              onPress={() => setAssistanceModal('whatCanBePaidFor')}
              activeOpacity={1}
            >
              <Animated.View
                style={[
                  styles.starContainer,
                  {
                    transform: [
                      {
                        scale: starAnimations.current.whatCanBePaidFor,
                      },
                    ],
                  },
                ]}
              >
                <Image 
                  source={require('../assets/images/paid.png')} 
                  style={styles.starIconImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
          <View style={styles.ikigaiTextFieldWrapper}>
            <TextInput
              style={styles.textField}
              value={whatCanBePaidFor}
              onChangeText={setWhatCanBePaidFor}
              placeholder=""
              placeholderTextColor="#999"
              multiline
            />
          </View>
          </View>
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={[styles.ikigaiNavigationButtons, currentPage === 0 && styles.ikigaiNavigationButtonsCentered]}>
        {(currentPage === 1 || currentPage === 2 || currentPage === 3) && (
          <TouchableOpacity
            style={[styles.ikigaiNavButton, styles.ikigaiNavButtonLeft]}
            onPress={() => {
              if (currentPage > 0) {
                const newPage = currentPage - 1;
                setCurrentPage(newPage);
                scrollViewRef.current?.scrollTo({ x: newPage * width, animated: true });
                if (onPageChange) {
                  onPageChange(newPage);
                }
              }
            }}
          >
            <View style={styles.ikigaiNavButtonContent}>
              <MaterialIcons name="arrow-back" size={18} color="#342846" style={styles.ikigaiNavButtonIcon} />
              <Text style={styles.ikigaiNavButtonTextLeft}>{t('onboarding.back')}</Text>
            </View>
          </TouchableOpacity>
        )}
        {currentPage < 3 ? (
          <TouchableOpacity
            style={[styles.ikigaiNavButton, styles.ikigaiNavButtonRight]}
            onPress={() => {
              if (currentPage < 3) {
                const newPage = currentPage + 1;
                setCurrentPage(newPage);
                scrollViewRef.current?.scrollTo({ x: newPage * width, animated: true });
                if (onPageChange) {
                  onPageChange(newPage);
                }
              }
            }}
          >
            <Text style={styles.ikigaiNavButtonText}>{t('onboarding.nextQuestion')}</Text>
          </TouchableOpacity>
        ) : (
          currentPage === 3 && onContinue && (
            <TouchableOpacity
              style={[styles.ikigaiNavButton, styles.ikigaiNavButtonRight, styles.ikigaiContinueButton]}
              onPress={async () => {
                if (onContinue) {
                  await onContinue();
                }
              }}
            >
              <Text style={styles.ikigaiNavButtonText}>{t('common.continue')}</Text>
            </TouchableOpacity>
          )
        )}
      </View>
      </View>

      {/* Assistance Modal */}
      <Modal
        visible={assistanceModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAssistanceModal(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setAssistanceModal(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('onboarding.suggestions')}</Text>
            {assistanceModal && (
              <Text style={styles.modalHelperText}>
                {assistanceModal === 'whatYouLove' ? t('onboarding.whatDoYouLoveHelper') :
                 assistanceModal === 'whatYouGoodAt' ? t('onboarding.whatAreYouGoodAtHelper') :
                 assistanceModal === 'whatWorldNeeds' ? t('onboarding.whatDoesWorldNeedHelper') :
                 t('onboarding.whatCanBePaidForHelper')}
              </Text>
            )}
            <ScrollView style={styles.suggestionsList}>
              {assistanceModal && getSuggestions(assistanceModal).map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionSelect(suggestion, assistanceModal)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAssistanceModal(null)}
            >
              <Text style={styles.modalCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function LoadingStep({ onComplete, isActive }: LoadingStepProps) {
  const { t } = useTranslation();
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const hasStartedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  
  // Keep ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  const loadingItems = t('onboarding.loadingItems', { returnObjects: true }) as string[];

  useEffect(() => {
    // Only start loading when this step is active
    if (!isActive) {
      // Reset if we're not active
      if (hasStartedRef.current) {
        setCompletedItems(new Set());
        hasStartedRef.current = false;
      }
      return;
    }

    // Prevent multiple starts
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    // Simulate loading progress
    const timers: ReturnType<typeof setTimeout>[] = [];
    
    loadingItems.forEach((_, index) => {
      const timer = setTimeout(() => {
        setCompletedItems(prev => {
          const newSet = new Set(prev);
          newSet.add(index);
          return newSet;
        });
      }, (index + 1) * 1500); // 1.5 seconds between each item
      timers.push(timer);
    });

    // Call onComplete after all items are done
    const finalTimer = setTimeout(() => {
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }, loadingItems.length * 1500 + 500);

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      clearTimeout(finalTimer);
      hasStartedRef.current = false;
    };
  }, [isActive]);

  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingTitle}>{t('onboarding.step6Title')}</Text>
      
      <Image
        source={require('../assets/images/deer.face.png')}
        style={styles.deerFaceImage}
        resizeMode="contain"
      />

      <View style={styles.loadingList}>
        {loadingItems.map((item, index) => {
          const isCompleted = completedItems.has(index);
          return (
            <View key={index} style={styles.loadingItem}>
              <Text style={styles.loadingItemText}>
                {isCompleted ? '✓ ' : '• '}
                {item}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface CurrentLifeContextStepProps {
  currentSituation: string;
  setCurrentSituation: (value: string) => void;
  biggestConstraint: string;
  setBiggestConstraint: (value: string) => void;
  whatMattersMost: string[];
  setWhatMattersMost: (value: string[]) => void;
  onContinue: () => void;
}

function CurrentLifeContextStep({
  currentSituation,
  setCurrentSituation,
  biggestConstraint,
  setBiggestConstraint,
  whatMattersMost,
  setWhatMattersMost,
  onContinue,
}: CurrentLifeContextStepProps) {
  const { t } = useTranslation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Prevent any auto-advance - ensure onContinue is only called via explicit button press
  const onContinueRef = useRef(onContinue);
  useEffect(() => {
    onContinueRef.current = onContinue;
  }, [onContinue]);

  const questions = [
    {
      id: 'situation',
      question: t('onboarding.currentSituationQuestion'),
      options: [
        t('onboarding.situationOption1'),
        t('onboarding.situationOption2'),
        t('onboarding.situationOption3'),
        t('onboarding.situationOption4'),
        t('onboarding.situationOption5'),
        t('onboarding.situationOption6'),
      ],
      singleSelect: true,
      value: currentSituation,
      setValue: (val: string) => setCurrentSituation(val),
    },
    {
      id: 'constraint',
      question: t('onboarding.biggestConstraintQuestion'),
      options: [
        t('onboarding.constraintOption1'),
        t('onboarding.constraintOption2'),
        t('onboarding.constraintOption3'),
        t('onboarding.constraintOption4'),
        t('onboarding.constraintOption5'),
      ],
      singleSelect: true,
      value: biggestConstraint,
      setValue: (val: string) => setBiggestConstraint(val),
    },
    {
      id: 'whatMatters',
      question: t('onboarding.whatMattersQuestion'),
      options: [
        t('onboarding.mattersOption1'),
        t('onboarding.mattersOption2'),
        t('onboarding.mattersOption3'),
        t('onboarding.mattersOption4'),
        t('onboarding.mattersOption5'),
        t('onboarding.mattersOption6'),
        t('onboarding.mattersOption7'),
        t('onboarding.mattersOption8'),
      ],
      singleSelect: false,
      value: whatMattersMost,
      setValue: (val: string[]) => setWhatMattersMost(val),
    },
  ];

  const currentQuestion = questions[currentQuestionIndex];

  const handleOptionSelect = (option: string) => {
    if (currentQuestion.singleSelect) {
      (currentQuestion.setValue as (val: string) => void)(option);
      // Auto-advance to next question for single-select questions (first two)
      if (currentQuestionIndex < questions.length - 1) {
        setTimeout(() => {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }, 300); // Small delay for better UX
      }
    } else {
      // Multi-select logic (up to 3)
      const currentValues = currentQuestion.value as string[];
      if (currentValues.includes(option)) {
        // Deselect
        (currentQuestion.setValue as (val: string[]) => void)(currentValues.filter(v => v !== option));
      } else if (currentValues.length < 3) {
        // Select (if less than 3)
        (currentQuestion.setValue as (val: string[]) => void)([...currentValues, option]);
      }
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const canContinue = currentQuestionIndex === questions.length - 1 && 
    (currentQuestion.singleSelect 
      ? (currentQuestion.value as string).length > 0 
      : (currentQuestion.value as string[]).length > 0);

  // Ensure no auto-advance - only allow manual continue button press
  const handleContinue = () => {
    if (canContinue && onContinueRef.current) {
      onContinueRef.current();
    }
  };

  return (
    <View style={styles.formContainer}>
      <View style={[styles.formContainer, styles.lifeContextContent]}>
        {/* Header */}
        <View style={styles.lifeContextHeader}>
          <Text style={styles.lifeContextTitle}>{t('onboarding.currentLifeContext')}</Text>
          <Text style={styles.lifeContextSubtitle}>{t('onboarding.currentLifeContextSubtitle')}</Text>
        </View>

        {/* Question Card */}
        <ImageBackground 
          source={require('../assets/images/goal.background.png')}
          style={[styles.questionCard, currentQuestionIndex === 2 && styles.questionCardTall]}
          imageStyle={styles.questionCardImage}
          resizeMode="cover"
        >
          {/* Back Arrow */}
          {currentQuestionIndex > 0 && (
            <TouchableOpacity 
              style={styles.questionCardBackButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color="#342846" />
            </TouchableOpacity>
          )}

          {/* Question */}
          <Text style={styles.questionCardTitle}>{currentQuestion.question}</Text>

          {/* Options */}
          {currentQuestionIndex === 2 ? (
            <View style={styles.optionsScrollWrapper}>
              <ScrollView 
                style={styles.optionsScrollContainer}
                contentContainerStyle={styles.optionsContainer}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                indicatorStyle="white"
              >
                {currentQuestion.options.map((option, index) => {
                  const isSelected = (currentQuestion.value as string[]).includes(option);
                  const isDisabled = !isSelected && (currentQuestion.value as string[]).length >= 3;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        isSelected && styles.optionButtonSelected,
                        isDisabled && styles.optionButtonDisabled,
                      ]}
                      onPress={() => handleOptionSelect(option)}
                      disabled={isDisabled}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.optionButtonText,
                        isSelected && styles.optionButtonTextSelected,
                        isDisabled && styles.optionButtonTextDisabled,
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, index) => {
                const isSelected = currentQuestion.singleSelect
                  ? currentQuestion.value === option
                  : (currentQuestion.value as string[]).includes(option);
                const isDisabled = !currentQuestion.singleSelect && 
                  !isSelected && 
                  (currentQuestion.value as string[]).length >= 3;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected,
                      isDisabled && styles.optionButtonDisabled,
                    ]}
                    onPress={() => handleOptionSelect(option)}
                    disabled={isDisabled}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      isSelected && styles.optionButtonTextSelected,
                      isDisabled && styles.optionButtonTextDisabled,
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Progress indicator */}
          <View style={styles.questionProgress}>
            {questions.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.questionProgressDot,
                  index === currentQuestionIndex && styles.questionProgressDotActive,
                  index < currentQuestionIndex && styles.questionProgressDotCompleted,
                ]}
              />
            ))}
          </View>

          {/* Next Button - Removed from first two questions, only show if needed on last question */}
          {false && currentQuestionIndex < questions.length - 1 && (
            <TouchableOpacity
              style={[
                styles.lifeContextNextButton,
                !(currentQuestion.singleSelect 
                  ? (currentQuestion.value as string).length > 0 
                  : (currentQuestion.value as string[]).length > 0) && styles.lifeContextNextButtonDisabled
              ]}
              onPress={() => {
                if (currentQuestion.singleSelect 
                  ? (currentQuestion.value as string).length > 0 
                  : (currentQuestion.value as string[]).length > 0) {
                  setCurrentQuestionIndex(currentQuestionIndex + 1);
                }
              }}
              disabled={!(currentQuestion.singleSelect 
                ? (currentQuestion.value as string).length > 0 
                : (currentQuestion.value as string[]).length > 0)}
              activeOpacity={1}
            >
              <Text style={styles.lifeContextNextButtonText}>{t('onboarding.nextQuestion')}</Text>
            </TouchableOpacity>
          )}
        </ImageBackground>
      </View>

      {/* Continue Button - Only show on last question */}
      {canContinue && (
        <TouchableOpacity 
          style={styles.lifeContextContinueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.lifeContextContinueButtonText}>{t('common.continue')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Pulsating Aura Component for Ikigai with Radial Gradient
function IkigaiAura() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;
  
  // Individual pulse animations for each layer with slight delays
  const layer1Pulse = useRef(new Animated.Value(1)).current;
  const layer2Pulse = useRef(new Animated.Value(1)).current;
  const layer3Pulse = useRef(new Animated.Value(1)).current;
  const layer4Pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Main pulse animation for all layers
    const pulseAnimation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.5,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        // Layer 1 pulse (outermost)
        Animated.sequence([
          Animated.timing(layer1Pulse, {
            toValue: 1.15,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(layer1Pulse, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        // Layer 2 pulse
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(layer2Pulse, {
            toValue: 1.13,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(layer2Pulse, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        // Layer 3 pulse
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(layer3Pulse, {
            toValue: 1.11,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(layer3Pulse, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        // Layer 4 pulse (innermost)
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(layer4Pulse, {
            toValue: 1.09,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(layer4Pulse, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, []);

  // Create radial gradient effect using blue #baccd7 with gradient towards white
  // Outer circles fade from white/transparent to blue, creating a radial fade effect
  const animatedOpacity1 = opacityAnim.interpolate({
    inputRange: [0.3, 0.5],
    outputRange: [0.2, 0.3],
  });
  const animatedOpacity2 = opacityAnim.interpolate({
    inputRange: [0.3, 0.5],
    outputRange: [0.3, 0.4],
  });
  const animatedOpacity3 = opacityAnim.interpolate({
    inputRange: [0.3, 0.5],
    outputRange: [0.4, 0.5],
  });
  const animatedOpacity4 = opacityAnim.interpolate({
    inputRange: [0.3, 0.5],
    outputRange: [0.5, 0.6],
  });

  // Blue color #baccd7 = rgb(186, 204, 215)
  const blueColor = 'rgba(186, 204, 215, 1)';
  const whiteColor = 'rgba(255, 255, 255, 1)';

  return (
    <Animated.View
      style={[
        styles.ikigaiAuraContainer,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {/* Layer 1 - Outermost, most transparent - radial fade from white edge to blue center */}
      <Animated.View
        style={[
          styles.ikigaiAuraLayer1,
          {
            transform: [{ scale: layer1Pulse }],
            opacity: animatedOpacity1,
          },
        ]}
      >
        <LinearGradient
          colors={[
            whiteColor,                    // White at edge
            'rgba(255, 255, 255, 0.7)',   // Fading white
            'rgba(186, 204, 215, 0.3)',  // Light blue
            'rgba(186, 204, 215, 0.5)',  // Medium blue toward center
          ]}
          locations={[0, 0.3, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* Layer 2 - Outer - radial fade from white edge to blue center */}
      <Animated.View
        style={[
          styles.ikigaiAuraLayer2,
          {
            transform: [{ scale: layer2Pulse }],
            opacity: animatedOpacity2,
          },
        ]}
      >
        <LinearGradient
          colors={[
            whiteColor,                    // White at edge
            'rgba(255, 255, 255, 0.5)',   // Fading white
            'rgba(186, 204, 215, 0.4)',  // Light blue
            'rgba(186, 204, 215, 0.65)', // Medium blue toward center
          ]}
          locations={[0, 0.3, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* Layer 3 - Middle - radial fade from white edge to blue center */}
      <Animated.View
        style={[
          styles.ikigaiAuraLayer3,
          {
            transform: [{ scale: layer3Pulse }],
            opacity: animatedOpacity3,
          },
        ]}
      >
        <LinearGradient
          colors={[
            whiteColor,                    // White at edge
            'rgba(255, 255, 255, 0.4)',   // Fading white
            'rgba(186, 204, 215, 0.5)',  // Light blue
            'rgba(186, 204, 215, 0.8)',  // Stronger blue toward center
          ]}
          locations={[0, 0.3, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* Layer 4 - Inner - radial fade from white edge to blue center */}
      <Animated.View
        style={[
          styles.ikigaiAuraLayer4,
          {
            transform: [{ scale: layer4Pulse }],
            opacity: animatedOpacity4,
          },
        ]}
      >
        <LinearGradient
          colors={[
            whiteColor,                    // White at edge
            'rgba(255, 255, 255, 0.3)',   // Fading white
            'rgba(186, 204, 215, 0.6)',  // Light blue
            blueColor,                    // Full blue toward center
          ]}
          locations={[0, 0.3, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

function CallingAwaitsStep({ 
  userName,
  birthMonth,
  birthDate,
  birthYear,
  birthCity,
  birthHour,
  birthMinute,
  birthPeriod,
  whatYouLove,
  whatYouGoodAt,
  whatWorldNeeds,
  whatCanBePaidFor,
  fear,
  whatExcites,
  onContinue,
}: CallingAwaitsStepProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState<{
    naturalGifts: Array<{ name: string; description: string }>;
    ikigaiCircles: {
      whatYouLove: string;
      whatYouGoodAt: string;
      whatWorldNeeds: string;
      whatCanBePaidFor: string;
    };
    centerSummary: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
    setIsLoading(true);
      try {
        // AI generation disabled to save credits
        // const generatedContent = await generateCallingAwaitsContent(
        //   birthMonth || '',
        //   birthDate || '',
        //   birthYear || '',
        //   birthCity,
        //   birthHour,
        //   birthMinute,
        //   birthPeriod,
        //   whatYouLove,
        //   whatYouGoodAt,
        //   whatWorldNeeds,
        //   whatCanBePaidFor,
        //   fear,
        //   whatExcites
        // );
        
        // Using fallback content instead
        const generatedContent = {
          naturalGifts: [
            { name: 'Creative expression', description: 'Your ability to express yourself through art, writing, or creative mediums that resonate with your inner truth.' },
            { name: 'Bold leadership', description: 'Your natural capacity to inspire and guide others toward meaningful change and transformation.' },
            { name: 'Artistic communication', description: 'Your gift for conveying complex ideas and emotions through visual, written, or spoken forms.' },
            { name: 'Initiating projects', description: 'Your talent for starting new ventures and bringing innovative ideas to life with passion and determination.' },
          ],
          ikigaiCircles: {
            whatYouLove: whatYouLove ? whatYouLove.split(' ').slice(0, 3).join(' ') : 'Your passions',
            whatYouGoodAt: whatYouGoodAt ? whatYouGoodAt.split(' ').slice(0, 3).join(' ') : 'Your talents',
            whatWorldNeeds: whatWorldNeeds ? whatWorldNeeds.split(' ').slice(0, 3).join(' ') : 'World needs',
            whatCanBePaidFor: whatCanBePaidFor ? whatCanBePaidFor.split(' ').slice(0, 3).join(' ') : 'Monetizable skills',
          },
          centerSummary: 'Your unique path to purpose and fulfillment.',
        };
        setContent(generatedContent);
      } catch (error) {
        console.error('Error generating calling awaits content:', error);
        // Fallback to placeholder content if API fails
      setContent({
        naturalGifts: [
          { name: 'Creative expression', description: 'Your ability to express yourself through art, writing, or creative mediums that resonate with your inner truth.' },
          { name: 'Bold leadership', description: 'Your natural capacity to inspire and guide others toward meaningful change and transformation.' },
          { name: 'Artistic communication', description: 'Your gift for conveying complex ideas and emotions through visual, written, or spoken forms.' },
          { name: 'Initiating projects', description: 'Your talent for starting new ventures and bringing innovative ideas to life with passion and determination.' },
        ],
        ikigaiCircles: {
          whatYouLove: whatYouLove ? whatYouLove.split(' ').slice(0, 3).join(' ') : 'Your passions',
          whatYouGoodAt: whatYouGoodAt ? whatYouGoodAt.split(' ').slice(0, 3).join(' ') : 'Your talents',
          whatWorldNeeds: whatWorldNeeds ? whatWorldNeeds.split(' ').slice(0, 3).join(' ') : 'World needs',
          whatCanBePaidFor: whatCanBePaidFor ? whatCanBePaidFor.split(' ').slice(0, 3).join(' ') : 'Monetizable skills',
        },
        centerSummary: 'Your unique path to purpose and fulfillment.',
      });
      } finally {
      setIsLoading(false);
      }
    };
    
    loadContent();
  }, [birthMonth, birthDate, birthYear, birthCity, birthHour, birthMinute, birthPeriod, whatYouLove, whatYouGoodAt, whatWorldNeeds, whatCanBePaidFor, fear, whatExcites]);

  return (
    <View style={styles.formContainer}>
      <ScrollView 
        style={styles.formContainer}
        contentContainerStyle={styles.destinyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Section: Icon, Name, and Title */}
        <View style={styles.destinyTopSection}>
          {/* User Icon */}
          <View style={styles.userIconContainer}>
            <View style={styles.userIconCircle}>
              <Text style={styles.userIconText}>{userName ? userName.charAt(0).toUpperCase() : 'A'}</Text>
            </View>
          </View>

        {/* Name */}
          <Text style={styles.destinyNameText}>{userName || 'Arina'}</Text>
          
          {/* Title */}
          <Text style={styles.destinyTitleText}>{t('onboarding.callingAwaits')}</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('onboarding.generatingProfile')}</Text>
          </View>
        ) : (
          <>
            {/* Natural Gifts Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('onboarding.yourNaturalGifts')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Natural Gifts - Individual Cards */}
            <View style={styles.giftsContainer}>
              {content?.naturalGifts.map((gift, index) => (
                <ImageBackground 
                  key={index} 
                  source={require('../assets/images/purple.background.jpeg')}
                  style={styles.giftCard}
                  imageStyle={styles.giftCardImage}
                  resizeMode="cover"
                >
                  <Text style={styles.giftCardHeading}>{gift.name}</Text>
                  <Text style={styles.giftCardBody}>{gift.description}</Text>
                </ImageBackground>
          ))}
        </View>

            {/* Bottom Section: Ikigai Map */}
            <View style={styles.ikigaiMapSection}>
              <Text style={styles.ikigaiMapTitle}>{t('onboarding.ikigaiMapTitle')}</Text>
              <Text style={styles.ikigaiPurposeText}>{content?.centerSummary || 'Your unique path to purpose and fulfillment.'}</Text>
            </View>
          </>
        )}
      </ScrollView>
      {/* Continue Button - Fixed at bottom */}
      {!isLoading && (
        <TouchableOpacity 
          style={styles.destinyContinueButton}
          onPress={onContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.destinyContinueButtonText}>{t('common.continue')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PathsAlignedStep({ 
  onExplorePath, 
  onWorkOnDreamGoal,
  onPathsGenerated,
  birthMonth,
  birthDate,
  birthYear,
  birthCity,
  birthHour,
  birthMinute,
  birthPeriod,
  whatYouLove,
  whatYouGoodAt,
  whatWorldNeeds,
  whatCanBePaidFor,
  fear,
  whatExcites,
}: PathsAlignedStepProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [paths, setPaths] = useState<Array<{ id: number; title: string; description: string; glowColor: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPaths = async () => {
    setIsLoading(true);
      try {
        // AI generation disabled to save credits
        // const generatedPaths = await generateCallingPaths(
        //   birthMonth || '',
        //   birthDate || '',
        //   birthYear || '',
        //   birthCity,
        //   birthHour,
        //   birthMinute,
        //   birthPeriod,
        //   whatYouLove,
        //   whatYouGoodAt,
        //   whatWorldNeeds,
        //   whatCanBePaidFor,
        //   fear,
        //   whatExcites
        // );
        
        // Using fallback paths instead
        const generatedPaths = [
    {
      id: 1,
          title: 'The Visionary',
          description: 'A path aligned with your unique talents and passions.',
          glowColor: '#c6afb8',
    },
    {
      id: 2,
          title: 'The Architect',
          description: 'A journey that helps you overcome fears and reach your potential.',
          glowColor: '#baccd7',
    },
    {
      id: 3,
          title: 'The Influencer',
          description: 'A way to make a meaningful difference in the world.',
          glowColor: '#e1e1bb',
        },
      ];
        
        // The generated paths already include id field
        setPaths(generatedPaths);
      // Notify parent component of generated paths
      if (onPathsGenerated) {
          onPathsGenerated(generatedPaths);
        }
      } catch (error) {
        console.error('Error generating calling paths:', error);
        // Fallback to placeholder paths if API fails
        const fallbackPaths = [
          {
            id: 1,
            title: 'The Visionary',
            description: 'A path aligned with your unique talents and passions.',
            glowColor: '#c6afb8',
          },
          {
            id: 2,
            title: 'The Architect',
            description: 'A journey that helps you overcome fears and reach your potential.',
            glowColor: '#baccd7',
          },
          {
            id: 3,
            title: 'The Influencer',
            description: 'A way to make a meaningful difference in the world.',
            glowColor: '#e1e1bb',
          },
        ];
        setPaths(fallbackPaths);
        if (onPathsGenerated) {
          onPathsGenerated(fallbackPaths);
        }
      } finally {
      setIsLoading(false);
      }
    };
    
    loadPaths();
  }, [birthMonth, birthDate, birthYear, birthCity, birthHour, birthMinute, birthPeriod, whatYouLove, whatYouGoodAt, whatWorldNeeds, whatCanBePaidFor, fear, whatExcites]);

  return (
    <ScrollView 
      style={styles.formContainer}
      contentContainerStyle={styles.pathsContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.formTitle}>{t('onboarding.whichDirectionCallsYou')}</Text>
      <Text style={styles.pathsBodyText}>{t('onboarding.selectTrajectory')}</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Generating your personalized paths...</Text>
        </View>
      ) : paths.length > 0 ? (
        paths.map((path) => {
          // Convert hex color to rgba for gradient
          const hexToRgba = (hex: string, alpha: number) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          };
          
          return (
            <View key={path.id} style={styles.pathCardContainer}>
              <ImageBackground 
                source={require('../assets/images/goal.background.png')}
                style={styles.pathCard}
                imageStyle={styles.pathCardImage}
              >
                <View style={styles.pathCardContent}>
                  <Text style={styles.pathTitle}>{path.title}</Text>
                  <Text style={styles.pathDescription}>{path.description}</Text>
                  <TouchableOpacity 
                    style={styles.exploreButton}
                    onPress={() => onExplorePath?.(path.id)}
                  >
                    <Text style={styles.exploreButtonText}>{t('common.explorePath')}</Text>
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            </View>
          );
        })
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('onboarding.noPathsAvailable')}</Text>
        </View>
      )}

      <TouchableOpacity 
        onPress={onWorkOnDreamGoal}
        activeOpacity={0.8}
        style={styles.customPathWrapper}
      >
        <View style={styles.customPathContainer}>
          <View style={styles.customPathIconContainer}>
            <MaterialIcons name="auto-fix-high" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.customPathTextContainer}>
            <Text style={styles.customPathHeading}>{t('onboarding.customPathHeadingPath')}</Text>
            <Text style={styles.customPathBody}>{t('onboarding.defineCustomParameters')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

interface JourneyLoadingStepProps {
  onComplete: () => void;
  loadingItems: string[];
}

function JourneyLoadingStep({ onComplete, loadingItems }: JourneyLoadingStepProps) {
  const { t } = useTranslation();
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Simulate loading progress
    const timers: ReturnType<typeof setTimeout>[] = [];
    
    loadingItems.forEach((_, index) => {
      const timer = setTimeout(() => {
        setCompletedItems(prev => new Set(prev).add(index));
      }, (index + 1) * 1500); // 1.5 seconds between each item
      timers.push(timer);
    });

    // Call onComplete after all items are done
    const finalTimer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, loadingItems.length * 1500 + 500);

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      clearTimeout(finalTimer);
    };
  }, []);

  return (
    <View style={styles.journeyLoadingContainer}>
      <Text style={styles.journeyLoadingTitle}>{t('onboarding.weAreCreatingYourJourney')}</Text>
      
      <Image
        source={require('../assets/images/deer.face.png')}
        style={styles.journeyDeerImage}
        resizeMode="contain"
      />

      <View style={styles.journeyLoadingList}>
        {loadingItems.map((item, index) => {
          const isCompleted = completedItems.has(index);
          return (
            <View key={index} style={styles.journeyLoadingItem}>
              <Text style={styles.journeyLoadingItemText}>
                {isCompleted ? '✓ ' : ''}
                {item}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function PathExplorationStep({
  pathName,
  pathDescription,
  userName,
  onStartJourney,
  onWorkOnDreamGoal,
  birthMonth,
  birthDate,
  birthYear,
  birthCity,
  birthHour,
  birthMinute,
  birthPeriod,
  whatYouLove,
  whatYouGoodAt,
  whatWorldNeeds,
  whatCanBePaidFor,
  fear,
  whatExcites,
}: PathExplorationStepProps) {
  const { t } = useTranslation();
  const [whyFitsYou, setWhyFitsYou] = useState<string[]>([
    t('onboarding.loadingReasons'),
  ]);
  const [goals, setGoals] = useState<Array<{ id: number; title: string; descriptor: string; timeFrame: string; description: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const zoomAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    const loadPathContent = async () => {
    setIsLoading(true);
    // Reset animations
    zoomAnim.setValue(0);
    opacityAnim.setValue(1);
    
      try {
        // AI generation disabled to save credits
        // const pathContent = await generatePathContent(
        //   pathName,
        //   pathDescription || '',
        //   birthMonth || '',
        //   birthDate || '',
        //   birthYear || '',
        //   birthCity,
        //   birthHour,
        //   birthMinute,
        //   birthPeriod,
        //   whatYouLove,
        //   whatYouGoodAt,
        //   whatWorldNeeds,
        //   whatCanBePaidFor,
        //   fear,
        //   whatExcites
        // );
        
        // Using fallback content instead
        const pathContent = {
          whyFitsYou: [
            'This path aligns with your unique strengths and passions.',
            'Your astrological profile supports this direction.',
            'This path addresses your goals while overcoming your fears.',
          ],
          goals: [
            {
              id: 1,
              title: 'Become a full-time professional in this path',
              descriptor: 'Executive',
              timeFrame: 'Three months, four steps',
              description: 'Design and launch internal startups to diversify company portfolio and revenue streams.',
            },
            {
              id: 2,
              title: 'Launch your own venture in this field',
              descriptor: 'Leader',
              timeFrame: 'Six months, eight steps',
              description: 'Build a sustainable business model that aligns with your values and creates meaningful impact.',
            },
            {
              id: 3,
              title: 'Create and share your work online',
              descriptor: 'Creator',
              timeFrame: 'Two months, three steps',
              description: 'Establish your digital presence and monetize your creative work through strategic content and community building.',
            },
          ],
        };
        
        // Set the personalized "Why it fits you" reasons
        setWhyFitsYou(pathContent.whyFitsYou);
        
        // Map the goals to match the expected structure
        const mappedGoals = pathContent.goals.map((goal, index) => ({
          id: goal.id || index + 1,
          title: goal.title,
          descriptor: goal.descriptor || goal.title.split(' ').slice(0, 2).join(' '), // Use descriptor from API or first 2 words as fallback
          timeFrame: goal.timeFrame,
          description: goal.description || '', // Use description from API
        }));
        
        setGoals(mappedGoals);
      } catch (error) {
        console.error('Error generating path content:', error);
        // Fallback to placeholder content if API fails
    setWhyFitsYou([
      'This path aligns with your unique strengths and passions.',
      'Your astrological profile supports this direction.',
      'This path addresses your goals while overcoming your fears.',
    ]);
    setGoals([
  {
    id: 1,
    title: 'Become a full-time professional in this path',
    descriptor: 'Executive',
    timeFrame: 'Three months, four steps',
    description: 'Design and launch internal startups to diversify company portfolio and revenue streams.',
  },
  {
    id: 2,
    title: 'Launch your own venture in this field',
    descriptor: 'Leader',
    timeFrame: 'Six months, eight steps',
    description: 'Build a sustainable business model that aligns with your values and creates meaningful impact.',
  },
  {
    id: 3,
    title: 'Create and share your work online',
    descriptor: 'Creator',
    timeFrame: 'Two months, three steps',
    description: 'Establish your digital presence and monetize your creative work through strategic content and community building.',
  },
    ]);
      }
    
    // White zoom-out effect - start from center and expand outward
    Animated.parallel([
      Animated.timing(zoomAnim, {
        toValue: 10,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsLoading(false);
    });
    };
    
    loadPathContent();
  }, [pathName, pathDescription, birthMonth, birthDate, birthYear, birthCity, birthHour, birthMinute, birthPeriod, whatYouLove, whatYouGoodAt, whatWorldNeeds, whatCanBePaidFor, fear, whatExcites]);

  // Show white zoom-out effect while transitioning
  if (isLoading) {
    return (
      <View style={styles.pathExplorationContainer}>
        <Animated.View
          style={[
            styles.whiteZoomOverlay,
            {
              transform: [{ scale: zoomAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={styles.pathExplorationContainer}>
    <ScrollView 
      style={styles.formContainer}
      contentContainerStyle={styles.pathExplorationContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Path Name */}
      <Text style={styles.pathNameTitle}>{pathName}</Text>
      
      {/* Future Trajectory */}
      <Text style={styles.futureTrajectoryTitle}>{t('onboarding.futureTrajectory')}</Text>

      {/* Why it fits you - Dating app bio style card */}
      <View style={styles.whyFitsYouCardContainer}>
        <ImageBackground 
          source={require('../assets/images/purple.background.jpeg')}
          style={styles.whyFitsYouCard}
          imageStyle={styles.whyFitsYouCardImage}
        >
          <View style={styles.whyFitsYouHeader}>
            <Text style={styles.whyFitsYouLabel}>{t('onboarding.whyItFitsYou')}</Text>
            <Text style={styles.whyFitsYouName}>{userName || t('onboarding.you')}</Text>
          </View>
          <View style={styles.whyFitsYouBio}>
            {whyFitsYou.map((reason, index) => (
              <Text key={index} style={styles.whyFitsYouBioText}>
                {reason}
              </Text>
            ))}
          </View>
        </ImageBackground>
      </View>

      {/* Specific goals section */}
      <Text style={styles.goalsSectionTitle}>{t('onboarding.specificGoalsYouCouldPursue')}</Text>
      
      {goals.map((goal) => (
        <View key={goal.id} style={styles.goalCard}>
          {/* Top Row: Heading (left) and Descriptor (right) */}
          <View style={styles.goalHeaderRow}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <View style={styles.goalDescriptorBadge}>
              <Text style={styles.goalDescriptorText}>{goal.descriptor}</Text>
            </View>
          </View>
          
          {/* Time Frame (Target) - beneath heading, small font, left-aligned */}
          <View style={styles.goalTimeFrameContainer}>
            <MaterialIcons name="schedule" size={14} color="#342846" style={styles.goalTimeFrameIcon} />
            <Text style={styles.goalTimeFrame}>{goal.timeFrame}</Text>
          </View>
          
          {/* Goal Description - left-aligned */}
          <Text style={styles.goalDescription}>{goal.description}</Text>
          
          {/* Start Journey Button with Arrow - full width */}
          <TouchableOpacity 
            style={styles.startJourneyButton}
            onPress={() => onStartJourney?.(goal.id, goal.title)}
          >
            <Text style={styles.startJourneyButtonText}>{t('landing.startJourney')}</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" style={styles.startJourneyArrow} />
          </TouchableOpacity>
        </View>
      ))}

      {/* Custom path option */}
      <TouchableOpacity 
        onPress={onWorkOnDreamGoal}
        activeOpacity={0.8}
        style={styles.customPathWrapper}
      >
        <View style={styles.customPathContainer}>
          <View style={styles.customPathIconContainer}>
            <MaterialIcons name="auto-fix-high" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.customPathTextContainer}>
            <Text style={styles.customPathHeading}>{t('onboarding.customPathHeading')}</Text>
            <Text style={styles.customPathBody}>{t('onboarding.defineCustomParameters')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}

// Custom Path Form Component
interface CustomPathDreamFormProps {
  onComplete: (pathData: {
    pathName: string;
    pathDescription: string;
    startingPoint: string;
    mainObstacle: string;
    obstacleOther?: string;
    timeline: string;
  }) => void;
  onBack?: () => void;
}

function CustomPathDreamForm({ onComplete, onBack }: CustomPathDreamFormProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pathName, setPathName] = useState('');
  const [pathDescription, setPathDescription] = useState('');
  const [startingPoint, setStartingPoint] = useState('');
  const [mainObstacle, setMainObstacle] = useState('');
  const [obstacleOther, setObstacleOther] = useState('');
  const [timeline, setTimeline] = useState('');
  const [showObstacleDropdown, setShowObstacleDropdown] = useState(false);
  const [showHelperModal, setShowHelperModal] = useState(false);
  const [showPathDescriptionHelper, setShowPathDescriptionHelper] = useState(false);
  const [showStartingPointHelper, setShowStartingPointHelper] = useState(false);
  
  // Error states
  const [pathNameError, setPathNameError] = useState('');
  const [pathDescriptionError, setPathDescriptionError] = useState('');
  const [startingPointError, setStartingPointError] = useState('');

  const obstacleOptions = [
    "I don't have the skills yet.",
    "I don't have enough time.",
    "I don't have enough money.",
    "I don't know where to start.",
    "I'm afraid of failing or judgment.",
    "I need credentials or formal education.",
    "Other."
  ];

  const timelineOptions = [
    "1-3 months, quick wins",
    "3-6 months, steady transformation",
    "6-12 months, major career shift",
    "1+ years, long-term vision"
  ];

  const validateForm = () => {
    let isValid = true;

    // Validate path name
    if (pathName.trim().length < 25) {
      setPathNameError("Please be more specific.");
      isValid = false;
    } else {
      setPathNameError('');
    }

    // Validate path description
    if (pathDescription.trim().length < 25) {
      setPathDescriptionError("Please bring at least 25 characters to this path.");
      isValid = false;
    } else {
      setPathDescriptionError('');
    }

    // Validate starting point
    if (startingPoint.trim().length < 25) {
      setStartingPointError("Please bring at least 25 characters to this path.");
      isValid = false;
    } else {
      setStartingPointError('');
    }

    // Validate obstacle
    if (!mainObstacle.trim()) {
      isValid = false;
    }

    // Validate timeline
    if (!timeline.trim()) {
      isValid = false;
    }

    // If "Other" is selected, validate obstacleOther
    if (mainObstacle === "Other." && !obstacleOther.trim()) {
      isValid = false;
    }

    // Show alert if validation fails
    if (!isValid) {
      if (!pathName.trim() || pathName.trim().length < 10) {
        // Error already set above
      } else if (!pathDescription.trim() || pathDescription.trim().length < 50) {
        // Error already set above
      } else if (!startingPoint.trim() || startingPoint.trim().length < 50) {
        // Error already set above
      } else if (!mainObstacle.trim()) {
        alert('Please select your biggest challenge.');
      } else if (!timeline.trim()) {
        alert('Please select when you want to see meaningful progress.');
      } else if (mainObstacle === "Other. Describe below" && !obstacleOther.trim()) {
        alert('Please describe your specific challenge.');
      }
    }

    return isValid;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onComplete({
        pathName: pathName.trim(),
        pathDescription: pathDescription.trim(),
        startingPoint: startingPoint.trim(),
        mainObstacle: mainObstacle.trim(),
        obstacleOther: mainObstacle === "Other. Describe below" ? obstacleOther.trim() : undefined,
        timeline: timeline.trim(),
      });
    }
  };

  return (
    <ImageBackground
      source={require('../assets/images/noise.background.png')}
      style={[styles.formContainer, { 
        position: 'absolute',
        top: -insets.top,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: height + insets.top,
      }]}
      imageStyle={styles.customPathFormBackgroundImage}
      resizeMode="cover"
    >
      {/* Header with Back Arrow and Helper Icon */}
      <View style={[styles.customPathHeader, { paddingTop: insets.top }]}>
        {onBack && (
          <TouchableOpacity 
            style={styles.customPathBackButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#342846" />
          </TouchableOpacity>
        )}
        <Text style={styles.customPathHeaderTitle}>Create your own path</Text>
        <TouchableOpacity
          style={styles.customPathHelperButton}
          onPress={() => setShowHelperModal(true)}
        >
          <MaterialIcons name="help-outline" size={24} color="#342846" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.formContainerScrollView}
        contentContainerStyle={[styles.customPathFormContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* App Heading */}
        <ImageBackground
          source={require('../assets/images/purple.background.jpeg')}
          style={styles.customPathAppHeadingCard}
          imageStyle={styles.purpleBackgroundImage}
          resizeMode="cover"
        >
          <Text style={styles.customPathAppHeading}>
            Tell us about the direction you want to pursue. We'll use this to generate personalized goals that match your vision.
          </Text>
        </ImageBackground>

        {/* Path Name Field */}
        <View style={styles.customPathFieldContainer}>
          <Text style={styles.customPathFieldLabel}>What do you want to become?</Text>
          <View style={[styles.bodyTextFieldWrapper, pathNameError && styles.fieldError]}>
            <TextInput
              style={styles.textField}
              value={pathName}
              onChangeText={(text) => {
                setPathName(text);
                if (text.trim().length >= 25) {
                  setPathNameError('');
                }
              }}
              placeholder='Name your path in two-five words. Example: "a freelance illustrator"'
              placeholderTextColor="#999"
            />
          </View>
          {pathNameError ? (
            <Text style={styles.fieldErrorText}>{pathNameError}</Text>
          ) : null}
        </View>

        {/* Path Description Field */}
        <View style={styles.customPathFieldContainer}>
          <View style={styles.customPathLabelWithHelper}>
            <Text style={styles.customPathFieldLabel}>Describe this path</Text>
            <TouchableOpacity
              style={styles.customPathHelperIcon}
              onPress={() => setShowPathDescriptionHelper(true)}
            >
              <MaterialIcons name="help-outline" size={20} color="#342846" />
            </TouchableOpacity>
          </View>
          <View style={[styles.bodyTextFieldWrapper, pathDescriptionError && styles.fieldError]}>
            <TextInput
              style={[styles.textField, styles.textArea]}
              value={pathDescription}
              onChangeText={(text) => {
                setPathDescription(text);
                if (text.trim().length >= 25) {
                  setPathDescriptionError('');
                }
              }}
              placeholder="What does success on this path look like? What will you be doing?"
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />
          </View>
          {pathDescriptionError ? (
            <Text style={styles.fieldErrorText}>{pathDescriptionError}</Text>
          ) : null}
        </View>

        {/* Starting Point Field */}
        <View style={styles.customPathFieldContainer}>
          <View style={styles.customPathLabelWithHelper}>
            <Text style={styles.customPathFieldLabel}>Where are you starting from?</Text>
            <TouchableOpacity
              style={styles.customPathHelperIcon}
              onPress={() => setShowStartingPointHelper(true)}
            >
              <MaterialIcons name="help-outline" size={20} color="#342846" />
            </TouchableOpacity>
          </View>
          <View style={[styles.bodyTextFieldWrapper, startingPointError && styles.fieldError]}>
            <TextInput
              style={[styles.textField, styles.textArea]}
              value={startingPoint}
              onChangeText={(text) => {
                setStartingPoint(text);
                if (text.trim().length >= 25) {
                  setStartingPointError('');
                }
              }}
              placeholder="What relevant skills, experience or resources do you already have?"
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />
          </View>
          {startingPointError ? (
            <Text style={styles.fieldErrorText}>{startingPointError}</Text>
          ) : null}
        </View>

        {/* Main Obstacle Field */}
        <View style={styles.customPathFieldContainer}>
          <Text style={[styles.customPathFieldLabel, { marginBottom: 8 }]}>Select your biggest challenge.</Text>
          <View style={styles.customPathDropdownWrapper}>
            <TouchableOpacity
              style={styles.customPathDropdownButton}
              onPress={() => setShowObstacleDropdown(!showObstacleDropdown)}
            >
              <Text 
                style={styles.customPathDropdownText}
              >
                {mainObstacle || ''}
              </Text>
              <Text style={styles.customPathDropdownArrow}>{showObstacleDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showObstacleDropdown && (
              <View style={styles.customPathDropdown}>
                <ScrollView style={styles.cityDropdownScrollView} nestedScrollEnabled>
                  {obstacleOptions.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.cityDropdownItem}
                      onPress={() => {
                        setMainObstacle(option);
                        setShowObstacleDropdown(false);
                        if (option !== "Other.") {
                          setObstacleOther('');
                        }
                      }}
                    >
                      <Text style={styles.cityDropdownText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          {mainObstacle === "Other." && (
            <View style={styles.bodyTextFieldWrapper}>
              <TextInput
                style={styles.textField}
                value={obstacleOther}
                onChangeText={setObstacleOther}
                placeholder="Describe your specific challenge"
                placeholderTextColor="#999"
                multiline
                textAlignVertical="center"
              />
            </View>
          )}
        </View>

        {/* Timeline Expectation Field */}
        <View style={styles.customPathFieldContainer}>
          <Text style={[styles.customPathFieldLabel, { marginBottom: 8 }]}>When do you want to see meaningful progress</Text>
          {timelineOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.radioButtonContainer}
              onPress={() => setTimeline(option)}
            >
              <View style={styles.radioButton}>
                {timeline === option && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.radioButtonLabel}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Generate Goals Button */}
        <TouchableOpacity 
          style={[styles.establishGoalButton, { marginTop: 5, marginBottom: 100 }]}
          onPress={handleSubmit}
        >
          <Text style={styles.establishGoalButtonText}>Generate my goals</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Helper Modal */}
      <Modal
        visible={showHelperModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHelperModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHelperModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.assistanceTextContainer}
          >
            <TouchableOpacity
              onPress={() => setShowHelperModal(false)}
              style={styles.closeAssistanceButton}
            >
              <Text style={styles.closeAssistanceButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.assistanceText}>
              You define the path, we help you walk it. Share your vision below and we'll create specific goals tailored to your situation.
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Path Description Helper Modal */}
      <Modal
        visible={showPathDescriptionHelper}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPathDescriptionHelper(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPathDescriptionHelper(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.assistanceTextContainer}
          >
            <TouchableOpacity
              onPress={() => setShowPathDescriptionHelper(false)}
              style={styles.closeAssistanceButton}
            >
              <Text style={styles.closeAssistanceButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.assistanceText}>
              Be specific so we can generate relevant goals.
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Starting Point Helper Modal */}
      <Modal
        visible={showStartingPointHelper}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStartingPointHelper(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStartingPointHelper(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.assistanceTextContainer}
          >
            <TouchableOpacity
              onPress={() => setShowStartingPointHelper(false)}
              style={styles.closeAssistanceButton}
            >
              <Text style={styles.closeAssistanceButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.assistanceText}>
              This helps us create realistic first steps.
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ImageBackground>
  );
}

interface CustomPathFormProps {
  onComplete: (pathData: {
    goalTitle: string;
    description: string;
    milestones: string[];
    targetTimeline: string;
  }) => void;
  onBack?: () => void;
}

function CustomPathForm({ onComplete, onBack }: CustomPathFormProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [goalTitle, setGoalTitle] = useState('');
  const [description, setDescription] = useState('');
  const [milestones, setMilestones] = useState<string[]>(['', '']);
  const [targetTimeline, setTargetTimeline] = useState('');
  const [showMilestoneAdvice, setShowMilestoneAdvice] = useState(false);
  const [showTimelineDropdown, setShowTimelineDropdown] = useState(false);
  const [isCustomTimeline, setIsCustomTimeline] = useState(false);
  
  const timelineOptions = [
    t('onboarding.timelineOneMonth'),
    t('onboarding.timelineThreeMonths'),
    t('onboarding.timelineSixMonths'),
    t('onboarding.timelineOneYear'),
    t('onboarding.timelineCustom'),
  ];

  const handleMilestoneChange = (index: number, value: string) => {
    const newMilestones = [...milestones];
    newMilestones[index] = value;
    setMilestones(newMilestones);
  };

  const addMilestone = () => {
    if (milestones.length < 4) {
      setMilestones([...milestones, '']);
    }
  };

  const handleEstablishGoal = () => {
    if (!goalTitle.trim() || !description.trim() || milestones.filter(m => m.trim()).length === 0 || !targetTimeline.trim()) {
      alert(t('onboarding.fillRequiredFields'));
      return;
    }
    
    onComplete({
      goalTitle: goalTitle.trim(),
      description: description.trim(),
      milestones: milestones.filter(m => m.trim()),
      targetTimeline: targetTimeline.trim(),
    });
  };

  return (
    <ImageBackground
      source={require('../assets/images/goal.background.png')}
      style={styles.formContainer}
      imageStyle={styles.customPathFormBackgroundImage}
      resizeMode="cover"
    >
      {/* Header with Back Arrow */}
      {onBack && (
        <View style={[styles.customPathHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity 
            style={styles.customPathBackButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#342846" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
      )}
      <ScrollView
        style={styles.formContainerScrollView}
        contentContainerStyle={styles.customPathFormContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      {/* Core Objective Card */}
      <View style={styles.customGoalCard}>
        <Text style={[styles.customGoalCardTitle, styles.coreObjectiveTitle]}>{t('onboarding.coreObjective')}</Text>
        
        {/* Goal Title */}
        <View style={styles.customGoalFieldContainer}>
          <Text style={styles.customGoalFieldLabel}>{t('onboarding.goalTitle')}</Text>
          <Text style={styles.customGoalFieldHelper}>{t('onboarding.goalTitleHelper')}</Text>
          <View style={styles.bodyTextFieldWrapper}>
            <TextInput
              style={styles.textField}
              value={goalTitle}
              onChangeText={setGoalTitle}
              placeholder=""
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.customGoalFieldContainer}>
          <Text style={styles.customGoalFieldLabel}>{t('onboarding.description')}</Text>
          <Text style={styles.customGoalFieldHelper}>{t('onboarding.descriptionHelper')}</Text>
          <View style={styles.bodyTextFieldWrapper}>
            <TextInput
              style={styles.textField}
              value={description}
              onChangeText={setDescription}
              placeholder=""
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>

      {/* Milestone Steps Card */}
      <View style={styles.customGoalCard}>
        <View style={styles.milestoneCardHeader}>
          <View style={styles.milestoneTitleContainer}>
            <Text style={[styles.customGoalCardTitle, styles.centeredCardTitle]}>{t('onboarding.milestoneSteps')}</Text>
          </View>
          <TouchableOpacity
            style={styles.adviceButton}
            onPress={() => setShowMilestoneAdvice(!showMilestoneAdvice)}
          >
            <MaterialIcons name="info-outline" size={20} color="#342846" />
          </TouchableOpacity>
        </View>

        {showMilestoneAdvice && (
          <View style={styles.adviceModal}>
            <Text style={styles.adviceText}>
              {t('onboarding.milestoneAdvice')}
            </Text>
          </View>
        )}

        {milestones.map((milestone, index) => (
          <View key={index} style={styles.customGoalFieldContainer}>
            <View style={styles.milestoneInputContainer}>
              <View style={styles.milestoneNumberIcon}>
                <Text style={styles.milestoneNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.milestoneTextFieldWrapper}>
                <TextInput
                  style={[styles.textField, styles.milestoneTextField]}
                  value={milestone}
                  onChangeText={(value) => handleMilestoneChange(index, value)}
                  placeholder=""
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        ))}

        {milestones.length < 4 && (
          <TouchableOpacity
            style={styles.addMilestoneButton}
            onPress={addMilestone}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.addMilestoneButtonText}>{t('onboarding.addMilestone')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Target Timeline Card */}
      <View style={styles.customGoalCard}>
        <Text style={[styles.customGoalCardTitle, styles.centeredCardTitle]}>{t('onboarding.targetTimeline')}</Text>
        <View style={styles.customGoalFieldContainer}>
          <Text style={styles.customGoalFieldHelper}>{t('onboarding.targetTimelineHelper')}</Text>
          {!isCustomTimeline ? (
            <>
              <TouchableOpacity
                style={styles.customPathDropdownButton}
                onPress={() => setShowTimelineDropdown(!showTimelineDropdown)}
              >
                <Text style={[styles.customPathDropdownText, !targetTimeline && styles.customPathDropdownPlaceholder]}>
                  {targetTimeline || t('onboarding.selectTimeline')}
                </Text>
                <Text style={styles.customPathDropdownArrow}>{showTimelineDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showTimelineDropdown && (
                <View style={styles.customPathDropdown}>
                  <ScrollView style={styles.cityDropdownScrollView} nestedScrollEnabled>
                    {timelineOptions.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.cityDropdownItem}
                        onPress={() => {
                          if (option === t('onboarding.timelineCustom')) {
                            setIsCustomTimeline(true);
                            setTargetTimeline('');
                            setShowTimelineDropdown(false);
                          } else {
                            setTargetTimeline(option);
                            setShowTimelineDropdown(false);
                            setIsCustomTimeline(false);
                          }
                        }}
                      >
                        <Text style={styles.cityDropdownText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          ) : (
            <View style={styles.bodyTextFieldWrapper}>
              <TextInput
                style={styles.textField}
                value={targetTimeline}
                onChangeText={setTargetTimeline}
                placeholder={t('onboarding.targetTimelinePlaceholder')}
                placeholderTextColor="#999"
              />
            </View>
          )}
        </View>
      </View>

      {/* Establish Goal Button */}
      <TouchableOpacity 
        style={styles.establishGoalButton}
        onPress={handleEstablishGoal}
      >
        <Text style={styles.establishGoalButtonText}>{t('onboarding.establishGoal')}</Text>
      </TouchableOpacity>

      {/* Quote */}
      <Text style={styles.goalQuote}>"{t('onboarding.goalQuote')}"</Text>
      </ScrollView>
    </ImageBackground>
  );
}

interface ObstaclePageProps {
  pathName: string;
  onContinue: (obstacle: string) => void;
}

function ObstaclePage({ pathName, onContinue }: ObstaclePageProps) {
  const { t } = useTranslation();
  const [obstacle, setObstacle] = useState('');

  const handleContinue = () => {
    if (obstacle.trim()) {
      onContinue(obstacle.trim());
    }
  };

  return (
    <ScrollView
      style={styles.formContainer}
      contentContainerStyle={styles.obstaclePageContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.obstaclePageTitle}>
        {t('onboarding.whatMightHoldYouBack', { pathName })}
      </Text>
      <Text style={styles.obstaclePageSubtext}>
        {t('onboarding.whatMightHoldYouBackSubtext')}
      </Text>

      <View style={styles.obstacleFieldContainer}>
        <View style={styles.bodyTextFieldWrapper}>
          <TextInput
            style={[styles.textField, styles.obstacleTextField]}
            value={obstacle}
            onChangeText={setObstacle}
            placeholder=""
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
          />
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.obstacleContinueButton, !obstacle.trim() && styles.obstacleContinueButtonDisabled]}
        onPress={handleContinue}
        disabled={!obstacle.trim()}
        activeOpacity={0.8}
      >
        <Text style={styles.obstacleContinueButtonText}>{t('onboarding.continue')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

interface PaywallStepProps {
  goalTitle: string;
  onStartJourney: () => void;
  birthMonth?: string;
  birthDate?: string;
  birthYear?: string;
  birthCity?: string;
  birthHour?: string;
  birthMinute?: string;
  birthPeriod?: string;
  whatYouLove?: string;
  whatYouGoodAt?: string;
  whatWorldNeeds?: string;
  whatCanBePaidFor?: string;
  fear?: string;
  whatExcites?: string;
}

// Shared animation state for synchronized checkmarks
let sharedCheckCounter = 1;
const checkmarkUpdateCallbacks: Array<(counter: number) => void> = [];

// Animated Checkmark Component that cycles from 1 to 5
function AnimatedCheckmark({ stepNumber }: { stepNumber: number }) {
  const [currentCheck, setCurrentCheck] = useState(sharedCheckCounter);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const updateCheckmark = (counter: number) => {
      const shouldShow = counter === stepNumber;
      setCurrentCheck(counter);
      
      if (shouldShow) {
        // Animate checkmark appearance
        opacityAnim.setValue(0);
        scaleAnim.setValue(0.5);
        
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();

        // Start pulsating effect
        const pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        );
        pulseAnimation.start();
      } else {
        // Hide checkmark smoothly
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.5,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };
    
    // Register callback
    checkmarkUpdateCallbacks.push(updateCheckmark);
    
    // Initial state
    updateCheckmark(sharedCheckCounter);
    
    return () => {
      // Unregister on unmount
      const index = checkmarkUpdateCallbacks.indexOf(updateCheckmark);
      if (index > -1) {
        checkmarkUpdateCallbacks.splice(index, 1);
      }
      pulseAnim.stopAnimation();
    };
  }, [stepNumber]);

  const showCheckmark = currentCheck === stepNumber;

  return (
    <View style={styles.checkmarkContainer}>
      <Animated.View
        style={[
          styles.checkmarkWrapper,
          {
            opacity: opacityAnim,
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
            ],
          },
        ]}
      >
        {showCheckmark && <Text style={styles.animatedCheckmark}>✓</Text>}
      </Animated.View>
    </View>
  );
}

function PaywallStep({ 
  goalTitle, 
  onStartJourney,
  birthMonth,
  birthDate,
  birthYear,
  birthCity,
  birthHour,
  birthMinute,
  birthPeriod,
  whatYouLove,
  whatYouGoodAt,
  whatWorldNeeds,
  whatCanBePaidFor,
  fear,
  whatExcites,
}: PaywallStepProps) {
  const { t } = useTranslation();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const [goalSteps, setGoalSteps] = useState<Array<{ number: number; text: string }>>([
    { number: 1, text: t('common.goalStep1') },
    { number: 2, text: t('common.goalStep2') },
    { number: 3, text: t('common.goalStep3') },
    { number: 4, text: t('common.goalStep4') },
    { number: 5, text: t('common.goalStep5') },
  ]);
  const [goalSummary, setGoalSummary] = useState<string>('');
  const [isLoadingSteps, setIsLoadingSteps] = useState(true);
  const [highlightedLevel, setHighlightedLevel] = useState(1);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Light bulb rotation animation
  const bulbRotation = useRef(new Animated.Value(0)).current;
  
  // Start the global animation cycle for all checkmarks
  useEffect(() => {
    const interval = setInterval(() => {
      sharedCheckCounter = sharedCheckCounter >= 5 ? 1 : sharedCheckCounter + 1;
      // Notify all checkmark components
      checkmarkUpdateCallbacks.forEach(callback => callback(sharedCheckCounter));
    }, 700); // Change checkmark every 0.7 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Level highlight pulsing animation - cycles through levels 1-5
  useEffect(() => {
    const levelInterval = setInterval(() => {
      setHighlightedLevel((prev) => {
        const next = prev >= 5 ? 1 : prev + 1;
        return next;
      });
    }, 2000); // Change level every 2 seconds

    return () => {
      clearInterval(levelInterval);
    };
  }, []);

  // Pulse animation for highlighted badge
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [highlightedLevel]);

  // Start light bulb rotation animation
  useEffect(() => {
    const rotateAnimation = Animated.loop(
      Animated.timing(bulbRotation, {
        toValue: 1,
        duration: 2000, // 2 seconds for full rotation
        useNativeDriver: true,
      })
    );
    rotateAnimation.start();

    return () => {
      rotateAnimation.stop();
    };
  }, []);

  // Generate goal steps on mount
  useEffect(() => {
    setIsLoadingSteps(true);
    // Use placeholder goal steps instead of API call
    setTimeout(() => {
      setGoalSteps([
        { number: 1, text: t('common.goalStep1') },
        { number: 2, text: t('common.goalStep2') },
        { number: 3, text: t('common.goalStep3') },
        { number: 4, text: t('common.goalStep4') },
        { number: 5, text: t('common.goalStep5') },
      ]);
      setGoalSummary(`You ${goalTitle.toLowerCase()}.`);
      setIsLoadingSteps(false);
    }, 500);
  }, [goalTitle, birthMonth, birthDate, birthYear, birthCity, birthHour, birthMinute, birthPeriod, whatYouLove, whatYouGoodAt, whatWorldNeeds, whatCanBePaidFor, fear, whatExcites]);

  const benefitCards = [
    {
      heading: t('common.benefit1Heading'),
      body: t('common.benefit1Body'),
    },
    {
      heading: t('common.benefit2Heading'),
      body: t('common.benefit2Body'),
    },
    {
      heading: t('common.benefit3Heading'),
      body: t('common.benefit3Body'),
    },
    {
      heading: t('common.benefit4Heading'),
      body: t('common.benefit4Body'),
    },
  ];

  const cardWidth = width - 50;
  const currentCardIndexRef = useRef(currentCardIndex);
  
  // Keep ref in sync with state
  useEffect(() => {
    currentCardIndexRef.current = currentCardIndex;
    cardAnim.setValue(-currentCardIndex * cardWidth);
  }, [currentCardIndex, cardWidth]);

  const [isSwiping, setIsSwiping] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Only capture if horizontal movement is more dominant
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Require horizontal movement to be dominant and significant
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasSignificantMovement = Math.abs(gestureState.dx) > 10;
        return isHorizontal && hasSignificantMovement;
      },
      onPanResponderGrant: () => {
        setIsSwiping(true);
        cardAnim.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        // Only process horizontal movement, ignore vertical
        if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
          const baseValue = -currentCardIndexRef.current * cardWidth;
          const newValue = baseValue + gestureState.dx;
          const minValue = -(benefitCards.length - 1) * cardWidth;
          const maxValue = 0;
          const clampedValue = Math.max(minValue, Math.min(maxValue, newValue));
          cardAnim.setValue(clampedValue);
        }
      },
      onPanResponderTerminationRequest: () => {
        // Prevent ScrollView from taking over during horizontal swipe
        return false;
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsSwiping(false);
        const swipeThreshold = cardWidth * 0.2;
        const velocityThreshold = 0.5;
        const currentIdx = currentCardIndexRef.current;

        // Use velocity for quick swipes
        if (Math.abs(gestureState.vx) > velocityThreshold) {
          if (gestureState.vx < -velocityThreshold && currentIdx < benefitCards.length - 1) {
            const nextIndex = currentIdx + 1;
            setCurrentCardIndex(nextIndex);
            Animated.spring(cardAnim, {
              toValue: -nextIndex * cardWidth,
              damping: 20,
              stiffness: 200,
              useNativeDriver: true,
            }).start();
            return;
          } else if (gestureState.vx > velocityThreshold && currentIdx > 0) {
            const prevIndex = currentIdx - 1;
            setCurrentCardIndex(prevIndex);
            Animated.spring(cardAnim, {
              toValue: -prevIndex * cardWidth,
              damping: 20,
              stiffness: 200,
              useNativeDriver: true,
            }).start();
            return;
          }
        }

        // Use distance for slower swipes
        if (Math.abs(gestureState.dx) > swipeThreshold) {
          if (gestureState.dx < -swipeThreshold && currentIdx < benefitCards.length - 1) {
            const nextIndex = currentIdx + 1;
            setCurrentCardIndex(nextIndex);
            Animated.spring(cardAnim, {
              toValue: -nextIndex * cardWidth,
              damping: 20,
              stiffness: 200,
              useNativeDriver: true,
            }).start();
          } else if (gestureState.dx > swipeThreshold && currentIdx > 0) {
            const prevIndex = currentIdx - 1;
            setCurrentCardIndex(prevIndex);
            Animated.spring(cardAnim, {
              toValue: -prevIndex * cardWidth,
              damping: 20,
              stiffness: 200,
              useNativeDriver: true,
            }).start();
          } else {
            // Snap back to current position
            Animated.spring(cardAnim, {
              toValue: -currentIdx * cardWidth,
              damping: 20,
              stiffness: 200,
              useNativeDriver: true,
            }).start();
          }
        } else {
          // Snap back to current position if swipe wasn't far enough
          Animated.spring(cardAnim, {
            toValue: -currentIdx * cardWidth,
            damping: 20,
            stiffness: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.formContainer}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.formContainer}
        contentContainerStyle={styles.paywallContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isSwiping}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        bounces={false}
      >
      <Text style={styles.paywallTitle}>{t('common.yourMission')}</Text>
      
      {/* Active Goal Section */}
      <View style={styles.activeGoalContainer}>
        <Text style={styles.activeGoalSubheading}>{t('common.activeGoal')}</Text>
        {isLoadingSteps ? (
          <Text style={styles.goalNameText}>{t('common.preparingPlan')}</Text>
        ) : goalSummary ? (
          <Text style={styles.goalNameText}>{goalSummary}</Text>
        ) : (
          <Text style={styles.goalNameText}>{t('common.youGoal', { goal: goalTitle.toLowerCase() })}</Text>
        )}
      </View>

      {/* Levels Section */}
      <View style={styles.levelsContainer}>
        {/* Continuous connecting line */}
        <View style={styles.continuousConnector} />
        
        {goalSteps.slice().sort((a, b) => a.number - b.number).map((step, index) => {
          const isHighlighted = step.number === highlightedLevel;
          return (
            <View key={step.number} style={styles.levelItem}>
              {/* Level Badge */}
              <View style={styles.levelBadgeContainer}>
                {isHighlighted && (
                  <Animated.View
                    style={[
                      styles.levelBadgeHighlight,
                      {
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  />
                )}
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeNumber}>{step.number}</Text>
                </View>
              </View>
              {/* Level Content */}
              <View style={styles.levelContent}>
                <Text style={styles.levelHeading}>{step.text}</Text>
                <Text style={styles.levelSubheading}>
                  {step.number === 1 && t('common.level1Desc')}
                  {step.number === 2 && t('common.level2Desc')}
                  {step.number === 3 && t('common.level3Desc')}
                  {step.number === 4 && t('common.level4Desc')}
                  {step.number === 5 && t('common.level5Desc')}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* What you'll get section */}
      <Text style={styles.whatYouGetTitle}>{t('common.whatYouGet')}</Text>
      
      {/* Swipeable cards */}
      <View 
        style={styles.cardsContainer} 
        {...panResponder.panHandlers}
        collapsable={false}
      >
        <Animated.View
          style={[
            styles.cardsWrapper,
            {
              transform: [{ translateX: cardAnim }],
              width: cardWidth * benefitCards.length,
            },
          ]}
        >
          {benefitCards.map((card, index) => (
            <ImageBackground
              key={index}
              source={require('../assets/images/purple.background.jpeg')}
              style={[styles.benefitCard, { width: cardWidth }]}
              imageStyle={styles.benefitCardImage}
            >
              <Text style={styles.benefitCardHeading}>{card.heading}</Text>
              <Text style={styles.benefitCardBody}>{card.body}</Text>
            </ImageBackground>
          ))}
        </Animated.View>
      </View>

      {/* Card indicators */}
      <View style={styles.cardIndicators}>
        {benefitCards.map((_, index) => (
          <View
            key={index}
            style={[
              styles.cardIndicator,
              currentCardIndex === index && styles.cardIndicatorActive,
            ]}
          />
        ))}
      </View>
    </ScrollView>
    {/* Continue button - Fixed at bottom */}
    <TouchableOpacity style={styles.paywallContinueButton} onPress={onStartJourney}>
      <Text style={styles.paywallContinueButtonText}>{t('common.continue')}</Text>
    </TouchableOpacity>
    </View>
  );
}

// Function to get onboarding steps with translations
const getOnboardingSteps = (t: (key: string) => string) => [
  { 
    id: 1, 
    title: t('onboarding.step1Title'), 
    content: t('onboarding.step1Content'),
    showImage: true,
    isForm: false,
  },
  { 
    id: 2, 
    title: t('onboarding.step2Title'), 
    content: '',
    showImage: false,
    isForm: true,
  },
  { 
    id: 3, 
    title: t('onboarding.step3Title'), 
    content: '',
    showImage: false,
    isForm: false,
    isPledge: true,
  },
  { 
    id: 4, 
    title: t('onboarding.step4Title'), 
    content: '',
    showImage: false,
    isForm: false,
    isIkigai: true,
  },
  { 
    id: 5, 
    title: t('onboarding.step5Title'), 
    content: '',
    showImage: false,
    isForm: false,
    isLifeContext: true,
  },
  { 
    id: 6, 
    title: t('onboarding.step6Title'), 
    content: '',
    showImage: false,
    isForm: false,
    isLoading: true,
  },
  { 
    id: 7, 
    title: t('onboarding.step7Title'), 
    content: '',
    showImage: false,
    isForm: false,
    isCallingAwaits: true,
  },
  { 
    id: 8, 
    title: t('onboarding.step8Title'), 
    content: '',
    showImage: false,
    isForm: false,
    isPathsAligned: true,
  },
  { 
    id: 9, 
    title: t('onboarding.step9Title'), 
    content: '',
    showImage: false,
    isForm: false,
    isPaywall: true,
  },
];

// Sample cities for autocomplete with country information (in production, use a real city database)
interface CityData {
  name: string;
  country: string;
  nameRu?: string; // Russian name for Cyrillic support
}

const SAMPLE_CITIES: CityData[] = [
  // United States
  { name: 'New York', country: 'United States' },
  { name: 'Los Angeles', country: 'United States' },
  { name: 'Chicago', country: 'United States' },
  { name: 'Houston', country: 'United States' },
  { name: 'Phoenix', country: 'United States' },
  { name: 'Philadelphia', country: 'United States' },
  { name: 'San Antonio', country: 'United States' },
  { name: 'San Diego', country: 'United States' },
  { name: 'Dallas', country: 'United States' },
  { name: 'San Jose', country: 'United States' },
  { name: 'Austin', country: 'United States' },
  { name: 'Jacksonville', country: 'United States' },
  { name: 'San Francisco', country: 'United States' },
  { name: 'Columbus', country: 'United States' },
  { name: 'Seattle', country: 'United States' },
  { name: 'Denver', country: 'United States' },
  { name: 'Washington', country: 'United States' },
  { name: 'Boston', country: 'United States' },
  { name: 'Nashville', country: 'United States' },
  { name: 'Detroit', country: 'United States' },
  { name: 'Portland', country: 'United States' },
  { name: 'Las Vegas', country: 'United States' },
  { name: 'Memphis', country: 'United States' },
  { name: 'Louisville', country: 'United States' },
  { name: 'Baltimore', country: 'United States' },
  { name: 'Milwaukee', country: 'United States' },
  { name: 'Albuquerque', country: 'United States' },
  { name: 'Tucson', country: 'United States' },
  { name: 'Sacramento', country: 'United States' },
  { name: 'Atlanta', country: 'United States' },
  { name: 'Miami', country: 'United States' },
  { name: 'Minneapolis', country: 'United States' },
  { name: 'Cleveland', country: 'United States' },
  // United Kingdom
  { name: 'London', country: 'United Kingdom' },
  { name: 'Manchester', country: 'United Kingdom' },
  { name: 'Birmingham', country: 'United Kingdom' },
  { name: 'Liverpool', country: 'United Kingdom' },
  { name: 'Leeds', country: 'United Kingdom' },
  { name: 'Glasgow', country: 'United Kingdom' },
  { name: 'Edinburgh', country: 'United Kingdom' },
  { name: 'Bristol', country: 'United Kingdom' },
  // France
  { name: 'Paris', country: 'France' },
  { name: 'Lyon', country: 'France' },
  { name: 'Marseille', country: 'France' },
  { name: 'Toulouse', country: 'France' },
  { name: 'Nice', country: 'France' },
  { name: 'Nantes', country: 'France' },
  { name: 'Strasbourg', country: 'France' },
  { name: 'Montpellier', country: 'France' },
  // Germany
  { name: 'Berlin', country: 'Germany' },
  { name: 'Munich', country: 'Germany' },
  { name: 'Hamburg', country: 'Germany' },
  { name: 'Frankfurt', country: 'Germany' },
  { name: 'Cologne', country: 'Germany' },
  { name: 'Stuttgart', country: 'Germany' },
  { name: 'Düsseldorf', country: 'Germany' },
  { name: 'Dortmund', country: 'Germany' },
  // Italy
  { name: 'Rome', country: 'Italy' },
  { name: 'Milan', country: 'Italy' },
  { name: 'Naples', country: 'Italy' },
  { name: 'Turin', country: 'Italy' },
  { name: 'Palermo', country: 'Italy' },
  { name: 'Genoa', country: 'Italy' },
  { name: 'Bologna', country: 'Italy' },
  { name: 'Florence', country: 'Italy' },
  // Spain
  { name: 'Madrid', country: 'Spain' },
  { name: 'Barcelona', country: 'Spain' },
  { name: 'Valencia', country: 'Spain' },
  { name: 'Seville', country: 'Spain' },
  { name: 'Zaragoza', country: 'Spain' },
  { name: 'Málaga', country: 'Spain' },
  { name: 'Murcia', country: 'Spain' },
  { name: 'Palma', country: 'Spain' },
  // Canada
  { name: 'Toronto', country: 'Canada' },
  { name: 'Montreal', country: 'Canada' },
  { name: 'Vancouver', country: 'Canada' },
  { name: 'Calgary', country: 'Canada' },
  { name: 'Edmonton', country: 'Canada' },
  { name: 'Ottawa', country: 'Canada' },
  { name: 'Winnipeg', country: 'Canada' },
  { name: 'Quebec City', country: 'Canada' },
  // Australia
  { name: 'Sydney', country: 'Australia' },
  { name: 'Melbourne', country: 'Australia' },
  { name: 'Brisbane', country: 'Australia' },
  { name: 'Perth', country: 'Australia' },
  { name: 'Adelaide', country: 'Australia' },
  { name: 'Gold Coast', country: 'Australia' },
  { name: 'Newcastle', country: 'Australia' },
  { name: 'Canberra', country: 'Australia' },
  // Japan
  { name: 'Tokyo', country: 'Japan' },
  { name: 'Yokohama', country: 'Japan' },
  { name: 'Osaka', country: 'Japan' },
  { name: 'Nagoya', country: 'Japan' },
  { name: 'Sapporo', country: 'Japan' },
  { name: 'Fukuoka', country: 'Japan' },
  { name: 'Kobe', country: 'Japan' },
  { name: 'Kyoto', country: 'Japan' },
  // Other countries
  { name: 'Mexico City', country: 'Mexico' },
  { name: 'São Paulo', country: 'Brazil' },
  { name: 'Rio de Janeiro', country: 'Brazil' },
  { name: 'Buenos Aires', country: 'Argentina' },
  { name: 'Moscow', country: 'Russia', nameRu: 'Москва' },
  { name: 'Saint Petersburg', country: 'Russia', nameRu: 'Санкт-Петербург' },
  { name: 'Novosibirsk', country: 'Russia', nameRu: 'Новосибирск' },
  { name: 'Yekaterinburg', country: 'Russia', nameRu: 'Екатеринбург' },
  { name: 'Kazan', country: 'Russia', nameRu: 'Казань' },
  { name: 'Nizhny Novgorod', country: 'Russia', nameRu: 'Нижний Новгород' },
  { name: 'Chelyabinsk', country: 'Russia', nameRu: 'Челябинск' },
  { name: 'Samara', country: 'Russia', nameRu: 'Самара' },
  { name: 'Omsk', country: 'Russia', nameRu: 'Омск' },
  { name: 'Rostov-on-Don', country: 'Russia', nameRu: 'Ростов-на-Дону' },
  { name: 'Ufa', country: 'Russia', nameRu: 'Уфа' },
  { name: 'Krasnoyarsk', country: 'Russia', nameRu: 'Красноярск' },
  { name: 'Voronezh', country: 'Russia', nameRu: 'Воронеж' },
  { name: 'Perm', country: 'Russia', nameRu: 'Пермь' },
  { name: 'Volgograd', country: 'Russia', nameRu: 'Волгоград' },
  { name: 'Krasnodar', country: 'Russia', nameRu: 'Краснодар' },
  { name: 'Saratov', country: 'Russia', nameRu: 'Саратов' },
  { name: 'Tyumen', country: 'Russia', nameRu: 'Тюмень' },
  { name: 'Tolyatti', country: 'Russia', nameRu: 'Тольятти' },
  { name: 'Izhevsk', country: 'Russia', nameRu: 'Ижевск' },
  { name: 'Barnaul', country: 'Russia', nameRu: 'Барнаул' },
  { name: 'Ulyanovsk', country: 'Russia', nameRu: 'Ульяновск' },
  { name: 'Irkutsk', country: 'Russia', nameRu: 'Иркутск' },
  { name: 'Khabarovsk', country: 'Russia', nameRu: 'Хабаровск' },
  { name: 'Yaroslavl', country: 'Russia', nameRu: 'Ярославль' },
  { name: 'Vladivostok', country: 'Russia', nameRu: 'Владивосток' },
  { name: 'Makhachkala', country: 'Russia', nameRu: 'Махачкала' },
  { name: 'Tomsk', country: 'Russia', nameRu: 'Томск' },
  { name: 'Orenburg', country: 'Russia', nameRu: 'Оренбург' },
  { name: 'Kemerovo', country: 'Russia', nameRu: 'Кемерово' },
  { name: 'Amsterdam', country: 'Netherlands' },
  { name: 'Rotterdam', country: 'Netherlands' },
  { name: 'Brussels', country: 'Belgium' },
  { name: 'Vienna', country: 'Austria' },
  { name: 'Zurich', country: 'Switzerland' },
  { name: 'Stockholm', country: 'Sweden' },
  { name: 'Copenhagen', country: 'Denmark' },
  { name: 'Oslo', country: 'Norway' },
  { name: 'Helsinki', country: 'Finland' },
  { name: 'Dublin', country: 'Ireland' },
  { name: 'Lisbon', country: 'Portugal' },
  { name: 'Athens', country: 'Greece' },
  { name: 'Warsaw', country: 'Poland' },
  { name: 'Prague', country: 'Czech Republic' },
  { name: 'Budapest', country: 'Hungary' },
  { name: 'Bucharest', country: 'Romania' },
  { name: 'Istanbul', country: 'Turkey' },
  { name: 'Cairo', country: 'Egypt' },
  { name: 'Johannesburg', country: 'South Africa' },
  { name: 'Cape Town', country: 'South Africa' },
  { name: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Singapore', country: 'Singapore' },
  { name: 'Bangkok', country: 'Thailand' },
  { name: 'Jakarta', country: 'Indonesia' },
  { name: 'Manila', country: 'Philippines' },
  { name: 'Seoul', country: 'South Korea' },
  { name: 'Beijing', country: 'China' },
  { name: 'Shanghai', country: 'China' },
  { name: 'Hong Kong', country: 'China' },
  { name: 'Mumbai', country: 'India' },
  { name: 'Delhi', country: 'India' },
  { name: 'Bangalore', country: 'India' },
  { name: 'Kolkata', country: 'India' },
  { name: 'Chennai', country: 'India' },
  { name: 'Hyderabad', country: 'India' },
  { name: 'Pune', country: 'India' },
  { name: 'Ahmedabad', country: 'India' },
  { name: 'Jaipur', country: 'India' },
  { name: 'Surat', country: 'India' },
  // More US cities
  { name: 'Charlotte', country: 'United States' },
  { name: 'Indianapolis', country: 'United States' },
  { name: 'San Francisco', country: 'United States' },
  { name: 'Fort Worth', country: 'United States' },
  { name: 'Charlotte', country: 'United States' },
  { name: 'Oklahoma City', country: 'United States' },
  { name: 'El Paso', country: 'United States' },
  { name: 'Kansas City', country: 'United States' },
  { name: 'Tampa', country: 'United States' },
  { name: 'Raleigh', country: 'United States' },
  { name: 'Omaha', country: 'United States' },
  { name: 'Miami', country: 'United States' },
  { name: 'Oakland', country: 'United States' },
  { name: 'Minneapolis', country: 'United States' },
  { name: 'Tulsa', country: 'United States' },
  { name: 'Cleveland', country: 'United States' },
  { name: 'Wichita', country: 'United States' },
  { name: 'Arlington', country: 'United States' },
  { name: 'New Orleans', country: 'United States' },
  { name: 'Honolulu', country: 'United States' },
  { name: 'Anchorage', country: 'United States' },
  // More European cities
  { name: 'Barcelona', country: 'Spain' },
  { name: 'Valencia', country: 'Spain' },
  { name: 'Bilbao', country: 'Spain' },
  { name: 'Granada', country: 'Spain' },
  { name: 'Córdoba', country: 'Spain' },
  { name: 'Venice', country: 'Italy' },
  { name: 'Verona', country: 'Italy' },
  { name: 'Naples', country: 'Italy' },
  { name: 'Bari', country: 'Italy' },
  { name: 'Catania', country: 'Italy' },
  { name: 'Hamburg', country: 'Germany' },
  { name: 'Dresden', country: 'Germany' },
  { name: 'Leipzig', country: 'Germany' },
  { name: 'Hannover', country: 'Germany' },
  { name: 'Nuremberg', country: 'Germany' },
  { name: 'Lyon', country: 'France' },
  { name: 'Bordeaux', country: 'France' },
  { name: 'Lille', country: 'France' },
  { name: 'Rennes', country: 'France' },
  { name: 'Reims', country: 'France' },
  { name: 'Le Havre', country: 'France' },
  { name: 'Sheffield', country: 'United Kingdom' },
  { name: 'Newcastle', country: 'United Kingdom' },
  { name: 'Nottingham', country: 'United Kingdom' },
  { name: 'Leicester', country: 'United Kingdom' },
  { name: 'Coventry', country: 'United Kingdom' },
  { name: 'Cardiff', country: 'United Kingdom' },
  { name: 'Belfast', country: 'United Kingdom' },
  // More Asian cities
  { name: 'Kyoto', country: 'Japan' },
  { name: 'Hiroshima', country: 'Japan' },
  { name: 'Sendai', country: 'Japan' },
  { name: 'Kawasaki', country: 'Japan' },
  { name: 'Kobe', country: 'Japan' },
  { name: 'Busan', country: 'South Korea' },
  { name: 'Incheon', country: 'South Korea' },
  { name: 'Daegu', country: 'South Korea' },
  { name: 'Daejeon', country: 'South Korea' },
  { name: 'Guangzhou', country: 'China' },
  { name: 'Shenzhen', country: 'China' },
  { name: 'Chengdu', country: 'China' },
  { name: 'Hangzhou', country: 'China' },
  { name: 'Xi\'an', country: 'China' },
  { name: 'Nanjing', country: 'China' },
  { name: 'Wuhan', country: 'China' },
  { name: 'Suzhou', country: 'China' },
  { name: 'Ho Chi Minh City', country: 'Vietnam' },
  { name: 'Hanoi', country: 'Vietnam' },
  { name: 'Kuala Lumpur', country: 'Malaysia' },
  { name: 'Penang', country: 'Malaysia' },
  { name: 'Kota Kinabalu', country: 'Malaysia' },
  { name: 'Yangon', country: 'Myanmar' },
  { name: 'Phnom Penh', country: 'Cambodia' },
  { name: 'Vientiane', country: 'Laos' },
  // More Middle Eastern cities
  { name: 'Riyadh', country: 'Saudi Arabia' },
  { name: 'Jeddah', country: 'Saudi Arabia' },
  { name: 'Mecca', country: 'Saudi Arabia' },
  { name: 'Medina', country: 'Saudi Arabia' },
  { name: 'Dammam', country: 'Saudi Arabia' },
  { name: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Sharjah', country: 'United Arab Emirates' },
  { name: 'Doha', country: 'Qatar' },
  { name: 'Kuwait City', country: 'Kuwait' },
  { name: 'Manama', country: 'Bahrain' },
  { name: 'Muscat', country: 'Oman' },
  { name: 'Tehran', country: 'Iran' },
  { name: 'Baghdad', country: 'Iraq' },
  { name: 'Damascus', country: 'Syria' },
  { name: 'Beirut', country: 'Lebanon' },
  { name: 'Amman', country: 'Jordan' },
  { name: 'Jerusalem', country: 'Israel' },
  { name: 'Tel Aviv', country: 'Israel' },
  { name: 'Haifa', country: 'Israel' },
  // More African cities
  { name: 'Lagos', country: 'Nigeria' },
  { name: 'Kano', country: 'Nigeria' },
  { name: 'Ibadan', country: 'Nigeria' },
  { name: 'Abuja', country: 'Nigeria' },
  { name: 'Nairobi', country: 'Kenya' },
  { name: 'Mombasa', country: 'Kenya' },
  { name: 'Dar es Salaam', country: 'Tanzania' },
  { name: 'Addis Ababa', country: 'Ethiopia' },
  { name: 'Casablanca', country: 'Morocco' },
  { name: 'Rabat', country: 'Morocco' },
  { name: 'Marrakech', country: 'Morocco' },
  { name: 'Tunis', country: 'Tunisia' },
  { name: 'Algiers', country: 'Algeria' },
  { name: 'Accra', country: 'Ghana' },
  { name: 'Kumasi', country: 'Ghana' },
  { name: 'Dakar', country: 'Senegal' },
  { name: 'Kinshasa', country: 'Democratic Republic of the Congo' },
  { name: 'Luanda', country: 'Angola' },
  { name: 'Kampala', country: 'Uganda' },
  // More Latin American cities
  { name: 'Guadalajara', country: 'Mexico' },
  { name: 'Monterrey', country: 'Mexico' },
  { name: 'Puebla', country: 'Mexico' },
  { name: 'Tijuana', country: 'Mexico' },
  { name: 'León', country: 'Mexico' },
  { name: 'Juárez', country: 'Mexico' },
  { name: 'Brasília', country: 'Brazil' },
  { name: 'Salvador', country: 'Brazil' },
  { name: 'Brasília', country: 'Brazil' },
  { name: 'Fortaleza', country: 'Brazil' },
  { name: 'Belo Horizonte', country: 'Brazil' },
  { name: 'Manaus', country: 'Brazil' },
  { name: 'Curitiba', country: 'Brazil' },
  { name: 'Recife', country: 'Brazil' },
  { name: 'Porto Alegre', country: 'Brazil' },
  { name: 'Córdoba', country: 'Argentina' },
  { name: 'Rosario', country: 'Argentina' },
  { name: 'Mendoza', country: 'Argentina' },
  { name: 'Santiago', country: 'Chile' },
  { name: 'Valparaíso', country: 'Chile' },
  { name: 'Lima', country: 'Peru' },
  { name: 'Bogotá', country: 'Colombia' },
  { name: 'Medellín', country: 'Colombia' },
  { name: 'Cali', country: 'Colombia' },
  { name: 'Caracas', country: 'Venezuela' },
  { name: 'Quito', country: 'Ecuador' },
  { name: 'Guayaquil', country: 'Ecuador' },
  { name: 'Montevideo', country: 'Uruguay' },
  { name: 'Asunción', country: 'Paraguay' },
  { name: 'La Paz', country: 'Bolivia' },
  { name: 'Santa Cruz', country: 'Bolivia' },
  // More Canadian cities
  { name: 'Hamilton', country: 'Canada' },
  { name: 'Kitchener', country: 'Canada' },
  { name: 'London', country: 'Canada' },
  { name: 'Halifax', country: 'Canada' },
  { name: 'Victoria', country: 'Canada' },
  { name: 'Saskatoon', country: 'Canada' },
  { name: 'Regina', country: 'Canada' },
  { name: 'St. John\'s', country: 'Canada' },
  // More Australian cities
  { name: 'Hobart', country: 'Australia' },
  { name: 'Darwin', country: 'Australia' },
  { name: 'Cairns', country: 'Australia' },
  { name: 'Townsville', country: 'Australia' },
  { name: 'Toowoomba', country: 'Australia' },
  { name: 'Ballarat', country: 'Australia' },
  { name: 'Bendigo', country: 'Australia' },
  // More cities from around the world
  { name: 'Auckland', country: 'New Zealand' },
  { name: 'Wellington', country: 'New Zealand' },
  { name: 'Christchurch', country: 'New Zealand' },
  { name: 'Dunedin', country: 'New Zealand' },
  { name: 'Arena', country: 'Various' },
  { name: 'Barcelona', country: 'Spain' },
  { name: 'Valencia', country: 'Spain' },
  { name: 'Seville', country: 'Spain' },
  { name: 'Zaragoza', country: 'Spain' },
  { name: 'Málaga', country: 'Spain' },
  { name: 'Murcia', country: 'Spain' },
  { name: 'Palma', country: 'Spain' },
  { name: 'Las Palmas', country: 'Spain' },
  { name: 'Bilbao', country: 'Spain' },
  { name: 'Alicante', country: 'Spain' },
  { name: 'Córdoba', country: 'Spain' },
  { name: 'Valladolid', country: 'Spain' },
  { name: 'Vigo', country: 'Spain' },
  { name: 'Gijón', country: 'Spain' },
  { name: 'Granada', country: 'Spain' },
  { name: 'Milano', country: 'Italy' },
  { name: 'Napoli', country: 'Italy' },
  { name: 'Torino', country: 'Italy' },
  { name: 'Palermo', country: 'Italy' },
  { name: 'Genova', country: 'Italy' },
  { name: 'Bologna', country: 'Italy' },
  { name: 'Firenze', country: 'Italy' },
  { name: 'Bari', country: 'Italy' },
  { name: 'Catania', country: 'Italy' },
  { name: 'Venezia', country: 'Italy' },
  { name: 'Verona', country: 'Italy' },
  { name: 'Messina', country: 'Italy' },
  { name: 'Padova', country: 'Italy' },
  { name: 'Trieste', country: 'Italy' },
  { name: 'Brescia', country: 'Italy' },
  { name: 'Prato', country: 'Italy' },
  { name: 'Parma', country: 'Italy' },
  { name: 'Modena', country: 'Italy' },
  { name: 'Reggio Calabria', country: 'Italy' },
  { name: 'Perugia', country: 'Italy' },
  { name: 'Livorno', country: 'Italy' },
  { name: 'Ravenna', country: 'Italy' },
  { name: 'Cagliari', country: 'Italy' },
  { name: 'Foggia', country: 'Italy' },
  { name: 'Rimini', country: 'Italy' },
  { name: 'Salerno', country: 'Italy' },
  { name: 'Ferrara', country: 'Italy' },
  { name: 'Sassari', country: 'Italy' },
  { name: 'Latina', country: 'Italy' },
  { name: 'Giugliano', country: 'Italy' },
  { name: 'Monza', country: 'Italy' },
  { name: 'Bergamo', country: 'Italy' },
  { name: 'Forlì', country: 'Italy' },
  { name: 'Trento', country: 'Italy' },
  { name: 'Vicenza', country: 'Italy' },
  { name: 'Terni', country: 'Italy' },
  { name: 'Bolzano', country: 'Italy' },
  { name: 'Novara', country: 'Italy' },
  { name: 'Piacenza', country: 'Italy' },
  { name: 'Ancona', country: 'Italy' },
  { name: 'Andria', country: 'Italy' },
  { name: 'Arezzo', country: 'Italy' },
  { name: 'Udine', country: 'Italy' },
  { name: 'Cesena', country: 'Italy' },
  { name: 'Lecce', country: 'Italy' },
  { name: 'Pesaro', country: 'Italy' },
  { name: 'La Spezia', country: 'Italy' },
  { name: 'Pisa', country: 'Italy' },
  { name: 'Guidonia', country: 'Italy' },
  { name: 'Catanzaro', country: 'Italy' },
  { name: 'Caserta', country: 'Italy' },
  { name: 'Brindisi', country: 'Italy' },
  { name: 'Pozzuoli', country: 'Italy' },
  { name: 'Marsala', country: 'Italy' },
  { name: 'Treviso', country: 'Italy' },
  { name: 'Como', country: 'Italy' },
  { name: 'Varese', country: 'Italy' },
  { name: 'Pavia', country: 'Italy' },
  { name: 'Cremona', country: 'Italy' },
  { name: 'Mantova', country: 'Italy' },
  { name: 'Pordenone', country: 'Italy' },
  { name: 'Alessandria', country: 'Italy' },
  { name: 'Asti', country: 'Italy' },
  { name: 'Imperia', country: 'Italy' },
  { name: 'Savona', country: 'Italy' },
  { name: 'Sanremo', country: 'Italy' },
  { name: 'Albenga', country: 'Italy' },
  { name: 'Ventimiglia', country: 'Italy' },
  { name: 'Bordighera', country: 'Italy' },
  { name: 'Rapallo', country: 'Italy' },
  { name: 'Chiavari', country: 'Italy' },
  { name: 'Sestri Levante', country: 'Italy' },
  { name: 'Lavagna', country: 'Italy' },
  { name: 'Santa Margherita', country: 'Italy' },
  { name: 'Portofino', country: 'Italy' },
  { name: 'Camogli', country: 'Italy' },
  { name: 'Recco', country: 'Italy' },
  { name: 'Nervi', country: 'Italy' },
  { name: 'Bogliasco', country: 'Italy' },
  { name: 'Sori', country: 'Italy' },
  { name: 'Arenzano', country: 'Italy' },
  { name: 'Cogoleto', country: 'Italy' },
  { name: 'Varazze', country: 'Italy' },
  { name: 'Celle Ligure', country: 'Italy' },
  { name: 'Spotorno', country: 'Italy' },
  { name: 'Noli', country: 'Italy' },
  { name: 'Finale Ligure', country: 'Italy' },
  { name: 'Pietra Ligure', country: 'Italy' },
  { name: 'Loano', country: 'Italy' },
  { name: 'Alassio', country: 'Italy' },
  { name: 'Laigueglia', country: 'Italy' },
  { name: 'Andora', country: 'Italy' },
  { name: 'Cervo', country: 'Italy' },
  { name: 'Diano Marina', country: 'Italy' },
  { name: 'Imperia', country: 'Italy' },
  { name: 'San Bartolomeo', country: 'Italy' },
  { name: 'Taggia', country: 'Italy' },
  { name: 'Arma di Taggia', country: 'Italy' },
  { name: 'Riva Ligure', country: 'Italy' },
  { name: 'Pompeiana', country: 'Italy' },
  { name: 'Cipressa', country: 'Italy' },
  { name: 'Costarainera', country: 'Italy' },
  { name: 'San Lorenzo al Mare', country: 'Italy' },
  { name: 'Civezza', country: 'Italy' },
  { name: 'Dolcedo', country: 'Italy' },
  { name: 'Prelà', country: 'Italy' },
  { name: 'Vasia', country: 'Italy' },
  { name: 'Pontedassio', country: 'Italy' },
  { name: 'Chiusanico', country: 'Italy' },
  { name: 'Chiusavecchia', country: 'Italy' },
  { name: 'Borgomaro', country: 'Italy' },
  { name: 'Aurigo', country: 'Italy' },
  { name: 'Rezzo', country: 'Italy' },
  { name: 'Mendatica', country: 'Italy' },
  { name: 'Cosio di Arroscia', country: 'Italy' },
  { name: 'Pieve di Teco', country: 'Italy' },
  { name: 'Ranzo', country: 'Italy' },
  { name: 'Vessalico', country: 'Italy' },
  { name: 'Cesio', country: 'Italy' },
  { name: 'Caravonica', country: 'Italy' },
  { name: 'Chiusa di Pesio', country: 'Italy' },
  { name: 'Briga Alta', country: 'Italy' },
  { name: 'Ormea', country: 'Italy' },
  { name: 'Caprauna', country: 'Italy' },
  { name: 'Alto', country: 'Italy' },
  { name: 'Aquila', country: 'Italy' },
  { name: 'Arnasco', country: 'Italy' },
  { name: 'Balestrino', country: 'Italy' },
  { name: 'Bardineto', country: 'Italy' },
  { name: 'Bergeggi', country: 'Italy' },
  { name: 'Boissano', country: 'Italy' },
  { name: 'Borghetto', country: 'Italy' },
  { name: 'Borgio', country: 'Italy' },
  { name: 'Cairo Montenotte', country: 'Italy' },
  { name: 'Calice Ligure', country: 'Italy' },
  { name: 'Calizzano', country: 'Italy' },
  { name: 'Carcare', country: 'Italy' },
  { name: 'Casanova Lerrone', country: 'Italy' },
  { name: 'Castelbianco', country: 'Italy' },
  { name: 'Castelvecchio', country: 'Italy' },
  { name: 'Celle di Macra', country: 'Italy' },
  { name: 'Cengio', country: 'Italy' },
  { name: 'Ceriale', country: 'Italy' },
  { name: 'Cisano', country: 'Italy' },
  { name: 'Cosseria', country: 'Italy' },
  { name: 'Dego', country: 'Italy' },
  { name: 'Erli', country: 'Italy' },
  { name: 'Finale Ligure', country: 'Italy' },
  { name: 'Garlenda', country: 'Italy' },
  { name: 'Giustenice', country: 'Italy' },
  { name: 'Giusvalla', country: 'Italy' },
  { name: 'Laigueglia', country: 'Italy' },
  { name: 'Loano', country: 'Italy' },
  { name: 'Magliolo', country: 'Italy' },
  { name: 'Mallare', country: 'Italy' },
  { name: 'Massimino', country: 'Italy' },
  { name: 'Millesimo', country: 'Italy' },
  { name: 'Mioglia', country: 'Italy' },
  { name: 'Murialdo', country: 'Italy' },
  { name: 'Nasino', country: 'Italy' },
  { name: 'Noli', country: 'Italy' },
  { name: 'Onzo', country: 'Italy' },
  { name: 'Orco Feglino', country: 'Italy' },
  { name: 'Ortovero', country: 'Italy' },
  { name: 'Osiglia', country: 'Italy' },
  { name: 'Pallare', country: 'Italy' },
  { name: 'Piana Crixia', country: 'Italy' },
  { name: 'Pietra Ligure', country: 'Italy' },
  { name: 'Plodio', country: 'Italy' },
  { name: 'Pontinvrea', country: 'Italy' },
  { name: 'Quiliano', country: 'Italy' },
  { name: 'Rialto', country: 'Italy' },
  { name: 'Roccavignale', country: 'Italy' },
  { name: 'Sassello', country: 'Italy' },
  { name: 'Savona', country: 'Italy' },
  { name: 'Spotorno', country: 'Italy' },
  { name: 'Stella', country: 'Italy' },
  { name: 'Stellanello', country: 'Italy' },
  { name: 'Testico', country: 'Italy' },
  { name: 'Toirano', country: 'Italy' },
  { name: 'Tovo San Giacomo', country: 'Italy' },
  { name: 'Urbe', country: 'Italy' },
  { name: 'Vado Ligure', country: 'Italy' },
  { name: 'Varazze', country: 'Italy' },
  { name: 'Vendone', country: 'Italy' },
  { name: 'Vezzi Portio', country: 'Italy' },
  { name: 'Villanova', country: 'Italy' },
  { name: 'Zuccarello', country: 'Italy' },
  { name: 'Albury', country: 'Australia' },
  // More European cities
  { name: 'Gdansk', country: 'Poland' },
  { name: 'Krakow', country: 'Poland' },
  { name: 'Wroclaw', country: 'Poland' },
  { name: 'Poznan', country: 'Poland' },
  { name: 'Lodz', country: 'Poland' },
  { name: 'Brno', country: 'Czech Republic' },
  { name: 'Ostrava', country: 'Czech Republic' },
  { name: 'Plzen', country: 'Czech Republic' },
  { name: 'Debrecen', country: 'Hungary' },
  { name: 'Szeged', country: 'Hungary' },
  { name: 'Cluj-Napoca', country: 'Romania' },
  { name: 'Timisoara', country: 'Romania' },
  { name: 'Iasi', country: 'Romania' },
  { name: 'Sofia', country: 'Bulgaria' },
  { name: 'Plovdiv', country: 'Bulgaria' },
  { name: 'Zagreb', country: 'Croatia' },
  { name: 'Split', country: 'Croatia' },
  { name: 'Belgrade', country: 'Serbia' },
  { name: 'Ljubljana', country: 'Slovenia' },
  { name: 'Bratislava', country: 'Slovakia' },
  { name: 'Vilnius', country: 'Lithuania' },
  { name: 'Riga', country: 'Latvia' },
  { name: 'Tallinn', country: 'Estonia' },
  { name: 'Reykjavik', country: 'Iceland' },
  { name: 'Luxembourg', country: 'Luxembourg' },
  { name: 'Monaco', country: 'Monaco' },
  { name: 'Andorra la Vella', country: 'Andorra' },
  { name: 'Valletta', country: 'Malta' },
  { name: 'Nicosia', country: 'Cyprus' },
  // Armenia
  { name: 'Yerevan', country: 'Armenia' },
  { name: 'Gyumri', country: 'Armenia' },
  { name: 'Vanadzor', country: 'Armenia' },
  { name: 'Vagharshapat', country: 'Armenia' },
  { name: 'Abovyan', country: 'Armenia' },
  { name: 'Kapan', country: 'Armenia' },
  { name: 'Hrazdan', country: 'Armenia' },
  { name: 'Armavir', country: 'Armenia' },
  { name: 'Goris', country: 'Armenia' },
  { name: 'Artashat', country: 'Armenia' },
  { name: 'Sevan', country: 'Armenia' },
  { name: 'Ashtarak', country: 'Armenia' },
  { name: 'Ijevan', country: 'Armenia' },
  { name: 'Dilijan', country: 'Armenia' },
  { name: 'Alaverdi', country: 'Armenia' },
  { name: 'Vardenis', country: 'Armenia' },
  { name: 'Martuni', country: 'Armenia' },
  { name: 'Masis', country: 'Armenia' },
  { name: 'Ararat', country: 'Armenia' },
  { name: 'Gavar', country: 'Armenia' },
  // Belarus
  { name: 'Minsk', country: 'Belarus' },
  { name: 'Gomel', country: 'Belarus' },
  { name: 'Mogilev', country: 'Belarus' },
  { name: 'Vitebsk', country: 'Belarus' },
  { name: 'Grodno', country: 'Belarus' },
  { name: 'Brest', country: 'Belarus' },
  { name: 'Babruysk', country: 'Belarus' },
  { name: 'Baranavichy', country: 'Belarus' },
  { name: 'Barysaw', country: 'Belarus' },
  { name: 'Pinsk', country: 'Belarus' },
  { name: 'Orsha', country: 'Belarus' },
  { name: 'Mazyr', country: 'Belarus' },
  { name: 'Salihorsk', country: 'Belarus' },
  { name: 'Navahrudak', country: 'Belarus' },
  { name: 'Maladzyechna', country: 'Belarus' },
  { name: 'Polatsk', country: 'Belarus' },
  { name: 'Lida', country: 'Belarus' },
  { name: 'Svyetlahorsk', country: 'Belarus' },
  { name: 'Zhlobin', country: 'Belarus' },
  { name: 'Slutsk', country: 'Belarus' },
  // Romania
  { name: 'Bucharest', country: 'Romania' },
  { name: 'Cluj-Napoca', country: 'Romania' },
  { name: 'Timișoara', country: 'Romania' },
  { name: 'Iași', country: 'Romania' },
  { name: 'Constanța', country: 'Romania' },
  { name: 'Craiova', country: 'Romania' },
  { name: 'Brașov', country: 'Romania' },
  { name: 'Galați', country: 'Romania' },
  { name: 'Ploiești', country: 'Romania' },
  { name: 'Oradea', country: 'Romania' },
  { name: 'Brăila', country: 'Romania' },
  { name: 'Arad', country: 'Romania' },
  { name: 'Pitești', country: 'Romania' },
  { name: 'Sibiu', country: 'Romania' },
  { name: 'Bacău', country: 'Romania' },
  { name: 'Târgu Mureș', country: 'Romania' },
  { name: 'Baia Mare', country: 'Romania' },
  { name: 'Buzău', country: 'Romania' },
  { name: 'Botoșani', country: 'Romania' },
  { name: 'Satu Mare', country: 'Romania' },
  { name: 'Râmnicu Vâlcea', country: 'Romania' },
  { name: 'Suceava', country: 'Romania' },
  { name: 'Piatra Neamț', country: 'Romania' },
  { name: 'Drobeta-Turnu Severin', country: 'Romania' },
  { name: 'Târgoviște', country: 'Romania' },
  { name: 'Focșani', country: 'Romania' },
  { name: 'Tulcea', country: 'Romania' },
  { name: 'Reșița', country: 'Romania' },
  { name: 'Călărași', country: 'Romania' },
  { name: 'Alba Iulia', country: 'Romania' },
  // More Chinese cities
  { name: 'Tianjin', country: 'China' },
  { name: 'Chongqing', country: 'China' },
  { name: 'Dongguan', country: 'China' },
  { name: 'Foshan', country: 'China' },
  { name: 'Jinan', country: 'China' },
  { name: 'Dalian', country: 'China' },
  { name: 'Qingdao', country: 'China' },
  { name: 'Xiamen', country: 'China' },
  { name: 'Kunming', country: 'China' },
  { name: 'Changsha', country: 'China' },
  { name: 'Fuzhou', country: 'China' },
  { name: 'Zhengzhou', country: 'China' },
  { name: 'Shijiazhuang', country: 'China' },
  { name: 'Harbin', country: 'China' },
  { name: 'Changchun', country: 'China' },
  { name: 'Urumqi', country: 'China' },
  { name: 'Lanzhou', country: 'China' },
  { name: 'Taiyuan', country: 'China' },
  { name: 'Hefei', country: 'China' },
  { name: 'Nanchang', country: 'China' },
  { name: 'Guiyang', country: 'China' },
  { name: 'Nanning', country: 'China' },
  { name: 'Haikou', country: 'China' },
  { name: 'Lhasa', country: 'China' },
  { name: 'Yinchuan', country: 'China' },
  { name: 'Hohhot', country: 'China' },
  { name: 'Xining', country: 'China' },
  // More Japanese cities
  { name: 'Sendai', country: 'Japan' },
  { name: 'Hiroshima', country: 'Japan' },
  { name: 'Kitakyushu', country: 'Japan' },
  { name: 'Chiba', country: 'Japan' },
  { name: 'Sakai', country: 'Japan' },
  { name: 'Niigata', country: 'Japan' },
  { name: 'Hamamatsu', country: 'Japan' },
  { name: 'Shizuoka', country: 'Japan' },
  { name: 'Okayama', country: 'Japan' },
  { name: 'Kumamoto', country: 'Japan' },
  { name: 'Kagoshima', country: 'Japan' },
  { name: 'Sagamihara', country: 'Japan' },
  { name: 'Funabashi', country: 'Japan' },
  { name: 'Hachioji', country: 'Japan' },
  { name: 'Kawaguchi', country: 'Japan' },
  { name: 'Himeji', country: 'Japan' },
  { name: 'Matsuyama', country: 'Japan' },
  { name: 'Matsudo', country: 'Japan' },
  { name: 'Nishinomiya', country: 'Japan' },
  { name: 'Kawagoe', country: 'Japan' },
  { name: 'Utsunomiya', country: 'Japan' },
  { name: 'Oita', country: 'Japan' },
  { name: 'Kurashiki', country: 'Japan' },
  { name: 'Gifu', country: 'Japan' },
  { name: 'Toyonaka', country: 'Japan' },
  { name: 'Nagano', country: 'Japan' },
  { name: 'Toyohashi', country: 'Japan' },
  { name: 'Toyama', country: 'Japan' },
  { name: 'Takamatsu', country: 'Japan' },
  // More American cities
  { name: 'Phoenix', country: 'United States' },
  { name: 'Philadelphia', country: 'United States' },
  { name: 'San Antonio', country: 'United States' },
  { name: 'San Diego', country: 'United States' },
  { name: 'Dallas', country: 'United States' },
  { name: 'San Jose', country: 'United States' },
  { name: 'Austin', country: 'United States' },
  { name: 'Jacksonville', country: 'United States' },
  { name: 'San Francisco', country: 'United States' },
  { name: 'Columbus', country: 'United States' },
  { name: 'Seattle', country: 'United States' },
  { name: 'Denver', country: 'United States' },
  { name: 'Washington', country: 'United States' },
  { name: 'Boston', country: 'United States' },
  { name: 'Nashville', country: 'United States' },
  { name: 'Detroit', country: 'United States' },
  { name: 'Portland', country: 'United States' },
  { name: 'Las Vegas', country: 'United States' },
  { name: 'Memphis', country: 'United States' },
  { name: 'Louisville', country: 'United States' },
  { name: 'Baltimore', country: 'United States' },
  { name: 'Milwaukee', country: 'United States' },
  { name: 'Albuquerque', country: 'United States' },
  { name: 'Tucson', country: 'United States' },
  { name: 'Sacramento', country: 'United States' },
  { name: 'Atlanta', country: 'United States' },
  { name: 'Miami', country: 'United States' },
  { name: 'Minneapolis', country: 'United States' },
  { name: 'Cleveland', country: 'United States' },
  { name: 'Charlotte', country: 'United States' },
  { name: 'Indianapolis', country: 'United States' },
  { name: 'Fort Worth', country: 'United States' },
  { name: 'Oklahoma City', country: 'United States' },
  { name: 'El Paso', country: 'United States' },
  { name: 'Kansas City', country: 'United States' },
  { name: 'Tampa', country: 'United States' },
  { name: 'Raleigh', country: 'United States' },
  { name: 'Omaha', country: 'United States' },
  { name: 'Oakland', country: 'United States' },
  { name: 'Tulsa', country: 'United States' },
  { name: 'Wichita', country: 'United States' },
  { name: 'Arlington', country: 'United States' },
  { name: 'New Orleans', country: 'United States' },
  { name: 'Honolulu', country: 'United States' },
  { name: 'Anchorage', country: 'United States' },
  { name: 'Buffalo', country: 'United States' },
  { name: 'Riverside', country: 'United States' },
  { name: 'St. Louis', country: 'United States' },
  { name: 'Corpus Christi', country: 'United States' },
  { name: 'Lexington', country: 'United States' },
  { name: 'Pittsburgh', country: 'United States' },
  { name: 'Anchorage', country: 'United States' },
  { name: 'Stockton', country: 'United States' },
  { name: 'Cincinnati', country: 'United States' },
  { name: 'St. Paul', country: 'United States' },
  { name: 'Toledo', country: 'United States' },
  { name: 'Greensboro', country: 'United States' },
  { name: 'Newark', country: 'United States' },
  { name: 'Plano', country: 'United States' },
  { name: 'Henderson', country: 'United States' },
  { name: 'Lincoln', country: 'United States' },
  { name: 'Orlando', country: 'United States' },
  { name: 'Jersey City', country: 'United States' },
  { name: 'Chula Vista', country: 'United States' },
  { name: 'Durham', country: 'United States' },
  { name: 'Norfolk', country: 'United States' },
  { name: 'Garland', country: 'United States' },
  { name: 'Madison', country: 'United States' },
  { name: 'Hialeah', country: 'United States' },
  { name: 'Lubbock', country: 'United States' },
  { name: 'Reno', country: 'United States' },
  { name: 'Glendale', country: 'United States' },
  { name: 'Baton Rouge', country: 'United States' },
  { name: 'Irvine', country: 'United States' },
  { name: 'Chesapeake', country: 'United States' },
  { name: 'Irving', country: 'United States' },
  { name: 'Scottsdale', country: 'United States' },
  { name: 'North Las Vegas', country: 'United States' },
  { name: 'Fremont', country: 'United States' },
  { name: 'Gilbert', country: 'United States' },
  { name: 'San Bernardino', country: 'United States' },
  { name: 'Boise', country: 'United States' },
  { name: 'Birmingham', country: 'United States' },
];

export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const currentStepRef = useRef(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [showIkigaiModal, setShowIkigaiModal] = useState(false);
  const [ikigaiCurrentPage, setIkigaiCurrentPage] = useState(0);
  
  // Get onboarding steps with translations - recalculate when language changes
  const ONBOARDING_STEPS = useMemo(() => getOnboardingSteps(t), [t, i18n.language]);
  
  // Debug: Log current language and force re-render when language changes
  useEffect(() => {
    console.log('OnboardingScreen - Current language:', i18n.language);
  }, [i18n.language]);
  
  // Check if we should navigate to a specific step (e.g., from new-goal screen)
  useEffect(() => {
    if (params.step) {
      const targetStep = parseInt(params.step as string, 10);
      if (targetStep >= 1 && targetStep <= ONBOARDING_STEPS.length) {
        // Convert step ID to index (step 9 = index 8)
        const stepIndex = ONBOARDING_STEPS.findIndex(s => s.id === targetStep);
        if (stepIndex !== -1) {
          setCurrentStep(stepIndex);
          Animated.timing(slideAnim, {
            toValue: -stepIndex * width,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      }
    }
  }, [params.step, width]);
  
  // Form state for About You step
  const [name, setName] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthHour, setBirthHour] = useState('');
  const [birthMinute, setBirthMinute] = useState('');
  const [birthAmPm, setBirthAmPm] = useState('AM');
  const [dontKnowTime, setDontKnowTime] = useState(false);
  const [birthCity, setBirthCity] = useState('');

  // Load name when pledge step (step 3) is shown
  useEffect(() => {
    if (currentStep === 2) { // Step 3 is index 2 (0-indexed)
      const loadNameForPledge = async () => {
        try {
          const savedName = await AsyncStorage.getItem('userName');
          if (savedName && savedName.trim()) {
            // Always update name when on pledge step to ensure it's current
            setName(savedName.trim());
          }
        } catch (error) {
          console.error('Error loading name for pledge:', error);
        }
      };
      loadNameForPledge();
    }
  }, [currentStep, name]);

  // Reset Path Forward forms when entering Current Life Context step (step 5, index 4)
  // This ensures the Path Forward screen doesn't appear after Ikigai
  useEffect(() => {
    if (currentStep === 4) { // Step 5 (Current Life Context) is index 4
      setShowCustomPathDreamForm(false);
      setShowCustomPathForm(false);
      setShowObstaclePage(false);
      setExploringPathId(null);
    }
  }, [currentStep]);
  const [citySuggestions, setCitySuggestions] = useState<CityData[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showAmPmDropdown, setShowAmPmDropdown] = useState(false);
  const [pledgeAnswer, setPledgeAnswer] = useState('');
  const [signature, setSignature] = useState('');
  const [showDontKnowTimeModal, setShowDontKnowTimeModal] = useState(false);
  const [hideBirthTimeFields, setHideBirthTimeFields] = useState(false);
  
  // Refs for auto-focus
  const birthMonthRef = useRef<TextInput>(null);
  const birthDateRef = useRef<TextInput>(null);
  const birthYearRef = useRef<TextInput>(null);
  const birthHourRef = useRef<TextInput>(null);
  const birthMinuteRef = useRef<TextInput>(null);
  
  // Ikigai form state
  const [whatYouLove, setWhatYouLove] = useState('');
  const [whatYouGoodAt, setWhatYouGoodAt] = useState('');
  const [whatWorldNeeds, setWhatWorldNeeds] = useState('');
  const [whatCanBePaidFor, setWhatCanBePaidFor] = useState('');
  const [currentSituation, setCurrentSituation] = useState('');
  const [biggestConstraint, setBiggestConstraint] = useState('');
  const [whatMattersMost, setWhatMattersMost] = useState<string[]>([]);
  
  // Path Forward form state
  const [dreamGoal, setDreamGoal] = useState('');
  const [fearOrBarrier, setFearOrBarrier] = useState('');
  
  // Custom path state
  const [showCustomPathForm, setShowCustomPathForm] = useState(false);
  const [showCustomPathDreamForm, setShowCustomPathDreamForm] = useState(false);
  const [customPathData, setCustomPathData] = useState<{
    pathName: string;
    pathDescription: string;
    keyStrengths: string;
    desiredOutcome: string;
    timeCommitment: string;
    uniqueApproach: string;
    milestones: string[];
  } | null>(null);
  
  // Path exploration state
  const [exploringPathId, setExploringPathId] = useState<number | null>(null);
  const [exploringPathName, setExploringPathName] = useState<string>('');
  const [exploringPathDescription, setExploringPathDescription] = useState<string>('');
  const [generatedPaths, setGeneratedPaths] = useState<Array<{ id: number; title: string; description: string; glowColor: string }>>([]);
  const [showJourneyLoading, setShowJourneyLoading] = useState(false);
  const [journeyLoadingItems, setJourneyLoadingItems] = useState<string[]>([]);
  const [selectedGoalTitle, setSelectedGoalTitle] = useState<string>('');
  
  // Obstacle page state
  const [showObstaclePage, setShowObstaclePage] = useState(false);
  const [selectedPathNameForObstacle, setSelectedPathNameForObstacle] = useState<string>('');
  const [pathObstacle, setPathObstacle] = useState<string>('');
  
  // Update refs when state changes
  currentStepRef.current = currentStep;

  const goToNext = async () => {
    try {
      const step = currentStepRef.current;
      console.log('goToNext called, current step:', step);
      
      // EXPLICITLY DISABLE ALL VALIDATION - Users can proceed from any step without filling required fields
      // This ensures no validation can block navigation, especially for About You and Pledge steps
      // NO VALIDATION CHECKS ALLOWED - proceed directly to next step
      
      // Validation for About You step (step.id === 2, index 1) - DISABLED: Users can continue without filling fields
      // No validation required - users can proceed with empty or partially filled fields
      if (step === 1) {
      // Save any available data to AsyncStorage (but don't require any fields)
      try {
        if (name && name.trim()) {
          await AsyncStorage.setItem('userName', name.trim());
        }
        // Save birth date components if available (not required)
        if (birthMonth && birthMonth.trim()) await AsyncStorage.setItem('birthMonth', birthMonth.trim());
        if (birthDate && birthDate.trim()) await AsyncStorage.setItem('birthDate', birthDate.trim());
        if (birthYear && birthYear.trim()) await AsyncStorage.setItem('birthYear', birthYear.trim());
        if (birthCity && birthCity.trim()) await AsyncStorage.setItem('birthCity', birthCity.trim());
        // Save birth time if available
        if (birthHour && birthMinute && birthHour.trim() && birthMinute.trim() && !hideBirthTimeFields) {
          await AsyncStorage.setItem('birthHour', birthHour.trim());
          await AsyncStorage.setItem('birthMinute', birthMinute.trim());
          await AsyncStorage.setItem('birthPeriod', birthAmPm.trim());
        }
      } catch (error) {
        console.error('Error saving user data:', error);
      }
      // Always proceed to next step regardless of field values - no validation required
    }
    
    // Pledge step (step.id === 3, index 2) - DISABLED: Users can continue without signature or any fields
    // No validation required - users can proceed without signing the pledge
    if (step === 2) {
      // Save signature if available (but not required)
      try {
        if (signature && signature.trim()) {
          await AsyncStorage.setItem('pledgeSignature', signature);
        }
      } catch (error) {
        console.error('Error saving signature:', error);
      }
      // Always proceed to next step regardless of signature - no validation required
    }
    
    // Save Ikigai answers when completing Ikigai step (step index 3, which is step.id === 4)
    if (step === 3) {
      try {
        await AsyncStorage.setItem('ikigaiWhatYouLove', whatYouLove.trim());
        await AsyncStorage.setItem('ikigaiWhatYouGoodAt', whatYouGoodAt.trim());
        await AsyncStorage.setItem('ikigaiWhatWorldNeeds', whatWorldNeeds.trim());
        await AsyncStorage.setItem('ikigaiWhatCanBePaidFor', whatCanBePaidFor.trim());
      } catch (error) {
        console.error('Error saving Ikigai data:', error);
      }
      // Ensure Path Forward form is NOT shown after Ikigai - go directly to Current Life Context
      setShowCustomPathDreamForm(false);
      setShowCustomPathForm(false);
    }
    
    if (step < ONBOARDING_STEPS.length - 1) {
      const nextStep = step + 1;
      // Proceed with navigation - NO VALIDATION
      Animated.timing(slideAnim, {
        toValue: -nextStep * width,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setCurrentStep(nextStep);
    } else {
      // Ensure name and birth date are saved before navigating (if available, not required)
      try {
        if (name && name.trim()) {
          await AsyncStorage.setItem('userName', name.trim());
        }
        // Save birth date components if available (not required)
        if (birthMonth && birthMonth.trim()) await AsyncStorage.setItem('birthMonth', birthMonth.trim());
        if (birthDate && birthDate.trim()) await AsyncStorage.setItem('birthDate', birthDate.trim());
        if (birthYear && birthYear.trim()) await AsyncStorage.setItem('birthYear', birthYear.trim());
        if (birthCity && birthCity.trim()) await AsyncStorage.setItem('birthCity', birthCity.trim());
        // Save birth time if available
        if (birthHour && birthMinute && birthHour.trim() && birthMinute.trim() && !hideBirthTimeFields) {
          await AsyncStorage.setItem('birthHour', birthHour.trim());
          await AsyncStorage.setItem('birthMinute', birthMinute.trim());
          await AsyncStorage.setItem('birthPeriod', birthAmPm.trim());
        }
      } catch (error) {
        console.error('Error saving user data:', error);
      }
      // Navigate to main app (tabs) - no validation required
      router.replace('/(tabs)');
    }
    } catch (error) {
      // Silently handle any errors - don't show alerts or block navigation
      console.error('Error in goToNext (non-blocking):', error);
      // Still proceed with navigation even if there's an error
      const step = currentStepRef.current;
      if (step < ONBOARDING_STEPS.length - 1) {
        const nextStep = step + 1;
        Animated.timing(slideAnim, {
          toValue: -nextStep * width,
          duration: 300,
          useNativeDriver: true,
        }).start();
        setCurrentStep(nextStep);
      }
    }
  };

  const goToPrevious = () => {
    const step = currentStepRef.current;
    // If showing obstacle page, go back to path exploration or custom path form
    if (showObstaclePage) {
      setShowObstaclePage(false);
      setPathObstacle('');
      return;
    }
    // If showing custom path form, go back to paths list
    if (showCustomPathDreamForm) {
      setShowCustomPathDreamForm(false);
      return;
    }
    if (showCustomPathForm) {
      setShowCustomPathForm(false);
      return;
    }
    // If exploring a path, go back to paths list
    if (exploringPathId !== null) {
      setExploringPathId(null);
      setExploringPathName('');
      return;
    }
    if (step > 0) {
      const prevStep = step - 1;
      Animated.timing(slideAnim, {
        toValue: -prevStep * width,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setCurrentStep(prevStep);
    } else {
      // Go back to landing screen
      router.back();
    }
  };

  // Step swiping disabled for onboarding - navigation only via buttons

  return (
    <PaperTextureBackground>
    <View style={styles.container}>
      {!showJourneyLoading && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goToPrevious}>
            <MaterialIcons name="arrow-back" size={24} color="#342846" />
          </TouchableOpacity>
            <View style={styles.headerProgressContainer}>
              <View style={styles.headerProgressBar}>
                <View 
                  style={[
                    styles.headerProgressFill, 
                    { width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }
                  ]} 
                />
              </View>
            </View>
            {currentStep === 3 && (
              <TouchableOpacity 
                style={styles.ikigaiHelpButton} 
                onPress={() => setShowIkigaiModal(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="help-outline" size={24} color="#342846" />
              </TouchableOpacity>
            )}
        </View>
      )}

      <Animated.View
        style={[
          styles.slider,
          {
            transform: [{ translateX: slideAnim }],
            width: width * ONBOARDING_STEPS.length,
          },
        ]}
      >
        {ONBOARDING_STEPS.map((step, index) => (
          <View key={step.id} style={[styles.stepContainer, { width }]}>
            {step.isForm ? (
              <AboutYouForm
                name={name}
                setName={setName}
                birthMonth={birthMonth}
                setBirthMonth={setBirthMonth}
                birthDate={birthDate}
                setBirthDate={setBirthDate}
                birthYear={birthYear}
                setBirthYear={setBirthYear}
                birthHour={birthHour}
                setBirthHour={setBirthHour}
                birthMinute={birthMinute}
                setBirthMinute={setBirthMinute}
                birthAmPm={birthAmPm}
                setBirthAmPm={setBirthAmPm}
                dontKnowTime={dontKnowTime}
                setDontKnowTime={setDontKnowTime}
                birthCity={birthCity}
                setBirthCity={setBirthCity}
                citySuggestions={citySuggestions}
                setCitySuggestions={setCitySuggestions}
                showCityDropdown={showCityDropdown}
                setShowCityDropdown={setShowCityDropdown}
                showAmPmDropdown={showAmPmDropdown}
                setShowAmPmDropdown={setShowAmPmDropdown}
                hideBirthTimeFields={hideBirthTimeFields}
                birthMonthRef={birthMonthRef}
                birthDateRef={birthDateRef}
                birthYearRef={birthYearRef}
                birthHourRef={birthHourRef}
                birthMinuteRef={birthMinuteRef}
                setShowDontKnowTimeModal={setShowDontKnowTimeModal}
              />
            ) : step.id === 3 ? (
              <PledgeStep name={name} signature={signature} setSignature={setSignature} />
            ) : step.id === 4 ? (
              <IkigaiForm
                whatYouLove={whatYouLove}
                setWhatYouLove={setWhatYouLove}
                whatYouGoodAt={whatYouGoodAt}
                setWhatYouGoodAt={setWhatYouGoodAt}
                whatWorldNeeds={whatWorldNeeds}
                setWhatWorldNeeds={setWhatWorldNeeds}
                whatCanBePaidFor={whatCanBePaidFor}
                setWhatCanBePaidFor={setWhatCanBePaidFor}
                onPageChange={setIkigaiCurrentPage}
                onContinue={goToNext}
              />
            ) : step.id === 5 ? (
              // Current Life Context step - explicitly prevent Path Forward forms from showing
              <CurrentLifeContextStep
                currentSituation={currentSituation}
                setCurrentSituation={setCurrentSituation}
                biggestConstraint={biggestConstraint}
                setBiggestConstraint={setBiggestConstraint}
                whatMattersMost={whatMattersMost}
                setWhatMattersMost={setWhatMattersMost}
                onContinue={() => goToNext()}
              />
            ) : step.id === 6 ? (
              <LoadingStep 
                isActive={currentStep === 5}
                onComplete={() => goToNext()} 
              />
            ) : step.id === 7 ? (
              <CallingAwaitsStep 
                userName={name}
                birthMonth={birthMonth}
                birthDate={birthDate}
                birthYear={birthYear}
                birthCity={birthCity}
                birthHour={birthHour}
                birthMinute={birthMinute}
                birthPeriod={birthAmPm}
                whatYouLove={whatYouLove}
                whatYouGoodAt={whatYouGoodAt}
                whatWorldNeeds={whatWorldNeeds}
                whatCanBePaidFor={whatCanBePaidFor}
                fear={fearOrBarrier}
                whatExcites={dreamGoal}
                onContinue={() => goToNext()}
              />
            ) : step.id === 8 ? (
              showJourneyLoading ? (
                <JourneyLoadingStep
                  loadingItems={journeyLoadingItems}
                  onComplete={() => {
                    setShowJourneyLoading(false);
                    if (exploringPathId) {
                      // If exploring a path, navigate to paywall
                      const paywallStepIndex = 8; // Index 8 = step id 9
                      Animated.timing(slideAnim, {
                        toValue: -paywallStepIndex * width,
                        duration: 300,
                        useNativeDriver: true,
                      }).start();
                      setCurrentStep(paywallStepIndex);
                    } else if (customPathData) {
                      // If custom goal was created, navigate to paywall
                      const paywallStepIndex = 8; // Index 8 = step id 9
                      Animated.timing(slideAnim, {
                        toValue: -paywallStepIndex * width,
                        duration: 300,
                        useNativeDriver: true,
                      }).start();
                      setCurrentStep(paywallStepIndex);
                    } else {
                      // If "Work on my goal" was clicked, navigate to new goal screen
                      router.push({
                        pathname: '/new-goal',
                        params: { fromOnboarding: 'true' },
                      });
                    }
                  }}
                />
              ) : showObstaclePage ? (
                <ObstaclePage
                  pathName={selectedPathNameForObstacle}
                  onContinue={async (obstacle) => {
                    setPathObstacle(obstacle);
                    setShowObstaclePage(false);
                    
                    // Now proceed with goal creation using the obstacle
                    const isCustomGoal = customPathData !== null;
                    
                    try {
                      // Set loading items
                      const loadingItems = [
                        'Analyzing your unique strengths',
                        'Mapping your path to success',
                        'Building your personalized roadmap',
                        'Preparing your journey',
                      ];
                      setJourneyLoadingItems(loadingItems);
                      
                      let completeGoal;
                      
                      if (isCustomGoal && customPathData && customPathData.milestones.length > 0) {
                        // Use milestones from custom path data
                        const milestoneSteps = customPathData.milestones.map((milestone, index) => ({
                          name: milestone.trim(),
                          description: milestone.trim(),
                          order: index + 1,
                        }));
                        
                        completeGoal = {
                          name: customPathData.pathName,
                          steps: milestoneSteps,
                          numberOfSteps: milestoneSteps.length,
                          estimatedDuration: customPathData.timeCommitment,
                          hardnessLevel: 'Medium' as const,
                          fear: obstacle || fearOrBarrier || 'Fear of failure',
                        };
                      } else {
                        // Using fallback goal structure
                        completeGoal = {
                          name: selectedGoalTitle,
                          steps: [
                            { name: 'Step 1', description: 'Begin your journey by taking the first action.', order: 1 },
                            { name: 'Step 2', description: 'Continue building momentum with focused effort.', order: 2 },
                            { name: 'Step 3', description: 'Reach a significant milestone in your progress.', order: 3 },
                            { name: 'Step 4', description: 'Complete your goal and celebrate your achievement.', order: 4 },
                          ],
                          numberOfSteps: 4,
                          estimatedDuration: '3 months',
                          hardnessLevel: 'Medium' as const,
                          fear: obstacle || fearOrBarrier || 'Fear of failure',
                        };
                      }
                      
                      // Save goal to AsyncStorage
                      const goalToSave = {
                        id: Date.now().toString(),
                        name: completeGoal.name,
                        steps: completeGoal.steps,
                        numberOfSteps: completeGoal.numberOfSteps,
                        estimatedDuration: completeGoal.estimatedDuration,
                        hardnessLevel: completeGoal.hardnessLevel,
                        fear: completeGoal.fear,
                        obstacle: obstacle, // Store obstacle separately for AI consideration
                        progressPercentage: 0,
                        isActive: true,
                        isQueued: false,
                        createdAt: new Date().toISOString(),
                        currentStepIndex: 0,
                      };
                      
                      // Load existing goals and add new one
                      const existingGoalsData = await AsyncStorage.getItem('userGoals');
                      const existingGoals = existingGoalsData ? JSON.parse(existingGoalsData) : [];
                      
                      // Check if we already have 3 active goals
                      const activeGoals = existingGoals.filter((g: any) => g.isActive === true);
                      if (activeGoals.length >= 3) {
                        // Mark new goal as queued
                        goalToSave.isActive = false;
                        goalToSave.isQueued = true;
                      } else {
                        // Mark new goal as active
                        goalToSave.isActive = true;
                        goalToSave.isQueued = false;
                      }
                      
                      // Add new goal to the beginning of the list
                      const updatedGoals = [goalToSave, ...existingGoals];
                      await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));
                      
                      setShowJourneyLoading(true);
                    } catch (error) {
                      console.error('Error creating goal:', error);
                      // Fallback to placeholder loading items
                      setJourneyLoadingItems([
                        'Analyzing your unique strengths',
                        'Mapping your path to success',
                        'Building your personalized roadmap',
                        'Preparing your journey',
                      ]);
                      setShowJourneyLoading(true);
                    }
                  }}
                />
              ) : (showCustomPathDreamForm && step.id === 8) ? (
                // Only show CustomPathDreamForm on step 8 (Paths Aligned), not on other steps
                <CustomPathDreamForm
                  onBack={goToPrevious}
                  onComplete={async (pathData) => {
                    // Save custom path data
                    setCustomPathData({
                      pathName: pathData.pathName,
                      pathDescription: pathData.pathDescription,
                      keyStrengths: pathData.startingPoint,
                      desiredOutcome: pathData.pathDescription,
                      timeCommitment: pathData.timeline,
                      uniqueApproach: pathData.mainObstacle + (pathData.obstacleOther ? ': ' + pathData.obstacleOther : ''),
                      milestones: [],
                    });
                    setDreamGoal(pathData.pathDescription);
                    setFearOrBarrier(pathData.mainObstacle + (pathData.obstacleOther ? ': ' + pathData.obstacleOther : ''));
                    setShowCustomPathDreamForm(false);
                    setSelectedGoalTitle(pathData.pathName);
                    // Show obstacle page before creating the goal
                    setSelectedPathNameForObstacle(pathData.pathName);
                    setShowObstaclePage(true);
                  }}
                />
              ) : (showCustomPathForm && step.id === 8) ? (
                // Only show CustomPathForm on step 8 (Paths Aligned), not on other steps
                <CustomPathForm
                  onBack={goToPrevious}
                  onComplete={async (pathData) => {
                    // Save custom path data
                    setCustomPathData({
                      pathName: pathData.goalTitle,
                      pathDescription: pathData.description,
                      keyStrengths: '',
                      desiredOutcome: pathData.description,
                      timeCommitment: pathData.targetTimeline,
                      uniqueApproach: pathData.milestones.join(', '),
                      milestones: pathData.milestones.filter(m => m.trim()),
                    });
                    setShowCustomPathForm(false);
                    setSelectedGoalTitle(pathData.goalTitle);
                    // Show obstacle page before creating the goal
                    setSelectedPathNameForObstacle(pathData.goalTitle);
                    setShowObstaclePage(true);
                  }}
                />
              ) : exploringPathId ? (
                <PathExplorationStep
                  pathName={exploringPathName}
                  pathDescription={exploringPathDescription}
                  userName={name}
                  birthMonth={birthMonth}
                  birthDate={birthDate}
                  birthYear={birthYear}
                  birthCity={birthCity}
                  birthHour={birthHour}
                  birthMinute={birthMinute}
                  birthPeriod={birthAmPm}
                  whatYouLove={whatYouLove}
                  whatYouGoodAt={whatYouGoodAt}
                  whatWorldNeeds={whatWorldNeeds}
                  whatCanBePaidFor={whatCanBePaidFor}
                  fear={fearOrBarrier}
                  whatExcites={dreamGoal}
                  onWorkOnDreamGoal={() => {
                    // Navigate to new goal screen to create custom goal
                    router.push({
                      pathname: '/new-goal',
                      params: { fromOnboarding: 'true' },
                    });
                  }}
                  onStartJourney={async (goalId, goalTitle) => {
                    // Use goal title from PathExplorationStep, or fallback to path title
                    const path = generatedPaths.find(p => p.id === goalId);
                    const finalGoalTitle = goalTitle || path?.title || 'Your personalized goal';
                    setSelectedGoalTitle(finalGoalTitle);
                    // Show obstacle page before creating the goal
                    setSelectedPathNameForObstacle(finalGoalTitle);
                    setShowObstaclePage(true);
                  }}
                />
              ) : (
                <PathsAlignedStep 
                  birthMonth={birthMonth}
                  birthDate={birthDate}
                  birthYear={birthYear}
                  birthCity={birthCity}
                  birthHour={birthHour}
                  birthMinute={birthMinute}
                  birthPeriod={birthAmPm}
                  whatYouLove={whatYouLove}
                  whatYouGoodAt={whatYouGoodAt}
                  whatWorldNeeds={whatWorldNeeds}
                  whatCanBePaidFor={whatCanBePaidFor}
                  fear={fearOrBarrier}
                  whatExcites={dreamGoal}
                  onPathsGenerated={(paths) => {
                    setGeneratedPaths(paths);
                  }}
                  onExplorePath={(pathId) => {
                    // Get path name from generated paths
                    const path = generatedPaths.find(p => p.id === pathId);
                    // Use the path title directly (already formatted as "The [Name]")
                    const pathTitle = path?.title || `The Path ${pathId}`;
                    setExploringPathName(pathTitle);
                    setExploringPathId(pathId);
                  }}
                  onWorkOnDreamGoal={() => {
                    // Show custom path dream form (dream and fear questions)
                    setShowCustomPathDreamForm(true);
                  }}
                />
              )
            ) : step.id === 9 ? (
              <PaywallStep 
                goalTitle={selectedGoalTitle || dreamGoal || 'become a full-time graphic designer'}
                onStartJourney={() => {
                  // Navigate to paywall screen
                  router.push('/paywall');
                }}
                birthMonth={birthMonth}
                birthDate={birthDate}
                birthYear={birthYear}
                birthCity={birthCity}
                birthHour={birthHour}
                birthMinute={birthMinute}
                birthPeriod={birthAmPm}
                whatYouLove={whatYouLove}
                whatYouGoodAt={whatYouGoodAt}
                whatWorldNeeds={whatWorldNeeds}
                whatCanBePaidFor={whatCanBePaidFor}
                fear={fearOrBarrier}
                whatExcites={dreamGoal}
              />
            ) : step.id === 10 ? (
              <PaywallStep 
                goalTitle={selectedGoalTitle || dreamGoal || 'become a full-time graphic designer'}
                onStartJourney={() => {
                  // Navigate to paywall screen
                  router.push('/paywall');
                }}
                birthMonth={birthMonth}
                birthDate={birthDate}
                birthYear={birthYear}
                birthCity={birthCity}
                birthHour={birthHour}
                birthMinute={birthMinute}
                birthPeriod={birthAmPm}
                whatYouLove={whatYouLove}
                whatYouGoodAt={whatYouGoodAt}
                whatWorldNeeds={whatWorldNeeds}
                whatCanBePaidFor={whatCanBePaidFor}
                fear={fearOrBarrier}
                whatExcites={dreamGoal}
              />
            ) : (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.content}</Text>
                {step.showImage && (
                  <Image 
                    source={require('../assets/images/full.deer.png')}
                    style={styles.stepImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            )}
          </View>
        ))}
      </Animated.View>

      {/* Don't Know Time Modal */}
      <Modal
        visible={showDontKnowTimeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDontKnowTimeModal(false)}
      >
        <View style={styles.dontKnowTimeModalOverlay}>
          <View style={styles.dontKnowTimeModal}>
            <TouchableOpacity
              style={styles.dontKnowTimeModalCloseButton}
              onPress={() => setShowDontKnowTimeModal(false)}
            >
              <Text style={styles.dontKnowTimeModalCloseX}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.dontKnowTimeModalTitle}>
              {t('onboarding.dontKnowTimeModalText')}
            </Text>
            <TouchableOpacity
              style={styles.dontKnowTimeModalConfirmButton}
              onPress={() => {
                setDontKnowTime(true);
                setHideBirthTimeFields(true);
                setBirthHour('');
                setBirthMinute('');
                setBirthAmPm('AM');
                setShowDontKnowTimeModal(false);
              }}
            >
              <Text style={styles.dontKnowTimeModalConfirmButtonText}>{t('onboarding.dontKnowTimeModalConfirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ikigai Help Modal */}
      {showIkigaiModal && (
        <Modal
          transparent
          visible={showIkigaiModal}
          animationType="fade"
          onRequestClose={() => setShowIkigaiModal(false)}
        >
          <View style={styles.ikigaiModalOverlay}>
            <View style={styles.ikigaiModalContent}>
              <Image 
                source={require('../assets/images/target (1).png')} 
                style={styles.ikigaiModalIcon}
                resizeMode="contain"
              />
              <Text style={styles.ikigaiModalTitle}>{t('onboarding.ikigaiModalTitle')}</Text>
              <Text style={styles.ikigaiModalText}>
                {t('onboarding.ikigaiModalText')}
              </Text>
              <TouchableOpacity
                style={styles.ikigaiModalButton}
                onPress={() => setShowIkigaiModal(false)}
              >
                <Text style={styles.ikigaiModalButtonText}>{t('common.gotIt')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {!showJourneyLoading && (
        <View style={styles.footer}>
          {currentStep === 1 && (
            <Text style={styles.hintText}>
              {t('onboarding.birthLocationHelper')}
            </Text>
          )}
          {currentStep !== 4 && currentStep !== 5 && currentStep !== 6 && currentStep !== 7 && exploringPathId === null && !showObstaclePage && !showCustomPathForm && (
            // For Ikigai step (currentStep === 3), only show continue button on last question (page 3 = "What can you be paid for?")
            // Pledge step (currentStep === 2) should show continue button with "I Vow" text
            (currentStep === 3 && ikigaiCurrentPage !== 3) ? null : (
            <TouchableOpacity 
              style={styles.continueButton} 
              onPress={async () => {
                // Explicitly bypass any validation - allow navigation from pledge step without any field requirements
                // Directly call goToNext without any validation checks
                await goToNext();
              }}
            >
              <Text style={styles.continueButtonText}>
                {currentStep === 2 ? t('common.iVow') : currentStep === ONBOARDING_STEPS.length - 1 ? t('common.getStarted') : t('common.continue')}
              </Text>
            </TouchableOpacity>
            )
          )}
        </View>
      )}
    </View>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  pathExplorationContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  whiteZoomOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    width: width,
    height: height,
    zIndex: 9999,
    transformOrigin: 'center',
  },
  header: {
    flexDirection: 'row',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#342846',
    fontWeight: 'bold',
  },
  headerSpacer: {
    flex: 1,
  },
  headerProgressContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  headerProgressFill: {
    height: '100%',
    backgroundColor: '#342846',
    borderRadius: 2,
  },
  slider: {
    flexDirection: 'row',
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 0, // Container padding handled by stepContent
    position: 'relative',
  },
  stepContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    width: '100%',
  },
  stepTitle: {
    ...HeadingStyle,
    color: '#342846',
    marginTop: -10,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 0, // Padding handled by stepContent parent
  },
  stepText: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 24,
    paddingHorizontal: 0, // Padding handled by stepContent parent
    width: '100%',
  },
  stepImage: {
    width: width * 0.7 * 1.35, // Increased by 35% (from 0.7 to 0.945)
    height: width * 0.7 * 1.35, // Increased by 35% (from 0.7 to 0.945)
    marginTop: 20,
    marginBottom: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingHorizontal: 40,
    paddingBottom: 40,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  continueButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
  },
  continueButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    zIndex: 1,
  },
  formContainerScrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  customPathFormBackgroundImage: {
    resizeMode: 'cover',
  },
  formContent: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  ikigaiFormContent: {
    paddingHorizontal: 40,
    paddingRight: 40,
    paddingLeft: 40,
    paddingTop: 120,
    paddingBottom: 200, // Increased padding to ensure last field stays above keyboard
    minHeight: '100%',
  },
  ikigaiHorizontalScroll: {
    flex: 1,
  },
  ikigaiHorizontalContent: {
    flexDirection: 'row',
  },
  ikigaiCardContainer: {
    width: width,
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 115,
    paddingBottom: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: -85,
    overflow: 'visible',
  },
  ikigaiPagination: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  ikigaiPaginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
  },
  ikigaiPaginationDotActive: {
    backgroundColor: '#342846',
    width: 24,
  },
  pathForwardFormContent: {
    paddingHorizontal: 40,
    paddingTop: 0,
    paddingBottom: 20,
    minHeight: '100%',
    justifyContent: 'center',
  },
  pathForwardTitleContainer: {
    paddingTop: 0,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  pathForwardTitle: {
    marginBottom: 20,
  },
  pathForwardScrollView: {
    flex: 1,
    width: '100%',
  },
  pathForwardContent: {
    paddingLeft: 40,
    paddingRight: 40,
    paddingTop: 40,
    paddingBottom: 80,
    width: '100%',
  },
  pathForwardQuestionContainer: {
    marginBottom: 20,
    width: '100%',
    alignSelf: 'stretch',
  },
  pathForwardHorizontalScroll: {
    flex: 1,
  },
  pathForwardHorizontalContent: {
    flexDirection: 'row',
  },
  pathForwardCardContainer: {
    width: width,
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 20,
    justifyContent: 'center',
  },
  pathForwardFieldContainer: {
    marginBottom: 0,
    marginTop: -50,
    position: 'relative',
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingHorizontal: 40,
    paddingBottom: 20,
    overflow: 'visible',
    width: '100%',
    flex: 1,
    justifyContent: 'center',
  },
  pathForwardPagination: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  pathForwardPaginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
  },
  pathForwardPaginationDotActive: {
    backgroundColor: '#342846',
    width: 24,
  },
  pathForwardContinueButton: {
    alignItems: 'center',
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignSelf: 'center',
    minWidth: 200,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    marginHorizontal: 20,
    marginBottom: 40,
    zIndex: 1000,
  },
  pathForwardContinueButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  pathForwardFieldLabel: {
    ...HeadingStyle,
    color: '#342846',
    marginBottom: 12,
    fontSize: 18,
    textAlign: 'center',
    width: '100%',
    minHeight: 24,
    backgroundColor: 'transparent',
  },
  pathForwardFieldBodyText: {
    ...BodyStyle,
    color: '#342846',
    marginBottom: 10,
    fontSize: 14,
    width: '100%',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 20,
    paddingHorizontal: 45,
    backgroundColor: 'transparent',
  },
  ikigaiProgressWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: -60,
    width: '100%',
  },
  ikigaiProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ikigaiProgressLine: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D0D0D0',
    marginHorizontal: 4,
  },
  ikigaiProgressLineActive: {
    backgroundColor: '#342846',
  },
  ikigaiProgressCounterContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 12,
  },
  ikigaiProgressText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    fontWeight: '600',
  },
  ikigaiNavigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 25,
    paddingRight: 25,
    paddingBottom: 40,
    paddingTop: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    gap: 0,
    zIndex: 5,
    pointerEvents: 'box-none',
  },
  ikigaiNavigationButtonsCentered: {
    justifyContent: 'center',
  },
  ikigaiNavButtonCentered: {
    alignSelf: 'center',
  },
  ikigaiNavButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 999,
    backgroundColor: '#342846',
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
  },
  ikigaiNavButtonLeft: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    paddingLeft: 28,
    paddingRight: 28,
    minWidth: 140,
    marginLeft: 0,
  },
  ikigaiNavButtonRight: {
    paddingRight: 40,
    marginRight: 0,
  },
  ikigaiContinueButton: {
    minWidth: 200,
  },
  ikigaiNavButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ikigaiNavButtonIcon: {
    marginRight: 0,
  },
  ikigaiNavButtonText: {
    ...ButtonHeadingStyle,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  ikigaiNavButtonTextLeft: {
    ...ButtonHeadingStyle,
    color: '#342846',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  ikigaiLastQuestionBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
  },
  ikigaiLastQuestionBackButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 20,
    marginLeft: 8,
    fontWeight: '600',
  },
  ikigaiTitleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  formTitle: {
    ...HeadingStyle,
    color: '#342846',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 55,
    lineHeight: 25,
  },
  ikigaiTitleLine1: {
    marginBottom: 10,
  },
  aboutYouTitle: {
    ...HeadingStyle,
    color: '#342846',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 30,
    lineHeight: 25,
  },
  ikigaiHelpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ikigaiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  ikigaiModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  ikigaiModalIcon: {
    width: 62,
    height: 62,
    alignSelf: 'center',
    marginBottom: 16,
  },
  ikigaiModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#342846',
    textAlign: 'center',
    marginBottom: 16,
  },
  ikigaiModalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#342846',
    textAlign: 'left',
    marginBottom: 24,
  },
  ikigaiModalBold: {
    fontWeight: '700',
    color: '#342846',
  },
  ikigaiModalButton: {
    backgroundColor: '#342846',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  ikigaiModalButtonText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  formBodyText: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 32,
    paddingTop: 0,
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  formBodyTextRussian: {
    // Removed special positioning - fields now at original height
  },
  fieldContainer: {
    marginBottom: 24,
    position: 'relative',
    alignItems: 'center', // Center answer fields horizontally
    width: '100%', // Full width for centering
    backgroundColor: 'transparent',
    minHeight: 100,
  },
  ikigaiFieldContainer: {
    marginBottom: 0,
    position: 'relative',
    alignItems: 'center', // Center answer fields horizontally
    paddingTop: 135,
    paddingHorizontal: 40,
    paddingBottom: 20,
    overflow: 'visible', // Ensure stars aren't clipped
    width: '100%', // Full width for centering
    flex: 1,
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
  },
  ikigaiFieldContainerRed: {
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  ikigaiFieldContainerPurple: {
    shadowColor: '#9B59B6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  ikigaiFieldContainerGreen: {
    shadowColor: '#52C41A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  ikigaiFieldContainerGold: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  questionCounter: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    marginBottom: 6,
    marginTop: -10,
    textAlign: 'center',
    opacity: 0.7,
    width: '100%',
  },
  dreamQuestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 16,
    width: '100%',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dreamIcon: {
    width: 60,
    height: 60,
    marginRight: 12,
  },
  fieldLabel: {
    ...HeadingStyle,
    color: '#342846',
    marginTop: 0,
    marginBottom: 15,
    fontSize: 20,
    textAlign: 'center',
  },
  fieldLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  helperIcon: {
    marginLeft: 8,
    marginBottom: 15,
    padding: 4,
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tooltipContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    overflow: 'visible',
    position: 'relative',
    width: '100%',
    maxWidth: 300,
    minHeight: 150,
    alignSelf: 'center',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipTextContainer: {
    minHeight: 0,
  },
  tooltipText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    lineHeight: 19.2,
    textAlign: 'center',
    textAlignVertical: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  tooltipCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
  },
  ikigaiFieldLabel: {
    ...HeadingStyle,
    color: '#342846',
    marginTop: -165,
    marginBottom: 45,
    fontSize: 20,
    textAlign: 'center',
    width: '100%',
  },
  fieldBodyTextContainer: {
    width: '130%',
    alignSelf: 'center',
    marginTop: -5,
    marginBottom: 20,
  },
  fieldBodyText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    width: '100%',
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  textFieldWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    overflow: 'visible', // Changed to visible to allow shadow to show
    position: 'relative',
    width: '100%', // Full width for centering
    // Subtle brown shadow
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8, // For Android
  },
  bodyTextFieldWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    overflow: 'visible', // Changed to visible to allow shadow to show
    position: 'relative',
    width: '100%', // Full width
    minHeight: 90, // Reduced height for more compact layout
    marginTop: 8, // Reduced spacing between body text and answer field
    alignSelf: 'flex-start', // Align to left
    // Purple 3D shadow
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12, // For Android
    zIndex: 1, // Ensure it's above other elements
  },
  nameFieldWrapper: {
    maxWidth: 300, // Narrower width for name field
    alignSelf: 'center', // Center the narrower field
  },
  ikigaiTextFieldWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    overflow: 'visible', // Changed to visible to allow shadow to show
    position: 'relative',
    minHeight: 130, // Increased by 30% from 100 (100 * 1.3 = 130)
    width: '100%', // Ensure full width for centering
    maxWidth: 300,
    alignSelf: 'center',
    marginTop: 30,
    zIndex: 10,
    // Subtle brown shadow
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8, // For Android
  },
  cityFieldWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: 300, // Same width as name field
    alignSelf: 'center', // Center the field
  },
  textField: {
    ...BodyStyle,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 12,
    color: '#342846',
    fontSize: 14, // Reduced by 2px from 16 (affects placeholder helper text)
    lineHeight: 19.2, // Reduced by 20% from 24 (24 * 0.8 = 19.2)
    flexWrap: 'wrap',
    textAlign: 'center', // Center align text horizontally
    textAlignVertical: 'center', // Center align text vertically
    width: '100%', // Full width
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center', // Center date fields
    width: '100%',
  },
  dateField: {
    width: 70, // Narrower width for 2-digit fields (MM, DD)
  },
  dateFieldYear: {
    width: 90, // Narrower width for 4-digit year field (YYYY)
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center', // Center time fields
    width: '100%',
  },
  timeRowRussian: {
    justifyContent: 'center', // Center the time fields for Russian version (no AM/PM)
  },
  timeField: {
    width: 70, // Narrower width for 2-digit fields (HH, MM)
  },
  amPmField: {
    width: 80,
    position: 'relative',
    zIndex: 100,
    overflow: 'visible', // Override textFieldWrapper's overflow: 'hidden'
  },
  dropdownButtonWrapper: {
    width: '100%',
  },
  dropdownGradient: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  dropdownText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#342846',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownMenuUp: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    marginBottom: 4,
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    minHeight: 44,
  },
  dropdownItem: {
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
  },
  dropdownItemText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
  checkboxContainer: {
    marginBottom: 24,
    alignItems: 'center', // Center checkbox
    width: '100%',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#342846',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
  },
  cityDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 1000,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  cityDropdownScrollView: {
    maxHeight: 200,
  },
  cityDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
  },
  cityDropdownContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityDropdownText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: '500',
  },
  cityDropdownCountry: {
    ...BodyStyle,
    color: '#999',
    fontSize: 14,
  },
  hintText: {
    ...BodyStyle,
    fontSize: 12,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 14.4, // Reduced by 20% (from 18 to 14.4)
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5.6, // Reduced by 30% from 8
    marginBottom: 5.6, // Reduced by 30% from 8
  },
  cakeImage: {
    width: width * 0.6885, // Reduced by 15% from 0.81
    height: width * 0.6885,
  },
  pledgeContainer: {
    flex: 1,
    width: '100%',
  },
  pledgeContentContainer: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  pledgeTitle: {
    ...HeadingStyle,
    color: '#342846',
    marginTop: 0,
    marginBottom: 32,
    textAlign: 'center',
  },
  pledgeContent: {
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
    alignItems: 'center',
  },
  pledgeText: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    fontSize: 16,
  },
  pledgeName: {
    fontFamily: 'AnonymousPro-Regular',
  },
  pledgeSubtext: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 16,
  },
  signatureContainer: {
    marginTop: 40,
    width: '100%',
    alignItems: 'center',
  },
  signatureLabel: {
    ...BodyStyle,
    color: '#342846',
    marginBottom: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  signatureWrapper: {
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
    height: 170,
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  clearSignatureButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  clearSignatureText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
  },
  pledgeTextFieldWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    marginTop: 32,
    width: '100%',
    overflow: 'visible', // Changed to visible to allow shadow to show
    minHeight: 100,
    // Subtle brown shadow
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8, // For Android
  },
  pledgeTextFieldContainer: {
    minHeight: 100,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  pledgeTextField: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    textAlign: 'left',
    width: '100%',
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  dontKnowTimeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  dontKnowTimeModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  dontKnowTimeModalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
  },
  dontKnowTimeModalCloseX: {
    fontSize: 16,
    color: '#342846',
    fontWeight: 'bold',
  },
  dontKnowTimeModalTitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 24,
  },
  dontKnowTimeModalConfirmButton: {
    backgroundColor: '#342846',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  dontKnowTimeModalConfirmButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  starButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 100,
    padding: 4,
    backgroundColor: 'transparent',
  },
  starButtonOutside: {
    position: 'absolute',
    top: 0, // Align with top of field container
    right: -20, // Position outside container, accounting for star size and padding
    zIndex: 100,
    padding: 10, // Generous padding for touch target and visibility
    backgroundColor: 'transparent',
  },
  starButtonLeft: {
    position: 'absolute',
    top: '50%', // Center vertically
    left: -20, // Position outside container on the left side
    zIndex: 100,
    padding: 0, // No padding
    backgroundColor: 'transparent',
    transform: [{ translateY: 12.2 }], // Moved down by 15px more from -2.8
  },
  emojiButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 35,
    marginBottom: 8,
    width: '100%',
  },
  starButtonCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    backgroundColor: 'transparent',
  },
  emojiWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clickText: {
    fontSize: 10,
    color: '#342846',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: -30,
    fontWeight: '600',
  },
  starContainer: {
    width: 40,
    height: 40,
    borderRadius: 20, // Make it circular
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4, // Add padding around the emoji
  },
  starIcon: {
    fontSize: 17.92,
  },
  starIconImage: {
    width: 49,
    height: 49,
  },
  assistanceButton: {
    marginTop: 8,
    alignSelf: 'flex-start', // Align to the left, same as field and question
  },
  assistanceText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    textAlign: 'center', // Center align text
    marginBottom: 1.4, // 10% of fontSize (14 * 0.1 = 1.4)
  },
  star: {
    color: '#342846',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalTitle: {
    ...HeadingStyle,
    color: '#342846',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalHelperText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    lineHeight: 20,
  },
  suggestionsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
  },
  suggestionText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
  modalCloseButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalCloseText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    width: '100%',
    padding: 40,
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    ...HeadingStyle,
    color: '#342846',
    marginBottom: 40,
    textAlign: 'center',
  },
  deerFaceImage: {
    width: width * 0.5,
    height: width * 0.5,
    marginBottom: 40,
  },
  loadingList: {
    width: '100%',
    alignItems: 'center', // Center the list items
  },
  loadingItem: {
    marginBottom: 16,
    alignItems: 'center', // Center each item
  },
  loadingItemText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    textAlign: 'center', // Center the text
  },
  journeyLoadingContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  journeyLoadingTitle: {
    ...HeadingStyle,
    color: '#342846',
    marginBottom: 40,
    textAlign: 'center',
  },
  journeyDeerImage: {
    width: width * 0.5,
    height: width * 0.5,
    marginBottom: 40,
  },
  journeyLoadingList: {
    width: '100%',
    alignItems: 'center',
  },
  journeyLoadingItem: {
    marginBottom: 12,
  },
  journeyLoadingItemText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 18,
    textAlign: 'center',
  },
  destinyContent: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 100,
    minHeight: '100%',
  },
  destinyTopSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 0,
  },
  userIconContainer: {
    marginBottom: 16,
  },
  userIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#342846',
  },
  userIconText: {
    ...HeadingStyle,
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  destinyNameText: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 28,
    marginBottom: 8,
    textAlign: 'center',
  },
  destinyTitleText: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 20,
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 24,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#342846',
  },
  dividerText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    marginHorizontal: 12,
    textTransform: 'lowercase',
  },
  giftsContainer: {
    marginBottom: 32,
    gap: 16,
  },
  giftCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#342846',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  giftCardImage: {
    borderRadius: 12,
  },
  giftCardHeading: {
    ...HeadingStyle,
    color: '#ffffff',
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  giftCardBody: {
    ...BodyStyle,
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  ikigaiMapSection: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 20,
  },
  ikigaiMapTitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  ikigaiPurposeText: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  destinyContinueButton: {
    backgroundColor: '#bfacca',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    minWidth: 200,
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    marginHorizontal: 20,
    marginBottom: 40,
    zIndex: 1000,
  },
  destinyContinueButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  ikigaiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 20, // Add spacing from gifts list
    position: 'relative',
  },
  ikigaiAuraContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  ikigaiAuraLayer1: {
    position: 'absolute',
    width: width * 0.65, // Smaller size to not cover gifts list
    height: width * 0.65,
    borderRadius: (width * 0.65) / 2,
    overflow: 'hidden', // Ensure gradient respects border radius
  },
  ikigaiAuraLayer2: {
    position: 'absolute',
    width: width * 0.58,
    height: width * 0.58,
    borderRadius: (width * 0.58) / 2,
    overflow: 'hidden', // Ensure gradient respects border radius
  },
  ikigaiAuraLayer3: {
    position: 'absolute',
    width: width * 0.51,
    height: width * 0.51,
    borderRadius: (width * 0.51) / 2,
    overflow: 'hidden', // Ensure gradient respects border radius
  },
  ikigaiAuraLayer4: {
    position: 'absolute',
    width: width * 0.44,
    height: width * 0.44,
    borderRadius: (width * 0.44) / 2,
    overflow: 'hidden', // Ensure gradient respects border radius
  },
  ikigaiImageWrapper: {
    width: width * 0.8,
    height: width * 0.8,
    position: 'relative',
    zIndex: 1,
  },
  ikigaiImage: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  ikigaiCircleText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 20, // Minimum 20px padding (was 8)
  },
  ikigaiCircleTextTop: {
    position: 'absolute',
    top: width * 0.8 * 0.05, // 5% of image height
    left: width * 0.8 * 0.35, // Center horizontally (50% - 15% for half width)
    width: width * 0.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ikigaiCircleTextRight: {
    position: 'absolute',
    top: width * 0.8 * 0.35, // Center vertically
    right: width * 0.8 * 0.05, // 5% from right
    width: width * 0.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ikigaiCircleTextBottom: {
    position: 'absolute',
    bottom: width * 0.8 * 0.05, // 5% from bottom
    left: width * 0.8 * 0.35, // Center horizontally
    width: width * 0.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ikigaiCircleTextLeft: {
    position: 'absolute',
    top: width * 0.8 * 0.35, // Center vertically
    left: width * 0.8 * 0.05, // 5% from left
    width: width * 0.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ikigaiCenterCircleWrapper: {
    width: width * 0.6,
    height: width * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  ikigaiCenterBackground: {
    backgroundColor: '#baccd7', // Match the pulsating circle background color
    borderRadius: (width * 0.6) / 2, // Make it a perfect circle
    width: width * 0.6,
    height: width * 0.6,
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ikigaiCenterSummary: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: 'bold',
    paddingHorizontal: 20, // Minimum 20px padding (was 10)
  },
  pathsContent: {
    paddingHorizontal: 40,
    paddingTop: 0,
    paddingBottom: 20,
    minHeight: '100%',
    alignItems: 'center',
  },
  pathsBodyText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    textAlign: 'center',
    marginTop: -32,
    marginBottom: 24,
    paddingHorizontal: 0, // Padding handled by pathsContent parent (40px)
    lineHeight: 18,
  },
  pathCardContainer: {
    position: 'relative',
    marginBottom: 32,
    width: '100%',
    alignSelf: 'center',
  },
  pathCardGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 12,
    opacity: 0.7,
  },
  pathCardGlowOverlay: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 12,
    opacity: 0.5,
  },
  pathCard: {
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    width: '100%',
    position: 'relative',
    zIndex: 1,
    overflow: 'hidden',
  },
  pathCardImage: {
    borderRadius: 8,
    resizeMode: 'stretch',
  },
  pathCardContent: {
    padding: 16,
  },
  loadingText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    textAlign: 'center',
  },
  pathTitle: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontSize: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  pathDescription: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  exploreButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 13, // Increased by 5px from 8 (8 + 5 = 13)
    paddingHorizontal: 40,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 200,
  },
  exploreButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    fontSize: 15,
  },
  customPathWrapper: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  customPathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customPathIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginLeft: -8,
  },
  customPathTextContainer: {
    alignItems: 'flex-start',
  },
  customPathHeading: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 16,
    textDecorationLine: 'underline',
    marginBottom: 4,
  },
  customPathBody: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
  },
  dreamGoalButtonWrapper: {
    marginTop: 20,
    marginBottom: 20,
  },
  dreamGoalButton: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
    minWidth: 200,
    minHeight: 50,
  },
  dreamGoalButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 18,
    fontWeight: '400',
  },
  pathLoadingContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
    position: 'relative',
    zIndex: 1,
  },
  pathLoadingTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 24,
    marginBottom: 40,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  deerButterflyImage: {
    width: width * 0.6,
    height: width * 0.6,
  },
  pathExplorationContent: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 20,
    minHeight: '100%',
  },
  pathNameTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 32,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  futureTrajectoryTitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.7,
  },
  whyFitsYouCardContainer: {
    position: 'relative',
    marginBottom: 32,
    width: '100%',
    alignSelf: 'center',
  },
  whyFitsYouCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#342846',
    padding: 24,
    minHeight: 200,
    position: 'relative',
    zIndex: 1,
    overflow: 'hidden',
  },
  whyFitsYouCardImage: {
    borderRadius: 16,
    resizeMode: 'cover',
  },
  whyFitsYouHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFFFFF',
  },
  whyFitsYouLabel: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  whyFitsYouName: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  whyFitsYouBio: {
    gap: 16,
  },
  whyFitsYouBioText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
  },
  goalsSectionTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  goalCard: {
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    width: '100%',
    alignSelf: 'center',
    overflow: 'visible', // Changed to visible to allow shadow to show
    // Subtle brown shadow
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8, // For Android
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 20,
    flex: 1,
    textAlign: 'left',
    marginRight: 12,
  },
  goalDescriptorBadge: {
    backgroundColor: 'rgba(52, 40, 70, 0.2)', // 20% opacity purple
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
  },
  goalDescriptorText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalTimeFrameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTimeFrameIcon: {
    marginRight: 6,
  },
  goalTimeFrame: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'left',
  },
  goalDescription: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
    marginBottom: 20,
  },
  startJourneyButton: {
    backgroundColor: '#342846',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8,
  },
  startJourneyButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
    marginRight: 8,
  },
  startJourneyArrow: {
    marginLeft: 0,
  },
  paywallContent: {
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 200,
    minHeight: '100%',
    alignItems: 'center',
  },
  paywallTitle: {
    ...HeadingStyle,
    color: '#342846',
    marginTop: 0,
    marginBottom: 12,
    textAlign: 'center',
  },
  paywallSubtitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 18,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  activeGoalContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    width: '100%',
    alignItems: 'center',
  },
  activeGoalSubheading: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    marginTop: 0,
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  goalNameText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 0,
    textAlign: 'center',
    fontWeight: '600',
  },
  goalTitleText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  goalStepsContainer: {
    width: '100%',
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'flex-start',
  },
  levelsContainer: {
    width: '100%',
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'flex-start',
    position: 'relative',
  },
  continuousConnector: {
    position: 'absolute',
    left: 23,
    top: 24,
    width: 2,
    bottom: 0,
    backgroundColor: '#342846',
    zIndex: 0,
  },
  levelItem: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 24,
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 2,
  },
  levelBadgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    position: 'relative',
    zIndex: 2,
    width: 48,
    height: 48,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#342846',
    zIndex: 3,
    position: 'relative',
  },
  levelBadgeHighlight: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6D5F5',
    position: 'absolute',
    zIndex: 1,
    opacity: 0.5,
    top: -8,
    left: -8,
  },
  levelBadgeNumber: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    zIndex: 4,
  },
  levelContent: {
    flex: 1,
    paddingTop: 4,
  },
  levelHeading: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 4,
  },
  levelSubheading: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  finalStarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 40,
    marginLeft: 0,
    marginRight: 16,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 20, // Minimum 20px padding (was 0)
    paddingRight: 20, // Minimum 20px padding (was 0)
    position: 'relative',
    zIndex: 2,
    width: 48,
    height: 24,
    alignSelf: 'flex-start',
  },
  finalStarWrapper: {
    transform: [{ translateY: 5 }],
  },
  finalStarEmoji: {
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 24,
    margin: 0,
    padding: 0,
  },
  goalLabelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginLeft: 0,
  },
  goalStarEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  goalLabelText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 18,
    paddingTop: 20,
  },
  goalStepWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: 8,
  },
  goalStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    minHeight: 32,
  },
  goalStepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    minWidth: 60,
    height: 32,
  },
  checkmarkContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedCheckmark: {
    fontSize: 24,
    color: '#342846', // Blue color
    fontWeight: 'bold',
  },
  checkmarkPlaceholder: {
    width: 32,
    height: 32,
  },
  goalStepNumber: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 20,
    textAlign: 'right',
  },
  goalStepText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    flex: 1,
  },
  startContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginLeft: 0,
  },
  startBulbContainer: {
    marginRight: 8,
  },
  startBulb: {
    fontSize: 18,
  },
  startText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    paddingBottom: 20,
  },
  whatYouGetTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 20,
    marginTop: 40,
    marginBottom: 24,
    textAlign: 'center',
  },
  cardsContainer: {
    width: width - 50,
    height: 280,
    marginBottom: 20,
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'relative',
  },
  cardsWrapper: {
    flexDirection: 'row',
    height: '100%',
  },
  benefitCard: {
    width: width - 50,
    paddingHorizontal: 35,
    paddingTop: 28,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  benefitCardImage: {
    borderRadius: 8,
    resizeMode: 'cover',
  },
  benefitCardHeading: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontSize: 17,
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitCardBody: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  cardIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  cardIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
  },
  cardIndicatorActive: {
    backgroundColor: '#baccd7',
    borderColor: '#342846',
  },
  paywallContinueButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    marginHorizontal: 20,
    marginBottom: 40,
    zIndex: 1000,
  },
  paywallContinueButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  customPathFormContent: {
    paddingHorizontal: 40,
    paddingTop: 0,
    paddingBottom: 100,
  },
  customPathHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 20,
    position: 'relative',
  },
  customPathHeaderTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  customPathBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 40,
    top: '50%',
    marginTop: -20,
  },
  customPathHelperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#342846',
    position: 'absolute',
    right: 40,
    top: '50%',
    marginTop: -20,
  },
  customPathAppHeadingCard: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 32,
    paddingHorizontal: 20,
    paddingVertical: 16,
    // Purple 3D shadow
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12, // For Android
  },
  customPathAppHeading: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  purpleBackgroundImage: {
    borderRadius: 8,
    resizeMode: 'cover',
  },
  fieldError: {
    borderColor: '#FF0000',
    borderWidth: 1,
  },
  fieldErrorText: {
    ...BodyStyle,
    color: '#FF0000',
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  radioButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#342846',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#342846',
  },
  radioButtonLabel: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    flex: 1,
  },
  assistanceTextContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 40,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: '#342846',
  },
  customPathFormSubtitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    textAlign: 'center',
    marginTop: -55,
    marginBottom: 32,
    opacity: 0.8,
  },
  customPathFieldContainer: {
    marginBottom: 32,
    position: 'relative',
  },
  customPathLabelWithHelper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  customPathHelperIcon: {
    padding: 4,
    marginLeft: 8,
  },
  customPathFieldLabel: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 16,
    textAlign: 'center',
  },
  customPathFieldHelper: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    marginBottom: 12,
    opacity: 0.7,
    lineHeight: 16,
  },
  customPathDropdownWrapper: {
    position: 'relative',
    zIndex: 10,
    marginTop: 8,
  },
  customPathDropdownButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
    flexWrap: 'wrap',
    // Purple 3D shadow
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12, // For Android
  },
  customPathDropdownText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    flex: 1,
    flexShrink: 1,
  },
  customPathDropdownPlaceholder: {
    color: '#999',
    opacity: 0.7,
  },
  customPathDropdownArrow: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    marginLeft: 8,
  },
  customPathDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 1000,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  customGoalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#342846',
    padding: 20,
    marginBottom: 20,
  },
  customGoalCardTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'left',
  },
  coreObjectiveTitle: {
    textAlign: 'center',
  },
  centeredCardTitle: {
    textAlign: 'center',
  },
  customGoalFieldContainer: {
    marginBottom: 24,
  },
  customGoalFieldLabel: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'left',
  },
  customGoalFieldHelper: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    marginBottom: 12,
    opacity: 0.7,
    lineHeight: 16,
  },
  milestoneCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  milestoneTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  adviceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  adviceModal: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#342846',
  },
  adviceText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    lineHeight: 20,
  },
  addMilestoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#342846',
    marginTop: 8,
  },
  addMilestoneButtonText: {
    ...BodyStyle,
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  establishGoalButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  establishGoalButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    fontSize: 18,
  },
  obstaclePageContent: {
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 100,
    alignItems: 'center',
  },
  obstaclePageTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  obstaclePageSubtext: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 22,
    opacity: 0.8,
  },
  obstacleFieldContainer: {
    width: '100%',
    marginBottom: 32,
  },
  obstacleTextField: {
    minHeight: 150,
    paddingTop: 16,
    paddingBottom: 16,
  },
  obstacleContinueButton: {
    alignItems: 'center',
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignSelf: 'center',
    minWidth: 200,
    marginTop: 20,
  },
  obstacleContinueButtonDisabled: {
    backgroundColor: '#D0D0D0',
    opacity: 0.6,
  },
  obstacleContinueButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  goalQuote: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  milestoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  milestoneNumberIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  milestoneNumberText: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    fontWeight: 'bold',
  },
  milestoneTextFieldWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    minHeight: 90,
  },
  milestoneTextField: {
    width: '100%',
  },
  question: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    flex: 1,
    textAlign: 'left',
  },
  bodyText: {
    ...BodyStyle,
    color: '#342846',
    marginBottom: 20,
    fontSize: 12,
    width: '100%',
    textAlign: 'left',
    opacity: 0.7,
    lineHeight: 16,
  },
  answerField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    overflow: 'visible',
    marginBottom: 32,
    minHeight: 130,
    width: '100%',
    alignSelf: 'flex-start',
    marginTop: 16,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  answerInput: {
    ...BodyStyle,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: '#342846',
    fontSize: 14,
    minHeight: 130,
    textAlignVertical: 'top',
    lineHeight: 19.2,
  },
  lightBulbEmoji: {
    fontSize: 24,
  },
  assistanceModal: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#342846',
    marginTop: 8,
  },
  closeAssistanceButton: {
    alignSelf: 'flex-end',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeAssistanceButtonText: {
    fontSize: 24,
    color: '#342846',
    fontWeight: 'bold',
  },
  lifeContextContent: {
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 100,
    minHeight: '100%',
  },
  lifeContextHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 0,
  },
  lifeContextTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8,
  },
  lifeContextSubtitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  questionCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    // 3D shadow effect
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  questionCardImage: {
    borderRadius: 16,
  },
  questionCardTall: {
    minHeight: 500,
  },
  questionCardBackButton: {
    position: 'absolute',
    top: 18,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionCardTitle: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 53,
    paddingHorizontal: 8,
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  optionsScrollWrapper: {
    position: 'relative',
    maxHeight: 400,
    marginBottom: 16,
  },
  optionsScrollContainer: {
    maxHeight: 400,
    paddingRight: 8,
  },
  optionButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(52, 40, 70, 0.6)',
    borderColor: '#342846',
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionButtonText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    textAlign: 'center',
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  optionButtonTextDisabled: {
    opacity: 0.5,
  },
  questionProgress: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  questionProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
  },
  questionProgressDotActive: {
    backgroundColor: '#342846',
    width: 24,
  },
  questionProgressDotCompleted: {
    backgroundColor: '#342846',
  },
  lifeContextNextButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'center',
    minWidth: 150,
    opacity: 1,
  },
  lifeContextNextButtonDisabled: {
    backgroundColor: '#D0D0D0',
    opacity: 0.5,
  },
  lifeContextNextButtonText: {
    ...ButtonHeadingStyle,
    color: '#342846',
    fontSize: 18,
    fontWeight: '600',
  },
  lifeContextContinueButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    minWidth: 200,
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    marginHorizontal: 20,
    marginBottom: 40,
    zIndex: 1000,
  },
  lifeContextContinueButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

