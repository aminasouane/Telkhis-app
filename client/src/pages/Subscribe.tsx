import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, GraduationCap, Crown, Loader2, AlertCircle } from "lucide-react";
import { getTrialStatus } from "@/services/trialService";
import { getAllPlans, type SubscriptionPlan } from "@shared/plans";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

const plans: SubscriptionPlan[] = getAllPlans();

// Icon mapping for plans
const planIcons: Record<string, any> = {
  basic: Sparkles,
  student: GraduationCap,
  professional: Crown,
};

export default function Subscribe() {
  const [, navigate] = useLocation();
  const { user, isGuest, guestUserId, loading: authLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string>("student");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkingTrial, setCheckingTrial] = useState(true);
  const { toast } = useToast();
  
  const currentUserId = isGuest ? guestUserId : user?.id;

  // Check trial status - redirect to home if trial is still active
  useEffect(() => {
    const checkTrial = async () => {
      if (!currentUserId) {
        setCheckingTrial(false);
        return;
      }

      try {
        const status = await getTrialStatus(currentUserId);
        if (status && !status.isExpired && status.minutesRemaining > 0) {
          // Trial is still active, redirect to home
          navigate("/");
        } else {
          setCheckingTrial(false);
        }
      } catch (error) {
        console.error("Error checking trial status:", error);
        // On error, allow access to subscribe page (fail open)
        setCheckingTrial(false);
      }
    };

    if (!authLoading && currentUserId) {
      checkTrial();
    }
  }, [currentUserId, authLoading, navigate]);

  // Show loading while checking auth or trial
  if (authLoading || checkingTrial) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubscribe = async (planId: string) => {
    setIsProcessing(true);
    setSelectedPlan(planId);

    try {
      // Ensure user is authenticated before proceeding
      if (!user || isGuest) {
        toast({
          title: "خطأ",
          description: "يرجى تسجيل الدخول أولاً لإتمام عملية الاشتراك",
          variant: "destructive",
        });
        setIsProcessing(false);
        navigate("/login");
        return;
      }

      // Get payment link for the selected plan (single fetch)
      const response = await fetch(`/api/payment-link/${planId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "فشل الحصول على رابط الدفع");
      }

      // Final auth check before redirect (in case token expired during fetch)
      if (!user || isGuest) {
        toast({
          title: "انتهت الجلسة",
          description: "يرجى تسجيل الدخول مرة أخرى",
          variant: "destructive",
        });
        setIsProcessing(false);
        navigate("/login");
        return;
      }

      // Redirect directly to Chargily payment link
      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else {
        throw new Error("رابط الدفع غير متوفر. يرجى التواصل مع الدعم.");
      }
    } catch (error: any) {
      console.error("Error getting payment link:", error);
      
      toast({
        title: "فشل الحصول على رابط الدفع",
        description: error.message || "حدث خطأ. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
      
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10" dir="rtl">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">تلخيصلي</span>
          </div>
          {!isGuest && user && (
            <Button variant="ghost" onClick={() => navigate("/")} data-testid="button-back-home">
              العودة للرئيسية
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <div className="container py-12 text-center">
        <div className="mx-auto max-w-3xl space-y-4">
          <Badge variant="secondary" className="mb-4" data-testid="badge-trial-ended">
            انتهت التجربة المجانية (30 دقيقة)
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            اختر الخطة المناسبة لك
          </h1>
          <p className="text-xl text-muted-foreground">
            استمر في الاستفادة من تلخيصلي بدون حدود. اختر الخطة التي تناسب احتياجاتك.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container pb-16">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {plans.map((plan) => {
            const Icon = planIcons[plan.id] || Sparkles;
            const isSelected = selectedPlan === plan.id;
            
            return (
              <Card
                key={plan.id}
                className={`relative transition-all ${
                  plan.popular ? "border-primary shadow-lg" : ""
                } ${isSelected ? "ring-2 ring-primary" : ""}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary px-4 py-1" data-testid="badge-popular">
                      {plan.badgeAr}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{plan.nameAr}</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    {plan.descriptionAr}
                  </CardDescription>
                  <CardDescription>
                    <div className="mt-4 flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-foreground">
                        ${plan.price}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      يُخصم ما يعادله بالدينار الجزائري
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      ({plan.priceDZD.toLocaleString('ar-DZ')} د.ج تقريباً)
                    </div>
                    <div className="text-sm text-primary font-medium mt-3">
                      {plan.lectures} محاضرة × {plan.lecturesDuration} دقيقة
                    </div>
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-2" data-testid={`list-features-${plan.id}`}>
                    {plan.featuresAr.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-xs">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    size="lg"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isProcessing}
                    data-testid={`button-subscribe-${plan.id}`}
                  >
                    {isProcessing && isSelected ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري التحويل...
                      </>
                    ) : (
                      "اشترك الآن"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ / Features Section */}
        <div className="mx-auto mt-16 max-w-3xl space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">لماذا تلخيصلي؟</h2>
            <div className="grid gap-6 md:grid-cols-3 text-right">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">دقة عالية</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    نستخدم أحدث تقنيات الذكاء الاصطناعي (GPT-4 + Whisper) لتقديم تلخيصات دقيقة وواضحة
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">دعم متعدد اللغات</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    نفهم العربية الفصحى، الفرنسية، واللهجة الجزائرية بطلاقة
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">أمان وخصوصية</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    بياناتك محمية بالكامل ولا نشارك محتواك مع أي طرف ثالث
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Payment Notice */}
          <div className="text-center pt-8">
            <div className="inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                💳 الأسعار المعروضة بالدولار تقريبية — الدفع الفعلي يتم بالدينار الجزائري حسب سعر الصرف في منصة الدفع
              </p>
            </div>
          </div>

          {/* Contact Support */}
          <div className="text-center pt-8 border-t space-y-4">
            <p className="text-sm text-muted-foreground">
              هل لديك أسئلة؟{" "}
              <Button variant="ghost" className="px-1 h-auto" data-testid="button-contact">
                تواصل معنا
              </Button>
            </p>
            
            {/* Terms Link */}
            <p className="text-xs text-muted-foreground">
              باشتراكك، أنت توافق على{" "}
              <Link href="/terms">
                <a 
                  className="text-primary underline hover:text-primary/80 transition-colors"
                  data-testid="link-terms"
                >
                  شروط الاستخدام
                </a>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
