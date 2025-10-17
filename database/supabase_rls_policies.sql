-- ========================================
-- Row Level Security (RLS) Policies
-- ========================================
-- This script enables RLS and creates secure policies for all tables
-- Execute this in Supabase SQL Editor AFTER running complete_supabase_setup.sql

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Users Table Policies
-- ========================================

-- Users can view their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- ========================================
-- Subscriptions Table Policies
-- ========================================

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own subscriptions (for trial counts)
CREATE POLICY "Users can update own subscriptions" ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ========================================
-- Summaries Table Policies
-- ========================================

-- Users can view their own summaries
CREATE POLICY "Users can view own summaries" ON summaries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own summaries
CREATE POLICY "Users can insert own summaries" ON summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own summaries
CREATE POLICY "Users can update own summaries" ON summaries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own summaries
CREATE POLICY "Users can delete own summaries" ON summaries
  FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- Settings Table Policies
-- ========================================

-- Users can view their own settings
CREATE POLICY "Users can view own settings" ON settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings" ON settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings" ON settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ========================================
-- Verification
-- ========================================
-- To verify RLS is working correctly, run these queries:

-- 1. Check RLS is enabled on all tables
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN ('users', 'subscriptions', 'summaries', 'settings');

-- 2. List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public';

-- ========================================
-- Security Notes
-- ========================================
-- - RLS is now ENABLED for all tables
-- - All database operations from the backend use service_role key (bypasses RLS)
-- - Frontend never accesses Supabase directly
-- - Guest users get proper auth.uid() through anonymous sign-in
-- - All policies enforce user_id = auth.uid() for data isolation
