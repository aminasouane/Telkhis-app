import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase-admin";

const TRIAL_DAYS = 7;
const TRIAL_SUMMARIES_LIMIT = 10;

interface GuestSessionRequest {
  deviceId: string;
}

export async function createGuestSession(req: Request, res: Response) {
  try {
    const { deviceId } = req.body as GuestSessionRequest;

    if (!deviceId) {
      return res.status(400).json({ error: "Device ID is required" });
    }

    // Check if guest user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, device_id, user_type')
      .eq('device_id', deviceId)
      .eq('user_type', 'guest')
      .single();

    if (existingUser) {
      // Return existing guest session
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('trial_end_date, trial_summaries_used, trial_summaries_limit')
        .eq('user_id', existingUser.id)
        .eq('status', 'active')
        .single();

      return res.json({
        userId: existingUser.id,
        isGuest: true,
        trial: subscription || null
      });
    }

    // Create new guest user with Supabase Auth (anonymous sign-in)
    // إنشاء مستخدم ضيف باستخدام بريد إلكتروني وهمي فريد وكلمة مرور عشوائية
    const guestEmail = `guest_${Date.now()}@takhleesly.app`;
    const guestPassword = Math.random().toString(36).slice(-10); // كلمة مرور عشوائية
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: guestEmail,
      password: guestPassword,
      email_confirm: true,
      user_metadata: {
        role: "guest",
        deviceId,
        device_id: deviceId,
        user_type: 'guest'
      }
    });

    if (authError || !authData.user) {
      console.error('Error creating guest auth user:', authError);
      return res.status(500).json({ error: "Failed to create guest session" });
    }

    // Create user record in users table
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        device_id: deviceId,
        user_type: 'guest',
        subscription_type: 'free'
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating guest user record:', userError);
      return res.status(500).json({ error: "Failed to create guest user" });
    }

    // Create trial subscription
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);

    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: newUser.id,
        plan_name: 'trial',
        status: 'active',
        trial_end_date: trialEndDate.toISOString(),
        trial_summaries_used: 0,
        trial_summaries_limit: TRIAL_SUMMARIES_LIMIT
      });

    if (subscriptionError) {
      console.error('Error creating trial subscription:', subscriptionError);
    }

    res.json({
      userId: newUser.id,
      isGuest: true,
      trial: {
        trial_end_date: trialEndDate.toISOString(),
        trial_summaries_used: 0,
        trial_summaries_limit: TRIAL_SUMMARIES_LIMIT
      }
    });
  } catch (error: any) {
    console.error('Error in createGuestSession:', error);
    
    if (error.status === 401 || error.message?.includes('Invalid API key')) {
      return res.status(500).json({ 
        error: "Supabase service role key is invalid or not configured. Please check SUPABASE_SERVICE_ROLE_KEY in Replit Secrets." 
      });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
}
