# 🔗 دليل إعداد روابط الدفع المباشرة من Chargily

## 📋 نظرة عامة

هذا الدليل يوضح كيفية إنشاء روابط الدفع المباشرة من Chargily Dashboard وربطها بتطبيق تلخيصلي.

---

## ✨ المزايا

### روابط الدفع المباشرة:
✅ **أسهل في الإعداد** - لا حاجة لـ API checkout معقد
✅ **أسرع في التنفيذ** - توجيه مباشر إلى صفحة الدفع
✅ **أكثر أماناً** - Chargily يدير كل شيء
✅ **اشتراك دائم** - دفعة واحدة بدون تجديد تلقائي

---

## 🛠️ الخطوات المطلوبة

### الخطوة 1️⃣: إنشاء روابط الدفع في Chargily Dashboard

#### أ. افتح Chargily Dashboard
1. اذهب إلى: https://pay.chargily.com/
2. سجّل الدخول بحسابك
3. تأكد من أنك في **Live Mode** (الوضع الحي)

#### ب. أنشئ رابط دفع لكل خطة

**الخطة الأساسية (Basic Plan)**
```
1. اذهب إلى: Payments → Payment Links → Create New
2. أدخل التفاصيل:
   - Name: Takhleesly - Basic Plan
   - Description: 5 محاضرات × 45 دقيقة
   - Amount: 67400 DZD
   - Currency: DZD
   
3. URLs (مهم جداً):
   - Success URL: https://your-app.replit.app/payment/success
   - Failure URL: https://your-app.replit.app/payment/failed
   - Webhook URL: https://your-app.replit.app/api/chargily/webhook
   
4. Metadata (معلومات إضافية):
   - plan_id: basic
   - plan_name: الخطة الأساسية
   - lectures: 5
   - total_minutes: 225

5. اضغط Create
6. انسخ رابط الدفع الناتج (يبدأ بـ https://pay.chargily.com/...)
```

**خطة الطالب (Student Plan)**
```
1. كرر نفس الخطوات أعلاه
2. التفاصيل:
   - Name: Takhleesly - Student Plan
   - Description: 30 محاضرة × 45 دقيقة
   - Amount: 256500 DZD
   
3. Metadata:
   - plan_id: student
   - plan_name: خطة الطالب
   - lectures: 30
   - total_minutes: 1350

4. احفظ الرابط
```

**خطة المحترف (Professional Plan)**
```
1. كرر نفس الخطوات أعلاه
2. التفاصيل:
   - Name: Takhleesly - Professional Plan
   - Description: 60 محاضرة × 45 دقيقة
   - Amount: 472400 DZD
   
3. Metadata:
   - plan_id: professional
   - plan_name: خطة المحترف
   - lectures: 60
   - total_minutes: 2700

4. احفظ الرابط
```

---

### الخطوة 2️⃣: إضافة الروابط في Replit Secrets

**⚠️ مهم:** لا تضع الروابط في الكود مباشرة!

#### في Replit:

1. افتح **Tools** → **Secrets** (🔒)
2. أضف الروابط الثلاثة:

```
Secret 1:
Key: CHARGILY_LINK_BASIC
Value: https://pay.chargily.com/checkout/xxx-basic-xxx

Secret 2:
Key: CHARGILY_LINK_STUDENT
Value: https://pay.chargily.com/checkout/xxx-student-xxx

Secret 3:
Key: CHARGILY_LINK_PROFESSIONAL
Value: https://pay.chargily.com/checkout/xxx-professional-xxx
```

**✅ استبدل `xxx` بالروابط الفعلية من Chargily**

---

### الخطوة 3️⃣: تكوين Webhook في Chargily

هذه الخطوة **مهمة جداً** لتفعيل الاشتراك تلقائياً بعد الدفع.

#### في Chargily Dashboard:

```
1. اذهب إلى: Developers → Webhooks
2. اضغط: Add Webhook Endpoint
3. أدخل:
   - URL: https://your-app.replit.app/api/chargily/webhook
   - Events: ✅ checkout.paid, ✅ checkout.failed
   - Status: Active ✅

4. احفظ الـ Webhook Secret (يظهر مرة واحدة فقط)
```

**⚠️ تحقق من:** 
- الـ URL صحيح ويشير إلى تطبيقك
- Events محددة بشكل صحيح
- Webhook في حالة Active

---

### الخطوة 4️⃣: التحقق من الإعداد

#### أ. تحقق من أن الروابط موجودة

في Terminal:
```bash
echo $CHARGILY_LINK_BASIC
echo $CHARGILY_LINK_STUDENT
echo $CHARGILY_LINK_PROFESSIONAL
```

يجب أن ترى الروابط الفعلية (وليس فارغة)

#### ب. استخدم API للتحقق

افتح في المتصفح:
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

### الخطوة 5️⃣: اختبار العملية الكاملة

#### السيناريو الكامل:

1. **المستخدم:**
   - افتح التطبيق: `/subscribe`
   - اختر خطة (مثلاً: خطة الطالب)
   - اضغط "اشترك الآن"

