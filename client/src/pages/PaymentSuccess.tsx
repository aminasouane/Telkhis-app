import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Sparkles, ArrowRight, Home } from "lucide-react";

interface PaymentInfo {
  id: string;
  amount: number;
  currency: string;
  planName: string;
  paidAt: string;
  plan: {
    id: string;
    nameAr: string;
    price: number;
    priceDZD: number;
    lectures: number;
    totalMinutes: number;
  } | null;
}

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const { appUserId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      try {
        const userId = appUserId;
        if (!userId) {
          setIsLoading(false);
          return;
        }

        // Fetch latest payment info
        const response = await fetch(`/api/payment/latest?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.payment) {
            setPaymentInfo(data.payment);
          }
        }

        // Invalidate auth and subscription cache to reflect new subscription
        queryClient.invalidateQueries({ queryKey: ['/api/trial-status'] });
        queryClient.invalidateQueries({ queryKey: ['/api/summaries'] });
      } catch (error) {
        console.error("Error fetching payment info:", error);
      } finally {
        // Wait at least 2 seconds for better UX
        setTimeout(() => {
          setIsLoading(false);
        }, 2000);
      }
    };

    fetchPaymentInfo();
  }, [appUserId]);

  // Auto-redirect countdown
  useEffect(() => {
    if (isLoading) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10" dir="rtl">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <h2 className="text-2xl font-bold">جاري معالجة عملية الدفع...</h2>
              <p className="text-muted-foreground">
                يرجى الانتظار بينما نقوم بتأكيد اشتراكك
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4" dir="rtl">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-500" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-green-600 dark:text-green-500">
              تم الدفع بنجاح
            </CardTitle>
            <CardDescription className="text-lg">
              تم تفعيل اشتراكك بنجاح. يمكنك الآن الاستمتاع بجميع المزايا
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {paymentInfo && paymentInfo.plan && (
            <div className="rounded-lg bg-muted p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <span className="text-muted-foreground">الخطة المختارة:</span>
                <span className="font-bold text-lg">{paymentInfo.plan.nameAr}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">السعر:</span>
                <div className="text-right">
                  <div className="font-bold text-lg">
                    ${paymentInfo.plan.price}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    تم الدفع: {paymentInfo.plan.priceDZD.toLocaleString('ar-DZ')} د.ج
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">عدد المحاضرات:</span>
                <span className="font-semibold">
                  {paymentInfo.plan.lectures} محاضرة × 45 دقيقة
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">إجمالي الدقائق:</span>
                <span className="font-semibold text-primary">
                  {paymentInfo.plan.totalMinutes} دقيقة
                </span>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>اشتراك دائم • بدون تجديد تلقائي</span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
            <p className="text-sm">
              سيتم تحويلك تلقائياً إلى الصفحة الرئيسية خلال {countdown} ثوانٍ...
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-6">
          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate("/")}
            data-testid="button-go-home"
          >
            <Home className="ml-2 h-5 w-5" />
            الذهاب إلى الصفحة الرئيسية
          </Button>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => navigate("/history")}
            data-testid="button-view-history"
          >
            <ArrowRight className="ml-2 h-5 w-5" />
            عرض السجل
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
