import { getTrialStatus, type TrialStatus } from "./localTrialService";
import type { 
  SubscriptionState, 
  SubscriptionInfo, 
  SubscriptionStatus,
  UsagePermission 
} from "@/types/subscription";

const SUBSCRIPTION_STORAGE_KEY = "takhleesly_subscription";

function getStorageKey(appUserId: string): string {
  return `${SUBSCRIPTION_STORAGE_KEY}_${appUserId}`;
}

export function getSubscriptionInfo(appUserId: string): SubscriptionInfo | null {
  try {
    const key = getStorageKey(appUserId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const subscription = JSON.parse(data) as SubscriptionInfo;
    
    if (subscription.expiresAt) {
      const expiresAt = new Date(subscription.expiresAt);
      if (expiresAt < new Date()) {
        subscription.isActive = false;
      }
    }
    
    return subscription;
  } catch {
    return null;
  }
}

export function saveSubscriptionInfo(appUserId: string, subscription: SubscriptionInfo): void {
  const key = getStorageKey(appUserId);
  localStorage.setItem(key, JSON.stringify(subscription));
}

export function clearSubscriptionInfo(appUserId: string): void {
  const key = getStorageKey(appUserId);
  localStorage.removeItem(key);
}

export function getSubscriptionState(appUserId: string): SubscriptionState {
  const subscription = getSubscriptionInfo(appUserId);
  const trialStatus = getTrialStatus(appUserId);
  
  let status: SubscriptionStatus;
  
  if (subscription?.isActive) {
    status = "subscribed";
  } else if (trialStatus.isExpired) {
    status = "trial_expired";
  } else {
    status = "trial_active";
  }
  
  return {
    status,
    trialStatus,
    subscription,
  };
}

export function getUsagePermissions(appUserId: string): UsagePermission {
  const state = getSubscriptionState(appUserId);
  
  switch (state.status) {
    case "subscribed": {
      const sub = state.subscription!;
      const hasMinutes = sub.minutesUsed < sub.minutesLimit;
      const hasSummaries = sub.summariesUsed < sub.summariesLimit;
      
      if (!hasMinutes) {
        return {
          allowed: false,
          state,
          reason: "لقد استخدمت كامل وقت الاشتراك",
        };
      }
      
      if (!hasSummaries) {
        return {
          allowed: false,
          state,
          reason: "لقد استخدمت كامل عدد التلخيصات المتاحة",
        };
      }
      
      return { allowed: true, state };
    }
    
    case "trial_active": {
      return { allowed: true, state };
    }
    
    case "trial_expired": {
      const reason = state.trialStatus?.reason;
      let message = "انتهت التجربة المجانية";
      
      if (reason === "summaries_exhausted") {
        message = "لقد استخدمت تلخيصك المجاني";
      } else if (reason === "time_expired") {
        message = "لقد استخدمت كامل الوقت المجاني";
      } else if (reason === "days_expired") {
        message = "انتهت صلاحية التجربة";
      }
      
      return {
        allowed: false,
        state,
        reason: message,
      };
    }
  }
}

export function canCreateSummary(appUserId: string): boolean {
  return getUsagePermissions(appUserId).allowed;
}

export function recordSubscriptionUsage(
  appUserId: string, 
  audioDurationMinutes: number
): SubscriptionState {
  const subscription = getSubscriptionInfo(appUserId);
  
  if (subscription?.isActive) {
    subscription.summariesUsed += 1;
    subscription.minutesUsed += audioDurationMinutes;
    saveSubscriptionInfo(appUserId, subscription);
  }
  
  return getSubscriptionState(appUserId);
}

export function activateSubscription(
  appUserId: string,
  planId: string,
  planName: string,
  minutesLimit: number,
  summariesLimit: number,
  expiresAt: string | null = null
): SubscriptionState {
  const subscription: SubscriptionInfo = {
    id: `sub_${Date.now()}`,
    planId,
    planName,
    isActive: true,
    expiresAt,
    minutesLimit,
    minutesUsed: 0,
    summariesLimit,
    summariesUsed: 0,
  };
  
  saveSubscriptionInfo(appUserId, subscription);
  return getSubscriptionState(appUserId);
}
