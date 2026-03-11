import { getOrCreateAppUserId } from "./appUserService";
import { 
  getTrialData, 
  saveTrialData, 
  resetTrialData, 
  type TrialData 
} from "./localTrialService";
import { supabase } from '../lib/supabaseClient';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

interface ServerTrialStatus {
  trialStatus: {
    userId: string;
    isExpired: boolean;
    minutesUsed: number;
    minutesLimit: number;
    minutesRemaining: number;
    dailyMinutesUsed: number;
    dailyLimit: number;
    dailyRemaining: number;
    firstUseDate: string | null;
    daysUsed: number;
    canUseService: boolean;
  };
  isTrialActive: boolean;
  hasActiveSubscription: boolean;
}

async function fetchServerTrialStatus(userId: string): Promise<ServerTrialStatus | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/trial-status?userId=${userId}`, { headers });
    if (!response.ok) {
      console.error('[trialSync] Failed to fetch server trial status');
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('[trialSync] Error fetching server trial status:', error);
    return null;
  }
}

export async function syncTrialWithServer(userId?: string): Promise<boolean> {
  const appUserId = userId || getOrCreateAppUserId();
  
  console.log('[trialSync] Starting sync for user:', appUserId);
  
  const serverStatus = await fetchServerTrialStatus(appUserId);
  
  if (!serverStatus) {
    console.log('[trialSync] Could not fetch server status, using local data');
    return false;
  }
  
  const localData = getTrialData(appUserId);
  const serverTrialInfo = serverStatus.trialStatus;
  
  console.log('[trialSync] Server data:', {
    firstUseDate: serverTrialInfo.firstUseDate,
    minutesUsed: serverTrialInfo.minutesUsed,
    dailyMinutesUsed: serverTrialInfo.dailyMinutesUsed,
    isExpired: serverTrialInfo.isExpired,
  });
  
  console.log('[trialSync] Local data:', localData);
  
  if (!serverTrialInfo.firstUseDate) {
    console.log('[trialSync] Server has no usage data - user is fresh');
    
    if (localData) {
      console.log('[trialSync] Clearing stale local data to match server');
      resetTrialData(appUserId);
    }
    return true;
  }
  
  const today = new Date().toISOString().split('T')[0];
  const syncedData: TrialData = {
    appUserId,
    firstUseDate: serverTrialInfo.firstUseDate,
    totalMinutesUsed: serverTrialInfo.minutesUsed,
    dailyUsage: {
      date: today,
      minutesUsed: serverTrialInfo.dailyMinutesUsed,
    },
  };
  
  saveTrialData(syncedData);
  console.log('[trialSync] Synced local data with server:', syncedData);
  
  return true;
}

export async function initializeTrialSync(): Promise<void> {
  const userId = getOrCreateAppUserId();
  await syncTrialWithServer(userId);
}
