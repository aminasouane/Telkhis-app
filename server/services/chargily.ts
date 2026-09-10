/**
 * Chargily Pay Integration Service
 * 
 * This service handles all interactions with Chargily Pay API
 * including checkout creation, webhook processing, and payment management.
 */

import { ChargilyClient } from "@chargily/chargily-pay";
import { 
  SUBSCRIPTION_PLANS, 
  getPlanById, 
  type PlanId,
  type ChargilyCheckoutData 
} from "../../shared/plans";

// Initialize Chargily client
const CHARGILY_API_KEY = process.env.CHARGILY_API_KEY || "";
const CHARGILY_MODE = (process.env.CHARGILY_MODE || "test") as "test" | "live";

if (!CHARGILY_API_KEY) {
  console.warn("⚠️  CHARGILY_API_KEY not set. Chargily integration will not work.");
}

export const chargilyClient = new ChargilyClient({
  api_key: CHARGILY_API_KEY,
  mode: CHARGILY_MODE,
});

/**
 * Create a checkout session for a subscription plan
 * 
 * @param data Checkout data including plan ID and user info
 * @returns Checkout object with checkout_url for redirect
 */
export async function createCheckout(
  data: ChargilyCheckoutData,
  customAmount?: number,
  additionalMetadata?: Record<string, string>
) {
  const plan = getPlanById(data.planId);
  
  if (!plan) {
    throw new Error(`Invalid plan ID: ${data.planId}`);
  }

  const finalAmount = customAmount !== undefined ? customAmount : plan.priceDZD;

  const checkoutData = {
    amount: finalAmount,
    currency: "dzd" as const,
    success_url: `${process.env.VITE_APP_URL || "http://localhost:5000"}/success`,
    failure_url: `${process.env.VITE_APP_URL || "http://localhost:5000"}/subscribe`,
    webhook_endpoint: `${process.env.VITE_APP_URL || "http://localhost:5000"}/api/chargily/webhook`,
    locale: data.locale,
    
    // Track the subscription and coupon in metadata
    metadata: {
      user_id: data.userId,
      plan_id: data.planId,
      plan_name: plan.nameAr,
      lectures: plan.lectures.toString(),
      total_minutes: plan.totalMinutes.toString(),
      ...(additionalMetadata || {}),
    },
  };

  try {
    const checkout = await chargilyClient.createCheckout(checkoutData);
    
    console.log("[Chargily] Checkout created:", {
      checkout_id: checkout.id,
      amount: checkout.amount,
      user_id: data.userId,
      plan_id: data.planId,
    });

    return checkout;
  } catch (error) {
    console.error("[Chargily] Error creating checkout:", error);
    throw new Error("Failed to create payment checkout. Please try again.");
  }
}

/**
 * Create a customer in Chargily
 * (Optional - for future use if we want to track customers)
 * 
 * @param userData User data for customer creation
 */
export async function createCustomer(userData: {
  userId: string;
  email?: string;
  name?: string;
  phone?: string;
}) {
  try {
    const customer = await chargilyClient.createCustomer({
      name: userData.name || "Takhleesly User",
      email: userData.email || `user-${userData.userId}@takhleesly.app`,
      metadata: {
        user_id: userData.userId,
      },
    });

    console.log("[Chargily] Customer created:", {
      customer_id: customer.id,
      user_id: userData.userId,
    });

    return customer;
  } catch (error) {
    console.error("[Chargily] Error creating customer:", error);
    throw error;
  }
}

/**
 * Retrieve a checkout by ID
 * Note: API method name may vary, adjust as needed based on SDK version
 * 
 * @param checkoutId Chargily checkout ID
 */
export async function getCheckout(checkoutId: string) {
  try {
    // Note: Adjust method name based on actual SDK API
    // const checkout = await chargilyClient.getCheckout(checkoutId);
    // For now, we'll return null and implement when needed
    console.warn("[Chargily] getCheckout not implemented yet");
    return null;
  } catch (error) {
    console.error("[Chargily] Error retrieving checkout:", error);
    throw error;
  }
}

/**
 * Process webhook event from Chargily
 * 
 * @param event Webhook event data
 */
export async function processWebhookEvent(event: any) {
  console.log("[Chargily] Webhook event received:", {
    type: event.type,
    id: event.id,
    data: event.data,
  });

  // The event structure from Chargily webhook
  const eventType = event.type;
  const eventData = event.data;

  switch (eventType) {
    case "checkout.paid":
      return await handleCheckoutPaid(eventData);
    
    case "checkout.failed":
      return await handleCheckoutFailed(eventData);
    
    default:
      console.log(`[Chargily] Unhandled event type: ${eventType}`);
      return { processed: false, reason: "Event type not handled" };
  }
}

/**
 * Handle successful payment
 */
async function handleCheckoutPaid(checkoutData: any) {
  console.log("[Chargily] Processing paid checkout:", checkoutData);

  const metadata = checkoutData.metadata || {};
  const userId = metadata.user_id;
  const planId = metadata.plan_id as PlanId;
  
  if (!userId || !planId) {
    console.error("[Chargily] Missing required metadata in checkout:", metadata);
    return { 
      processed: false, 
      reason: "Missing user_id or plan_id in metadata" 
    };
  }

  return {
    processed: true,
    action: "activate_subscription",
    data: {
      userId,
      planId,
      checkoutId: checkoutData.id,
      customerId: checkoutData.customer_id,
      amount: checkoutData.amount,
      currency: checkoutData.currency,
      transactionId: checkoutData.transaction_id || checkoutData.id,
      paymentMethod: checkoutData.payment_method,
      metadata,
    },
  };
}

/**
 * Handle failed payment
 */
async function handleCheckoutFailed(checkoutData: any) {
  console.log("[Chargily] Processing failed checkout:", checkoutData);

  const metadata = checkoutData.metadata || {};
  
  return {
    processed: true,
    action: "payment_failed",
    data: {
      userId: metadata.user_id,
      planId: metadata.plan_id,
      checkoutId: checkoutData.id,
      reason: checkoutData.failure_reason || "Unknown",
    },
  };
}

/**
 * Helper: Get plan details by ID
 */
export function getPlanDetails(planId: PlanId) {
  return getPlanById(planId);
}

/**
 * Helper: Validate Chargily configuration
 */
export function isChargilyConfigured(): boolean {
  return !!CHARGILY_API_KEY;
}

/**
 * Helper: Get current mode (test or live)
 */
export function getChargilyMode(): "test" | "live" {
  return CHARGILY_MODE;
}
