import { Request, Response, NextFunction } from "express";
import * as db from "../db";
import { TRIAL_LIMITS } from "../../shared/trial";

export interface TrialInfo {
  userId: string;
  isExpired: boolean;
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  dailyMinutesUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  firstUseDate: string | null;
  daysUsed: number;
  canUseService: boolean;
}

export async function checkTrialStatus(userId: string): Promise<TrialInfo> {
  // 1. Admin Check: Bypass limits entirely
  const role = await db.getUserRole(userId);
  if (role === "admin") {
    return {
      userId,
      isExpired: false,
      minutesUsed: 0,
      minutesLimit: 999999,
      minutesRemaining: 999999,
      dailyMinutesUsed: 0,
      dailyLimit: 999999,
      dailyRemaining: 999999,
      firstUseDate: null,
      daysUsed: 0,
      canUseService: true
    };
  }

  // 2. Dynamic Settings
  const sysSettings = await db.getSystemSettings();
  const dynamicTrialLimits = sysSettings['TRIAL_LIMITS'] || TRIAL_LIMITS;

  const totalMinutesUsed = await db.getTotalUsage(userId);
  const todayUsage = await db.getTodayUsage(userId);
  const dailyMinutesUsed = todayUsage?.minutes_used || 0;
  const firstUseDate = await db.getFirstUsageDate(userId);

  let daysUsed = 0;
  if (firstUseDate) {
    const firstDate = new Date(firstUseDate);
    const now = new Date();
    daysUsed = Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const minutesLimit = dynamicTrialLimits.MAX_AUDIO_MINUTES;
  const dailyLimit = dynamicTrialLimits.DAILY_LIMIT_MINUTES;

  const minutesRemaining = Math.max(0, minutesLimit - totalMinutesUsed);
  const dailyRemaining = Math.max(0, dailyLimit - dailyMinutesUsed);

  const totalLimitReached = totalMinutesUsed >= minutesLimit;
  const dailyLimitReached = dailyMinutesUsed >= dailyLimit;
  const daysExpired = daysUsed >= dynamicTrialLimits.VALIDITY_DAYS;

  const isExpired = totalLimitReached || daysExpired;
  const canUseService = !isExpired && !dailyLimitReached;

  return {
    userId,
    isExpired,
    minutesUsed: totalMinutesUsed,
    minutesLimit,
    minutesRemaining,
    dailyMinutesUsed,
    dailyLimit,
    dailyRemaining,
    firstUseDate,
    daysUsed,
    canUseService
  };
}

export async function incrementTrialMinutes(userId: string, minutesToAdd: number): Promise<void> {
  await db.recordUsage(userId, minutesToAdd);
}

export async function trialGuardMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.authenticatedUserId || req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(401).json({ error: "User ID required" });
    }

    const trialStatus = await checkTrialStatus(userId as string);

    if (trialStatus.isExpired) {
      return res.status(403).json({
        error: "Trial expired",
        trialStatus
      });
    }

    (req as any).trialInfo = trialStatus;
    next();
  } catch (error) {
    console.error("Trial guard error:", error);
    res.status(500).json({ error: "Failed to verify trial status" });
  }
}
