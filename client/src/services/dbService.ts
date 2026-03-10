import type { Language } from "@shared/schema";
import { supabase } from '../lib/supabaseClient';

async function getAuthHeaders(contentType: string = 'application/json'): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = contentType;
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  return headers;
}

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
  audio_duration?: number;
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

export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    const headers = await getAuthHeaders('');
    const response = await fetch(`/api/user?userId=${userId}`, { headers });
    if (!response.ok) return null;
    const { user } = await response.json();
    return user;
  } catch (error) {
    console.error('Error in getUserData:', error);
    return null;
  }
}

export async function upsertUser(userId: string, email: string, name?: string): Promise<UserData | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/user/upsert', {
      method: 'POST',
      headers,
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

export async function saveSummary(summaryData: SummaryData & { processedAt?: string }): Promise<SummaryData | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/save-summary', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: summaryData.user_id,
        title: summaryData.title,
        content: summaryData.content,
        transcript: summaryData.transcript,
        keyPoints: summaryData.key_points,
        language: summaryData.language,
        audioDuration: summaryData.audio_duration,
        processedAt: summaryData.processedAt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error saving summary:', errorData);
      throw new Error(errorData.message || errorData.error || 'Failed to save summary');
    }

    const { summary } = await response.json();
    return summary;
  } catch (error) {
    console.error('Error in saveSummary:', error);
    return null;
  }
}

export async function getSummaries(userId: string): Promise<SummaryData[]> {
  try {
    const headers = await getAuthHeaders('');
    const response = await fetch(`/api/summaries?userId=${userId}`, { headers });

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

export async function getSummaryById(summaryId: string, userId: string): Promise<SummaryData | null> {
  try {
    const headers = await getAuthHeaders('');
    const response = await fetch(`/api/summaries/${summaryId}?userId=${userId}`, { headers });

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

export async function deleteSummary(summaryId: string, userId: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders('');
    const response = await fetch(`/api/summaries/${summaryId}?userId=${userId}`, {
      method: 'DELETE',
      headers,
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

export async function getUserSubscription(userId: string): Promise<SubscriptionData | null> {
  try {
    const headers = await getAuthHeaders('');
    const response = await fetch(`/api/payment/latest?userId=${userId}`, { headers });

    if (!response.ok) {
      console.error('Failed to fetch subscription');
      return null;
    }

    const { payment } = await response.json();
    return payment || null;
  } catch (error) {
    console.error('Error in getUserSubscription:', error);
    return null;
  }
}

export async function updateSubscription(
  userId: string,
  planName: string,
  endDate?: string
): Promise<SubscriptionData | null> {
  console.warn('updateSubscription: Direct subscription updates are handled by payment webhooks');
  return null;
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const headers = await getAuthHeaders('');
    const response = await fetch(`/api/user/settings?userId=${userId}`, { headers });

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

export async function updateUserSettings(settings: UserSettings): Promise<UserSettings | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/user/settings', {
      method: 'POST',
      headers,
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
