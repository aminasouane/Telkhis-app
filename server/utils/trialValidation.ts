import { supabaseAdmin } from "../supabase-admin";
import { 
  TRIAL_LIMITS, 
  checkTrialStatus,
  getTodayDateString as getToday
} from "../../shared/trial";

export interface TrialValidationResult {
  allowed: boolean;
  reason?: string;
  errorCode?: string;
  totalMinutesUsed: number;
  dailyMinutesUsed: number;
  minutesRemaining: number;
  dailyMinutesRemaining: number;
}

export async function validateTrialUsage(
  userId: string,
  audioDurationSeconds: number
): Promise<TrialValidationResult> {
  const audioDurationMinutes = audioDurationSeconds / 60;
  const today = getToday();
  
  console.log(`[trialValidation] Checking user ${userId} for ${audioDurationMinutes.toFixed(2)} minutes`);
  
  try {
    const { data: summaries, error } = await supabaseAdmin
      .from('summaries')
      .select('audio_duration, created_at')
      .eq('user_id', userId);
    
    if (error) {
      console.error('[trialValidation] Error querying summaries:', error);
      return {
        allowed: true,
        totalMinutesUsed: 0,
        dailyMinutesUsed: 0,
        minutesRemaining: TRIAL_LIMITS.MAX_AUDIO_MINUTES,
        dailyMinutesRemaining: TRIAL_LIMITS.DAILY_LIMIT_MINUTES,
      };
    }
    
    let totalMinutesUsed = 0;
    let dailyMinutesUsed = 0;
    let firstUseDateStr: string | null = null;
    
    for (const summary of summaries || []) {
      const durationSeconds = summary.audio_duration || 0;
      const durationMinutes = durationSeconds / 60;
      
      totalMinutesUsed += durationMinutes;
      
      const createdDate = summary.created_at?.split('T')[0];
      if (createdDate === today) {
        dailyMinutesUsed += durationMinutes;
      }
      
      if (summary.created_at) {
        if (!firstUseDateStr || summary.created_at < firstUseDateStr) {
          firstUseDateStr = summary.created_at;
        }
      }
    }
    
    console.log(`[trialValidation] Usage - Total: ${totalMinutesUsed.toFixed(2)} min, Today: ${dailyMinutesUsed.toFixed(2)} min, FirstUse: ${firstUseDateStr || 'new user'}`);
    
    const totalMinutesRemaining = Math.max(0, TRIAL_LIMITS.MAX_AUDIO_MINUTES - totalMinutesUsed);
    const dailyMinutesRemaining = Math.max(0, TRIAL_LIMITS.DAILY_LIMIT_MINUTES - dailyMinutesUsed);
    
    const trialCheck = checkTrialStatus({
      firstUseDateStr,
      totalMinutesUsed,
      dailyMinutesUsed,
    });
    
    if (!trialCheck.allowed) {
      console.log(`[trialValidation] BLOCKED: ${trialCheck.errorCode} - ${trialCheck.reason}`);
      return {
        allowed: false,
        reason: trialCheck.reason,
        errorCode: trialCheck.errorCode,
        totalMinutesUsed,
        dailyMinutesUsed,
        minutesRemaining: trialCheck.blockReason === 'daily_limit' ? totalMinutesRemaining : 0,
        dailyMinutesRemaining: 0,
      };
    }
    
    return {
      allowed: true,
      totalMinutesUsed,
      dailyMinutesUsed,
      minutesRemaining: totalMinutesRemaining,
      dailyMinutesRemaining,
    };
    
  } catch (err) {
    console.error('[trialValidation] Unexpected error:', err);
    return {
      allowed: true,
      totalMinutesUsed: 0,
      dailyMinutesUsed: 0,
      minutesRemaining: TRIAL_LIMITS.MAX_AUDIO_MINUTES,
      dailyMinutesRemaining: TRIAL_LIMITS.DAILY_LIMIT_MINUTES,
    };
  }
}
