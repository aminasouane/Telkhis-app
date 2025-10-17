-- ========================================
-- Takhleesly Complete Database Setup for Supabase
-- ========================================
-- This script creates all tables and adds trial system support
-- Execute this entire script in Supabase SQL Editor

-- ========================================
-- 1. Create Core Tables
-- ========================================

-- Users table with trial support
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  name TEXT,
  device_id TEXT UNIQUE,
  user_type TEXT DEFAULT 'guest' CHECK (user_type IN ('guest', 'free', 'premium', 'pro_plus')),
  subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'premium', 'pro_plus')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT users_identity_check CHECK (email IS NOT NULL OR device_id IS NOT NULL)
);

-- Subscriptions table with trial fields
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  payment_provider TEXT CHECK (payment_provider IN ('stripe', 'in-app', 'manual')),
  trial_end_date TIMESTAMP WITH TIME ZONE,
  trial_summaries_used INTEGER DEFAULT 0,
  trial_summaries_limit INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Summaries table
CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  transcript TEXT,
  key_points TEXT[],
  language TEXT NOT NULL CHECK (language IN ('ar', 'fr', 'dz')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shared BOOLEAN DEFAULT false
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_language TEXT DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'fr', 'dz')),
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. Create Indexes for Performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end_date ON subscriptions(trial_end_date);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_language ON summaries(language);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- ========================================
-- 3. Helper Functions for Trial System
-- ========================================

-- Function to check if trial has expired
CREATE OR REPLACE FUNCTION is_trial_expired(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_trial_end_date TIMESTAMP WITH TIME ZONE;
  v_trial_summaries_used INTEGER;
  v_trial_summaries_limit INTEGER;
BEGIN
  SELECT trial_end_date, trial_summaries_used, trial_summaries_limit
  INTO v_trial_end_date, v_trial_summaries_used, v_trial_summaries_limit
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check if trial expired by date
  IF v_trial_end_date IS NOT NULL AND v_trial_end_date < NOW() THEN
    RETURN TRUE;
  END IF;
  
  -- Check if trial expired by usage limit
  IF v_trial_summaries_used >= v_trial_summaries_limit THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to increment trial summary count
CREATE OR REPLACE FUNCTION increment_trial_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET trial_summaries_used = trial_summaries_used + 1
  WHERE user_id = p_user_id AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. Security Notes
-- ========================================
-- RLS (Row Level Security) is DISABLED for this application
-- Security is enforced at the application level in dbService.ts
-- All database operations require user_id verification
-- Guest users are supported through device_id authentication

-- ========================================
-- 5. Comments for Documentation
-- ========================================

COMMENT ON TABLE users IS 'User accounts including guests and authenticated users';
COMMENT ON COLUMN users.device_id IS 'Unique device identifier for guest users';
COMMENT ON COLUMN users.user_type IS 'Type of user: guest, free, premium, or pro_plus';

COMMENT ON TABLE subscriptions IS 'User subscription plans with trial support';
COMMENT ON COLUMN subscriptions.trial_end_date IS 'End date of trial period';
COMMENT ON COLUMN subscriptions.trial_summaries_used IS 'Number of summaries created during trial';
COMMENT ON COLUMN subscriptions.trial_summaries_limit IS 'Maximum summaries allowed in trial';

COMMENT ON TABLE summaries IS 'Audio transcription summaries created by users';
COMMENT ON TABLE settings IS 'User preferences and settings';

-- ========================================
-- Setup Complete!
-- ========================================
-- The database is now ready for Takhleesly with full trial system support
