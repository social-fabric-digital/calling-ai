import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    };
    loadBirthData();
  }, []);

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
        await AsyncStorage.multiRemove(['birthLatitude', 'birthLongitude', 'birthTimezone']);
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
          <View style={styles.backButton} />
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
            <TextInput
              value={birthCity}
              onChangeText={setBirthCity}
              placeholder={tr('Enter city', 'Введите город')}
              placeholderTextColor="#999"
              style={styles.input}
            />
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...HeadingStyle,
    fontSize: 20,
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
    ...ButtonHeadingStyle,
    fontSize: 14,
    color: '#342846',
    marginBottom: 8,
  },
  labelTop: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  input: {
    ...BodyStyle,
    fontSize: 14,
    lineHeight: 16,
    color: '#342846',
    backgroundColor: '#F7F5F9',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 0,
    height: 36,
    borderWidth: 1,
    borderColor: '#E4DFEA',
    flex: 1,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  inputSmall: {
    maxWidth: 80,
  },
  inputYear: {
    maxWidth: 110,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPill: {
    backgroundColor: '#f0edf3',
    borderRadius: 8,
    paddingVertical: 0,
    paddingHorizontal: 12,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
