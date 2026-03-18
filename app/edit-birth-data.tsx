import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { fetchTimezoneByCoordinates } from '@/utils/astrologyApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CitySuggestion = {
  id: string;
  name: string;
  country: string;
  displayName: string;
  lat: number;
  lon: number;
};

type SelectedCityMeta = {
  label: string;
  lat: string;
  lon: string;
  timezone: string;
};

const FALLBACK_CITIES: CitySuggestion[] = [
  { id: 'fallback-new-york', name: 'New York', country: 'United States', displayName: 'New York, United States', lat: 40.7128, lon: -74.006 },
  { id: 'fallback-los-angeles', name: 'Los Angeles', country: 'United States', displayName: 'Los Angeles, United States', lat: 34.0522, lon: -118.2437 },
  { id: 'fallback-london', name: 'London', country: 'United Kingdom', displayName: 'London, United Kingdom', lat: 51.5074, lon: -0.1278 },
  { id: 'fallback-paris', name: 'Paris', country: 'France', displayName: 'Paris, France', lat: 48.8566, lon: 2.3522 },
  { id: 'fallback-berlin', name: 'Berlin', country: 'Germany', displayName: 'Berlin, Germany', lat: 52.52, lon: 13.405 },
  { id: 'fallback-madrid', name: 'Madrid', country: 'Spain', displayName: 'Madrid, Spain', lat: 40.4168, lon: -3.7038 },
  { id: 'fallback-rome', name: 'Rome', country: 'Italy', displayName: 'Rome, Italy', lat: 41.9028, lon: 12.4964 },
  { id: 'fallback-moscow', name: 'Moscow', country: 'Russia', displayName: 'Moscow, Russia', lat: 55.7558, lon: 37.6173 },
  { id: 'fallback-seoul', name: 'Seoul', country: 'South Korea', displayName: 'Seoul, South Korea', lat: 37.5665, lon: 126.978 },
  { id: 'fallback-tokyo', name: 'Tokyo', country: 'Japan', displayName: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
];

export default function EditBirthDataScreen() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);

  const [birthMonth, setBirthMonth] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthHour, setBirthHour] = useState('');
  const [birthMinute, setBirthMinute] = useState('');
  const [birthPeriod, setBirthPeriod] = useState<'AM' | 'PM'>('AM');
  const [birthCity, setBirthCity] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const [selectedCityMeta, setSelectedCityMeta] = useState<SelectedCityMeta | null>(null);
  const latestCitySearchIdRef = useRef(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadBirthData = async () => {
      const [month, date, year, hour, minute, period, city] = await Promise.all([
        AsyncStorage.getItem('birthMonth'),
        AsyncStorage.getItem('birthDate'),
        AsyncStorage.getItem('birthYear'),
        AsyncStorage.getItem('birthHour'),
        AsyncStorage.getItem('birthMinute'),
        AsyncStorage.getItem('birthPeriod'),
        AsyncStorage.getItem('birthCity'),
      ]);
      setBirthMonth(month || '');
      setBirthDate(date || '');
      setBirthYear(year || '');
      setBirthHour(hour || '');
      setBirthMinute(minute || '');
      setBirthPeriod(period === 'PM' ? 'PM' : 'AM');
      setBirthCity(city || '');
      setCityQuery(city || '');
    };
    loadBirthData();
  }, []);

  const getFallbackCities = (query: string): CitySuggestion[] => {
    const normalized = query.trim().toLowerCase();
    const startsWithMatches = FALLBACK_CITIES.filter((city) =>
      city.displayName.toLowerCase().startsWith(normalized)
    );
    const containsMatches = FALLBACK_CITIES.filter((city) =>
      city.displayName.toLowerCase().includes(normalized)
    );
    const combined = [...startsWithMatches, ...containsMatches];
    const unique = combined.filter(
      (city, index, arr) => arr.findIndex((candidate) => candidate.id === city.id) === index
    );
    return (unique.length > 0 ? unique : FALLBACK_CITIES).slice(0, 8);
  };

  const handleCityChange = (text: string) => {
    setCityQuery(text);
    setBirthCity(text);
    setSelectedCityMeta(null);
    if (!text.trim()) {
      setCitySuggestions([]);
      setShowCityDropdown(false);
    }
  };

  const handleCityFocus = () => {
    if (citySuggestions.length > 0) {
      setShowCityDropdown(true);
    }
  };

  const handleSelectCity = async (city: CitySuggestion) => {
    setCityQuery(city.displayName);
    setBirthCity(city.displayName);
    setShowCityDropdown(false);
    setCitySuggestions([]);

    const lat = Number.isFinite(city.lat) ? String(city.lat) : '';
    const lon = Number.isFinite(city.lon) ? String(city.lon) : '';
    const timezone =
      Number.isFinite(city.lat) && Number.isFinite(city.lon)
        ? (await fetchTimezoneByCoordinates(city.lat, city.lon)) || ''
        : '';
    setSelectedCityMeta({
      label: city.displayName,
      lat,
      lon,
      timezone,
    });
  };

  useEffect(() => {
    const query = cityQuery.trim();
    if (!query) {
      setIsSearchingCities(false);
      setCitySuggestions([]);
      setShowCityDropdown(false);
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

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'CallingAI App',
            'Accept-Language': acceptLang,
          },
        });

        if (!response.ok) {
          throw new Error(`Nominatim search failed with status ${response.status}`);
        }

        const rawResults = await response.json();
        if (latestCitySearchIdRef.current !== searchId) return;

        const seen = new Set<string>();
        const cities: CitySuggestion[] = (Array.isArray(rawResults) ? rawResults : [])
          .map((item: any, index: number) => {
            const address = item?.address || {};
            const primaryName =
              address.city ||
              address.town ||
              address.village ||
              address.hamlet ||
              (item?.name as string) ||
              String(item?.display_name || '').split(',')[0] ||
              '';
            const country = address.country || '';
            const displayName = country ? `${primaryName}, ${country}` : primaryName;
            return {
              id: String(item?.place_id || `${primaryName}-${country}-${index}`),
              name: primaryName,
              country,
              displayName,
              lat: Number.parseFloat(String(item?.lat || '')),
              lon: Number.parseFloat(String(item?.lon || '')),
            };
          })
          .filter((city) => {
            if (!city.name || !Number.isFinite(city.lat) || !Number.isFinite(city.lon)) {
              return false;
            }
            const key = `${city.name.toLowerCase()}|${city.country.toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 8);

        setCitySuggestions(cities);
        setShowCityDropdown(cities.length > 0);
      } catch (error) {
        console.warn('City search temporarily unavailable; using fallback suggestions.', error);
        if (latestCitySearchIdRef.current !== searchId) return;
        const fallbackCities = getFallbackCities(query);
        setCitySuggestions(fallbackCities);
        setShowCityDropdown(fallbackCities.length > 0);
      } finally {
        if (latestCitySearchIdRef.current === searchId) {
          setIsSearchingCities(false);
        }
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [cityQuery, i18n.language]);

  const canSave = useMemo(() => {
    return birthMonth.trim().length > 0 && birthDate.trim().length > 0 && birthYear.trim().length > 0 && birthCity.trim().length > 0;
  }, [birthMonth, birthDate, birthYear, birthCity]);

  const handleSave = async () => {
    if (!canSave || loading) return;
    setLoading(true);
    try {
      const nextMonth = birthMonth.trim();
      const nextDate = birthDate.trim();
      const nextYear = birthYear.trim();
      const nextHour = birthHour.trim();
      const nextMinute = birthMinute.trim();
      const nextPeriod = birthPeriod;
      const nextCity = birthCity.trim();

      const oldCity = (await AsyncStorage.getItem('birthCity')) || '';
      const cityChanged = oldCity.trim().toLowerCase() !== nextCity.toLowerCase();
      const selectedMetaMatchesCity =
        selectedCityMeta &&
        selectedCityMeta.label.trim().toLowerCase() === nextCity.trim().toLowerCase();

      await AsyncStorage.multiSet([
        ['birthMonth', nextMonth],
        ['birthDate', nextDate],
        ['birthYear', nextYear],
        ['birthHour', nextHour],
        ['birthMinute', nextMinute],
        ['birthPeriod', nextPeriod],
        ['birthCity', nextCity],
      ]);

      if (cityChanged) {
        if (selectedMetaMatchesCity) {
          await AsyncStorage.multiSet([
            ['birthLatitude', selectedCityMeta.lat],
            ['birthLongitude', selectedCityMeta.lon],
            ['birthTimezone', selectedCityMeta.timezone],
          ]);
        } else {
          await AsyncStorage.multiRemove(['birthLatitude', 'birthLongitude', 'birthTimezone']);
        }
      }

      const birthDateIso =
        nextYear && nextMonth && nextDate
          ? `${nextYear.padStart(4, '0')}-${nextMonth.padStart(2, '0')}-${nextDate.padStart(2, '0')}`
          : null;
      const birthTimeValue =
        nextHour && nextMinute ? `${nextHour.padStart(2, '0')}:${nextMinute.padStart(2, '0')} ${nextPeriod}` : null;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            birth_date: birthDateIso,
            birth_time: birthTimeValue,
            birth_place: nextCity || null,
          })
          .eq('id', user.id);
        if (error) throw error;
      }

      Alert.alert(
        tr('Birth data updated', 'Данные рождения обновлены'),
        tr('Changes are saved in the app and synced.', 'Изменения сохранены в приложении и синхронизированы.')
      );
      router.back();
    } catch (error: any) {
      Alert.alert(
        tr('Update failed', 'Не удалось обновить'),
        error?.message || tr('Please try again.', 'Пожалуйста, попробуйте снова.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaperTextureBackground>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#342846" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tr('Edit birth data', 'Изменить данные рождения')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>{tr('Date of birth', 'Дата рождения')}</Text>
            <View style={styles.row}>
              <TextInput
                value={birthMonth}
                onChangeText={setBirthMonth}
                placeholder={tr('MM', 'ММ')}
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.input, styles.inputSmall]}
              />
              <TextInput
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder={tr('DD', 'ДД')}
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.input, styles.inputSmall]}
              />
              <TextInput
                value={birthYear}
                onChangeText={setBirthYear}
                placeholder={tr('YYYY', 'ГГГГ')}
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={4}
                style={[styles.input, styles.inputYear]}
              />
            </View>

            <Text style={[styles.label, styles.labelTop]}>{tr('Birth time (optional)', 'Время рождения (необязательно)')}</Text>
            <View style={styles.row}>
              <TextInput
                value={birthHour}
                onChangeText={setBirthHour}
                placeholder={tr('HH', 'ЧЧ')}
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.input, styles.inputSmall]}
              />
              <TextInput
                value={birthMinute}
                onChangeText={setBirthMinute}
                placeholder={tr('MM', 'ММ')}
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.input, styles.inputSmall]}
              />
              <View style={styles.periodRow}>
                <TouchableOpacity
                  style={[styles.periodPill, birthPeriod === 'AM' && styles.periodPillActive]}
                  onPress={() => setBirthPeriod('AM')}
                >
                  <Text style={[styles.periodText, birthPeriod === 'AM' && styles.periodTextActive]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.periodPill, birthPeriod === 'PM' && styles.periodPillActive]}
                  onPress={() => setBirthPeriod('PM')}
                >
                  <Text style={[styles.periodText, birthPeriod === 'PM' && styles.periodTextActive]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.label, styles.labelTop]}>{tr('City of birth', 'Город рождения')}</Text>
            <View style={styles.cityFieldWrapper}>
              <TextInput
                value={cityQuery}
                onChangeText={handleCityChange}
                onFocus={handleCityFocus}
                onBlur={() => {
                  setTimeout(() => {
                    setShowCityDropdown(false);
                  }, 120);
                }}
                placeholder={tr('Enter city', 'Введите город')}
                placeholderTextColor="#999"
                style={[styles.input, styles.inputFull]}
              />
              {isSearchingCities ? (
                <View style={styles.citySearchingRow}>
                  <ActivityIndicator size="small" color="#342846" />
                  <Text style={styles.citySearchingText}>
                    {tr('Searching cities...', 'Поиск городов...')}
                  </Text>
                </View>
              ) : null}
              {showCityDropdown && citySuggestions.length > 0 ? (
                <View style={styles.cityDropdown}>
                  <ScrollView
                    style={styles.cityDropdownScrollView}
                    keyboardShouldPersistTaps="always"
                    nestedScrollEnabled
                  >
                    {citySuggestions.map((city) => (
                      <Pressable
                        key={city.id}
                        style={styles.cityDropdownItem}
                        onPress={() => {
                          void handleSelectCity(city);
                        }}
                      >
                        <Text style={styles.cityDropdownText}>{city.displayName}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[styles.saveButton, (!canSave || loading) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {loading ? tr('Saving...', 'Сохранение...') : tr('Save changes', 'Сохранить изменения')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    opacity: 1,
    elevation: 11,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#342846',
  },
  content: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    ...HeadingStyle,
    fontSize: 20,
    color: '#342846',
    marginBottom: 15,
    textAlign: 'left',
    textTransform: 'none',
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
  },
  labelTop: {
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  input: {
    ...BodyStyle,
    fontSize: 14,
    lineHeight: 16,
    color: '#342846',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderWidth: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  inputFull: {
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
  },
  cityFieldWrapper: {
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
    position: 'relative',
    zIndex: 20,
  },
  citySearchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  citySearchingText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#342846',
    opacity: 0.7,
  },
  cityDropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4DFEA',
    maxHeight: 220,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 30,
  },
  cityDropdownScrollView: {
    maxHeight: 220,
  },
  cityDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDF3',
  },
  cityDropdownText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
  },
  inputSmall: {
    width: 70,
  },
  inputYear: {
    width: 90,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  periodPillActive: {
    backgroundColor: '#342846',
  },
  periodText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
  },
  saveButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonText: {
    ...ButtonHeadingStyle,
    color: '#FFFFFF',
    fontSize: 16,
  },
});
