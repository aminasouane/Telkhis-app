import { useAuth } from "@/components/AuthProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrialExpiredExperience from "@/components/TrialExpiredExperience";
import { Loader2 } from "lucide-react";

export default function Subscribe() {
  const { loading: authLoading } = useAuth();

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
      <main className="flex-1 container py-8">
        <TrialExpiredExperience
          trialStatus={null}
          showMetrics={false}
        />
      </main>
      <Footer />
    </div>
  );
}
