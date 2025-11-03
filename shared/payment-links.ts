/**
 * Chargily Payment Links Configuration
 * 
 * This file contains the direct payment links from Chargily Dashboard.
 * Each plan has a unique payment link for one-time payments.
 * 
 * 🔧 SETUP INSTRUCTIONS:
 * 1. Go to Chargily Dashboard → Payment Links
 * 2. Create a payment link for each plan
 * 3. Set success_url to: https://your-app.replit.app/payment/success
 * 4. Set failure_url to: https://your-app.replit.app/payment/failed
 * 5. Copy the generated links and add them as environment variables
 */

import type { PlanId } from "./plans";

export interface PaymentLinkConfig {
  planId: PlanId;
  link: string;
  isEnabled: boolean;
}

/**
 * Get payment link from environment variables (secure method)
 * Format: CHARGILY_LINK_BASIC, CHARGILY_LINK_STUDENT, CHARGILY_LINK_PROFESSIONAL
 */
export function getPaymentLink(planId: PlanId): string | null {
  const envKey = `CHARGILY_LINK_${planId.toUpperCase()}`;
  const link = process.env[envKey];
  
  if (!link) {
    console.warn(`⚠️  Payment link not found for plan: ${planId}. Set ${envKey} in environment variables.`);
    return null;
  }
  
  return link;
}

/**
 * Check if payment links are configured
 */
export function arePaymentLinksConfigured(): boolean {
  const basicLink = process.env.CHARGILY_LINK_BASIC;
  const studentLink = process.env.CHARGILY_LINK_STUDENT;
  const professionalLink = process.env.CHARGILY_LINK_PROFESSIONAL;
  
  return !!(basicLink && studentLink && professionalLink);
}

/**
 * Get all payment links status
 */
export function getPaymentLinksStatus(): Record<PlanId, { configured: boolean; link: string | null }> {
  return {
    basic: {
      configured: !!process.env.CHARGILY_LINK_BASIC,
      link: process.env.CHARGILY_LINK_BASIC || null,
    },
    student: {
      configured: !!process.env.CHARGILY_LINK_STUDENT,
      link: process.env.CHARGILY_LINK_STUDENT || null,
    },
    professional: {
      configured: !!process.env.CHARGILY_LINK_PROFESSIONAL,
      link: process.env.CHARGILY_LINK_PROFESSIONAL || null,
    },
  };
}

/**
 * Build success and failure URLs
 */
export function getCallbackUrls() {
  const baseUrl = process.env.VITE_APP_URL || "http://localhost:5000";
  
  return {
    successUrl: `${baseUrl}/payment/success`,
    failureUrl: `${baseUrl}/payment/failed`,
  };
}
