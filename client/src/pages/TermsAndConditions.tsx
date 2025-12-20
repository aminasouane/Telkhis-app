import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TermsAndConditions() {
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
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">
                الشروط والأحكام
              </h1>
            </div>
            
            <p className="text-muted-foreground text-lg mt-4">
              مرحباً بك في تلخيصلي. يرجى قراءة الشروط والأحكام التالية بعناية قبل استخدام التطبيق.
            </p>
          </div>

          <div className="space-y-8 text-foreground leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">1. القبول بالشروط</h2>
              <p>
                باستخدامك تطبيق تلخيصلي، فإنك توافق على الالتزام بهذه الشروط والأحكام.
                إذا لم توافق على أي بند، يُرجى عدم استخدام التطبيق.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">2. نطاق الاستخدام</h2>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>يُسمح لك باستخدام التطبيق لتلخيص المحتوى الصوتي لأغراض شخصية أو تعليمية فقط.</li>
                <li>يُحظر استخدام التطبيق في أي أغراض تجارية أو غير قانونية أو من شأنها الإضرار بالغير.</li>
                <li>يحق لإدارة التطبيق تعليق أو إيقاف حساب أي مستخدم يسيء استخدام الخدمة.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">3. الحسابات والاشتراكات</h2>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>كل حساب في تلخيصلي مخصص لشخص واحد فقط وغير قابل للمشاركة.</li>
                <li>يمنع مشاركة الحساب أو بيانات الدخول مع أي طرف ثالث.</li>
                <li>تحتوي الخطة المجانية على 30 دقيقة تلخيص صوتي لمرة واحدة فقط.</li>
                <li>بعد انتهاء التجربة المجانية، يمكن للمستخدم الترقية إلى إحدى الخطط المدفوعة.</li>
                <li>جميع المبالغ المدفوعة غير قابلة للاسترجاع بعد إتمام عملية الشراء.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">4. دقة المحتوى</h2>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>يعمل تلخيصلي على تقديم ملخصات دقيقة قدر الإمكان، لكن لا يضمن دقة 100% في جميع الحالات.</li>
                <li>المستخدم يتحمل مسؤولية مراجعة النتائج قبل اعتمادها في أي غرض أكاديمي أو مهني.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">5. حدود المسؤولية</h2>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>لا يتحمل تلخيصلي أي مسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام التطبيق أو الاعتماد على نتائجه.</li>
                <li>الخدمة مقدمة "كما هي" دون أي ضمانات صريحة أو ضمنية.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">6. التعديلات</h2>
              <p>
                تحتفظ إدارة تلخيصلي بالحق في تعديل هذه الشروط في أي وقت.
                يُعتبر استمرارك في استخدام التطبيق بعد نشر التعديلات موافقةً ضمنية عليها.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">7. القانون المعمول به</h2>
              <p>
                تخضع هذه الشروط والأحكام لقوانين الجمهورية الجزائرية الديمقراطية الشعبية.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-primary">8. التواصل</h2>
              <p>
                لأي استفسارات حول هذه الشروط، يمكنك التواصل عبر:
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
