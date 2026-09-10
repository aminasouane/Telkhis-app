import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Calendar,
  Sparkles,
  Check,
  Star,
  Crown,
  Loader2,
  ArrowRight,
  Tag,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { type TrialStatus } from "@/services/localTrialService";
import { TRIAL_CONFIG } from "@/config/trialConfig";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useUserStatus } from "@/hooks/useUserStatus";

interface TrialExpiredExperienceProps {
  trialStatus: TrialStatus | null;
  showMetrics?: boolean;
}

interface AppliedCouponInfo {
  code: string;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
  message?: string;
}

export default function TrialExpiredExperience({
  trialStatus,
  showMetrics = true,
}: TrialExpiredExperienceProps) {
  const { appUserId, user, isAuthenticated, showAuthModal } = useAuth();
  const { status } = useUserStatus();
  const { toast } = useToast();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState<string | null>(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponInfo | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const isCurrentBasicPlan = status?.planName?.toLowerCase() === 'basic' || status?.planName === 'الخطة الأساسية';

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

  const handleApplyCoupon = async () => {
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) return;

    if (!isAuthenticated) {
      showAuthModal('signup');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ code: cleanCode, planId: "basic" }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setAppliedCoupon(null);
        setCouponError(data.message || "كود الخصم غير صالح أو غير متاح لحسابك");
        return;
      }

      setAppliedCoupon({
        code: data.coupon.code,
        discountPercent: data.discountPercent,
        discountAmount: data.discountAmount,
        finalPrice: data.finalPrice,
        message: data.message,
      });
      setCouponError(null);
      toast({
        title: "تم تطبيق الكوبون! 🎉",
        description: `تم خصم ${data.discountPercent}% (-${data.discountAmount} دج)`,
      });
    } catch (err: any) {
      setCouponError("حدث خطأ أثناء فحص الكوبون");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const handleSubscribe = async (planId: "basic") => {
    if (!isAuthenticated) {
      showAuthModal('signup');
      return;
    }

    try {
      setIsCreatingCheckout(planId);

      // Get current session token to send with the request
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/chargily/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          planId,
          locale: "ar",
          couponCode: appliedCoupon?.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "فشل إنشاء جلسة الدفع");
      }

      // If 100% free coupon activated immediately
      if (data.isFree && data.redirectUrl) {
        toast({
          title: "تهانينا! 🎉",
          description: data.message || "تم تفعيل اشتراكك مجاناً بنجاح!",
        });
        window.location.href = data.redirectUrl;
        return;
      }

      if (data.checkoutUrl) {
        // Redirect to Chargily payment page
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("لم يتم العثور على رابط الدفع من الخادم");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إعداد عملية الدفع. يرجى المحاولة لاحقاً.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCheckout(null);
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
          <h2 className="text-xl font-bold mb-6">خطة الاشتراك</h2>
          <div className="max-w-sm mx-auto">

            {/* Basic Plan */}
            <Card className="border-2 border-primary relative mt-6">
              {isCurrentBasicPlan && (
                <div className="absolute -top-3 left-4 z-10 shadow-sm border border-primary/20 bg-background rounded-full px-1">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-xs">
                    مفعلة حالياً ✅
                  </Badge>
                </div>
              )}
              <div className="absolute -top-3 right-1/2 translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3">الخطة الاحترافية</Badge>
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">🩵 الخطة الاحترافية</CardTitle>
                  <Badge variant="outline">Pro</Badge>
                </div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-lg text-muted-foreground line-through font-normal">
                      1,500 دج
                    </span>
                    <span className="text-3xl font-bold text-emerald-600">
                      {appliedCoupon.finalPrice.toLocaleString()} <span className="text-base font-normal text-muted-foreground">دج</span>
                    </span>
                    <Badge className="bg-emerald-500 text-white text-xs font-bold">
                      -{appliedCoupon.discountPercent}%
                    </Badge>
                  </div>
                ) : (
                  <div className="text-3xl font-bold text-primary mt-1">
                    1,500 <span className="text-base font-normal text-muted-foreground">دج</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="text-sm text-muted-foreground space-y-2 text-right">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    45 دقيقة يومياً × 30 يوم = 1350 دقيقة
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

                {/* Coupon Code Section */}
                <div className="pt-2 border-t">
                  {appliedCoupon ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5 flex items-center justify-between text-right">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 font-mono">
                            {appliedCoupon.code} ({appliedCoupon.discountPercent}% خصم)
                          </p>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                            وفرت {appliedCoupon.discountAmount} دج
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        onClick={handleRemoveCoupon}
                      >
                        إلغاء
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-right">
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="هل لديك كود خصم؟"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            setCouponError(null);
                          }}
                          className="h-9 font-mono uppercase text-xs"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleApplyCoupon();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 shrink-0 text-xs gap-1"
                          disabled={!couponInput.trim() || isValidatingCoupon}
                          onClick={handleApplyCoupon}
                        >
                          {isValidatingCoupon ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Tag className="h-3.5 w-3.5" />
                          )}
                          تطبيق
                        </Button>
                      </div>
                      {couponError && (
                        <p className="text-[11px] text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {couponError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {isAuthenticated ? (
                  <Button
                    className="w-full"
                    disabled={isCreatingCheckout !== null}
                    onClick={() => handleSubscribe('basic')}
                  >
                    {isCreatingCheckout === 'basic' ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <Star className="h-4 w-4 ml-2" />
                    )}
                    {isCurrentBasicPlan
                      ? (appliedCoupon ? `جدد اشتراكك بـ ${appliedCoupon.finalPrice} دج` : "جدد اشتراكك")
                      : (appliedCoupon ? `اشترك الآن بـ ${appliedCoupon.finalPrice} دج` : "اشترك الآن")}
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
