import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { capitalizeUserName } from '@/utils/nameFormat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EditProfileScreen() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const storedName = await AsyncStorage.getItem('userName');
      if (storedName) {
        setName(storedName);
      }
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        setEmail(data.user.email);
      }
    };
    loadProfile();
  }, []);

  const canSave = useMemo(() => {
    return name.trim().length > 0 && email.trim().length > 0;
  }, [name, email]);

  const handleSave = async () => {
    if (!canSave || loading) return;
    setLoading(true);
    try {
      const trimmedName = capitalizeUserName(name);
      const trimmedEmail = email.trim().toLowerCase();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(tr('Not signed in', 'Нет активной сессии'));
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('userName', trimmedName);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: trimmedName })
        .eq('id', user.id);
      if (profileError) {
        throw profileError;
      }

      if (trimmedEmail !== (user.email || '').toLowerCase()) {
        const { error: authUpdateError } = await supabase.auth.updateUser({
          email: trimmedEmail,
        });
        if (authUpdateError) {
          throw authUpdateError;
        }
      }

      Alert.alert(
        tr('Profile updated', 'Профиль обновлен'),
        tr(
          'Your changes were saved in the app and synced to your account.',
          'Изменения сохранены в приложении и синхронизированы с аккаунтом.'
        )
      );
      router.back();
    } catch (error: any) {
      Alert.alert(
        tr('Update failed', 'Не удалось обновить'),
        error?.message ||
          tr('Please try again.', 'Пожалуйста, попробуйте снова.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaperTextureBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#342846" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tr('Edit profile', 'Редактировать профиль')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.label}>{tr('Name', 'Имя')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={tr('Enter your name', 'Введите ваше имя')}
              placeholderTextColor="#999"
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={[styles.label, styles.secondLabel]}>{tr('Email', 'Эл. почта')}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={tr('Enter your email', 'Введите вашу эл. почту')}
              placeholderTextColor="#999"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.helper}>
              {tr(
                'If you change your email, your auth provider may ask for confirmation.',
                'При смене эл. почты провайдер авторизации может запросить подтверждение.'
              )}
            </Text>
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[styles.saveButton, (!canSave || loading) && styles.saveButtonDisabled]}
            activeOpacity={0.8}
            disabled={!canSave || loading}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>
              {loading
                ? tr('Saving...', 'Сохранение...')
                : tr('Save changes', 'Сохранить изменения')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  content: {
    flex: 1,
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
    fontSize: 18,
    color: '#342846',
    marginBottom: 8,
    textTransform: 'none',
  },
  secondLabel: {
    marginTop: 16,
  },
  input: {
    ...BodyStyle,
    fontSize: 16,
    lineHeight: 20,
    color: '#342846',
    backgroundColor: '#F7F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    borderWidth: 1,
    borderColor: '#E4DFEA',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  helper: {
    ...BodyStyle,
    fontSize: 12,
    color: '#666',
    marginTop: 12,
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
