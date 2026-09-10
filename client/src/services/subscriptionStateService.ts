import { getTrialStatus, canProcessAudio, recordUsage, type TrialStatus } from "./localTrialService";
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
  } else if (trialStatus.state === "EXPIRED") {
    // Days expired (30 days passed since first use)
    status = "trial_expired";
  } else if (trialStatus.state === "USED_UP") {
    // Minutes exhausted but days remaining
    status = "trial_used_up";
  } else {
    status = "trial_active";
  }
  
  return {
    status,
    trialStatus,
    subscription,
  };
}

// Check if user can process audio of a specific duration
export function getUsagePermissions(appUserId: string, audioDurationMinutes?: number): UsagePermission {
  const state = getSubscriptionState(appUserId);
  
  switch (state.status) {
    case "subscribed": {
      const sub = state.subscription!;
      const minutesRemaining = sub.minutesLimit - sub.minutesUsed;
      
      if (minutesRemaining <= 0) {
        return {
          allowed: false,
          state,
          reason: "لقد استخدمت كامل وقت الاشتراك",
        };
      }
      
      // If audioDuration provided, check if enough minutes
      if (audioDurationMinutes !== undefined && minutesRemaining < audioDurationMinutes) {
        const remainingFormatted = minutesRemaining.toFixed(1);
        const requestedFormatted = audioDurationMinutes.toFixed(1);
        return {
          allowed: false,
          state,
          reason: `مدة الملف (${requestedFormatted} دقيقة) أكبر من الرصيد المتبقي (${remainingFormatted} دقيقة)`,
        };
      }
      
      return { allowed: true, state };
    }
    
    case "trial_active": {
      // If audioDuration provided, check if enough minutes remaining
      if (audioDurationMinutes !== undefined) {
        const trialCheck = canProcessAudio(appUserId, audioDurationMinutes);
        if (!trialCheck.allowed) {
          return {
            allowed: false,
            state,
            reason: trialCheck.reason,
          };
        }
      }
      return { allowed: true, state };
    }
    
    case "trial_used_up": {
      // Minutes exhausted but days remaining
      return {
        allowed: false,
        state,
        reason: "لقد استخدمت كامل الوقت المجاني (30 دقيقة)",
      };
    }
    
    case "trial_expired": {
      // Days expired (30 days passed)
      return {
        allowed: false,
        state,
        reason: "انتهت صلاحية التجربة المجانية بعد 30 يوماً",
      };
    }
  }
}

// Basic check without audio duration (for UI display)
export function canCreateSummary(appUserId: string): boolean {
  return getUsagePermissions(appUserId).allowed;
}

// Check with specific audio duration (for processing)
export function canProcessAudioFile(appUserId: string, audioDurationMinutes: number): UsagePermission {
  return getUsagePermissions(appUserId, audioDurationMinutes);
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

// Record trial usage (called after successful processing)
export function recordTrialUsage(appUserId: string, audioDurationMinutes: number): SubscriptionState {
  recordUsage(appUserId, audioDurationMinutes);
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
