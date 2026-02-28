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

    // ── Check for active paid subscription ──
    const subscription = await db.getActiveSubscription(userId);
    const isPaid =
      subscription !== null &&
      subscription !== undefined &&
      subscription.plan_name !== "trial" &&
      subscription.status === "active";

    if (isPaid) {
      console.log(`[trialValidation] PAID user ${userId} — unlimited daily usage`);
      return {
        allowed: true,
        totalMinutesUsed: 0,
        dailyMinutesUsed: 0,
        minutesRemaining: 999999,
        dailyMinutesRemaining: 999999,
      };
    }

    // ── Free trial validation ──
    const totalMinutesUsed = await db.getTotalUsage(userId);
    const todayUsage = await db.getTodayUsage(userId);
    const dailyMinutesUsed = todayUsage?.minutes_used || 0;
    const firstUseDateStr = await db.getFirstUsageDate(userId);

    console.log(`[trialValidation] Usage - Total: ${totalMinutesUsed.toFixed(2)} min, Today: ${dailyMinutesUsed.toFixed(2)} min, FirstUse: ${firstUseDateStr || 'new user'}`);

    const totalMinutesRemaining = Math.max(0, TRIAL_LIMITS.MAX_AUDIO_MINUTES - totalMinutesUsed);
    const dailyMinutesRemaining = Math.max(0, TRIAL_LIMITS.DAILY_LIMIT_MINUTES - dailyMinutesUsed);

    const trialCheck = checkTrialStatus({
      firstUseDateStr,
      totalMinutesUsed,
      dailyMinutesUsed,
    });

    if (!trialCheck.allowed) {
      console.log(`[trialValidation] BLOCKED: ${trialCheck.errorCode} - ${trialCheck.reason}`);
      return {
        allowed: false,
        reason: trialCheck.reason,
        errorCode: trialCheck.errorCode,
        totalMinutesUsed,
        dailyMinutesUsed,
        minutesRemaining: trialCheck.blockReason === 'daily_limit' ? totalMinutesRemaining : 0,
        dailyMinutesRemaining: 0,
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
