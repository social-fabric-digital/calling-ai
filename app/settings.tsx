import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { useSubscription } from '@/components/SubscriptionProvider';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import {
  hapticError,
  hapticHeavy,
  hapticLight,
  hapticMedium,
  hapticSuccess,
  hapticWarning,
} from '@/utils/haptics';
import { changeLanguage } from '@/utils/i18n';
import { capitalizeUserName } from '@/utils/nameFormat';
import { useFocusEffect } from '@react-navigation/native';
import {
  cancelAllNotifications,
  getNotificationPreferences,
  requestNotificationPermissions,
  saveNotificationPreferences,
  scheduleDailyNotification,
  syncNotificationScheduleWithPreferences,
} from '@/utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SUPPORT_EMAIL = 'support@socialfabricdigital.com';
const APP_STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/app/id6746417490',
  android: 'https://play.google.com/store/apps/details?id=com.socialfactorydigital.calling',
  default: '',
});
const APPLE_SUBSCRIPTIONS_URL = 'itms-apps://apps.apple.com/account/subscriptions';
const APPLE_SUBSCRIPTIONS_FALLBACK_URL = 'https://apps.apple.com/account/subscriptions';
const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';
const DEFAULT_REMINDER_HOUR = 9;
const DEFAULT_REMINDER_MINUTE = 0;
const SUPABASE_URL =
  (Constants.expoConfig?.extra?.supabaseUrl ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    'https://unyrkyvyngafjubjhkkf.supabase.co')?.trim();
