import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import { app } from 'electron';
import { generateInjectionScript } from '../src/lib/fingerprint-injector';
import type { BrowserFingerprint } from '../src/lib/supabase';
import type { CookieWarmerConfig, WarmingProgress } from '../src/lib/cookie-warmer';

interface RunningProfile {
  profileId: string;
  context: BrowserContext | null;
  browser: Browser | null;
  process: ChildProcess | null; // Chrome process when using Stealthy CDP mode
  proxyServer: string | null;
  pid: number;
  startedAt: number;
  userDataDir: string;
}

interface ProfileData {
  id: string;
  fingerprint: BrowserFingerprint;
  proxy?: {
    protocol: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  cookies?: any[];
  user_data_path?: string;
}

export type ProfileClosedCallback = (profileId: string, cookies: any[]) => void;

export class BrowserManager {
  private running = new Map<string, RunningProfile>();
  private warmingAbort = new Map<string, boolean>();
  private onProfileClosed: ProfileClosedCallback | null = null;

  private async lookupGeoByIp(ip: string): Promise<{ country: string | null; city: string | null }> {
    const endpoints = [
      `https://ipapi.co/${ip}/json/`,
      `https://ipwho.is/${ip}`,
      `http://ip-api.com/json/${ip}?fields=status,countryCode,city`,
    ];

    for (const endpoint of endpoints) {
      const payload = await requestJson(endpoint, 10000);
      if (!payload || typeof payload !== 'object') continue;

      const rawCountry =
        payload.country_code ||
        payload.countryCode ||
        payload.country ||
        null;

      const rawCity = payload.city || null;

      const country = normalizeCountryCode(rawCountry);
      const city = typeof rawCity === 'string' ? rawCity : null;

      if (country || city) {
        return { country, city };
      }
    }

    return { country: null, city: null };
  }

  /** Register a callback that fires when a browser is closed externally (user closed the window) */
  setOnProfileClosed(cb: ProfileClosedCallback): void {
    this.onProfileClosed = cb;
  }

  private getProfileDir(profileId: string, ensureExists = true): string {
    const baseDir = path.join(app.getPath('userData'), 'browser-profiles');
    const profileDir = path.join(baseDir, profileId);
    if (ensureExists && !fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }
    return profileDir;
  }

  async deleteProfileData(profileId: string): Promise<void> {
    if (this.running.has(profileId)) {
      await this.closeProfile(profileId).catch(() => {});
    }

    const profileDir = this.getProfileDir(profileId, false);
    if (fs.existsSync(profileDir)) {
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
  }

  cleanupOrphanProfileData(keepProfileIds: string[]): { removed: string[] } {
    const baseDir = path.join(app.getPath('userData'), 'browser-profiles');
    if (!fs.existsSync(baseDir)) {
      return { removed: [] };
    }

    const keepSet = new Set(keepProfileIds);
    for (const runningId of this.running.keys()) {
      keepSet.add(runningId);
    }

    const removed: string[] = [];
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const id = entry.name;
      if (keepSet.has(id)) continue;

      const dirPath = path.join(baseDir, id);
      fs.rmSync(dirPath, { recursive: true, force: true });
      removed.push(id);
    }

    return { removed };
  }

