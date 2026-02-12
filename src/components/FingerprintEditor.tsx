import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { BrowserFingerprint } from '../lib/supabase';
import {
  GEO_OPTIONS,
  GEO_PRESETS,
  LANGUAGE_OPTIONS,
  generateFingerprint,
  getLocaleDataForTimezone,
} from '../lib/fingerprint-generator';

interface Props {
  fingerprint: BrowserFingerprint;
  onChange: (fp: BrowserFingerprint) => void;
}

const GEO_BY_TIMEZONE = new Map<string, string>(GEO_PRESETS.map(p => [p.timezone, p.geoCode]));
const TIMEZONES_BY_GEO: Record<string, string[]> = {};
for (const preset of GEO_PRESETS) {
  if (!TIMEZONES_BY_GEO[preset.geoCode]) {
    TIMEZONES_BY_GEO[preset.geoCode] = [];
  }
  TIMEZONES_BY_GEO[preset.geoCode].push(preset.timezone);
}
const ALL_TIMEZONES = Array.from(new Set(GEO_PRESETS.map(p => p.timezone)));

export default function FingerprintEditor({ fingerprint, onChange }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleRegenerate = () => {
    onChange(generateFingerprint());
  };

  const update = (key: keyof BrowserFingerprint, value: any) => {
    onChange({ ...fingerprint, [key]: value });
  };

  const selectedGeoCode = GEO_BY_TIMEZONE.get(fingerprint.timezone) ?? 'custom';
  const timezoneOptions = selectedGeoCode === 'custom'
    ? ALL_TIMEZONES
    : (TIMEZONES_BY_GEO[selectedGeoCode] || ALL_TIMEZONES);

  const handleGeoChange = (geoCode: string) => {
    const nextTimezone = TIMEZONES_BY_GEO[geoCode]?.[0];
    if (!nextTimezone) return;
    const localeData = getLocaleDataForTimezone(nextTimezone);
    onChange({
      ...fingerprint,
      timezone: nextTimezone,
      language: localeData.language,
      locale: localeData.locale,
    });
  };

  const handleTimezoneChange = (timezone: string) => {
    const localeData = getLocaleDataForTimezone(timezone);
    onChange({
      ...fingerprint,
      timezone,
      language: localeData.language,
      locale: localeData.locale,
    });
  };

  const handleLanguageChange = (language: string) => {
    onChange({
      ...fingerprint,
      language,
      locale: language,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Fingerprint</h3>
        <button onClick={handleRegenerate} className="btn-secondary text-sm flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Regenerate
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* User Agent */}
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">User-Agent</label>
          <input
            className="input-field text-xs"
            value={fingerprint.userAgent}
            onChange={e => update('userAgent', e.target.value)}
          />
        </div>

        {/* Platform */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Platform</label>
          <select
            className="select-field"
            value={fingerprint.platform}
            onChange={e => update('platform', e.target.value)}
          >
            <option value="Win32">Windows</option>
            <option value="MacIntel">macOS</option>
            <option value="Linux x86_64">Linux</option>
          </select>
        </div>

        {/* Screen Resolution */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Screen Resolution</label>
          <div className="flex gap-2">
            <input
              type="number"
              className="input-field"
              value={fingerprint.screenResolution.width}
              onChange={e =>
                update('screenResolution', {
                  ...fingerprint.screenResolution,
                  width: parseInt(e.target.value) || 1920,
                })
              }
            />
            <span className="text-gray-500 self-center">x</span>
            <input
              type="number"
              className="input-field"
              value={fingerprint.screenResolution.height}
              onChange={e =>
                update('screenResolution', {
                  ...fingerprint.screenResolution,
                  height: parseInt(e.target.value) || 1080,
                })
              }
            />
          </div>
        </div>

        {/* Geo */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Geo</label>
          <select className="select-field" value={selectedGeoCode} onChange={e => handleGeoChange(e.target.value)}>
            {selectedGeoCode === 'custom' && <option value="custom">Custom / Unknown</option>}
            {GEO_OPTIONS.map(option => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Timezone</label>
          <select className="select-field" value={fingerprint.timezone} onChange={e => handleTimezoneChange(e.target.value)}>
            {!timezoneOptions.includes(fingerprint.timezone) && (
              <option value={fingerprint.timezone}>{fingerprint.timezone} (custom)</option>
            )}
            {timezoneOptions.map(timezone => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Language</label>
          <select className="select-field" value={fingerprint.language} onChange={e => handleLanguageChange(e.target.value)}>
            {!LANGUAGE_OPTIONS.includes(fingerprint.language) && (
              <option value={fingerprint.language}>{fingerprint.language} (custom)</option>
            )}
            {LANGUAGE_OPTIONS.map(language => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </div>

        {/* Hardware Concurrency */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">CPU Cores</label>
          <select
            className="select-field"
            value={fingerprint.hardwareConcurrency}
            onChange={e => update('hardwareConcurrency', parseInt(e.target.value))}
          >
            {[2, 4, 6, 8, 12, 16].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Device Memory */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Device Memory (GB)</label>
          <select
            className="select-field"
            value={fingerprint.deviceMemory}
            onChange={e => update('deviceMemory', parseInt(e.target.value))}
          >
            {[2, 4, 8, 16].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* WebRTC Policy */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">WebRTC</label>
          <select
            className="select-field"
            value={fingerprint.webrtcPolicy}
            onChange={e => update('webrtcPolicy', e.target.value)}
          >
            <option value="disable">Disabled</option>
            <option value="real">Real</option>
            <option value="fake">Fake</option>
          </select>
        </div>

        {/* Do Not Track */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Do Not Track</label>
          <select
            className="select-field"
            value={fingerprint.doNotTrack ?? 'null'}
            onChange={e => update('doNotTrack', e.target.value === 'null' ? null : e.target.value)}
          >
            <option value="null">Not set</option>
            <option value="1">Enabled (1)</option>
          </select>
        </div>
      </div>

      {/* Advanced section */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-accent hover:text-accent-hover"
      >
        {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-4 mt-2">
          {/* WebGL Vendor */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1">WebGL Vendor</label>
            <input
              className="input-field text-xs"
              value={fingerprint.webglVendor}
              onChange={e => update('webglVendor', e.target.value)}
            />
          </div>

          {/* WebGL Renderer */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1">WebGL Renderer</label>
            <input
              className="input-field text-xs"
              value={fingerprint.webglRenderer}
              onChange={e => update('webglRenderer', e.target.value)}
            />
          </div>

          {/* Canvas Noise */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Canvas Noise ({(fingerprint.canvasNoise * 100).toFixed(1)}%)</label>
            <input
              type="range"
              min="0"
              max="0.1"
              step="0.001"
              className="w-full"
              value={fingerprint.canvasNoise}
              onChange={e => update('canvasNoise', parseFloat(e.target.value))}
            />
          </div>

          {/* Audio Noise */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Audio Noise ({(fingerprint.audioNoise * 10000).toFixed(2)})</label>
            <input
              type="range"
              min="0"
              max="0.001"
              step="0.00001"
              className="w-full"
              value={fingerprint.audioNoise}
              onChange={e => update('audioNoise', parseFloat(e.target.value))}
            />
          </div>

          {/* Fonts */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1">Fonts ({fingerprint.fonts.length} selected)</label>
            <textarea
              className="input-field text-xs h-20"
              value={fingerprint.fonts.join(', ')}
              onChange={e =>
                update('fonts', e.target.value.split(',').map(f => f.trim()).filter(Boolean))
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
