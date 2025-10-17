-- ========================================
-- Migration: Add Trial System Support
-- ========================================
-- This migration adds support for guest users and trial system

-- 1. Add device_id and user_type to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS device_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'guest' CHECK (user_type IN ('guest', 'free', 'premium', 'pro_plus'));

-- Create index on device_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);

-- Update existing users to have user_type based on subscription_type
UPDATE users 
SET user_type = subscription_type 
WHERE user_type IS NULL OR user_type = 'guest';

-- 2. Add trial fields to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_summaries_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_summaries_limit INTEGER DEFAULT 10;

-- Create index on trial_end_date for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end_date ON subscriptions(trial_end_date);

-- 3. Update schema to allow email to be nullable for guest users
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add constraint to ensure either email or device_id exists
ALTER TABLE users 
ADD CONSTRAINT users_identity_check 
CHECK (email IS NOT NULL OR device_id IS NOT NULL);

-- ========================================
-- Helper Functions for Trial System
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
-- Comments for Documentation
-- ========================================

COMMENT ON COLUMN users.device_id IS 'Unique device identifier for guest users';
COMMENT ON COLUMN users.user_type IS 'Type of user: guest, free, premium, or pro_plus';
COMMENT ON COLUMN subscriptions.trial_end_date IS 'End date of trial period';
COMMENT ON COLUMN subscriptions.trial_summaries_used IS 'Number of summaries created during trial';
COMMENT ON COLUMN subscriptions.trial_summaries_limit IS 'Maximum summaries allowed in trial';
