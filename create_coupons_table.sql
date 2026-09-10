-- ==============================================================================
-- Optional Table: coupons & coupon_usages
-- Note: The application currently stores coupons and usages inside system_settings
-- which works automatically without manual execution. This script is provided if
-- you prefer having dedicated standalone relational tables in Supabase.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
    valid_for_registration BOOLEAN NOT NULL DEFAULT true,
    valid_for_renewal BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_uses INTEGER DEFAULT NULL,
    times_used INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.coupon_usages (
    id TEXT PRIMARY KEY,
    coupon_id TEXT REFERENCES public.coupons(id) ON DELETE SET NULL,
    coupon_code TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT,
    plan_id TEXT NOT NULL,
    original_price NUMERIC NOT NULL,
    discount_percent INTEGER NOT NULL,
    discount_amount NUMERIC NOT NULL,
    final_price NUMERIC NOT NULL,
    usage_type TEXT NOT NULL CHECK (usage_type IN ('registration', 'renewal')),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
