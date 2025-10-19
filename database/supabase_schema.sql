-- ========================================
-- Takhleesly Database Schema for Supabase
-- ========================================
-- This script creates the core tables for the Takhleesly application
-- Execute this in Supabase SQL Editor

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'premium', 'pro_plus')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  payment_provider TEXT CHECK (payment_provider IN ('stripe', 'in-app', 'manual')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster joins
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- 3. Create summaries table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_language ON summaries(language);

-- 4. Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_language TEXT DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'fr', 'dz')),
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- ========================================
-- Test Queries to Verify Relations
-- ========================================

-- Test 1: Create a sample user
-- INSERT INTO users (email, name, subscription_type) 
-- VALUES ('test@takhleesly.com', 'Test User', 'free')
-- RETURNING *;

-- Test 2: Get user with subscription
-- SELECT u.*, s.plan_name, s.status, s.start_date
-- FROM users u
-- LEFT JOIN subscriptions s ON u.id = s.user_id
-- WHERE u.email = 'test@takhleesly.com';

-- Test 3: Get user with summaries
-- SELECT u.name, COUNT(sm.id) as summary_count
-- FROM users u
-- LEFT JOIN summaries sm ON u.id = sm.user_id
-- GROUP BY u.id, u.name;

-- Test 4: Get all data for a user
-- SELECT 
--   u.*,
--   s.plan_name,
--   s.status as subscription_status,
--   st.preferred_language,
--   st.notifications_enabled,
--   COUNT(sm.id) as total_summaries
-- FROM users u
-- LEFT JOIN subscriptions s ON u.id = s.user_id
-- LEFT JOIN settings st ON u.id = st.user_id
-- LEFT JOIN summaries sm ON u.id = sm.user_id
-- WHERE u.email = 'test@takhleesly.com'
-- GROUP BY u.id, s.plan_name, s.status, st.preferred_language, st.notifications_enabled;
