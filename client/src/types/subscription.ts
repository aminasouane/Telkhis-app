import { type TrialStatus } from "@/services/localTrialService";

export type SubscriptionStatus = "trial_active" | "trial_expired" | "subscribed";

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
