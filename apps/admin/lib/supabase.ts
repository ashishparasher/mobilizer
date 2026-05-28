'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

/** Browser-side Supabase client — for auth only */
const globalForSupabase = globalThis as unknown as { __supabaseAdminClient: SupabaseClient };
export const supabase = globalForSupabase.__supabaseAdminClient || createClient(supabaseUrl, supabaseAnonKey);
if (process.env.NODE_ENV !== 'production') globalForSupabase.__supabaseAdminClient = supabase;

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (session) {
        const maxAge = 100 * 365 * 24 * 60 * 60; // 100 years
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; secure`;
        document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax; secure`;
      }
    } else if (event === 'SIGNED_OUT') {
      document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax; secure';
      document.cookie = 'sb-refresh-token=; path=/; max-age=0; SameSite=Lax; secure';
    }
  });
}

export async function getAdminSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}
