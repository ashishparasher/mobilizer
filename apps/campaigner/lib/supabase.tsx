import React from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Singleton pattern to prevent multiple GoTrueClient instances during HMR
const globalForSupabase = globalThis as unknown as { __supabaseClient: SupabaseClient };
export const supabase = globalForSupabase.__supabaseClient || createClient(supabaseUrl, supabaseAnonKey);
if (process.env.NODE_ENV !== 'production') globalForSupabase.__supabaseClient = supabase;

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

export async function getSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (err) {
    console.error('Error fetching supabase session:', err);
    return null;
  }
}

/**
 * Client-side High-Order Component to protect pages
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedComponent(props: P) {
    const [loading, setLoading] = React.useState(true);
    const [authenticated, setAuthenticated] = React.useState(false);

    React.useEffect(() => {
      async function verify() {
        const session = await getSession();
        if (!session) {
          window.location.href = '/login';
        } else {
          setAuthenticated(true);
          setLoading(false);
        }
      }
      verify();
    }, []);

    if (loading || !authenticated) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F8FAFC]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF6B35] border-t-transparent" />
          <p className="mt-4 text-xs font-bold tracking-wider text-[#1A1A2E]">LOADING CAMPAIGNER PORTAL</p>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
