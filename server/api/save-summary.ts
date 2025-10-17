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
}

export async function saveSummary(req: Request, res: Response) {
  try {
    const { userId, title, content, transcript, keyPoints, language } = req.body as SaveSummaryRequest;

    // Validate required fields
    if (!userId || !content || !language) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check trial status BEFORE saving (enforced server-side)
    const trialStatus = await checkTrialStatus(userId);
    if (trialStatus.isExpired) {
      return res.status(403).json({ 
        error: "Trial expired",
        trialStatus 
      });
    }

    // Atomically save summary and increment trial usage
    const { data: summary, error: summaryError } = await supabaseAdmin
      .from('summaries')
      .insert({
        user_id: userId,
        title: title || content.split(' ').slice(0, 5).join(' ') + '...',
        content,
        transcript: transcript || '',
        key_points: keyPoints || [],
        language,
        shared: false
      })
      .select()
      .single();

    if (summaryError) {
      console.error('Error saving summary:', summaryError);
      return res.status(500).json({ error: "Failed to save summary" });
    }

    // Increment trial usage count
    await incrementTrialUsage(userId);

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
