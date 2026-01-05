import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      authenticatedUserId?: string;
      authenticatedUser?: any;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.body.userId || req.query.userId || req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required",
      });
    }

    req.authenticatedUserId = userId;
    req.authenticatedUser = { id: userId };

    next();
  } catch (error) {
    console.error("[Auth] Middleware error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Authentication check failed",
    });
  }
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.body.userId || req.query.userId || req.headers['x-user-id'] as string;
    
    if (userId) {
      req.authenticatedUserId = userId;
      req.authenticatedUser = { id: userId };
    }

    next();
  } catch (error) {
    console.error("[Auth] Optional middleware error:", error);
    next();
  }
}
