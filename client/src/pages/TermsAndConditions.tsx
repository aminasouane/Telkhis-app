import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TermsAndConditions() {
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
                الشروط والأحكام
              </h1>
              <FileText className="h-8 w-8 text-primary" />
            </div>

            <p className="text-muted-foreground text-lg mt-4">
              مرحباً بك في <strong>تلخيصلي</strong>. يرجى قراءة الشروط والأحكام
              التالية بعناية قبل استخدام التطبيق.
            </p>
          </div>

          {/* المحتوى */}
          <div className="space-y-8 text-foreground leading-relaxed rtl-prose">

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ١. القبول بالشروط
              </h2>
              <p>
                باستخدامك تطبيق تلخيصلي، فإنك توافق على الالتزام بهذه الشروط
                والأحكام. إذا لم توافق على أي بند، يُرجى عدم استخدام التطبيق.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٢. نطاق الاستخدام
              </h2>
              <ul className="list-disc space-y-2 pr-6">
                <li>
                  يُسمح لك باستخدام التطبيق لتلخيص المحتوى الصوتي لأغراض شخصية أو
                  تعليمية فقط.
                </li>
                <li>
                  يُحظر استخدام التطبيق لأغراض تجارية أو غير قانونية أو بما يسبب
                  ضرراً للغير.
                </li>
                <li>
                  يحق لإدارة التطبيق تعليق أو إيقاف حساب أي مستخدم يسيء استخدام
                  الخدمة.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٣. الحسابات والاشتراكات
              </h2>
              <ul className="list-disc space-y-2 pr-6">
                <li>كل حساب في تلخيصلي مخصص لشخص واحد فقط وغير قابل للمشاركة.</li>
                <li>يُمنع مشاركة الحساب أو بيانات الدخول مع أي طرف ثالث.</li>
                <li>
                  تتضمن الخطة المجانية مدة تلخيص صوتي واحدة تصل إلى ٣٠ دقيقة.
                </li>
                <li>
                  بعد انتهاء التجربة المجانية، يمكن للمستخدم الترقية إلى إحدى
                  الخطط المدفوعة.
                </li>
                <li>
                  جميع المبالغ المدفوعة غير قابلة للاسترجاع بعد إتمام عملية
                  الشراء.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٤. دقة المحتوى
              </h2>
              <ul className="list-disc space-y-2 pr-6">
                <li>
                  يهدف تلخيصلي إلى تقديم ملخصات دقيقة قدر الإمكان، دون ضمان دقة
                  كاملة في جميع الحالات.
                </li>
                <li>
                  يتحمل المستخدم مسؤولية مراجعة النتائج قبل استخدامها لأغراض
                  أكاديمية أو مهنية.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٥. حدود المسؤولية
              </h2>
              <ul className="list-disc space-y-2 pr-6">
                <li>
                  لا يتحمل تلخيصلي أي مسؤولية عن أضرار مباشرة أو غير مباشرة ناتجة
                  عن استخدام التطبيق أو الاعتماد على نتائجه.
                </li>
                <li>
                  تُقدَّم الخدمة "كما هي" دون أي ضمانات صريحة أو ضمنية.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٦. التعديلات
              </h2>
              <p>
                تحتفظ إدارة تلخيصلي بالحق في تعديل هذه الشروط في أي وقت. ويُعد
                استمرارك في استخدام التطبيق بعد نشر التعديلات موافقةً ضمنية
                عليها.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٧. القانون المعمول به
              </h2>
              <p>
                تخضع هذه الشروط والأحكام لقوانين الجمهورية الجزائرية الديمقراطية
                الشعبية.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">
                ٨. التواصل
              </h2>
              <p>
                لأي استفسارات تتعلق بهذه الشروط والأحكام، يمكنك التواصل معنا عبر:
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
