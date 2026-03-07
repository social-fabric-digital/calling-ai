import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Keyboard, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { fetchTimezoneByCoordinates } from '@/utils/astrologyApi';
import { AboutYouFormProps, CityData } from './types';
import { styles } from './styles';

type FallbackCity = {
  name: string;
  nameRu: string;
  country: string;
  countryRu: string;
  lat: number;
  lon: number;
};

const FALLBACK_CITIES: FallbackCity[] = [
  { name: 'New York', nameRu: 'Нью-Йорк', country: 'United States', countryRu: 'США', lat: 40.7128, lon: -74.006 },
  { name: 'Los Angeles', nameRu: 'Лос-Анджелес', country: 'United States', countryRu: 'США', lat: 34.0522, lon: -118.2437 },
  { name: 'London', nameRu: 'Лондон', country: 'United Kingdom', countryRu: 'Великобритания', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris', nameRu: 'Париж', country: 'France', countryRu: 'Франция', lat: 48.8566, lon: 2.3522 },
  { name: 'Berlin', nameRu: 'Берлин', country: 'Germany', countryRu: 'Германия', lat: 52.52, lon: 13.405 },
  { name: 'Madrid', nameRu: 'Мадрид', country: 'Spain', countryRu: 'Испания', lat: 40.4168, lon: -3.7038 },
  { name: 'Rome', nameRu: 'Рим', country: 'Italy', countryRu: 'Италия', lat: 41.9028, lon: 12.4964 },
  { name: 'Moscow', nameRu: 'Москва', country: 'Russia', countryRu: 'Россия', lat: 55.7558, lon: 37.6173 },
  { name: 'Saint Petersburg', nameRu: 'Санкт-Петербург', country: 'Russia', countryRu: 'Россия', lat: 59.9311, lon: 30.3609 },
  { name: 'Kyiv', nameRu: 'Киев', country: 'Ukraine', countryRu: 'Украина', lat: 50.4501, lon: 30.5234 },
  { name: 'Sevastopol', nameRu: 'Севастополь', country: 'Crimea', countryRu: 'Крым', lat: 44.6166, lon: 33.5254 },
  { name: 'Kerch', nameRu: 'Керчь', country: 'Crimea', countryRu: 'Крым', lat: 45.3562, lon: 36.4674 },
  { name: 'Simferopol', nameRu: 'Симферополь', country: 'Crimea', countryRu: 'Крым', lat: 44.9521, lon: 34.1024 },
  { name: 'Yalta', nameRu: 'Ялта', country: 'Crimea', countryRu: 'Крым', lat: 44.4952, lon: 34.1663 },
  { name: 'Warsaw', nameRu: 'Варшава', country: 'Poland', countryRu: 'Польша', lat: 52.2297, lon: 21.0122 },
  { name: 'Istanbul', nameRu: 'Стамбул', country: 'Turkey', countryRu: 'Турция', lat: 41.0082, lon: 28.9784 },
  { name: 'Dubai', nameRu: 'Дубай', country: 'United Arab Emirates', countryRu: 'ОАЭ', lat: 25.2048, lon: 55.2708 },
  { name: 'Delhi', nameRu: 'Дели', country: 'India', countryRu: 'Индия', lat: 28.6139, lon: 77.209 },
  { name: 'Tokyo', nameRu: 'Токио', country: 'Japan', countryRu: 'Япония', lat: 35.6762, lon: 139.6503 },
  { name: 'Seoul', nameRu: 'Сеул', country: 'South Korea', countryRu: 'Южная Корея', lat: 37.5665, lon: 126.978 },
  { name: 'Beijing', nameRu: 'Пекин', country: 'China', countryRu: 'Китай', lat: 39.9042, lon: 116.4074 },
  { name: 'Sydney', nameRu: 'Сидней', country: 'Australia', countryRu: 'Австралия', lat: -33.8688, lon: 151.2093 },
  { name: 'Toronto', nameRu: 'Торонто', country: 'Canada', countryRu: 'Канада', lat: 43.6532, lon: -79.3832 },
  { name: 'Mexico City', nameRu: 'Мехико', country: 'Mexico', countryRu: 'Мексика', lat: 19.4326, lon: -99.1332 },
];

const CRIMEA_CITY_NAMES = new Set([
  'sevastopol', 'севастополь',
  'kerch', 'керчь',
  'simferopol', 'симферополь',
  'yalta', 'ялта',
  'feodosiya', 'feodosiya', 'feodosiia', 'феодосия',
  'evpatoria', 'yevpatoria', 'евпатория',
  'alushta', 'алушта',
  'sudak', 'судак',
  'dzhankoi', 'джанкой',
  'armyansk', 'армянск',
  'bakhchysarai', 'бахчисарай',
  'saki', 'саки',
  'krasnoperekopsk', 'красноперекопск',
]);

const isCrimeaCity = (name: string): boolean => {
  return CRIMEA_CITY_NAMES.has((name || '').trim().toLowerCase());
};

const isCrimeaAddress = (primaryName: string, address: any): boolean => {
  if (isCrimeaCity(primaryName)) return true;
  const regionChunks = [
    address?.state,
    address?.region,
    address?.county,
    address?.state_district,
    address?.display_name,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return regionChunks.some((chunk) => chunk.includes('crimea') || chunk.includes('крым'));
};

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
  setBirthLatitude,
  setBirthLongitude,
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
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const scrollViewRef = useRef<ScrollView>(null);
  const cityFieldRef = useRef<View>(null);
  const [cityFieldY, setCityFieldY] = useState(0);
  const [cityQuery, setCityQuery] = useState('');
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const latestCitySearchIdRef = useRef(0);
  const [showDateOfBirthTooltip, setShowDateOfBirthTooltip] = useState(false);
  const [showBirthTimeTooltip, setShowBirthTimeTooltip] = useState(false);
  const [showCityOfBirthTooltip, setShowCityOfBirthTooltip] = useState(false);

  useEffect(() => {
    setCityQuery(birthCity);
  }, [birthCity]);

  // Handle name change and save to AsyncStorage immediately
  const handleNameChange = async (text: string) => {
    setName(text);
    // Save to AsyncStorage immediately so it's available for pledge step
    if (text.trim()) {
      try {
        await AsyncStorage.setItem('userName', text.trim());
      } catch (error) {
        // Error saving name - continue anyway
      }
    }
  };

  const handleCityChange = (text: string) => {
    // Always keep raw text and clear stale coordinates until a city is selected.
    setCityQuery(text);
    setBirthCity(text);
    setBirthLatitude('');
    setBirthLongitude('');
    AsyncStorage.multiRemove(['birthLatitude', 'birthLongitude', 'birthTimezone']).catch(() => {});
    if (!text.trim()) {
      setCitySuggestions([]);
      setShowCityDropdown(false);
    }
  };

  const selectCity = async (city: CityData) => {
    const selectedLabel = city.displayName || `${city.name}, ${city.country}`;
    setCityQuery(selectedLabel);
    setBirthCity(selectedLabel);
    // Close suggestions immediately on selection for smoother UX.
    setShowCityDropdown(false);
    setCitySuggestions([]);
    const latString =
      typeof city.lat === 'number' && Number.isFinite(city.lat) ? String(city.lat) : '';
    const lonString =
      typeof city.lon === 'number' && Number.isFinite(city.lon) ? String(city.lon) : '';
    if (typeof city.lat === 'number' && Number.isFinite(city.lat)) {
      setBirthLatitude(latString);
    }
    if (typeof city.lon === 'number' && Number.isFinite(city.lon)) {
      setBirthLongitude(lonString);
    }
    const lat = Number.parseFloat(latString);
    const lon = Number.parseFloat(lonString);
    const birthTimezone =
      Number.isFinite(lat) && Number.isFinite(lon)
        ? await fetchTimezoneByCoordinates(lat, lon)
        : null;

    const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

    AsyncStorage.multiSet([
      ['birthCity', selectedLabel],
      ['birthLatitude', latString],
      ['birthLongitude', lonString],
      ['birthTimezone', birthTimezone || ''],
      ['currentTimezone', currentTimezone],
    ]).catch((error) => {
      console.error('Error saving selected city coordinates:', error);
    });
  };

  const handleCityFieldLayout = (event: any) => {
    const { y } = event.nativeEvent.layout;
    setCityFieldY(y);
  };

  const handleCityFocus = () => {
    if (cityQuery.trim().length > 0) {
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

  const getFallbackCities = (query: string): CityData[] => {
    const q = query.trim().toLowerCase();
    const startsWithMatches = FALLBACK_CITIES.filter((city) => {
      const cityName = isRussian ? city.nameRu : city.name;
      const countryName = isRussian ? city.countryRu : city.country;
      return cityName.toLowerCase().startsWith(q) || countryName.toLowerCase().startsWith(q);
    });
    const includesMatches = FALLBACK_CITIES.filter((city) => {
      const cityName = isRussian ? city.nameRu : city.name;
      const countryName = isRussian ? city.countryRu : city.country;
      return cityName.toLowerCase().includes(q) || countryName.toLowerCase().includes(q);
    });
    const combined = [...startsWithMatches, ...includesMatches];
    const unique = combined.filter(
      (city, index, arr) => arr.findIndex((candidate) => candidate.name === city.name) === index
    );
    const padded = unique.length >= 4 ? unique : [...unique, ...FALLBACK_CITIES].slice(0, 4);

    return padded.slice(0, 10).map((city) => {
      const cityName = isRussian ? city.nameRu : city.name;
      const countryName = isRussian ? city.countryRu : city.country;
      const primaryName = cityName;
      const displayCountry = isCrimeaCity(primaryName)
        ? (isRussian ? 'Крым' : 'Crimea')
        : countryName;
      return {
        id: `fallback-${city.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: cityName,
        nameRu: city.nameRu,
        country: displayCountry,
        displayName: `${cityName}, ${displayCountry}`,
        lat: city.lat,
        lon: city.lon,
      };
    });
  };

  useEffect(() => {
    const query = cityQuery.trim();
    if (query.length < 1) {
      setCitySuggestions([]);
      setShowCityDropdown(false);
      setIsSearchingCities(false);
      return;
    }

    const searchId = latestCitySearchIdRef.current + 1;
    latestCitySearchIdRef.current = searchId;

    const timeoutId = setTimeout(async () => {
      setIsSearchingCities(true);
      try {
        const lang = (i18n.language || 'en').split('-')[0].toLowerCase();
        const acceptLang = lang !== 'en' ? `${lang},en` : 'en';
        const url =
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}` +
          `&format=json&limit=20&addressdetails=1` +
          `&accept-language=${encodeURIComponent(acceptLang)}`;

        let rawResults: any[] = [];
        let lastStatus: number | null = null;

        for (let attempt = 0; attempt < 2; attempt += 1) {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'CallingAI App',
              'Accept-Language': acceptLang,
            },
          });

          if (response.ok) {
            rawResults = await response.json();
            break;
          }

          lastStatus = response.status;
          const shouldRetry = response.status === 429 || response.status >= 500;
          if (!shouldRetry || attempt === 1) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        }

        if (!rawResults.length && lastStatus) {
          throw new Error(`Nominatim search failed with status ${lastStatus}`);
        }

        if (latestCitySearchIdRef.current !== searchId) {
          return;
        }

        const PLACE_TYPES = new Set([
          'city', 'town', 'village', 'hamlet', 'suburb', 'municipality',
          'borough', 'quarter', 'neighbourhood', 'administrative',
        ]);

        const seen = new Set<string>();
        const cities: CityData[] = (Array.isArray(rawResults) ? rawResults : [])
          .filter((item: any) => {
            const itemType = String(item?.type || '').toLowerCase();
            const itemClass = String(item?.class || '').toLowerCase();
            return itemClass === 'place' || PLACE_TYPES.has(itemType);
          })
          .map((item: any) => {
            const addr = item?.address || {};
            const primaryName =
              addr.city || addr.town || addr.village || addr.hamlet ||
              (item?.name as string) ||
              String(item?.display_name || '').split(',')[0] ||
              '';
            const country = addr.country || '';
            const useCrimeaLabel = isCrimeaAddress(primaryName, {
              ...addr,
              display_name: item?.display_name,
            });
            const displayCountry = useCrimeaLabel
              ? (isRussian ? 'Крым' : 'Crimea')
              : country;
            return {
              id: String(item?.place_id || `${primaryName}-${country}`),
              name: primaryName,
              country: displayCountry,
              displayName: displayCountry ? `${primaryName}, ${displayCountry}` : primaryName,
              lat: Number.parseFloat(String(item?.lat || '')),
              lon: Number.parseFloat(String(item?.lon || '')),
            };
          })
          .filter((item) => {
            if (!item.name || !Number.isFinite(item.lat) || !Number.isFinite(item.lon)) return false;
            const key = `${item.name.toLowerCase()}|${item.country.toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

        setCitySuggestions(cities);
        setShowCityDropdown(cities.length > 0);
      } catch (error) {
        console.warn('City search temporarily unavailable; using fallback suggestions.', error);
        if (latestCitySearchIdRef.current === searchId) {
          const fallbackCities = getFallbackCities(query);
          setCitySuggestions(fallbackCities);
          setShowCityDropdown(fallbackCities.length > 0);
        }
      } finally {
        if (latestCitySearchIdRef.current === searchId) {
          setIsSearchingCities(false);
        }
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [cityQuery, i18n.language, setCitySuggestions, setShowCityDropdown]);

  return (
    <>
      <View style={{ flex: 1 }}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.formContainer}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          scrollEventThrottle={16}
          onScrollBeginDrag={Keyboard.dismiss}
        >
      <Text style={[styles.aboutYouTitle, { color: '#FFFFFF' }]}>{t('onboarding.aboutYouTitle')}</Text>
      <Text style={[styles.formBodyText, { color: '#FFFFFF' }]}>
        {t('onboarding.helpPersonalize')}
      </Text>

      {/* Name Field */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: '#FFFFFF' }]}>{t('onboarding.myNameIs')}</Text>
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
          <Text style={[styles.fieldLabel, { color: '#FFFFFF' }]}>{t('onboarding.dateOfBirth')}</Text>
          <Pressable
            onPress={() => setShowDateOfBirthTooltip(true)}
            style={styles.helperIcon}
          >
            <MaterialIcons name="help-outline" size={20} color="#FFFFFF" />
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
            <Text style={[styles.fieldLabel, { color: '#FFFFFF' }]}>{t('onboarding.birthTime')}</Text>
            <Pressable
              onPress={() => setShowBirthTimeTooltip(true)}
              style={styles.helperIcon}
            >
              <MaterialIcons name="help-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
          <View style={[
            styles.timeRow,
            isRussian && styles.timeRowRussian
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
          {!isRussian && (
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
            <Text style={[styles.checkboxLabel, { color: '#FFFFFF' }]}>{t('onboarding.dontKnowBirthTime')}</Text>
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
          <Text style={[styles.fieldLabel, { color: '#FFFFFF' }]}>{t('onboarding.cityOfBirth')}</Text>
          <Pressable
            onPress={() => setShowCityOfBirthTooltip(true)}
            style={styles.helperIcon}
          >
            <MaterialIcons name="help-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.cityFieldWrapper}>
          <View
            style={styles.textFieldWrapper}
          >
            <TextInput
              style={styles.textField}
              value={cityQuery}
              onChangeText={handleCityChange}
              placeholder=""
              placeholderTextColor="#999"
              onFocus={handleCityFocus}
            />
          </View>
          {isSearchingCities && (
            <View style={styles.citySearchingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={[styles.citySearchingText, { color: '#FFFFFF' }]}>
                {isRussian ? 'Поиск городов...' : 'Searching cities...'}
              </Text>
            </View>
          )}
          {showCityDropdown && citySuggestions.length > 0 && (
            <View style={styles.cityDropdown}>
              <ScrollView 
                style={styles.cityDropdownScrollView}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {citySuggestions.map((city, index) => (
                  <Pressable
                    key={city.id || `${city.name}-${index}`}
                    style={styles.cityDropdownItem}
                    onPress={() => selectCity(city)}
                  >
                    <View style={styles.cityDropdownContent}>
                      <Text style={styles.cityDropdownText}>
                        {city.displayName || (isRussian && city.nameRu ? city.nameRu : city.name)}
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
          source={require('../../assets/images/deer.cake.png')}
          style={styles.cakeImage}
          resizeMode="contain"
        />
      </View>
        </ScrollView>
      </View>

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
            {isRussian
              ? 'Это помогает нам точнее понять вашу астрологическую карту.'
              : 'This helps us understand your astrological blueprint.'}
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
            {isRussian
              ? 'Время рождения помогает точнее определить ваши ключевые жизненные периоды.'
              : 'Birth time gives us timing and insights for your biggest moves.'}
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
            {isRussian
              ? 'Это завершает вашу натальную карту. Нужен только город, без точного адреса.'
              : 'This completes your birth chart. We only need the city, no specific address.'}
          </Text>
        </View>
      </Pressable>
    </Modal>
  </>
  );
}

export default AboutYouForm;
