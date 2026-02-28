import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <ScrollArea className="h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl text-right">

          {/* زر الرجوع */}
          <div className="mb-8">
            <Link href="/">
              <Button
                variant="ghost"
                className="mb-4 flex items-center justify-start"
                data-testid="button-back"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                العودة للرئيسية
              </Button>
            </Link>

            {/* العنوان */}
            <div className="flex items-center justify-start gap-3 mb-2">
              <h1 className="text-4xl font-bold text-foreground">
                سياسة الخصوصية
              </h1>
              <Shield className="h-8 w-8 text-primary" />
            </div>

            <p className="text-muted-foreground text-lg mt-4">
              في <strong>تلخيصلي</strong> نلتزم بحماية خصوصيتك واحترام بياناتك
              الشخصية. توضّح هذه السياسة أنواع المعلومات التي نجمعها، وكيفية
              استخدامها، والخيارات المتاحة لك كمستخدم.
            </p>
          </div>

          {/* المحتوى */}
          <div className="space-y-8 text-foreground leading-relaxed rtl-prose">

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ١. المعلومات التي نجمعها
              </h2>
              <p>
                نجمع الحد الأدنى من المعلومات اللازمة لتقديم خدماتنا بكفاءة،
                وتشمل:
              </p>
              <ul className="list-disc space-y-2 pr-6">
                <li>معلومات الحساب: مثل البريد الإلكتروني عند إنشاء الحساب</li>
                <li>بيانات الاستخدام: مثل مدة استخدام التطبيق وعدد عمليات التلخيص</li>
                <li>
                  معلومات الدفع: تتم معالجتها بشكل آمن عبر بوابة{" "}
                  <span dir="ltr" className="ltr-inline"><strong>Chargily</strong></span>، ولا نقوم بتخزين أي بيانات دفع لدينا
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٢. التسجيلات الصوتية
              </h2>
              <ul className="list-disc space-y-2 pr-6">
                <li>تُستخدم التسجيلات الصوتية فقط لغرض التلخيص.</li>
                <li>لا يتم تخزين التسجيلات الصوتية بعد انتهاء المعالجة.</li>
                <li>يتم حذف البيانات الصوتية تلقائياً فور إتمام التلخيص.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٣. كيف نستخدم معلوماتك
              </h2>
              <ul className="list-disc space-y-2 pr-6">
                <li>تقديم خدمة التلخيص وتحسين جودتها</li>
                <li>إدارة الحساب والاشتراك</li>
                <li>التواصل بخصوص التحديثات أو الدعم</li>
                <li>تحسين تجربة المستخدم وتحليل الأداء</li>
                <li>الامتثال للمتطلبات القانونية عند الضرورة</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٤. مشاركة المعلومات
              </h2>
              <ul className="list-disc space-y-2 pr-6">
                <li>لا نبيع أو نؤجر بياناتك الشخصية.</li>
                <li>
                  قد نشارك بيانات محدودة مع مزودي خدمات موثوقين (مثل بوابات الدفع)
                  فقط لتشغيل الخدمة.
                </li>
                <li>قد نكشف عن البيانات إذا كان ذلك مطلوباً قانونياً.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٥. أمان البيانات
              </h2>
              <ul className="list-disc space-y-2 pr-6">
                <li>نستخدم إجراءات أمنية مناسبة لحماية بياناتك.</li>
                <li>يتم تخزين البيانات على خوادم آمنة.</li>
                <li>
                  لا يمكن ضمان الأمان الكامل للبيانات عبر الإنترنت رغم جميع
                  الاحتياطات.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٦. حقوقك
              </h2>
              <ul className="list-disc space-y-2 pr-6">
                <li>الوصول إلى بياناتك الشخصية</li>
                <li>تصحيح أو تحديث معلوماتك</li>
                <li>طلب حذف بياناتك</li>
                <li>الاعتراض على بعض أنواع المعالجة</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                يمكنك ممارسة هذه الحقوق عبر التواصل معنا.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٧. ملفات تعريف الارتباط (<span dir="ltr" className="ltr-inline">Cookies</span>)
              </h2>
              <p>
                نستخدم ملفات تعريف الارتباط لتحسين تجربتك. يمكنك التحكم بها من
                خلال إعدادات المتصفح أو الجهاز.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٨. التغييرات على هذه السياسة
              </h2>
              <p>
                قد نقوم بتحديث هذه السياسة من وقت لآخر. استمرارك في استخدام
                التطبيق بعد التحديث يُعد موافقة على النسخة المعدّلة.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٩. التواصل معنا
              </h2>
              <p>
                لأي استفسار بخصوص سياسة الخصوصية، يمكنك التواصل عبر:
              </p>
              <p
                className="text-primary font-medium"
                data-testid="text-contact-email"
                dir="ltr"
              >
                support@telkhisli.com
              </p>
            </section>
          </div>

          {/* التذييل */}
          <div className="mt-12 pt-8 border-t text-center text-muted-foreground text-sm">
            <p>آخر تحديث: ١ ديسمبر ٢٠٢٥</p>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
