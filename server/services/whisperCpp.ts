import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { randomUUID } from "crypto";
import { exec, spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const WHISPER_DIR = path.join(process.cwd(), "whisper.cpp");
const MODELS_DIR = path.join(WHISPER_DIR, "models");
const WHISPER_BINARY = path.join(WHISPER_DIR, "main");
const MODEL_NAME = "small";
const MODEL_FILE = `ggml-${MODEL_NAME}.bin`;
const MODEL_PATH = path.join(MODELS_DIR, MODEL_FILE);
const MAX_AUDIO_DURATION_SECONDS = 30 * 60;

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

async function checkFfmpegAvailable(): Promise<boolean> {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}

async function prepareAudioForWhisper(inputPath: string, outputPath: string): Promise<void> {
  try {
    console.log(`[whisper.cpp] Converting audio to WAV (16kHz, mono, PCM 16-bit)...`);
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}" 2>&1`
    );
    console.log(`[whisper.cpp] Audio conversion successful`);
  } catch (error: any) {
    console.error("[whisper.cpp] Audio conversion failed:", error);
    throw new Error("فشل تحويل الملف الصوتي. يرجى المحاولة بملف آخر.");
  }
}

async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    const duration = parseFloat(stdout.trim());
    if (isNaN(duration) || duration <= 0) {
      throw new Error("Invalid duration value returned from ffprobe");
    }
    return duration;
  } catch (error: any) {
    console.error("[whisper.cpp] Failed to determine audio duration:", error);
    throw new Error(`Cannot verify audio duration: ${error.message}`);
  }
}

async function cloneWhisperCpp(): Promise<void> {
  if (fs.existsSync(WHISPER_DIR)) {
    console.log("[whisper.cpp] Repository already exists");
    return;
  }

  console.log("[whisper.cpp] Cloning whisper.cpp repository...");
  await execAsync(`git clone --depth 1 https://github.com/ggerganov/whisper.cpp "${WHISPER_DIR}"`);
  console.log("[whisper.cpp] Clone complete");
}

async function buildWhisperCpp(): Promise<void> {
  if (fs.existsSync(WHISPER_BINARY)) {
    console.log("[whisper.cpp] Binary already exists");
    return;
  }

  console.log("[whisper.cpp] Building whisper.cpp (this may take a few minutes)...");
  await execAsync(`cd "${WHISPER_DIR}" && make -j4`, { timeout: 600000 });
  
  if (!fs.existsSync(WHISPER_BINARY)) {
    throw new Error("Build failed: whisper binary not found after make");
  }
  console.log("[whisper.cpp] Build complete");
}

async function downloadModel(): Promise<void> {
  if (fs.existsSync(MODEL_PATH)) {
    console.log(`[whisper.cpp] Model ${MODEL_NAME} already exists`);
    return;
  }

  console.log(`[whisper.cpp] Downloading model: ${MODEL_NAME}...`);
  const downloadScript = path.join(MODELS_DIR, "download-ggml-model.sh");
  
  if (!fs.existsSync(downloadScript)) {
    throw new Error("Model download script not found");
  }

  await execAsync(`cd "${MODELS_DIR}" && bash download-ggml-model.sh ${MODEL_NAME}`, { 
    timeout: 600000 
  });

  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error(`Model download failed: ${MODEL_FILE} not found`);
  }
  console.log(`[whisper.cpp] Model ${MODEL_NAME} downloaded successfully`);
}

export async function ensureModelReady(): Promise<void> {
  if (isInitialized) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const ffmpegAvailable = await checkFfmpegAvailable();
      if (!ffmpegAvailable) {
        throw new Error("FFmpeg is not available. Audio transcription requires FFmpeg.");
      }
      console.log(`[whisper.cpp] FFmpeg: available`);

      try {
        await execAsync("ffprobe -version");
        console.log(`[whisper.cpp] FFprobe: available`);
      } catch {
        throw new Error("FFprobe is not available. Audio duration verification requires FFprobe.");
      }

      try {
        await execAsync("make --version");
        console.log(`[whisper.cpp] Make: available`);
      } catch {
        throw new Error("Make is not available. Building whisper.cpp requires Make.");
      }

      try {
        await execAsync("g++ --version");
        console.log(`[whisper.cpp] G++: available`);
      } catch {
        throw new Error("G++ is not available. Building whisper.cpp requires G++.");
      }

      await cloneWhisperCpp();
      await buildWhisperCpp();
      await downloadModel();

      isInitialized = true;
      console.log("[whisper.cpp] Initialization complete - ready for transcription");
    } catch (error) {
      console.error("[whisper.cpp] Failed to initialize:", error);
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

function runWhisperBinary(wavPath: string, language: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "-m", MODEL_PATH,
      "-f", wavPath,
      "-l", language,
      "--no-timestamps",
      "-otxt"
    ];

    console.log(`[whisper.cpp] Running: ${WHISPER_BINARY} ${args.join(" ")}`);

    const process = spawn(WHISPER_BINARY, args, {
      cwd: WHISPER_DIR,
      timeout: 300000
    });

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code !== 0) {
        console.error(`[whisper.cpp] Process exited with code ${code}`);
        console.error(`[whisper.cpp] stderr: ${stderr}`);
        reject(new Error(`Whisper process failed with code ${code}: ${stderr}`));
        return;
      }

      const txtFile = wavPath + ".txt";
      if (fs.existsSync(txtFile)) {
        const text = fs.readFileSync(txtFile, "utf-8").trim();
        try {
          fs.unlinkSync(txtFile);
        } catch {}
        resolve(text);
      } else if (stdout.trim()) {
        resolve(stdout.trim());
      } else {
        reject(new Error("No transcription output found"));
      }
    });

    process.on("error", (error) => {
      reject(new Error(`Failed to spawn whisper process: ${error.message}`));
    });
  });
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
  const tempWavPath = path.join(tempDir, "audio.wav");

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(tempInputPath, audioBuffer);

    await prepareAudioForWhisper(tempInputPath, tempWavPath);

    const duration = await getAudioDuration(tempWavPath);
    if (duration > MAX_AUDIO_DURATION_SECONDS) {
      throw new Error(
        `مدة الصوت (${Math.round(duration / 60)} دقيقة) تتجاوز الحد المسموح (${MAX_AUDIO_DURATION_SECONDS / 60} دقيقة)`
      );
    }
    console.log(`[whisper.cpp] Audio duration: ${Math.round(duration)} seconds`);

    const whisperLanguage = language === "dz" ? "ar" : language;

    console.log(`[whisper.cpp] Transcribing: ${filename}`);
    console.log(`[whisper.cpp] Language: ${whisperLanguage}`);

    const text = await runWhisperBinary(tempWavPath, whisperLanguage);
    
    console.log(`[whisper.cpp] Transcription complete`);
    return text;
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
  return isInitialized;
}

export function getWhisperCppConfig() {
  return {
    modelName: MODEL_NAME,
    modelsDir: MODELS_DIR,
    whisperDir: WHISPER_DIR,
    maxDurationSeconds: MAX_AUDIO_DURATION_SECONDS,
    initialized: isInitialized,
  };
}
