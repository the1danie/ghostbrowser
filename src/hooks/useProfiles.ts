import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, BrowserFingerprint } from '../lib/supabase';

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles().catch((err) => {
      console.error('[GhostBrowser] Failed to fetch profiles:', err);
    });
  }, [fetchProfiles]);

  const deleteLocalProfileData = async (profileId: string) => {
    const api = (window as any).electronAPI;
    if (!api?.deleteProfileData) return;

    try {
      const result = await api.deleteProfileData(profileId);
      if (!result?.success) {
        console.warn(`[GhostBrowser] Failed to remove local profile data for ${profileId}:`, result?.error);
      }
    } catch (err) {
      console.warn(`[GhostBrowser] Failed to remove local profile data for ${profileId}:`, err);
    }
  };

  const createProfile = async (profile: {
    name: string;
    fingerprint: BrowserFingerprint;
    group_name?: string;
    tags?: string[];
    proxy_id?: string;
    notes?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        ...profile,
        user_id: user.id,
        status: 'new',
        cookies: [],
      })
      .select()
      .single();

    if (error) throw error;
    setProfiles(prev => [data, ...prev]);
    return data;
  };

  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setProfiles(prev => prev.map(p => (p.id === id ? data : p)));
    return data;
  };

  const deleteProfile = async (id: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
    setProfiles(prev => prev.filter(p => p.id !== id));
    await deleteLocalProfileData(id);
  };

  const deleteProfiles = async (ids: string[]) => {
    const { error } = await supabase.from('profiles').delete().in('id', ids);
    if (error) throw error;
    setProfiles(prev => prev.filter(p => !ids.includes(p.id)));
    await Promise.all(ids.map(id => deleteLocalProfileData(id)));
  };

  const duplicateProfile = async (id: string) => {
    const original = profiles.find(p => p.id === id);
    if (!original) throw new Error('Profile not found');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        name: `${original.name} (copy)`,
        status: 'new',
        group_name: original.group_name,
        tags: original.tags,
        fingerprint: original.fingerprint,
        proxy_id: null,
        cookies: [],
        notes: original.notes,
      })
      .select()
      .single();

    if (error) throw error;
    setProfiles(prev => [data, ...prev]);
    return data;
  };

  const importProfiles = async (jsonData: any[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const toInsert = jsonData.map(p => ({
      user_id: user.id,
      name: p.name || 'Imported Profile',
      status: 'new' as const,
      group_name: p.group_name || null,
      tags: p.tags || [],
      fingerprint: p.fingerprint,
      cookies: p.cookies || [],
      notes: p.notes || null,
    }));

    const { data, error } = await supabase
      .from('profiles')
      .insert(toInsert)
      .select();

    if (error) throw error;
    setProfiles(prev => [...(data || []), ...prev]);
  };

  const exportProfiles = (ids: string[]) => {
    const toExport = profiles
      .filter(p => ids.includes(p.id))
      .map(({ id, user_id, created_at, updated_at, user_data_path, ...rest }) => rest);
    return JSON.stringify(toExport, null, 2);
  };

  return {
    profiles,
    loading,
    fetchProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    deleteProfiles,
    duplicateProfile,
    importProfiles,
    exportProfiles,
  };
}
