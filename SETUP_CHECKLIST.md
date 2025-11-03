# ✅ قائمة التحقق النهائية لإعداد تلخيصلي

## 📋 نظرة عامة

هذا الدليل يوضح جميع الخطوات المطلوبة لتشغيل تطبيق تلخيصلي بشكل كامل مع نظام الدفع.

---

## 🔐 الخطوة 1: إعداد قاعدة البيانات

### 1.1 تنفيذ Migrations المطلوبة

يجب عليك تنفيذ 3 migrations في **Supabase SQL Editor**:

```bash
# الترتيب مهم جداً:
1. database/migrations/add_trial_minutes_fields.sql
2. database/migrations/add_chargily_integration.sql
3. database/migrations/add_payment_tracking_fields.sql
```

#### كيفية التنفيذ:

1. افتح **Supabase Dashboard**: https://supabase.com/dashboard
2. اذهب إلى مشروعك
3. انقر على **SQL Editor** من القائمة الجانبية
4. افتح ملف migration الأول
5. انسخ محتوى الملف بالكامل
6. الصقه في SQL Editor
7. اضغط **Run** أو **Ctrl+Enter**
8. كرر العملية للملفات الثلاثة بالترتيب

### 1.2 التحقق من نجاح Migrations

بعد تنفيذ جميع الـ migrations، قم بتشغيل هذا SQL للتحقق:

```sql
-- التحقق من وجود الحقول الجديدة في subscriptions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
ORDER BY ordinal_position;

-- يجب أن ترى:
-- trial_minutes_used
-- trial_minutes_limit
-- chargily_customer_id
-- chargily_checkout_id
-- transaction_id
-- payment_method
-- payment_status
```

---

## 🔑 الخطوة 2: إعداد Environment Variables

### 2.1 المتغيرات الموجودة حالياً (✅ تم)

هذه المتغيرات موجودة بالفعل في Replit Secrets:

- ✅ `CHARGILY_API_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `SESSION_SECRET`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `VITE_SUPABASE_URL`

### 2.2 المتغيرات المطلوبة (❌ مفقودة)

يجب عليك إضافة المتغيرات التالية في **Replit Secrets**:

#### أ. روابط الدفع من Chargily

```bash
Key: CHARGILY_LINK_BASIC
Value: [رابط الدفع للخطة الأساسية من Chargily]

Key: CHARGILY_LINK_STUDENT
Value: [رابط الدفع لخطة الطالب من Chargily]

Key: CHARGILY_LINK_PROFESSIONAL
Value: [رابط الدفع للخطة المحترفة من Chargily]
```

**📚 كيفية الحصول على الروابط:** راجع `PAYMENT_LINKS_SETUP.md`

#### ب. وضع التشغيل (Test/Live)

```bash
Key: CHARGILY_MODE
Value: live    # استخدم "test" للاختبار، "live" للإنتاج
```

### 2.3 التحقق من المتغيرات

بعد إضافة جميع المتغيرات، افتح في المتصفح:

```
https://your-app.replit.app/api/payment-links/status
```

يجب أن ترى:

```json
{
  "basic": { "configured": true, "link": "✓ Set" },
  "student": { "configured": true, "link": "✓ Set" },
  "professional": { "configured": true, "link": "✓ Set" },
  "allConfigured": true
}
```

---

## 🔗 الخطوة 3: إعداد Chargily Dashboard

### 3.1 إنشاء روابط الدفع المباشرة

راجع `PAYMENT_LINKS_SETUP.md` للحصول على دليل مفصل خطوة بخطوة.

**الخطوات الأساسية:**
1. سجّل الدخول إلى Chargily Dashboard
2. أنشئ 3 payment links (واحد لكل خطة)
3. أضف Success URL و Failure URL لكل رابط
4. أضف Metadata (plan_id, plan_name, etc.)
5. انسخ الروابط الناتجة

### 3.2 تكوين Webhook

**مهم جداً:** بدون webhook، الاشتراكات لن تُفعّل تلقائياً!

```
1. في Chargily Dashboard → Developers → Webhooks
2. اضغط: Add Webhook Endpoint
3. أدخل:
   - URL: https://your-app.replit.app/api/chargily/webhook
   - Events: ✅ checkout.paid, ✅ checkout.failed
   - Status: Active ✅
