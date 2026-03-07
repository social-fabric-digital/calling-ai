import { supabase } from '@/lib/supabase';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [flowType, setFlowType] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [tokenHash, setTokenHash] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [isUrlChecked, setIsUrlChecked] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const parseTokensFromUrl = (url: string | null) => {
    if (!url) return;

    const extractParts = (candidate: string) => {
      const queryPart = candidate.includes('?')
        ? candidate.split('?')[1]?.split('#')[0] || ''
        : '';
      const hashPart = candidate.includes('#') ? candidate.split('#')[1] : '';
      return { queryPart, hashPart };
    };

    const rawParts = extractParts(url);
    const decodedUrl = decodeURIComponent(url);
    const decodedParts = decodedUrl === url ? rawParts : extractParts(decodedUrl);

    const queryParams = new URLSearchParams([rawParts.queryPart, decodedParts.queryPart].filter(Boolean).join('&'));
    const fragmentParams = new URLSearchParams([rawParts.hashPart, decodedParts.hashPart].filter(Boolean).join('&'));

    const pick = (key: string) => fragmentParams.get(key) || queryParams.get(key) || '';

    const nextAccessToken = pick('access_token');
    const nextRefreshToken = pick('refresh_token');
    const nextType = pick('type');
    const nextCode = pick('code');
    const nextTokenHash = pick('token_hash');
    const nextRecoveryToken = pick('token') || pick('otp');

    if (nextAccessToken) setAccessToken(nextAccessToken);
    if (nextRefreshToken) setRefreshToken(nextRefreshToken);
    if (nextType) setFlowType(nextType);
    if (nextCode) setAuthCode(nextCode);
    if (nextTokenHash) setTokenHash(nextTokenHash);
    if (nextRecoveryToken) setRecoveryToken(nextRecoveryToken);
  };

  useEffect(() => {
    let cancelled = false;

    const readInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        parseTokensFromUrl(initialUrl);
      } finally {
        if (!cancelled) {
          setIsUrlChecked(true);
        }
      }
    };

    void readInitialUrl();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      parseTokensFromUrl(url);
      setIsUrlChecked(true);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const handleKeyboardShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isUrlChecked) return;

    let cancelled = false;

    const prepareRecoverySession = async () => {
      try {
        setError(null);
        if (flowType && flowType !== 'recovery') {
          setError(t('resetPassword.errors.invalidLink'));
          return;
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            throw sessionError;
          }
        } else if (authCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeError) {
            throw exchangeError;
          }
        } else if (tokenHash) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (verifyError) {
            throw verifyError;
          }
        } else if (recoveryToken) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token: recoveryToken,
            type: 'recovery',
          });
          if (verifyError) {
            throw verifyError;
          }
        } else {
          const { data: sessionData, error: getSessionError } = await supabase.auth.getSession();
          if (getSessionError) {
            throw getSessionError;
          }
          if (!sessionData.session) {
            setError(t('resetPassword.errors.missingTokens'));
            return;
          }
        }
      } catch (e: any) {
        setError(e?.message || t('resetPassword.errors.validateLinkFailed'));
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    void prepareRecoverySession();
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshToken, flowType, authCode, tokenHash, recoveryToken, isUrlChecked, t]);

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      setError(t('resetPassword.errors.fillBoth'));
      return;
    }
    if (password.length < 6) {
      setError(t('resetPassword.errors.tooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('resetPassword.errors.mismatch'));
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }

      await supabase.auth.signOut();
      setInfo(t('resetPassword.success'));
      setTimeout(() => {
        router.replace('/email-login');
      }, 600);
    } catch (e: any) {
      setError(e?.message || t('resetPassword.errors.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/account.png')}
        pointerEvents="none"
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/email-login')} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#342846" />
        </TouchableOpacity>
      </View>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + keyboardHeight + 24 },
          ]}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>{t('resetPassword.title')}</Text>
            <Text style={styles.subtitle}>{t('resetPassword.subtitle')}</Text>

            <View style={styles.card}>
              {!ready ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color="#342846" />
                </View>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t('resetPassword.newPasswordLabel')}</Text>
                    <TextInput
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        if (error) setError(null);
                      }}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                      placeholder={t('resetPassword.newPasswordPlaceholder')}
                      placeholderTextColor="#9BA3AF"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t('resetPassword.confirmPasswordLabel')}</Text>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={(value) => {
                        setConfirmPassword(value);
                        if (error) setError(null);
                      }}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                      placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                      placeholderTextColor="#9BA3AF"
                    />
                  </View>

                  {!!error && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                  {!!info && (
                    <View style={styles.infoContainer}>
                      <Text style={styles.infoText}>{info}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleUpdatePassword}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>{t('resetPassword.resetButton')}</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
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
    zIndex: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 42,
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
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  title: {
    ...HeadingStyle,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...BodyStyle,
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center',
    marginBottom: 16,
  },
  loadingBox: {
    marginTop: 24,
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    color: '#342846',
    ...BodyStyle,
  },
  errorContainer: {
    backgroundColor: 'rgba(127, 29, 29, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 202, 0.55)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    ...BodyStyle,
    color: '#D32F2F',
    fontSize: 14,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 14,
  },
  button: {
    marginTop: 8,
    borderRadius: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#342846',
    paddingHorizontal: 20,
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
});
