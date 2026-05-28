declare const process: any;
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Environment variables in Expo must start with EXPO_PUBLIC_
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.error('[Supabase] EXPO_PUBLIC_SUPABASE_URL is missing or invalid:', supabaseUrl);
}
if (!supabaseAnonKey || supabaseAnonKey === 'placeholder') {
  console.error('[Supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY is missing or invalid');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Helper to fetch token and return standard API authorization header
 */
export async function getAuthHeaders(): Promise<{ Authorization?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    }
  } catch (err) {
    console.error('Error fetching auth token for headers:', err);
  }
  return {};
}
