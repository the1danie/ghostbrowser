import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export type OAuthProvider = 'google' | 'github';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const isElectronProduction =
    typeof window.electronAPI !== 'undefined' &&
    !window.location.origin.includes('localhost');

  // In production Electron builds, listen for deep-link OAuth callback
  useEffect(() => {
    if (!isElectronProduction) return;
    const unsubscribe = window.electronAPI.onAuthCallback(async (tokens) => {
      const { error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (error) console.error('Failed to set session from deep link:', error);
    });
    return unsubscribe;
  }, [isElectronProduction]);

  const signInWithOAuth = async (provider: OAuthProvider) => {
    if (isElectronProduction) {
      // Production Electron: open system browser, redirect back via deep link
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'ghostbrowser://auth/callback',
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.electronAPI.openExternal(data.url);
      }
    } else {
      // Dev mode or web: standard in-window redirect
      const redirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  return { user, session, loading, signIn, signUp, signInWithOAuth, signOut, resetPassword };
}
