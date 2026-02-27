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
        // Check if user has an active paid subscription first
        const subscription = await getActiveSubscription(userId);
        const isPaid =
            subscription !== null &&
            subscription !== undefined &&
            subscription.plan_name !== "trial" &&
            subscription.status === "active";

        if (isPaid && subscription) {
            // Paid subscriber: use subscription limits
            const minutesUsed = Number(subscription.trial_minutes_used ?? 0);
            const minutesLimit = Number(subscription.trial_minutes_limit ?? 9999);
            const minutesRemaining = Math.max(0, minutesLimit - minutesUsed);
            const canProcess = minutesRemaining > 0;

            return res.json({
                isPaid: true,
                hasTrial: false,
                trialState: "PAID",
                planName: subscription.plan_name,
                minutesUsed,
                minutesLimit,
                minutesRemaining,
                dailyMinutesUsed: 0,
                dailyMinutesLimit: null, // no daily limit for paid
                dailyMinutesRemaining: null,
                daysRemaining: null,
                canProcess,
                blockReason: canProcess ? null : "SUBSCRIPTION_EXHAUSTED",
            });
        }

        // Free trial: read from usage tables
        const totalMinutesUsed = await db.getTotalUsage(userId);
        const todayUsage = await db.getTodayUsage(userId);
        const dailyMinutesUsed = Number(todayUsage?.minutes_used ?? 0);
        const firstUseDateStr = await db.getFirstUsageDate(userId);

        const totalMinutesRemaining = Math.max(
            0,
            TRIAL_LIMITS.MAX_AUDIO_MINUTES - totalMinutesUsed
        );
        const dailyMinutesRemaining = Math.max(
            0,
            TRIAL_LIMITS.DAILY_LIMIT_MINUTES - dailyMinutesUsed
        );

        const trialCheck = checkTrialStatus({
            firstUseDateStr,
            totalMinutesUsed,
            dailyMinutesUsed,
        });

        // Calculate days remaining
        let daysRemaining: number = TRIAL_LIMITS.VALIDITY_DAYS;
        if (firstUseDateStr) {
            const firstUse = new Date(firstUseDateStr);
            const daysPassed = Math.floor(
                (Date.now() - firstUse.getTime()) / (1000 * 60 * 60 * 24)
            );
            daysRemaining = Math.max(0, TRIAL_LIMITS.VALIDITY_DAYS - daysPassed);
        }

        const trialState = !trialCheck.allowed
            ? trialCheck.blockReason === "days_expired"
                ? "EXPIRED"
                : trialCheck.blockReason === "daily_limit"
                    ? "DAILY_LIMIT"
                    : "USED_UP"
            : "ACTIVE";

        return res.json({
            isPaid: false,
            hasTrial: true,
            trialState,
            planName: "trial",
            minutesUsed: totalMinutesUsed,
            minutesLimit: TRIAL_LIMITS.MAX_AUDIO_MINUTES,
            minutesRemaining: totalMinutesRemaining,
            dailyMinutesUsed,
            dailyMinutesLimit: TRIAL_LIMITS.DAILY_LIMIT_MINUTES,
            dailyMinutesRemaining,
            daysRemaining,
            canProcess: trialCheck.allowed,
            blockReason: trialCheck.allowed ? null : trialCheck.blockReason,
        });
    } catch (err) {
        console.error("[user-status] Error:", err);
        return res.status(500).json({ error: "Internal server error", canProcess: true });
    }
}
