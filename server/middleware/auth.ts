import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../supabase-admin";

declare global {
  namespace Express {
    interface Request {
      authenticatedUserId?: string;
      authenticatedUser?: any;
    }
  }
}

/**
 * Verifies a Supabase JWT from the Authorization header.
 * Requires: Authorization: Bearer <supabase_access_token>
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "يجب تسجيل الدخول أولاً",
        errorCode: "NO_TOKEN",
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "جلسة المستخدم غير صالحة، يرجى تسجيل الدخول مرة أخرى",
        errorCode: "INVALID_TOKEN",
      });
    }

    req.authenticatedUserId = user.id;
    req.authenticatedUser = user;
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
 * Optional auth — sets userId if token provided, but doesn't block.
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        req.authenticatedUserId = user.id;
        req.authenticatedUser = user;
      }
    }
    next();
  } catch {
    next();
  }
}
