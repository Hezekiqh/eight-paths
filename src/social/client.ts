import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_KEY, SUPABASE_URL, socialEnabled } from './config';

let client: SupabaseClient | null = null;

/** The Supabase client, created on first use. Only call when `socialEnabled`. */
export function supabase(): SupabaseClient {
  if (!socialEnabled) throw new Error('Social features are not configured.');
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
    // Refresh the session only while the app is on screen.
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
  return client;
}
