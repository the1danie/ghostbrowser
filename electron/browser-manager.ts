import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { generateInjectionScript } from '../src/lib/fingerprint-injector';
import type { BrowserFingerprint } from '../src/lib/supabase';
import type { CookieWarmerConfig, WarmingProgress } from '../src/lib/cookie-warmer';

interface RunningProfile {
  profileId: string;
  context: BrowserContext;
  browser: Browser | null;
  proxyServer: string | null;
  pid: number;
  startedAt: number;
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

    const launchArgs: string[] = [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      // Many authenticated proxies hang on Google endpoints with QUIC enabled.
      '--disable-quic',
    ];

    const launchOptions: any = {
      headless: false,
      args: launchArgs,
      userAgent: data.fingerprint.userAgent,
      viewport: null,
      locale: data.fingerprint.locale,
      timezoneId: data.fingerprint.timezone,
      colorScheme: 'dark',
      ignoreHTTPSErrors: true,
    };

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

    if (effectiveProxy) {
      launchArgs.push(
        // Avoid Google account/profile bootstrap over unstable proxies.
        '--disable-sync',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-http2',
        '--dns-prefetch-disable',
        '--disable-features=AutofillServerCommunication,MediaRouter,OptimizationHints,SigninIntercept,Sync',
      );
      launchOptions.proxy = {
        server: `${effectiveProxy.protocol}://${effectiveProxy.host}:${effectiveProxy.port}`,
        username: effectiveProxy.username || undefined,
        password: effectiveProxy.password || undefined,
      };
      // Весь трафик через прокси, без обхода (как в обычном браузере)
      launchArgs.push('--proxy-bypass-list=<-loopback>');
      console.log('[GhostBrowser] Proxy config:', { server: launchOptions.proxy.server, hasAuth: !!(effectiveProxy.username && effectiveProxy.password) });
    } else {
      console.log('[GhostBrowser] No proxy configured');
    }

    console.log('[GhostBrowser] Launching persistent profile...');
    const context = await withTimeout(chromium.launchPersistentContext(userDataDir, launchOptions), 25000);
    const browser = context.browser();
    console.log('[GhostBrowser] Persistent context created OK');

    // Inject fingerprint script before any page loads
    const injectionScript = generateInjectionScript(data.fingerprint);
    await context.addInitScript(injectionScript);
    console.log('[GhostBrowser] Fingerprint injected');

    // Debug: track request timing to see why loads are slow or hanging
    type ReqData = { start: number; timeout: NodeJS.Timeout };
    const requestData = new Map<any, ReqData>();

    context.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      const shortUrl = url.length > 90 ? url.substring(0, 90) + '…' : url;
      const now = Date.now();
      console.log(`[GhostBrowser] → Request START: ${method} ${shortUrl}`);

