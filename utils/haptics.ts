import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';

let lastVibrationAt = 0;
const MIN_VIBRATION_GAP_MS = 140;
let hapticsPrimed = false;

const vibrateSafely = (durationMs: number) => {
  const now = Date.now();
  if (now - lastVibrationAt < MIN_VIBRATION_GAP_MS) {
    return;
  }
  lastVibrationAt = now;
  Vibration.vibrate(durationMs);
};

const primeHapticsIfNeeded = async () => {
  if (hapticsPrimed) return;
  try {
    // Prime the haptics engine so the first real tap is not dropped.
    await Haptics.selectionAsync();
  } catch {
    // Ignore and continue; regular haptic/fallback paths still apply.
  } finally {
    hapticsPrimed = true;
  }
};

const runHaptic = async (fn: () => Promise<void>, fallbackDurationMs: number) => {
  try {
    await primeHapticsIfNeeded();
    await fn();
  } catch {
    // Fallback vibration helps when haptics are unavailable/suppressed.
    vibrateSafely(fallbackDurationMs);
  }
};

export const hapticLight = () =>
  runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 5);

export const hapticMedium = () =>
  runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 7);

export const hapticHeavy = () =>
  runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 10);

export const hapticSuccess = () =>
  runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 12);

export const hapticWarning = () =>
  runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning), 14);

export const hapticError = () =>
  runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 16);