4. احفظ Webhook Secret (إذا طُلب)
```

---

## 🧪 الخطوة 4: الاختبار

### 4.1 اختبار تدفق الدفع الكامل

#### السيناريو الكامل:

```
1. افتح التطبيق: /
2. سجّل الدخول كمستخدم جديد
3. اذهب إلى: /subscribe
4. اختر "خطة الطالب"
5. اضغط "اشترك الآن"
6. تحقق من التوجيه إلى Chargily
7. أكمل الدفع (استخدم بطاقة اختبار في Test Mode)
8. تحقق من التوجيه إلى: /payment/success
9. تحقق من عرض تفاصيل الخطة بشكل صحيح
10. اذهب إلى الصفحة الرئيسية
11. تحقق من أن الاشتراك نشط (لا يوجد حد زمني)
```

### 4.2 التحقق من قاعدة البيانات

بعد دفعة ناجحة، تحقق في Supabase:

```sql
-- التحقق من الاشتراك
SELECT 
  user_id, 
  plan_name, 
  status, 
  start_date, 
  end_date,  -- يجب أن يكون NULL (دائم)
  payment_status,
  transaction_id,
  payment_method
FROM subscriptions 
WHERE user_id = '[user_id]';

-- التحقق من سجل الدفع
SELECT 
  user_id,
  plan_name,
  amount,
  currency,
  status,
  paid_at,
  chargily_checkout_id
FROM payments 
WHERE user_id = '[user_id]'
ORDER BY paid_at DESC;
```

**المتوقع:**
- ✅ `status = 'active'`
- ✅ `end_date = NULL` (اشتراك دائم)
- ✅ `payment_status = 'paid'`
- ✅ يوجد سجل في `payments` مع `status = 'paid'`

### 4.3 اختبار Webhook

في Chargily Dashboard:
```
1. اذهب إلى: Developers → Webhooks
2. اختر webhook الخاص بك
3. اضغط: View Logs
4. تحقق من:
   - ✅ تم إرسال webhook بعد الدفع
   - ✅ الرد كان 200 OK
   - ✅ لا توجد أخطاء
```

في Replit Logs:
```
ابحث عن:
- "[Webhook] Received event: checkout.paid"
- "[Webhook] Subscription activated"
- "[Webhook] ✅ Subscription fully activated"
```

---

## 🚀 الخطوة 5: التشغيل النهائي

### 5.1 التبديل من Test إلى Live Mode

عندما تكون جاهزاً للإنتاج:

```bash
# في Replit Secrets
CHARGILY_MODE=live

# تحديث روابط الدفع إلى روابط Live (وليس Test)
CHARGILY_LINK_BASIC=[live link]
CHARGILY_LINK_STUDENT=[live link]
CHARGILY_LINK_PROFESSIONAL=[live link]
```

**⚠️ تحذير:**
- روابط Test Mode لن تعمل في Live Mode
- يجب إنشاء روابط جديدة في Live Mode
- Webhook URL يجب أن يكون HTTPS (Replit توفر هذا تلقائياً)

### 5.2 إعادة تشغيل التطبيق

بعد أي تغيير في Environment Variables:

```bash
# التطبيق سيُعاد تشغيله تلقائياً في Replit
# أو يمكنك إعادة التشغيل يدوياً من Shell:
npm run dev
```

---

## 📊 مراقبة العمليات

### الأدوات المتاحة:

#### 1. Chargily Dashboard
```
- المدفوعات: Payments → All Payments
- الإحصائيات: Dashboard → Analytics
- Webhooks: Developers → Webhooks → Logs
```

#### 2. Supabase Dashboard
```sql
-- إحصائيات الاشتراكات
SELECT 
  plan_name,
  COUNT(*) as total_subscriptions,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions
FROM subscriptions
GROUP BY plan_name;

-- آخر 10 دفعات
SELECT 
  user_id,
  plan_name,
  amount,
  currency,
  status,
  paid_at
