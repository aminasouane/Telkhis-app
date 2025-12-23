import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import bodyParser from "body-parser";
import { transcribeAudio } from "./openai";
import { summarizeWithGrok } from "./services/summarizeWithGrok";
import { validateAndGetDuration } from "./utils/audioDuration";
import { validateTrialUsage } from "./utils/trialValidation";
import { supabaseAdmin } from "./supabase-admin";
import { createGuestSession } from "./api/guest-session";
import { saveSummary } from "./api/save-summary";
import { getSummaries, getSummaryById, deleteSummary } from "./api/summaries";
import { migrateGuest } from "./api/migrate-guest";
import { getTrialStatus } from "./api/trial-status";
import { upsertUser, getUserSettings, updateUserSettings } from "./api/user";
import { handleCreateCheckout } from "./api/chargily-checkout";
import { handleChargilyWebhook } from "./api/chargily-webhook";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    // Allow all audio mimetypes including webm with codecs
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only audio files are allowed."));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Secure API endpoints for guest and user management
  app.post("/api/guest-session", createGuestSession);
  app.post("/api/save-summary", saveSummary);
  app.get("/api/summaries", getSummaries);
  app.get("/api/summaries/:id", getSummaryById);
  app.delete("/api/summaries/:id", deleteSummary);
  app.post("/api/migrate-guest", migrateGuest);
  app.get("/api/trial-status", getTrialStatus);
  
  // User management endpoints
  app.post("/api/user/upsert", upsertUser);
  app.get("/api/user/settings", getUserSettings);
  app.post("/api/user/settings", updateUserSettings);

  // Payment status endpoint
  const { getLatestPayment } = await import("./api/payment-status");
  app.get("/api/payment/latest", getLatestPayment);

  // Payment link endpoint (for direct Chargily links)
  const { getPaymentLink, checkPaymentLinksStatus } = await import("./api/payment-link");
  app.get("/api/payment-link/:planId", getPaymentLink);
  app.get("/api/payment-links/status", checkPaymentLinksStatus);

  // Chargily Pay endpoints (with authentication)
  const { requireAuth } = await import("./middleware/auth");
  app.post("/api/chargily/create-checkout", requireAuth, handleCreateCheckout);
  
  // Webhook endpoint with raw body capture for signature verification
  app.post(
    "/api/chargily/webhook",
    bodyParser.json({
      verify: (req: Request, _res, buf: Buffer) => {
        (req as any).rawBody = buf;
      },
    }),
    handleChargilyWebhook
  );

  // Standalone summarization endpoint using Grok API
  app.post("/api/summarize", async (req: Request, res) => {
    try {
      const { transcript, language = "ar" } = req.body;

      if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
        return res.status(400).json({ error: "Transcript is required" });
      }

      const validLanguages = ["ar", "fr", "dz"];
      if (!validLanguages.includes(language)) {
        return res.status(400).json({ error: "Invalid language selection" });
      }

      const result = await summarizeWithGrok({
        transcript: transcript.trim(),
        language: language as "ar" | "fr" | "dz",
      });

      res.json({
        summary: result.summary,
        keyPoints: result.keyPoints,
        processingTime: result.processingTime,
      });
    } catch (error: any) {
      console.error("Error in /api/summarize:", error);

      if (error.message?.includes("XAI_API_KEY")) {
        return res.status(500).json({
          error: "XAI API key is not configured",
        });
      }

      res.status(500).json({
        error: error.message || "Failed to summarize text",
      });
    }
  });

  // Live summary endpoint - processes audio chunks during recording
  app.post("/api/process-audio-live", upload.single("audio"), async (req: Request, res) => {
    try {
      const file = (req as any).file;
      const language = req.body.language || "ar";
      const audioDuration = req.body.audioDuration ? parseFloat(req.body.audioDuration) : null;
      
      if (!file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // Validate language
      const validLanguages = ["ar", "fr", "dz"];
      if (!validLanguages.includes(language)) {
        return res.status(400).json({ error: "Invalid language selection" });
      }

      // Optional: Enforce 5-minute duration limit if duration is provided
      if (audioDuration && audioDuration > 300) {
        return res.status(403).json({
          error: "مدة التسجيل الصوتي تتجاوز الحد المسموح (5 دقائق)",
          errorCode: "DURATION_EXCEEDED",
          duration: audioDuration,
          maxDuration: 300
        });
      }

      // Step 1: Transcribe audio
      const transcription = await transcribeAudio(
        file.buffer,
        file.originalname,
        file.mimetype,
        language
      );

      if (!transcription || transcription.trim().length === 0) {
        return res.json({
          transcription: "",
          summary: "",
          keyPoints: [],
        });
      }

      // Step 2: Quick summarization for live preview using Grok API
      const grokResult = await summarizeWithGrok({
        transcript: transcription,
        language: language as "ar" | "fr" | "dz",
      });

      // Return partial results with duration from client if provided
      res.json({
        transcription,
        summary: grokResult.summary,
        keyPoints: grokResult.keyPoints || [],
        audioDuration: audioDuration || null,
        processedAt: new Date().toISOString(),
        isLive: true,
      });
    } catch (error: any) {
      console.error("Error in live processing:", error);
      
      // Return empty response on error to not break recording
      res.json({
        transcription: "",
        summary: "",
        keyPoints: [],
        error: error.message || "Failed to process audio chunk",
      });
    }
  });

  // Process audio file endpoint (final processing)
  app.post("/api/process-audio", upload.single("audio"), async (req: Request, res) => {
    try {
      const file = (req as any).file;
      const language = req.body.language || "ar"; // Default to Arabic
      const clientDuration = req.body.audioDuration ? parseFloat(req.body.audioDuration) : null;
      const userId = req.body.userId || req.headers['x-user-id'] as string;
      
      if (!file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // REQUIRED: userId must be present for trial validation - prevents bypass
      if (!userId) {
        return res.status(401).json({ 
          error: "User ID required",
          errorCode: "UNAUTHORIZED",
          message: "يجب تسجيل الدخول لاستخدام هذه الخدمة"
        });
      }

      // Validate language
      const validLanguages = ["ar", "fr", "dz"];
      if (!validLanguages.includes(language)) {
        return res.status(400).json({ error: "Invalid language selection" });
      }

      // Get authoritative duration from server (with client as fallback)
      const durationResult = await validateAndGetDuration(
        file.buffer,
        file.mimetype,
        clientDuration
      );
      const audioDuration = durationResult.duration;
      
      console.log(`[process-audio] Duration: ${audioDuration.toFixed(2)}s (source: ${durationResult.source})`);

      // Enforce 5-minute duration limit using server-validated duration
      if (audioDuration > 300) {
        return res.status(403).json({
          error: "مدة التسجيل الصوتي تتجاوز الحد المسموح (5 دقائق). يرجى تقصير التسجيل والمحاولة مرة أخرى.",
          errorCode: "DURATION_EXCEEDED",
          duration: audioDuration,
          maxDuration: 300
        });
      }

      // SERVER-SIDE TRIAL VALIDATION (INFORMATIONAL ONLY)
      // MVP RULE: Current operation ALWAYS completes - blocking only affects NEXT attempt
      // The recording has already started, so we MUST process it and return results
      const trialValidation = await validateTrialUsage(userId, audioDuration);
      
      // Log current status but DO NOT BLOCK - user has already started recording
      if (!trialValidation.allowed) {
        console.log(`[process-audio] User ${userId} at limit (${trialValidation.errorCode}) - but completing current operation`);
      } else {
        console.log(`[process-audio] User ${userId} trial OK. Usage: total=${trialValidation.totalMinutesUsed.toFixed(2)}min, today=${trialValidation.dailyMinutesUsed.toFixed(2)}min`);
      }
      
      // Store current limit status to include in response (for client to show appropriate UI after completion)
      const wasAtLimit = !trialValidation.allowed;
      const limitReason = trialValidation.errorCode;

      // Step 1: Transcribe audio using the buffer, filename, mimetype, and language
      console.log(`[process-audio] Starting transcription...`);
      const transcription = await transcribeAudio(
        file.buffer,
        file.originalname,
        file.mimetype,
        language
      );

      // Validate transcript before proceeding
      if (!transcription || transcription.trim().length === 0) {
        console.log(`[process-audio] ERROR: Transcript is empty or null`);
        return res.status(400).json({ error: "Could not transcribe audio" });
      }
      
      console.log(`[process-audio] Transcript ready, length = ${transcription.length} chars`);

      // Step 2: Summarize transcription using Grok API (non-streaming, full response)
      console.log(`[process-audio] Starting Grok summarization (non-streaming)...`);
      const grokResult = await summarizeWithGrok({
        transcript: transcription,
        language: language as "ar" | "fr" | "dz",
      });
      console.log(`[process-audio] Grok response received. Summary length = ${grokResult.summary?.length || 0} chars`);

      const processedAt = new Date().toISOString();
      
      // Step 3: Try to save summary to database (non-blocking - user gets result even if save fails)
      const title = grokResult.summary.split(' ').slice(0, 5).join(' ') + '...';
      
      let savedSummary = null;
      let saveError = null;
      
      try {
        const result = await supabaseAdmin
          .from('summaries')
          .insert({
            user_id: userId,
            title,
            content: grokResult.summary,
            transcript: transcription,
            key_points: grokResult.keyPoints || [],
            language,
            audio_duration: audioDuration,
          })
          .select()
          .single();
        
        savedSummary = result.data;
        saveError = result.error;
        
        if (saveError) {
          console.error('[process-audio] WARNING: Failed to save summary (will still return result):', saveError);
        } else {
          console.log(`[process-audio] Summary saved. ID: ${savedSummary?.id}, Duration: ${audioDuration}s`);
        }
      } catch (dbError: any) {
        console.error('[process-audio] WARNING: Database error (will still return result):', dbError.message);
      }
      
      // ALWAYS return summary to user, even if save failed

      // Calculate post-save usage to inform client about NEXT attempt
      const audioDurationMinutes = audioDuration / 60;
      const newDailyUsage = trialValidation.dailyMinutesUsed + audioDurationMinutes;
      const newDailyRemaining = Math.max(0, 30 - newDailyUsage); // 30 min daily limit
      
      // Determine if next attempt will be blocked (daily limit OR trial expiry)
      const isDailyLimitReached = newDailyRemaining <= 0;
      const isTrialExpired = limitReason === "TRIAL_EXPIRED";
      const nextBlocked = isDailyLimitReached || isTrialExpired;
      const nextBlockReason = isTrialExpired ? "days_expired" : (isDailyLimitReached ? "daily_limit" : null);
      
      // Return results with server-validated duration (authoritative for usage tracking)
      // Include trial info so client can show appropriate modals for NEXT attempt
      const responsePayload = {
        transcription,
        summary: grokResult.summary,
        keyPoints: grokResult.keyPoints || [],
        audioDuration: audioDuration, // Server-validated duration in seconds
        durationSource: durationResult.source, // For debugging
        processedAt,
        savedSummaryId: savedSummary?.id || null, // Let client know if save succeeded
        // Trial status for client to update local state and show modals
        trialStatus: {
          wasAtLimit, // Was user already at limit before this request?
          limitReason, // Which limit was reached (if any)
          totalMinutesUsed: trialValidation.totalMinutesUsed + audioDurationMinutes,
          dailyMinutesUsed: newDailyUsage,
          dailyMinutesRemaining: newDailyRemaining,
          nextBlocked, // Will next attempt be blocked (daily or expiry)?
          nextBlockReason, // Reason for next block: 'daily_limit' or 'days_expired'
        },
      };
      
      console.log(`[process-audio] Sending response to client. Summary length = ${responsePayload.summary?.length || 0}, Transcript length = ${responsePayload.transcription?.length || 0}`);
      res.json(responsePayload);
    } catch (error: any) {
      console.error("Error processing audio:", error);
      
      // Check if it's an API key error
      if (error.message?.includes("OPENAI_API_KEY")) {
        return res.status(500).json({
          error: "OpenAI API key is not configured. Please add OPENAI_API_KEY to environment variables.",
        });
      }
      
      res.status(500).json({
        error: error.message || "Failed to process audio",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
