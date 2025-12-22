import { parseBuffer } from "music-metadata";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

/**
 * Get audio duration from buffer using music-metadata library
 * Falls back to ffprobe if music-metadata fails
 * Returns duration in SECONDS
 */
export async function getAudioDurationFromBuffer(
  buffer: Buffer,
  mimeType: string = "audio/webm"
): Promise<number | null> {
  try {
    // Try music-metadata first (faster, no disk I/O needed)
    const metadata = await parseBuffer(buffer, { mimeType });
    
    if (metadata.format.duration && metadata.format.duration > 0) {
      console.log(`[audioDuration] music-metadata: ${metadata.format.duration.toFixed(2)}s`);
      return metadata.format.duration;
    }
  } catch (error) {
    console.log("[audioDuration] music-metadata failed, trying ffprobe:", error);
  }

  // Fallback to ffprobe (more reliable for some formats)
  try {
    // Create temp file for ffprobe
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `audio_${Date.now()}.webm`);
    
    await fs.promises.writeFile(tempFile, buffer);
    
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -show_entries format=duration -of csv="p=0" "${tempFile}"`,
        { timeout: 10000 }
      );
      
      const duration = parseFloat(stdout.trim());
      
      if (!isNaN(duration) && duration > 0) {
        console.log(`[audioDuration] ffprobe: ${duration.toFixed(2)}s`);
        return duration;
      }
    } finally {
      // Clean up temp file
      await fs.promises.unlink(tempFile).catch(() => {});
    }
  } catch (error) {
    console.error("[audioDuration] ffprobe failed:", error);
  }

  return null;
}

/**
 * Calculate duration and validate it makes sense
 * Returns object with duration in seconds and validation status
 */
export async function validateAndGetDuration(
  buffer: Buffer,
  mimeType: string,
  clientDuration: number | null
): Promise<{ duration: number; source: "server" | "client" | "fallback" }> {
  // Try to get server-side duration first
  const serverDuration = await getAudioDurationFromBuffer(buffer, mimeType);
  
  if (serverDuration && serverDuration > 0) {
    // Server duration is authoritative
    if (clientDuration && Math.abs(serverDuration - clientDuration) > 5) {
      console.warn(
        `[audioDuration] Client duration (${clientDuration}s) differs from server (${serverDuration}s) by more than 5s`
      );
    }
    return { duration: serverDuration, source: "server" };
  }
  
  // Fall back to client duration if server calculation failed
  if (clientDuration && clientDuration > 0) {
    console.log(`[audioDuration] Using client duration: ${clientDuration}s`);
    return { duration: clientDuration, source: "client" };
  }
  
  // Last resort: estimate based on file size (very rough: ~10KB per second for compressed audio)
  const estimatedDuration = Math.max(1, buffer.length / 10000);
  console.warn(`[audioDuration] Using size-based estimate: ${estimatedDuration.toFixed(2)}s`);
  return { duration: estimatedDuration, source: "fallback" };
}
