import type { BrowserFingerprint } from './supabase';

export function generateInjectionScript(fp: BrowserFingerprint): string {
  return `
(function() {
  'use strict';

  const fp = ${JSON.stringify(fp)};

  // --- Function.toString masking ---
  // Detection scripts call .toString() on navigator getters to check if they're native.
  const maskedFns = new WeakSet();

  const origToString = Function.prototype.toString;
  Function.prototype.toString = function() {
    if (maskedFns.has(this)) {
      return 'function ' + (this.name || '') + '() { [native code] }';
    }
    return origToString.call(this);
  };
  maskedFns.add(Function.prototype.toString);

  // --- Browser type detection ---
  const isChrome = fp.userAgent.includes('Chrome');
  const isSafari = fp.userAgent.includes('Safari') && !fp.userAgent.includes('Chrome');
  const isFirefox = fp.userAgent.includes('Firefox');

  // --- Navigator overrides ---
  const vendorValue = isChrome ? 'Google Inc.' : isSafari ? 'Apple Computer, Inc.' : '';

  const navProps = {
    userAgent: fp.userAgent,
    platform: fp.platform,
    hardwareConcurrency: fp.hardwareConcurrency,
    language: fp.language,
    languages: [fp.language, fp.language.split('-')[0]],
    doNotTrack: fp.doNotTrack,
    maxTouchPoints: 0,
    vendor: vendorValue,
  };

  // Chrome-only properties
  if (isChrome) {
    navProps.deviceMemory = fp.deviceMemory;
    navProps.pdfViewerEnabled = true;
  }

  // Safari/Firefox should NOT have deviceMemory or pdfViewerEnabled
  if (isSafari || isFirefox) {
    try {
      Object.defineProperty(Navigator.prototype, 'deviceMemory', {
        get: () => undefined,
        configurable: true,
      });
    } catch(e) {}
  }

  for (const [key, value] of Object.entries(navProps)) {
    if (value === undefined) continue;
    try {
      Object.defineProperty(Navigator.prototype, key, {
        get: () => value,
        configurable: true,
      });
    } catch(e) {}
  }

  // --- navigator.webdriver = false ---
  try {
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      get: () => false,
      configurable: true,
    });
  } catch(e) {}

  // --- navigator.connection (Network Information API) ---
  // Chrome-only API — Safari/Firefox don't have it
  if (isChrome) {
    try {
      const connectionData = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
      };
      const connectionProto = {
        get effectiveType() { return connectionData.effectiveType; },
        get downlink() { return connectionData.downlink; },
        get rtt() { return connectionData.rtt; },
        get saveData() { return connectionData.saveData; },
        addEventListener: function() {},
        removeEventListener: function() {},
      };
      if (!navigator.connection) {
        Object.defineProperty(Navigator.prototype, 'connection', {
          get: () => connectionProto,
          configurable: true,
          enumerable: true,
        });
      }
    } catch(e) {}
  }

  // --- window.chrome stub ---
  // Only for Chrome UAs. For Safari/Firefox UAs, remove it if the real browser (Chrome) exposes it.
  if (isChrome && !window.chrome) {
    const chrome = {
      app: {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
        getDetails: function() { return null; },
        getIsInstalled: function() { return false; },
        installState: function(cb) { if (cb) cb('not_installed'); },
      },
      runtime: {
        OnInstalledReason: {
          CHROME_UPDATE: 'chrome_update',
          INSTALL: 'install',
          SHARED_MODULE_UPDATE: 'shared_module_update',
          UPDATE: 'update',
        },
        OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
        PlatformArch: {
          ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64',
          X86_32: 'x86-32', X86_64: 'x86-64',
        },
        PlatformNaclArch: {
          ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64',
        },
        PlatformOs: {
          ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac',
          OPENBSD: 'openbsd', WIN: 'win',
        },
        RequestUpdateCheckStatus: {
          NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available',
        },
        connect: function() {
          throw new Error('Could not establish connection. Receiving end does not exist.');
        },
        sendMessage: function() {
          throw new Error('Could not establish connection. Receiving end does not exist.');
        },
        id: undefined,
      },
      csi: function() {
        return {
          startE: Date.now(),
          onloadT: Date.now(),
          pageT: performance.now(),
          tran: 15,
        };
      },
      loadTimes: function() {
        return {
          commitLoadTime: Date.now() / 1000,
          connectionInfo: 'h2',
          finishDocumentLoadTime: Date.now() / 1000,
          finishLoadTime: Date.now() / 1000,
          firstPaintAfterLoadTime: 0,
          firstPaintTime: Date.now() / 1000,
          navigationType: 'Other',
          npnNegotiatedProtocol: 'h2',
          requestTime: Date.now() / 1000,
          startLoadTime: Date.now() / 1000,
          wasAlternateProtocolAvailable: false,
          wasFetchedViaSpdy: true,
          wasNpnNegotiated: true,
        };
      },
    };

    try {
      Object.defineProperty(window, 'chrome', {
        value: chrome,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } catch(e) {}
  }

  // For non-Chrome UAs running on system Chrome: hide window.chrome
  if (!isChrome && window.chrome) {
    try {
      Object.defineProperty(window, 'chrome', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    } catch(e) {}
  }

  // --- Screen overrides ---
  try {
    const screenW = (fp.screenResolution && fp.screenResolution.width) || 1920;
    const screenH = (fp.screenResolution && fp.screenResolution.height) || 1080;
    Object.defineProperty(Screen.prototype, 'width', { get: () => screenW, configurable: true });
    Object.defineProperty(Screen.prototype, 'height', { get: () => screenH, configurable: true });
    Object.defineProperty(Screen.prototype, 'availWidth', { get: () => screenW, configurable: true });
    Object.defineProperty(Screen.prototype, 'availHeight', { get: () => screenH - 40, configurable: true });
    Object.defineProperty(Screen.prototype, 'colorDepth', { get: () => 24, configurable: true });
    Object.defineProperty(Screen.prototype, 'pixelDepth', { get: () => 24, configurable: true });

    Object.defineProperty(window, 'outerWidth', { get: () => screenW, configurable: true });
    Object.defineProperty(window, 'outerHeight', { get: () => screenH, configurable: true });
  } catch(e) {}

  // --- WebGL overrides ---
  const getParameterOrig = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    const UNMASKED_VENDOR = 0x9245;
    const UNMASKED_RENDERER = 0x9246;
    if (param === UNMASKED_VENDOR) return fp.webglVendor;
    if (param === UNMASKED_RENDERER) return fp.webglRenderer;
    return getParameterOrig.call(this, param);
  };

  if (typeof WebGL2RenderingContext !== 'undefined') {
    const getParameter2Orig = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(param) {
      const UNMASKED_VENDOR = 0x9245;
      const UNMASKED_RENDERER = 0x9246;
      if (param === UNMASKED_VENDOR) return fp.webglVendor;
      if (param === UNMASKED_RENDERER) return fp.webglRenderer;
      return getParameter2Orig.call(this, param);
    };
  }

  // --- Canvas fingerprint noise ---
  const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  function addCanvasNoise(ctx, canvas) {
    if (!ctx || !fp.canvasNoise || fp.canvasNoise <= 0) return;
    try {
      const imageData = origGetImageData.call(ctx, 0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Skip fully transparent pixels — modifying them is detectable
        if (data[i+3] === 0) continue;
        data[i] = data[i] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
        data[i+1] = data[i+1] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
        data[i+2] = data[i+2] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
      }
      ctx.putImageData(imageData, 0, 0);
    } catch(e) {}
  }

  const toDataURLOrig = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
    if (this.width === 0 || this.height === 0) return toDataURLOrig.call(this, type, quality);
    addCanvasNoise(this.getContext('2d'), this);
    return toDataURLOrig.call(this, type, quality);
  };

  const toBlobOrig = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
    if (this.width === 0 || this.height === 0) return toBlobOrig.call(this, callback, type, quality);
    addCanvasNoise(this.getContext('2d'), this);
    return toBlobOrig.call(this, callback, type, quality);
  };

  // --- Canvas getImageData noise (direct reads) ---
  CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
    const imageData = origGetImageData.call(this, sx, sy, sw, sh);
    if (fp.canvasNoise > 0) {
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Skip fully transparent pixels
        if (data[i+3] === 0) continue;
        data[i] = data[i] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
        data[i+1] = data[i+1] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
        data[i+2] = data[i+2] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
      }
    }
    return imageData;
  };

  // --- AudioContext fingerprint noise ---
  if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
    const Ctx = typeof AudioContext !== 'undefined' ? AudioContext : webkitAudioContext;
    const createOscillatorOrig = Ctx.prototype.createOscillator;
    const createDynamicsCompressorOrig = Ctx.prototype.createDynamicsCompressor;
    const getChannelDataOrig = AudioBuffer.prototype.getChannelData;

    AudioBuffer.prototype.getChannelData = function(channel) {
      const data = getChannelDataOrig.call(this, channel);
      if (fp.audioNoise > 0) {
        for (let i = 0; i < data.length; i++) {
          data[i] = data[i] + (Math.random() - 0.5) * fp.audioNoise;
        }
      }
      return data;
    };
  }

  // --- WebRTC ---
  if (fp.webrtcPolicy === 'disable') {
    Object.defineProperty(window, 'RTCPeerConnection', { value: undefined, writable: false });
    Object.defineProperty(window, 'webkitRTCPeerConnection', { value: undefined, writable: false });
    Object.defineProperty(window, 'mozRTCPeerConnection', { value: undefined, writable: false });
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('Not allowed'));
      navigator.mediaDevices.enumerateDevices = () => Promise.resolve([]);
    }
  }

  // --- Timezone ---
  const DateOrig = Date;
  const resolvedOptionsOrig = Intl.DateTimeFormat.prototype.resolvedOptions;
  Intl.DateTimeFormat.prototype.resolvedOptions = function() {
    const result = resolvedOptionsOrig.call(this);
    result.timeZone = fp.timezone;
    return result;
  };

  // Override Date.prototype.getTimezoneOffset
  const tzOffsets = {
    'America/New_York': 300, 'America/Chicago': 360, 'America/Denver': 420,
    'America/Los_Angeles': 480, 'Europe/London': 0, 'Europe/Paris': -60,
    'Europe/Berlin': -60, 'Europe/Moscow': -180, 'Asia/Tokyo': -540,
    'Asia/Shanghai': -480, 'Asia/Kolkata': -330, 'Asia/Dubai': -240,
    'Australia/Sydney': -660, 'Pacific/Auckland': -780,
    'America/Sao_Paulo': 180, 'America/Toronto': 300,
  };
  const offset = tzOffsets[fp.timezone] ?? 0;
  Date.prototype.getTimezoneOffset = function() { return offset; };

  // --- Plugins ---
  // Use proper PluginArray prototype so instanceof checks pass
  Object.defineProperty(Navigator.prototype, 'plugins', {
    get: () => {
      const pluginDefs = isChrome ? [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
      ] : isSafari ? [
        { name: 'WebKit built-in PDF', filename: '', description: '' },
      ] : [];

      const pluginArray = Object.create(PluginArray.prototype);
      const items = pluginDefs.map((p, i) => {
        const obj = Object.create(Plugin.prototype);
        Object.defineProperty(obj, 'name', { get: () => p.name, enumerable: true });
        Object.defineProperty(obj, 'filename', { get: () => p.filename, enumerable: true });
        Object.defineProperty(obj, 'description', { get: () => p.description, enumerable: true });
        Object.defineProperty(obj, 'length', { get: () => 1 });
        Object.defineProperty(pluginArray, i, { value: obj, enumerable: true });
        return obj;
      });

      Object.defineProperty(pluginArray, 'length', { value: items.length, enumerable: true });
      pluginArray.item = function(i) { return items[i] || null; };
      pluginArray.namedItem = function(name) { return items.find(p => p.name === name) || null; };
      pluginArray.refresh = function() {};

      // Make it iterable
      pluginArray[Symbol.iterator] = function() {
        let idx = 0;
        return {
          next: function() {
            return idx < items.length ? { value: items[idx++], done: false } : { done: true };
          }
        };
      };

      return pluginArray;
    },
    configurable: true,
  });

  // --- Fonts detection defense ---
  const measureTextOrig = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function(text) {
    const result = measureTextOrig.call(this, text);
    const noise = (Math.random() - 0.5) * 0.01;
    const origWidth = result.width;
    Object.defineProperty(result, 'width', { get: () => origWidth + noise });
    return result;
  };

  // --- Battery API ---
  if (navigator.getBattery) {
    navigator.getBattery = () => Promise.resolve({
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1.0,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  }

  // --- Permissions API ---
  const queryOrig = Permissions.prototype.query;
  Permissions.prototype.query = function(desc) {
    const permStates = {
      notifications: 'prompt',
      geolocation: 'prompt',
      camera: 'prompt',
      microphone: 'prompt',
      'persistent-storage': 'prompt',
      'push': 'prompt',
      'midi': 'granted',
      'background-sync': 'granted',
      'accelerometer': 'granted',
      'gyroscope': 'granted',
      'magnetometer': 'granted',
    };
    const state = permStates[desc.name];
    if (state) {
      return Promise.resolve({
        state: state,
        status: state,
        onchange: null,
        addEventListener: function() {},
        removeEventListener: function() {},
        dispatchEvent: function() { return true; },
      });
    }
    return queryOrig.call(this, desc);
  };

})();
`;
}
