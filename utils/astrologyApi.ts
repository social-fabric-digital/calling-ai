export interface DailyAstrologyApiResponse {
  summaryForClaude?: string;
  [key: string]: unknown;
}

export interface CoordinateLookupResult {
  lat: number;
  lon: number;
  displayName?: string;
}

const ASTROLOGY_API_URL =
  'https://astrology-api-production.up.railway.app/daily-insight-data';
const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';
const TIMEZONE_BY_COORDS_URL = 'https://timeapi.io/api/TimeZone/coordinate';

const normalizeBirthDate = (value: string): string | null => {
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const slashMatch = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!slashMatch) return null;
  const year = slashMatch[1];
  const month = slashMatch[2].padStart(2, '0');
  const day = slashMatch[3].padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeBirthTime = (value: string): string | null => {
  const raw = value.trim();
  const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!hhmm) return null;
  const hours = Number.parseInt(hhmm[1], 10);
  const minutes = Number.parseInt(hhmm[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getUtcOffsetFromTimezone = (timezone?: string): number | null => {
  if (!timezone || !timezone.trim()) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const timeZoneName = parts.find((part) => part.type === 'timeZoneName')?.value || '';
    const match = timeZoneName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);
    if (!match) {
      // Fallback: derive timezone offset via local-time conversion.
      // This handles environments that return names like "Moscow Standard Time".
      const now = new Date();
      const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const fallbackOffset = (tzDate.getTime() - utcDate.getTime()) / 3600000;
      return Number.isFinite(fallbackOffset) ? Number(fallbackOffset.toFixed(2)) : null;
    }

    const sign = match[1] === '-' ? -1 : 1;
    const hours = Number.parseInt(match[2], 10);
    const minutes = Number.parseInt(match[3] || '0', 10);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return sign * (hours + minutes / 60);
  } catch (error) {
    console.warn('UTC offset conversion failed:', error);
    return null;
  }
};

export async function fetchDailyAstrologyData(
  birthDate: string,
  birthTime: string,
  birthLat: number,
  birthLon: number,
  timezone?: string
): Promise<DailyAstrologyApiResponse | null> {
  try {
    const normalizedBirthDate = normalizeBirthDate(birthDate);
    const normalizedBirthTime = normalizeBirthTime(birthTime);
    const normalizedBirthLat = Number.isFinite(birthLat) ? Number(birthLat.toFixed(6)) : NaN;
    const normalizedBirthLon = Number.isFinite(birthLon) ? Number(birthLon.toFixed(6)) : NaN;
    const utcOffset = getUtcOffsetFromTimezone(timezone);

    if (
      !normalizedBirthDate ||
      !normalizedBirthTime ||
      !Number.isFinite(normalizedBirthLat) ||
      !Number.isFinite(normalizedBirthLon) ||
      utcOffset === null
    ) {
      console.warn('[Astrology API] Invalid request payload before POST:', {
        birthDate,
        birthTime,
        birthLat,
        birthLon,
        timezone,
        normalizedBirthDate,
        normalizedBirthTime,
        normalizedBirthLat,
        normalizedBirthLon,
        utcOffset,
      });
      return null;
    }

    const requestBody = {
      birthDate: normalizedBirthDate,
      birthTime: normalizedBirthTime,
      latitude: normalizedBirthLat,
      longitude: normalizedBirthLon,
      utcOffset,
    };

    console.log('[Astrology API] POST /daily-insight-data body:', requestBody);

    const response = await fetch(ASTROLOGY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[Astrology API] Non-OK response:', {
        status: response.status,
        statusText: response.statusText,
        requestBody,
        responseText: errorText,
      });
      throw new Error('Astrology API failed');
    }

    const payload = (await response.json()) as DailyAstrologyApiResponse;
    return payload;
  } catch (error) {
    console.error('Astrology API error:', error);
    return null;
  }
}

export async function fetchCityCoordinatesByName(
  cityName: string,
  language: 'en' | 'ru' = 'en'
): Promise<CoordinateLookupResult | null> {
  try {
    const query = cityName.trim();
    if (!query) return null;

    const response = await fetch(
      `${NOMINATIM_API_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'CallingAI App',
          'Accept-Language': language === 'ru' ? 'ru,en' : 'en,ru',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim lookup failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;
    const first = payload?.[0];
    if (!first?.lat || !first?.lon) return null;

    const lat = Number.parseFloat(first.lat);
    const lon = Number.parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return {
      lat,
      lon,
      displayName: first.display_name,
    };
  } catch (error) {
    console.warn('City coordinate lookup failed:', error);
    return null;
  }
}

export async function fetchTimezoneByCoordinates(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const response = await fetch(
      `${TIMEZONE_BY_COORDS_URL}?latitude=${encodeURIComponent(String(latitude))}&longitude=${encodeURIComponent(String(longitude))}`
    );
    if (!response.ok) {
      throw new Error(`Timezone lookup failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      timeZone?: string;
      currentUtcOffset?: {
        id?: string;
      };
    };

    return payload.timeZone || payload.currentUtcOffset?.id || null;
  } catch (error) {
    console.warn('Timezone coordinate lookup failed:', error);
    return null;
  }
}
