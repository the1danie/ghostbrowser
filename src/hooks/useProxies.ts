import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Proxy } from '../lib/supabase';

interface ProxyCredentialsInput {
  protocol: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export function useProxies() {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProxies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proxies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProxies(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProxies().catch((err) => {
      console.error('[NebulaBrowse] Failed to fetch proxies:', err);
    });
  }, [fetchProxies]);

  const probeProxyMeta = async (input: ProxyCredentialsInput) => {
    const api = (window as any).electronAPI;
    if (!api) return null;

    try {
      const result = await api.checkProxy(input);
      const checkedAt = new Date().toISOString();
      return {
        protocol: result.usedProtocol || input.protocol,
        is_valid: result.isValid,
        country: result.country || null,
        city: result.city || null,
        last_checked_at: checkedAt,
      };
    } catch {
      return null;
    }
  };

  const createProxy = async (proxy: {
    name?: string;
    protocol: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const probe = await probeProxyMeta(proxy);
    const toInsert: any = {
      ...proxy,
      user_id: user.id,
    };
    if (probe) {
      toInsert.protocol = probe.protocol;
      toInsert.is_valid = probe.is_valid;
      toInsert.country = probe.country;
      toInsert.city = probe.city;
      toInsert.last_checked_at = probe.last_checked_at;
    }

    const { data, error } = await supabase
      .from('proxies')
      .insert(toInsert)
      .select()
      .single();

    if (error) throw error;
    setProxies(prev => [data, ...prev]);
    return data;
  };

  const updateProxy = async (id: string, updates: Partial<Proxy>) => {
    const current = proxies.find(p => p.id === id);
    const shouldProbe = ['protocol', 'host', 'port', 'username', 'password']
      .some((field) => field in updates);
    const toUpdate: any = { ...updates };

    if (shouldProbe) {
      const probeInput: ProxyCredentialsInput = {
        protocol: (updates.protocol as string | undefined) || current?.protocol || 'http',
        host: updates.host || current?.host || '',
        port: updates.port || current?.port || 0,
        username: (updates.username as string | null | undefined) ?? current?.username ?? undefined,
        password: (updates.password as string | null | undefined) ?? current?.password ?? undefined,
      };

      if (probeInput.host && probeInput.port > 0) {
        const probe = await probeProxyMeta(probeInput);
        if (probe) {
          toUpdate.protocol = probe.protocol;
          toUpdate.is_valid = probe.is_valid;
          toUpdate.country = probe.country;
          toUpdate.city = probe.city;
          toUpdate.last_checked_at = probe.last_checked_at;
        }
      }
    }

    const { data, error } = await supabase
      .from('proxies')
      .update(toUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setProxies(prev => prev.map(p => (p.id === id ? data : p)));
    return data;
  };

  const deleteProxy = async (id: string) => {
    const { error } = await supabase.from('proxies').delete().eq('id', id);
    if (error) throw error;
    setProxies(prev => prev.filter(p => p.id !== id));
  };

  const deleteProxies = async (ids: string[]) => {
    const { error } = await supabase.from('proxies').delete().in('id', ids);
    if (error) throw error;
    setProxies(prev => prev.filter(p => !ids.includes(p.id)));
  };

  const bulkImport = async (proxyList: Partial<Proxy>[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const toInsert = proxyList.map(p => ({
      user_id: user.id,
      protocol: p.protocol || 'http',
      host: p.host!,
      port: p.port!,
      username: p.username || null,
      password: p.password || null,
      name: p.name || null,
    }));

    const { data, error } = await supabase
      .from('proxies')
      .insert(toInsert)
      .select();

    if (error) throw error;
    setProxies(prev => [...(data || []), ...prev]);
    return data;
  };

  const checkProxy = async (id: string) => {
    const proxy = proxies.find(p => p.id === id);
    if (!proxy) throw new Error('Proxy not found');

    const api = (window as any).electronAPI;
    if (!api) throw new Error('Electron API not available');

    const result = await api.checkProxy(proxy);

    await supabase
      .from('proxies')
      .update({
        is_valid: result.isValid,
        country: result.country,
        city: result.city,
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', id);

    setProxies(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, is_valid: result.isValid, country: result.country, city: result.city, last_checked_at: new Date().toISOString() }
          : p
      )
    );

    return result;
  };

  return {
    proxies,
    loading,
    fetchProxies,
    createProxy,
    updateProxy,
    deleteProxy,
    deleteProxies,
    bulkImport,
    checkProxy,
  };
}
