import { TRIAL_CONFIG } from "@/config/trialConfig";
import { 
  checkTrialStatus as checkTrialStatusShared,
  capUsageAtLimit,
  capDailyUsageAtLimit,
  type BlockReason as SharedBlockReason
} from "@shared/trial";
import { getOrCreateAppUserId } from "./appUserService";

export { TRIAL_CONFIG };

export type BlockReason = SharedBlockReason;

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
  const isTotalLimitReached = data.totalMinutesUsed >= TRIAL_CONFIG.MAX_AUDIO_MINUTES;
  
  // When days expire, all remaining minutes become 0 per the plan rules
  const totalMinutesRemaining = isDaysExpired ? 0 : Math.max(0, TRIAL_CONFIG.MAX_AUDIO_MINUTES - data.totalMinutesUsed);
  
  // ============================================================
  // TRIAL VALIDITY (MVP v3.2):
  // 1. Days expired (30 days from first use) → blocks user
  // 2. Total limit (900 min) → blocks user
  // 3. Daily limit exhausted (45 min/day) → blocks user (handled separately)
  // ============================================================
  let state: TrialStateType;
  let reason: TrialStatus["reason"] = undefined;
  
  if (isDaysExpired) {
    state = "EXPIRED";
    reason = "days_expired";
  } else if (isTotalLimitReached) {
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
    minutesRemaining: totalMinutesRemaining,
    daysRemaining,
    canUseTrial: !isExpired && !isDailyLimitReached,
    reason,
    dailyMinutesUsed,
    dailyMinutesLimit: TRIAL_CONFIG.DAILY_LIMIT_MINUTES,
    dailyMinutesRemaining,
    isDailyLimitReached,
  };
}

// MVP v3.1: Uses shared BlockReason type from @shared/trial
// Supports: daily_limit, days_expired, total_limit

// Check if a specific audio duration can be processed
// Uses shared checkTrialStatus for consistent logic
export function canProcessAudio(appUserId: string, audioDurationMinutes: number): { 
  allowed: boolean; 
  status: TrialStatus;
  reason?: string;
  blockReason?: BlockReason;
} {
  const status = getTrialStatus(appUserId);
  const data = getTrialData(appUserId);
  
  const check = checkTrialStatusShared({
    firstUseDateStr: data?.firstUseDate || null,
    totalMinutesUsed: status.minutesUsed,
    dailyMinutesUsed: status.dailyMinutesUsed,
  });
  
  if (!check.allowed) {
    return {
      allowed: false,
      status,
      reason: check.reason,
      blockReason: check.blockReason,
    };
  }
  
  return { allowed: true, status };
}

// Record usage after successful processing (both total and daily)
// Uses capping to prevent exceeding limits
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
  
  // Update total usage with capping at MAX_AUDIO_MINUTES (315)
  const previousTotal = data.totalMinutesUsed || 0;
  data.totalMinutesUsed = capUsageAtLimit(previousTotal, audioDurationMinutes);
  
  // Update daily usage with capping at DAILY_LIMIT_MINUTES (45)
  if (!data.dailyUsage || data.dailyUsage.date !== today) {
    data.dailyUsage = { date: today, minutesUsed: 0 };
  }
  const previousDaily = data.dailyUsage.minutesUsed || 0;
  data.dailyUsage.minutesUsed = capDailyUsageAtLimit(previousDaily, audioDurationMinutes);
  
  console.log(`[recordUsage] AFTER: totalMinutesUsed=${data.totalMinutesUsed} (was ${previousTotal}, capped at ${TRIAL_CONFIG.MAX_AUDIO_MINUTES}), dailyUsage.minutesUsed=${data.dailyUsage.minutesUsed} (was ${previousDaily}, capped at ${TRIAL_CONFIG.DAILY_LIMIT_MINUTES})`);
  
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
