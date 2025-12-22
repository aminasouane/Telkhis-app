import { getTrialStatus } from "./localTrialService";
import { getSubscriptionInfo } from "./subscriptionStateService";

export interface UserStatus {
  trialActive: boolean;
  trialExpired: boolean;
  minutesExhausted: boolean;
  isSubscribed: boolean;
  minutesRemaining: number;
  daysRemaining: number;
}

export function getUserStatus(appUserId: string): UserStatus {
  const subscription = getSubscriptionInfo(appUserId);
  const trialStatus = getTrialStatus(appUserId);
  
  const isSubscribed = subscription?.isActive === true;
  
  if (isSubscribed) {
    const subMinutesRemaining = (subscription!.minutesLimit ?? 0) - (subscription!.minutesUsed ?? 0);
    return {
      trialActive: false,
      trialExpired: false,
      minutesExhausted: subMinutesRemaining <= 0,
      isSubscribed: true,
      minutesRemaining: Math.max(0, subMinutesRemaining),
      daysRemaining: 0,
    };
  }
  
  const isDaysExpired = trialStatus.state === "EXPIRED";
  const isMinutesExhausted = trialStatus.state === "USED_UP";
  const isActive = trialStatus.state === "ACTIVE";
  
  return {
    trialActive: isActive,
    trialExpired: isDaysExpired,
    minutesExhausted: isMinutesExhausted,
    isSubscribed: false,
    minutesRemaining: trialStatus.minutesRemaining,
    daysRemaining: trialStatus.daysRemaining,
  };
}

export function canUseApp(appUserId: string): boolean {
  const status = getUserStatus(appUserId);
  return status.trialActive || status.isSubscribed;
}

export function shouldShowSubscriptionPage(appUserId: string): boolean {
  const status = getUserStatus(appUserId);
  return status.trialExpired || status.minutesExhausted;
}
