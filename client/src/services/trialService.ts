const DEVICE_ID_KEY = 'takhleesly_device_id';

export interface GuestSessionResponse {
  userId: string;
  isGuest: boolean;
  trial: {
    trial_minutes_used: number;
    trial_minutes_limit: number;
  };
}

export interface TrialStatus {
  isExpired: boolean;
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  canUseService: boolean;
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
 * Create or retrieve guest session via secure backend API
 */
export async function createGuestSession(): Promise<GuestSessionResponse | null> {
  try {
    const deviceId = getDeviceId();
    
    const response = await fetch('/api/guest-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId }),
    });

    if (!response.ok) {
      console.error('Failed to create guest session');
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in createGuestSession:', error);
    return null;
  }
}

/**
 * Get trial status from backend API
 */
export async function getTrialStatus(userId: string): Promise<TrialStatus | null> {
  try {
    const response = await fetch(`/api/trial-status?userId=${userId}`);
    
    if (!response.ok) {
      console.error('Failed to get trial status');
      return null;
    }

    const { trialStatus } = await response.json();
    
    return {
      isExpired: trialStatus.isExpired,
      minutesUsed: trialStatus.minutesUsed || 0,
      minutesLimit: trialStatus.minutesLimit || 30,
      minutesRemaining: trialStatus.minutesRemaining || 30,
      canUseService: trialStatus.canUseService !== undefined ? trialStatus.canUseService : !trialStatus.isExpired
    };
  } catch (error) {
    console.error('Error getting trial status:', error);
    return null;
  }
}

/**
 * Save summary via secure backend API (includes trial enforcement)
 */
export async function saveSummary(
  userId: string,
  title: string,
  content: string,
  transcript: string,
  keyPoints: string[],
  language: 'ar' | 'fr' | 'dz',
  audioDuration?: number,
  processedAt?: string
): Promise<{ success: boolean; trialStatus?: TrialStatus; error?: string; message?: string }> {
  try {
    const response = await fetch('/api/save-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        title,
        content,
        transcript,
        keyPoints,
        language,
        audioDuration,
        processedAt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 403) {
        // Trial expired or limit reached
        return {
          success: false,
          trialStatus: data.trialStatus,
          error: data.error || 'Trial expired',
          message: data.message
        };
      }
      return { success: false, error: data.error || 'Failed to save summary', message: data.message };
    }

    return { 
      success: true, 
      trialStatus: data.trialStatus 
    };
  } catch (error) {
    console.error('Error saving summary:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Migrate guest user data to authenticated user via secure backend API
 */
export async function migrateGuestToUser(guestUserId: string, authenticatedUserId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/migrate-guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guestUserId,
        authenticatedUserId,
      }),
    });

    if (!response.ok) {
      console.error('Failed to migrate guest data');
      return false;
    }

    // Clear device ID after successful migration
    localStorage.removeItem(DEVICE_ID_KEY);
    
    return true;
  } catch (error) {
    console.error('Error in migrateGuestToUser:', error);
    return false;
  }
}

/**
 * Get summaries for a user via backend API
 */
export async function getSummaries(userId: string) {
  try {
    const response = await fetch(`/api/summaries?userId=${userId}`);
    
    if (!response.ok) {
      console.error('Failed to get summaries');
      return [];
    }

    const { summaries } = await response.json();
    return summaries || [];
  } catch (error) {
    console.error('Error getting summaries:', error);
    return [];
  }
}

/**
 * Get a specific summary by ID via backend API
 */
export async function getSummaryById(summaryId: string, userId: string) {
  try {
    const response = await fetch(`/api/summaries/${summaryId}?userId=${userId}`);
    
    if (!response.ok) {
      console.error('Failed to get summary');
      return null;
    }

    const { summary } = await response.json();
    return summary;
  } catch (error) {
    console.error('Error getting summary:', error);
    return null;
  }
}

/**
 * Delete a summary via backend API
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
    console.error('Error deleting summary:', error);
    return false;
  }
}
