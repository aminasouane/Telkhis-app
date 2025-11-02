-- ========================================
-- Migration: Add Chargily Pay Integration
-- ========================================
-- This migration adds Chargily-related fields and payment tracking table
-- Run this in Supabase SQL Editor

-- 1. Add Chargily fields to subscriptions table
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS chargily_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS chargily_checkout_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS chargily_product_id TEXT,
  ADD COLUMN IF NOT EXISTS chargily_price_id TEXT;

-- Update payment_provider CHECK constraint to include 'chargily'
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_payment_provider_check;
ALTER TABLE subscriptions 
  ADD CONSTRAINT subscriptions_payment_provider_check 
  CHECK (payment_provider IN ('stripe', 'chargily', 'in-app', 'manual'));

-- Create indexes for Chargily IDs for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_chargily_customer ON subscriptions(chargily_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_chargily_checkout ON subscriptions(chargily_checkout_id);

-- Add comments for documentation
COMMENT ON COLUMN subscriptions.chargily_customer_id IS 'Chargily customer ID';
COMMENT ON COLUMN subscriptions.chargily_checkout_id IS 'Chargily checkout ID';
COMMENT ON COLUMN subscriptions.chargily_product_id IS 'Chargily product ID';
COMMENT ON COLUMN subscriptions.chargily_price_id IS 'Chargily price ID';

-- 2. Create payments table to track all payment transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Payment details
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'DZD' NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'canceled', 'refunded')),
  
  -- Chargily specific fields
  chargily_checkout_id TEXT UNIQUE,
  chargily_customer_id TEXT,
  payment_method TEXT, -- 'edahabia', 'cib', 'chargily_app', etc.
  
  -- Metadata
  plan_name TEXT,
  metadata JSONB, -- For storing additional Chargily webhook data
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_chargily_checkout ON payments(chargily_checkout_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Add comments for payments table
COMMENT ON TABLE payments IS 'Tracks all payment transactions for subscriptions';
COMMENT ON COLUMN payments.chargily_checkout_id IS 'Chargily checkout ID from webhook';
COMMENT ON COLUMN payments.metadata IS 'Additional data from Chargily webhooks (JSON)';
COMMENT ON COLUMN payments.paid_at IS 'Timestamp when payment was confirmed as paid';

-- 3. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for payments table
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Test Queries (Commented Out)
-- ========================================

-- Test 1: View all payment methods available
-- SELECT DISTINCT payment_provider FROM subscriptions;

-- Test 2: Get user payment history
-- SELECT 
--   p.id,
--   p.amount,
--   p.currency,
--   p.status,
--   p.plan_name,
--   p.payment_method,
--   p.created_at,
--   p.paid_at
-- FROM payments p
-- WHERE p.user_id = 'USER_ID_HERE'
-- ORDER BY p.created_at DESC;

-- Test 3: Get active subscriptions with payment info
-- SELECT 
--   u.email,
--   u.name,
--   s.plan_name,
--   s.status,
--   s.payment_provider,
--   s.start_date,
--   s.end_date,
--   p.amount,
--   p.paid_at
-- FROM users u
-- JOIN subscriptions s ON u.id = s.user_id
-- LEFT JOIN payments p ON s.id = p.subscription_id
-- WHERE s.status = 'active'
-- ORDER BY s.start_date DESC;
