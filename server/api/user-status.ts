import type { Request, Response } from "express";
import * as db from "../db";
import { TRIAL_LIMITS, checkTrialStatus } from "../../shared/trial";
import { getActiveSubscription } from "../db";

/**
 * GET /api/user/status
 * Returns full trial/subscription status from Supabase (no localStorage).
 * Requires authenticated user via JWT middleware, or userId query param.
 */
export async function handleGetUserStatus(req: Request, res: Response) {
    const userId = req.authenticatedUserId || req.query.userId as string;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized", canProcess: false });
    }

    try {
        // 1. Check if user is an admin
        const role = await db.getUserRole(userId);
        if (role === "admin") {
            return res.json({
                isPaid: true,
                hasTrial: false,
                trialState: "PAID",
                planName: "admin",
                minutesUsed: 0,
                minutesLimit: 999999,
                minutesRemaining: 999999,
                dailyMinutesUsed: 0,
                dailyMinutesLimit: null,
                dailyMinutesRemaining: null,
                daysRemaining: null,
                canProcess: true,
                blockReason: null,
            });
        }

        // 2. Fetch system settings for dynamic limits
        const sysSettings = await db.getSystemSettings();
        const dynamicTrialLimits = sysSettings['TRIAL_LIMITS'] || TRIAL_LIMITS;

        // 3. Check if user has an active paid subscription first
        const subscription = await getActiveSubscription(userId);
        const isPaid =
            subscription !== null &&
            subscription !== undefined &&
            subscription.plan_name !== "trial" &&
            subscription.status === "active";

        if (isPaid && subscription) {
            // Paid subscriber: enforce 45 min/day daily limit + total subscription minutes
            const paidLimits = sysSettings['PAID_LIMITS'] as any;
            const paidDailyLimit: number = paidLimits?.DAILY_LIMIT_MINUTES ?? 45;

            const minutesUsed = Number(subscription.trial_minutes_used ?? 0);
            const minutesLimit = Number(subscription.trial_minutes_limit ?? 1350);
            const minutesRemaining = Math.max(0, minutesLimit - minutesUsed);

            const paidTodayUsage = await db.getTodayUsage(userId);
            const dailyMinutesUsed = Number(paidTodayUsage?.minutes_used ?? 0);
            const dailyMinutesRemaining = Math.max(0, paidDailyLimit - dailyMinutesUsed);
            const isDailyLimitReached = dailyMinutesUsed >= paidDailyLimit;

            const canProcess = minutesRemaining > 0 && !isDailyLimitReached;
            let blockReason: string | null = null;
            if (!canProcess) {
                blockReason = isDailyLimitReached ? "daily_limit" : "SUBSCRIPTION_EXHAUSTED";
            }

            return res.json({
                isPaid: true,
                hasTrial: false,
                trialState: isDailyLimitReached ? "DAILY_LIMIT" : "PAID",
                planName: subscription.plan_name,
                minutesUsed,
                minutesLimit,
                minutesRemaining,
                dailyMinutesUsed,
                dailyMinutesLimit: paidDailyLimit,
                dailyMinutesRemaining,
                daysRemaining: null,
                canProcess,
                blockReason,
            });
        }

        // Free trial: read from usage tables
        const totalMinutesUsed = await db.getTotalUsage(userId);
        const todayUsage = await db.getTodayUsage(userId);
        const dailyMinutesUsed = Number(todayUsage?.minutes_used ?? 0);
        const firstUseDateStr = await db.getFirstUsageDate(userId);

        const totalMinutesRemaining = Math.max(
            0,
            dynamicTrialLimits.MAX_AUDIO_MINUTES - totalMinutesUsed
        );
        const dailyMinutesRemaining = Math.max(
            0,
            dynamicTrialLimits.DAILY_LIMIT_MINUTES - dailyMinutesUsed
        );

        // We replicate checkTrialStatus logic here with dynamic limits
        let isExpired = false;
        let daysPassed = 0;
        if (firstUseDateStr) {
            const firstUse = new Date(firstUseDateStr);
            daysPassed = Math.floor((Date.now() - firstUse.getTime()) / (1000 * 60 * 60 * 24));
            isExpired = daysPassed >= dynamicTrialLimits.VALIDITY_DAYS;
        }

        const isDailyLimitReached = dailyMinutesUsed >= dynamicTrialLimits.DAILY_LIMIT_MINUTES;
        const isTotalLimitReached = totalMinutesUsed >= dynamicTrialLimits.MAX_AUDIO_MINUTES;

        let blockReason = null;
        if (isExpired) blockReason = 'days_expired';
        else if (isDailyLimitReached) blockReason = 'daily_limit';
        else if (isTotalLimitReached) blockReason = 'total_limit';

        const canProcess = blockReason === null;

        // Calculate days remaining
        const daysRemaining = Math.max(0, dynamicTrialLimits.VALIDITY_DAYS - daysPassed);

        let trialState: "ACTIVE" | "EXPIRED" | "DAILY_LIMIT" | "USED_UP";
        if (blockReason === null) {
            trialState = "ACTIVE";
        } else if (blockReason === "days_expired") {
            trialState = "EXPIRED";
        } else if (blockReason === "daily_limit") {
            trialState = "DAILY_LIMIT";
        } else if (blockReason === "total_limit") {
            trialState = "USED_UP";
        } else {
            trialState = "ACTIVE"; // Fallback, though blockReason should cover all cases
        }

        return res.json({
            isPaid: false,
            hasTrial: true,
            trialState,
            planName: "trial",
            minutesUsed: totalMinutesUsed,
            minutesLimit: dynamicTrialLimits.MAX_AUDIO_MINUTES,
            // When days expire, all remaining minutes become 0
            minutesRemaining: isExpired ? 0 : totalMinutesRemaining,
            dailyMinutesUsed: dailyMinutesUsed,
            dailyMinutesLimit: dynamicTrialLimits.DAILY_LIMIT_MINUTES,
            dailyMinutesRemaining: isExpired ? 0 : dailyMinutesRemaining,
            daysRemaining,
            canProcess,
            blockReason,
        });
    } catch (err) {
        console.error("[user-status] Error:", err);
        return res.status(500).json({ error: "Internal server error", canProcess: true });
    }
}
