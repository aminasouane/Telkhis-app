import { Request, Response } from "express";
import * as db from "../db";
import { checkTrialStatus, incrementTrialMinutes } from "../middleware/trialGuard";
import { TRIAL_LIMITS } from "../../shared/trial";

interface SaveSummaryRequest {
  userId: string;
  title: string;
  content: string;
  transcript: string;
  keyPoints: string[];
  language: 'ar' | 'fr' | 'en' | 'dz';
  audioDuration?: number;
  processedAt?: string;
}

export async function saveSummary(req: Request, res: Response) {
  try {
    const { userId, title, content, transcript, keyPoints, language, audioDuration, processedAt } = req.body as SaveSummaryRequest;

    if (!userId || !content || !language) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (audioDuration === null || audioDuration === undefined || typeof audioDuration !== 'number' || audioDuration < 0) {
      return res.status(400).json({ 
        error: "Missing or invalid audio duration",
        message: "مدة التسجيل الصوتي غير صالحة"
      });
    }

    if (!processedAt || typeof processedAt !== 'string') {
      return res.status(400).json({
        error: "Missing processing timestamp",
        message: "بيانات المعالجة غير صالحة. يرجى معالجة الملف الصوتي مرة أخرى."
      });
    }

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
      
      if (processedTime > now + 60000) {
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

    const wordCount = transcript.trim().split(/\s+/).length;
    const expectedMinWords = Math.max(1, Math.floor(audioDuration * 1.5));
    
    if (wordCount < expectedMinWords && audioDuration > 10) {
      return res.status(403).json({
        error: "Suspicious data mismatch",
        message: "البيانات المقدمة غير متسقة. يرجى معالجة الملف الصوتي مرة أخرى."
      });
    }

    const trialStatus = await checkTrialStatus(userId);
    
    if (trialStatus.isExpired) {
      return res.status(403).json({ 
        error: "Trial expired",
        message: "انتهت التجربة المجانية. يرجى الاشتراك لمتابعة الاستخدام.",
        trialStatus 
      });
    }

    const audioMinutes = Math.round((audioDuration / 60) * 100) / 100;

    if (trialStatus.minutesUsed + audioMinutes > trialStatus.minutesLimit) {
      return res.status(403).json({ 
        error: "Trial limit exceeded",
        message: `هذا التسجيل (${audioMinutes} دقيقة) سيتجاوز حد التجربة المجانية (${trialStatus.minutesRemaining} دقيقة متبقية). يرجى الاشتراك لمتابعة الاستخدام.`,
        trialStatus,
        audioMinutes,
        minutesRemaining: trialStatus.minutesRemaining
      });
    }

    if (trialStatus.dailyMinutesUsed + audioMinutes > trialStatus.dailyLimit) {
      return res.status(403).json({ 
        error: "Daily limit exceeded",
        code: "TRIAL_DAILY_LIMIT_REACHED",
        message: `وصلت للحد اليومي (${TRIAL_LIMITS.DAILY_LIMIT_MINUTES} دقيقة). يرجى المحاولة غداً.`,
        trialStatus,
        audioMinutes
      });
    }

    const summary = db.saveSummary({
      userId,
      title: title || content.split(' ').slice(0, 5).join(' ') + '...',
      content,
      transcript: transcript || '',
      keyPoints: keyPoints || [],
      language,
      audioDuration: audioDuration || undefined
    });

    await incrementTrialMinutes(userId, audioMinutes);

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
