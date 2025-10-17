import { supabase } from "@/lib/supabaseClient";
import type { Language } from "@shared/schema";

// Types for database operations
export interface UserData {
  id: string;
  email: string;
  name: string | null;
  subscription_type: 'free' | 'premium' | 'pro_plus';
  created_at: string;
}

export interface SummaryData {
  id?: string;
  user_id: string;
  title: string;
  content: string;
  transcript: string;
  key_points: string[];
  language: Language;
  shared?: boolean;
  created_at?: string;
}

export interface SubscriptionData {
  id: string;
  user_id: string;
  plan_name: string;
  status: 'active' | 'expired' | 'cancelled';
  start_date: string;
  end_date: string | null;
  payment_provider: string | null;
}

export interface UserSettings {
  id?: string;
  user_id: string;
  preferred_language: Language;
  notifications_enabled: boolean;
}

/**
 * Get user data by ID
 */
export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user data:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserData:', error);
    return null;
  }
}

/**
 * Create or update user data
 */
export async function upsertUser(userId: string, email: string, name?: string): Promise<UserData | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email,
        name: name || null,
        subscription_type: 'free'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in upsertUser:', error);
    return null;
  }
}

/**
 * Save a new summary to the database
 */
export async function saveSummary(summaryData: SummaryData): Promise<SummaryData | null> {
  try {
    const { data, error } = await supabase
      .from('summaries')
      .insert({
        user_id: summaryData.user_id,
        title: summaryData.title,
        content: summaryData.content,
        transcript: summaryData.transcript,
        key_points: summaryData.key_points,
        language: summaryData.language,
        shared: summaryData.shared || false
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving summary:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in saveSummary:', error);
    return null;
  }
}

/**
 * Get all summaries for a user
 */
export async function getSummaries(userId: string): Promise<SummaryData[]> {
  try {
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching summaries:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSummaries:', error);
    return [];
  }
}

/**
 * Get a single summary by ID (only if owned by user)
 */
export async function getSummaryById(summaryId: string, userId: string): Promise<SummaryData | null> {
  try {
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('id', summaryId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching summary:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getSummaryById:', error);
    return null;
  }
}

/**
 * Delete a summary (only if owned by user)
 */
export async function deleteSummary(summaryId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('summaries')
      .delete()
      .eq('id', summaryId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting summary:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteSummary:', error);
    return false;
  }
}

/**
 * Get user's active subscription
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionData | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error in getUserSubscription:', error);
    return null;
  }
}

/**
 * Update user's subscription
 */
export async function updateSubscription(
  userId: string, 
  planName: string, 
  endDate?: string
): Promise<SubscriptionData | null> {
  try {
    // First, cancel any existing active subscriptions
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'active');

    // Create new subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_name: planName,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: endDate || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription:', error);
      return null;
    }

    // Update user's subscription_type
    const subscriptionType = planName.toLowerCase().replace(' ', '_') as 'free' | 'premium' | 'pro_plus';
    await supabase
      .from('users')
      .update({ subscription_type: subscriptionType })
      .eq('id', userId);

    return data;
  } catch (error) {
    console.error('Error in updateSubscription:', error);
    return null;
  }
}

/**
 * Get user settings
 */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error in getUserSettings:', error);
    return null;
  }
}

/**
 * Update user settings
 */
export async function updateUserSettings(settings: UserSettings): Promise<UserSettings | null> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        user_id: settings.user_id,
        preferred_language: settings.preferred_language,
        notifications_enabled: settings.notifications_enabled
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateUserSettings:', error);
    return null;
  }
}
