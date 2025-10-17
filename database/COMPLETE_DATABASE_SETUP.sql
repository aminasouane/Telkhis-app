-- ========================================
-- إعداد قاعدة البيانات الكاملة لتطبيق تلخيصلي
-- Complete Database Setup for Takhleesly App
-- ========================================
-- نفّذ هذا الملف في Supabase SQL Editor
-- Run this file in Supabase SQL Editor
-- ========================================

-- ✅ الخطوة 1: إنشاء الجداول (Create Tables)
-- ========================================

-- جدول المستخدمين (Users Table)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  device_id TEXT UNIQUE,
  user_type TEXT DEFAULT 'guest',
  subscription_type TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الاشتراكات (Subscriptions Table)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_name TEXT DEFAULT 'trial',
  status TEXT DEFAULT 'active',
  trial_end_date TIMESTAMP WITH TIME ZONE,
  trial_summaries_used INTEGER DEFAULT 0,
  trial_summaries_limit INTEGER DEFAULT 10,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول التلخيصات (Summaries Table)
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  language TEXT,
  transcript TEXT,
  content TEXT,
  key_points TEXT[],
  audio_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الإعدادات (Settings Table)
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  preferred_language TEXT DEFAULT 'ar',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ✅ الخطوة 2: إنشاء الفهارس للأداء (Create Indexes)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_users_device_id ON public.users(device_id);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON public.users(user_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON public.summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON public.summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);

-- ✅ الخطوة 3: إنشاء RPC Function للعداد الذري
-- ========================================

-- وظيفة لزيادة عدد التلخيصات بشكل ذري (منع race conditions)
CREATE OR REPLACE FUNCTION increment_trial_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET trial_summaries_used = trial_summaries_used + 1
  WHERE user_id = p_user_id
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION increment_trial_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_trial_usage(UUID) TO anon;

-- ✅ الخطوة 4: تفعيل Row Level Security (RLS)
-- ========================================
-- ملاحظة: فعّل RLS بعد التأكد من عمل كل شيء بشكل صحيح

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ✅ الخطوة 5: إنشاء سياسات الأمان (Security Policies)
-- ========================================

-- سياسة جدول المستخدمين: المستخدم يمكنه قراءة وتعديل بياناته فقط
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- سياسة جدول الاشتراكات: المستخدم يمكنه الوصول لاشتراكه فقط
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "subscriptions_update_own" ON public.subscriptions;
CREATE POLICY "subscriptions_update_own" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "subscriptions_insert_own" ON public.subscriptions;
CREATE POLICY "subscriptions_insert_own" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- سياسة جدول التلخيصات: المستخدم يمكنه الوصول لتلخيصاته فقط
DROP POLICY IF EXISTS "summaries_select_own" ON public.summaries;
CREATE POLICY "summaries_select_own" ON public.summaries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "summaries_insert_own" ON public.summaries;
CREATE POLICY "summaries_insert_own" ON public.summaries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "summaries_update_own" ON public.summaries;
CREATE POLICY "summaries_update_own" ON public.summaries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "summaries_delete_own" ON public.summaries;
CREATE POLICY "summaries_delete_own" ON public.summaries
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- سياسة جدول الإعدادات: المستخدم يمكنه الوصول لإعداداته فقط
DROP POLICY IF EXISTS "settings_select_own" ON public.settings;
CREATE POLICY "settings_select_own" ON public.settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "settings_insert_own" ON public.settings;
CREATE POLICY "settings_insert_own" ON public.settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "settings_update_own" ON public.settings;
CREATE POLICY "settings_update_own" ON public.settings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ✅ الخطوة 6: السماح للـ service_role بتجاوز RLS
-- ========================================
-- هذا ضروري للسماح للخادم بإنشاء المستخدمين الضيوف

DROP POLICY IF EXISTS "allow_service_role_all_users" ON public.users;
CREATE POLICY "allow_service_role_all_users" ON public.users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_service_role_all_subscriptions" ON public.subscriptions;
CREATE POLICY "allow_service_role_all_subscriptions" ON public.subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_service_role_all_summaries" ON public.summaries;
CREATE POLICY "allow_service_role_all_summaries" ON public.summaries
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_service_role_all_settings" ON public.settings;
CREATE POLICY "allow_service_role_all_settings" ON public.settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ========================================
-- ✅ تم الإعداد! Setup Complete!
-- ========================================

-- للتحقق من الجداول المُنشأة، نفّذ:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- للتحقق من السياسات المُنشأة، نفّذ:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

-- ========================================
-- 📝 ملاحظات مهمة:
-- ========================================
-- 1. تأكد من تحديث SUPABASE_SERVICE_ROLE_KEY في Replit Secrets
-- 2. RLS مفعّل على جميع الجداول
-- 3. السياسات تضمن أن المستخدم يمكنه الوصول لبياناته فقط
-- 4. service_role يمكنه تجاوز RLS (للعمليات الإدارية)
-- 5. RPC function جاهزة للاستخدام في زيادة عداد التجربة
-- ========================================
