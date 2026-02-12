import { useState } from 'react';
import { Loader, CheckCircle, XCircle, Zap } from 'lucide-react';
import type { Proxy } from '../lib/supabase';

interface CheckResult {
  isValid: boolean;
  ip: string | null;
  country: string | null;
  city: string | null;
  latencyMs: number | null;
  error: string | null;
  usedProtocol?: string;
}

interface Props {
  proxy?: Partial<Proxy>;
  onSubmit: (data: {
    name?: string;
    protocol: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
  }) => void;
  onCancel: () => void;
}

type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';

export default function ProxyForm({ proxy, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(proxy?.name || '');
  const [protocol, setProtocol] = useState<ProxyProtocol>(proxy?.protocol || 'http');
  const [host, setHost] = useState(proxy?.host || '');
  const [port, setPort] = useState(proxy?.port?.toString() || '');
  const [username, setUsername] = useState(proxy?.username || '');
  const [password, setPassword] = useState(proxy?.password || '');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name || undefined,
      protocol,
      host,
      port: parseInt(port),
      username: username || undefined,
      password: password || undefined,
    });
  };

  const canCheck = host.trim() !== '' && port.trim() !== '';

  const handleCheck = async () => {
    if (!canCheck) return;

    const api = (window as any).electronAPI;
    if (!api) return;

    setChecking(true);
    setCheckResult(null);

    try {
      const result: CheckResult = await api.checkProxy({
        protocol,
        host: host.trim(),
        port: parseInt(port),
        username: username || undefined,
        password: password || undefined,
      });
      setCheckResult(result);
      if (result.isValid && result.usedProtocol && result.usedProtocol !== protocol) {
        setProtocol(result.usedProtocol as ProxyProtocol);
      }
    } catch (err: any) {
      setCheckResult({
        isValid: false,
        ip: null,
        country: null,
        city: null,
        latencyMs: null,
        error: err.message || 'Check failed',
      });
    } finally {
      setChecking(false);
    }
  };

  const updateField = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(e.target.value);
    setCheckResult(null);
  };
  const updateProtocol = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProtocol(e.target.value as ProxyProtocol);
    setCheckResult(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Name (optional)</label>
        <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="My Proxy" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Protocol</label>
          <select className="select-field" value={protocol} onChange={updateProtocol}>
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="socks4">SOCKS4</option>
            <option value="socks5">SOCKS5</option>
          </select>
          <p className="text-xs text-gray-500 mt-0.5">
            Подключение к прокси. Если HTTPS не работает — попробуй HTTP.
          </p>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Host</label>
          <input className="input-field" value={host} onChange={updateField(setHost)} placeholder="1.2.3.4" required />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Port</label>
          <input
            type="number"
            className="input-field"
            value={port}
            onChange={updateField(setPort)}
            placeholder="8080"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Username (optional)</label>
          <input className="input-field" value={username} onChange={updateField(setUsername)} />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Password (optional)</label>
          <input type="password" className="input-field" value={password} onChange={updateField(setPassword)} />
        </div>
      </div>

      {/* Check result */}
      {checkResult && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${
          checkResult.isValid
            ? 'bg-green-900/20 border-green-800'
            : 'bg-red-900/20 border-red-800'
        }`}>
          {checkResult.isValid ? (
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-danger flex-shrink-0" />
          )}
          <div className="text-sm">
            {checkResult.isValid ? (
              <>
                <span className="text-success font-medium">Working</span>
                {checkResult.usedProtocol && checkResult.usedProtocol !== protocol && (
                  <span className="text-amber-400 ml-2">
                    (через {checkResult.usedProtocol.toUpperCase()})
                  </span>
                )}
                <span className="text-gray-400 ml-2">
                  IP: <span className="text-gray-200 font-mono">{checkResult.ip}</span>
                </span>
                {checkResult.country && (
                  <span className="text-gray-400 ml-2">
                    {checkResult.country}{checkResult.city ? `, ${checkResult.city}` : ''}
                  </span>
                )}
                {checkResult.latencyMs != null && (
                  <span className="text-gray-400 ml-2">{checkResult.latencyMs}ms</span>
                )}
              </>
            ) : (
              <span className="text-danger">{checkResult.error || 'Proxy is not working'}</span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary">Save Proxy</button>
        <button
          type="button"
          onClick={handleCheck}
          disabled={!canCheck || checking}
          className="btn-secondary flex items-center gap-1.5"
        >
          {checking ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {checking ? 'Checking...' : 'Check Proxy'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