const SUPABASE_ANON_KEY =
  (Constants.expoConfig?.extra?.supabaseAnonKey ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueXJreXZ5bmdhZmp1Ympoa2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNjQ5MjUsImV4cCI6MjA4NTc0MDkyNX0.ZSnPR76qULI3TjOudumVer4Vp_Wa69GlfiT4sfJ9VlM')?.trim();

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = useSubscription();

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthCity, setBirthCity] = useState('');
  const [birthHour, setBirthHour] = useState('');
  const [birthMinute, setBirthMinute] = useState('');
  const [birthPeriod, setBirthPeriod] = useState('');
  const [isTrialActive, setIsTrialActive] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const profileDisplayName = userName.trim() || userEmail.trim().split('@')[0] || '';

  const currentLang = i18n.language?.startsWith('ru') ? 'ru' : 'en';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const loadData = useCallback(async () => {
    const [
      name,
      month,
      date,
      year,
      city,
      hour,
      minute,
      period,
    ] = await Promise.all([
      AsyncStorage.getItem('userName'),
      AsyncStorage.getItem('birthMonth'),
      AsyncStorage.getItem('birthDate'),
      AsyncStorage.getItem('birthYear'),
      AsyncStorage.getItem('birthCity'),
      AsyncStorage.getItem('birthHour'),
      AsyncStorage.getItem('birthMinute'),
      AsyncStorage.getItem('birthPeriod'),
    ]);
    setUserName(capitalizeUserName(name ?? ''));
    setBirthMonth(month ?? '');
    setBirthDate(date ?? '');
    setBirthYear(year ?? '');
    setBirthCity(city ?? '');
    setBirthHour(hour ?? '');
    setBirthMinute(minute ?? '');
    setBirthPeriod(period ?? '');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);

      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('trial_active, trial_end_date')
          .eq('id', user.id)
          .maybeSingle();

        const trialEndRaw = profile?.trial_end_date;
        const trialEndDate = trialEndRaw ? new Date(trialEndRaw) : null;
        const trialIsValidByDate = Boolean(
          trialEndDate && !Number.isNaN(trialEndDate.getTime()) && trialEndDate > new Date()
        );
        const trialActive = Boolean(profile?.trial_active && (trialIsValidByDate || !trialEndRaw));
        setIsTrialActive(trialActive);
      } else {
        setIsTrialActive(false);
      }
    } catch {
      // Not logged in / profile unavailable
      setIsTrialActive(false);
    }

    const prefs = await getNotificationPreferences();
    setNotificationsEnabled(prefs.enabled);
    if (prefs.hour !== DEFAULT_REMINDER_HOUR || prefs.minute !== DEFAULT_REMINDER_MINUTE) {
      await saveNotificationPreferences(
        prefs.enabled,
        DEFAULT_REMINDER_HOUR,
        DEFAULT_REMINDER_MINUTE
      );
    }
    await syncNotificationScheduleWithPreferences();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleToggleNotifications = async (value: boolean) => {
    void hapticLight();
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        void hapticWarning();
        Alert.alert(
          '',
          t('settings.notificationPermissionDenied', {
            defaultValue: currentLang === 'ru'
              ? 'Чтобы получать напоминания, включите уведомления для Calling в настройках iOS.'
              : 'To receive reminders, enable notifications for Calling in iOS Settings.',
          }),
          [
            { text: t('settings.cancel', { defaultValue: currentLang === 'ru' ? 'Отмена' : 'Cancel' }), style: 'cancel' },
            {
              text: t('settings.openSettings', { defaultValue: currentLang === 'ru' ? 'Открыть настройки' : 'Open Settings' }),
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ]
        );
        return;
      }
      await scheduleDailyNotification(DEFAULT_REMINDER_HOUR, DEFAULT_REMINDER_MINUTE);
    } else {
      await cancelAllNotifications();
    }
    setNotificationsEnabled(value);
    await saveNotificationPreferences(value, DEFAULT_REMINDER_HOUR, DEFAULT_REMINDER_MINUTE);
    void hapticSuccess();
  };

  const handleLanguageChange = async (lang: 'en' | 'ru') => {
    if (lang === currentLang) return;
    void hapticLight();
    await changeLanguage(lang);
    void hapticSuccess();
  };

  const handleUpgrade = async () => {
    void hapticMedium();
    try {
      if (Platform.OS === 'ios') {
        const canOpenNative = await Linking.canOpenURL(APPLE_SUBSCRIPTIONS_URL);
        if (canOpenNative) {
          await Linking.openURL(APPLE_SUBSCRIPTIONS_URL);
          return;
        }
        await Linking.openURL(APPLE_SUBSCRIPTIONS_FALLBACK_URL);
        return;
      }

      if (Platform.OS === 'android') {
        await Linking.openURL(PLAY_SUBSCRIPTIONS_URL);
        return;
      }

      await Linking.openURL(APP_STORE_URL || APPLE_SUBSCRIPTIONS_FALLBACK_URL);
    } catch (error) {
      console.error('Upgrade flow error:', error);
      void hapticError();
      Alert.alert(
        '',
        t('settings.unableToOpenStore', {
          defaultValue: currentLang === 'ru'
            ? 'Не удалось открыть страницу оплаты. Попробуй еще раз.'
            : 'Unable to open the payment page. Please try again.',
        })
      );
    }
  };

  const handleLogout = async () => {
    void hapticMedium();
    try {
      await supabase.auth.signOut();
      await AsyncStorage.clear();
      setShowLogoutConfirmModal(false);
      void hapticSuccess();
      router.replace('/landing');
    } catch (error) {
      console.error('Logout error:', error);
      void hapticError();
    }
  };

  const handleLogoutPress = () => {
    void hapticLight();
    setShowLogoutConfirmModal(true);
  };

  const handleDeleteAccountPress = () => {
    void hapticHeavy();
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteAccount = async () => {
    void hapticHeavy();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Missing authenticated session for account deletion.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await Promise.all([
          supabase.from('profiles').delete().eq('id', user.id),
          supabase.from('daily_answers').delete().eq('user_id', user.id),
        ]);
      }

      const deleteResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        throw new Error(errorText || `Delete failed with status ${deleteResponse.status}`);
      }

      await cancelAllNotifications();
      await supabase.auth.signOut();
      await AsyncStorage.clear();
      setShowDeleteConfirmModal(false);
      void hapticSuccess();
      router.replace('/landing');
    } catch (error) {
      console.error('Delete account error:', error);
      void hapticError();
      Alert.alert(
        '',
        t('settings.deleteAccountError', {
          defaultValue: currentLang === 'ru'
            ? 'Не удалось удалить аккаунт. Попробуйте еще раз.'
            : 'Unable to delete account. Please try again.',
        })
      );
    }
  };

  const formatBirthDate = () => {
    if (!birthMonth || !birthDate || !birthYear) return t('settings.notSet');
    return `${birthMonth}/${birthDate}/${birthYear}`;
  };

  const formatBirthTime = () => {
    if (!birthHour || !birthMinute) return t('settings.notSet');
    return `${birthHour}:${birthMinute} ${birthPeriod}`.trim();
  };

  const initial = userName ? userName.charAt(0).toUpperCase() : '?';
  const currentPlanKey = isTrialActive ? 'trial' : isPremium ? 'premium' : 'free';

  return (
    <PaperTextureBackground>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            void hapticMedium();
            router.back();
          }}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#342846" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile ── */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profileDisplayName}</Text>
              {userEmail ? <Text style={styles.profileEmail}>{userEmail}</Text> : null}
            </View>
          </View>
          <TouchableOpacity
            style={styles.cardButton}
            onPress={() => {
              void hapticMedium();
              router.push('/edit-profile');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.cardButtonText}>{t('settings.editProfile')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Notifications ── */}
        <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.dailyReminders')}</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#ccc', true: '#342846' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── Birth Chart ── */}
        <Text style={styles.sectionTitle}>{t('settings.birthChart')}</Text>
        <View style={styles.card}>
          <View style={styles.birthRow}>
            <Ionicons name="calendar-outline" size={18} color="#342846" style={styles.birthIcon} />
            <Text style={styles.birthLabel}>{t('settings.birthDate')}</Text>
            <Text style={styles.birthValue}>{formatBirthDate()}</Text>
          </View>
          <View style={styles.birthRow}>
            <Ionicons name="time-outline" size={18} color="#342846" style={styles.birthIcon} />
            <Text style={styles.birthLabel}>{t('settings.birthTime')}</Text>
            <Text style={styles.birthValue}>{formatBirthTime()}</Text>
          </View>
          <View style={styles.birthRow}>
            <Ionicons name="location-outline" size={18} color="#342846" style={styles.birthIcon} />
            <Text style={styles.birthLabel}>{t('settings.birthCity')}</Text>
            <Text style={styles.birthValue}>{birthCity || t('settings.notSet')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.cardButton, { marginTop: 10 }]}
            onPress={() => {
              void hapticMedium();
              router.push('/edit-birth-data');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.cardButtonText}>{t('settings.editBirthData')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.appVersion')}</Text>
            <Text style={styles.rowValue}>{appVersion}</Text>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => {
              void hapticMedium();
              void Linking.openURL(APP_STORE_URL);
            }}
          >
            <Ionicons name="star-outline" size={20} color="#342846" />
            <Text style={styles.linkText}>{t('settings.rateApp')}</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => {
              void hapticMedium();
              router.push('/privacy-policy');
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#342846" />
            <Text style={styles.linkText}>{t('settings.privacyPolicy')}</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => {
              void hapticMedium();
              router.push('/terms-of-service');
            }}
          >
            <Ionicons name="document-text-outline" size={20} color="#342846" />
            <Text style={styles.linkText}>{t('settings.termsOfService')}</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => {
              void hapticMedium();
              void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
            }}
          >
            <Ionicons name="mail-outline" size={20} color="#342846" />
            <Text style={styles.linkText}>{t('settings.contactSupport')}</Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
        </View>

        {/* ── Subscription ── */}
        <Text style={styles.sectionTitle}>{t('settings.subscription')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.currentPlan')}</Text>
            <View
              style={[
                styles.planBadge,
                currentPlanKey === 'premium' && styles.planBadgePremium,
                currentPlanKey === 'trial' && styles.planBadgeTrial,
              ]}
            >
              <Text
                style={[
                  styles.planBadgeText,
                  currentPlanKey === 'premium' && styles.planBadgeTextPremium,
                  currentPlanKey === 'trial' && styles.planBadgeTextTrial,
                ]}
              >
                {currentPlanKey === 'trial'
                  ? t('settings.trialPlan')
                  : currentPlanKey === 'premium'
                    ? t('settings.premiumPlan')
                    : t('settings.freePlan')}
              </Text>
            </View>
          </View>
          {!isLoading && !isPremium && (
            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade} activeOpacity={0.7}>
              <Text style={styles.upgradeButtonText}>{t('settings.upgradeToPremium')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Preferences ── */}
        <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>
        <View style={styles.card}>
          <Text style={styles.rowLabel}>{t('settings.language')}</Text>
          <View style={styles.languageRow}>
            <TouchableOpacity
              style={[styles.languagePill, currentLang === 'en' && styles.languagePillActive]}
              onPress={() => handleLanguageChange('en')}
              activeOpacity={0.7}
            >
              <Text style={[styles.languagePillText, currentLang === 'en' && styles.languagePillTextActive]}>
                {t('settings.english')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languagePill, currentLang === 'ru' && styles.languagePillActive]}
              onPress={() => handleLanguageChange('ru')}
              activeOpacity={0.7}
            >
              <Text style={[styles.languagePillText, currentLang === 'ru' && styles.languagePillTextActive]}>
                {t('settings.russian')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Account Actions ── */}
        <Text style={styles.sectionTitle}>{t('settings.accountActions')}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#342846" />
          <Text style={styles.logoutButtonText}>{t('settings.logOut')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccountPress} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={20} color="#D32F2F" />
          <Text style={styles.deleteButtonText}>{t('settings.deleteAccount')}</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>

      <Modal
        visible={showLogoutConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirmModal(false)}
      >
        <Pressable
          style={styles.logoutModalOverlay}
          onPress={() => {
            setShowLogoutConfirmModal(false);
          }}
        >
          <Pressable style={styles.logoutModalCard} onPress={() => {}}>
            <Text style={styles.logoutModalTitle}>
              {t('settings.logOutConfirmTitle', {
                defaultValue: currentLang === 'ru'
                  ? 'Вы уверены, что хотите выйти?'
                  : 'Are you sure you want to log out?',
              })}
            </Text>
            <View style={styles.logoutModalButtonsRow}>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutModalButtonSecondary]}
                onPress={() => {
                  void hapticLight();
                  setShowLogoutConfirmModal(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.logoutModalButtonText, styles.logoutModalButtonTextSecondary]}>
                  {t('settings.no', { defaultValue: currentLang === 'ru' ? 'Нет' : 'No' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutModalButtonPrimary]}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Text style={[styles.logoutModalButtonText, styles.logoutModalButtonTextPrimary]}>
                  {t('settings.yes', { defaultValue: currentLang === 'ru' ? 'Да' : 'Yes' })}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showDeleteConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmModal(false)}
      >
        <Pressable
          style={styles.logoutModalOverlay}
          onPress={() => {
            setShowDeleteConfirmModal(false);
          }}
        >
          <Pressable style={styles.logoutModalCard} onPress={() => {}}>
            <Text style={styles.logoutModalTitle}>
              {t('settings.deleteConfirmTitle', {
                defaultValue: currentLang === 'ru'
                  ? 'Вы уверены, что хотите удалить аккаунт?'
                  : 'Are you sure you want to delete your account?',
              })}
            </Text>
            <View style={styles.logoutModalButtonsRow}>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutModalButtonSecondary]}
                onPress={() => {
                  void hapticLight();
                  setShowDeleteConfirmModal(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.logoutModalButtonText, styles.logoutModalButtonTextSecondary]}>
                  {t('settings.no', { defaultValue: currentLang === 'ru' ? 'Нет' : 'No' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoutModalButton, styles.logoutModalButtonPrimary]}
                onPress={handleDeleteAccount}
                activeOpacity={0.8}
              >
                <Text style={[styles.logoutModalButtonText, styles.logoutModalButtonTextPrimary]}>
                  {t('settings.yes', { defaultValue: currentLang === 'ru' ? 'Да' : 'Yes' })}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    ...HeadingStyle,
    fontSize: 24,
    fontWeight: '700',
    color: '#342846',
    marginTop: 0,
    marginBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: 20,
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Section titles
  sectionTitle: {
    ...HeadingStyle,
    fontSize: 18,
    color: '#342846',
    marginBottom: 12,
  },

  // Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...HeadingStyle,
    fontSize: 20,
    color: '#342846',
    textTransform: 'none',
  },
  profileEmail: {
    ...BodyStyle,
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },

  // Shared row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
  rowValue: {
    ...BodyStyle,
    color: '#666',
    fontSize: 16,
  },

  // Card button
  cardButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cardButtonText: {
    ...ButtonHeadingStyle,
    color: '#FFFFFF',
    fontSize: 15,
  },

  // Language
  languageRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  languagePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f0edf3',
  },
  languagePillActive: {
    backgroundColor: '#342846',
  },
  languagePillText: {
    ...BodyStyle,
    fontSize: 15,
    color: '#342846',
  },
  languagePillTextActive: {
    color: '#FFFFFF',
  },

  // Subscription
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f0edf3',
  },
  planBadgePremium: {
    backgroundColor: '#342846',
  },
  planBadgeTrial: {
    backgroundColor: 'rgba(186, 204, 215, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.18)',
  },
  planBadgeText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#342846',
    fontWeight: '600',
  },
  planBadgeTextPremium: {
    color: '#FFFFFF',
  },
  planBadgeTextTrial: {
    color: '#342846',
  },
  upgradeButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  upgradeButtonText: {
    ...ButtonHeadingStyle,
    color: '#FFFFFF',
    fontSize: 16,
  },

  // Birth chart
  birthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  birthIcon: {
    marginRight: 10,
  },
  birthLabel: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    flex: 1,
  },
  birthValue: {
    ...BodyStyle,
    color: '#666',
    fontSize: 14,
  },
  // About links
  divider: {
    height: 1,
    backgroundColor: '#f0edf3',
    marginVertical: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },

  // Account actions
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButtonText: {
    ...ButtonHeadingStyle,
    color: '#342846',
    fontSize: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
  },
  deleteButtonText: {
    ...ButtonHeadingStyle,
    color: '#D32F2F',
    fontSize: 16,
  },
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoutModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  logoutModalTitle: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'none',
  },
  logoutModalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  logoutModalButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutModalButtonPrimary: {
    backgroundColor: '#342846',
  },
  logoutModalButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
  },
  logoutModalButtonText: {
    ...ButtonHeadingStyle,
    fontSize: 16,
  },
  logoutModalButtonTextPrimary: {
    color: '#FFFFFF',
  },
  logoutModalButtonTextSecondary: {
    color: '#342846',
  },
});
