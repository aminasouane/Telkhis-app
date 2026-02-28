import { Request, Response, NextFunction } from "express";
import { requireAuth } from "./auth";
import * as db from "../db";

/**
 * Admin middleware — chains requireAuth + role check in DB.
 * Usage: app.get("/api/admin/...", requireAdmin, handler)
 */
export async function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction
) {
    // First, verify JWT
    requireAuth(req, res, async () => {
        try {
            const userId = req.authenticatedUserId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            // Check role in database (not JWT — prevents tampering)
            const role = await db.getUserRole(userId);
            if (role !== "admin") {
                return res.status(403).json({
                    error: "Forbidden",
                    message: "ليس لديك صلاحية الوصول",
                    errorCode: "NOT_ADMIN",
                });
            }

            next();
        } catch (error) {
            console.error("[AdminAuth] Error:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });
}
