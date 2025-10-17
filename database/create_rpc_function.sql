-- ========================================
-- PostgreSQL RPC Function for Atomic Trial Increment
-- ========================================
-- This function is used by the backend to atomically increment trial usage
-- Execute this in Supabase SQL Editor after running complete_supabase_setup.sql

CREATE OR REPLACE FUNCTION increment_trial_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET trial_summaries_used = trial_summaries_used + 1
  WHERE user_id = p_user_id
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_trial_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_trial_usage(UUID) TO anon;

-- ========================================
-- Verification
-- ========================================
-- To test this function works:
-- SELECT increment_trial_usage('your-user-id-here');
-- 
-- Then verify the count increased:
-- SELECT trial_summaries_used FROM subscriptions WHERE user_id = 'your-user-id-here';
