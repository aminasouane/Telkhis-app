import { supabaseAdmin } from "../supabase-admin";

const TRIAL_CONFIG = {
  MAX_AUDIO_MINUTES: 210, // 30 × 7 days = 210 total
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

export async function validateTrialUsage(
  userId: string,
  audioDurationSeconds: number
): Promise<TrialValidationResult> {
  const audioDurationMinutes = audioDurationSeconds / 60;
  const today = getTodayDateString();
  
  console.log(`[trialValidation] Checking user ${userId} for ${audioDurationMinutes.toFixed(2)} minutes`);
  
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
    
    // ============================================================
    // TRIAL LIMITS (MVP v3.1):
    // 1. 7 days validity from first use
    // 2. 30 minutes per day (resets at midnight)
    // 
    // NOTE: totalMinutesUsed is tracked for ANALYTICS only.
    // NO blocking based on total - user gets 30 min/day for 7 days.
    // ============================================================
    
    // Check 1: 7-day trial expiry
    if (firstUseDate) {
      const now = new Date();
      const daysPassed = Math.floor((now.getTime() - firstUseDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPassed >= TRIAL_CONFIG.VALIDITY_DAYS) {
        console.log(`[trialValidation] Trial expired: ${daysPassed} days since first use`);
        return {
          allowed: false,
          reason: `انتهت صلاحية التجربة المجانية بعد ${TRIAL_CONFIG.VALIDITY_DAYS} أيام`,
          errorCode: "TRIAL_DAYS_EXPIRED",
          totalMinutesUsed,
          dailyMinutesUsed,
          minutesRemaining: 0,
          dailyMinutesRemaining: 0,
        };
      }
    }
    
    // Check 2: Daily limit (30 minutes per day)
    if (dailyMinutesUsed >= TRIAL_CONFIG.DAILY_LIMIT_MINUTES) {
      console.log(`[trialValidation] Daily limit reached: ${dailyMinutesUsed.toFixed(2)} / ${TRIAL_CONFIG.DAILY_LIMIT_MINUTES} minutes used today`);
      return {
        allowed: false,
        reason: `لقد استهلكت ${TRIAL_CONFIG.DAILY_LIMIT_MINUTES} دقيقة اليوم. يمكنك المتابعة غداً.`,
        errorCode: "TRIAL_DAILY_LIMIT_REACHED",
        totalMinutesUsed,
        dailyMinutesUsed,
        minutesRemaining: totalMinutesRemaining,
        dailyMinutesRemaining: 0,
      };
    }
    
    // NO Check 3: totalMinutesUsed is NOT used for blocking
    // User gets 30 min/day for 7 days - total is tracked for analytics only
    
    // All checks passed - user can proceed
    return {
      allowed: true,
      totalMinutesUsed,
      dailyMinutesUsed,
      minutesRemaining: totalMinutesRemaining,
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
