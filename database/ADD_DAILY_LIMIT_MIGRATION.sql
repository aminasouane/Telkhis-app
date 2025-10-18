-- ========================================
-- Migration: Add Daily Limit to Trial System
-- ========================================
-- هذا السكريبت يضيف الحد اليومي لنظام الفترة التجريبية
-- This script adds daily limit to the trial system
-- ========================================

-- إضافة عمود last_summary_date لتتبع آخر يوم استخدم فيه التلخيص
-- Add last_summary_date column to track the last day a summary was created
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS last_summary_date DATE;

-- تحديث trial_summaries_limit إلى 1 (تلخيص واحد يومياً بدلاً من 10 إجمالي)
-- Update existing subscriptions to reflect new daily limit system
-- Note: Existing users keep their current usage, but future checks will be daily
UPDATE public.subscriptions 
SET trial_summaries_limit = 1 
WHERE plan_name = 'trial' AND status = 'active';

-- إنشاء دالة جديدة للتحقق من الحد اليومي
-- Create new function to check daily limit
CREATE OR REPLACE FUNCTION check_daily_summary_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_date DATE;
  today DATE;
BEGIN
  -- Get today's date
  today := CURRENT_DATE;
  
  -- Get the last summary date for this user
  SELECT last_summary_date INTO last_date
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active';
  
  -- If no record found or last_summary_date is NULL, allow
  IF last_date IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- If last summary was today, deny
  IF last_date = today THEN
    RETURN FALSE;
  END IF;
  
  -- Otherwise, allow
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION check_daily_summary_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_daily_summary_limit(UUID) TO anon;

-- تحديث دالة increment_trial_usage لتحديث last_summary_date
-- Update increment_trial_usage function to also update last_summary_date
CREATE OR REPLACE FUNCTION increment_trial_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET 
    trial_summaries_used = trial_summaries_used + 1,
    last_summary_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_subscriptions_last_summary_date 
ON public.subscriptions(last_summary_date);

-- ✅ انتهى
-- Migration completed successfully
