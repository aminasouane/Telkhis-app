import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../supabase-admin";

export interface TrialInfo {
  userId: string;
  isExpired: boolean;
  summariesUsed: number;
  summariesLimit: number;
  daysRemaining: number;
  expiryDate: string | null;
}

export async function checkTrialStatus(userId: string): Promise<TrialInfo> {
  // Get user's active subscription with trial info
  const { data: subscription, error } = await supabaseAdmin
    .from('subscriptions')
    .select('trial_end_date, trial_summaries_used, trial_summaries_limit')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !subscription) {
    return {
      userId,
      isExpired: true,
      summariesUsed: 0,
      summariesLimit: 10,
      daysRemaining: 0,
      expiryDate: null
    };
  }

  const trialEndDate = subscription.trial_end_date ? new Date(subscription.trial_end_date) : null;
  const now = new Date();
  
  // Calculate days remaining
  const daysRemaining = trialEndDate 
    ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Check if trial is expired
  const isExpiredByDate = trialEndDate ? trialEndDate < now : false;
  const isExpiredByUsage = subscription.trial_summaries_used >= subscription.trial_summaries_limit;
  const isExpired = isExpiredByDate || isExpiredByUsage;

  return {
    userId,
    isExpired,
    summariesUsed: subscription.trial_summaries_used || 0,
    summariesLimit: subscription.trial_summaries_limit || 10,
    daysRemaining,
    expiryDate: trialEndDate?.toISOString() || null
  };
}

export async function incrementTrialUsage(userId: string): Promise<void> {
  const { data: currentSub } = await supabaseAdmin
    .from('subscriptions')
    .select('trial_summaries_used')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (currentSub) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ 
        trial_summaries_used: (currentSub.trial_summaries_used || 0) + 1
      })
      .eq('user_id', userId)
      .eq('status', 'active');
  }
}

// Middleware to guard endpoints that consume trial quota
export async function trialGuardMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.body.userId || req.query.userId;
    
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

    // Attach trial info to request for use in route handlers
    (req as any).trialInfo = trialStatus;
    next();
  } catch (error) {
    console.error("Trial guard error:", error);
    res.status(500).json({ error: "Failed to verify trial status" });
  }
}
