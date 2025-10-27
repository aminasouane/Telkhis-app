import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getTrialStatus } from "@/services/trialService";

export default function Terms() {
  const { user, isGuest, guestUserId, loading: authLoading } = useAuth();
  const [trialActive, setTrialActive] = useState(false);
  const [checkingTrial, setCheckingTrial] = useState(true);
  
  const currentUserId = isGuest ? guestUserId : user?.id;

  // Check trial status to determine navigation target
  useEffect(() => {
    const checkTrial = async () => {
      if (!currentUserId) {
        setTrialActive(false);
        setCheckingTrial(false);
        return;
      }

      try {
        const status = await getTrialStatus(currentUserId);
        setTrialActive(!!(status && !status.isExpired && status.minutesRemaining > 0));
      } catch (error) {
        console.error("Error checking trial status:", error);
        setTrialActive(false);
      } finally {
        setCheckingTrial(false);
      }
    };

    if (!authLoading) {
      checkTrial();
    }
  }, [currentUserId, authLoading]);

  // Determine navigation target based on trial status
  const navigationTarget = trialActive ? "/" : "/subscribe";
  const backButtonText = trialActive ? "العودة للرئيسية" : "العودة للاشتراك";
  const ctaButtonText = trialActive ? "ابدأ الاستخدام" : "اشترك الآن";

  if (authLoading || checkingTrial) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href={navigationTarget}>
            <Button 
              variant="ghost" 
              className="mb-4"
              data-testid="button-back"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              {backButtonText}
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              شروط استخدام تطبيق تلخيصلي
            </h1>
          </div>
          
          <p className="text-muted-foreground text-lg mt-4">
            مرحبًا بك في تلخيصلي، تطبيق ذكي لتلخيص التسجيلات الصوتية باستخدام الذكاء الاصطناعي.
            يرجى قراءة شروط الاستخدام التالية بعناية قبل البدء في استخدام التطبيق.
          </p>
        </div>

        {/* Terms Content */}
        <div className="space-y-6">
          {/* Section 1 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary font-bold text-xl">1.</span>
                القبول بالشروط
              </CardTitle>
            </CardHeader>
            <CardContent className="text-foreground leading-relaxed space-y-3">
              <p>
                باستخدامك تطبيق تلخيصلي، فإنك توافق على الالتزام بهذه الشروط والأحكام.
              </p>
              <p>
                إذا لم توافق على أي بند، يُرجى عدم استخدام التطبيق.
              </p>
            </CardContent>
          </Card>

          {/* Section 2 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary font-bold text-xl">2.</span>
                نطاق الاستخدام
              </CardTitle>
            </CardHeader>
            <CardContent className="text-foreground leading-relaxed space-y-3">
              <p>
                • يُسمح لك باستخدام التطبيق لتلخيص المحتوى الصوتي لأغراض شخصية أو تعليمية فقط.
              </p>
              <p>
                • يُحظر استخدام التطبيق في أي أغراض تجارية أو غير قانونية أو من شأنها الإضرار بالغير.
              </p>
              <p>
                • يحق لإدارة التطبيق تعليق أو إيقاف حساب أي مستخدم يسيء استخدام الخدمة.
              </p>
            </CardContent>
          </Card>

          {/* Section 3 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary font-bold text-xl">3.</span>
                الحسابات والاشتراكات
              </CardTitle>
            </CardHeader>
            <CardContent className="text-foreground leading-relaxed space-y-3">
              <p>
                • كل حساب في تلخيصلي مخصص لشخص واحد فقط وغير قابل للمشاركة.
              </p>
              <p>
                • يمنع مشاركة الحساب أو بيانات الدخول مع أي طرف ثالث.
              </p>
              <p>
                • تحتوي الخطة المجانية على <strong>30 دقيقة تلخيص صوتي لمرة واحدة فقط</strong>.
              </p>
              <p>
                • بعد انتهاء التجربة المجانية، يمكن للمستخدم الترقية إلى إحدى الخطط المدفوعة.
              </p>
              <p>
                • جميع المبالغ المدفوعة غير قابلة للاسترجاع بعد إتمام عملية الشراء.
              </p>
            </CardContent>
          </Card>

          {/* Section 4 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary font-bold text-xl">4.</span>
                دقة المحتوى
              </CardTitle>
            </CardHeader>
            <CardContent className="text-foreground leading-relaxed space-y-3">
              <p>
                • يعمل تلخيصلي على تقديم ملخصات دقيقة قدر الإمكان، لكن لا يضمن دقة 100٪ في جميع الحالات.
              </p>
              <p>
                • المستخدم يتحمل مسؤولية مراجعة النتائج قبل اعتمادها في أي غرض أكاديمي أو مهني.
              </p>
            </CardContent>
          </Card>

          {/* Section 5 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary font-bold text-xl">5.</span>
                الخصوصية وأمن البيانات
              </CardTitle>
            </CardHeader>
            <CardContent className="text-foreground leading-relaxed space-y-3">
              <p>
                • يحترم تلخيصلي خصوصيتك.
              </p>
              <p>
                • لا يتم تخزين التسجيلات الصوتية بعد إتمام عملية التلخيص.
              </p>
              <p>
                • تُستخدم بيانات المستخدم فقط لتحسين جودة الخدمة وتسهيل عمليات الاشتراك.
              </p>
              <p>
                • لن تتم مشاركة معلوماتك مع أي جهة خارجية بدون موافقتك الصريحة.
              </p>
            </CardContent>
          </Card>

          {/* Section 6 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary font-bold text-xl">6.</span>
                حدود المسؤولية
              </CardTitle>
            </CardHeader>
            <CardContent className="text-foreground leading-relaxed space-y-3">
              <p>
                • لا يتحمل تلخيصلي أي مسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام التطبيق أو الاعتماد على نتائجه.
              </p>
              <p>
                • الخدمة مقدمة "كما هي" دون أي ضمانات صريحة أو ضمنية.
              </p>
            </CardContent>
          </Card>

          {/* Section 7 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary font-bold text-xl">7.</span>
                التعديلات
              </CardTitle>
            </CardHeader>
            <CardContent className="text-foreground leading-relaxed space-y-3">
              <p>
                تحتفظ إدارة تلخيصلي بالحق في تعديل هذه الشروط في أي وقت.
              </p>
              <p>
                يُعتبر استمرارك في استخدام التطبيق بعد نشر التعديلات موافقةً ضمنية عليها.
              </p>
            </CardContent>
          </Card>

          {/* Section 8 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary font-bold text-xl">8.</span>
                التواصل والدعم
              </CardTitle>
            </CardHeader>
            <CardContent className="text-foreground leading-relaxed space-y-3">
              <p>
                لأي استفسارات أو اقتراحات، يمكنك التواصل عبر البريد الإلكتروني:
              </p>
              <div className="flex items-center gap-2 text-primary font-medium text-lg" data-testid="text-support-email">
                <Mail className="h-5 w-5" />
                <span>support@telkhisli.com</span>
              </div>
              <p className="text-sm text-muted-foreground">
                (يمكن تغييره لاحقًا إلى البريد الرسمي)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            آخر تحديث: أكتوبر 2025
          </p>
          <Link href={navigationTarget}>
            <Button 
              size="lg" 
              data-testid="button-cta"
            >
              {ctaButtonText}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
