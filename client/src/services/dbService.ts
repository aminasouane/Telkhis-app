import { supabase } from "@/lib/supabaseClient";
import type { Language } from "@shared/schema";

// Types for database operations
export interface UserData {
  id: string;
  email: string | null;
  name: string | null;
  device_id?: string | null;
  user_type?: 'guest' | 'free' | 'premium' | 'pro_plus';
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
  trial_end_date?: string | null;
  trial_summaries_used?: number;
  trial_summaries_limit?: number;
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
 * Create or update user data via backend API
 */
export async function upsertUser(userId: string, email: string, name?: string): Promise<UserData | null> {
  try {
    const response = await fetch('/api/user/upsert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, email, name }),
    });

    if (!response.ok) {
      console.error('Failed to upsert user');
      return null;
    }

    const { user } = await response.json();
    return user;
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
 * Get all summaries for a user via backend API
 */
export async function getSummaries(userId: string): Promise<SummaryData[]> {
  try {
    const response = await fetch(`/api/summaries?userId=${userId}`);
    
    if (!response.ok) {
      console.error('Failed to fetch summaries');
      return [];
    }

    const { summaries } = await response.json();
    return summaries || [];
  } catch (error) {
    console.error('Error in getSummaries:', error);
    return [];
  }
}

/**
 * Get a single summary by ID via backend API (only if owned by user)
 */
export async function getSummaryById(summaryId: string, userId: string): Promise<SummaryData | null> {
  try {
    const response = await fetch(`/api/summaries/${summaryId}?userId=${userId}`);
    
    if (!response.ok) {
      console.error('Failed to fetch summary');
      return null;
    }

    const { summary } = await response.json();
    return summary;
  } catch (error) {
    console.error('Error in getSummaryById:', error);
    return null;
  }
}

/**
 * Delete a summary via backend API (only if owned by user)
 */
export async function deleteSummary(summaryId: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/summaries/${summaryId}?userId=${userId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      console.error('Failed to delete summary');
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
 * Get user settings via backend API
 */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const response = await fetch(`/api/user/settings?userId=${userId}`);
    
    if (!response.ok) {
      console.error('Failed to fetch settings');
      return null;
    }

    const { settings } = await response.json();
    return settings;
  } catch (error) {
    console.error('Error in getUserSettings:', error);
    return null;
  }
}

/**
 * Update user settings via backend API
 */
export async function updateUserSettings(settings: UserSettings): Promise<UserSettings | null> {
  try {
    const response = await fetch('/api/user/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: settings.user_id,
        preferred_language: settings.preferred_language,
        notifications_enabled: settings.notifications_enabled
      }),
    });

    if (!response.ok) {
      console.error('Failed to update settings');
      return null;
    }

    const { settings: updatedSettings } = await response.json();
    return updatedSettings;
  } catch (error) {
    console.error('Error in updateUserSettings:', error);
    return null;
  }
}
