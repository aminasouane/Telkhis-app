-- ========================================
-- Migration: Add Stripe Integration Fields
-- ========================================
-- This migration adds Stripe-related fields to the subscriptions table
-- Run this in Supabase SQL Editor

-- Add Stripe fields to subscriptions table
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Create indexes for Stripe IDs for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID (cus_xxx)';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID (sub_xxx)';
COMMENT ON COLUMN subscriptions.stripe_price_id IS 'Stripe price ID (price_xxx)';
