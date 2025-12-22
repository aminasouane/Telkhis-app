import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import { 
  getSubscriptionState, 
  getUsagePermissions,
  canProcessAudioFile,
  recordSubscriptionUsage,
  recordTrialUsage,
} from "@/services/subscriptionStateService";
import type { SubscriptionState, UsagePermission } from "@/types/subscription";

interface SubscriptionContextType {
  state: SubscriptionState | null;
  permissions: UsagePermission | null;
  loading: boolean;
  refreshState: () => void;
  recordUsage: (audioDurationMinutes: number) => SubscriptionState | null;
  checkCanProcessAudio: (audioDurationMinutes: number) => UsagePermission | null;
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
    // Get basic permissions (without specific audio duration)
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

  // Check if a specific audio duration can be processed
  const checkCanProcessAudio = useCallback((audioDurationMinutes: number): UsagePermission | null => {
    if (!appUserId) return null;
    return canProcessAudioFile(appUserId, audioDurationMinutes);
  }, [appUserId]);

  const recordUsageAndRefresh = useCallback((audioDurationMinutes: number): SubscriptionState | null => {
    if (!appUserId) return null;

    const currentState = getSubscriptionState(appUserId);
    
    if (currentState.status === "subscribed") {
      recordSubscriptionUsage(appUserId, audioDurationMinutes);
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
    checkCanProcessAudio,
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
