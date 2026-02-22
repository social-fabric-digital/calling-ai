import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAstrologyReport, generatePersonalizedDailyInsight, PersonalizedDailyInsightParams, PersonalAstrologyReport } from './claudeApi';
import i18n from './i18n';
import { fetchCityCoordinatesByName, fetchTimezoneByCoordinates } from './astrologyApi';

// ── Astrology Cache ──
// Instead of generating a unique report per user, cache by sun sign + date.
// 12 signs × 1 report/day = 12 API calls/day total, regardless of user count.

const ASTROLOGY_CACHE_TABLE = 'astrology_cache';

const INSIGHT_CACHE_VERSION = 'v5';

const getLocalizedTodayKey = (timezone?: string): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value || '0000';
  const month = parts.find((p) => p.type === 'month')?.value || '00';
  const day = parts.find((p) => p.type === 'day')?.value || '00';
  return `${year}-${month}-${day}`;
};

const buildGenericSupportiveInsight = (): string => {
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  if (isRussian) {
    return [
      'Твой Космический Щит на Сегодня',
      'Сегодня твой лучший подход - бережный темп и одна четкая задача за раз. Ты не обязан(а) сделать все сразу: спокойный фокус уже дает движение вперед. Даже небольшие шаги сегодня работают на твою устойчивость.',
      '',
      'Что Вселенная Хочет, Чтобы Ты Знал(а)',
      'Если почувствуешь тревогу или раздражение, не принимай быстрых решений на пике эмоций. Сделай паузу, подыши, вернись к самому важному. Избегай сравнения себя с другими - твой ритм достаточно хорош.',
      '',
      'Твои Защищённые Окна',
      '- Morning (before 11am): Начни с одной посильной задачи и не перегружай утро.',
      '- Midday (11am-3pm): Держи границы и делай короткие паузы перед ответами и решениями.',
      '- Evening (after 6pm): Сбавь темп и выбери спокойное восстановление вместо самокритики.',
      '',
      'Мягкое Завершение Вечера',
      'Перед сном спроси себя: что сегодня было достаточно хорошо? Разреши себе отпустить незавершенное и вернуться к этому завтра.',
      '',
      'Твой Якорь на Сегодня',
      'Я двигаюсь мягко, уверенно и в своем ритме.',
    ].join('\n');
  }

  return [
    'Your Cosmic Shield for Today',
    'Today works best when you move gently and focus on one clear priority at a time. You do not need to solve everything at once for this day to be meaningful. Small steady actions are enough and they count.',
    '',
    'What the Universe Wants You to Know',
    'If anxiety or irritability rises, pause before making fast decisions. Keep communication simple and avoid overexplaining yourself when you are overwhelmed. Protect your energy from comparison and noise.',
    '',
    'Your Protected Windows',
    '- Morning (before 11am): Start with one practical task and avoid multitasking.',
    '- Midday (11am-3pm): Use short pauses before important replies or decisions.',
    '- Evening (after 6pm): Choose recovery over pressure and close the day with kindness.',
    '',
    "Tonight's Gentle Landing",
    'Before sleep, ask yourself what was enough for today. Let unfinished things rest and give yourself permission to continue tomorrow.',
    '',
    'Your Anchor for Today',
    'I move with calm focus, one step at a time.',
  ].join('\n');
};

/**
 * Calculate sun sign from birth month and date
 */
export function getSunSign(birthMonth: string, birthDate: string): string {
  const month = parseInt(birthMonth);
  const day = parseInt(birthDate);
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Pisces';
  return 'Aries'; // Default fallback
}

/**
 * Get a representative birth date for a sun sign (middle of the sign's date range)
 */
