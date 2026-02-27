import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { SubscriptionProvider } from "@/components/SubscriptionProvider";
import { SettingsSync } from "@/components/SettingsSync";
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

// Syncs authenticated Supabase user with the server DB on login
function UserSync() {
  const { user, session } = useAuth();

  useEffect(() => {
    if (!user || !session) return;

    // Register/update the user in our Supabase DB
    fetch('/api/user/upsert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        userId: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || null,
        provider: user.app_metadata?.provider || 'email',
      }),
    }).catch(err => {
      console.warn('[UserSync] Failed to sync user:', err);
    });
  }, [user?.id, session?.access_token]);

  return null;
}

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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <LanguageProvider>
                <SettingsSync />
                <UserSync />
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
