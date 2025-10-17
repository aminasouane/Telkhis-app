import { Request, Response } from "express";
import { checkTrialStatus } from "../middleware/trialGuard";

export async function getTrialStatus(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const trialStatus = await checkTrialStatus(userId);
    
    res.json({ trialStatus });
  } catch (error) {
    console.error('Error in getTrialStatus:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}
