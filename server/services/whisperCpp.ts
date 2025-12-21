import { nodewhisper } from "nodejs-whisper";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { randomUUID } from "crypto";

const MODELS_DIR = path.join(process.cwd(), "whisper-models");
const MODEL_NAME = "small";
const MAX_AUDIO_DURATION_SECONDS = 30 * 60;

let modelInitialized = false;
let initializationPromise: Promise<void> | null = null;

export async function ensureModelReady(): Promise<void> {
  if (modelInitialized) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      if (!fs.existsSync(MODELS_DIR)) {
        fs.mkdirSync(MODELS_DIR, { recursive: true });
      }

      console.log(`[whisper.cpp] Model directory: ${MODELS_DIR}`);
      console.log(`[whisper.cpp] Using model: ${MODEL_NAME}`);
      console.log(`[whisper.cpp] Model will be auto-downloaded on first use`);

      modelInitialized = true;
    } catch (error) {
      console.error("[whisper.cpp] Failed to initialize:", error);
      throw error;
    }
  })();

  return initializationPromise;
}

export async function transcribeWithWhisperCpp(
  audioBuffer: Buffer,
  filename: string,
  language: string = "ar"
): Promise<string> {
  await ensureModelReady();

  const tempId = randomUUID();
  const tempDir = path.join(os.tmpdir(), `whisper-${tempId}`);
  const tempInputPath = path.join(tempDir, filename);

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(tempInputPath, audioBuffer);

    const whisperLanguage = language === "dz" ? "ar" : language;

    console.log(`[whisper.cpp] Transcribing: ${filename}`);
    console.log(`[whisper.cpp] Language: ${whisperLanguage}`);

    const result = await nodewhisper(tempInputPath, {
      modelName: MODEL_NAME,
      autoDownloadModelName: MODEL_NAME,
      removeWavFileAfterTranscription: true,
      withCuda: false,
      whisperOptions: {
        outputInText: true,
        outputInSrt: false,
        outputInVtt: false,
        outputInCsv: false,
        outputInJson: false,
        translateToEnglish: false,
        language: whisperLanguage,
        wordTimestamps: false,
      },
    });

    console.log(`[whisper.cpp] Transcription complete`);

    if (typeof result === "string") {
      return result.trim();
    }

    if (Array.isArray(result)) {
      return result
        .map((segment: any) => segment.speech || segment.text || "")
        .join(" ")
        .trim();
    }

    if (result && typeof result === "object" && "text" in result) {
      return (result as any).text.trim();
    }

    console.warn("[whisper.cpp] Unexpected result format:", typeof result);
    return String(result || "").trim();
  } catch (error: any) {
    console.error("[whisper.cpp] Transcription error:", error);
    throw new Error(`Whisper transcription failed: ${error.message}`);
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.warn("[whisper.cpp] Failed to cleanup temp files:", cleanupError);
    }
  }
}

export function isWhisperCppAvailable(): boolean {
  return modelInitialized;
}

export function getWhisperCppConfig() {
  return {
    modelName: MODEL_NAME,
    modelsDir: MODELS_DIR,
    maxDurationSeconds: MAX_AUDIO_DURATION_SECONDS,
    initialized: modelInitialized,
  };
}
