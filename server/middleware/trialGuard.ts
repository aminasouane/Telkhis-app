import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../supabase-admin";

export interface TrialInfo {
  userId: string;
  isExpired: boolean;
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  canUseService: boolean;
}

export async function checkTrialStatus(userId: string): Promise<TrialInfo> {
  // Get user's active subscription with trial info
  const { data: subscription, error } = await supabaseAdmin
    .from('subscriptions')
    .select('trial_minutes_used, trial_minutes_limit')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !subscription) {
    // If no subscription found, user might be newly created
    // Return trial active with default values (30 minutes limit)
    // The subscription should be created by /api/user/upsert or /api/guest-session
    return {
      userId,
      isExpired: false, // Allow new users to use the service
      minutesUsed: 0,
      minutesLimit: 30.0,
      minutesRemaining: 30.0,
      canUseService: true
    };
  }

  const minutesUsed = subscription.trial_minutes_used || 0;
  const minutesLimit = subscription.trial_minutes_limit || 30.0;
  const minutesRemaining = Math.max(0, minutesLimit - minutesUsed);

  // Trial is expired if user has used >= 30 minutes
  const isExpired = minutesUsed >= minutesLimit;

  return {
    userId,
    isExpired,
    minutesUsed,
    minutesLimit,
    minutesRemaining,
    canUseService: !isExpired
  };
}

export async function incrementTrialMinutes(userId: string, minutesToAdd: number): Promise<void> {
  const { data: currentSub } = await supabaseAdmin
    .from('subscriptions')
    .select('trial_minutes_used')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (currentSub) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ 
        trial_minutes_used: (currentSub.trial_minutes_used || 0) + minutesToAdd,
        updated_at: new Date().toISOString()
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
