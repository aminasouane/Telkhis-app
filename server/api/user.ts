import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase-admin";

const TRIAL_DAYS = 7;
const TRIAL_SUMMARIES_LIMIT = 10;

/**
 * Upsert user data (for authenticated users)
 */
export async function upsertUser(req: Request, res: Response) {
  try {
    const { userId, email, name } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: "User ID and email are required" });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    const isNewUser = !existingUser;

    // Upsert user record
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email,
        name: name || null,
        subscription_type: 'free',
        user_type: 'free'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting user:', error);
      return res.status(500).json({ error: "Failed to upsert user" });
    }

    // Create trial subscription for new authenticated users
    if (isNewUser) {
      // Set trial to end at the end of the 7th day (23:59:59)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);
      trialEndDate.setHours(23, 59, 59, 999);

      const { error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_name: 'trial',
          status: 'active',
          trial_end_date: trialEndDate.toISOString(),
          trial_summaries_used: 0,
          trial_summaries_limit: TRIAL_SUMMARIES_LIMIT
        });

      if (subscriptionError) {
        console.error('Error creating trial subscription:', subscriptionError);
        // Don't fail the whole request if subscription creation fails
      }
    }

    res.json({ user: data });
  } catch (error) {
    console.error('Error in upsertUser:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get user settings
 */
export async function getUserSettings(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
      return res.status(500).json({ error: "Failed to fetch settings" });
    }

    res.json({ settings: data || null });
  } catch (error) {
    console.error('Error in getUserSettings:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Update user settings
 */
export async function updateUserSettings(req: Request, res: Response) {
  try {
    const { user_id, preferred_language, notifications_enabled } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const { data, error } = await supabaseAdmin
      .from('settings')
      .upsert({
        user_id,
        preferred_language,
        notifications_enabled
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({ error: "Failed to update settings" });
    }

    res.json({ settings: data });
  } catch (error) {
    console.error('Error in updateUserSettings:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}
