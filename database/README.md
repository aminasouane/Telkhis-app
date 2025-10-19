# دليل إعداد قاعدة بيانات Supabase

## 📋 نظرة عامة

هذا المجلد يحتوي على مخطط قاعدة البيانات لمشروع تلخيصلي.

## 🚀 خطوات التنفيذ

### 1. افتح Supabase Dashboard

1. انتقل إلى: https://supabase.com/dashboard
2. اختر مشروع **Takhleesly**
3. من القائمة الجانبية، اختر **SQL Editor**

### 2. نفّذ السكريبت

1. انسخ محتوى ملف `supabase_schema.sql`
2. الصقه في SQL Editor
3. اضغط على **Run** أو استخدم اختصار `Ctrl + Enter`

### 3. تحقق من النجاح

بعد تنفيذ السكريبت بنجاح، ستظهر رسالة تأكيد. تحقق من:

1. انتقل إلى **Table Editor** من القائمة الجانبية
2. يجب أن تشاهد 4 جداول:
   - ✅ `users`
   - ✅ `subscriptions`
   - ✅ `summaries`
   - ✅ `settings`

### 4. اختبر العلاقات (اختياري)

قم بإزالة التعليقات عن الاستعلامات التجريبية في نهاية الملف وقم بتنفيذها واحدة تلو الأخرى:

```sql
-- Test 1: إنشاء مستخدم تجريبي
INSERT INTO users (email, name, subscription_type) 
VALUES ('test@takhleesly.com', 'Test User', 'free')
RETURNING *;

-- Test 2: الحصول على المستخدم مع الاشتراك
SELECT u.*, s.plan_name, s.status, s.start_date
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE u.email = 'test@takhleesly.com';
```

## 📊 هيكل الجداول

### users (المستخدمون)
- `id`: UUID (مفتاح أساسي)
- `email`: TEXT (فريد، مطلوب)
- `name`: TEXT
- `subscription_type`: TEXT (free, premium, pro_plus)
- `created_at`: TIMESTAMP

### subscriptions (الاشتراكات)
- `id`: UUID (مفتاح أساسي)
- `user_id`: UUID (مفتاح خارجي → users.id)
- `plan_name`: TEXT
- `status`: TEXT (active, expired, cancelled)
- `start_date`, `end_date`: TIMESTAMP
- `payment_provider`: TEXT (stripe, in-app, manual)
- `stripe_customer_id`: TEXT (فريد) - معرف العميل في Stripe
- `stripe_subscription_id`: TEXT (فريد) - معرف الاشتراك في Stripe
- `stripe_price_id`: TEXT - معرف السعر في Stripe

### summaries (التلخيصات)
- `id`: UUID (مفتاح أساسي)
- `user_id`: UUID (مفتاح خارجي → users.id)
- `title`: TEXT
- `content`: TEXT (مطلوب)
- `transcript`: TEXT
- `key_points`: TEXT[] (مصفوفة)
- `language`: TEXT (ar, fr, dz)
- `created_at`: TIMESTAMP
- `shared`: BOOLEAN

### settings (الإعدادات)
- `id`: UUID (مفتاح أساسي)
- `user_id`: UUID (فريد، مفتاح خارجي → users.id)
- `preferred_language`: TEXT (ar, fr, dz)
- `notifications_enabled`: BOOLEAN

## 🔗 العلاقات

كل العلاقات تستخدم `ON DELETE CASCADE`، مما يعني:
- عند حذف مستخدم، يتم حذف جميع اشتراكاته وتلخيصاته وإعداداته تلقائياً

## ✅ التحقق من الإنجاز

- ✅ تم إنشاء جميع الجداول بنجاح
- ✅ ظهرت في Table Editor
- ✅ العلاقات تعمل بشكل صحيح
- ✅ تم توثيق المخطط في replit.md
