import type { Request, Response } from "express";
import { verifySignature } from "@chargily/chargily-pay";
import { processWebhookEvent } from "../services/chargily";
import * as db from "../db";
import { getPlanById, getAllPlans } from "../../shared/plans";

const CHARGILY_API_KEY = process.env.CHARGILY_API_KEY || "";

export async function handleChargilyWebhook(req: Request, res: Response) {
  try {
    const signature = req.get("signature") || "";

    if (!signature) {
      console.error("[Webhook] Missing signature header");
      return res.status(400).json({ error: "Missing signature" });
    }

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

    const event = req.body;
    console.log("[Webhook] Received event:", {
      type: event.type,
      id: event.id,
    });

    const result = await processWebhookEvent(event);

    if (result.processed && result.action === "activate_subscription") {
      await activateSubscription(result.data as any);
    }

    if (result.processed && result.action === "payment_failed") {
      console.log("[Webhook] Payment failed:", result.data);
    }

    return res.status(200).json({
      received: true,
      processed: result.processed
    });

  } catch (error: any) {
    console.error("[Webhook] Error processing webhook:", error);
    return res.status(200).json({
      received: true,
      error: error.message
    });
  }
}

/**
 * Detect plan from amount paid (for static Chargily payment links that don't carry plan_id)
 */
function detectPlanFromAmount(amountDZD: number): string | null {
  // Amount comes in smallest currency unit from Chargily (fils), so 1200 DZD = 120000 fils
  // But sometimes it comes as DZD directly. Try both.
  const allPlans = getAllPlans();

  // Try exact match first (direct DZD)
  let match = allPlans.find(p => p.priceDZD === amountDZD);

  // Try dividing by 100 (fils → DZD)  
  if (!match) {
    match = allPlans.find(p => p.priceDZD === Math.round(amountDZD / 100));
  }

  // Try matching known prices: 1200 DZD = Basic, 4700 DZD = Student
  if (!match) {
    if (amountDZD === 1200 || amountDZD === 120000) return "basic";
    if (amountDZD === 4700 || amountDZD === 470000) return "student";
  }

  return match?.id || null;
}

async function activateSubscription(data: {
  userId: string;
  planId: string;
  checkoutId: string;
  customerId?: string;
  amount: number;
  currency: string;
  transactionId?: string;
  paymentMethod?: string;
}) {
  try {
    // Try plan from metadata first, then detect from amount
    let planId = data.planId;
    if (!planId || !getPlanById(planId as any)) {
      const detected = detectPlanFromAmount(data.amount);
      if (detected) {
        planId = detected;
        console.log(`[Webhook] Detected plan '${planId}' from amount ${data.amount}`);
      }
    }

    const plan = getPlanById(planId as any);

    if (!plan) {
      console.error("[Webhook] Could not determine plan for amount:", data.amount);
      return;
    }

    if (!data.userId) {
      console.error("[Webhook] Missing user ID in metadata");
      throw new Error("Missing user ID");
    }

    await db.getOrCreateUser(data.userId);

    const subscription = await db.createSubscription({
      userId: data.userId,
      planName: plan.nameAr,
      planId: plan.id,
      totalMinutes: plan.totalMinutes, // ✅ Basic=225 min, Student=1350 min
      paymentProvider: "chargily",
    });

    console.log(`[Webhook] ✅ Subscription activated: user=${data.userId} plan=${plan.id} minutes=${plan.totalMinutes}`);
    console.log(`[Webhook] Subscription ID: ${subscription.id}`);

  } catch (error) {
    console.error("[Webhook] Failed to activate subscription:", error);
    throw error;
  }
}
