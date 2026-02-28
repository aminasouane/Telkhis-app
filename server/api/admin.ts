import { Request, Response } from "express";
import * as db from "../db";

/**
 * GET /api/admin/stats
 * Returns overall platform statistics.
 */
export async function getAdminStats(req: Request, res: Response) {
    try {
        const stats = await db.getAdminStats();
        res.json(stats);
    } catch (error) {
        console.error("[Admin] Stats error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * GET /api/admin/users?search=...&plan=...&page=1&limit=20
 * Returns paginated user list with subscription info.
 */
export async function getAdminUsers(req: Request, res: Response) {
    try {
        const search = req.query.search as string | undefined;
        const planFilter = req.query.plan as string | undefined;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

        const result = await db.getAllUsersWithStats({ search, planFilter, page, limit });
        res.json(result);
    } catch (error) {
        console.error("[Admin] Users error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * GET /api/admin/users/:id
 * Returns detailed info about a single user (subscriptions, summaries, usage).
 */
export async function getAdminUserDetail(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const detail = await db.getUserDetailForAdmin(id);
        if (!detail.user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(detail);
    } catch (error) {
        console.error("[Admin] User detail error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * GET /api/user/role
 * Returns the current user's role (for client-side admin route guard).
 */
export async function getUserRole(req: Request, res: Response) {
    try {
        const userId = req.authenticatedUserId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        const role = await db.getUserRole(userId);
        res.json({ role });
    } catch (error) {
        console.error("[Admin] Role check error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * GET /api/admin/settings
 * Returns the current system settings.
 */
export async function getAdminSettings(req: Request, res: Response) {
    try {
        const settings = await db.getSystemSettings();
        res.json(settings);
    } catch (error) {
        console.error("[Admin] Settings fetch error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * PATCH /api/admin/settings
 * Updates a specific system setting.
 */
export async function updateAdminSetting(req: Request, res: Response) {
    try {
        const { key, value, description } = req.body;
        if (!key || value === undefined) {
            return res.status(400).json({ error: "Missing key or value" });
        }
        const success = await db.updateSystemSetting(key, value, description);
        if (!success) {
            return res.status(500).json({ error: "Failed to update setting" });
        }
        res.json({ success: true, message: "Setting updated successfully" });
    } catch (error) {
        console.error("[Admin] Settings update error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
