import { Request, Response } from "express";

interface MigrateGuestRequest {
  guestUserId: string;
  authenticatedUserId: string;
}

export async function migrateGuest(req: Request, res: Response) {
  try {
    const { guestUserId, authenticatedUserId } = req.body as MigrateGuestRequest;

    if (!guestUserId || !authenticatedUserId) {
      return res.status(400).json({ error: "Both guest and authenticated user IDs are required" });
    }

    res.json({ 
      success: true,
      message: "Guest migration is not needed in MVP (local auth only)"
    });
  } catch (error) {
    console.error('Error in migrateGuest:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}