2. **التحويل:**
   - يُنقل تلقائياً إلى Chargily
   - يرى صفحة دفع آمنة
   - يدخل بيانات البطاقة (CIB أو EDAHABIA)
   - يُكمل الدفع

3. **بعد الدفع الناجح:**
   - Chargily يرسل webhook إلى سيرفرك
   - السيرفر يُفعّل الاشتراك تلقائياً
   - المستخدم يُنقل إلى: `/payment/success`
   - يرى رسالة نجاح مع تفاصيل الخطة

4. **في حال الفشل:**
   - المستخدم يُنقل إلى: `/payment/failed`
   - يرى أسباب محتملة للفشل
   - يمكنه المحاولة مرة أخرى

---

## 🔍 الفروقات بين النظام القديم والجديد

### النظام القديم (API Checkout):
```javascript
// كان يتطلب:
1. إنشاء checkout session عبر API
2. إرسال Bearer token للمصادقة
3. معالجة الرد واستخراج checkout_url
4. التحويل إلى الرابط
```

### النظام الجديد (Payment Links):
```javascript
// الآن ببساطة:
1. طلب رابط الدفع من /api/payment-link/:planId
2. التحويل المباشر إلى الرابط
```

**النتيجة:** أبسط، أسرع، وأكثر أماناً! ✨

---

## 🎯 نوع الاشتراك

### **اشتراك دائم (Lifetime Subscription)**

- ❌ **لا يوجد تجديد تلقائي**
- ❌ **لا يوجد تاريخ انتهاء**
- ✅ **دفعة واحدة فقط**
- ✅ **الاشتراك يبقى نشطاً للأبد**

في قاعدة البيانات:
```sql
-- الحقل end_date = NULL (يعني دائم)
SELECT user_id, plan_name, status, end_date 
FROM subscriptions;

-- النتيجة:
user_id | plan_name      | status | end_date
--------|----------------|--------|----------
abc-123 | خطة الطالب     | active | NULL
```

---

## 📊 مراقبة العمليات

### في Chargily Dashboard:

**Payments:**
- عرض جميع الدفعات الناجحة والفاشلة
- تصفية حسب التاريخ، المبلغ، الحالة
- تصدير التقارير

**Webhooks Logs:**
- مراقبة جميع webhooks المرسلة
- التحقق من نجاح/فشل الإرسال
- إعادة إرسال يدوياً في حال الفشل

### في Supabase:

```sql
-- الاشتراكات النشطة
SELECT 
  user_id, 
  plan_name, 
  payment_status, 
  transaction_id,
  payment_method,
  start_date
FROM subscriptions 
WHERE status = 'active';

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

---

## 🚨 استكشاف الأخطاء

### ❌ خطأ: "رابط الدفع غير متوفر"

**الحل:**
```bash
# تحقق من أن الروابط مضافة في Replit Secrets
1. افتح Tools → Secrets
2. تأكد من وجود:
   - CHARGILY_LINK_BASIC
   - CHARGILY_LINK_STUDENT
   - CHARGILY_LINK_PROFESSIONAL
3. أعد تشغيل التطبيق
```

### ❌ خطأ: الدفع نجح لكن الاشتراك لم يُفعّل

**الحل:**
```bash
# تحقق من Webhook
1. افتح Chargily Dashboard → Webhooks
2. تحقق من Logs:
   - هل تم إرسال webhook؟
   - هل كان الرد 200 OK؟
3. تحقق من Replit Logs:
   - ابحث عن: [Webhook] Received event
   - ابحث عن: [Webhook] Subscription activated
```

### ❌ خطأ: المستخدم لا يُنقل بعد الدفع

**الحل:**
```bash
# تحقق من URLs في Chargily Payment Link
1. Success URL: https://your-app.replit.app/payment/success
2. Failure URL: https://your-app.replit.app/payment/failed
3. تأكد من أن الروابط صحيحة بدون أخطاء إملائية
```

---

## ✅ Checklist النهائي

قبل إطلاق النظام للجمهور، تأكد من:

- [ ] أنشأت 3 روابط دفع في Chargily Dashboard
- [ ] أضفت success_url و failure_url لكل رابط
- [ ] أضفت metadata (plan_id, plan_name, lectures, total_minutes)
- [ ] أضفت الروابط الثلاثة في Replit Secrets
- [ ] كوّنت Webhook في Chargily Dashboard
- [ ] اختبرت دفعة حقيقية صغيرة (الخطة الأساسية)
- [ ] تأكدت من تفعيل الاشتراك تلقائياً
- [ ] تأكدت من التحويل إلى /payment/success
- [ ] تأكدت من webhook logs في Chargily
- [ ] راجعت البيانات في Supabase

---

## 🎉 تهانينا!

نظام روابط الدفع المباشرة الآن جاهز! 

**المستخدمون يمكنهم:**
- ✅ اختيار خطة اشتراك
- ✅ الدفع بأمان عبر Chargily
- ✅ تفعيل الاشتراك تلقائياً
- ✅ الاستمتاع بخدمة تلخيصلي بدون حدود

**الخطوة التالية:** ابدأ التسويق! 🚀
