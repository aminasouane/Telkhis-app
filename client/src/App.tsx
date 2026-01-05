import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { SubscriptionProvider } from "@/components/SubscriptionProvider";
import { initializeTrialSync } from "@/services/trialSyncService";
import Home from "@/pages/Home";
import HistoryScreen from "@/pages/HistoryScreen";
import Subscribe from "@/pages/Subscribe";
import Success from "@/pages/Success";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailed from "@/pages/PaymentFailed";
import AboutUs from "@/pages/AboutUs";
import TermsAndConditions from "@/pages/TermsAndConditions";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/history" component={HistoryScreen} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/success" component={Success} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/failed" component={PaymentFailed} />
      <Route path="/about" component={AboutUs} />
      <Route path="/terms" component={TermsAndConditions} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [trialSynced, setTrialSynced] = useState(false);

  useEffect(() => {
    initializeTrialSync().then(() => {
      setTrialSynced(true);
      console.log('[App] Trial sync completed');
    }).catch((err) => {
      console.error('[App] Trial sync failed:', err);
      setTrialSynced(true);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <LanguageProvider>
                <Toaster />
                <Router />
              </LanguageProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
