import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { parseBuffer } from 'music-metadata';
import { transcribeAudio, summarizeText } from "./openai";
import { createGuestSession } from "./api/guest-session";
import { saveSummary } from "./api/save-summary";
import { getSummaries, getSummaryById, deleteSummary } from "./api/summaries";
import { migrateGuest } from "./api/migrate-guest";
import { getTrialStatus } from "./api/trial-status";
import { upsertUser, getUserSettings, updateUserSettings } from "./api/user";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedMimes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/m4a",
      "audio/ogg",
      "audio/webm",
    ];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith("audio/")) {
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

  // Live summary endpoint - processes audio chunks during recording
  app.post("/api/process-audio-live", upload.single("audio"), async (req: Request, res) => {
    try {
      const file = (req as any).file;
      const language = req.body.language || "ar";
      
      if (!file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // Validate language
      const validLanguages = ["ar", "fr", "dz"];
      if (!validLanguages.includes(language)) {
        return res.status(400).json({ error: "Invalid language selection" });
      }

      // Calculate and validate audio duration (same security checks as main endpoint)
      let audioDuration: number;
      try {
        const metadata = await parseBuffer(file.buffer, {
          mimeType: file.mimetype
        });
        
        if (!metadata.format.duration) {
          return res.status(422).json({
            error: "لا يمكن قراءة مدة الملف الصوتي",
            errorCode: "METADATA_MISSING"
          });
        }
        
        audioDuration = Math.ceil(metadata.format.duration);
        
        // Enforce 5-minute duration limit BEFORE AI processing
        if (audioDuration > 300) {
          return res.status(403).json({
            error: "مدة التسجيل الصوتي تتجاوز الحد المسموح (5 دقائق)",
            errorCode: "DURATION_EXCEEDED",
            duration: audioDuration,
            maxDuration: 300
          });
        }
      } catch (metadataError) {
        console.error("Error parsing live audio metadata:", metadataError);
        // Hard fail to prevent bypass
        return res.status(422).json({
          error: "فشل قراءة معلومات الملف الصوتي",
          errorCode: "METADATA_PARSE_ERROR"
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

      // Return partial results
      res.json({
        transcription,
        summary,
        keyPoints,
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
      
      if (!file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // Validate language
      const validLanguages = ["ar", "fr", "dz"];
      if (!validLanguages.includes(language)) {
        return res.status(400).json({ error: "Invalid language selection" });
      }

      // Calculate audio duration server-side (security: don't trust client)
      let audioDuration: number;
      try {
        const metadata = await parseBuffer(file.buffer, {
          mimeType: file.mimetype
        });
        
        if (!metadata.format.duration) {
          return res.status(422).json({
            error: "لا يمكن قراءة مدة الملف الصوتي. يرجى التأكد من أن الملف صحيح والمحاولة مرة أخرى.",
            errorCode: "METADATA_MISSING"
          });
        }
        
        audioDuration = Math.ceil(metadata.format.duration);
        
        // Enforce 5-minute (300 second) duration limit BEFORE AI processing
        if (audioDuration > 300) {
          return res.status(403).json({
            error: "مدة التسجيل الصوتي تتجاوز الحد المسموح (5 دقائق). يرجى تقصير التسجيل والمحاولة مرة أخرى.",
            errorCode: "DURATION_EXCEEDED",
            duration: audioDuration,
            maxDuration: 300
          });
        }
      } catch (metadataError) {
        console.error("Error parsing audio metadata:", metadataError);
        // Hard fail if we can't parse metadata - security measure to prevent bypass
        return res.status(422).json({
          error: "فشل قراءة معلومات الملف الصوتي. يرجى التأكد من تنسيق الملف والمحاولة مرة أخرى.",
          errorCode: "METADATA_PARSE_ERROR"
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

      // Return results with duration (server-calculated, trusted value)
      // Note: duration is now server-authoritative and should be used for all trial checks
      res.json({
        transcription,
        summary,
        keyPoints,
        audioDuration,
        // Add a server timestamp for freshness validation
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