function getRepresentativeBirthDate(sunSign: string): { month: string; date: string; year: string } {
  const sign = sunSign.toLowerCase().trim();
  const currentYear = new Date().getFullYear();
  
  // Return a birth date in the middle of each sign's date range
  switch (sign) {
    case 'aries': return { month: '4', date: '5', year: String(currentYear - 30) };
    case 'taurus': return { month: '5', date: '10', year: String(currentYear - 30) };
    case 'gemini': return { month: '6', date: '5', year: String(currentYear - 30) };
    case 'cancer': return { month: '7', date: '5', year: String(currentYear - 30) };
    case 'leo': return { month: '8', date: '5', year: String(currentYear - 30) };
    case 'virgo': return { month: '9', date: '5', year: String(currentYear - 30) };
    case 'libra': return { month: '10', date: '5', year: String(currentYear - 30) };
    case 'scorpio': return { month: '11', date: '5', year: String(currentYear - 30) };
    case 'sagittarius': return { month: '12', date: '5', year: String(currentYear - 30) };
    case 'capricorn': return { month: '1', date: '5', year: String(currentYear - 30) };
    case 'aquarius': return { month: '2', date: '5', year: String(currentYear - 30) };
    case 'pisces': return { month: '3', date: '5', year: String(currentYear - 30) };
    default: return { month: '4', date: '5', year: String(currentYear - 30) }; // Default to Aries
  }
}

/**
 * Get today's astrology report for a sun sign.
 * Returns cached version if available, generates and caches if not.
 */
export async function getCachedAstrologyReport(
  sunSign: string,
  birthDate?: string,
  birthTime?: string,
  birthPlace?: string,
): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  const signKey = sunSign.toLowerCase().trim();

  // 1. Check cache first
  try {
    const { data, error } = await supabase
      .from(ASTROLOGY_CACHE_TABLE)
      .select('report')
      .eq('sun_sign', signKey)
      .eq('report_date', today)
      .single();

    if (data?.report && !error) {
      return data.report;
    }
  } catch {
    // Cache miss — that's fine, we'll generate
  }

  // 2. Cache miss — generate a fresh report
  // Use representative birth data for this sign since this is shared across all users with this sign
  const representativeDate = getRepresentativeBirthDate(signKey);
  
  // Parse birthTime if provided (format: "HH:MM AM/PM" or similar)
  let birthHour: string | undefined;
  let birthMinute: string | undefined;
  let birthPeriod: string | undefined;
  
  if (birthTime) {
    // Simple parsing - adjust if your format differs
    const timeMatch = birthTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i);
    if (timeMatch) {
      birthHour = timeMatch[1];
      birthMinute = timeMatch[2];
      birthPeriod = timeMatch[3].toUpperCase();
    }
  }
  
  const report = await generateAstrologyReport(
    representativeDate.month,
    representativeDate.date,
    representativeDate.year,
    birthPlace,
    birthHour,
    birthMinute,
    birthPeriod,
  );

  // 3. Save to cache (fire and forget — don't block the user)
  try {
    await supabase
      .from(ASTROLOGY_CACHE_TABLE)
      .upsert(
        {
          sun_sign: signKey,
          report_date: today,
          report: report,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'sun_sign,report_date' }
      );
  } catch (err) {
    console.warn('Failed to cache astrology report:', err);
  }

  return report;
}

/**
 * Get personalized daily insight for a user.
 * Caches locally per user per day (since each report is unique to the user's birth chart).
 */
