# 🚀 دليل تفعيل Chargily Live Mode

## 📋 نظرة عامة

هذا الدليل يوضح كيفية تفعيل نظام الدفع الحقيقي عبر Chargily Pay في تطبيق تلخيصلي.

---

## ⚠️ تحذيرات أمنية مهمة

### 🔐 حماية المفاتيح السرية

**لا تشارك أبداً:**
- ❌ مفاتيح API الحية (`sk_live_*`)
- ❌ لا ترفعها على GitHub
- ❌ لا تكتبها في الكود مباشرة
- ❌ لا تشاركها في محادثات أو رسائل

**الطريقة الصحيحة:**
- ✅ استخدم Replit Secrets (يوفر حماية كاملة)
- ✅ استخدم متغيرات البيئة الآمنة
- ✅ احذف مفاتيح الاختبار بعد التفعيل

---

## 📝 الخطوات المطلوبة

### الخطوة 1️⃣: تنفيذ SQL Migration في Supabase

**الهدف:** إضافة حقول تتبع الدفع الجديدة

**الطريقة:**
1. افتح Supabase Dashboard
2. اذهب إلى **SQL Editor**
3. انسخ محتوى الملف: `database/migrations/add_payment_tracking_fields.sql`
4. الصق الكود في SQL Editor
5. اضغط **Run**

**الحقول التي ستضاف:**
- `transaction_id` - معرّف المعاملة من Chargily
- `payment_method` - طريقة الدفع (CIB، EDAHABIA، إلخ)
- `payment_status` - حالة الدفع (pending، paid، failed، refunded)

**التحقق من النجاح:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'subscriptions';
```
يجب أن ترى الحقول الثلاثة الجديدة.

---

### الخطوة 2️⃣: إضافة مفاتيح Chargily Live Mode

**⚠️ مهم جداً:** استخدم فقط واجهة Replit Secrets لإضافة المفاتيح

**المفاتيح المطلوبة:**

1. **CHARGILY_API_KEY** (المفتاح السري)
   - احصل عليه من: Chargily Dashboard → API Keys → Live Mode
   - الصيغة: `sk_live_xxxxxxxxxxxxxxxxxx`
   - **لا تشارك هذا المفتاح أبداً**

2. **CHARGILY_MODE** 
   - القيمة: `live`
   - هذا يفعّل الوضع الحي

3. **VITE_APP_URL** (إذا لم يكن موجوداً)
   - رابط التطبيق: `https://your-app.replit.app`
   - يُستخدم في success_url و webhook_url

**كيفية الإضافة في Replit:**

```
1. افتح لوحة Replit
2. اذهب إلى Tools → Secrets (🔒)
3. اضغط "New Secret"
4. أدخل:
   - Key: CHARGILY_API_KEY
   - Value: sk_live_xxxxxx (المفتاح الحقيقي من Chargily)
5. كرر للمفاتيح الأخرى
```

---

### الخطوة 3️⃣: تكوين Webhook في Chargily Dashboard

**الهدف:** السماح لـ Chargily بإرسال إشعارات الدفع

**الطريقة:**

1. افتح **Chargily Dashboard**
2. اذهب إلى **Developers** → **Webhooks**
3. اضغط **Add Webhook Endpoint**
4. أدخل البيانات التالية:

```
Webhook URL: https://your-app.replit.app/api/chargily/webhook
Events to Subscribe:
  ✅ checkout.paid
  ✅ checkout.failed
Status: Active ✅
```

5. **احفظ webhook secret** (سيظهر مرة واحدة فقط)
6. تحقق من أن Signature Verification مفعّل

**التحقق من الإعداد:**
- اضغط "Test Webhook" في Chargily Dashboard
- تحقق من Logs في Replit
- يجب أن ترى: `[Webhook] Received event`

---

### الخطوة 4️⃣: اختبار بمبلغ رمزي

**قبل إطلاق الخدمة، اختبر بدفعة حقيقية صغيرة:**

1. افتح صفحة الاشتراك: `/subscribe`
2. اختر **الخطة الأساسية** ($4.99 / 67,400 د.ج)
3. أكمل عملية الدفع باستخدام بطاقة حقيقية
4. تحقق من:
   - ✅ التحويل إلى Chargily بنجاح
   - ✅ الدفع تم بنجاح
   - ✅ العودة إلى `/success`
   - ✅ تفعيل الاشتراك في قاعدة البيانات
   - ✅ استلام Webhook في السيرفر

**في حال الفشل:**
- راجع Logs في Replit Console
- راجع Webhook Logs في Chargily Dashboard
- تحقق من أن جميع المفاتيح صحيحة

---

## 🔍 التحقق من نجاح التفعيل

### ✅ Checklist

- [ ] Migration SQL تم تنفيذه في Supabase
- [ ] CHARGILY_API_KEY (Live) موجود في Secrets
- [ ] CHARGILY_MODE = "live"
- [ ] Webhook URL مكوّن في Chargily Dashboard
- [ ] اختبار دفعة حقيقية نجح
- [ ] Webhook يستقبل الإشعارات بنجاح
- [ ] الاشتراك يُفعّل تلقائياً بعد الدفع

