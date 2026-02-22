import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

const NOTIFICATION_ENABLED_KEY = '@notification_enabled';
const NOTIFICATION_HOUR_KEY = '@notification_hour';
const NOTIFICATION_MINUTE_KEY = '@notification_minute';
const LANGUAGE_STORAGE_KEY = '@selected_language';
const USER_GOALS_KEY = 'userGoals';

type SupportedLanguage = 'en' | 'ru';

type GoalInput =
  | string
  | {
      name?: string;
      title?: string;
      isActive?: boolean;
    };

const EN_NOTIFICATION_TEMPLATES = [
  "Hey {name}, your goal '{goal}' is waiting for you. 5 minutes today?",
  '{name}, small steps lead to big changes. Check in today?',
  'Your future self will thank you, {name}. Open the app?',
  "{name}, consistency beats perfection. Let's go!",
  "Remember why you started '{goal}', {name}. Keep going!",
  '{name}, progress > perfection. Quick check-in?',
  "One small action today, {name}. That's all it takes.",
  "{name}, you've got this. '{goal}' is within reach.",
  "Don't break the streak, {name}! Open the app.",
  '{name}, your goals miss you. Say hi?',
  'Plot twist: {name} actually opens the app today 😏',
  '{name}, this is your sign. Open the app.',
  "Knock knock, {name}. It's your goals calling.",
  "{name}... you weren't going to skip today, right?",
  'Hey {name}, the app is feeling lonely without you 🥺',
  "{name}, your '{goal}' just asked about you.",
  'Breaking news: {name} is about to crush their goals today.',
  '{name}, the stars aligned for you to open this app ✨',
  "Psst {name}... '{goal}' is waiting. Don't leave it hanging.",
  "{name}, 2 minutes. That's all. You in?",
  "How are you feeling about '{goal}' today, {name}?",
  "{name}, quick question: what's one small win from yesterday?",
  "Take a breath, {name}. Then take a step toward '{goal}'.",
  '{name}, what would make today meaningful?',
  "Pause and reflect, {name}. How's your journey going?",
  '{name}, checking in: are you being kind to yourself?',
  "What's one thing you're grateful for today, {name}?",
  '{name}, your daily moment of clarity awaits.',
  'Time for your daily reflection, {name}. Ready?',
  "{name}, let's make today count. Open the app.",
];

const RU_NOTIFICATION_TEMPLATES = [
  "Привет, {name}! Твоя цель '{goal}' ждёт тебя. 5 минут сегодня?",
  '{name}, маленькие шаги ведут к большим переменам. Заглянешь?',
  'Твоё будущее я скажет спасибо, {name}. Открой приложение?',
  '{name}, постоянство важнее совершенства. Поехали!',
  "Вспомни, почему ты начал '{goal}', {name}. Продолжай!",
  '{name}, прогресс важнее идеала. Быстрая проверка?',
  'Одно маленькое действие сегодня, {name}. Это всё, что нужно.',
  "{name}, у тебя получится. '{goal}' уже близко.",
  'Не ломай серию, {name}! Открой приложение.',
  '{name}, твои цели скучают. Скажешь привет?',
  'Сюжетный поворот: {name} сегодня открывает приложение 😏',
  '{name}, это твой знак. Открой приложение.',
  'Тук-тук, {name}. Это твои цели звонят.',
  '{name}... ты же не собирался пропустить сегодня, да?',
  'Эй {name}, приложению одиноко без тебя 🥺',
  "{name}, твоя цель '{goal}' только что спрашивала о тебе.",
  'Срочные новости: {name} сегодня покорит свои цели.',
  '{name}, звёзды сошлись, чтобы ты открыл это приложение ✨',
  "Псст {name}... '{goal}' ждёт. Не оставляй без внимания.",
  '{name}, 2 минуты. Всего лишь. Ты с нами?',
  "Как ты себя чувствуешь насчёт '{goal}' сегодня, {name}?",
  '{name}, быстрый вопрос: какая маленькая победа была вчера?',
  "Вдохни, {name}. Потом сделай шаг к '{goal}'.",
  '{name}, что сделает сегодняшний день значимым?',
  'Пауза и рефлексия, {name}. Как твой путь?',
  '{name}, проверка: ты добр к себе сегодня?',
  'За что ты благодарен сегодня, {name}?',
  '{name}, твой момент ясности ждёт.',
  'Время для ежедневной рефлексии, {name}. Готов?',
  '{name}, давай сделаем сегодня важным. Открой приложение.',
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export interface NotificationPreferences {
  enabled: boolean;
  hour: number;
  minute: number;
}

export async function saveNotificationPreferences(
  enabled: boolean,
  hour: number,
  minute: number,
): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, JSON.stringify(enabled));
  await AsyncStorage.setItem(NOTIFICATION_HOUR_KEY, JSON.stringify(hour));
  await AsyncStorage.setItem(NOTIFICATION_MINUTE_KEY, JSON.stringify(minute));
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const enabled = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
    const hour = await AsyncStorage.getItem(NOTIFICATION_HOUR_KEY);
    const minute = await AsyncStorage.getItem(NOTIFICATION_MINUTE_KEY);
    return {
      enabled: enabled ? JSON.parse(enabled) : false,
      hour: hour ? JSON.parse(hour) : 9,
      minute: minute ? JSON.parse(minute) : 0,
    };
  } catch {
    return { enabled: false, hour: 9, minute: 0 };
  }
}

