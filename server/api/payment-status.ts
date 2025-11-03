/**
 * API Route: Get Latest Payment
 * GET /api/payment/latest
 * 
 * Returns the latest successful payment for the authenticated user
 */

import type { Request, Response } from "express";
import { supabaseAdmin } from "../supabase-admin";
import { getPlanById } from "../../shared/plans";

export async function getLatestPayment(req: Request, res: Response) {
  try {
    // Get authenticated user ID from middleware
    const userId = req.authenticatedUserId || req.query.userId as string;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
      });
    }

    // Fetch latest successful payment
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("[API] Error fetching latest payment:", error);
      return res.status(500).json({
        error: "Failed to fetch payment information",
      });
    }

    // If no payment found, return null
    if (!payment) {
      return res.status(200).json({
        payment: null,
      });
    }

    // Enrich payment data with plan details
    const planId = payment.metadata?.plan_id;
    const plan = planId ? getPlanById(planId) : null;

    return res.status(200).json({
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        planName: payment.plan_name,
        paidAt: payment.paid_at,
        // Add plan details if available
        plan: plan ? {
          id: plan.id,
          nameAr: plan.nameAr,
          price: plan.price,
          priceDZD: plan.priceDZD,
          lectures: plan.lectures,
          totalMinutes: plan.totalMinutes,
        } : null,
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
