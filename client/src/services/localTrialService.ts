import { TRIAL_CONFIG } from "@/config/trialConfig";
import { getOrCreateAppUserId } from "./appUserService";

const TRIAL_STORAGE_KEY = "takhleesly_trial_data";

export type TrialStateType = "ACTIVE" | "USED_UP" | "EXPIRED";

export interface TrialData {
  appUserId: string;
  firstUseDate: string;
  totalMinutesUsed: number;
}

export interface TrialStatus {
  state: TrialStateType;
  isExpired: boolean;
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  daysRemaining: number;
  canUseTrial: boolean;
  reason?: "minutes_exhausted" | "days_expired";
}

function getStorageKey(appUserId: string): string {
  return `${TRIAL_STORAGE_KEY}_${appUserId}`;
}

export function getTrialData(appUserId: string): TrialData | null {
  try {
    const key = getStorageKey(appUserId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    // Migration: handle old format with summariesUsed
    return {
      appUserId: parsed.appUserId,
      firstUseDate: parsed.firstUseDate,
      totalMinutesUsed: parsed.totalMinutesUsed || 0,
    };
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
  
  const minutesRemaining = Math.max(0, TRIAL_CONFIG.MAX_AUDIO_MINUTES - data.totalMinutesUsed);
  
  const isDaysExpired = daysPassed >= TRIAL_CONFIG.VALIDITY_DAYS;
  const isMinutesExhausted = minutesRemaining <= 0;
  
  let state: TrialStateType;
  let reason: TrialStatus["reason"] = undefined;
  
  // Priority: days_expired takes precedence, then check minutes
  if (isDaysExpired) {
    state = "EXPIRED";
    reason = "days_expired";
  } else if (isMinutesExhausted) {
    state = "USED_UP";
    reason = "minutes_exhausted";
  } else {
    state = "ACTIVE";
  }
  
  const isExpired = state !== "ACTIVE";
  
  return {
    state,
    isExpired,
    minutesUsed: data.totalMinutesUsed,
    minutesLimit: TRIAL_CONFIG.MAX_AUDIO_MINUTES,
    minutesRemaining,
    daysRemaining,
    canUseTrial: !isExpired,
    reason,
  };
}

// Check if a specific audio duration can be processed
export function canProcessAudio(appUserId: string, audioDurationMinutes: number): { 
  allowed: boolean; 
  status: TrialStatus;
  reason?: string;
} {
  const status = getTrialStatus(appUserId);
  
  // If trial is not active, return not allowed
  if (!status.canUseTrial) {
    let reason = "التجربة المجانية غير متاحة";
    if (status.reason === "days_expired") {
      reason = "انتهت صلاحية التجربة المجانية بعد 7 أيام";
    } else if (status.reason === "minutes_exhausted") {
      reason = "لقد استخدمت كامل الوقت المجاني (30 دقيقة)";
    }
    return { allowed: false, status, reason };
  }
  
  // Check if enough minutes remaining for this specific audio
  if (status.minutesRemaining < audioDurationMinutes) {
    const remainingFormatted = status.minutesRemaining.toFixed(1);
    const requestedFormatted = audioDurationMinutes.toFixed(1);
    return {
      allowed: false,
      status,
      reason: `مدة الملف (${requestedFormatted} دقيقة) أكبر من الرصيد المتبقي (${remainingFormatted} دقيقة)`,
    };
  }
  
  return { allowed: true, status };
}

// Record usage after successful processing
export function recordUsage(appUserId: string, audioDurationMinutes: number): TrialStatus {
  const data = getTrialData(appUserId) || initializeTrialData(appUserId);
  
  data.totalMinutesUsed += audioDurationMinutes;
  
  saveTrialData(data);
  
  return getTrialStatus(appUserId);
}

// Legacy function for backward compatibility
export function canCreateSummary(appUserId: string): { allowed: boolean; status: TrialStatus } {
  const status = getTrialStatus(appUserId);
  return {
    allowed: status.canUseTrial,
    status,
  };
}

// Legacy function - renamed from recordSummaryUsage
export function recordSummaryUsage(appUserId: string, audioDurationMinutes: number): TrialStatus {
  return recordUsage(appUserId, audioDurationMinutes);
}
