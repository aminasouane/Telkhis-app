import { TRIAL_CONFIG } from "@/config/trialConfig";
import { getOrCreateAppUserId } from "./appUserService";

const TRIAL_STORAGE_KEY = "takhleesly_trial_data";

export type TrialStateType = "ACTIVE" | "USED_UP" | "EXPIRED";

export interface DailyUsage {
  date: string; // ISO date string (YYYY-MM-DD)
  minutesUsed: number;
}

export interface TrialData {
  appUserId: string;
  firstUseDate: string;
  totalMinutesUsed: number;
  dailyUsage?: DailyUsage; // Current day's usage
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
  // Daily usage tracking
  dailyMinutesUsed: number;
  dailyMinutesLimit: number;
  dailyMinutesRemaining: number;
  isDailyLimitReached: boolean;
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
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
    const today = getTodayDateString();
    
    // Reset daily usage if it's a new day
    let dailyUsage = parsed.dailyUsage;
    if (dailyUsage && dailyUsage.date !== today) {
      dailyUsage = { date: today, minutesUsed: 0 };
    }
    
    return {
      appUserId: parsed.appUserId,
      firstUseDate: parsed.firstUseDate,
      totalMinutesUsed: parsed.totalMinutesUsed || 0,
      dailyUsage: dailyUsage || { date: today, minutesUsed: 0 },
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
  const today = getTodayDateString();
  
  // Debug log: trace what's in storage
  console.log(`[getTrialStatus] appUserId=${appUserId}, data=`, data);
  
  // If no trial data exists, user hasn't started trial yet - trial is ACTIVE with full limits
  if (!data) {
    console.log(`[getTrialStatus] No data found - returning fresh trial`);
    return {
      state: "ACTIVE",
      isExpired: false,
      minutesUsed: 0,
      minutesLimit: TRIAL_CONFIG.MAX_AUDIO_MINUTES,
      minutesRemaining: TRIAL_CONFIG.MAX_AUDIO_MINUTES,
      daysRemaining: TRIAL_CONFIG.VALIDITY_DAYS,
      canUseTrial: true,
      reason: undefined,
      dailyMinutesUsed: 0,
      dailyMinutesLimit: TRIAL_CONFIG.DAILY_LIMIT_MINUTES,
      dailyMinutesRemaining: TRIAL_CONFIG.DAILY_LIMIT_MINUTES,
      isDailyLimitReached: false,
    };
  }
  
  const now = new Date();
  const firstUse = new Date(data.firstUseDate);
  const daysPassed = Math.floor((now.getTime() - firstUse.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, TRIAL_CONFIG.VALIDITY_DAYS - daysPassed);
  
  const minutesRemaining = Math.max(0, TRIAL_CONFIG.MAX_AUDIO_MINUTES - data.totalMinutesUsed);
  
  // Calculate daily usage (reset if different day)
  const dailyUsage = data.dailyUsage;
  const dailyMinutesUsed = (dailyUsage && dailyUsage.date === today) ? dailyUsage.minutesUsed : 0;
  const dailyMinutesRemaining = Math.max(0, TRIAL_CONFIG.DAILY_LIMIT_MINUTES - dailyMinutesUsed);
  const isDailyLimitReached = dailyMinutesRemaining <= 0;
  
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
    dailyMinutesUsed,
    dailyMinutesLimit: TRIAL_CONFIG.DAILY_LIMIT_MINUTES,
    dailyMinutesRemaining,
    isDailyLimitReached,
  };
}

export type BlockReason = "daily_limit" | "total_limit" | "days_expired" | "minutes_exhausted";

// Check if a specific audio duration can be processed
export function canProcessAudio(appUserId: string, audioDurationMinutes: number): { 
  allowed: boolean; 
  status: TrialStatus;
  reason?: string;
  blockReason?: BlockReason;
} {
  const status = getTrialStatus(appUserId);
  
  // If trial is not active (expired or used up), return not allowed
  if (!status.canUseTrial) {
    let reason = "التجربة المجانية غير متاحة";
    let blockReason: BlockReason = "minutes_exhausted";
    if (status.reason === "days_expired") {
      reason = "انتهت صلاحية التجربة المجانية بعد 7 أيام";
      blockReason = "days_expired";
    } else if (status.reason === "minutes_exhausted") {
      reason = "لقد استخدمت كامل الوقت المجاني (30 دقيقة)";
      blockReason = "minutes_exhausted";
    }
    return { allowed: false, status, reason, blockReason };
  }
  
  // Check daily limit FIRST (this takes precedence for active trials)
  if (status.dailyMinutesRemaining < audioDurationMinutes) {
    const remainingFormatted = status.dailyMinutesRemaining.toFixed(1);
    const requestedFormatted = audioDurationMinutes.toFixed(1);
    return {
      allowed: false,
      status,
      reason: `الحد اليومي: تبقى ${remainingFormatted} دقيقة فقط اليوم. مدة الملف: ${requestedFormatted} دقيقة`,
      blockReason: "daily_limit",
    };
  }
  
  // Check total remaining minutes
  if (status.minutesRemaining < audioDurationMinutes) {
    const remainingFormatted = status.minutesRemaining.toFixed(1);
    const requestedFormatted = audioDurationMinutes.toFixed(1);
    return {
      allowed: false,
      status,
      reason: `مدة الملف (${requestedFormatted} دقيقة) أكبر من الرصيد الإجمالي المتبقي (${remainingFormatted} دقيقة)`,
      blockReason: "total_limit",
    };
  }
  
  return { allowed: true, status };
}

// Record usage after successful processing (both total and daily)
export function recordUsage(appUserId: string, audioDurationMinutes: number): TrialStatus {
  console.log(`[recordUsage] START: Recording ${audioDurationMinutes} minutes for user ${appUserId}`);
  
  const existingData = getTrialData(appUserId);
  const data = existingData || initializeTrialData(appUserId);
  const today = getTodayDateString();
  
  console.log(`[recordUsage] BEFORE: totalMinutesUsed=${data.totalMinutesUsed}, dailyUsage=`, data.dailyUsage);
  
  // Sanity check: prevent negative or unreasonably large values
  if (audioDurationMinutes < 0 || audioDurationMinutes > 60) {
    console.error(`[recordUsage] INVALID duration: ${audioDurationMinutes}. Clamping to valid range.`);
    audioDurationMinutes = Math.max(0, Math.min(60, audioDurationMinutes));
  }
  
  // Update total usage (INCREMENTAL, not replacement)
  const previousTotal = data.totalMinutesUsed || 0;
  data.totalMinutesUsed = previousTotal + audioDurationMinutes;
  
  // Update daily usage
  if (!data.dailyUsage || data.dailyUsage.date !== today) {
    data.dailyUsage = { date: today, minutesUsed: 0 };
  }
  const previousDaily = data.dailyUsage.minutesUsed || 0;
  data.dailyUsage.minutesUsed = previousDaily + audioDurationMinutes;
  
  console.log(`[recordUsage] AFTER: totalMinutesUsed=${data.totalMinutesUsed} (was ${previousTotal}), dailyUsage.minutesUsed=${data.dailyUsage.minutesUsed} (was ${previousDaily})`);
  
  saveTrialData(data);
  
  const newStatus = getTrialStatus(appUserId);
  console.log(`[recordUsage] NEW STATUS: state=${newStatus.state}, minutesRemaining=${newStatus.minutesRemaining}, dailyMinutesRemaining=${newStatus.dailyMinutesRemaining}`);
  
  return newStatus;
}

// Get time until daily limit resets (next midnight)
export function getTimeUntilReset(): { hours: number; minutes: number } {
  const now = new Date();
  const midnight = getNextMidnight();
  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes };
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
