import { useAuth } from "@/components/AuthProvider";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrialExpiredExperience from "@/components/TrialExpiredExperience";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";

export default function Subscribe() {
  const { loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <Header />
      <main className="flex-1 container py-6 space-y-4 max-w-2xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-primary"
          onClick={() => navigate("/")}
        >
          <ArrowRight className="h-4 w-4" />
          العودة للصفحة الرئيسية
        </Button>
        <TrialExpiredExperience
          trialStatus={null}
          showMetrics={false}
        />
      </main>
      <Footer />
    </div>
  );
}
