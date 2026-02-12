import { useState, useEffect } from 'react';
import { X, Play, Square } from 'lucide-react';
import { WARMER_CATEGORIES, getUrlsByCategories } from '../lib/cookie-warmer';
import type { WarmerProxyConfig, WarmingProgress } from '../lib/cookie-warmer';

interface Props {
  profileId: string;
  profileName: string;
  proxy?: WarmerProxyConfig;
  onClose: () => void;
}

export default function CookieWarmerModal({ profileId, profileName, proxy, onClose }: Props) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['general', 'social']);
  const [customUrls, setCustomUrls] = useState('');
  const [minTime, setMinTime] = useState(5);
  const [maxTime, setMaxTime] = useState(20);
  const [maxClicks, setMaxClicks] = useState(2);
  const [humanEmulation, setHumanEmulation] = useState(true);
  const [progress, setProgress] = useState<WarmingProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    const cleanup = api.onWarmingProgress((prog: WarmingProgress) => {
      setProgress(prog);
      if (prog.status === 'done' || prog.status === 'stopped' || prog.status === 'error') {
        setIsRunning(false);
      }
    });

    return cleanup;
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const getUrls = (): string[] => {
    const categoryUrls = getUrlsByCategories(selectedCategories);
    const custom = customUrls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.startsWith('http'));
    return [...new Set([...categoryUrls, ...custom])];
  };

  const handleStart = async () => {
    const api = (window as any).electronAPI;
    if (!api) return;

    const urls = getUrls();
    if (urls.length === 0) return;

    setIsRunning(true);
    setProgress({ currentUrl: '', currentIndex: 0, totalUrls: urls.length, status: 'running' });

    try {
      const result = await api.warmCookies({
        profileId,
        urls,
        minTimePerSite: minTime,
        maxTimePerSite: maxTime,
        maxClicks,
        humanEmulation,
        proxy,
      });
      if (!result.success) {
        setProgress(prev => prev ? { ...prev, status: 'error', error: result.error } : null);
        setIsRunning(false);
      }
    } catch (err: any) {
      setProgress(prev => prev ? { ...prev, status: 'error', error: err.message } : null);
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    const api = (window as any).electronAPI;
    if (api) api.stopWarming(profileId);
  };

  const totalUrls = getUrls().length;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-ghost-800 rounded-xl border border-ghost-600 w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-ghost-700">
          <h2 className="text-lg font-semibold">Cookie Warmer - {profileName}</h2>
          <button onClick={onClose} className="p-1 hover:bg-ghost-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Categories */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Website Categories</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(WARMER_CATEGORIES).map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategories.includes(cat)
                      ? 'bg-accent text-white'
                      : 'bg-ghost-700 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {cat} ({WARMER_CATEGORIES[cat].length})
                </button>
              ))}
            </div>
          </div>

          {/* Custom URLs */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Custom URLs (one per line)</label>
            <textarea
              className="input-field h-20 text-sm"
              value={customUrls}
              onChange={e => setCustomUrls(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Settings */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Min Time (s)</label>
              <input
                type="number"
                className="input-field"
                value={minTime}
                onChange={e => setMinTime(parseInt(e.target.value) || 5)}
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Max Time (s)</label>
              <input
                type="number"
                className="input-field"
                value={maxTime}
                onChange={e => setMaxTime(parseInt(e.target.value) || 20)}
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Max Clicks</label>
              <input
                type="number"
                className="input-field"
                value={maxClicks}
                onChange={e => setMaxClicks(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
          </div>

          {/* Human emulation toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={humanEmulation}
              onChange={e => setHumanEmulation(e.target.checked)}
              className="rounded border-ghost-500 bg-ghost-700 text-accent focus:ring-accent"
            />
            <span className="text-sm text-gray-300">Human emulation (mouse movements, random delays)</span>
          </label>

          {/* Progress */}
          {progress && isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {progress.currentIndex + 1} / {progress.totalUrls}
                </span>
                <span className="text-gray-400 truncate max-w-[200px]" title={progress.currentUrl}>
                  {progress.currentUrl
                    ? (() => {
                        try {
                          return new URL(progress.currentUrl).hostname;
                        } catch {
                          return progress.currentUrl.slice(0, 30);
                        }
                      })()
                    : '—'}
                </span>
              </div>
              {progress.phase && (
                <p className="text-xs text-accent font-medium animate-pulse" role="status">
                  {progress.phase}
                </p>
              )}
              <div className="w-full bg-ghost-700 rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((progress.currentIndex + 1) / progress.totalUrls) * 100}%` }}
                />
              </div>
            </div>
          )}

          {progress?.status === 'done' && (
            <div className="text-sm text-success">Warming completed successfully!</div>
          )}

          {progress?.status === 'stopped' && (
            <div className="text-sm text-warning">Warming was stopped.</div>
          )}

          {progress?.status === 'error' && (
            <div className="text-sm text-danger">Error: {progress.error || 'Unknown error'}</div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-ghost-700">
          <span className="text-sm text-gray-500">{totalUrls} URLs to warm</span>
          <div className="flex gap-2">
            {isRunning ? (
              <button onClick={handleStop} className="btn-danger flex items-center gap-1.5">
                <Square className="w-4 h-4" />
                Stop
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="btn-primary flex items-center gap-1.5"
                disabled={totalUrls === 0}
              >
                <Play className="w-4 h-4" />
                Start Warming
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
