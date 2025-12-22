import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/AuthProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrialExpiredExperience from "@/components/TrialExpiredExperience";
import { getTrialStatus, type TrialStatus } from "@/services/localTrialService";
import { getUserStatus, shouldShowSubscriptionPage } from "@/services/userStatusService";
import { Loader2 } from "lucide-react";

export default function Subscribe() {
  const [, navigate] = useLocation();
  const { appUserId, loading: authLoading } = useAuth();
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && appUserId) {
      const status = getTrialStatus(appUserId);
      setTrialStatus(status);
      
      // If trial is still active, redirect to home
      if (!shouldShowSubscriptionPage(appUserId)) {
        navigate("/");
      } else {
        setIsLoading(false);
      }
    } else if (!authLoading && !appUserId) {
      setIsLoading(false);
    }
  }, [appUserId, authLoading, navigate]);

  if (authLoading || isLoading) {
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
          trialStatus={trialStatus} 
          showMetrics={true}
        />
      </main>

      <Footer />
    </div>
  );
}
