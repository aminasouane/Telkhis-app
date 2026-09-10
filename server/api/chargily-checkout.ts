/**
 * API Route: Create Chargily Checkout
 * POST /api/chargily/create-checkout
 * 
 * Creates a payment checkout session for subscription purchase
 * REQUIRES AUTHENTICATION
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { createCheckout, isChargilyConfigured } from "../services/chargily";
import { validateCoupon, recordCouponUsage } from "../services/coupons";
import { getPlanById } from "../../shared/plans";
import * as db from "../db";

// Schema for checkout creation (without userId - will be extracted from auth)
const createCheckoutSchema = z.object({
  planId: z.enum(["basic"]),
  locale: z.enum(["ar", "en", "fr"]).default("ar"),
  couponCode: z.string().optional(),
});

export async function handleCreateCheckout(req: Request, res: Response) {
  try {
    // Security: Extract user ID from authenticated session
    // This is set by requireAuth middleware
    const authenticatedUserId = req.authenticatedUserId;
    const authenticatedUser = req.authenticatedUser;

    if (!authenticatedUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to create a checkout",
      });
    }

    // Validate request body (no userId allowed from client)
    const validation = createCheckoutSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validation.error.errors,
      });
    }

    const { planId, locale, couponCode } = validation.data;
    const plan = getPlanById(planId);
    if (!plan) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    let finalAmount = plan.priceDZD;
    let couponMetadata: Record<string, string> = {};
    let validatedCouponInfo: any = null;

    // If a coupon code was submitted, validate it
    if (couponCode && couponCode.trim()) {
      const couponVal = await validateCoupon(couponCode, authenticatedUserId, planId);
      if (!couponVal.valid) {
        return res.status(400).json({
          error: "Invalid coupon",
          message: couponVal.message || "كود الخصم غير صالح",
        });
      }

      finalAmount = couponVal.finalPrice ?? plan.priceDZD;
      validatedCouponInfo = couponVal;
      couponMetadata = {
        coupon_id: couponVal.coupon!.id,
        coupon_code: couponVal.coupon!.code,
        discount_percent: couponVal.discountPercent!.toString(),
        original_amount: plan.priceDZD.toString(),
        discount_amount: couponVal.discountAmount!.toString(),
        final_amount: finalAmount.toString(),
        usage_type: couponVal.isRenewal ? "renewal" : "registration",
      };
    }

    // ── CASE 1: 100% Free Discount (Amount = 0 DZD) ──────────────────────────
    // Chargily cannot process 0 DZD payments, so we activate the subscription immediately!
    if (finalAmount === 0 && validatedCouponInfo) {
      console.log(`[API] 100% Free Coupon applied for user ${authenticatedUserId}. Activating directly...`);
      
      await db.getOrCreateUser(authenticatedUserId);
      const subscription = await db.createSubscription({
        userId: authenticatedUserId,
        planName: plan.nameAr,
        planId: plan.id,
        totalMinutes: plan.totalMinutes,
        paymentProvider: "coupon_free",
      });

      // Record coupon usage
      await recordCouponUsage({
        couponId: validatedCouponInfo.coupon.id,
        couponCode: validatedCouponInfo.coupon.code,
        userId: authenticatedUserId,
        userEmail: authenticatedUser.email,
        planId: plan.id,
        originalPrice: plan.priceDZD,
        discountPercent: validatedCouponInfo.discountPercent,
        discountAmount: plan.priceDZD,
        finalPrice: 0,
        usageType: validatedCouponInfo.isRenewal ? "renewal" : "registration",
      });

      return res.status(200).json({
        success: true,
        isFree: true,
        subscriptionId: subscription.id,
        redirectUrl: "/success",
        message: "تم تفعيل الاشتراك بنجاح عبر كود الخصم المجاني!",
      });
    }

    // ── CASE 2: Chargily Paid Checkout (Amount > 0 DZD) ───────────────────────
    if (!isChargilyConfigured()) {
      return res.status(500).json({
        error: "Payment system is not configured. Please contact support.",
      });
    }

    // Create checkout session using authenticated user ID
    const checkoutData = {
      planId,
      userId: authenticatedUserId, // Use server-verified user ID
      userEmail: authenticatedUser.email,
      userName: authenticatedUser.user_metadata?.name,
      locale,
    };

    const checkout = await createCheckout(checkoutData, finalAmount, couponMetadata);

    console.log("[API] Checkout created for authenticated user:", {
      userId: authenticatedUserId,
      planId,
      finalAmount,
      couponCode: couponCode || "none",
      checkoutId: checkout.id,
    });

    // Return checkout URL for redirect
    return res.status(200).json({
      success: true,
      checkoutId: checkout.id,
      checkoutUrl: checkout.checkout_url,
      amount: checkout.amount,
      currency: checkout.currency,
      discountAmount: plan.priceDZD - finalAmount,
      finalAmount,
    });

  } catch (error: any) {
    console.error("[API] Error creating Chargily checkout:", error);

    return res.status(500).json({
      error: "Failed to create payment session",
      message: error.message || "An unexpected error occurred",
    });
  }
}
