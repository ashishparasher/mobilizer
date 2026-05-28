-- ============================================================
-- FIX: Supabase RLS Infinite Recursion on "users" table
-- ============================================================
-- 
-- PROBLEM:
-- The policy "Campaigners can view participant basic info" on the 
-- users table contains a self-referencing subquery:
--   EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'campaigner')
--
-- When Supabase evaluates this SELECT on users, it triggers ALL 
-- SELECT policies on the users table again — including this one.
-- This creates infinite recursion.
--
-- SOLUTION:
-- Replace the self-referencing query with a SECURITY DEFINER function
-- that checks the user's role without triggering RLS policies.
-- ============================================================

-- Step 1: Create a helper function that bypasses RLS
-- This function runs with elevated privileges (SECURITY DEFINER)
-- so it can read the users table without triggering RLS policies.
CREATE OR REPLACE FUNCTION public.is_campaigner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid() AND role = 'campaigner'
  );
$$;

-- Step 2: Drop the problematic self-referencing policy
DROP POLICY IF EXISTS "Campaigners can view participant basic info" ON users;

-- Step 3: Recreate the policy using the helper function (no recursion)
CREATE POLICY "Campaigners can view participant basic info" ON users
  FOR SELECT USING (
    public.is_campaigner()
  );

-- ============================================================
-- VERIFICATION: Run this query to confirm the fix
-- ============================================================
-- SELECT * FROM users LIMIT 5;
-- (Should NOT throw "infinite recursion detected" anymore)
