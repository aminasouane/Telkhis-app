import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AuthProvider } from "@/components/AuthProvider";
import Home from "@/pages/Home";
import HistoryScreen from "@/pages/HistoryScreen";
import Login from "@/pages/Login";
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
      <Route path="/login" component={Login} />
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
            <LanguageProvider>
              <Toaster />
              <Router />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
