import { TRIAL_CONFIG } from "@/config/trialConfig";
import { getOrCreateAppUserId } from "./appUserService";

const TRIAL_STORAGE_KEY = "takhleesly_trial_data";

export type TrialStateType = "ACTIVE" | "USED_UP" | "EXPIRED";

export interface TrialData {
  appUserId: string;
  firstUseDate: string;
  summariesUsed: number;
  totalMinutesUsed: number;
}

export interface TrialStatus {
  state: TrialStateType;
  isExpired: boolean;
  summariesUsed: number;
  summariesLimit: number;
  summariesRemaining: number;
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  daysRemaining: number;
  canUseTrial: boolean;
  reason?: "summaries_exhausted" | "time_expired" | "days_expired";
}

function getStorageKey(appUserId: string): string {
  return `${TRIAL_STORAGE_KEY}_${appUserId}`;
}

export function getTrialData(appUserId: string): TrialData | null {
  try {
    const key = getStorageKey(appUserId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function initializeTrialData(appUserId: string): TrialData {
  const existingData = getTrialData(appUserId);
  if (existingData) return existingData;

  const newData: TrialData = {
    appUserId,
    firstUseDate: new Date().toISOString(),
    summariesUsed: 0,
    totalMinutesUsed: 0,
  };

  saveTrialData(newData);
  return newData;
}

export function saveTrialData(data: TrialData): void {
  const key = getStorageKey(data.appUserId);
  localStorage.setItem(key, JSON.stringify(data));
}

export function getTrialStatus(appUserId: string): TrialStatus {
  const data = getTrialData(appUserId);
  
  // If no trial data exists, user hasn't started trial yet - trial is ACTIVE with full limits
  if (!data) {
    return {
      state: "ACTIVE",
      isExpired: false,
      summariesUsed: 0,
      summariesLimit: TRIAL_CONFIG.MAX_SUMMARIES,
      summariesRemaining: TRIAL_CONFIG.MAX_SUMMARIES,
      minutesUsed: 0,
      minutesLimit: TRIAL_CONFIG.MAX_AUDIO_MINUTES,
      minutesRemaining: TRIAL_CONFIG.MAX_AUDIO_MINUTES,
      daysRemaining: TRIAL_CONFIG.VALIDITY_DAYS,
      canUseTrial: true,
      reason: undefined,
    };
  }
  
  const now = new Date();
  const firstUse = new Date(data.firstUseDate);
  const daysPassed = Math.floor((now.getTime() - firstUse.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, TRIAL_CONFIG.VALIDITY_DAYS - daysPassed);
  
  const summariesRemaining = Math.max(0, TRIAL_CONFIG.MAX_SUMMARIES - data.summariesUsed);
  const minutesRemaining = Math.max(0, TRIAL_CONFIG.MAX_AUDIO_MINUTES - data.totalMinutesUsed);
  
  const isDaysExpired = daysPassed >= TRIAL_CONFIG.VALIDITY_DAYS;
  const isSummariesExhausted = summariesRemaining <= 0;
  const isTimeExhausted = minutesRemaining <= 0;
  
  let state: TrialStateType;
  let reason: TrialStatus["reason"] = undefined;
  
  // Priority: days_expired takes precedence, then check usage limits
  if (isDaysExpired) {
    state = "EXPIRED";
    reason = "days_expired";
  } else if (isSummariesExhausted) {
    state = "USED_UP";
    reason = "summaries_exhausted";
  } else if (isTimeExhausted) {
    state = "USED_UP";
    reason = "time_expired";
  } else {
    state = "ACTIVE";
  }
  
  const isExpired = state !== "ACTIVE";
  
  return {
    state,
    isExpired,
    summariesUsed: data.summariesUsed,
    summariesLimit: TRIAL_CONFIG.MAX_SUMMARIES,
    summariesRemaining,
    minutesUsed: data.totalMinutesUsed,
    minutesLimit: TRIAL_CONFIG.MAX_AUDIO_MINUTES,
    minutesRemaining,
    daysRemaining,
    canUseTrial: !isExpired,
    reason,
  };
}

export function recordSummaryUsage(appUserId: string, audioDurationMinutes: number): TrialStatus {
  const data = getTrialData(appUserId) || initializeTrialData(appUserId);
  
  data.summariesUsed += 1;
  data.totalMinutesUsed += audioDurationMinutes;
  
  saveTrialData(data);
  
  return getTrialStatus(appUserId);
}

export function canCreateSummary(appUserId: string): { allowed: boolean; status: TrialStatus } {
  const status = getTrialStatus(appUserId);
  return {
    allowed: status.canUseTrial,
    status,
  };
}
