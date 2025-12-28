import { TRIAL_CONFIG } from "@/config/trialConfig";
import { getOrCreateAppUserId } from "./appUserService";

// Re-export TRIAL_CONFIG for use in other components
export { TRIAL_CONFIG };

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
  
  // Calculate daily usage (reset if different day)
  const dailyUsage = data.dailyUsage;
  const dailyMinutesUsed = (dailyUsage && dailyUsage.date === today) ? dailyUsage.minutesUsed : 0;
  const dailyMinutesRemaining = Math.max(0, TRIAL_CONFIG.DAILY_LIMIT_MINUTES - dailyMinutesUsed);
  const isDailyLimitReached = dailyMinutesRemaining <= 0;
  
  const isDaysExpired = daysPassed >= TRIAL_CONFIG.VALIDITY_DAYS;
  
  // For analytics: total minutes remaining (not used for blocking in MVP)
  const totalMinutesRemaining = Math.max(0, TRIAL_CONFIG.MAX_AUDIO_MINUTES - data.totalMinutesUsed);
  
  // ============================================================
  // TRIAL VALIDITY (MVP v3.1):
  // 1. Days expired (7 days from first use) → blocks user
  // 2. Daily limit exhausted (30 min/day) → blocks user (handled separately)
  // 
  // NOTE: totalMinutesUsed is NOT used for blocking - analytics only.
  // ============================================================
  let state: TrialStateType;
  let reason: TrialStatus["reason"] = undefined;
  
  // Only block based on days expired - total minutes is analytics only
  if (isDaysExpired) {
    state = "EXPIRED";
    reason = "days_expired";
  } else {
    state = "ACTIVE";
  }
  
  const isExpired = state !== "ACTIVE";
  
  return {
    state,
    isExpired,
    minutesUsed: data.totalMinutesUsed, // Total minutes used
    minutesLimit: TRIAL_CONFIG.MAX_AUDIO_MINUTES, // 30 minutes total limit
    minutesRemaining: totalMinutesRemaining, // Minutes remaining from 30
    daysRemaining,
    canUseTrial: !isExpired,
    reason,
    dailyMinutesUsed,
    dailyMinutesLimit: TRIAL_CONFIG.DAILY_LIMIT_MINUTES,
    dailyMinutesRemaining,
    isDailyLimitReached,
  };
}

// MVP v3.1: Only daily_limit and days_expired are used for blocking
// total_limit/minutes_exhausted are removed - totalMinutesUsed is analytics only
export type BlockReason = "daily_limit" | "days_expired";

// Check if a specific audio duration can be processed
// MVP LOGIC:
// 1. Check date expiry (7 days from first use)
// 2. Check daily limit (30 minutes per day)
// 3. NO total limit check - totalMinutesUsed is for analytics only
// Current operation is always allowed to complete (single-request overage allowed)
export function canProcessAudio(appUserId: string, audioDurationMinutes: number): { 
  allowed: boolean; 
  status: TrialStatus;
  reason?: string;
  blockReason?: BlockReason;
} {
  const status = getTrialStatus(appUserId);
  
  // Check 1: Date expiry (trial is 7 days from first use)
  if (!status.canUseTrial && status.reason === "days_expired") {
    return {
      allowed: false,
      status,
      reason: "انتهت صلاحية التجربة المجانية بعد 7 أيام",
      blockReason: "days_expired",
    };
  }
  
  // Check 2: Daily limit is ALREADY exhausted (>= 30 minutes used today)
  if (status.dailyMinutesUsed >= TRIAL_CONFIG.DAILY_LIMIT_MINUTES) {
    return {
      allowed: false,
      status,
      reason: `لقد وصلت للحد اليومي (${TRIAL_CONFIG.DAILY_LIMIT_MINUTES} دقيقة). يمكنك المتابعة غداً.`,
      blockReason: "daily_limit",
    };
  }
  
  // NO Check 3: totalMinutesUsed is NOT used for blocking in MVP
  // Users get 30 minutes per day for 7 days (max possible = 210 minutes)
  
  // Current operation is always allowed to complete
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

// Debug function to inspect current trial data (can be called from browser console)
export function debugTrialData(appUserId: string): void {
  const data = getTrialData(appUserId);
  const status = getTrialStatus(appUserId);
  console.log("=== TRIAL DEBUG INFO ===");
  console.log("Raw localStorage data:", data);
  console.log("Calculated status:", status);
  console.log("========================");
}

// Reset trial data (for debugging/testing purposes)
// WARNING: This clears all usage data - use with caution
export function resetTrialData(appUserId: string): void {
  const key = getStorageKey(appUserId);
  localStorage.removeItem(key);
  console.log(`[resetTrialData] Cleared trial data for user ${appUserId}`);
}

// Expose debug functions globally for browser console access
if (typeof window !== 'undefined') {
  // Auto-detect current userId from localStorage
  const getCurrentUserId = (): string | null => {
    const stored = localStorage.getItem('takhleesly_app_user_id');
    return stored;
  };
  
  (window as any).debugTrial = (userId?: string) => {
    const id = userId || getCurrentUserId();
    if (!id) {
      console.log('[Trial Debug] No userId provided and no stored userId found');
      return;
    }
    debugTrialData(id);
  };
  
  (window as any).resetTrial = (userId?: string) => {
    const id = userId || getCurrentUserId();
    if (!id) {
      console.log('[Trial Reset] No userId provided and no stored userId found');
      return;
    }
    resetTrialData(id);
    console.log('[Trial Reset] Done! Refresh the page to see changes.');
  };
  
  console.log('[Trial Debug] Available commands: debugTrial(), resetTrial() - auto-detects userId');
}
