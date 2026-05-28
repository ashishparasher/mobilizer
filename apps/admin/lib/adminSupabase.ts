/**
 * Admin Supabase Client — SERVER ONLY
 * Uses service key to bypass all RLS policies.
 * NEVER import this in client components or expose to the browser.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder';

if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn(
    '[AdminSupabase] WARNING: SUPABASE_URL or SUPABASE_SERVICE_KEY is not set. ' +
    'Admin operations will fail. This file must only be used in Server Actions / API routes.'
  );
}

/**
 * High-privilege Supabase admin client.
 * Bypasses all Row Level Security policies.
 * Use only in server-side code (Server Actions, Route Handlers).
 */
export const adminDb = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Regular Supabase client for admin user authentication only.
 */
export const supabaseAuth = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);
