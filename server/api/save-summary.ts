import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase-admin";
import { checkTrialStatus, incrementTrialUsage } from "../middleware/trialGuard";

interface SaveSummaryRequest {
  userId: string;
  title: string;
  content: string;
  transcript: string;
  keyPoints: string[];
  language: 'ar' | 'fr' | 'dz';
  audioDuration?: number; // في ثواني (seconds)
  processedAt?: string; // ISO timestamp from /api/process-audio
}

export async function saveSummary(req: Request, res: Response) {
  try {
    const { userId, title, content, transcript, keyPoints, language, audioDuration, processedAt } = req.body as SaveSummaryRequest;

    // Validate required fields
    if (!userId || !content || !language) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate audio duration
    // Accept 0 for very short clips, but reject null/undefined/negative values
    if (audioDuration === null || audioDuration === undefined || typeof audioDuration !== 'number' || audioDuration < 0) {
      return res.status(400).json({ 
        error: "Missing or invalid audio duration",
        message: "مدة التسجيل الصوتي غير صالحة"
      });
    }

    // REQUIRED: Freshness check to prevent replay attacks
    if (!processedAt || typeof processedAt !== 'string') {
      return res.status(400).json({
        error: "Missing processing timestamp",
        message: "بيانات المعالجة غير صالحة. يرجى معالجة الملف الصوتي مرة أخرى."
      });
    }

    // Validate timestamp is recent (within last 5 minutes)
    try {
      const processedTime = new Date(processedAt).getTime();
      
      if (isNaN(processedTime)) {
        return res.status(400).json({
          error: "Invalid timestamp format",
          message: "تنسيق الطابع الزمني غير صالح"
        });
      }
      
      const now = Date.now();
      const fiveMinutesMs = 5 * 60 * 1000;
      
      if (now - processedTime > fiveMinutesMs) {
        return res.status(403).json({
          error: "Stale summary data",
          message: "انتهت صلاحية البيانات. يرجى معالجة الملف الصوتي مرة أخرى."
        });
      }
      
      // Also reject future timestamps (clock skew protection)
      if (processedTime > now + 60000) { // Allow 1 minute clock skew
        return res.status(403).json({
          error: "Invalid timestamp",
          message: "الطابع الزمني غير صالح"
        });
      }
    } catch (error) {
      return res.status(400).json({
        error: "Invalid timestamp",
        message: "تنسيق الطابع الزمني غير صالح"
      });
    }

    // Sanity check: transcript length should correlate with duration
    // Very rough heuristic: ~2-4 words per second for typical speech
    // If duration is long but transcript is suspiciously short, reject it
    const wordCount = transcript.trim().split(/\s+/).length;
    const expectedMinWords = Math.max(1, Math.floor(audioDuration * 1.5)); // 1.5 words/sec minimum
    
    if (wordCount < expectedMinWords && audioDuration > 10) {
      return res.status(403).json({
        error: "Suspicious data mismatch",
        message: "البيانات المقدمة غير متسقة. يرجى معالجة الملف الصوتي مرة أخرى."
      });
    }

    // Check audio duration limit (5 minutes = 300 seconds)
    // NOTE: This is a secondary check. Primary enforcement happens in /api/process-audio
    // to prevent wasting OpenAI API calls on oversized files
    const MAX_DURATION_SECONDS = 300;
    if (audioDuration > MAX_DURATION_SECONDS) {
      return res.status(403).json({ 
        error: "Audio too long",
        message: "مدة التسجيل الصوتي تتجاوز الحد المسموح (5 دقائق). يرجى تقصير التسجيل والمحاولة مرة أخرى.",
        maxDuration: MAX_DURATION_SECONDS,
        actualDuration: audioDuration
      });
    }

    // Check trial status BEFORE saving (enforced server-side)
    const trialStatus = await checkTrialStatus(userId);
    
    // Check if trial period expired (7 days)
    if (trialStatus.isExpired) {
      return res.status(403).json({ 
        error: "Trial period expired",
        message: "انتهت الفترة التجريبية. يرجى الاشتراك لمتابعة الاستخدام.",
        trialStatus 
      });
    }

    // Check if daily limit reached
    if (!trialStatus.canSummaryToday) {
      return res.status(403).json({ 
        error: "Daily limit reached",
        message: "لقد استخدمت التلخيص المجاني اليوم. يمكنك المحاولة غدًا.",
        trialStatus 
      });
    }

    // Use PostgreSQL transaction for atomicity
    // First, save the summary
    const { data: summary, error: summaryError } = await supabaseAdmin
      .from('summaries')
      .insert({
        user_id: userId,
        title: title || content.split(' ').slice(0, 5).join(' ') + '...',
        content,
        transcript: transcript || '',
        key_points: keyPoints || [],
        language,
        audio_duration: audioDuration || null
      })
      .select()
      .single();

    if (summaryError) {
      console.error('Error saving summary:', summaryError);
      return res.status(500).json({ error: "Failed to save summary" });
    }

    // Atomically increment trial usage (will fail if concurrent updates)
    const { error: incrementError } = await supabaseAdmin.rpc('increment_trial_usage', {
      p_user_id: userId
    });

    // If RPC doesn't exist, fall back to manual update
    if (incrementError) {
      await incrementTrialUsage(userId);
    }

    // Get updated trial status
    const updatedTrialStatus = await checkTrialStatus(userId);

    res.json({
      summary,
      trialStatus: updatedTrialStatus
    });
  } catch (error) {
    console.error('Error in saveSummary:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}
