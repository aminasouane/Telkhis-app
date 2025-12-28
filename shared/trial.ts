export const TRIAL_LIMITS = {
  MAX_AUDIO_MINUTES: 210,
  DAILY_LIMIT_MINUTES: 30,
  VALIDITY_DAYS: 7,
  MAX_FILE_DURATION_SECONDS: 300,
} as const;

export type TrialLimits = typeof TRIAL_LIMITS;

export type BlockReason = 'daily_limit' | 'days_expired' | 'total_limit' | null;

export interface TrialCheckResult {
  allowed: boolean;
  blockReason: BlockReason;
  reason?: string;
  errorCode?: string;
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function calculateDaysPassed(firstUseDateStr: string): number {
  const now = new Date();
  const firstUse = new Date(firstUseDateStr);
  return Math.floor((now.getTime() - firstUse.getTime()) / (1000 * 60 * 60 * 24));
}

export function isTrialExpired(firstUseDateStr: string | null): boolean {
  if (!firstUseDateStr) return false;
  const daysPassed = calculateDaysPassed(firstUseDateStr);
  return daysPassed >= TRIAL_LIMITS.VALIDITY_DAYS;
}

export function hasDailyAllowance(dailyMinutesUsed: number): boolean {
  return dailyMinutesUsed < TRIAL_LIMITS.DAILY_LIMIT_MINUTES;
}

export function hasTotalAllowance(totalMinutesUsed: number): boolean {
  return totalMinutesUsed < TRIAL_LIMITS.MAX_AUDIO_MINUTES;
}

export function getDailyMinutesRemaining(dailyMinutesUsed: number): number {
  return Math.max(0, TRIAL_LIMITS.DAILY_LIMIT_MINUTES - dailyMinutesUsed);
}

export function getTotalMinutesRemaining(totalMinutesUsed: number): number {
  return Math.max(0, TRIAL_LIMITS.MAX_AUDIO_MINUTES - totalMinutesUsed);
}

export function capUsageAtLimit(currentTotal: number, increment: number): number {
  const newTotal = currentTotal + increment;
  return Math.min(newTotal, TRIAL_LIMITS.MAX_AUDIO_MINUTES);
}

export function capDailyUsageAtLimit(currentDaily: number, increment: number): number {
  const newDaily = currentDaily + increment;
  return Math.min(newDaily, TRIAL_LIMITS.DAILY_LIMIT_MINUTES);
}

export function checkTrialStatus(params: {
  firstUseDateStr: string | null;
  totalMinutesUsed: number;
  dailyMinutesUsed: number;
}): TrialCheckResult {
  const { firstUseDateStr, totalMinutesUsed, dailyMinutesUsed } = params;

  if (firstUseDateStr && isTrialExpired(firstUseDateStr)) {
    return {
      allowed: false,
      blockReason: 'days_expired',
      reason: `انتهت صلاحية التجربة المجانية بعد ${TRIAL_LIMITS.VALIDITY_DAYS} أيام`,
      errorCode: 'TRIAL_DAYS_EXPIRED',
    };
  }

  if (!hasDailyAllowance(dailyMinutesUsed)) {
    return {
      allowed: false,
      blockReason: 'daily_limit',
      reason: `لقد استهلكت ${TRIAL_LIMITS.DAILY_LIMIT_MINUTES} دقيقة اليوم. يمكنك المتابعة غداً.`,
      errorCode: 'TRIAL_DAILY_LIMIT_REACHED',
    };
  }

  if (!hasTotalAllowance(totalMinutesUsed)) {
    return {
      allowed: false,
      blockReason: 'total_limit',
      reason: `لقد استهلكت الحد الأقصى من التجربة المجانية (${TRIAL_LIMITS.MAX_AUDIO_MINUTES} دقيقة).`,
      errorCode: 'TRIAL_TOTAL_LIMIT_REACHED',
    };
  }

  return {
    allowed: true,
    blockReason: null,
  };
}

export const TRIAL_MESSAGES = {
  DAILY_LIMIT: (used: number) => 
    `لقد استهلكت الحد المجاني اليوم (${used.toFixed(0)} من ${TRIAL_LIMITS.DAILY_LIMIT_MINUTES} دقيقة). يمكنك المحاولة غداً.`,
  DAYS_EXPIRED: () => 
    `انتهت الفترة التجريبية بعد ${TRIAL_LIMITS.VALIDITY_DAYS} أيام.`,
  TOTAL_LIMIT: (used: number) => 
    `انتهت التجربة المجانية (${used.toFixed(0)} من ${TRIAL_LIMITS.MAX_AUDIO_MINUTES} دقيقة إجمالية).`,
} as const;