      const t = setTimeout(() => {
        if (requestData.has(request)) {
          const elapsed = Math.round((Date.now() - now) / 1000);
          console.log(`[GhostBrowser] ⏳ Request PENDING ${elapsed}s (no response): ${method} ${shortUrl}`);
        }
      }, 5000);
      requestData.set(request, { start: now, timeout: t });
    });

    context.on('response', (response) => {
      const request = response.request();
      const data = requestData.get(request);
      if (!data) return;
      clearTimeout(data.timeout);
      requestData.delete(request);
      const durationMs = Date.now() - data.start;
      const url = request.url();
      const method = request.method();
      const shortUrl = url.length > 70 ? url.substring(0, 70) + '…' : url;
      const slow = durationMs > 3000 ? ' (SLOW!)' : '';
      console.log(`[GhostBrowser] ← Response ${response.status()}: ${method} ${shortUrl} — ${durationMs}ms${slow}`);
    });

    context.on('requestfailed', (request) => {
      const data = requestData.get(request);
      if (data) {
        clearTimeout(data.timeout);
        requestData.delete(request);
      }
      const durationMs = data ? Date.now() - data.start : 0;
      const err = request.failure()?.errorText || 'unknown';
      const shortUrl = request.url().substring(0, 100);
      console.log(`[GhostBrowser] ✗ Request FAILED (after ${durationMs}ms): ${request.method()} ${shortUrl} — ${err}`);
    });

    // Inject cookies if provided
    if (data.cookies && data.cookies.length > 0) {
      const validCookies = data.cookies
        .filter((c: any) => c.name && c.domain)
        .map((c: any) => ({
          name: c.name,
          value: c.value || '',
          domain: c.domain,
          path: c.path || '/',
          secure: c.secure || false,
          httpOnly: c.httpOnly || false,
          expires: c.expires && c.expires > 0 ? c.expires : undefined,
          sameSite: c.sameSite || 'Lax' as const,
        }));
      if (validCookies.length > 0) {
        await context.addCookies(validCookies);
      }
    }

    // Ensure clean startup page (avoid restored tabs from previous run)
    const existingPages = context.pages();
    for (const existing of existingPages) {
      await existing.close().catch(() => {});
    }
    const page = await withTimeout(context.newPage(), 10000);
    await withTimeout(page.goto('about:blank', { waitUntil: 'domcontentloaded' }), 10000);

    const pid = ((browser as any)?.process?.()?.pid || 0);
    this.running.set(data.id, {
      profileId: data.id,
      context,
      browser,
      proxyServer: launchOptions.proxy?.server || null,
      pid,
      startedAt: Date.now(),
    });

    // Detect when the user closes the browser window manually
    const onClosed = async () => {
      // Only handle if still in our running map (not already closed via closeProfile)
      if (!this.running.has(data.id)) return;

      let cookies: any[] = [];
      try {
        // Save state before cleanup
        await context.storageState({ path: path.join(userDataDir, 'state.json') });
        cookies = await context.cookies();
      } catch {
        // Context may already be destroyed — that's OK
      }

      this.running.delete(data.id);

      // Notify renderer so it can update UI + Supabase
      if (this.onProfileClosed) {
        this.onProfileClosed(data.id, cookies);
      }
    };

    if (browser) {
      browser.on('disconnected', onClosed);
    } else {
      context.on('close', onClosed);
    }

    return { pid };
  }

  async closeProfile(profileId: string): Promise<any[]> {
    const instance = this.running.get(profileId);
    if (!instance) throw new Error('Profile is not running');

    const userDataDir = this.getProfileDir(profileId);

    // Save storage state (cookies, localStorage)
    let cookies: any[] = [];
    try {
      await instance.context.storageState({ path: path.join(userDataDir, 'state.json') });
      cookies = await instance.context.cookies();
    } catch {}

    await instance.context.close().catch(() => {});
    if (instance.browser) {
      await instance.browser.close().catch(() => {});
    }
    this.running.delete(profileId);

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
    const shouldUseRunningInstance = !!instance && (
      !requestedProxyServer || instance.proxyServer === requestedProxyServer
    );
    let tempBrowser: Browser | null = null;
    let tempContext: BrowserContext | null = null;

    if (!shouldUseRunningInstance) {
      if (instance && requestedProxyServer && instance.proxyServer !== requestedProxyServer) {
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
        proxyServer: launchOptions.proxy?.server || null,
        pid: ((tempBrowser as any).process?.()?.pid || 0),
        startedAt: Date.now(),
      };
    } else {
      console.log('[GhostBrowser] Cookie warmer using running profile context');
    }

    const { context } = instance;

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
          try {
            const geoPage = await withTimeout(context.newPage(), 5000);
            const geoResponse = await geoPage.goto(`https://ipapi.co/${data.ip}/json/`, { timeout: 10000 });
            if (geoResponse?.ok()) {
              const geoData = await geoResponse.json();
              country = geoData.country_code || null;
              city = geoData.city || null;
            }
            await geoPage.close().catch(() => {});
          } catch {}
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
