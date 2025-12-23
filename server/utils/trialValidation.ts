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
    }
    
    console.log(`[trialValidation] Usage - Total: ${totalMinutesUsed.toFixed(2)} min, Today: ${dailyMinutesUsed.toFixed(2)} min`);
    
    const minutesRemaining = Math.max(0, TRIAL_CONFIG.MAX_AUDIO_MINUTES - totalMinutesUsed);
    const dailyMinutesRemaining = Math.max(0, TRIAL_CONFIG.DAILY_LIMIT_MINUTES - dailyMinutesUsed);
    
    // Check total limit
    if (totalMinutesUsed >= TRIAL_CONFIG.MAX_AUDIO_MINUTES) {
      return {
        allowed: false,
        reason: `لقد استخدمت كامل الوقت المجاني (${TRIAL_CONFIG.MAX_AUDIO_MINUTES} دقيقة)`,
        errorCode: "TRIAL_EXHAUSTED",
        totalMinutesUsed,
        dailyMinutesUsed,
        minutesRemaining,
        dailyMinutesRemaining,
      };
    }
    
    // Check if remaining minutes are sufficient
    if (minutesRemaining < audioDurationMinutes) {
      return {
        allowed: false,
        reason: `مدة الملف (${audioDurationMinutes.toFixed(1)} دقيقة) أكبر من الرصيد المتبقي (${minutesRemaining.toFixed(1)} دقيقة)`,
        errorCode: "INSUFFICIENT_TOTAL",
        totalMinutesUsed,
        dailyMinutesUsed,
        minutesRemaining,
        dailyMinutesRemaining,
      };
    }
    
    // Check daily limit
    if (dailyMinutesUsed >= TRIAL_CONFIG.DAILY_LIMIT_MINUTES) {
      return {
        allowed: false,
        reason: `لقد وصلت للحد اليومي (${TRIAL_CONFIG.DAILY_LIMIT_MINUTES} دقيقة). يمكنك المتابعة غداً.`,
        errorCode: "DAILY_LIMIT_REACHED",
        totalMinutesUsed,
        dailyMinutesUsed,
        minutesRemaining,
        dailyMinutesRemaining,
      };
    }
    
    // Check if daily remaining is sufficient
    if (dailyMinutesRemaining < audioDurationMinutes) {
      return {
        allowed: false,
        reason: `الحد اليومي: تبقى ${dailyMinutesRemaining.toFixed(1)} دقيقة فقط اليوم. مدة الملف: ${audioDurationMinutes.toFixed(1)} دقيقة`,
        errorCode: "INSUFFICIENT_DAILY",
        totalMinutesUsed,
        dailyMinutesUsed,
        minutesRemaining,
        dailyMinutesRemaining,
      };
    }
    
    // All checks passed
    return {
      allowed: true,
      totalMinutesUsed,
      dailyMinutesUsed,
      minutesRemaining,
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
