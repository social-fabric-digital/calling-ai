import { supabase } from '@/lib/supabase';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { trackLoginEvent } from '@/utils/appTracking';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ActivityIndicator, 
  Image,
  Platform, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EmailLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (typeof params.email === 'string' && params.email.trim()) {
      setEmail(params.email.trim());
    }
  }, [params.email]);

  const handleSignIn = async () => {
    if (!email.trim() || password.length === 0) {
      setError(tr('Please enter email and password', 'Пожалуйста, введи email и пароль'));
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      // Never trim password: spaces may be part of the actual credential.
      const normalizedPassword = password;

      // 1) Existing user path: try sign-in first.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (!signInError) {
        await trackLoginEvent();
        // Existing account found -> go straight to Home.
        router.replace('/(tabs)');
        return;
      }

      throw signInError;
    } catch (err: any) {
      console.error('Sign in error:', err);
      let errorMessage = tr('Could not sign in. Please try again.', 'Не удалось войти. Попробуй еще раз.');
      
      if (err?.message?.includes('Missing EXPO_PUBLIC_SUPABASE_URL') || 
          err?.message?.includes('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY')) {
        errorMessage = tr('Authentication service is not configured. Contact support.', 'Сервис авторизации не настроен. Обратись в поддержку.');
      } else if (err?.message?.includes('Invalid login credentials')) {
        errorMessage = tr('Invalid email or password', 'Неверный email или пароль');
      } else if (err?.message?.includes('Email not confirmed')) {
        errorMessage = tr('Please confirm your account from your email', 'Подтверди аккаунт через письмо на почте');
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError(tr('Please enter your email first', 'Сначала введи email'));
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const resetRedirectUrl = Linking.createURL('/reset-password', { scheme: 'calling' });
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: resetRedirectUrl,
      });
      if (resetError) {
        throw resetError;
      }
      setInfo(
        tr(
          'Password reset email sent. Please check your inbox.',
          'Письмо для сброса пароля отправлено. Проверь почту.'
        )
      );
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(
        err?.message ||
          tr('Could not send reset email. Please try again.', 'Не удалось отправить письмо для сброса. Попробуй еще раз.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    router.replace('/landing');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // Fallback for cases where this screen is opened without history.
    router.replace('/landing');
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/account.png')}
        pointerEvents="none"
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      {/* Header with back button */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#342846" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{tr('Sign in', 'Вход')}</Text>
          <Text style={styles.subtitle}>{tr('Enter email and password to continue', 'Введи email и пароль, чтобы продолжить')}</Text>
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Email input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{tr('Email', 'Эл. почта')}</Text>
          <TextInput
            style={styles.input}
            placeholder={tr('your@email.com', 'твой@email.ru')}
            placeholderTextColor="#9BA3AF"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
              setInfo(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        {/* Password input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{tr('Password', 'Пароль')}</Text>
          <TextInput
            ref={passwordInputRef}
            style={styles.input}
            placeholder={tr('Enter password', 'Введи пароль')}
            placeholderTextColor="#9BA3AF"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
              setInfo(null);
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        {!!info && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>{info}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={handleForgotPassword}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotPasswordText}>{tr('Forgot password?', 'Забыли пароль?')}</Text>
        </TouchableOpacity>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button, 
              styles.signInButton, 
              loading ? styles.buttonDisabled : null
            ]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{tr('Continue', 'Продолжить')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button, 
              styles.signUpButton, 
              loading ? styles.buttonDisabled : null
            ]}
            onPress={handleCreateAccount}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#342846" />
            ) : (
              <Text style={[styles.buttonText, styles.signUpButtonText]}>{tr('Create account', 'Создать аккаунт')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    ...HeadingStyle,
    color: '#342846',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...BodyStyle,
    color: '#7A8A9A',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FDF2F2',
    borderWidth: 1,
    borderColor: '#F5C6CB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    ...BodyStyle,
    color: '#D32F2F',
    fontSize: 14,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  forgotPasswordText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: Platform.select({
      ios: 'BricolageGrotesque-SemiBold',
      android: 'BricolageGrotesque-SemiBold',
      default: 'sans-serif',
    }),
    fontSize: 12,
    fontWeight: '600',
    color: '#342846',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    paddingVertical: 16,
    color: '#342846',
    fontSize: 16,
    fontFamily: Platform.select({
      ios: 'AnonymousPro-Regular',
      android: 'AnonymousPro-Regular',
      default: 'monospace',
    }),
    lineHeight: Platform.select({
      ios: 20,
      android: 20,
      default: 20,
    }),
    textAlignVertical: 'center',
    includeFontPadding: false,
    minHeight: 52,
    height: 52,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 52,
  },
  signInButton: {
    backgroundColor: '#342846',
  },
  signUpButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  signUpButtonText: {
    color: '#342846',
  },
});
