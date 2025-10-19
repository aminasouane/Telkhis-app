import { Request, Response } from "express";
import { checkTrialStatus } from "../middleware/trialGuard";

export async function getTrialStatus(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const trialStatus = await checkTrialStatus(userId);
    
    // Add explicit flags for frontend convenience
    const isTrialActive = !trialStatus.isExpired && trialStatus.daysRemaining > 0;
    const hasActiveSubscription = false; // Will be true when user has paid subscription
    
    res.json({ 
      trialStatus,
      isTrialActive,
      hasActiveSubscription
    });
  } catch (error) {
    console.error('Error in getTrialStatus:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}
