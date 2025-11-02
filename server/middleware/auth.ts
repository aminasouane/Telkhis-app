/**
 * Authentication Middleware
 * 
 * Validates Supabase JWT tokens and extracts authenticated user information
 */

import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

// Create Supabase client for JWT verification
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      authenticatedUserId?: string;
      authenticatedUser?: any;
    }
  }
}

/**
 * Middleware to verify Supabase auth and extract user ID
 * Requires Authorization header with Bearer token
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid authorization header",
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error("[Auth] Token verification failed:", error);
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }

    // Attach authenticated user info to request
    req.authenticatedUserId = data.user.id;
    req.authenticatedUser = data.user;

    next();
  } catch (error) {
    console.error("[Auth] Middleware error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Authentication check failed",
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if no auth provided
 * Useful for endpoints that work for both authenticated and guest users
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No auth provided - continue without user
      return next();
    }

    const token = authHeader.substring(7);
    const { data, error } = await supabase.auth.getUser(token);

    if (!error && data.user) {
      req.authenticatedUserId = data.user.id;
      req.authenticatedUser = data.user;
    }

    next();
  } catch (error) {
    console.error("[Auth] Optional middleware error:", error);
    // Continue even if error - this is optional auth
    next();
  }
}