### 🔎 التحقق من الحالة الحالية

**في Terminal:**
```bash
# التحقق من وجود المفاتيح (لن يظهر القيمة الفعلية)
echo $CHARGILY_API_KEY
echo $CHARGILY_MODE
```

**في Supabase SQL Editor:**
```sql
-- التحقق من وجود الحقول الجديدة
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions'
AND column_name IN ('transaction_id', 'payment_method', 'payment_status');

-- التحقق من الاشتراكات النشطة
SELECT user_id, plan_name, payment_status, transaction_id 
FROM subscriptions 
WHERE status = 'active';
```

---

## 🚨 استكشاف الأخطاء الشائعة

### ❌ خطأ: "CHARGILY_API_KEY not set"

**الحل:**
1. تأكد من إضافة المفتاح في Replit Secrets
2. أعد تشغيل التطبيق (Restart Workflow)
3. تحقق من اسم المفتاح: `CHARGILY_API_KEY` (بالضبط)

### ❌ خطأ: "Invalid signature"

**الحل:**
1. تحقق من أن CHARGILY_API_KEY صحيح
2. تأكد من أن الوضع (test/live) متطابق في:
   - Replit Secrets
   - Chargily Dashboard
   - المفتاح المستخدم

### ❌ خطأ: "Could not find column"

**الحل:**
1. نفذ SQL Migration في Supabase
2. تحقق من تنفيذه بنجاح
3. أعد تشغيل التطبيق

### ❌ خطأ: الدفع نجح لكن الاشتراك لم يُفعّل

**الحل:**
1. راجع Webhook Logs في Chargily Dashboard
2. تحقق من Replit Logs:
   ```
   [Webhook] Received event: checkout.paid
   [Webhook] Subscription activated
   ```
3. تحقق من صحة Webhook URL
4. تأكد من أن user_id موجود في metadata

---

## 📊 مراقبة العمليات

### في Chargily Dashboard:
- **Payments** → عرض جميع الدفعات
- **Webhooks** → Logs لمراقبة الإشعارات
- **Customers** → قائمة العملاء

### في Supabase:
```sql
-- آخر 10 دفعات
SELECT 
  user_id, 
  plan_name, 
  amount, 
  currency,
  payment_status,
  paid_at
FROM payments 
ORDER BY paid_at DESC 
LIMIT 10;

-- الاشتراكات النشطة
SELECT 
  user_id,
  plan_name,
  status,
  payment_status,
  start_date,
  end_date
FROM subscriptions 
WHERE status = 'active';
```

### في Replit Console:
```
[Chargily] Checkout created: checkout_id=xxx
[Webhook] Received event: type=checkout.paid
[Webhook] Subscription activated: user_id=xxx
[Webhook] ✅ Subscription fully activated
```

---

## 🎯 النتيجة النهائية

بعد إتمام جميع الخطوات بنجاح:

✅ **المستخدم:**
1. يختار خطة من `/subscribe`
2. يُحوّل إلى Chargily (بوابة دفع آمنة)
3. يدفع بـ CIB أو EDAHABIA أو BaridiMob
4. يعود تلقائياً إلى `/success`
5. يُفعّل اشتراكه فوراً
6. يستطيع استخدام التطبيق حسب حدود خطته

✅ **النظام:**
1. يستقبل Webhook من Chargily
2. يتحقق من صحة التوقيع (Signature)
3. يُفعّل الاشتراك في قاعدة البيانات
4. يسجّل الدفعة في جدول payments
5. يحدّث نوع المستخدم (user_type)

---

## 📞 الدعم

**في حال وجود مشاكل:**

1. راجع هذا الدليل خطوة بخطوة
2. تحقق من Logs (Replit + Chargily)
3. راجع [Chargily Documentation](https://dev.chargily.com/pay-v2)
4. تواصل مع دعم Chargily: support@chargily.com

---

## ⚡ ملاحظات مهمة

1. **الأمان أولاً:**
   - لا تشارك المفاتيح السرية أبداً
   - استخدم HTTPS فقط (Replit يوفره تلقائياً)
   - راقب Webhook Logs بانتظام

2. **المراقبة:**
   - راقب الدفعات يومياً في Chargily Dashboard
   - احفظ نسخ احتياطية من قاعدة البيانات
   - راجع سجلات الأخطاء بانتظام

3. **التحديثات:**
   - حافظ على تحديث `@chargily/chargily-pay` package
   - راجع Chargily Changelog للتغييرات
   - اختبر بعد كل تحديث

---

## 🎉 تهانينا!

نظام الدفع الحقيقي الآن جاهز! 🚀

**التطبيق الآن قادر على:**
- ✅ استقبال مدفوعات حقيقية من الجزائر
- ✅ تفعيل الاشتراكات تلقائياً
- ✅ تتبع جميع المعاملات
- ✅ حماية المستخدمين والبيانات

**الخطوة التالية:** ابدأ التسويق! 🎯
