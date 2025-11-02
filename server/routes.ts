import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import bodyParser from "body-parser";
import { transcribeAudio, summarizeText } from "./openai";
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

      // Step 2: Quick summarization for live preview
      const { summary, keyPoints } = await summarizeText(transcription, language);

      // Return partial results with duration from client if provided
      res.json({
        transcription,
        summary,
        keyPoints,
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
          error: "مدة التسجيل الصوتي تتجاوز الحد المسموح (5 دقائق). يرجى تقصير التسجيل والمحاولة مرة أخرى.",
          errorCode: "DURATION_EXCEEDED",
          duration: audioDuration,
          maxDuration: 300
        });
      }

      // Step 1: Transcribe audio using the buffer, filename, mimetype, and language
      const transcription = await transcribeAudio(
        file.buffer,
        file.originalname,
        file.mimetype,
        language
      );

      if (!transcription || transcription.trim().length === 0) {
        return res.status(400).json({ error: "Could not transcribe audio" });
      }

      // Step 2: Summarize transcription with language context
      const { summary, keyPoints } = await summarizeText(transcription, language);

      // Return results with duration (from client if provided)
      res.json({
        transcription,
        summary,
        keyPoints,
        audioDuration: audioDuration || null,
        processedAt: new Date().toISOString(),
      });
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
