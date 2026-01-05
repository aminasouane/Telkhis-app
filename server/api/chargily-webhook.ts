import type { Request, Response } from "express";
import { verifySignature } from "@chargily/chargily-pay";
import { processWebhookEvent } from "../services/chargily";
import * as db from "../db";
import { getPlanById } from "../../shared/plans";

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
    const plan = getPlanById(data.planId as any);
    
    if (!plan) {
      console.error("[Webhook] Invalid plan ID:", data.planId);
      return;
    }

    if (!data.userId) {
      console.error("[Webhook] Missing user ID in metadata");
      throw new Error("Missing user ID");
    }

    if (!data.checkoutId) {
      console.error("[Webhook] Missing checkout ID");
      throw new Error("Missing checkout ID");
    }

    db.getOrCreateUser(data.userId);

    const subscription = db.createSubscription({
      userId: data.userId,
      planName: plan.nameAr,
      paymentProvider: "chargily"
    });

    console.log("[Webhook] ✅ Subscription activated for user:", data.userId, subscription.id);

  } catch (error) {
    console.error("[Webhook] Failed to activate subscription:", error);
    throw error;
  }
}
