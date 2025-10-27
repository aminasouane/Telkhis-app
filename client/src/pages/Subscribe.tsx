import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { getTrialStatus } from "@/services/trialService";

interface PricingPlan {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  currency: string;
  interval: string;
  intervalAr: string;
  features: string[];
  icon: any;
  popular?: boolean;
  priceId?: string; // سيتم استخدامه عند دمج Stripe
}

const plans: PricingPlan[] = [
  {
    id: "monthly",
    name: "Monthly",
    nameAr: "الاشتراك الشهري",
    price: 9.99,
    currency: "USD",
    interval: "month",
    intervalAr: "شهر",
    icon: Sparkles,
    features: [
      "تلخيصات غير محدودة",
      "دعم جميع اللغات (عربي، فرنسي، جزائري)",
      "تسجيلات حتى 60 دقيقة",
      "حفظ التاريخ الكامل",
      "تصدير PDF و TXT",
      "دعم فني على مدار الساعة",
    ],
  },
  {
    id: "yearly",
    name: "Yearly",
    nameAr: "الاشتراك السنوي",
    price: 99.99,
    currency: "USD",
    interval: "year",
    intervalAr: "سنة",
    icon: Crown,
    popular: true,
    features: [
      "كل مميزات الاشتراك الشهري",
      "وفر 17% (شهرين مجاناً)",
      "أولوية في المعالجة",
      "ميزات تجريبية مبكرة",
      "دعم فني مخصص",
      "ضمان استرجاع المال لمدة 30 يوماً",
    ],
  },
];

export default function Subscribe() {
  const [, navigate] = useLocation();
  const { user, isGuest, guestUserId, loading: authLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string>("yearly");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkingTrial, setCheckingTrial] = useState(true);
  
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

    // TODO: عند دمج Stripe، سيتم استدعاء API هنا:
    // 1. إنشاء Stripe Checkout Session
    // 2. توجيه المستخدم إلى صفحة الدفع
    // 3. معالجة الدفع عبر Webhook
    
    // مؤقتاً: عرض رسالة توضيحية
    alert("سيتم دمج بوابة الدفع قريباً عبر Stripe");
    
    setIsProcessing(false);
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
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;
            
            return (
              <Card
                key={plan.id}
                className={`relative transition-all ${
                  plan.popular ? "border-primary shadow-lg" : ""
                } ${isSelected ? "ring-2 ring-primary" : ""}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary px-4 py-1" data-testid="badge-popular">
                      الأكثر شعبية
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{plan.nameAr}</CardTitle>
                  <CardDescription>
                    <div className="mt-4 flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-foreground">
                        ${plan.price}
                      </span>
                      <span className="text-muted-foreground">/ {plan.intervalAr}</span>
                    </div>
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3" data-testid={`list-features-${plan.id}`}>
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <span className="text-sm">{feature}</span>
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
                    {isProcessing && isSelected ? "جاري المعالجة..." : "اشترك الآن"}
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
