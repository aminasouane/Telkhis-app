import { supabase } from "@/lib/supabaseClient";

const DEVICE_ID_KEY = 'takhleesly_device_id';
const TRIAL_DAYS = 7;
const TRIAL_SUMMARIES_LIMIT = 10;

export interface GuestUser {
  id: string;
  device_id: string;
  user_type: 'guest';
  created_at: string;
}

export interface TrialStatus {
  isExpired: boolean;
  summariesUsed: number;
  summariesLimit: number;
  daysRemaining: number;
  expiryDate: string | null;
}

/**
 * Generate a unique device ID
 */
function generateDeviceId(): string {
  return crypto.randomUUID();
}

/**
 * Get or create device ID for guest user
 */
export function getDeviceId(): string {
  const deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    const newDeviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
    return newDeviceId;
  }
  
  return deviceId;
}

/**
 * Create a new guest user in Supabase
 */
export async function createGuestUser(): Promise<GuestUser | null> {
  try {
    const deviceId = getDeviceId();
    
    // Check if guest user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('device_id', deviceId)
      .eq('user_type', 'guest')
      .single();
    
    if (existingUser) {
      return existingUser as GuestUser;
    }
    
    // Create new guest user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        device_id: deviceId,
        user_type: 'guest',
        subscription_type: 'free'
      })
      .select()
      .single();
    
    if (userError) {
      console.error('Error creating guest user:', userError);
      return null;
    }
    
    // Create trial subscription for guest user
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);
    
    const { error: subscriptionError } = await supabase
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
    
    return newUser as GuestUser;
  } catch (error) {
    console.error('Error in createGuestUser:', error);
    return null;
  }
}

/**
 * Get trial status for a user
 */
export async function getTrialStatus(userId: string): Promise<TrialStatus | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('trial_end_date, trial_summaries_used, trial_summaries_limit')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    const now = new Date();
    const expiryDate = data.trial_end_date ? new Date(data.trial_end_date) : null;
    
    // Calculate days remaining
    let daysRemaining = 0;
    if (expiryDate) {
      const diffTime = expiryDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    
    // Check if trial is expired
    const isExpiredByDate = expiryDate ? expiryDate < now : false;
    const isExpiredByUsage = data.trial_summaries_used >= data.trial_summaries_limit;
    
    return {
      isExpired: isExpiredByDate || isExpiredByUsage,
      summariesUsed: data.trial_summaries_used,
      summariesLimit: data.trial_summaries_limit,
      daysRemaining,
      expiryDate: expiryDate?.toISOString() || null
    };
  } catch (error) {
    console.error('Error getting trial status:', error);
    return null;
  }
}

/**
 * Increment trial usage count
 */
export async function incrementTrialUsage(userId: string): Promise<boolean> {
  try {
    // Try using RPC function first
    const { error: rpcError } = await supabase.rpc('increment_trial_usage', {
      p_user_id: userId
    });
    
    if (!rpcError) {
      return true;
    }
    
    // Fallback: Get current value and increment
    const { data: currentData } = await supabase
      .from('subscriptions')
      .select('trial_summaries_used')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    
    if (currentData) {
      const newCount = (currentData.trial_summaries_used || 0) + 1;
      
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ trial_summaries_used: newCount })
        .eq('user_id', userId)
        .eq('status', 'active');
      
      if (updateError) {
        console.error('Error incrementing trial usage:', updateError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in incrementTrialUsage:', error);
    return false;
  }
}

/**
 * Migrate guest user data to authenticated user
 */
export async function migrateGuestToUser(guestUserId: string, newUserId: string): Promise<boolean> {
  try {
    // Transfer all summaries from guest to new user
    const { error: summariesError } = await supabase
      .from('summaries')
      .update({ user_id: newUserId })
      .eq('user_id', guestUserId);
    
    if (summariesError) {
      console.error('Error migrating summaries:', summariesError);
      return false;
    }
    
    // Transfer subscriptions
    const { error: subscriptionsError } = await supabase
      .from('subscriptions')
      .update({ user_id: newUserId })
      .eq('user_id', guestUserId);
    
    if (subscriptionsError) {
      console.error('Error migrating subscriptions:', subscriptionsError);
      return false;
    }
    
    // Update device_id link to new user
    const deviceId = getDeviceId();
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ device_id: deviceId })
      .eq('id', newUserId);
    
    if (userUpdateError) {
      console.error('Error updating user device_id:', userUpdateError);
    }
    
    // Delete old guest user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', guestUserId);
    
    if (deleteError) {
      console.error('Error deleting guest user:', deleteError);
    }
    
    return true;
  } catch (error) {
    console.error('Error in migrateGuestToUser:', error);
    return false;
  }
}

/**
 * Check if user is guest
 */
export async function isGuestUser(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return data.user_type === 'guest';
  } catch (error) {
    console.error('Error checking if guest user:', error);
    return false;
  }
}

/**
 * Get guest user by device ID
 */
export async function getGuestUserByDeviceId(): Promise<GuestUser | null> {
  try {
    const deviceId = getDeviceId();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('device_id', deviceId)
      .eq('user_type', 'guest')
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data as GuestUser;
  } catch (error) {
    console.error('Error getting guest user:', error);
    return null;
  }
}
