import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Sparkles, ArrowRight } from "lucide-react";

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

export default function Success() {
  const [, navigate] = useLocation();
  const { appUserId, session } = useAuth();
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
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        const response = await fetch(`/api/payment/latest?userId=${userId}`, { headers });
        if (response.ok) {
          const data = await response.json();
          if (data.payment) {
            setPaymentInfo(data.payment);
          }
        }
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
          <CardTitle className="text-3xl font-bold text-green-600 dark:text-green-500">
            تم الدفع بنجاح! 🎉
          </CardTitle>
          <CardDescription className="text-lg">
            شكراً لك على اشتراكك في تلخيصلي
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Payment Details */}
          {paymentInfo?.plan && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">{paymentInfo.plan.nameAr}</h3>
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <span className="text-xl font-bold text-foreground">
                    ${paymentInfo.plan.price}
                  </span>
                  <span className="text-sm">•</span>
                  <span className="text-sm">
                    تم الدفع بمبلغ {paymentInfo.plan.priceDZD.toLocaleString('ar-DZ')} د.ج
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {paymentInfo.plan.lectures} محاضرة × {Math.floor(paymentInfo.plan.totalMinutes / paymentInfo.plan.lectures)} دقيقة
                </p>
              </div>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              ما التالي؟
            </h3>
            
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  1
                </div>
                <div>
                  <p className="font-medium">تم تفعيل اشتراكك</p>
                  <p className="text-muted-foreground">
                    يمكنك الآن البدء في تلخيص محاضراتك بدون حدود
                  </p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  2
                </div>
                <div>
                  <p className="font-medium">استفد من جميع المميزات</p>
                  <p className="text-muted-foreground">
                    الوصول الكامل لجميع اللغات، التصدير المتقدم، والدعم الفني
                  </p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  3
                </div>
                <div>
                  <p className="font-medium">ابدأ التلخيص الآن</p>
                  <p className="text-muted-foreground">
                    سجّل أو ارفع ملف صوتي واحصل على تلخيص دقيق في ثوانٍ
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 <strong>نصيحة:</strong> ستجد جميع تلخيصاتك السابقة محفوظة في صفحة السجل.
              يمكنك الوصول إليها في أي وقت!
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => navigate("/")}
            data-testid="button-start-now"
          >
            ابدأ التلخيص الآن
            <ArrowRight className="mr-2 h-4 w-4" />
          </Button>
          
          <div className="text-sm text-muted-foreground text-center sm:hidden">
            سيتم التوجيه تلقائياً خلال {countdown} ثوانٍ
          </div>
        </CardFooter>

        <div className="hidden sm:block text-center pb-6">
          <p className="text-sm text-muted-foreground">
            سيتم التوجيه تلقائياً إلى الصفحة الرئيسية خلال {countdown} ثوانٍ
          </p>
        </div>
      </Card>
    </div>
  );
}
