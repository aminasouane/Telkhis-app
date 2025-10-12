import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { transcribeAudio, summarizeText } from "./openai";

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

  // Process audio file endpoint
  app.post("/api/process-audio", upload.single("audio"), async (req: Request, res) => {
    try {
      const file = (req as any).file;
      
      if (!file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // Step 1: Transcribe audio using the buffer, filename, and mimetype
      const transcription = await transcribeAudio(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      if (!transcription || transcription.trim().length === 0) {
        return res.status(400).json({ error: "Could not transcribe audio" });
      }

      // Step 2: Summarize transcription
      const { summary, keyPoints } = await summarizeText(transcription);

      // Return results
      res.json({
        transcription,
        summary,
        keyPoints,
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