FROM payments 
ORDER BY paid_at DESC 
LIMIT 10;
```

#### 3. Replit Logs
```
ابحث عن:
- Errors: grep للعثور على "Error" أو "Failed"
- Webhooks: grep للعثور على "[Webhook]"
- Payments: grep للعثور على "payment"
```

---

## 🐛 استكشاف الأخطاء

### المشكلة 1: "رابط الدفع غير متوفر"

**الحل:**
```bash
1. تحقق من Replit Secrets:
   - Tools → Secrets
   - ابحث عن CHARGILY_LINK_*
2. إذا كانت مفقودة، أضفها
3. أعد تشغيل التطبيق
4. تحقق من: /api/payment-links/status
```

### المشكلة 2: الدفع نجح لكن الاشتراك لم يُفعّل

**الحل:**
```bash
1. تحقق من Chargily Webhook Logs:
   - هل تم إرسال webhook؟
   - هل كان الرد 200 OK؟
2. تحقق من Replit Logs:
   - ابحث عن "[Webhook] Received event"
   - ابحث عن أي أخطاء
3. تحقق من Supabase:
   - هل تم إنشاء سجل subscription؟
   - ما هي قيمة status؟
```

### المشكلة 3: Column not found في Database

**الحل:**
```sql
-- السبب: Migrations لم تُنفذ
-- الحل: نفّذ جميع migrations بالترتيب:

1. add_trial_minutes_fields.sql
2. add_chargily_integration.sql
3. add_payment_tracking_fields.sql

-- في Supabase SQL Editor
```

### المشكلة 4: Webhook Signature Verification Failed

**الحل:**
```bash
1. تحقق من CHARGILY_API_KEY في Replit Secrets
2. تأكد أنه يطابق المفتاح في Chargily Dashboard
3. تحقق من CHARGILY_MODE (test/live)
4. تأكد أن الوضع يطابق روابط الدفع
```

---

## ✅ Checklist النهائي

قبل الإطلاق الرسمي:

### قاعدة البيانات:
- [ ] نفّذت جميع migrations الثلاثة
- [ ] تحققت من وجود الحقول الجديدة
- [ ] اختبرت إنشاء subscription يدوياً

### Environment Variables:
- [ ] أضفت CHARGILY_LINK_BASIC
- [ ] أضفت CHARGILY_LINK_STUDENT
- [ ] أضفت CHARGILY_LINK_PROFESSIONAL
- [ ] ضبطت CHARGILY_MODE (test أو live)
- [ ] تحققت من /api/payment-links/status

### Chargily Dashboard:
- [ ] أنشأت 3 payment links
- [ ] أضفت Success/Failure URLs
- [ ] أضفت Metadata لكل رابط
- [ ] كوّنت Webhook
- [ ] اختبرت webhook في Test Mode

### الاختبار:
- [ ] اختبرت التدفق الكامل من البداية للنهاية
- [ ] تحققت من تفعيل الاشتراك تلقائياً
- [ ] تحققت من إنشاء سجلات في قاعدة البيانات
- [ ] اختبرت سيناريو الفشل (/payment/failed)
- [ ] تحققت من webhook logs في Chargily

### الإنتاج:
- [ ] بدّلت إلى Live Mode
- [ ] حدّثت روابط الدفع إلى Live
- [ ] اختبرت دفعة حقيقية صغيرة
- [ ] راجعت جميع الأسعار (DZD صحيحة)
- [ ] جهّزت نظام دعم العملاء

---

## 🎯 الخلاصة

بعد إتمام جميع الخطوات:

1. ✅ قاعدة البيانات جاهزة مع جميع الحقول
2. ✅ روابط الدفع مُكوّنة في Chargily
3. ✅ Webhook يعمل ويُفعّل الاشتراكات تلقائياً
4. ✅ المستخدمون يمكنهم الدفع والحصول على اشتراك دائم
5. ✅ النظام جاهز للإطلاق!

**الخطوة التالية:** ابدأ التسويق وجلب العملاء! 🚀

---

## 📚 الوثائق المرجعية

- **إعداد روابط الدفع:** `PAYMENT_LINKS_SETUP.md`
- **إعداد Live Mode:** `CHARGILY_LIVE_MODE_SETUP.md`
- **البنية المعمارية:** `replit.md`
- **Migrations:** `database/migrations/`

**في حال وجود أي مشاكل:** راجع الوثائق أو Chargily Support
