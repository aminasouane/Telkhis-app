import { type TrialStatus } from "@/services/localTrialService";

// trial_active: User has active trial with remaining minutes
// trial_used_up: Trial minutes exhausted but days remaining
// trial_expired: Trial days expired (7 days passed)
// subscribed: User has active paid subscription
export type SubscriptionStatus = "trial_active" | "trial_used_up" | "trial_expired" | "subscribed";

export interface SubscriptionInfo {
  id: string;
  planId: string;
  planName: string;
  isActive: boolean;
  expiresAt: string | null;
  minutesLimit: number;
  minutesUsed: number;
  summariesLimit: number;
  summariesUsed: number;
}

export interface SubscriptionState {
  status: SubscriptionStatus;
  trialStatus: TrialStatus | null;
  subscription: SubscriptionInfo | null;
}

export interface UsagePermission {
  allowed: boolean;
  state: SubscriptionState;
  reason?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  priceDZD: number;
  minutesLimit: number;
  summariesLimit: number;
  features: string[];
  featuresAr: string[];
}
