import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Sparkles, Check, Star, Crown } from "lucide-react";
import { type TrialStatus } from "@/services/localTrialService";
import { TRIAL_CONFIG } from "@/config/trialConfig";

const CHARGILY_BASIC_LINK = import.meta.env.VITE_CHARGILY_LINK_BASIC || "http://pay.chargily.com/payment-links/01k94gvp2jbxkhaskbf2z52khy";
const CHARGILY_STUDENT_LINK = import.meta.env.VITE_CHARGILY_LINK_STUDENT || "http://pay.chargily.com/payment-links/01k94h40j1g6hx2ztjvkvn43q1";

interface TrialExpiredExperienceProps {
  trialStatus: TrialStatus | null;
  showMetrics?: boolean;
}

export default function TrialExpiredExperience({
  trialStatus,
  showMetrics = true,
}: TrialExpiredExperienceProps) {
  const { appUserId, user, isAuthenticated, showAuthModal } = useAuth();

  const getTitle = () => {
    if (!trialStatus) return "انتهت تجربتك المجانية";
    switch (trialStatus.state) {
      case "USED_UP": return "استهلكت رصيدك المجاني";
      case "EXPIRED": return "انتهت صلاحية التجربة";
      default: return "انتهت تجربتك المجانية";
    }
  };

  const getExpiryReason = () => {
    if (!trialStatus) return null;
    switch (trialStatus.reason) {
      case "minutes_exhausted":
        return `لقد استخدمت كامل الوقت المجاني (${TRIAL_CONFIG.MAX_AUDIO_MINUTES} دقيقة).`;
      case "days_expired":
        return `انتهت صلاحية التجربة المجانية بعد ${TRIAL_CONFIG.VALIDITY_DAYS} أيام.`;
      default: return null;
    }
  };

  const buildPaymentUrl = (baseLink: string) => {
    try {
      const url = new URL(baseLink);
      if (appUserId) url.searchParams.set("user_id", appUserId);
      if (user?.email) url.searchParams.set("email", user.email);
      return url.toString();
    } catch {
      return baseLink;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center" dir="rtl">
      <div className="max-w-2xl w-full space-y-8">

        {/* Header — different based on whether trial expired or just browsing plans */}
        <div className="space-y-3">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            {trialStatus ? (
              <Sparkles className="h-10 w-10 text-primary" />
            ) : (
              <Crown className="h-10 w-10 text-amber-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold">
            {trialStatus ? getTitle() : "خطط الاشتراك"}
          </h1>
          <p className="text-muted-foreground">
            {trialStatus
              ? (getExpiryReason() || "نأمل أن تكون قد استفدت من تلخيصلي.")
              : "اختر الخطة المناسبة وابدأ في تلخيص محاضراتك بسهولة، دفع آمن عبر Chargily."
            }
          </p>
        </div>

        {/* Usage summary */}
        {showMetrics && trialStatus && (
          <Card className="bg-muted/30 text-sm">
            <CardContent className="p-4 space-y-2">
              <p className="font-medium mb-2">ملخص استخدامك:</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span>الوقت المستخدم: {trialStatus.minutesUsed.toFixed(1)} / {trialStatus.minutesLimit} دقيقة</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span>الأيام المتبقية: {Math.max(0, trialStatus.daysRemaining)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans */}
        <div>
          <h2 className="text-xl font-bold mb-6">اختر خطة الاشتراك</h2>
          <div className="grid gap-4 sm:grid-cols-2">

            {/* Basic Plan */}
            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">🩵 الخطة الأساسية</CardTitle>
                  <Badge variant="outline">Basic</Badge>
                </div>
                <div className="text-3xl font-bold text-primary mt-1">
                  1,200 <span className="text-base font-normal text-muted-foreground">دج</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm text-muted-foreground space-y-2 text-right">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    5 محاضرات صوتية × 45 دقيقة
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    تلخيص فوري ودقيق للمحاضرات
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    4 لغات للتلخيص
                  </li>
                </ul>
                {isAuthenticated ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => window.open(buildPaymentUrl(CHARGILY_BASIC_LINK), "_blank")}
                  >
                    اشترك الآن
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" onClick={() => showAuthModal('signup')}>
                    🔐 سجّل دخولك للاشتراك
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Student Plan */}
            <Card className="border-2 border-primary relative">
              <div className="absolute -top-3 right-1/2 translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3">الأكثر طلباً</Badge>
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">💙 خطة الطالب</CardTitle>
                  <Badge variant="outline">Student</Badge>
                </div>
                <div className="text-3xl font-bold text-primary mt-1">
                  4,700 <span className="text-base font-normal text-muted-foreground">دج</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm text-muted-foreground space-y-2 text-right">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    30 محاضرة صوتية × 45 دقيقة
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    تفريغ وتلخيص بجودة عالية
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    تنظيم الملخصات حسب المادة
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    مثالية للدراسة اليومية
                  </li>
                </ul>
                {isAuthenticated ? (
                  <Button
                    className="w-full"
                    onClick={() => window.open(buildPaymentUrl(CHARGILY_STUDENT_LINK), "_blank")}
                  >
                    <Star className="h-4 w-4 ml-2" />
                    اشترك الآن
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => showAuthModal('signup')}>
                    🔐 سجّل دخولك للاشتراك
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            الدفع آمن عبر Chargily · رعية جزائرية ✅
          </p>
        </div>
      </div>
    </div>
  );
}
