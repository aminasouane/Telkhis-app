-- ========================================
-- Migration: Add Trial Minutes Tracking
-- ========================================
-- This migration adds minutes-based trial tracking
-- to replace the 7-day trial system with a 30-minute trial

-- 1. Add trial minutes fields to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS trial_minutes_used NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_minutes_limit NUMERIC(10,2) DEFAULT 45.0;

-- Create index for faster queries on trial minutes
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_minutes 
ON subscriptions(trial_minutes_used, trial_minutes_limit);

-- 2. Update existing trial subscriptions to use 30-minute limit
UPDATE subscriptions
SET trial_minutes_limit = 45.0,
    trial_minutes_used = 0
WHERE plan_name = 'trial' AND status = 'active';

-- ========================================
-- Helper Function: Check Trial Expiration by Minutes
-- ========================================

-- Drop old function and create new one with minutes logic
DROP FUNCTION IF EXISTS is_trial_expired(UUID);

CREATE OR REPLACE FUNCTION is_trial_expired(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_trial_minutes_used NUMERIC(10,2);
  v_trial_minutes_limit NUMERIC(10,2);
BEGIN
  SELECT trial_minutes_used, trial_minutes_limit
  INTO v_trial_minutes_used, v_trial_minutes_limit
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no subscription found, trial is not expired (new user)
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if trial expired by minutes usage
  IF v_trial_minutes_used >= v_trial_minutes_limit THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Helper Function: Increment Trial Minutes Usage
-- ========================================

CREATE OR REPLACE FUNCTION increment_trial_minutes(p_user_id UUID, p_minutes NUMERIC(10,2))
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET trial_minutes_used = trial_minutes_used + p_minutes
  WHERE user_id = p_user_id AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Comments for Documentation
-- ========================================

COMMENT ON COLUMN subscriptions.trial_minutes_used IS 'Total audio minutes used during trial (max 45)';
COMMENT ON COLUMN subscriptions.trial_minutes_limit IS 'Maximum audio minutes allowed in trial (45 minutes)';

-- ========================================
-- Verification Queries
-- ========================================

-- Check if columns were added successfully
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'subscriptions' 
-- AND column_name LIKE 'trial_minutes%';

-- View all active trials with their minutes usage
-- SELECT 
--   u.email,
--   u.device_id,
--   u.user_type,
--   s.trial_minutes_used,
--   s.trial_minutes_limit,
--   s.trial_minutes_limit - s.trial_minutes_used as minutes_remaining
-- FROM users u
-- JOIN subscriptions s ON u.id = s.user_id
-- WHERE s.plan_name = 'trial' AND s.status = 'active';
