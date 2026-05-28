import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl) {
  console.warn('Warning: SUPABASE_URL is not set in environment variables.');
}

// Client for user authentication checking
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Client for high-privileged admin/database updates
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
