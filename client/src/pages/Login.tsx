import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">تلخيصلي</CardTitle>
          <CardDescription className="text-lg">
            مرحباً بك في تلخيصلي
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">
            يمكنك استخدام التطبيق مباشرة بدون تسجيل دخول.
            <br />
            سيتم حفظ بياناتك تلقائياً على جهازك.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="w-full"
            size="lg"
            data-testid="button-go-home"
          >
            ابدأ الاستخدام
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
