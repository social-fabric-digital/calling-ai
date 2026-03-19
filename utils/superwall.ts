import Constants from 'expo-constants';
import { NativeModulesProxy } from 'expo-modules-core';
import i18n from './i18n';
import { Platform } from 'react-native';

type SuperwallType = typeof import('expo-superwall/compat').default;
type SuperwallCompatModule = typeof import('expo-superwall/compat');

let cachedSuperwall: SuperwallType | null | undefined;
let cachedCompatModule: SuperwallCompatModule | null | undefined;
let superwallConfigured = false;
let configureInFlight: Promise<boolean> | null = null;
let loggedMissingNativeSuperwall = false;

function hasNativeSuperwallModule(): boolean {
  return Boolean((NativeModulesProxy as Record<string, unknown> | undefined)?.SuperwallExpo);
}

async function loadCompatModule(): Promise<SuperwallCompatModule | null> {
  if (cachedCompatModule !== undefined) {
    return cachedCompatModule;
  }

  if (!hasNativeSuperwallModule()) {
    if (!loggedMissingNativeSuperwall) {
      loggedMissingNativeSuperwall = true;
      console.warn('[Superwall] Native module unavailable in this build. Paywalls are disabled.');
    }
    cachedCompatModule = null;
    return null;
  }

  try {
    const mod = await import('expo-superwall/compat');
    cachedCompatModule = mod;
  } catch (error) {
    console.warn('[Superwall] Failed to load compat module. Paywalls are disabled.');
    cachedCompatModule = null;
  }

  return cachedCompatModule ?? null;
}

async function getSuperwall(): Promise<SuperwallType | null> {
  if (cachedSuperwall !== undefined) {
    return cachedSuperwall;
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    cachedSuperwall = null;
    return null;
  }

  const mod = await loadCompatModule();
  if (!mod) {
    cachedSuperwall = null;
    return null;
  }

  try {
    cachedSuperwall = mod.default ?? (mod as unknown as SuperwallType);
  } catch (error) {
    console.error('[Superwall] Failed to initialize module export:', error);
    cachedSuperwall = null;
  }

  return cachedSuperwall ?? null;
}

// ── API Keys ──
const SUPERWALL_IOS_KEY = process.env.EXPO_PUBLIC_SUPERWALL_IOS_API_KEY || '';
const SUPERWALL_ANDROID_KEY = process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY || '';

/**
 * Get the correct API key for the current platform
 */
export function getSuperwallApiKey(): string {
  return Platform.OS === 'ios' ? SUPERWALL_IOS_KEY : SUPERWALL_ANDROID_KEY;
}

function isAlreadyConfiguredError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /already configured|has already been configured|already initialized/i.test(message);
}

function isSubscriptionActive(status: unknown): boolean {
  if (!status) return false;
  if (typeof status === 'string') {
    const normalized = status.toLowerCase();
    return normalized.includes('active') || normalized.includes('trial');
  }
  if (typeof status === 'object' && 'status' in (status as Record<string, unknown>)) {
    const value = (status as Record<string, unknown>).status;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      return normalized.includes('active') || normalized.includes('trial');
    }
  }
  if (typeof status === 'object') {
    const candidateKeys = ['state', 'subscriptionStatus', 'entitlementStatus', 'rawValue'] as const;
    for (const key of candidateKeys) {
      const rawValue = (status as Record<string, unknown>)[key];
      if (typeof rawValue === 'string') {
        const normalized = rawValue.toLowerCase();
        if (normalized.includes('active') || normalized.includes('trial')) {
          return true;
        }
      }
    }
  }
  return false;
}

export async function ensureSuperwallInitialized(): Promise<boolean> {
  const superwall = await getSuperwall();
  if (!superwall) {
    return false;
  }
  if (superwallConfigured) return true;
  if (configureInFlight) return configureInFlight;

  const apiKey = getSuperwallApiKey();
  if (!apiKey) {
    return false;
  }

  configureInFlight = (async () => {
    try {
      const Superwall = superwall as any;
      if (typeof Superwall.configure !== 'function') {
        console.warn('[Superwall] configure is not available on loaded module');
        return false;
      }
      await Superwall.configure({ apiKey });
      superwallConfigured = true;
      return true;
    } catch (error) {
      if (isAlreadyConfiguredError(error)) {
        superwallConfigured = true;
        return true;
      }
      console.error('[Superwall] configure error:', error);
      return false;
    } finally {
      configureInFlight = null;
    }
  })();

  return configureInFlight;
}

/**
 * Update the locale attribute in Superwall
 * Call this when the user changes language in the app
 */
export async function setLocaleAttribute(locale: string): Promise<void> {
  const ready = await ensureSuperwallInitialized();
  if (!ready) return;
  const superwall = await getSuperwall();
  if (!superwall) return;
  try {
    if ((superwall.shared as any).setUserAttributes) {
      await (superwall.shared as any).setUserAttributes({ locale });
    }
  } catch (error) {
    console.error('Superwall setLocale error:', error);
  }
}

/**
 * Register a paywall event/placement.
 * Call this when you want to potentially show a paywall.
 * Superwall decides whether to show it based on your dashboard rules.
 */
