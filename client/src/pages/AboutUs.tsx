import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Target, Award, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AboutUs() {
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
              <Users className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">
                من نحن
              </h1>
            </div>
          </div>

          <div className="space-y-8 text-foreground leading-relaxed">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                رسالتنا
              </h2>
              <p className="text-lg">
                تلخيصلي هو تطبيق ذكي مصمم خصيصاً لمساعدة الطلاب والباحثين والمهنيين 
                على تحويل المحاضرات والتسجيلات الصوتية إلى ملخصات مكتوبة واضحة وسهلة المراجعة.
              </p>
              <p>
                نؤمن بأن الوقت ثمين، ولذلك نوفر لك أداة تساعدك على استيعاب المحتوى 
                بشكل أسرع وأكثر فعالية، مما يتيح لك التركيز على ما يهم حقاً.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                كيف يعمل تلخيصلي؟
              </h2>
              <p>
                يستخدم تلخيصلي أحدث تقنيات الذكاء الاصطناعي لتحويل الكلام إلى نص 
                ثم تلخيصه بشكل ذكي مع استخراج النقاط الرئيسية.
              </p>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>تحويل الصوت إلى نص باستخدام تقنية Whisper المتقدمة</li>
                <li>تلخيص ذكي للمحتوى مع الحفاظ على الأفكار الأساسية</li>
                <li>استخراج النقاط الرئيسية لسهولة المراجعة</li>
                <li>دعم اللغة العربية والفرنسية واللهجة الجزائرية</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Award className="h-6 w-6 text-primary" />
                لماذا تلخيصلي؟
              </h2>
              <ul className="list-disc list-inside space-y-2 pr-4">
                <li>واجهة سهلة الاستخدام بتصميم عربي أصيل</li>
                <li>دقة عالية في التعرف على الكلام</li>
                <li>ملخصات ذكية ومنظمة</li>
                <li>حفظ الملخصات ومشاركتها بسهولة</li>
                <li>دعم ملفات صوتية متعددة الصيغ</li>
                <li>تجربة مجانية للبدء</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">تواصل معنا</h2>
              <p>
                نحن نسعد بتلقي ملاحظاتكم واقتراحاتكم. يمكنكم التواصل معنا عبر:
              </p>
              <p className="text-primary font-medium text-lg" data-testid="text-contact-email">
                support@telkhisli.com
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t text-center">
            <Link href="/">
              <Button size="lg" data-testid="button-start">
                ابدأ الاستخدام الآن
              </Button>
            </Link>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
