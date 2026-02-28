import * as db from "../db";
import {
  TRIAL_LIMITS,
  checkTrialStatus,
} from "../../shared/trial";

export interface TrialValidationResult {
  allowed: boolean;
  reason?: string;
  errorCode?: string;
  totalMinutesUsed: number;
  dailyMinutesUsed: number;
  minutesRemaining: number;
  dailyMinutesRemaining: number;
}

export async function validateTrialUsage(
  userId: string,
  audioDurationSeconds: number
): Promise<TrialValidationResult> {
  const audioDurationMinutes = audioDurationSeconds / 60;

  console.log(`[trialValidation] Checking user ${userId} for ${audioDurationMinutes.toFixed(2)} minutes`);

  try {
    // ── Admin bypass: full access, no limits ──
    const role = await db.getUserRole(userId);
    if (role === "admin") {
      console.log(`[trialValidation] ADMIN user ${userId} — bypassing all limits`);
      return {
        allowed: true,
        totalMinutesUsed: 0,
        dailyMinutesUsed: 0,
        minutesRemaining: 999999,
        dailyMinutesRemaining: 999999,
      };
    }

    // ── Check for active paid subscription (no daily limits) ──
    const subscription = await db.getActiveSubscription(userId);
    const isPaid =
      subscription !== null &&
      subscription !== undefined &&
      subscription.plan_name !== "trial" &&
      subscription.status === "active";

    if (isPaid) {
      console.log(`[trialValidation] PAID user ${userId} — no daily limit`);
      return {
        allowed: true,
        totalMinutesUsed: 0,
        dailyMinutesUsed: 0,
        minutesRemaining: 999999,
        dailyMinutesRemaining: 999999,
      };
    }

    // ── Free trial: read DYNAMIC limits from DB (admin can change these) ──
    const sysSettings = await db.getSystemSettings();
    const dynamicLimits = sysSettings['TRIAL_LIMITS'] || TRIAL_LIMITS;

    const totalMinutesUsed = await db.getTotalUsage(userId);
    const todayUsage = await db.getTodayUsage(userId);
    const dailyMinutesUsed = todayUsage?.minutes_used || 0;
    const firstUseDateStr = await db.getFirstUsageDate(userId);

    console.log(`[trialValidation] Usage - Total: ${totalMinutesUsed.toFixed(2)} min, Today: ${dailyMinutesUsed.toFixed(2)} min, FirstUse: ${firstUseDateStr || 'new user'}`);
    console.log(`[trialValidation] Limits from DB: MAX=${dynamicLimits.MAX_AUDIO_MINUTES} min, DAILY=${dynamicLimits.DAILY_LIMIT_MINUTES} min, DAYS=${dynamicLimits.VALIDITY_DAYS}`);

    const totalMinutesRemaining = Math.max(0, dynamicLimits.MAX_AUDIO_MINUTES - totalMinutesUsed);
    const dailyMinutesRemaining = Math.max(0, dynamicLimits.DAILY_LIMIT_MINUTES - dailyMinutesUsed);

    // Check trial status with dynamic limits
    const isDailyLimitReached = dailyMinutesUsed >= dynamicLimits.DAILY_LIMIT_MINUTES;
    const isTotalLimitReached = totalMinutesUsed >= dynamicLimits.MAX_AUDIO_MINUTES;

    let isExpired = false;
    if (firstUseDateStr) {
      const firstUse = new Date(firstUseDateStr);
      const daysPassed = Math.floor((Date.now() - firstUse.getTime()) / (1000 * 60 * 60 * 24));
      isExpired = daysPassed >= dynamicLimits.VALIDITY_DAYS;
    }

    if (isExpired) {
      return {
        allowed: false,
        reason: "Trial period expired",
        errorCode: "TRIAL_DAYS_EXPIRED",
        totalMinutesUsed,
        dailyMinutesUsed,
        minutesRemaining: 0,
        dailyMinutesRemaining: 0,
      };
    }

    if (isDailyLimitReached) {
      return {
        allowed: false,
        reason: "Daily limit reached",
        errorCode: "DAILY_LIMIT_REACHED",
        totalMinutesUsed,
        dailyMinutesUsed,
        minutesRemaining: totalMinutesRemaining,
        dailyMinutesRemaining: 0,
      };
    }

    if (isTotalLimitReached) {
      return {
        allowed: false,
        reason: "Total trial minutes exhausted",
        errorCode: "TRIAL_MINUTES_EXHAUSTED",
        totalMinutesUsed,
        dailyMinutesUsed,
        minutesRemaining: 0,
        dailyMinutesRemaining,
      };
    }

    return {
      allowed: true,
      totalMinutesUsed,
      dailyMinutesUsed,
      minutesRemaining: totalMinutesRemaining,
      dailyMinutesRemaining,
    };

  } catch (err) {
    console.error('[trialValidation] Unexpected error:', err);
    return {
      allowed: true,
      totalMinutesUsed: 0,
      dailyMinutesUsed: 0,
      minutesRemaining: TRIAL_LIMITS.MAX_AUDIO_MINUTES,
      dailyMinutesRemaining: TRIAL_LIMITS.DAILY_LIMIT_MINUTES,
    };
  }
}