  async launchProfile(data: ProfileData): Promise<{ pid: number }> {
    if (this.running.has(data.id)) {
      throw new Error('Profile is already running');
    }

    const userDataDir = this.getProfileDir(data.id);
    const screenW = data.fingerprint.screenResolution?.width || 1920;
    const screenH = data.fingerprint.screenResolution?.height || 1080;

    // --- Proxy verification ---
    let effectiveProxy = data.proxy;
    if (data.proxy) {
      console.log('[GhostBrowser] Verifying proxy before launch...');
      const probe = await withTimeout(this.checkProxy(data.proxy, { includeGeo: false }), 30000);
      if (!probe.isValid) {
        throw new Error(`Proxy check failed (${data.proxy.host}:${data.proxy.port}): ${probe.error || 'Proxy is not reachable'}`);
      }
      if (probe.usedProtocol && probe.usedProtocol !== data.proxy.protocol) {
        effectiveProxy = { ...data.proxy, protocol: probe.usedProtocol };
        console.log(`[GhostBrowser] Proxy protocol adjusted: ${data.proxy.protocol} -> ${probe.usedProtocol}`);
      }
    }

    const injectionScript = generateInjectionScript(data.fingerprint);
    const validCookies = (data.cookies || [])
      .filter((c: any) => c.name && c.domain)
      .map((c: any) => ({
        name: c.name,
        value: c.value || '',
        domain: c.domain,
        path: c.path || '/',
        secure: c.secure || false,
        httpOnly: c.httpOnly || false,
        expires: c.expires && c.expires > 0 ? c.expires : undefined,
        sameSite: (c.sameSite || 'Lax') as 'Strict' | 'Lax' | 'None',
      }));

    // --- Stealthy Playwright Mode: spawn Chrome with remote-debugging-port, then connect via CDP ---
    // Browser is launched by us (not Playwright), so no automation detection flags.
    // See playwright.md (SeleniumBase Stealthy Playwright Mode).
    const chromePath = findSystemChrome();
    if (!chromePath) {
      throw new Error('Google Chrome not found. Install Chrome for Stealthy mode.');
    }

    const debugPort = 9222 + this.running.size;
    const launchArgs: string[] = [
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${debugPort}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      `--window-size=${screenW},${screenH}`,
      '--disable-quic',
      `--lang=${data.fingerprint.language}`,
    ];

    if (effectiveProxy) {
      launchArgs.push(
        `--proxy-server=${effectiveProxy.protocol}://${effectiveProxy.host}:${effectiveProxy.port}`,
        '--proxy-bypass-list=<-loopback>',
        '--disable-http2',
        '--dns-prefetch-disable'
      );
      console.log('[GhostBrowser] Proxy config:', {
        server: `${effectiveProxy.protocol}://${effectiveProxy.host}:${effectiveProxy.port}`,
        hasAuth: !!(effectiveProxy.username && effectiveProxy.password),
      });
    } else {
      console.log('[GhostBrowser] No proxy configured');
    }

    console.log('[GhostBrowser] Stealthy mode: spawning Chrome with CDP...');
    const proc = spawn(chromePath, launchArgs, {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!proc.pid) {
      throw new Error('Failed to spawn Chrome');
    }

    proc.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (line) console.log(`[Chrome:${proc.pid}] ${line}`);
    });

    const cdpEndpoint = `http://127.0.0.1:${debugPort}`;
    await waitForCDPPort(cdpEndpoint, 15000);

    const browser = await chromium.connectOverCDP(cdpEndpoint);
    const contexts = browser.contexts();
    const context = contexts[0] || await browser.newContext({
      locale: data.fingerprint.locale || 'en-US',
      timezoneId: data.fingerprint.timezone || 'America/New_York',
    });

    context.addInitScript(injectionScript);

    if (validCookies.length > 0) {
      try {
        const cookiePayloads = validCookies
          .filter((c: any) => c.name && c.domain && c.domain.trim() !== '')
          .map((c: any) => {
            const domain = (c.domain || '').replace(/^\\./, '').trim();
            const url = 'http' + (c.secure ? 's' : '') + '://' + domain + (c.path || '/');
            return { url, name: c.name, value: c.value, path: c.path || '/', secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite, expires: c.expires };
          });
        if (cookiePayloads.length > 0) {
          await context.addCookies(cookiePayloads);
        }
      } catch (cookieErr: any) {
        console.warn('[GhostBrowser] Failed to restore cookies:', cookieErr?.message);
      }
    }

    const pages = context.pages();
    const page = pages[0] || await context.newPage();
    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

    console.log(`[GhostBrowser] Chrome launched (Stealthy CDP) PID ${proc.pid}`);

    const profileEntry: RunningProfile = {
      profileId: data.id,
      context,
      browser,
      process: proc,
      proxyServer: effectiveProxy ? `${effectiveProxy.protocol}://${effectiveProxy.host}:${effectiveProxy.port}` : null,
      pid: proc.pid,
      startedAt: Date.now(),
      userDataDir,
    };

    this.running.set(data.id, profileEntry);

    proc.on('exit', (code?: number) => {
      console.log(`[GhostBrowser] Chrome process exited (code: ${code})`);
      if (!this.running.has(data.id)) return;
      this.running.delete(data.id);
      if (this.onProfileClosed) this.onProfileClosed(data.id, []);
    });