export async function scheduleDailyNotification(
  hour: number,
  minute: number,
  name?: string,
  goals: GoalInput[] = [],
  language?: SupportedLanguage,
): Promise<void> {
  await cancelAllNotifications();

  const personalization = await getNotificationPersonalization(name, goals, language);
  const body = buildPersonalizedNotificationBody(personalization);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Calling',
      body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function syncNotificationScheduleWithPreferences(): Promise<void> {
  const prefs = await getNotificationPreferences();

  if (!prefs.enabled) {
    await cancelAllNotifications();
    return;
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    return;
  }

  await scheduleDailyNotification(prefs.hour, prefs.minute);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function normalizeLanguage(language?: string): SupportedLanguage {
  return language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

function normalizeName(name?: string, language: SupportedLanguage = 'en'): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  return language === 'ru' ? 'друг' : 'friend';
}

function extractGoalText(goal: GoalInput): string | null {
  if (typeof goal === 'string') {
    const trimmed = goal.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  const candidate = goal.name ?? goal.title;
  const trimmed = candidate?.trim();
  return trimmed ? trimmed : null;
}

function normalizeGoals(goals: GoalInput[]): string[] {
  return goals
    .map(extractGoalText)
    .filter((goal): goal is string => Boolean(goal));
}

function pickRandomGoal(goals: string[], language: SupportedLanguage): string {
  if (goals.length === 0) {
    return language === 'ru' ? 'твой путь' : 'your journey';
  }
  const randomIndex = Math.floor(Math.random() * goals.length);
  return goals[randomIndex];
}

function buildPersonalizedNotificationBody(personalization: {
  name: string;
  goals: string[];
  language: SupportedLanguage;
}): string {
  const templates = personalization.language === 'ru'
    ? RU_NOTIFICATION_TEMPLATES
    : EN_NOTIFICATION_TEMPLATES;
  const dayIndex = getDayOfYear(new Date()) % templates.length;
  const template = templates[dayIndex];
  const goal = pickRandomGoal(personalization.goals, personalization.language);

  return template
    .replace(/\{name\}/g, personalization.name)
    .replace(/\{goal\}/g, goal);
}

async function loadStoredGoals(): Promise<string[]> {
  try {
    const rawGoals = await AsyncStorage.getItem(USER_GOALS_KEY);
    if (!rawGoals) return [];
    const parsed = JSON.parse(rawGoals);
    if (!Array.isArray(parsed)) return [];
    return normalizeGoals(parsed as GoalInput[]);
  } catch {
    return [];
  }
}

async function loadUserNameFromSupabase(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .maybeSingle();

    const profileName = profile?.name?.trim();
    if (profileName) return profileName;

    const storedName = await AsyncStorage.getItem('userName');
    return storedName?.trim() || null;
  } catch {
    return null;
  }
}

async function loadStoredLanguage(): Promise<SupportedLanguage> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return normalizeLanguage(stored ?? 'en');
  } catch {
    return 'en';
  }
}

async function getNotificationPersonalization(
  providedName?: string,
  providedGoals: GoalInput[] = [],
  providedLanguage?: SupportedLanguage,
): Promise<{ name: string; goals: string[]; language: SupportedLanguage }> {
  const language = providedLanguage ? normalizeLanguage(providedLanguage) : await loadStoredLanguage();
  const normalizedProvidedGoals = normalizeGoals(providedGoals);
  const goals = normalizedProvidedGoals.length > 0 ? normalizedProvidedGoals : await loadStoredGoals();
  const fetchedName = providedName?.trim() || (await loadUserNameFromSupabase()) || '';
  const name = normalizeName(fetchedName, language);

  return { name, goals, language };
}
