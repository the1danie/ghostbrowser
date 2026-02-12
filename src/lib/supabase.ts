import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  status: 'new' | 'active' | 'running' | 'blocked';
  group_name: string | null;
  tags: string[];
  fingerprint: BrowserFingerprint;
  proxy_id: string | null;
  cookies: any[];
  notes: string | null;
  user_data_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Proxy {
  id: string;
  user_id: string;
  name: string | null;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  country: string | null;
  city: string | null;
  is_valid: boolean;
  last_checked_at: string | null;
  created_at: string;
}

export interface BrowserFingerprint {
  userAgent: string;
  screenResolution: { width: number; height: number };
  webglVendor: string;
  webglRenderer: string;
  timezone: string;
  locale: string;
  language: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  platform: string;
  doNotTrack: string | null;
  canvasNoise: number;
  audioNoise: number;
  webrtcPolicy: 'disable' | 'real' | 'fake';
  fonts: string[];
}
