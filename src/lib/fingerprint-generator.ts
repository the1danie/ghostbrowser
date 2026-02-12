import type { BrowserFingerprint } from './supabase';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

const SCREEN_RESOLUTIONS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 2560, height: 1440 },
  { width: 1600, height: 900 },
  { width: 1280, height: 1024 },
  { width: 1680, height: 1050 },
  { width: 3840, height: 2160 },
];

const WEBGL_RENDERERS = [
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2070 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  { vendor: 'Apple', renderer: 'Apple M1' },
  { vendor: 'Apple', renderer: 'Apple M2' },
  { vendor: 'Mesa', renderer: 'Mesa Intel(R) UHD Graphics 630 (CFL GT2)' },
];

export interface FingerprintGeoPreset {
  geoCode: string;
  geoLabel: string;
  timezone: string;
  locale: string;
  language: string;
}

export const GEO_PRESETS: FingerprintGeoPreset[] = [
  { geoCode: 'US', geoLabel: 'United States', timezone: 'America/New_York', locale: 'en-US', language: 'en-US' },
  { geoCode: 'US', geoLabel: 'United States', timezone: 'America/Chicago', locale: 'en-US', language: 'en-US' },
  { geoCode: 'US', geoLabel: 'United States', timezone: 'America/Denver', locale: 'en-US', language: 'en-US' },
  { geoCode: 'US', geoLabel: 'United States', timezone: 'America/Los_Angeles', locale: 'en-US', language: 'en-US' },
  { geoCode: 'GB', geoLabel: 'United Kingdom', timezone: 'Europe/London', locale: 'en-GB', language: 'en-GB' },
  { geoCode: 'FR', geoLabel: 'France', timezone: 'Europe/Paris', locale: 'fr-FR', language: 'fr-FR' },
  { geoCode: 'DE', geoLabel: 'Germany', timezone: 'Europe/Berlin', locale: 'de-DE', language: 'de-DE' },
  { geoCode: 'RU', geoLabel: 'Russia', timezone: 'Europe/Moscow', locale: 'ru-RU', language: 'ru-RU' },
  { geoCode: 'JP', geoLabel: 'Japan', timezone: 'Asia/Tokyo', locale: 'ja-JP', language: 'ja-JP' },
  { geoCode: 'CN', geoLabel: 'China', timezone: 'Asia/Shanghai', locale: 'zh-CN', language: 'zh-CN' },
  { geoCode: 'IN', geoLabel: 'India', timezone: 'Asia/Kolkata', locale: 'hi-IN', language: 'hi-IN' },
  { geoCode: 'AE', geoLabel: 'United Arab Emirates', timezone: 'Asia/Dubai', locale: 'ar-AE', language: 'ar-AE' },
  { geoCode: 'KZ', geoLabel: 'Kazakhstan', timezone: 'Asia/Almaty', locale: 'kk-KZ', language: 'kk-KZ' },
  { geoCode: 'AU', geoLabel: 'Australia', timezone: 'Australia/Sydney', locale: 'en-AU', language: 'en-AU' },
  { geoCode: 'NZ', geoLabel: 'New Zealand', timezone: 'Pacific/Auckland', locale: 'en-NZ', language: 'en-NZ' },
  { geoCode: 'BR', geoLabel: 'Brazil', timezone: 'America/Sao_Paulo', locale: 'pt-BR', language: 'pt-BR' },
  { geoCode: 'CA', geoLabel: 'Canada', timezone: 'America/Toronto', locale: 'en-CA', language: 'en-CA' },
];

export const TIMEZONES = GEO_PRESETS.map(p => p.timezone);

export const LOCALES: Record<string, { locale: string; language: string }> = Object.fromEntries(
  GEO_PRESETS.map(p => [p.timezone, { locale: p.locale, language: p.language }])
);

export const GEO_OPTIONS: { code: string; label: string }[] = Array.from(
  new Map(GEO_PRESETS.map(p => [p.geoCode, { code: p.geoCode, label: p.geoLabel }])).values()
);

export const LANGUAGE_OPTIONS: string[] = Array.from(
  new Set(GEO_PRESETS.map(p => p.language))
).sort();

const PLATFORMS = ['Win32', 'MacIntel', 'Linux x86_64'];

const FONTS = [
  'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Cambria Math',
  'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New',
  'Georgia', 'Helvetica', 'Impact', 'Lucida Console', 'Lucida Sans Unicode',
  'Microsoft Sans Serif', 'Palatino Linotype', 'Segoe UI', 'Tahoma',
  'Times New Roman', 'Trebuchet MS', 'Verdana', 'Wingdings',
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = randomInt(min, max);
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getDefinedOverrides(overrides?: Partial<BrowserFingerprint>): Partial<BrowserFingerprint> {
  if (!overrides) return {};
  return Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined)
  ) as Partial<BrowserFingerprint>;
}

export function getLocaleDataForTimezone(timezone: string): { locale: string; language: string } {
  return LOCALES[timezone] || { locale: 'en-US', language: 'en-US' };
}

export function generateFingerprint(overrides?: Partial<BrowserFingerprint>): BrowserFingerprint {
  const ua = randomItem(USER_AGENTS);
  const timezone = randomItem(TIMEZONES);
  const localeData = getLocaleDataForTimezone(timezone);
  const webgl = randomItem(WEBGL_RENDERERS);

  let platform: string;
  if (ua.includes('Windows')) platform = 'Win32';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) platform = 'MacIntel';
  else platform = 'Linux x86_64';

  const fingerprint: BrowserFingerprint = {
    userAgent: ua,
    screenResolution: randomItem(SCREEN_RESOLUTIONS),
    webglVendor: webgl.vendor,
    webglRenderer: webgl.renderer,
    timezone,
    locale: localeData.locale,
    language: localeData.language,
    hardwareConcurrency: randomItem([2, 4, 6, 8, 12, 16]),
    deviceMemory: randomItem([2, 4, 8, 16]),
    platform,
    doNotTrack: randomItem([null, '1']),
    canvasNoise: Math.random() * 0.05,
    audioNoise: Math.random() * 0.0001,
    webrtcPolicy: 'disable',
    fonts: randomSubset(FONTS, 10, 20),
  };

  const definedOverrides = getDefinedOverrides(overrides);
  const merged: BrowserFingerprint = { ...fingerprint, ...definedOverrides };

  if (definedOverrides.timezone && !definedOverrides.locale && !definedOverrides.language) {
    const tzLocale = getLocaleDataForTimezone(definedOverrides.timezone);
    merged.locale = tzLocale.locale;
    merged.language = tzLocale.language;
  }

  if (definedOverrides.language && !definedOverrides.locale) {
    merged.locale = definedOverrides.language;
  }

  if (definedOverrides.locale && !definedOverrides.language) {
    merged.language = definedOverrides.locale;
  }

  return merged;
}

export function generateFingerprintForProxy(
  proxyCountry?: string,
  overrides?: Partial<BrowserFingerprint>
): BrowserFingerprint {
  const countryTimezones: Record<string, string[]> = {};
  for (const preset of GEO_PRESETS) {
    if (!countryTimezones[preset.geoCode]) {
      countryTimezones[preset.geoCode] = [];
    }
    countryTimezones[preset.geoCode].push(preset.timezone);
  }

  let timezone: string | undefined;
  if (proxyCountry) {
    const tzs = countryTimezones[proxyCountry.toUpperCase()];
    if (tzs) timezone = randomItem(tzs);
  }

  return generateFingerprint({ timezone, ...overrides });
}
