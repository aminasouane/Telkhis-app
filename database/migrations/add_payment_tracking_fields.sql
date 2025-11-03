-- Migration: Add Payment Tracking Fields to Subscriptions
-- Description: Adds transaction_id, payment_method, and payment_status fields
-- to the subscriptions table for better payment tracking and auditing
-- 
-- ⚠️ IMPORTANT: Execute this SQL in your Supabase SQL Editor ONCE
-- Date: 2025-11-03

-- Add new payment tracking columns to subscriptions table
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Add comment to document the columns
COMMENT ON COLUMN subscriptions.transaction_id IS 'Chargily transaction ID for payment tracking';
COMMENT ON COLUMN subscriptions.payment_method IS 'Payment method used (e.g., CIB, EDAHABIA, BaridiMob)';
COMMENT ON COLUMN subscriptions.payment_status IS 'Current payment status: pending, paid, failed, refunded';

-- Create index for faster payment status queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_status 
  ON subscriptions(payment_status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_transaction_id 
  ON subscriptions(transaction_id);

-- Migration complete
-- ✅ You can now track payment status and transaction IDs