export async function getPersonalizedDailyInsight(
  params: PersonalizedDailyInsightParams
): Promise<string> {
  // Always prefer the device timezone for "today" boundaries so daily insight
  // flips with the user's local calendar day.
  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const currentTimezone =
    deviceTimezone ||
    params.currentTimezone ||
    (await AsyncStorage.getItem('currentTimezone')) ||
    'UTC';
  const today = getLocalizedTodayKey(currentTimezone);
  const hasBirthDate = Boolean(params.birthMonth && params.birthDate && params.birthYear);

  const cacheKey = `personalized-insight-${INSIGHT_CACHE_VERSION}-${params.birthMonth || 'na'}-${params.birthDate || 'na'}-${params.birthYear || 'na'}-${today}`;

  try {
    const cachedReport = await AsyncStorage.getItem(cacheKey);
    if (cachedReport) {
      console.log('✅ Found cached personalized insight for today!');
      return cachedReport;
    }
  } catch (error) {
    console.warn('Error checking cache:', error);
  }

  if (!hasBirthDate) {
    const fallback = buildGenericSupportiveInsight();
    await AsyncStorage.setItem(cacheKey, fallback).catch(() => {});
    return fallback;
  }

  let resolvedLatitude = params.birthLatitude;
  let resolvedLongitude = params.birthLongitude;
  let resolvedBirthTimezone = params.birthTimezone;

  const hasCoordinates =
    typeof resolvedLatitude === 'number' &&
    Number.isFinite(resolvedLatitude) &&
    typeof resolvedLongitude === 'number' &&
    Number.isFinite(resolvedLongitude);

  if (!hasCoordinates && params.birthCity) {
    const cityCoordinates = await fetchCityCoordinatesByName(
      params.birthCity,
      i18n.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en'
    );
    if (cityCoordinates) {
      resolvedLatitude = cityCoordinates.lat;
      resolvedLongitude = cityCoordinates.lon;
      await AsyncStorage.multiSet([
        ['birthLatitude', String(cityCoordinates.lat)],
        ['birthLongitude', String(cityCoordinates.lon)],
      ]).catch(() => {});
    }
  }

  const hasResolvedCoordinates =
    typeof resolvedLatitude === 'number' &&
    Number.isFinite(resolvedLatitude) &&
    typeof resolvedLongitude === 'number' &&
    Number.isFinite(resolvedLongitude);

  if (!resolvedBirthTimezone && hasResolvedCoordinates) {
    resolvedBirthTimezone = await fetchTimezoneByCoordinates(
      resolvedLatitude as number,
      resolvedLongitude as number
    );
    if (resolvedBirthTimezone) {
      await AsyncStorage.setItem('birthTimezone', resolvedBirthTimezone).catch(() => {});
    }
  }

  let report = '';
  try {
    console.log('🔮 Generating NEW personalized daily insight...');
    report = await generatePersonalizedDailyInsight({
      ...params,
      birthLatitude: resolvedLatitude,
      birthLongitude: resolvedLongitude,
      birthTimezone: resolvedBirthTimezone,
      currentTimezone,
    });
  } catch (error) {
    console.warn('Using generic fallback after personalized generation failure:', error);
    report = buildGenericSupportiveInsight();
  }

  try {
    await AsyncStorage.setItem(cacheKey, report);
    console.log('💾 Personalized insight saved to cache');
  } catch (err) {
    console.warn('Failed to cache personalized insight:', err);
  }

  return report;
}

/**
 * Pre-generate all 12 sign reports for today.
 * Call this from a daily cron, background task, or on app startup.
 * Total cost: 12 Haiku calls = ~$0.005/day
 */
export async function preGenerateAllReports(): Promise<void> {
  const signs = [
    'aries', 'taurus', 'gemini', 'cancer',
    'leo', 'virgo', 'libra', 'scorpio',
    'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];

  const today = new Date().toISOString().split('T')[0];

  for (const sign of signs) {
    try {
      // Check if already cached
      const { data } = await supabase
        .from(ASTROLOGY_CACHE_TABLE)
        .select('id')
        .eq('sun_sign', sign)
        .eq('report_date', today)
        .single();

      if (data) continue; // Already cached, skip

      // Use representative birth date for this sign
      const representativeDate = getRepresentativeBirthDate(sign);
      
      const report = await generateAstrologyReport(
        representativeDate.month,
        representativeDate.date,
        representativeDate.year,
      );

      await supabase
        .from(ASTROLOGY_CACHE_TABLE)
        .upsert(
          {
            sun_sign: sign,
            report_date: today,
            report: report,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'sun_sign,report_date' }
        );

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.warn(`Failed to pre-generate report for ${sign}:`, err);
    }
  }
}