export async function triggerPaywall(event: string): Promise<{
  shown: boolean;
  purchased: boolean;
  dismissed: boolean;
  dismissResultType?: string | null;
}> {
  const ready = await ensureSuperwallInitialized();
  if (!ready) {
    return { shown: false, purchased: false, dismissed: false, dismissResultType: null };
  }
  const superwall = await getSuperwall();
  if (!superwall) {
    return { shown: false, purchased: false, dismissed: false, dismissResultType: null };
  }

  try {
    const locale = i18n.language || 'en';
    if ((superwall.shared as any).setUserAttributes) {
      await (superwall.shared as any).setUserAttributes({ locale });
    }
    const compatModule = await loadCompatModule();
    const PaywallPresentationHandler = compatModule?.PaywallPresentationHandler as any;

    let didPresent = false;
    let dismissResultType: string | null = null;
    let skipReasonName: string | null = null;
    const handler: any = PaywallPresentationHandler ? new PaywallPresentationHandler() : null;
    let markPresentationComplete: (() => void) | null = null;
    const presentationCompletion = new Promise<void>((resolve) => {
      let done = false;
      markPresentationComplete = () => {
        if (done) return;
        done = true;
        resolve();
      };
    });

    if (handler) {
      handler.onPresent((_info: unknown) => {
        didPresent = true;
      });
      handler.onDismiss((_info: unknown, result: { type?: string } | null) => {
        dismissResultType = result?.type ?? null;
        markPresentationComplete?.();
      });
      handler.onError((error: string) => {
        console.error('[Superwall] Paywall presentation error', { event, error });
        markPresentationComplete?.();
      });
      handler.onSkip((reason: unknown) => {
        skipReasonName = reason && typeof reason === 'object'
          ? (reason as { constructor?: { name?: string } }).constructor?.name ?? 'unknown'
          : String(reason ?? 'unknown');
        markPresentationComplete?.();
      });
    }

    let presentationType = 'unknown';
    try {
      const presentationResult = await superwall.shared.getPresentationResult({
        placement: event,
      });
      presentationType = presentationResult?.constructor?.name ?? 'unknown';
    } catch {
      // non-critical
    }

    let registerError: unknown = null;
    const registerPromise = superwall.shared.register({
      placement: event,
      ...(handler ? { handler } : {}),
    } as any).catch((error: unknown) => {
      registerError = error;
    }).finally(() => {
      markPresentationComplete?.();
    });

    // Keep this generous so Apple auth/purchase flow is not interrupted mid-process.
    const completionTimeout = new Promise<void>((resolve) => {
      setTimeout(resolve, 180000);
    });

    await Promise.race([registerPromise, presentationCompletion, completionTimeout]);
    if (registerError) {
      throw registerError;
    }

    let activeAfterRegister = false;
    try {
      const statusAfterRegister = await superwall.shared.getSubscriptionStatus();
      activeAfterRegister = isSubscriptionActive(statusAfterRegister);
    } catch {
      // non-critical: fall back to dismiss result
    }

    // Some sandbox/App Store flows propagate entitlement state shortly after dismissal.
    // Retry briefly before deciding purchase failed.
    let activeAfterRetry = false;
    if (!activeAfterRegister) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          const status = await superwall.shared.getSubscriptionStatus();
          if (isSubscriptionActive(status)) {
            activeAfterRetry = true;
            break;
          }
        } catch {
          // keep retrying
        }
      }
    }

    const hasExplicitDismissResult = dismissResultType !== null && dismissResultType !== undefined;
    const purchasedFromDismiss =
      dismissResultType === 'purchased' || dismissResultType === 'restored';
    // If Superwall explicitly reports a non-purchase dismissal (e.g. close/back),
    // trust that signal over potentially stale entitlement reads.
    const purchased = hasExplicitDismissResult
      ? purchasedFromDismiss
      : (activeAfterRegister || activeAfterRetry);
    const shown = didPresent || presentationType === 'PresentationResultPaywall';
    const dismissed = shown && !purchased;

    // suppress unused variable warnings
    void skipReasonName;

    return { shown, purchased, dismissed, dismissResultType };
  } catch (error) {
    console.error('[Superwall] triggerPaywall failed', { event, error });
    return { shown: false, purchased: false, dismissed: false, dismissResultType: null };
  }
}

/**
 * Check if user has an active subscription via Superwall
 */
export async function checkSubscriptionStatus(): Promise<boolean> {
  const ready = await ensureSuperwallInitialized();
  if (!ready) {
    return false;
  }
  const superwall = await getSuperwall();
  if (!superwall) return false;

  try {
    const status = await superwall.shared.getSubscriptionStatus();
    return isSubscriptionActive(status);
  } catch (error) {
    console.error('Superwall subscription check error:', error);
    return false;
  }
}

/**
 * Restore purchases from the store account (Apple ID / Google account).
 */
export async function restorePurchases(): Promise<void> {
  const ready = await ensureSuperwallInitialized();
  if (!ready) {
    throw new Error('Superwall not initialized');
  }
  const superwall = await getSuperwall();
  if (!superwall) {
    throw new Error('Superwall unavailable');
  }

  await superwall.shared.restorePurchases();
}

/**
 * Identify the user (call after auth/signup)
 * This syncs user data with Superwall for targeting
 */
export async function identifyUser(userId: string): Promise<void> {
  const ready = await ensureSuperwallInitialized();
  if (!ready) {
    return;
  }
  const superwall = await getSuperwall();
  if (!superwall) return;

  try {
    await superwall.shared.identify({ userId });
    const locale = i18n.language || 'en';
    if ((superwall.shared as any).setUserAttributes) {
      await (superwall.shared as any).setUserAttributes({ locale });
    }
  } catch (error) {
    console.error('Superwall identify error:', error);
  }
}

/**
 * Reset user (call on logout)
 */
export async function resetUser(): Promise<void> {
  const ready = await ensureSuperwallInitialized();
  if (!ready) {
    return;
  }
  const superwall = await getSuperwall();
  if (!superwall) return;

  try {
    await superwall.shared.reset();
  } catch (error) {
    console.error('Superwall reset error:', error);
  }
}
