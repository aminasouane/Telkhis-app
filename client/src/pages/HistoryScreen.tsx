import { useLocation } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, History, Loader2, Sparkles, Lock } from "lucide-react";

export default function HistoryScreen() {
  const [, navigate] = useLocation();
  const { appUserId, loading: authLoading } = useAuth();

  // Show loading while checking auth
  if (authLoading || !appUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => navigate("/")}
              className="w-full sm:w-auto min-w-[200px]"
              data-testid="button-new-recording"
            >
              <Plus className="h-5 w-5 ml-2" />
              تسجيل محاضرة جديدة
            </Button>

            <Button
              size="lg"
              variant="secondary"
              disabled
              className="w-full sm:w-auto min-w-[200px]"
              data-testid="button-history"
            >
              <History className="h-5 w-5 ml-2" />
              سجل التلخيصات
            </Button>
          </div>

          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-12 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  ميزة مدفوعة قادمة قريبًا
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  حفظ التلخيصات السابقة والوصول إليها في أي وقت ستكون متاحة في الخطة المدفوعة.
                </p>
                <p className="text-sm text-muted-foreground">
                  نحن نعمل على تجهيز هذه الميزة، شكرًا لصبرك!
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate("/")}
                data-testid="button-go-home"
              >
                العودة للصفحة الرئيسية
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
