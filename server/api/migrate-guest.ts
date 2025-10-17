import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase-admin";

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

    // Verify guest user exists and is actually a guest
    const { data: guestUser, error: guestError } = await supabaseAdmin
      .from('users')
      .select('id, user_type, device_id')
      .eq('id', guestUserId)
      .eq('user_type', 'guest')
      .single();

    if (guestError || !guestUser) {
      return res.status(404).json({ error: "Guest user not found" });
    }

    // Verify authenticated user exists
    const { data: authUser, error: authError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authenticatedUserId)
      .single();

    if (authError || !authUser) {
      return res.status(404).json({ error: "Authenticated user not found" });
    }

    // Transfer summaries from guest to authenticated user
    const { error: summariesError } = await supabaseAdmin
      .from('summaries')
      .update({ user_id: authenticatedUserId })
      .eq('user_id', guestUserId);

    if (summariesError) {
      console.error('Error transferring summaries:', summariesError);
      return res.status(500).json({ error: "Failed to transfer summaries" });
    }

    // Transfer settings if they exist
    const { data: guestSettings } = await supabaseAdmin
      .from('settings')
      .select('preferred_language, notifications_enabled')
      .eq('user_id', guestUserId)
      .single();

    if (guestSettings) {
      // Check if authenticated user already has settings
      const { data: existingSettings } = await supabaseAdmin
        .from('settings')
        .select('id')
        .eq('user_id', authenticatedUserId)
        .single();

      if (!existingSettings) {
        // Create settings for authenticated user with guest's preferences
        await supabaseAdmin
          .from('settings')
          .insert({
            user_id: authenticatedUserId,
            preferred_language: guestSettings.preferred_language,
            notifications_enabled: guestSettings.notifications_enabled
          });
      }

      // Delete guest settings
      await supabaseAdmin
        .from('settings')
        .delete()
        .eq('user_id', guestUserId);
    }

    // Delete guest subscription (CASCADE will handle this, but explicit is better)
    await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', guestUserId);

    // Mark guest user as migrated (soft delete by changing type)
    await supabaseAdmin
      .from('users')
      .update({ user_type: 'migrated' })
      .eq('id', guestUserId);

    res.json({ 
      success: true,
      message: "Guest data successfully migrated"
    });
  } catch (error) {
    console.error('Error in migrateGuest:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}
