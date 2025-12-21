import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import { 
  getSubscriptionState, 
  getUsagePermissions,
  recordSubscriptionUsage as recordUsage,
} from "@/services/subscriptionStateService";
import { recordSummaryUsage as recordTrialUsage } from "@/services/localTrialService";
import type { SubscriptionState, UsagePermission } from "@/types/subscription";

interface SubscriptionContextType {
  state: SubscriptionState | null;
  permissions: UsagePermission | null;
  loading: boolean;
  refreshState: () => void;
  recordUsage: (audioDurationMinutes: number) => SubscriptionState | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { appUserId, loading: authLoading } = useAuth();
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [permissions, setPermissions] = useState<UsagePermission | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshState = useCallback(() => {
    if (!appUserId) {
      setState(null);
      setPermissions(null);
      return;
    }

    const newState = getSubscriptionState(appUserId);
    const newPermissions = getUsagePermissions(appUserId);
    
    setState(newState);
    setPermissions(newPermissions);
  }, [appUserId]);

  useEffect(() => {
    if (!authLoading && appUserId) {
      refreshState();
      setLoading(false);
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [appUserId, authLoading, refreshState]);

  const recordUsageAndRefresh = useCallback((audioDurationMinutes: number): SubscriptionState | null => {
    if (!appUserId) return null;

    const currentState = getSubscriptionState(appUserId);
    
    if (currentState.status === "subscribed") {
      recordUsage(appUserId, audioDurationMinutes);
    } else if (currentState.status === "trial_active") {
      recordTrialUsage(appUserId, audioDurationMinutes);
    }
    
    refreshState();
    return state;
  }, [appUserId, refreshState, state]);

  const value: SubscriptionContextType = {
    state,
    permissions,
    loading,
    refreshState,
    recordUsage: recordUsageAndRefresh,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}

export function useSubscriptionState(): SubscriptionState | null {
  const { state } = useSubscription();
  return state;
}

export function useSummaryPermission(): UsagePermission | null {
  const { permissions } = useSubscription();
  return permissions;
}

export function useCanCreateSummary(): boolean {
  const { permissions } = useSubscription();
  return permissions?.allowed ?? false;
}
