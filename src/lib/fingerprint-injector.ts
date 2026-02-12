import type { BrowserFingerprint } from './supabase';

export function generateInjectionScript(fp: BrowserFingerprint): string {
  return `
(function() {
  'use strict';

  const fp = ${JSON.stringify(fp)};

  // --- Navigator overrides ---
  const navProps = {
    userAgent: fp.userAgent,
    platform: fp.platform,
    hardwareConcurrency: fp.hardwareConcurrency,
    deviceMemory: fp.deviceMemory,
    language: fp.language,
    languages: [fp.language, fp.language.split('-')[0]],
    doNotTrack: fp.doNotTrack,
    maxTouchPoints: 0,
  };

  for (const [key, value] of Object.entries(navProps)) {
    try {
      Object.defineProperty(Navigator.prototype, key, {
        get: () => value,
        configurable: true,
      });
    } catch(e) {}
  }

  // --- Screen overrides (only colorDepth/pixelDepth, dimensions use real window size) ---
  try {
    Object.defineProperty(Screen.prototype, 'colorDepth', { get: () => 24, configurable: true });
    Object.defineProperty(Screen.prototype, 'pixelDepth', { get: () => 24, configurable: true });
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
  const toDataURLOrig = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
    if (this.width === 0 || this.height === 0) return toDataURLOrig.call(this, type, quality);
    try {
      const ctx = this.getContext('2d');
      if (ctx && fp.canvasNoise > 0) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = data[i] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
          data[i+1] = data[i+1] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
          data[i+2] = data[i+2] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
        }
        ctx.putImageData(imageData, 0, 0);
      }
    } catch(e) {}
    return toDataURLOrig.call(this, type, quality);
  };

  const toBlobOrig = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
    if (this.width === 0 || this.height === 0) return toBlobOrig.call(this, callback, type, quality);
    try {
      const ctx = this.getContext('2d');
      if (ctx && fp.canvasNoise > 0) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = data[i] + Math.floor((Math.random() - 0.5) * fp.canvasNoise * 255);
        }
        ctx.putImageData(imageData, 0, 0);
      }
    } catch(e) {}
    return toBlobOrig.call(this, callback, type, quality);
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
  Object.defineProperty(Navigator.prototype, 'plugins', {
    get: () => {
      const plugins = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
      ];
      const arr = plugins.map(p => {
        const obj = Object.create(Plugin.prototype);
        Object.defineProperty(obj, 'name', { get: () => p.name });
        Object.defineProperty(obj, 'filename', { get: () => p.filename });
        Object.defineProperty(obj, 'description', { get: () => p.description });
        Object.defineProperty(obj, 'length', { get: () => 1 });
        return obj;
      });
      Object.defineProperty(arr, 'length', { value: arr.length });
      arr.item = (i) => arr[i];
      arr.namedItem = (name) => arr.find(p => p.name === name);
      arr.refresh = () => {};
      return arr;
    },
    configurable: true,
  });

  // --- Fonts detection defense ---
  // We override measureText to return consistent values for fonts we "have"
  const measureTextOrig = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function(text) {
    const result = measureTextOrig.call(this, text);
    // Add subtle noise to width to prevent exact fingerprinting
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
    if (desc.name === 'notifications') {
      return Promise.resolve({ state: 'prompt', addEventListener: () => {} });
    }
    return queryOrig.call(this, desc);
  };

  console.log('[GhostBrowser] Fingerprint injected successfully');
})();
`;
}
