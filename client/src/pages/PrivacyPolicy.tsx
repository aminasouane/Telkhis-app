import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <ScrollArea className="h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <Link href="/">
              <Button 
                variant="ghost" 
                className="mb-4"
                data-testid="button-back"
              >
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة للرئيسية
              </Button>
            </Link>
            
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">
                سياسة الخصوصية
              </h1>
            </div>
            
            <p className="text-muted-foreground text-lg mt-4">
              نحن في تلخيصلي نأخذ خصوصيتك على محمل الجد. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك.
            </p>
          </div>

          <div className="space-y-8 text-foreground leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">1. المعلومات التي نجمعها</h2>
              <p>نجمع المعلومات التالية لتقديم خدماتنا:</p>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>معلومات الحساب: البريد الإلكتروني عند التسجيل</li>
                <li>بيانات الاستخدام: مدة استخدام التطبيق وعدد الملخصات</li>
                <li>معلومات الدفع: تتم معالجتها بشكل آمن عبر بوابة Chargily</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">2. التسجيلات الصوتية</h2>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>لا يتم تخزين التسجيلات الصوتية على خوادمنا بعد إتمام عملية التلخيص.</li>
                <li>تُعالج الملفات الصوتية بشكل مؤقت فقط لإنتاج النص والملخص.</li>
                <li>يتم حذف جميع البيانات الصوتية فور الانتهاء من المعالجة.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">3. كيف نستخدم معلوماتك</h2>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>تقديم خدمة التلخيص وتحسينها</li>
                <li>إدارة حسابك واشتراكك</li>
                <li>التواصل معك بخصوص الخدمة</li>
                <li>تحسين تجربة المستخدم</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">4. مشاركة المعلومات</h2>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>لا نبيع معلوماتك الشخصية لأي جهة خارجية.</li>
                <li>قد نشارك المعلومات مع مزودي الخدمات الضروريين (مثل معالجة المدفوعات).</li>
                <li>قد نكشف عن المعلومات إذا طُلب منا ذلك قانونياً.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">5. أمان البيانات</h2>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>نستخدم تقنيات تشفير متقدمة لحماية بياناتك.</li>
                <li>يتم تخزين البيانات على خوادم آمنة.</li>
                <li>نقوم بمراجعة إجراءاتنا الأمنية بشكل دوري.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">6. حقوقك</h2>
              <p>لديك الحق في:</p>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>الوصول إلى بياناتك الشخصية</li>
                <li>تصحيح المعلومات غير الدقيقة</li>
                <li>طلب حذف بياناتك</li>
                <li>الاعتراض على معالجة بياناتك</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">7. ملفات تعريف الارتباط (Cookies)</h2>
              <p>
                نستخدم ملفات تعريف الارتباط لتحسين تجربتك. يمكنك التحكم في هذه الملفات 
                من خلال إعدادات المتصفح الخاص بك.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">8. التغييرات على هذه السياسة</h2>
              <p>
                قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سنُعلمك بأي تغييرات جوهرية 
                عبر البريد الإلكتروني أو من خلال إشعار في التطبيق.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">9. التواصل معنا</h2>
              <p>
                إذا كانت لديك أي أسئلة حول سياسة الخصوصية، يرجى التواصل معنا عبر:
              </p>
              <p className="text-primary font-medium" data-testid="text-contact-email">
                support@telkhisli.com
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-muted-foreground text-sm">
            <p>آخر تحديث: ديسمبر 2025</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
