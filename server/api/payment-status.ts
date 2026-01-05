import type { Request, Response } from "express";
import * as db from "../db";
import { getPlanById } from "../../shared/plans";

export async function getLatestPayment(req: Request, res: Response) {
  try {
    const userId = req.authenticatedUserId || req.query.userId as string;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
      });
    }

    const subscription = db.getActiveSubscription(userId);

    if (!subscription) {
      return res.status(200).json({
        payment: null,
      });
    }

    return res.status(200).json({
      payment: {
        id: subscription.id,
        planName: subscription.plan_name,
        status: subscription.status,
        startDate: subscription.start_date,
        endDate: subscription.end_date,
      },
    });

  } catch (error: any) {
    console.error("[API] Error in getLatestPayment:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message || "An unexpected error occurred",
    });
  }
}
