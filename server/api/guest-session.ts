import { Request, Response } from "express";

/**
 * Guest Session temporarily disabled (MVP phase)
 * Used to prevent Supabase/Auth errors during instability
 */
export async function createGuestSession(req: Request, res: Response) {
  return res.status(200).json({
    disabled: true,
    message: "Guest session is temporarily disabled",
    isGuest: true,
    trial: null
  });
}
