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

// Schema for checkout creation (without userId - will be extracted from auth)
const createCheckoutSchema = z.object({
  planId: z.enum(["basic", "student", "professional"]),
  locale: z.enum(["ar", "en", "fr"]).default("ar"),
});

export async function handleCreateCheckout(req: Request, res: Response) {
  try {
    // Check if Chargily is configured
    if (!isChargilyConfigured()) {
      return res.status(500).json({
        error: "Payment system is not configured. Please contact support.",
      });
    }

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

    const { planId, locale } = validation.data;

    // Create checkout session using authenticated user ID
    const checkoutData = {
      planId,
      userId: authenticatedUserId, // Use server-verified user ID
      userEmail: authenticatedUser.email,
      userName: authenticatedUser.user_metadata?.name,
      locale,
    };

    const checkout = await createCheckout(checkoutData);

    console.log("[API] Checkout created for authenticated user:", {
      userId: authenticatedUserId,
      planId,
      checkoutId: checkout.id,
    });

    // Return checkout URL for redirect
    return res.status(200).json({
      success: true,
      checkoutId: checkout.id,
      checkoutUrl: checkout.checkout_url,
      amount: checkout.amount,
      currency: checkout.currency,
    });

  } catch (error: any) {
    console.error("[API] Error creating Chargily checkout:", error);
    
    return res.status(500).json({
      error: "Failed to create payment session",
      message: error.message || "An unexpected error occurred",
    });
  }
}
