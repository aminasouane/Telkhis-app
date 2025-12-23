import { supabaseAdmin } from "../supabase-admin";

const TRIAL_CONFIG = {
  MAX_AUDIO_MINUTES: 30,
  DAILY_LIMIT_MINUTES: 30,
  VALIDITY_DAYS: 7,
  MAX_FILE_DURATION_SECONDS: 300, // 5 minutes per file
};

export interface TrialValidationResult {
  allowed: boolean;
  reason?: string;
  errorCode?: string;
  totalMinutesUsed: number;
  dailyMinutesUsed: number;
  minutesRemaining: number;
  dailyMinutesRemaining: number;
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

// TEMPORARY: Set to true to bypass all trial checks for debugging
const TRIAL_BYPASS_ENABLED = true;

export async function validateTrialUsage(
  userId: string,
  audioDurationSeconds: number
): Promise<TrialValidationResult> {
  const audioDurationMinutes = audioDurationSeconds / 60;
  const today = getTodayDateString();
  
  console.log(`[trialValidation] Checking user ${userId} for ${audioDurationMinutes.toFixed(2)} minutes`);
  
  // TEMPORARY BYPASS: Skip all trial checks for debugging
  if (TRIAL_BYPASS_ENABLED) {
    console.log(`[trialValidation] BYPASS ENABLED - allowing all requests`);
    return {
      allowed: true,
      totalMinutesUsed: 0,
      dailyMinutesUsed: 0,
      minutesRemaining: 30,
      dailyMinutesRemaining: 30,
    };
  }
  
  try {
    // Query total usage from summaries table
    const { data: summaries, error } = await supabaseAdmin
      .from('summaries')
      .select('audio_duration, created_at')
      .eq('user_id', userId);
    
    if (error) {
      console.error('[trialValidation] Error querying summaries:', error);
      // On error, allow the request (fail open for MVP)
      return {
        allowed: true,
        totalMinutesUsed: 0,
        dailyMinutesUsed: 0,
        minutesRemaining: TRIAL_CONFIG.MAX_AUDIO_MINUTES,
        dailyMinutesRemaining: TRIAL_CONFIG.DAILY_LIMIT_MINUTES,
      };
    }
    
    // Calculate total and daily usage from database
    let totalMinutesUsed = 0;
    let dailyMinutesUsed = 0;
    let firstUseDate: Date | null = null;
    
    for (const summary of summaries || []) {
      // audio_duration is stored in seconds
      const durationSeconds = summary.audio_duration || 0;
      const durationMinutes = durationSeconds / 60;
      
      totalMinutesUsed += durationMinutes;
      
      // Check if this summary was created today
      const createdDate = summary.created_at?.split('T')[0];
      if (createdDate === today) {
        dailyMinutesUsed += durationMinutes;
      }
      
      // Track earliest summary date as first use date
      if (summary.created_at) {
        const summaryDate = new Date(summary.created_at);
        if (!firstUseDate || summaryDate < firstUseDate) {
          firstUseDate = summaryDate;
        }
      }
    }
    
    console.log(`[trialValidation] Usage - Total: ${totalMinutesUsed.toFixed(2)} min, Today: ${dailyMinutesUsed.toFixed(2)} min, FirstUse: ${firstUseDate?.toISOString() || 'new user'}`);
    
    // Calculate both total and daily remaining for analytics
    const totalMinutesRemaining = Math.max(0, TRIAL_CONFIG.MAX_AUDIO_MINUTES - totalMinutesUsed);
    const dailyMinutesRemaining = Math.max(0, TRIAL_CONFIG.DAILY_LIMIT_MINUTES - dailyMinutesUsed);
    
    // MVP LOGIC:
    // 1. Check date expiry (7 days from first use)
    // 2. Check daily limit (30 minutes per day)
    // 3. NO total limit check - users get 30 min/day for 7 days
    
    // Check 1: 7-day trial expiry (server-side enforcement)
    if (firstUseDate) {
      const now = new Date();
      const daysPassed = Math.floor((now.getTime() - firstUseDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPassed >= TRIAL_CONFIG.VALIDITY_DAYS) {
        console.log(`[trialValidation] Trial expired: ${daysPassed} days since first use`);
        return {
          allowed: false,
          reason: `انتهت صلاحية التجربة المجانية بعد ${TRIAL_CONFIG.VALIDITY_DAYS} أيام`,
          errorCode: "TRIAL_EXPIRED",
          totalMinutesUsed,
          dailyMinutesUsed,
          minutesRemaining: 0,
          dailyMinutesRemaining: 0,
        };
      }
    }
    
    // Check 2: Daily limit - block if ALREADY at or over limit
    if (dailyMinutesUsed >= TRIAL_CONFIG.DAILY_LIMIT_MINUTES) {
      return {
        allowed: false,
        reason: `لقد وصلت للحد اليومي (${TRIAL_CONFIG.DAILY_LIMIT_MINUTES} دقيقة). يمكنك المتابعة غداً.`,
        errorCode: "DAILY_LIMIT_REACHED",
        totalMinutesUsed,
        dailyMinutesUsed,
        minutesRemaining: totalMinutesRemaining, // Analytics: total remaining
        dailyMinutesRemaining,
      };
    }
    
    // NO total limit check for MVP
    // totalMinutesUsed is kept for analytics/history only
    
    // All checks passed - current operation can proceed
    return {
      allowed: true,
      totalMinutesUsed,
      dailyMinutesUsed,
      minutesRemaining: totalMinutesRemaining, // Analytics: total remaining
      dailyMinutesRemaining,
    };
    
  } catch (err) {
    console.error('[trialValidation] Unexpected error:', err);
    // Fail open for MVP - allow the request if validation fails
    return {
      allowed: true,
      totalMinutesUsed: 0,
      dailyMinutesUsed: 0,
      minutesRemaining: TRIAL_CONFIG.MAX_AUDIO_MINUTES,
      dailyMinutesRemaining: TRIAL_CONFIG.DAILY_LIMIT_MINUTES,
    };
  }
}
