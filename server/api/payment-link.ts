/**
 * API Route: Get Payment Link
 * GET /api/payment-link/:planId
 * 
 * Returns the direct Chargily payment link for a specific plan
 */

import type { Request, Response } from "express";
import type { PlanId } from "../../shared/plans";

/**
 * Payment links configuration
 * These links should be set as environment variables for security
 */
const PAYMENT_LINKS: Record<PlanId, string> = {
  basic: process.env.CHARGILY_LINK_BASIC || "",
};

/**
 * Get payment link for a specific plan
 */
export async function getPaymentLink(req: Request, res: Response) {
  try {
    const { planId } = req.params;

    // Validate plan ID
    if (!planId || !["basic"].includes(planId)) {
      return res.status(400).json({
        error: "Invalid plan ID",
        message: "معرّف الخطة غير صحيح",
      });
    }

    const paymentLink = PAYMENT_LINKS[planId as PlanId];

    if (!paymentLink) {
      console.error(`⚠️  Payment link not configured for plan: ${planId}`);
      return res.status(404).json({
        error: "Payment link not found",
        message: "رابط الدفع غير متوفر حالياً. يرجى التواصل مع الدعم.",
        hint: `Set CHARGILY_LINK_${planId.toUpperCase()} in environment variables`,
      });
    }

    // Return the payment link
    return res.json({
      planId,
      paymentLink,
      success: true,
    });

  } catch (error: any) {
    console.error("[Payment Link] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "حدث خطأ في الخادم. يرجى المحاولة مرة أخرى.",
    });
  }
}

/**
 * Check payment links status (admin endpoint)
 */
export async function checkPaymentLinksStatus(_req: Request, res: Response) {
  const status = {
    basic: {
      configured: !!PAYMENT_LINKS.basic,
      link: PAYMENT_LINKS.basic ? "✓ Set" : "✗ Not set",
    },
    allConfigured: !!(PAYMENT_LINKS.basic),
  };

  return res.json(status);
}
