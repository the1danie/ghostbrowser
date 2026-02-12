import type { BrowserFingerprint } from './supabase';

export function generateInjectionScript(fp: BrowserFingerprint): string {
  return `
(function() {
  'use strict';

  const fp = ${JSON.stringify(fp)};

  // Normalize UA version to the real Chrome version to avoid obvious inconsistencies
  // (system Chrome version != Electron bundled Chromium version).
  try {
    const realUA = navigator.userAgent || '';
    const fpUA = fp.userAgent || '';
    const realIsChromium = /Chrome\\/[0-9.]+/.test(realUA);
    const fpIsChromium = /Chrome\\/[0-9.]+/.test(fpUA) || /Edg\\/[0-9.]+/.test(fpUA);

    // If we are running in Chromium but the profile UA is not Chromium-based (e.g. Firefox/Safari),
    // fall back to the real UA/platform to avoid blatant contradictions.
    if (realIsChromium && !fpIsChromium) {
      fp.userAgent = realUA;
      fp.platform = navigator.platform || fp.platform;
    }

    const realChrome = realUA.match(/Chrome\\/([0-9.]+)/);
    const realEdg = realUA.match(/Edg\\/([0-9.]+)/);
    if (realChrome && fp.userAgent && fp.userAgent.includes('Chrome/')) {
      fp.userAgent = fp.userAgent.replace(/Chrome\\/[0-9.]+/g, 'Chrome/' + realChrome[1]);
    }
    if (realEdg && fp.userAgent && fp.userAgent.includes('Edg/')) {
      fp.userAgent = fp.userAgent.replace(/Edg\\/[0-9.]+/g, 'Edg/' + realEdg[1]);
    }
  } catch(e) {}

  // --- Function.toString masking ---
  // WeakMap stores custom display name for each masked function.
  // Detection scripts call .toString() on getters to check if they're native.
  const maskedFns = new WeakMap();

  const origToString = Function.prototype.toString;
  Function.prototype.toString = function() {
    if (maskedFns.has(this)) {
      return 'function ' + maskedFns.get(this) + '() { [native code] }';
    }
    return origToString.call(this);
  };
  maskedFns.set(Function.prototype.toString, 'toString');

  // Helper: define a property on a prototype with a properly masked native-looking getter.
  // In real Chrome, Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent').get.toString()
  // returns "function get userAgent() { [native code] }" — we replicate this exactly.
  function defineGetterProp(proto, prop, value, enumerable) {
    if (enumerable === undefined) enumerable = true;
    var getter = function() { return value; };
    Object.defineProperty(getter, 'name', { value: 'get ' + prop, configurable: true });
    Object.defineProperty(getter, 'length', { value: 0, configurable: true });
    maskedFns.set(getter, 'get ' + prop);
    try {
      Object.defineProperty(proto, prop, {
        get: getter,
        set: undefined,
        enumerable: enumerable,
        configurable: true,
      });
    } catch(e) {}
  }

  // Helper: mask a prototype method override so .toString() returns native code
  function maskProtoMethod(proto, name, fn) {
    Object.defineProperty(fn, 'name', { value: name, configurable: true });
    maskedFns.set(fn, name);
    proto[name] = fn;
  }

  // --- Browser type detection ---
  const isChrome = fp.userAgent.includes('Chrome');
  const isSafari = fp.userAgent.includes('Safari') && !fp.userAgent.includes('Chrome');
  const isFirefox = fp.userAgent.includes('Firefox');

  // --- Navigator overrides (all getters properly masked) ---
  const vendorValue = isChrome ? 'Google Inc.' : isSafari ? 'Apple Computer, Inc.' : '';

  defineGetterProp(Navigator.prototype, 'userAgent', fp.userAgent);
  defineGetterProp(Navigator.prototype, 'appVersion', (fp.userAgent || '').replace(/^Mozilla\\//, ''));
  defineGetterProp(Navigator.prototype, 'platform', fp.platform);
  defineGetterProp(Navigator.prototype, 'hardwareConcurrency', fp.hardwareConcurrency);
  defineGetterProp(Navigator.prototype, 'language', fp.language);
  defineGetterProp(Navigator.prototype, 'languages', Object.freeze([fp.language, fp.language.split('-')[0]]));
  if (fp.doNotTrack !== undefined && fp.doNotTrack !== null) {
    defineGetterProp(Navigator.prototype, 'doNotTrack', fp.doNotTrack);
  }
  defineGetterProp(Navigator.prototype, 'maxTouchPoints', 0);
  defineGetterProp(Navigator.prototype, 'vendor', vendorValue);
  defineGetterProp(Navigator.prototype, 'productSub', '20030107');
  defineGetterProp(Navigator.prototype, 'vendorSub', '');

  // Chrome-only properties
  if (isChrome) {
    defineGetterProp(Navigator.prototype, 'deviceMemory', fp.deviceMemory);
    defineGetterProp(Navigator.prototype, 'pdfViewerEnabled', true);
  }

  // Safari/Firefox should NOT have deviceMemory or pdfViewerEnabled
  if (isSafari || isFirefox) {
    defineGetterProp(Navigator.prototype, 'deviceMemory', undefined);
  }

  // --- navigator.webdriver = false (masked) ---
  // In real Chrome the getter name is "get webdriver"
  defineGetterProp(Navigator.prototype, 'webdriver', false);

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
        defineGetterProp(Navigator.prototype, 'connection', connectionProto);
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

  // --- Screen overrides (masked getters) ---
  try {
    const screenW = (fp.screenResolution && fp.screenResolution.width) || 1920;
    const screenH = (fp.screenResolution && fp.screenResolution.height) || 1080;
    defineGetterProp(Screen.prototype, 'width', screenW);
    defineGetterProp(Screen.prototype, 'height', screenH);
    defineGetterProp(Screen.prototype, 'availWidth', screenW);
    defineGetterProp(Screen.prototype, 'availHeight', screenH - 40);
    defineGetterProp(Screen.prototype, 'colorDepth', 24);
    defineGetterProp(Screen.prototype, 'pixelDepth', 24);

    defineGetterProp(window, 'outerWidth', screenW);
    defineGetterProp(window, 'outerHeight', screenH);
  } catch(e) {}

  // --- WebGL overrides (masked) ---
  const getParameterOrig = WebGLRenderingContext.prototype.getParameter;
  maskProtoMethod(WebGLRenderingContext.prototype, 'getParameter', function(param) {
    var UNMASKED_VENDOR = 0x9245;
    var UNMASKED_RENDERER = 0x9246;
    if (param === UNMASKED_VENDOR) return fp.webglVendor;
    if (param === UNMASKED_RENDERER) return fp.webglRenderer;
    return getParameterOrig.call(this, param);
  });

  if (typeof WebGL2RenderingContext !== 'undefined') {
    const getParameter2Orig = WebGL2RenderingContext.prototype.getParameter;
    maskProtoMethod(WebGL2RenderingContext.prototype, 'getParameter', function(param) {
      var UNMASKED_VENDOR = 0x9245;
      var UNMASKED_RENDERER = 0x9246;
      if (param === UNMASKED_VENDOR) return fp.webglVendor;
      if (param === UNMASKED_RENDERER) return fp.webglRenderer;
      return getParameter2Orig.call(this, param);
    });
  }

  // --- Canvas fingerprint noise ---
  const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  function addCanvasNoise(ctx, canvas) {
    if (!ctx || !fp.canvasNoise || fp.canvasNoise <= 0) return;
    try {
      const imageData = origGetImageData.call(ctx, 0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i+3] === 0) continue;
        data[i] = data[i] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
        data[i+1] = data[i+1] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
        data[i+2] = data[i+2] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
      }
      ctx.putImageData(imageData, 0, 0);
    } catch(e) {}
  }

  const toDataURLOrig = HTMLCanvasElement.prototype.toDataURL;
  maskProtoMethod(HTMLCanvasElement.prototype, 'toDataURL', function(type, quality) {
    if (this.width === 0 || this.height === 0) return toDataURLOrig.call(this, type, quality);
    addCanvasNoise(this.getContext('2d'), this);
    return toDataURLOrig.call(this, type, quality);
  });

  const toBlobOrig = HTMLCanvasElement.prototype.toBlob;
  maskProtoMethod(HTMLCanvasElement.prototype, 'toBlob', function(callback, type, quality) {
    if (this.width === 0 || this.height === 0) return toBlobOrig.call(this, callback, type, quality);
    addCanvasNoise(this.getContext('2d'), this);
    return toBlobOrig.call(this, callback, type, quality);
  });

  // --- Canvas getImageData noise (direct reads, masked) ---
  maskProtoMethod(CanvasRenderingContext2D.prototype, 'getImageData', function(sx, sy, sw, sh) {
    const imageData = origGetImageData.call(this, sx, sy, sw, sh);
    if (fp.canvasNoise > 0) {
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i+3] === 0) continue;
        data[i] = data[i] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
        data[i+1] = data[i+1] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
        data[i+2] = data[i+2] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
      }
    }
    return imageData;
  });

  // --- AudioContext fingerprint noise (masked) ---
  if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
    const Ctx = typeof AudioContext !== 'undefined' ? AudioContext : webkitAudioContext;
    const getChannelDataOrig = AudioBuffer.prototype.getChannelData;

    maskProtoMethod(AudioBuffer.prototype, 'getChannelData', function(channel) {
      const data = getChannelDataOrig.call(this, channel);
      if (fp.audioNoise > 0) {
        for (let i = 0; i < data.length; i++) {
          data[i] = data[i] + (Math.random() - 0.5) * fp.audioNoise;
        }
      }
      return data;
    });
  }

  // --- WebRTC ---
  if (fp.webrtcPolicy === 'disable') {
    Object.defineProperty(window, 'RTCPeerConnection', { value: undefined, writable: false });
    Object.defineProperty(window, 'webkitRTCPeerConnection', { value: undefined, writable: false });
    Object.defineProperty(window, 'mozRTCPeerConnection', { value: undefined, writable: false });
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = function() { return Promise.reject(new Error('Not allowed')); };
      navigator.mediaDevices.enumerateDevices = function() { return Promise.resolve([]); };
      maskedFns.set(navigator.mediaDevices.getUserMedia, 'getUserMedia');
      maskedFns.set(navigator.mediaDevices.enumerateDevices, 'enumerateDevices');
    }
  }

  // --- Timezone (masked) ---
  const resolvedOptionsOrig = Intl.DateTimeFormat.prototype.resolvedOptions;
  maskProtoMethod(Intl.DateTimeFormat.prototype, 'resolvedOptions', function() {
    const result = resolvedOptionsOrig.call(this);
    result.timeZone = fp.timezone;
    return result;
  });

  // Override Date.prototype.getTimezoneOffset (masked)
  const tzOffsets = {
    'America/New_York': 300, 'America/Chicago': 360, 'America/Denver': 420,
    'America/Los_Angeles': 480, 'Europe/London': 0, 'Europe/Paris': -60,
    'Europe/Berlin': -60, 'Europe/Moscow': -180, 'Asia/Tokyo': -540,
    'Asia/Shanghai': -480, 'Asia/Kolkata': -330, 'Asia/Dubai': -240,
    'Australia/Sydney': -660, 'Pacific/Auckland': -780,
    'America/Sao_Paulo': 180, 'America/Toronto': 300,
    'Asia/Almaty': -360,
  };
  const offset = tzOffsets[fp.timezone] ?? 0;
  maskProtoMethod(Date.prototype, 'getTimezoneOffset', function() { return offset; });

  // --- Plugins (masked getter) ---
  (function() {
    const pluginsGetter = function() {
      const pluginDefs = isChrome ? [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
      ] : isSafari ? [
        { name: 'WebKit built-in PDF', filename: '', description: '' },
      ] : [];

      const pluginArray = Object.create(PluginArray.prototype);
      const items = pluginDefs.map(function(p, i) {
        const obj = Object.create(Plugin.prototype);
        Object.defineProperty(obj, 'name', { get: function() { return p.name; }, enumerable: true });
        Object.defineProperty(obj, 'filename', { get: function() { return p.filename; }, enumerable: true });
        Object.defineProperty(obj, 'description', { get: function() { return p.description; }, enumerable: true });
        Object.defineProperty(obj, 'length', { get: function() { return 1; } });
        Object.defineProperty(pluginArray, i, { value: obj, enumerable: true });
        return obj;
      });

      Object.defineProperty(pluginArray, 'length', { value: items.length, enumerable: true });
      pluginArray.item = function(i) { return items[i] || null; };
      pluginArray.namedItem = function(name) { return items.find(function(p) { return p.name === name; }) || null; };
      pluginArray.refresh = function() {};

      pluginArray[Symbol.iterator] = function() {
        let idx = 0;
        return {
          next: function() {
            return idx < items.length ? { value: items[idx++], done: false } : { done: true };
          }
        };
      };

      return pluginArray;
    };
    Object.defineProperty(pluginsGetter, 'name', { value: 'get plugins', configurable: true });
    maskedFns.set(pluginsGetter, 'get plugins');
    try {
      Object.defineProperty(Navigator.prototype, 'plugins', {
        get: pluginsGetter,
        set: undefined,
        enumerable: true,
        configurable: true,
      });
    } catch(e) {}
  })();

  // --- Fonts detection defense (masked) ---
  const measureTextOrig = CanvasRenderingContext2D.prototype.measureText;
  maskProtoMethod(CanvasRenderingContext2D.prototype, 'measureText', function(text) {
    const result = measureTextOrig.call(this, text);
    const noise = (Math.random() - 0.5) * 0.01;
    const origWidth = result.width;
    Object.defineProperty(result, 'width', { get: function() { return origWidth + noise; } });
    return result;
  });

  // --- Battery API ---
  // Do NOT spoof getBattery: a fake function is easy to detect and often breaks heuristics.

  // --- Permissions API (masked) ---
  const queryOrig = Permissions.prototype.query;
  maskProtoMethod(Permissions.prototype, 'query', function(desc) {
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
  });

  // --- Clean up automation / CDP markers ---
  try {
    var keysToRemove = Object.getOwnPropertyNames(window).filter(function(k) {
      return /^cdc_/.test(k) || /^__selenium/.test(k) || /^__driver/.test(k) ||
             /^callSelenium/.test(k) || /^_Selenium/.test(k) || /^calledSelenium/.test(k) ||
             /^_phantom/.test(k) || /^__nightmare/.test(k) || /^domAutomation/.test(k) ||
             /^domAutomationController/.test(k);
    });
    for (var ki = 0; ki < keysToRemove.length; ki++) {
      try { delete window[keysToRemove[ki]]; } catch(e) {}
    }
  } catch(e) {}

  // Remove document.querySelector automation markers
  try {
    if (document.querySelector && document.querySelector('[selenium]')) {
      // silently ignore
    }
  } catch(e) {}

})();
`;
}
