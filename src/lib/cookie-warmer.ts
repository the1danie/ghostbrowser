export interface WarmerProxyConfig {
  protocol: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface CookieWarmerConfig {
  profileId: string;
  urls: string[];
  minTimePerSite: number;
  maxTimePerSite: number;
  maxClicks: number;
  humanEmulation: boolean;
  proxy?: WarmerProxyConfig;
}

export const WARMER_CATEGORIES: Record<string, string[]> = {
  social: [
    'https://www.facebook.com',
    'https://www.instagram.com',
    'https://twitter.com',
    'https://www.linkedin.com',
    'https://www.reddit.com',
    'https://www.tiktok.com',
    'https://www.pinterest.com',
    'https://www.tumblr.com',
    'https://www.snapchat.com',
    'https://discord.com',
  ],
  marketplaces: [
    'https://www.amazon.com',
    'https://www.ebay.com',
    'https://www.etsy.com',
    'https://www.walmart.com',
    'https://www.aliexpress.com',
    'https://www.target.com',
    'https://www.bestbuy.com',
    'https://www.homedepot.com',
    'https://www.costco.com',
    'https://www.wayfair.com',
  ],
  news: [
    'https://news.google.com',
    'https://www.bbc.com',
    'https://www.cnn.com',
    'https://www.nytimes.com',
    'https://www.reuters.com',
    'https://www.theguardian.com',
    'https://www.washingtonpost.com',
    'https://www.forbes.com',
    'https://www.bloomberg.com',
    'https://www.huffpost.com',
  ],
  entertainment: [
    'https://www.netflix.com',
    'https://www.twitch.tv',
    'https://www.spotify.com',
    'https://www.imdb.com',
    'https://www.rottentomatoes.com',
    'https://www.hulu.com',
    'https://music.apple.com',
    'https://soundcloud.com',
    'https://www.deezer.com',
  ],
  general: [
    'https://www.google.com',
    'https://www.bing.com',
    'https://www.yahoo.com',
    'https://www.wikipedia.org',
    'https://www.weather.com',
    'https://www.quora.com',
    'https://stackoverflow.com',
    'https://www.github.com',
    'https://www.medium.com',
    'https://www.msn.com',
  ],
};

  export function getUrlsByCategories(categories: string[]): string[] {
    const urls: string[] = [];
    for (const cat of categories) {
      const catUrls = WARMER_CATEGORIES[cat];
      if (catUrls) urls.push(...catUrls);
    }
    return Array.from(new Set(urls));
}

export function getAllWarmupUrls(): string[] {
  return getUrlsByCategories(Object.keys(WARMER_CATEGORIES));
}

export function parseNetscapeCookies(text: string): any[] {
  const cookies: any[] = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 7) continue;
    cookies.push({
      domain: parts[0],
      httpOnly: parts[1] === 'TRUE',
      path: parts[2],
      secure: parts[3] === 'TRUE',
      expires: parseInt(parts[4]) || -1,
      name: parts[5],
      value: parts[6],
    });
  }
  return cookies;
}

export function parseCookiesJSON(text: string): any[] {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// The actual warming is done via IPC to the Electron main process
// which manages Playwright browser instances
export interface WarmingProgress {
  currentUrl: string;
  currentIndex: number;
  totalUrls: number;
  status: 'running' | 'done' | 'error' | 'stopped';
  /** Текущая фаза: загрузка, скролл, клики и т.д. — чтобы было видно, что процесс идёт */
  phase?: string;
  error?: string;
}
