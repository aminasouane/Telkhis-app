import { Request, Response } from "express";
import * as db from "../db";

export async function getSummaries(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    // IDOR Protection
    if (req.authenticatedUserId) {
      if (req.authenticatedUserId !== userId) return res.status(403).json({ error: "Forbidden" });
    } else {
      const isRegistered = await db.getUser(userId);
      if (isRegistered) return res.status(401).json({ error: "Unauthorized" });
    }

    const summaries = await db.getSummaries(userId);
    res.json({ summaries });
  } catch (error) {
    console.error('Error in getSummaries:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getSummaryById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    // IDOR Protection
    if (req.authenticatedUserId) {
      if (req.authenticatedUserId !== userId) return res.status(403).json({ error: "Forbidden" });
    } else {
      const isRegistered = await db.getUser(userId);
      if (isRegistered) return res.status(401).json({ error: "Unauthorized" });
    }

    const summary = await db.getSummaryById(id, userId);
    if (!summary) return res.status(404).json({ error: "Summary not found" });
    res.json({ summary });
  } catch (error) {
    console.error('Error in getSummaryById:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteSummary(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.body.userId || req.query.userId;
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    // IDOR Protection
    if (req.authenticatedUserId) {
      if (req.authenticatedUserId !== userId) return res.status(403).json({ error: "Forbidden" });
    } else {
      const isRegistered = await db.getUser(userId);
      if (isRegistered) return res.status(401).json({ error: "Unauthorized" });
    }

    const deleted = await db.deleteSummary(id, userId);
    if (!deleted) return res.status(404).json({ error: "Summary not found" });
    res.json({ success: true });
  } catch (error) {
    console.error('Error in deleteSummary:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}
