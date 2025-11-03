import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, ArrowRight, Home, RefreshCw } from "lucide-react";

export default function PaymentFailed() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 to-destructive/10 p-4" dir="rtl">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-destructive">
              فشلت عملية الدفع
            </CardTitle>
            <CardDescription className="text-lg">
              لم تتم عملية الدفع بنجاح. يرجى المحاولة مرة أخرى.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-6 space-y-4">
            <h3 className="font-semibold text-lg">الأسباب المحتملة لفشل الدفع:</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                <span>رصيد غير كافٍ في البطاقة</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                <span>بيانات البطاقة غير صحيحة</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                <span>انتهت صلاحية البطاقة</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                <span>تم إلغاء العملية من طرفك</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                <span>مشكلة تقنية مؤقتة</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h3 className="font-semibold mb-2">💡 نصيحة</h3>
            <p className="text-sm text-muted-foreground">
              تأكد من صحة بيانات البطاقة وتوفر الرصيد الكافي، ثم حاول مرة أخرى.
              إذا استمرت المشكلة، يرجى التواصل مع دعم Chargily أو البنك الخاص بك.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-6">
          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate("/subscribe")}
            data-testid="button-retry-payment"
          >
            <RefreshCw className="ml-2 h-5 w-5" />
            المحاولة مرة أخرى
          </Button>

          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              size="lg"
              onClick={() => navigate("/")}
              data-testid="button-go-home"
            >
              <Home className="ml-2 h-5 w-5" />
              الرئيسية
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              size="lg"
              onClick={() => navigate("/history")}
              data-testid="button-view-history"
            >
              <ArrowRight className="ml-2 h-5 w-5" />
              السجل
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
