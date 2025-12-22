import { getTrialStatus, getTimeUntilReset, type BlockReason } from "./localTrialService";
import { getSubscriptionInfo } from "./subscriptionStateService";

export interface UserStatus {
  trialActive: boolean;
  trialExpired: boolean;
  minutesExhausted: boolean;
  dailyLimitReached: boolean;
  isSubscribed: boolean;
  minutesRemaining: number;
  dailyMinutesRemaining: number;
  daysRemaining: number;
  hoursUntilReset: number;
  minutesUntilReset: number;
}

export function getUserStatus(appUserId: string): UserStatus {
  const subscription = getSubscriptionInfo(appUserId);
  const trialStatus = getTrialStatus(appUserId);
  const resetTime = getTimeUntilReset();
  
  const isSubscribed = subscription?.isActive === true;
  
  if (isSubscribed) {
    const subMinutesRemaining = (subscription!.minutesLimit ?? 0) - (subscription!.minutesUsed ?? 0);
    return {
      trialActive: false,
      trialExpired: false,
      minutesExhausted: subMinutesRemaining <= 0,
      dailyLimitReached: false,
      isSubscribed: true,
      minutesRemaining: Math.max(0, subMinutesRemaining),
      dailyMinutesRemaining: Infinity,
      daysRemaining: 0,
      hoursUntilReset: 0,
      minutesUntilReset: 0,
    };
  }
  
  const isDaysExpired = trialStatus.state === "EXPIRED";
  const isMinutesExhausted = trialStatus.state === "USED_UP";
  const isActive = trialStatus.state === "ACTIVE";
  
  return {
    // trialActive should reflect trial validity (not expired, not exhausted)
    // Daily limit is a SEPARATE concern that only blocks the action, not the UI
    trialActive: isActive,
    trialExpired: isDaysExpired,
    minutesExhausted: isMinutesExhausted,
    dailyLimitReached: trialStatus.isDailyLimitReached && isActive,
    isSubscribed: false,
    minutesRemaining: trialStatus.minutesRemaining,
    dailyMinutesRemaining: trialStatus.dailyMinutesRemaining,
    daysRemaining: trialStatus.daysRemaining,
    hoursUntilReset: resetTime.hours,
    minutesUntilReset: resetTime.minutes,
  };
}

export function canUseApp(appUserId: string): boolean {
  const status = getUserStatus(appUserId);
  // User can USE the app if trial is active OR subscribed
  // Daily limit only blocks the summarize ACTION, not app access
  return status.trialActive || status.isSubscribed;
}

export function shouldShowSubscriptionPage(appUserId: string): boolean {
  const status = getUserStatus(appUserId);
  // Only redirect to subscription page for trial expiration or total minutes exhausted
  // Daily limit should show a modal, not redirect
  return status.trialExpired || status.minutesExhausted;
}

export function shouldShowDailyLimitModal(appUserId: string): boolean {
  const status = getUserStatus(appUserId);
  return status.dailyLimitReached;
}

export { type BlockReason };
