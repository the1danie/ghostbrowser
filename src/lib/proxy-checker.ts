import type { Proxy } from './supabase';

export interface ProxyCheckResult {
  isValid: boolean;
  ip: string | null;
  country: string | null;
  city: string | null;
  latencyMs: number | null;
  error: string | null;
}

export function parseProxyString(input: string): Partial<Proxy> | null {
  input = input.trim();
  if (!input) return null;

  // Format: protocol://user:pass@host:port
  const urlMatch = input.match(/^(https?|socks[45]):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/i);
  if (urlMatch) {
    return {
      protocol: urlMatch[1].toLowerCase() as Proxy['protocol'],
      username: urlMatch[2] || null,
      password: urlMatch[3] || null,
      host: urlMatch[4],
      port: parseInt(urlMatch[5]),
    };
  }

  // Format: host:port:user:pass
  const colonMatch = input.match(/^([^:]+):(\d+):([^:]+):(.+)$/);
  if (colonMatch) {
    return {
      protocol: 'http',
      host: colonMatch[1],
      port: parseInt(colonMatch[2]),
      username: colonMatch[3],
      password: colonMatch[4],
    };
  }

  // Format: host:port
  const simpleMatch = input.match(/^([^:]+):(\d+)$/);
  if (simpleMatch) {
    return {
      protocol: 'http',
      host: simpleMatch[1],
      port: parseInt(simpleMatch[2]),
      username: null,
      password: null,
    };
  }

  return null;
}

export function proxyToConnectionString(proxy: Proxy): string {
  const auth = proxy.username && proxy.password
    ? `${proxy.username}:${proxy.password}@`
    : '';
  return `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
}

export function parseBulkProxies(text: string): Partial<Proxy>[] {
  return text
    .split('\n')
    .map(line => parseProxyString(line))
    .filter((p): p is Partial<Proxy> => p !== null);
}

// This function is called from the Electron main process via IPC
// The actual HTTP check is done there since renderer can't make raw socket connections
export async function checkProxyFromRenderer(proxyId: string): Promise<ProxyCheckResult> {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI.checkProxy(proxyId);
  }
  return {
    isValid: false,
    ip: null,
    country: null,
    city: null,
    latencyMs: null,
    error: 'Electron API not available',
  };
}
