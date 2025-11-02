/**
 * API Route: Chargily Webhook Handler
 * POST /api/chargily/webhook
 * 
 * Handles webhook events from Chargily Pay for payment notifications
 */

import type { Request, Response } from "express";
import { verifySignature } from "@chargily/chargily-pay";
import { processWebhookEvent } from "../services/chargily";
import { supabaseAdmin } from "../supabase-admin";
import { getPlanById } from "../../shared/plans";

const CHARGILY_API_KEY = process.env.CHARGILY_API_KEY || "";

export async function handleChargilyWebhook(req: Request, res: Response) {
  try {
    // Get signature from headers
    const signature = req.get("signature") || "";
    
    if (!signature) {
      console.error("[Webhook] Missing signature header");
      return res.status(400).json({ error: "Missing signature" });
    }

    // Verify webhook signature
    const rawBody = (req as any).rawBody;
    
    if (!rawBody) {
      console.error("[Webhook] Raw body not available");
      return res.status(400).json({ error: "Invalid request body" });
    }

    try {
      if (!verifySignature(rawBody, signature, CHARGILY_API_KEY)) {
        console.error("[Webhook] Invalid signature");
        return res.status(403).json({ error: "Invalid signature" });
      }
    } catch (error) {
      console.error("[Webhook] Signature verification error:", error);
      return res.status(403).json({ error: "Signature verification failed" });
    }

    // Process the webhook event
    const event = req.body;
    console.log("[Webhook] Received event:", {
      type: event.type,
      id: event.id,
    });

    const result = await processWebhookEvent(event);

    // If payment was successful, activate subscription
    if (result.processed && result.action === "activate_subscription") {
      await activateSubscription(result.data as any);
    }

    // If payment failed, log it
    if (result.processed && result.action === "payment_failed") {
      await logFailedPayment(result.data as any);
    }

    // Respond with 200 to acknowledge receipt
    return res.status(200).json({ 
      received: true,
      processed: result.processed 
    });

  } catch (error: any) {
    console.error("[Webhook] Error processing webhook:", error);
    
    // Still return 200 to prevent Chargily from retrying
    return res.status(200).json({ 
      received: true,
      error: error.message 
    });
  }
}

/**
 * Activate subscription after successful payment
 */
async function activateSubscription(data: {
  userId: string;
  planId: string;
  checkoutId: string;
  customerId?: string;
  amount: number;
  currency: string;
}) {
  try {
    const plan = getPlanById(data.planId as any);
    
    if (!plan) {
      console.error("[Webhook] Invalid plan ID:", data.planId);
      return;
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

    // 1. Create or update subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .upsert({
        user_id: data.userId,
        plan_name: plan.nameAr,
        status: "active",
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        payment_provider: "chargily",
        chargily_customer_id: data.customerId,
        chargily_checkout_id: data.checkoutId,
      }, {
        onConflict: "user_id",
      })
      .select()
      .single();

    if (subError) {
      console.error("[Webhook] Error creating subscription:", subError);
      throw subError;
    }

    console.log("[Webhook] Subscription activated:", {
      user_id: data.userId,
      plan: plan.nameAr,
      subscription_id: subscription.id,
    });

    // 2. Record payment
    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: data.userId,
        subscription_id: subscription.id,
        amount: data.amount / 100, // Convert from smallest unit
        currency: data.currency.toUpperCase(),
        status: "paid",
        chargily_checkout_id: data.checkoutId,
        chargily_customer_id: data.customerId,
        plan_name: plan.nameAr,
        paid_at: new Date().toISOString(),
        metadata: {
          plan_id: data.planId,
          lectures: plan.lectures,
          total_minutes: plan.totalMinutes,
        },
      });

    if (paymentError) {
      console.error("[Webhook] Error recording payment:", paymentError);
    }

    // 3. Update user subscription_type
    const { error: userError } = await supabaseAdmin
      .from("users")
      .update({
        subscription_type: data.planId === "professional" ? "pro_plus" : "premium",
      })
      .eq("id", data.userId);

    if (userError) {
      console.error("[Webhook] Error updating user:", userError);
    }

    console.log("[Webhook] ✅ Subscription fully activated for user:", data.userId);

  } catch (error) {
    console.error("[Webhook] Failed to activate subscription:", error);
    throw error;
  }
}

/**
 * Log failed payment attempt
 */
async function logFailedPayment(data: {
  userId?: string;
  planId?: string;
  checkoutId: string;
  reason: string;
}) {
  try {
    if (!data.userId) {
      console.log("[Webhook] No user ID for failed payment");
      return;
    }

    const { error } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: data.userId,
        amount: 0,
        currency: "DZD",
        status: "failed",
        chargily_checkout_id: data.checkoutId,
        plan_name: data.planId,
        metadata: {
          failure_reason: data.reason,
          plan_id: data.planId,
        },
      });

    if (error) {
      console.error("[Webhook] Error logging failed payment:", error);
    }

    console.log("[Webhook] Failed payment logged:", {
      user_id: data.userId,
      reason: data.reason,
    });

  } catch (error) {
    console.error("[Webhook] Failed to log failed payment:", error);
  }
}