    return { pid: proc.pid };
  }

  async closeProfile(profileId: string): Promise<any[]> {
    const instance = this.running.get(profileId);
    if (!instance) throw new Error('Profile is not running');

    this.running.delete(profileId);

    const userDataDir = instance.userDataDir;
    let cookies: any[] = [];
    try {
      if (instance.context) {
        await instance.context.storageState({ path: path.join(userDataDir, 'state.json') });
        cookies = await instance.context.cookies();
      }
    } catch {}

    await instance.context?.close().catch(() => {});
    await instance.browser?.close().catch(() => {});

    if (instance.process) {
      instance.process.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          instance.process?.kill('SIGKILL');
          resolve();
        }, 5000);
        instance.process?.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    return cookies;
  }

  getRunningProfiles(): { profileId: string; pid: number; startedAt: number }[] {
    return Array.from(this.running.values()).map(r => ({
      profileId: r.profileId,
      pid: r.pid,
      startedAt: r.startedAt,
    }));
  }

  async closeAll(): Promise<void> {
    const ids = Array.from(this.running.keys());
    for (const id of ids) {
      try {
        await this.closeProfile(id);
      } catch {}
    }
  }

  async warmCookies(
    config: CookieWarmerConfig,
    onProgress: (progress: WarmingProgress) => void
  ): Promise<void> {
    this.warmingAbort.set(config.profileId, false);

    // We need to get the running profile or launch a temporary one
    const requestedProxyServer = config.proxy
      ? `${config.proxy.protocol}://${config.proxy.host}:${config.proxy.port}`
      : null;
    let instance = this.running.get(config.profileId);

    // For subprocess-based profiles (context is null), always launch a temp browser
    const shouldUseRunningInstance = !!instance && !!instance.context && (
      !requestedProxyServer || instance.proxyServer === requestedProxyServer
    );
    let tempBrowser: Browser | null = null;
    let tempContext: BrowserContext | null = null;

    if (!shouldUseRunningInstance) {
      if (instance && instance.context && requestedProxyServer && instance.proxyServer !== requestedProxyServer) {
        console.log('[GhostBrowser] Running profile proxy differs from cookie warmer proxy. Launching dedicated warmer browser.');
      }

      const launchArgs: string[] = [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-quic',
      ];
      const launchOptions: any = {
        headless: true,
        args: launchArgs,
      };

      let effectiveProxy = config.proxy;
      if (config.proxy) {
        console.log('[GhostBrowser] Verifying proxy for cookie warming...');
        const probe = await withTimeout(this.checkProxy(config.proxy, { includeGeo: false }), 30000);
        if (!probe.isValid) {
          throw new Error(`Cookie warmer proxy check failed (${config.proxy.host}:${config.proxy.port}): ${probe.error || 'Proxy is not reachable'}`);
        }
        if (probe.usedProtocol && probe.usedProtocol !== config.proxy.protocol) {
          effectiveProxy = { ...config.proxy, protocol: probe.usedProtocol };
          console.log(`[GhostBrowser] Cookie warmer proxy protocol adjusted: ${config.proxy.protocol} -> ${probe.usedProtocol}`);
        }
      }

      if (effectiveProxy) {
        launchArgs.push('--disable-http2', '--dns-prefetch-disable', '--proxy-bypass-list=<-loopback>');
        launchOptions.proxy = {
          server: `${effectiveProxy.protocol}://${effectiveProxy.host}:${effectiveProxy.port}`,
          username: effectiveProxy.username || undefined,
          password: effectiveProxy.password || undefined,
        };
        console.log('[GhostBrowser] Cookie warmer proxy config:', {
          server: launchOptions.proxy.server,
          hasAuth: !!(effectiveProxy.username && effectiveProxy.password),
        });
      } else {
        console.log('[GhostBrowser] Cookie warmer without proxy');
      }

      // Launch a headless browser for warming with anti-detection args
      tempBrowser = await withTimeout(chromium.launch(launchOptions), 20000);
      tempContext = await withTimeout(tempBrowser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      }), 15000);
      instance = {
        profileId: config.profileId,
        context: tempContext,
        browser: tempBrowser,
        process: null,
        proxyServer: launchOptions.proxy?.server || null,
        pid: ((tempBrowser as any)?.process?.() as any)?.pid ?? 0,
        startedAt: Date.now(),
        userDataDir: this.getProfileDir(config.profileId),
      };
    } else {
      console.log('[GhostBrowser] Cookie warmer using running profile context');
    }

    const { context } = instance!;
    if (!context) {
      throw new Error('No browser context available for cookie warming');
    }

    for (let i = 0; i < config.urls.length; i++) {
      if (this.warmingAbort.get(config.profileId)) {
        onProgress({
          currentUrl: config.urls[i],
          currentIndex: i,
          totalUrls: config.urls.length,
          status: 'stopped',
        });
        break;
      }

      const url = config.urls[i];
      onProgress({
        currentUrl: url,
        currentIndex: i,
        totalUrls: config.urls.length,
        status: 'running',
        phase: 'Loading page…',
      });

      let page: Page | null = null;
      try {
        page = await context.newPage();
        // Short timeout — skip slow sites instead of hanging
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        const timeOnSite = randomInt(config.minTimePerSite, config.maxTimePerSite) * 1000;
        const endTime = Date.now() + timeOnSite;

        if (config.humanEmulation) {
          onProgress({
            currentUrl: url,
            currentIndex: i,
            totalUrls: config.urls.length,
            status: 'running',
            phase: 'Scrolling & moving…',
          });
          // Random scrolling — each operation has a timeout guard
          while (Date.now() < endTime) {
            if (this.warmingAbort.get(config.profileId)) break;

            try {
              const action = Math.random();
              if (action < 0.4) {
                await withTimeout(page.mouse.wheel(0, randomInt(100, 400)), 3000);
              } else if (action < 0.7) {
                const vp = page.viewportSize();
                if (vp) {
                  await withTimeout(
                    page.mouse.move(randomInt(50, vp.width - 50), randomInt(50, vp.height - 50), {
                      steps: randomInt(5, 10),
                    }),
                    3000
                  );
                }
              }
            } catch {
              // Mouse operation timed out or page is gone — move on
              break;
            }
            onProgress({
              currentUrl: url,
              currentIndex: i,
              totalUrls: config.urls.length,
              status: 'running',
              phase: 'Scrolling & moving…',
            });
            await sleep(randomInt(300, 1000));
          }

          // Random clicks (navigate within site)
          const clicks = randomInt(0, config.maxClicks);
          for (let c = 0; c < clicks; c++) {
            if (this.warmingAbort.get(config.profileId)) break;
            onProgress({
              currentUrl: url,
              currentIndex: i,
              totalUrls: config.urls.length,
              status: 'running',
              phase: `Clicking link ${c + 1}/${clicks}…`,
            });
            try {
              const links = await withTimeout(page.$$('a[href]:not([href^="javascript"])'), 3000);
              if (links.length > 0) {
                const link = links[randomInt(0, Math.min(links.length - 1, 15))];
                const visible = await link.isVisible().catch(() => false);
                if (visible) {
                  await withTimeout(link.click({ delay: randomInt(50, 150) }), 5000);
                  await page.waitForLoadState('domcontentloaded').catch(() => {});
                  await sleep(randomInt(1000, 2000));
                }
              }
            } catch {
              break;
            }
          }
        } else {
          onProgress({
            currentUrl: url,
            currentIndex: i,
            totalUrls: config.urls.length,
            status: 'running',
            phase: 'Waiting on page…',
          });
          await sleep(timeOnSite);
        }
      } catch (err: any) {
        // Site load error — skip and continue to next URL
      } finally {
        if (page) {
          await page.close().catch(() => {});
          page = null;
        }
      }
    }

    // Save cookies from warming
    onProgress({
      currentUrl: '',
      currentIndex: config.urls.length,
      totalUrls: config.urls.length,
      status: 'running',
      phase: 'Saving cookies…',
    });
    const userDataDir = this.getProfileDir(config.profileId);
    try {
      await context.storageState({ path: path.join(userDataDir, 'state.json') });
    } catch {}

    if (tempBrowser) {
      await tempContext?.close().catch(() => {});
      await tempBrowser.close().catch(() => {});
    }

    this.warmingAbort.delete(config.profileId);

    onProgress({
      currentUrl: '',
      currentIndex: config.urls.length,
      totalUrls: config.urls.length,
      status: 'done',
    });
  }

  stopWarming(profileId: string): void {
    this.warmingAbort.set(profileId, true);
  }

  async checkProxy(proxyData: any, options?: { includeGeo?: boolean }): Promise<{
    isValid: boolean;
    ip: string | null;
    country: string | null;
    city: string | null;
    latencyMs: number | null;
    error: string | null;
    usedProtocol?: string;
  }> {
    const start = Date.now();
    const includeGeo = options?.includeGeo ?? true;

    const tryWithProtocol = async (protocol: string) => {
      let browser: Browser | null = null;
      let context: BrowserContext | null = null;
      try {
        browser = await withTimeout(chromium.launch({
          headless: true,
          args: ['--disable-quic'],
          proxy: {
            server: `${protocol}://${proxyData.host}:${proxyData.port}`,
            username: proxyData.username ?? undefined,
            password: proxyData.password ?? undefined,
          },
        }), 12000);

        context = await withTimeout(browser.newContext(), 5000);
        const page = await withTimeout(context.newPage(), 5000);
        const response = await page.goto('https://api.ipify.org?format=json', { timeout: 15000 });

        if (!response || !response.ok()) {
          return null;
        }

        const data = await response.json();
        const latency = Date.now() - start;

        let country: string | null = null;
        let city: string | null = null;
        if (includeGeo) {
          const geo = await this.lookupGeoByIp(data.ip);
          country = geo.country;
          city = geo.city;
        }

        return { ip: data.ip, country, city, latencyMs: latency, usedProtocol: protocol };
      } catch (err: any) {
        throw new Error(err?.message || 'Proxy check failed');
      } finally {
        await context?.close().catch(() => {});
        await browser?.close().catch(() => {});
      }
    };

    const primary = (proxyData.protocol || 'http').toLowerCase();
    const toTry =
      primary === 'https' ? ['https', 'http']
      : primary === 'http' ? ['http', 'https']
      : [primary];

    let lastError = '';
    for (const protocol of toTry) {
      try {
        const result = await tryWithProtocol(protocol);
        if (result) {
          return {
            isValid: true,
            ip: result.ip,
            country: result.country,
            city: result.city,
            latencyMs: result.latencyMs,
            error: null,
            usedProtocol: protocol,
          };
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }
    return {
      isValid: false,
      ip: null,
      country: null,
      city: null,
      latencyMs: null,
      error: lastError || 'Proxy not reachable',
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function requestJson(url: string, timeoutMs = 10000): Promise<any | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: any | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    try {
      const parsed = new URL(url);
      const client = parsed.protocol === 'http:' ? http : https;
      const req = client.get(
        parsed,
        {
          headers: {
            'User-Agent': 'GhostBrowser/1.0',
            Accept: 'application/json',
          },
        },
        (res) => {
          const statusCode = res.statusCode || 0;
          if (statusCode < 200 || statusCode >= 300) {
            res.resume();
            finish(null);
            return;
          }

          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              finish(JSON.parse(body));
            } catch {
              finish(null);
            }
          });
        }
      );

      req.setTimeout(timeoutMs, () => {
        req.destroy();
        finish(null);
      });
      req.on('error', () => finish(null));
    } catch {
      finish(null);
    }
  });
}

function normalizeCountryCode(raw: any): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return null;
}

async function waitForCDPPort(endpoint: string, timeoutMs: number): Promise<void> {
  const base = endpoint.replace(/\/$/, '');
  const url = `${base}/json/version`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json?.webSocketDebuggerUrl) return;
      }
    } catch {}
    await sleep(200);
  }
  throw new Error(`CDP endpoint ${endpoint} not ready after ${timeoutMs}ms`);
}

function findSystemChrome(): string | null {
  const candidates: string[] =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ]
      : process.platform === 'win32'
        ? [
            path.join(process.env['PROGRAMFILES'] || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(process.env['LOCALAPPDATA'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
          ]
        : [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/snap/bin/chromium',
          ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      console.log('[GhostBrowser] Using Chrome:', candidate);
      return candidate;
    }
  }
  return null;
}
