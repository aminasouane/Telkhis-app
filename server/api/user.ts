import { Request, Response } from "express";
import * as db from "../db";

export async function getUser(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    const user = await db.getUser(userId);
    res.json({ user: user || null });
  } catch (error) {
    console.error('Error in getUser:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function upsertUser(req: Request, res: Response) {
  try {
    const { userId, email, name, provider } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    const user = await db.getOrCreateUser(userId, email, name, provider);
    res.json({ user });
  } catch (error) {
    console.error('Error in upsertUser:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserSettings(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    const settings = await db.getSettings(userId);
    res.json({ settings: settings || null });
  } catch (error) {
    console.error('Error in getUserSettings:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateUserSettings(req: Request, res: Response) {
  try {
    const { user_id, preferred_language, notifications_enabled, theme } = req.body;
    if (!user_id) return res.status(400).json({ error: "User ID is required" });
    const settings = await db.upsertSettings({
      userId: user_id,
      preferredLanguage: preferred_language,
      notificationsEnabled: notifications_enabled,
      theme,
    });
    res.json({ settings });
  } catch (error) {
    console.error('Error in updateUserSettings:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}
