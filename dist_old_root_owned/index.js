var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/supabase-admin.ts
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
var url, serviceKey, supabaseAdmin;
var init_supabase_admin = __esm({
  "server/supabase-admin.ts"() {
    "use strict";
    dotenv.config();
    url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
    }
    supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
});

// server/db.ts
async function getOrCreateUser(userId, email, name, provider) {
  const { data: existing } = await supabaseAdmin.from("users").select("*").eq("id", userId).single();
  if (existing) return existing;
  const { data, error } = await supabaseAdmin.from("users").insert({
    id: userId,
    email: email || null,
    name: name || null,
    auth_provider: provider || "email",
    user_type: "free",
    subscription_type: "free"
  }).select().single();
  if (error) throw new Error(`Failed to create user: ${error.message}`);
  await supabaseAdmin.from("subscriptions").insert({
    user_id: userId,
    plan_name: "trial",
    status: "active",
    trial_minutes_used: 0,
    trial_minutes_limit: 210,
    trial_daily_limit: 30
  });
  return data;
}
async function getUser(userId) {
  const { data } = await supabaseAdmin.from("users").select("*").eq("id", userId).single();
  return data;
}
async function saveSummary(data) {
  await getOrCreateUser(data.userId);
  const { data: row, error } = await supabaseAdmin.from("summaries").insert({
    user_id: data.userId,
    title: data.title,
    content: data.content,
    transcript: data.transcript,
    key_points: data.keyPoints || [],
    language: data.language,
    audio_duration: data.audioDuration || null
  }).select().single();
  if (error) throw new Error(`Failed to save summary: ${error.message}`);
  return row;
}
async function getSummaries(userId) {
  const { data, error } = await supabaseAdmin.from("summaries").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to get summaries: ${error.message}`);
  return data || [];
}
async function getSummaryById(summaryId, userId) {
  const { data } = await supabaseAdmin.from("summaries").select("*").eq("id", summaryId).eq("user_id", userId).single();
  return data;
}
async function deleteSummary(summaryId, userId) {
  const { error } = await supabaseAdmin.from("summaries").delete().eq("id", summaryId).eq("user_id", userId);
  return !error;
}
async function getTodayUsage(userId) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const { data } = await supabaseAdmin.from("usage").select("*").eq("user_id", userId).eq("date", today).single();
  return data;
}
async function getTotalUsage(userId) {
  const { data } = await supabaseAdmin.from("usage").select("minutes_used").eq("user_id", userId);
  if (!data) return 0;
  return data.reduce((sum, row) => sum + (row.minutes_used || 0), 0);
}
async function getFirstUsageDate(userId) {
  const { data } = await supabaseAdmin.from("usage").select("date").eq("user_id", userId).order("date", { ascending: true }).limit(1).single();
  return data?.date || null;
}
async function recordUsage(userId, minutes) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  await getOrCreateUser(userId);
  const { data: existing } = await supabaseAdmin.from("usage").select("*").eq("user_id", userId).eq("date", today).single();
  if (existing) {
    const { data, error } = await supabaseAdmin.from("usage").update({ minutes_used: (existing.minutes_used || 0) + minutes }).eq("user_id", userId).eq("date", today).select().single();
    if (error) throw new Error(`Failed to update usage: ${error.message}`);
    return data;
  } else {
    const { data, error } = await supabaseAdmin.from("usage").insert({ user_id: userId, date: today, minutes_used: minutes }).select().single();
    if (error) throw new Error(`Failed to insert usage: ${error.message}`);
    return data;
  }
}
async function getActiveSubscription(userId) {
  const { data } = await supabaseAdmin.from("subscriptions").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).single();
  return data;
}
async function createSubscription(data) {
  await supabaseAdmin.from("subscriptions").update({ status: "cancelled" }).eq("user_id", data.userId).eq("status", "active");
  const { data: row, error } = await supabaseAdmin.from("subscriptions").insert({
    user_id: data.userId,
    plan_name: data.planName,
    status: "active",
    start_date: (/* @__PURE__ */ new Date()).toISOString(),
    end_date: data.endDate || null,
    payment_provider: data.paymentProvider || null,
    trial_minutes_limit: data.totalMinutes ?? null,
    trial_minutes_used: 0
  }).select().single();
  if (error) throw new Error(`Failed to create subscription: ${error.message}`);
  const subsType = data.planId || data.planName.toLowerCase().replace(/ /g, "_");
  await supabaseAdmin.from("users").update({ subscription_type: subsType }).eq("id", data.userId);
  return row;
}
async function getSettings(userId) {
  const { data } = await supabaseAdmin.from("settings").select("*").eq("user_id", userId).single();
  return data;
}
async function upsertSettings(data) {
  const existing = await getSettings(data.userId);
  if (existing) {
    const updates = {};
    if (data.preferredLanguage !== void 0) updates.preferred_language = data.preferredLanguage;
    if (data.notificationsEnabled !== void 0) updates.notifications_enabled = data.notificationsEnabled;
    if (data.theme !== void 0) updates.theme = data.theme;
    const { data: row2, error: error2 } = await supabaseAdmin.from("settings").update(updates).eq("user_id", data.userId).select().single();
    if (error2) throw new Error(`Failed to update settings: ${error2.message}`);
    return row2;
  }
  const { data: row, error } = await supabaseAdmin.from("settings").insert({
    user_id: data.userId,
    preferred_language: data.preferredLanguage || "ar",
    notifications_enabled: data.notificationsEnabled !== false,
    theme: data.theme || "light"
  }).select().single();
  if (error) throw new Error(`Failed to insert settings: ${error.message}`);
  return row;
}
async function getUserRole(userId) {
  const { data } = await supabaseAdmin.from("users").select("role").eq("id", userId).single();
  return data?.role || "user";
}
async function updateUserProfile(userId, updates) {
  const updateData = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
  if (updates.name !== void 0) updateData.name = updates.name;
  const { data, error } = await supabaseAdmin.from("users").update(updateData).eq("id", userId).select().single();
  if (error) throw new Error(`Failed to update profile: ${error.message}`);
  return data;
}
async function deleteUserAccount(userId) {
  await supabaseAdmin.from("usage").delete().eq("user_id", userId);
  await supabaseAdmin.from("summaries").delete().eq("user_id", userId);
  await supabaseAdmin.from("settings").delete().eq("user_id", userId);
  await supabaseAdmin.from("payments").delete().eq("user_id", userId);
  await supabaseAdmin.from("subscriptions").delete().eq("user_id", userId);
  const { error } = await supabaseAdmin.from("users").delete().eq("id", userId);
  if (error) throw new Error(`Failed to delete user: ${error.message}`);
  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (e) {
    console.error("[DB] Failed to delete auth user (may already be deleted):", e);
  }
  return true;
}
async function getAdminStats() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const [usersRes, paidSubsRes, summariesRes, todaySummariesRes, paymentsRes] = await Promise.all([
    supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("subscriptions").select("id", { count: "exact", head: true }).neq("plan_name", "trial").eq("status", "active"),
    supabaseAdmin.from("summaries").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("summaries").select("id", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00`),
    supabaseAdmin.from("payments").select("amount").eq("status", "paid")
  ]);
  const totalUsers = usersRes.count || 0;
  const paidUsers = paidSubsRes.count || 0;
  const totalSummaries = summariesRes.count || 0;
  const summariesToday = todaySummariesRes.count || 0;
  const revenueTotal = (paymentsRes.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  return {
    totalUsers,
    paidUsers,
    trialUsers: totalUsers - paidUsers,
    totalSummaries,
    summariesToday,
    totalPayments: (paymentsRes.data || []).length,
    revenueTotal
  };
}
async function getAllUsersWithStats(params) {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const offset = (page - 1) * limit;
  let query = supabaseAdmin.from("users").select("*, subscriptions!subscriptions_user_id_fkey(plan_name, status, trial_minutes_used, trial_minutes_limit, start_date, end_date)", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (params?.search) {
    query = query.or(`email.ilike.%${params.search}%,name.ilike.%${params.search}%`);
  }
  const { data, count, error } = await query;
  if (error) throw new Error(`Failed to get users: ${error.message}`);
  let users = data || [];
  if (params?.planFilter && params.planFilter !== "all") {
    users = users.filter((u) => {
      const activeSub = (u.subscriptions || []).find((s) => s.status === "active");
      return activeSub?.plan_name === params.planFilter;
    });
  }
  return { users, total: count || 0 };
}
async function getUserDetailForAdmin(userId) {
  const [user, subs, summaries, usage] = await Promise.all([
    supabaseAdmin.from("users").select("*").eq("id", userId).single(),
    supabaseAdmin.from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabaseAdmin.from("summaries").select("id, title, language, audio_duration, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("usage").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(30)
  ]);
  return {
    user: user.data,
    subscriptions: subs.data || [],
    summaries: summaries.data || [],
    usage: usage.data || []
  };
}
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_supabase_admin();
    console.log("[Supabase] Database layer initialized");
  }
});

// server/middleware/auth.ts
var auth_exports = {};
__export(auth_exports, {
  optionalAuth: () => optionalAuth,
  requireAuth: () => requireAuth
});
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "\u064A\u062C\u0628 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B",
        errorCode: "NO_TOKEN"
      });
    }
    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "\u062C\u0644\u0633\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629\u060C \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649",
        errorCode: "INVALID_TOKEN"
      });
    }
    req.authenticatedUserId = user.id;
    req.authenticatedUser = user;
    next();
  } catch (error) {
    console.error("[Auth] Middleware error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Authentication check failed"
    });
  }
}
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        req.authenticatedUserId = user.id;
        req.authenticatedUser = user;
      }
    }
    next();
  } catch {
    next();
  }
}
var init_auth = __esm({
  "server/middleware/auth.ts"() {
    "use strict";
    init_supabase_admin();
  }
});

// server/api/payment-status.ts
var payment_status_exports = {};
__export(payment_status_exports, {
  getLatestPayment: () => getLatestPayment
});
async function getLatestPayment(req, res) {
  try {
    const userId = req.authenticatedUserId || req.query.userId;
    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID is required"
      });
    }
    const subscription = await getActiveSubscription(userId);
    if (!subscription) {
      return res.status(200).json({
        payment: null
      });
    }
    return res.status(200).json({
      payment: {
        id: subscription.id,
        planName: subscription.plan_name,
        status: subscription.status,
        startDate: subscription.start_date,
        endDate: subscription.end_date
      }
    });
  } catch (error) {
    console.error("[API] Error in getLatestPayment:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message || "An unexpected error occurred"
    });
  }
}
var init_payment_status = __esm({
  "server/api/payment-status.ts"() {
    "use strict";
    init_db();
  }
});

// server/api/payment-link.ts
var payment_link_exports = {};
__export(payment_link_exports, {
  checkPaymentLinksStatus: () => checkPaymentLinksStatus,
  getPaymentLink: () => getPaymentLink
});
async function getPaymentLink(req, res) {
  try {
    const { planId } = req.params;
    if (!planId || !["basic", "student", "professional"].includes(planId)) {
      return res.status(400).json({
        error: "Invalid plan ID",
        message: "\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u062E\u0637\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"
      });
    }
    const paymentLink = PAYMENT_LINKS[planId];
    if (!paymentLink) {
      console.error(`\u26A0\uFE0F  Payment link not configured for plan: ${planId}`);
      return res.status(404).json({
        error: "Payment link not found",
        message: "\u0631\u0627\u0628\u0637 \u0627\u0644\u062F\u0641\u0639 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 \u062D\u0627\u0644\u064A\u0627\u064B. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645.",
        hint: `Set CHARGILY_LINK_${planId.toUpperCase()} in environment variables`
      });
    }
    return res.json({
      planId,
      paymentLink,
      success: true
    });
  } catch (error) {
    console.error("[Payment Link] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649."
    });
  }
}
async function checkPaymentLinksStatus(_req, res) {
  const status = {
    basic: {
      configured: !!PAYMENT_LINKS.basic,
      link: PAYMENT_LINKS.basic ? "\u2713 Set" : "\u2717 Not set"
    },
    student: {
      configured: !!PAYMENT_LINKS.student,
      link: PAYMENT_LINKS.student ? "\u2713 Set" : "\u2717 Not set"
    },
    professional: {
      configured: !!PAYMENT_LINKS.professional,
      link: PAYMENT_LINKS.professional ? "\u2713 Set" : "\u2717 Not set"
    },
    allConfigured: !!(PAYMENT_LINKS.basic && PAYMENT_LINKS.student && PAYMENT_LINKS.professional)
  };
  return res.json(status);
}
var PAYMENT_LINKS;
var init_payment_link = __esm({
  "server/api/payment-link.ts"() {
    "use strict";
    PAYMENT_LINKS = {
      basic: process.env.CHARGILY_LINK_BASIC || "",
      student: process.env.CHARGILY_LINK_STUDENT || "",
      professional: process.env.CHARGILY_LINK_PROFESSIONAL || ""
    };
  }
});

// server/index.ts
import "dotenv/config";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import multer from "multer";
import bodyParser from "body-parser";

// server/openai.ts
import OpenAI from "openai";

// server/services/whisperCpp.ts
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { randomUUID } from "crypto";
import { exec, spawn } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
var WHISPER_DIR = path.join(process.cwd(), "whisper.cpp");
var MODELS_DIR = path.join(WHISPER_DIR, "models");
var WHISPER_BINARY = path.join(WHISPER_DIR, "build", "bin", "whisper-cli");
var MODEL_NAME = "small";
var MODEL_FILE = `ggml-${MODEL_NAME}.bin`;
var MODEL_PATH = path.join(MODELS_DIR, MODEL_FILE);
var MAX_AUDIO_DURATION_SECONDS = 30 * 60;
var isInitialized = false;
var initializationPromise = null;
async function checkFfmpegAvailable() {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}
async function prepareAudioForWhisper(inputPath, outputPath) {
  try {
    console.log(`[whisper.cpp] Converting audio to WAV (16kHz, mono, PCM 16-bit)...`);
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}" 2>&1`
    );
    console.log(`[whisper.cpp] Audio conversion successful`);
  } catch (error) {
    console.error("[whisper.cpp] Audio conversion failed:", error);
    throw new Error("\u0641\u0634\u0644 \u062A\u062D\u0648\u064A\u0644 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0635\u0648\u062A\u064A. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0645\u0644\u0641 \u0622\u062E\u0631.");
  }
}
async function getAudioDuration(filePath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    const duration = parseFloat(stdout.trim());
    if (isNaN(duration) || duration <= 0) {
      throw new Error("Invalid duration value returned from ffprobe");
    }
    return duration;
  } catch (error) {
    console.error("[whisper.cpp] Failed to determine audio duration:", error);
    throw new Error(`Cannot verify audio duration: ${error.message}`);
  }
}
async function cloneWhisperCpp() {
  if (fs.existsSync(WHISPER_DIR)) {
    console.log("[whisper.cpp] Repository already exists");
    return;
  }
  console.log("[whisper.cpp] Cloning whisper.cpp repository...");
  await execAsync(`git clone --depth 1 https://github.com/ggerganov/whisper.cpp "${WHISPER_DIR}"`);
  console.log("[whisper.cpp] Clone complete");
}
async function buildWhisperCpp() {
  if (fs.existsSync(WHISPER_BINARY)) {
    console.log("[whisper.cpp] Binary already exists");
    return;
  }
  console.log("[whisper.cpp] Building whisper.cpp with cmake (CPU-only, this may take a few minutes)...");
  const buildDir = path.join(WHISPER_DIR, "build");
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  await execAsync(`cd "${buildDir}" && cmake .. -DGGML_CUDA=OFF -DGGML_METAL=OFF -DGGML_VULKAN=OFF -DGGML_SYCL=OFF -DWHISPER_NO_ACCELERATE=ON && cmake --build . --config Release -j2`, {
    timeout: 6e5
  });
  if (!fs.existsSync(WHISPER_BINARY)) {
    throw new Error("Build failed: whisper-cli binary not found after cmake build");
  }
  console.log("[whisper.cpp] Build complete (CPU-only mode)");
}
async function downloadModel() {
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
    timeout: 6e5
  });
  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error(`Model download failed: ${MODEL_FILE} not found`);
  }
  console.log(`[whisper.cpp] Model ${MODEL_NAME} downloaded successfully`);
}
async function ensureModelReady() {
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
        await execAsync("cmake --version");
        console.log(`[whisper.cpp] CMake: available`);
      } catch {
        throw new Error("CMake is not available. Building whisper.cpp requires CMake.");
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
function runWhisperBinary(wavPath, language) {
  return new Promise((resolve, reject) => {
    const args = [
      "-m",
      MODEL_PATH,
      "-f",
      wavPath,
      "-l",
      language,
      "--no-timestamps",
      "-otxt",
      "-t",
      "2",
      // Reduced to 2 threads (less memory pressure)
      "-ng",
      // No GPU (force CPU-only)
      "-bs",
      "1",
      // Greedy decoding (beam size 1 = much less memory)
      "-bo",
      "1"
      // Best of 1 (no extra memory for candidates)
    ];
    console.log(`[whisper.cpp] Running: ${WHISPER_BINARY} ${args.join(" ")}`);
    const whisperProcess = spawn(WHISPER_BINARY, args, {
      cwd: WHISPER_DIR,
      timeout: 3e5
    });
    let stdout = "";
    let stderr = "";
    whisperProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    whisperProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    whisperProcess.on("close", (code, signal) => {
      if (code !== 0) {
        console.error(`[whisper.cpp] Process exited with code=${code}, signal=${signal}`);
        if (signal === "SIGKILL" || code === null) {
          console.error(`[whisper.cpp] SIGKILL detected - likely OOM (Out of Memory)`);
        }
        console.error(`[whisper.cpp] stderr: ${stderr}`);
        reject(new Error(`Whisper process failed with code ${code}: ${stderr}`));
        return;
      }
      const txtFile = wavPath + ".txt";
      if (fs.existsSync(txtFile)) {
        const text = fs.readFileSync(txtFile, "utf-8").trim();
        try {
          fs.unlinkSync(txtFile);
        } catch {
        }
        resolve(text);
      } else if (stdout.trim()) {
        resolve(stdout.trim());
      } else {
        reject(new Error("No transcription output found"));
      }
    });
    whisperProcess.on("error", (error) => {
      reject(new Error(`Failed to spawn whisper process: ${error.message}`));
    });
  });
}
async function transcribeWithWhisperCpp(audioBuffer, filename, language = "ar") {
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
        `\u0645\u062F\u0629 \u0627\u0644\u0635\u0648\u062A (${Math.round(duration / 60)} \u062F\u0642\u064A\u0642\u0629) \u062A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D (${MAX_AUDIO_DURATION_SECONDS / 60} \u062F\u0642\u064A\u0642\u0629)`
      );
    }
    console.log(`[whisper.cpp] Audio duration: ${Math.round(duration)} seconds`);
    const whisperLanguage = language === "dz" ? "ar" : language;
    console.log(`[whisper.cpp] Transcribing: ${filename}`);
    console.log(`[whisper.cpp] Language: ${whisperLanguage}`);
    const text = await runWhisperBinary(tempWavPath, whisperLanguage);
    console.log(`[whisper.cpp] Transcription complete`);
    return text;
  } catch (error) {
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

// server/openai.ts
async function transcribeAudio(audioBuffer, filename, mimetype, language = "ar") {
  console.log(`[transcribeAudio] Using whisper.cpp for transcription`);
  console.log(`[transcribeAudio] File: ${filename}, Language: ${language}`);
  const transcription = await transcribeWithWhisperCpp(audioBuffer, filename, language);
  return transcription;
}

// server/services/summarizeWithGrok.ts
import OpenAI2 from "openai";
var GROK_TIMEOUT_MS = 6e4;
var grokClient = null;
function getGrokClient() {
  if (!process.env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is not configured");
  }
  if (!grokClient) {
    grokClient = new OpenAI2({
      baseURL: "https://api.x.ai/v1",
      apiKey: process.env.XAI_API_KEY,
      timeout: GROK_TIMEOUT_MS
    });
  }
  return grokClient;
}
var SUMMARIZATION_PROMPTS = {
  ar: `\u0623\u0646\u062A \u0645\u0633\u0627\u0639\u062F \u0630\u0643\u064A \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u062A\u0644\u062E\u064A\u0635 \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0627\u062A \u0627\u0644\u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629.

\u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0645\u0646\u0643:
1. \u062A\u0644\u062E\u064A\u0635 \u0627\u0644\u0646\u0635 \u0628\u0644\u063A\u0629 \u0639\u0631\u0628\u064A\u0629 \u0641\u0635\u062D\u0649 \u0648\u0627\u0636\u062D\u0629 \u0648\u0645\u0641\u0647\u0648\u0645\u0629
2. \u062A\u0646\u0638\u064A\u0645 \u0627\u0644\u0645\u0644\u062E\u0635 \u0641\u064A \u0641\u0642\u0631\u0627\u062A \u0645\u062A\u0633\u0644\u0633\u0644\u0629 \u0648\u0645\u0631\u0642\u0645\u0629 (1. 2. 3. \u0625\u0644\u062E)
3. \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0623\u0641\u0643\u0627\u0631 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0648\u0627\u0644\u0645\u0641\u0627\u0647\u064A\u0645 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629
4. \u0627\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0647\u0645\u0629 \u062F\u0648\u0646 \u0627\u062E\u062A\u0635\u0627\u0631 \u0645\u064F\u062E\u0644

\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0625\u062E\u0631\u0627\u062C:
- \u0627\u0643\u062A\u0628 \u0646\u0635\u0627\u064B \u0639\u0627\u062F\u064A\u0627\u064B \u0628\u062F\u0648\u0646 \u0631\u0645\u0648\u0632 Markdown
- \u0644\u0627 \u062A\u0633\u062A\u062E\u062F\u0645 # \u0623\u0648 ## \u0623\u0648 * \u0623\u0648 - \u0644\u0644\u062A\u0646\u0633\u064A\u0642
- \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 (1. 2. 3.) \u0644\u0644\u062A\u0631\u0642\u064A\u0645 \u0641\u0642\u0637
- \u0627\u0643\u062A\u0628 \u0641\u0642\u0631\u0627\u062A \u0646\u0635\u064A\u0629 \u0648\u0627\u0636\u062D\u0629 \u0648\u0645\u062A\u0635\u0644\u0629

\u0623\u0633\u0644\u0648\u0628 \u0627\u0644\u0643\u062A\u0627\u0628\u0629:
- \u0627\u0633\u062A\u062E\u062F\u0645 \u0644\u063A\u0629 \u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0648\u0627\u0636\u062D\u0629
- \u062A\u062C\u0646\u0628 \u0627\u0644\u062A\u0643\u0631\u0627\u0631
- \u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u062A\u0633\u0644\u0633\u0644 \u0645\u0646\u0637\u0642\u064A \u0644\u0644\u0623\u0641\u0643\u0627\u0631`,
  fr: `Vous \xEAtes un assistant intelligent sp\xE9cialis\xE9 dans le r\xE9sum\xE9 de cours acad\xE9miques.

Votre mission:
1. R\xE9sumer le texte en fran\xE7ais clair et compr\xE9hensible
2. Organiser le r\xE9sum\xE9 en paragraphes num\xE9rot\xE9s (1. 2. 3. etc.)
3. Extraire les id\xE9es principales et les concepts cl\xE9s
4. Pr\xE9server les informations importantes sans abr\xE9viation excessive

Format de sortie:
- \xC9crivez du texte brut sans symboles Markdown
- N'utilisez pas #, ##, *, ou - pour le formatage
- Utilisez uniquement des chiffres (1. 2. 3.) pour la num\xE9rotation
- R\xE9digez des paragraphes clairs et coh\xE9rents

Style d'\xE9criture:
- Utilisez un langage acad\xE9mique clair
- \xC9vitez les r\xE9p\xE9titions
- Maintenez une s\xE9quence logique des id\xE9es`,
  dz: `\u0623\u0646\u062A \u0645\u0633\u0627\u0639\u062F \u0630\u0643\u064A \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u062A\u0644\u062E\u064A\u0635 \u0627\u0644\u0645\u062D\u0627\u0636\u0631\u0627\u062A.

\u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0645\u0646\u0643:
1. \u062A\u0644\u062E\u064A\u0635 \u0627\u0644\u0646\u0635 \u0628\u0644\u063A\u0629 \u0639\u0631\u0628\u064A\u0629 \u0648\u0627\u0636\u062D\u0629 (\u064A\u0645\u0643\u0646 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0628\u0639\u0636 \u0627\u0644\u062A\u0639\u0628\u064A\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0631\u062C\u0629 \u0627\u0644\u062C\u0632\u0627\u0626\u0631\u064A\u0629 \u0625\u0630\u0627 \u0644\u0632\u0645 \u0627\u0644\u0623\u0645\u0631)
2. \u062A\u0646\u0638\u064A\u0645 \u0627\u0644\u0645\u0644\u062E\u0635 \u0641\u064A \u0641\u0642\u0631\u0627\u062A \u0645\u062A\u0633\u0644\u0633\u0644\u0629 \u0648\u0645\u0631\u0642\u0645\u0629 (1. 2. 3. \u0625\u0644\u062E)
3. \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0623\u0641\u0643\u0627\u0631 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629
4. \u0627\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0647\u0645\u0629

\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0625\u062E\u0631\u0627\u062C:
- \u0627\u0643\u062A\u0628 \u0646\u0635\u0627\u064B \u0639\u0627\u062F\u064A\u0627\u064B \u0628\u062F\u0648\u0646 \u0631\u0645\u0648\u0632 Markdown
- \u0644\u0627 \u062A\u0633\u062A\u062E\u062F\u0645 # \u0623\u0648 ## \u0623\u0648 * \u0623\u0648 - \u0644\u0644\u062A\u0646\u0633\u064A\u0642
- \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0623\u0631\u0642\u0627\u0645 (1. 2. 3.) \u0644\u0644\u062A\u0631\u0642\u064A\u0645 \u0641\u0642\u0637
- \u0627\u0643\u062A\u0628 \u0641\u0642\u0631\u0627\u062A \u0646\u0635\u064A\u0629 \u0648\u0627\u0636\u062D\u0629 \u0648\u0645\u062A\u0635\u0644\u0629

\u0623\u0633\u0644\u0648\u0628 \u0627\u0644\u0643\u062A\u0627\u0628\u0629:
- \u0627\u0633\u062A\u062E\u062F\u0645 \u0644\u063A\u0629 \u0628\u0633\u064A\u0637\u0629 \u0648\u0645\u0641\u0647\u0648\u0645\u0629
- \u062A\u062C\u0646\u0628 \u0627\u0644\u062A\u0643\u0631\u0627\u0631
- \u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u062A\u0633\u0644\u0633\u0644 \u0645\u0646\u0637\u0642\u064A \u0644\u0644\u0623\u0641\u0643\u0627\u0631`
};
function cleanSummaryText(text) {
  let cleaned = text;
  cleaned = cleaned.replace(/^#{1,6}\s*/gm, "");
  cleaned = cleaned.replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1");
  cleaned = cleaned.replace(/_{1,3}([^_]+)_{1,3}/g, "$1");
  cleaned = cleaned.replace(/^[\s]*[-*•]\s+/gm, "");
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  cleaned = cleaned.replace(/^[-*_]{3,}$/gm, "");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.split("\n").map((line) => line.trim()).join("\n");
  cleaned = cleaned.trim();
  return cleaned;
}
async function summarizeWithGrok(options) {
  const { transcript, language, maxTokens = 2e3 } = options;
  if (!process.env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is not configured");
  }
  if (!transcript || transcript.trim().length === 0) {
    throw new Error("Transcript is empty");
  }
  const startTime = Date.now();
  const systemPrompt = SUMMARIZATION_PROMPTS[language] || SUMMARIZATION_PROMPTS.ar;
  const userPrompt = `\u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u0631\u0627\u062F \u062A\u0644\u062E\u064A\u0635\u0647:

${transcript}

---
\u0642\u062F\u0645 \u0627\u0644\u0645\u0644\u062E\u0635 \u0645\u0639 \u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629:`;
  try {
    console.log(`Starting Grok summarization for ${transcript.length} chars in ${language}...`);
    const client = getGrokClient();
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, GROK_TIMEOUT_MS);
    let response;
    try {
      response = await client.chat.completions.create(
        {
          model: "grok-3",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.3
        },
        { signal: abortController.signal }
      );
    } finally {
      clearTimeout(timeoutId);
    }
    const rawSummary = response.choices[0]?.message?.content || "";
    const processingTime = Date.now() - startTime;
    console.log(`Grok summarization completed in ${processingTime}ms`);
    const summary = cleanSummaryText(rawSummary);
    const keyPoints = extractKeyPoints(summary);
    return {
      summary,
      keyPoints,
      processingTime
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`Grok summarization error after ${processingTime}ms:`, error);
    if (error.name === "AbortError" || error.message?.includes("aborted")) {
      throw new Error("\u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u062E\u0627\u062F\u0645 \u0627\u0644\u062A\u0644\u062E\u064A\u0635 (60 \u062B\u0627\u0646\u064A\u0629). \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.");
    }
    if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw new Error("\u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u062E\u0627\u062F\u0645 \u0627\u0644\u062A\u0644\u062E\u064A\u0635. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.");
    }
    if (error.status === 401) {
      throw new Error("\u0645\u0641\u062A\u0627\u062D API \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
    }
    if (error.status === 429) {
      throw new Error("\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u0637\u0644\u0628\u0627\u062A. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B.");
    }
    if (error.status === 503) {
      throw new Error("\u062E\u062F\u0645\u0629 \u0627\u0644\u062A\u0644\u062E\u064A\u0635 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u0645\u0624\u0642\u062A\u0627\u064B. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B.");
    }
    if (error.status === 500) {
      throw new Error("\u062E\u0637\u0623 \u0641\u064A \u062E\u0627\u062F\u0645 \u0627\u0644\u062A\u0644\u062E\u064A\u0635. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B.");
    }
    throw new Error(`\u0641\u0634\u0644 \u0627\u0644\u062A\u0644\u062E\u064A\u0635: ${error.message || "\u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}`);
  }
}
function extractKeyPoints(summary) {
  const lines = summary.split("\n");
  const keyPoints = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[\d١٢٣٤٥٦٧٨٩٠]+[.)\-:\s]/.test(trimmed) || /^[-•*]\s/.test(trimmed)) {
      const cleaned = trimmed.replace(/^[\d١٢٣٤٥٦٧٨٩٠]+[.)\-:\s]+/, "").replace(/^[-•*]\s+/, "").trim();
      if (cleaned.length > 10) {
        keyPoints.push(cleaned);
      }
    }
  }
  return keyPoints.slice(0, 10);
}

// server/utils/audioDuration.ts
import { parseBuffer } from "music-metadata";
import { exec as exec2 } from "child_process";
import { promisify as promisify2 } from "util";
import fs2 from "fs";
import path2 from "path";
import os2 from "os";
var execAsync2 = promisify2(exec2);
async function getAudioDurationFromBuffer(buffer, mimeType = "audio/webm") {
  try {
    const metadata = await parseBuffer(buffer, { mimeType });
    if (metadata.format.duration && metadata.format.duration > 0) {
      console.log(`[audioDuration] music-metadata: ${metadata.format.duration.toFixed(2)}s`);
      return metadata.format.duration;
    }
  } catch (error) {
    console.log("[audioDuration] music-metadata failed, trying ffprobe:", error);
  }
  try {
    const tempDir = os2.tmpdir();
    const tempFile = path2.join(tempDir, `audio_${Date.now()}.webm`);
    await fs2.promises.writeFile(tempFile, buffer);
    try {
      const { stdout } = await execAsync2(
        `ffprobe -v quiet -show_entries format=duration -of csv="p=0" "${tempFile}"`,
        { timeout: 1e4 }
      );
      const duration = parseFloat(stdout.trim());
      if (!isNaN(duration) && duration > 0) {
        console.log(`[audioDuration] ffprobe: ${duration.toFixed(2)}s`);
        return duration;
      }
    } finally {
      await fs2.promises.unlink(tempFile).catch(() => {
      });
    }
  } catch (error) {
    console.error("[audioDuration] ffprobe failed:", error);
  }
  return null;
}
async function validateAndGetDuration(buffer, mimeType, clientDuration) {
  const serverDuration = await getAudioDurationFromBuffer(buffer, mimeType);
  if (serverDuration && serverDuration > 0) {
    if (clientDuration && Math.abs(serverDuration - clientDuration) > 5) {
      console.warn(
        `[audioDuration] Client duration (${clientDuration}s) differs from server (${serverDuration}s) by more than 5s`
      );
    }
    return { duration: serverDuration, source: "server" };
  }
  if (clientDuration && clientDuration > 0) {
    console.log(`[audioDuration] Using client duration: ${clientDuration}s`);
    return { duration: clientDuration, source: "client" };
  }
  const estimatedDuration = Math.max(1, buffer.length / 1e4);
  console.warn(`[audioDuration] Using size-based estimate: ${estimatedDuration.toFixed(2)}s`);
  return { duration: estimatedDuration, source: "fallback" };
}

// server/utils/trialValidation.ts
init_db();

// shared/trial.ts
var TRIAL_LIMITS = {
  MAX_AUDIO_MINUTES: 210,
  DAILY_LIMIT_MINUTES: 30,
  VALIDITY_DAYS: 7,
  MAX_FILE_DURATION_SECONDS: 300
};
function calculateDaysPassed(firstUseDateStr) {
  const now = /* @__PURE__ */ new Date();
  const firstUse = new Date(firstUseDateStr);
  return Math.floor((now.getTime() - firstUse.getTime()) / (1e3 * 60 * 60 * 24));
}
function isTrialExpired(firstUseDateStr) {
  if (!firstUseDateStr) return false;
  const daysPassed = calculateDaysPassed(firstUseDateStr);
  return daysPassed >= TRIAL_LIMITS.VALIDITY_DAYS;
}
function hasDailyAllowance(dailyMinutesUsed) {
  return dailyMinutesUsed < TRIAL_LIMITS.DAILY_LIMIT_MINUTES;
}
function hasTotalAllowance(totalMinutesUsed) {
  return totalMinutesUsed < TRIAL_LIMITS.MAX_AUDIO_MINUTES;
}
function checkTrialStatus(params) {
  const { firstUseDateStr, totalMinutesUsed, dailyMinutesUsed } = params;
  if (firstUseDateStr && isTrialExpired(firstUseDateStr)) {
    return {
      allowed: false,
      blockReason: "days_expired",
      reason: `\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629 \u0628\u0639\u062F ${TRIAL_LIMITS.VALIDITY_DAYS} \u0623\u064A\u0627\u0645`,
      errorCode: "TRIAL_DAYS_EXPIRED"
    };
  }
  if (!hasDailyAllowance(dailyMinutesUsed)) {
    return {
      allowed: false,
      blockReason: "daily_limit",
      reason: `\u0644\u0642\u062F \u0627\u0633\u062A\u0647\u0644\u0643\u062A ${TRIAL_LIMITS.DAILY_LIMIT_MINUTES} \u062F\u0642\u064A\u0642\u0629 \u0627\u0644\u064A\u0648\u0645. \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u063A\u062F\u0627\u064B.`,
      errorCode: "TRIAL_DAILY_LIMIT_REACHED"
    };
  }
  if (!hasTotalAllowance(totalMinutesUsed)) {
    return {
      allowed: false,
      blockReason: "total_limit",
      reason: `\u0644\u0642\u062F \u0627\u0633\u062A\u0647\u0644\u0643\u062A \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0645\u0646 \u0627\u0644\u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629 (${TRIAL_LIMITS.MAX_AUDIO_MINUTES} \u062F\u0642\u064A\u0642\u0629).`,
      errorCode: "TRIAL_TOTAL_LIMIT_REACHED"
    };
  }
  return {
    allowed: true,
    blockReason: null
  };
}

// server/utils/trialValidation.ts
async function validateTrialUsage(userId, audioDurationSeconds) {
  const audioDurationMinutes = audioDurationSeconds / 60;
  console.log(`[trialValidation] Checking user ${userId} for ${audioDurationMinutes.toFixed(2)} minutes`);
  try {
    const totalMinutesUsed = await getTotalUsage(userId);
    const todayUsage = await getTodayUsage(userId);
    const dailyMinutesUsed = todayUsage?.minutes_used || 0;
    const firstUseDateStr = await getFirstUsageDate(userId);
    console.log(`[trialValidation] Usage - Total: ${totalMinutesUsed.toFixed(2)} min, Today: ${dailyMinutesUsed.toFixed(2)} min, FirstUse: ${firstUseDateStr || "new user"}`);
    const totalMinutesRemaining = Math.max(0, TRIAL_LIMITS.MAX_AUDIO_MINUTES - totalMinutesUsed);
    const dailyMinutesRemaining = Math.max(0, TRIAL_LIMITS.DAILY_LIMIT_MINUTES - dailyMinutesUsed);
    const trialCheck = checkTrialStatus({
      firstUseDateStr,
      totalMinutesUsed,
      dailyMinutesUsed
    });
    if (!trialCheck.allowed) {
      console.log(`[trialValidation] BLOCKED: ${trialCheck.errorCode} - ${trialCheck.reason}`);
      return {
        allowed: false,
        reason: trialCheck.reason,
        errorCode: trialCheck.errorCode,
        totalMinutesUsed,
        dailyMinutesUsed,
        minutesRemaining: trialCheck.blockReason === "daily_limit" ? totalMinutesRemaining : 0,
        dailyMinutesRemaining: 0
      };
    }
    return {
      allowed: true,
      totalMinutesUsed,
      dailyMinutesUsed,
      minutesRemaining: totalMinutesRemaining,
      dailyMinutesRemaining
    };
  } catch (err) {
    console.error("[trialValidation] Unexpected error:", err);
    return {
      allowed: true,
      totalMinutesUsed: 0,
      dailyMinutesUsed: 0,
      minutesRemaining: TRIAL_LIMITS.MAX_AUDIO_MINUTES,
      dailyMinutesRemaining: TRIAL_LIMITS.DAILY_LIMIT_MINUTES
    };
  }
}

// server/routes.ts
init_db();

// server/api/guest-session.ts
async function createGuestSession(req, res) {
  return res.status(200).json({
    disabled: true,
    message: "Guest session is temporarily disabled",
    isGuest: true,
    trial: null
  });
}

// server/api/save-summary.ts
init_db();

// server/middleware/trialGuard.ts
init_db();
async function checkTrialStatus2(userId) {
  const totalMinutesUsed = await getTotalUsage(userId);
  const todayUsage = await getTodayUsage(userId);
  const dailyMinutesUsed = todayUsage?.minutes_used || 0;
  const firstUseDate = await getFirstUsageDate(userId);
  let daysUsed = 0;
  if (firstUseDate) {
    const firstDate = new Date(firstUseDate);
    const now = /* @__PURE__ */ new Date();
    daysUsed = Math.floor((now.getTime() - firstDate.getTime()) / (1e3 * 60 * 60 * 24));
  }
  const minutesLimit = TRIAL_LIMITS.MAX_AUDIO_MINUTES;
  const dailyLimit = TRIAL_LIMITS.DAILY_LIMIT_MINUTES;
  const minutesRemaining = Math.max(0, minutesLimit - totalMinutesUsed);
  const dailyRemaining = Math.max(0, dailyLimit - dailyMinutesUsed);
  const totalLimitReached = totalMinutesUsed >= minutesLimit;
  const dailyLimitReached = dailyMinutesUsed >= dailyLimit;
  const daysExpired = daysUsed >= TRIAL_LIMITS.VALIDITY_DAYS;
  const isExpired = totalLimitReached || daysExpired;
  const canUseService = !isExpired && !dailyLimitReached;
  return {
    userId,
    isExpired,
    minutesUsed: totalMinutesUsed,
    minutesLimit,
    minutesRemaining,
    dailyMinutesUsed,
    dailyLimit,
    dailyRemaining,
    firstUseDate,
    daysUsed,
    canUseService
  };
}
async function incrementTrialMinutes(userId, minutesToAdd) {
  await recordUsage(userId, minutesToAdd);
}

// server/api/save-summary.ts
async function saveSummary2(req, res) {
  try {
    const { userId, title, content, transcript, keyPoints, language, audioDuration, processedAt } = req.body;
    if (!userId || !content || !language) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (audioDuration === null || audioDuration === void 0 || typeof audioDuration !== "number" || audioDuration < 0) {
      return res.status(400).json({
        error: "Missing or invalid audio duration",
        message: "\u0645\u062F\u0629 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0635\u0648\u062A\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629"
      });
    }
    if (!processedAt || typeof processedAt !== "string") {
      return res.status(400).json({
        error: "Missing processing timestamp",
        message: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629. \u064A\u0631\u062C\u0649 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0635\u0648\u062A\u064A \u0645\u0631\u0629 \u0623\u062E\u0631\u0649."
      });
    }
    try {
      const processedTime = new Date(processedAt).getTime();
      if (isNaN(processedTime)) {
        return res.status(400).json({
          error: "Invalid timestamp format",
          message: "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0637\u0627\u0628\u0639 \u0627\u0644\u0632\u0645\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"
        });
      }
      const now = Date.now();
      const fiveMinutesMs = 5 * 60 * 1e3;
      if (now - processedTime > fiveMinutesMs) {
        return res.status(403).json({
          error: "Stale summary data",
          message: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A. \u064A\u0631\u062C\u0649 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0635\u0648\u062A\u064A \u0645\u0631\u0629 \u0623\u062E\u0631\u0649."
        });
      }
      if (processedTime > now + 6e4) {
        return res.status(403).json({
          error: "Invalid timestamp",
          message: "\u0627\u0644\u0637\u0627\u0628\u0639 \u0627\u0644\u0632\u0645\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"
        });
      }
    } catch (error) {
      return res.status(400).json({
        error: "Invalid timestamp",
        message: "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0637\u0627\u0628\u0639 \u0627\u0644\u0632\u0645\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D"
      });
    }
    const wordCount = transcript.trim().split(/\s+/).length;
    const expectedMinWords = Math.max(1, Math.floor(audioDuration * 1.5));
    if (wordCount < expectedMinWords && audioDuration > 10) {
      return res.status(403).json({
        error: "Suspicious data mismatch",
        message: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0642\u062F\u0645\u0629 \u063A\u064A\u0631 \u0645\u062A\u0633\u0642\u0629. \u064A\u0631\u062C\u0649 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0635\u0648\u062A\u064A \u0645\u0631\u0629 \u0623\u062E\u0631\u0649."
      });
    }
    const trialStatus = await checkTrialStatus2(userId);
    if (trialStatus.isExpired) {
      return res.status(403).json({
        error: "Trial expired",
        message: "\u0627\u0646\u062A\u0647\u062A \u0627\u0644\u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645.",
        trialStatus
      });
    }
    const audioMinutes = Math.round(audioDuration / 60 * 100) / 100;
    if (trialStatus.minutesUsed + audioMinutes > trialStatus.minutesLimit) {
      return res.status(403).json({
        error: "Trial limit exceeded",
        message: `\u0647\u0630\u0627 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 (${audioMinutes} \u062F\u0642\u064A\u0642\u0629) \u0633\u064A\u062A\u062C\u0627\u0648\u0632 \u062D\u062F \u0627\u0644\u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629 (${trialStatus.minutesRemaining} \u062F\u0642\u064A\u0642\u0629 \u0645\u062A\u0628\u0642\u064A\u0629). \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645.`,
        trialStatus,
        audioMinutes,
        minutesRemaining: trialStatus.minutesRemaining
      });
    }
    if (trialStatus.dailyMinutesUsed + audioMinutes > trialStatus.dailyLimit) {
      return res.status(403).json({
        error: "Daily limit exceeded",
        code: "TRIAL_DAILY_LIMIT_REACHED",
        message: `\u0648\u0635\u0644\u062A \u0644\u0644\u062D\u062F \u0627\u0644\u064A\u0648\u0645\u064A (${TRIAL_LIMITS.DAILY_LIMIT_MINUTES} \u062F\u0642\u064A\u0642\u0629). \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u063A\u062F\u0627\u064B.`,
        trialStatus,
        audioMinutes
      });
    }
    const summary = saveSummary({
      userId,
      title: title || content.split(" ").slice(0, 5).join(" ") + "...",
      content,
      transcript: transcript || "",
      keyPoints: keyPoints || [],
      language,
      audioDuration: audioDuration || void 0
    });
    await incrementTrialMinutes(userId, audioMinutes);
    const updatedTrialStatus = await checkTrialStatus2(userId);
    res.json({
      summary,
      trialStatus: updatedTrialStatus
    });
  } catch (error) {
    console.error("Error in saveSummary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// server/api/summaries.ts
init_db();
async function getSummaries2(req, res) {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    const summaries = await getSummaries(userId);
    res.json({ summaries });
  } catch (error) {
    console.error("Error in getSummaries:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getSummaryById2(req, res) {
  try {
    const { id } = req.params;
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    const summary = await getSummaryById(id, userId);
    if (!summary) return res.status(404).json({ error: "Summary not found" });
    res.json({ summary });
  } catch (error) {
    console.error("Error in getSummaryById:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function deleteSummary2(req, res) {
  try {
    const { id } = req.params;
    const userId = req.body.userId || req.query.userId;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    const deleted = await deleteSummary(id, userId);
    if (!deleted) return res.status(404).json({ error: "Summary not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error in deleteSummary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// server/api/migrate-guest.ts
async function migrateGuest(req, res) {
  try {
    const { guestUserId, authenticatedUserId } = req.body;
    if (!guestUserId || !authenticatedUserId) {
      return res.status(400).json({ error: "Both guest and authenticated user IDs are required" });
    }
    res.json({
      success: true,
      message: "Guest migration is not needed in MVP (local auth only)"
    });
  } catch (error) {
    console.error("Error in migrateGuest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// server/api/trial-status.ts
async function getTrialStatus(req, res) {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    const trialStatus = await checkTrialStatus2(userId);
    const isTrialActive = !trialStatus.isExpired && trialStatus.minutesRemaining > 0;
    const hasActiveSubscription = false;
    res.json({
      trialStatus,
      isTrialActive,
      hasActiveSubscription
    });
  } catch (error) {
    console.error("Error in getTrialStatus:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// server/api/user.ts
init_db();
async function getUser2(req, res) {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    const user = await getUser(userId);
    res.json({ user: user || null });
  } catch (error) {
    console.error("Error in getUser:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function upsertUser(req, res) {
  try {
    const { userId, email, name, provider } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    const user = await getOrCreateUser(userId, email, name, provider);
    res.json({ user });
  } catch (error) {
    console.error("Error in upsertUser:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getUserSettings(req, res) {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    const settings = await getSettings(userId);
    res.json({ settings: settings || null });
  } catch (error) {
    console.error("Error in getUserSettings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function updateUserSettings(req, res) {
  try {
    const userId = req.authenticatedUserId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { preferred_language, notifications_enabled, theme } = req.body;
    const settings = await upsertSettings({
      userId,
      preferredLanguage: preferred_language,
      notificationsEnabled: notifications_enabled,
      theme
    });
    res.json({ settings });
  } catch (error) {
    console.error("Error in updateUserSettings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function updateProfile(req, res) {
  try {
    const userId = req.authenticatedUserId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { name } = req.body;
    const user = await updateUserProfile(userId, { name });
    res.json({ user });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function deleteAccount(req, res) {
  try {
    const userId = req.authenticatedUserId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    await deleteUserAccount(userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error in deleteAccount:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// server/api/chargily-checkout.ts
import { z as z2 } from "zod";

// server/services/chargily.ts
import { ChargilyClient } from "@chargily/chargily-pay";

// shared/plans.ts
import { z } from "zod";
var SUBSCRIPTION_PLANS = {
  basic: {
    id: "basic",
    name: "Basic Plan",
    nameAr: "\u0627\u0644\u062E\u0637\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
    description: "Perfect for trying out the service after the free trial",
    descriptionAr: "\u0645\u062B\u0627\u0644\u064A\u0629 \u0644\u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u062E\u062F\u0645\u0629 \u0628\u0639\u062F \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629",
    price: 4.99,
    priceDZD: 1200,
    // الأساسية على موقع Chargily
    currency: "DZD",
    lectures: 5,
    lecturesDuration: 45,
    totalMinutes: 225,
    // 5 × 45 = 225 minutes
    features: [
      "Transcribe & summarize 5 lectures",
      "45 minutes per lecture",
      "Support for Arabic, French, and Algerian dialect",
      "PDF & TXT export",
      "Email support"
    ],
    featuresAr: [
      "\u062A\u0644\u062E\u064A\u0635 5 \u0645\u062D\u0627\u0636\u0631\u0627\u062A",
      "\u0645\u062F\u0629 \u0643\u0644 \u0645\u062D\u0627\u0636\u0631\u0629 45 \u062F\u0642\u064A\u0642\u0629",
      "\u062F\u0639\u0645 \u0627\u0644\u0639\u0631\u0628\u064A\u0629\u060C \u0627\u0644\u0641\u0631\u0646\u0633\u064A\u0629\u060C \u0648\u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u062C\u0632\u0627\u0626\u0631\u064A\u0629",
      "\u062A\u0635\u062F\u064A\u0631 PDF \u0648 TXT",
      "\u062F\u0639\u0645 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A"
    ],
    badge: "Starter",
    badgeAr: "\u0644\u0644\u0645\u0628\u062A\u062F\u0626\u064A\u0646"
  },
  student: {
    id: "student",
    name: "Student Plan",
    nameAr: "\u062E\u0637\u0629 \u0627\u0644\u0637\u0627\u0644\u0628",
    description: "Most popular plan for university students",
    descriptionAr: "\u0627\u0644\u062E\u0637\u0629 \u0627\u0644\u0623\u0643\u062B\u0631 \u0637\u0644\u0628\u0627\u064B \u0644\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u062C\u0627\u0645\u0639\u064A\u064A\u0646",
    price: 19,
    priceDZD: 4700,
    // الطلابية على موقع Chargily
    currency: "DZD",
    lectures: 30,
    lecturesDuration: 45,
    totalMinutes: 1350,
    // 30 × 45 = 1350 minutes
    features: [
      "Transcribe & summarize 30 lectures",
      "45 minutes per lecture",
      "All features from Basic Plan",
      "Priority processing",
      "Save full history",
      "Priority email support"
    ],
    featuresAr: [
      "\u062A\u0644\u062E\u064A\u0635 30 \u0645\u062D\u0627\u0636\u0631\u0629",
      "\u0645\u062F\u0629 \u0643\u0644 \u0645\u062D\u0627\u0636\u0631\u0629 45 \u062F\u0642\u064A\u0642\u0629",
      "\u062C\u0645\u064A\u0639 \u0645\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u062E\u0637\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629",
      "\u0623\u0648\u0644\u0648\u064A\u0629 \u0641\u064A \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629",
      "\u062D\u0641\u0638 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0643\u0627\u0645\u0644",
      "\u062F\u0639\u0645 \u0630\u0648 \u0623\u0648\u0644\u0648\u064A\u0629 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064A\u062F"
    ],
    popular: true,
    badge: "Most Popular",
    badgeAr: "\u0627\u0644\u0623\u0643\u062B\u0631 \u0637\u0644\u0628\u0627\u064B"
  },
  professional: {
    id: "professional",
    name: "Professional Plan",
    nameAr: "\u062E\u0637\u0629 \u0627\u0644\u0645\u062D\u062A\u0631\u0641",
    description: "For teachers, researchers, and heavy users",
    descriptionAr: "\u0644\u0644\u0623\u0633\u0627\u062A\u0630\u0629\u060C \u0627\u0644\u0628\u0627\u062D\u062B\u064A\u0646\u060C \u0648\u0623\u0635\u062D\u0627\u0628 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0645\u0643\u062B\u0641",
    price: 34.99,
    priceDZD: 9e3,
    // Professional - يُحدَّد لاحقاً
    currency: "DZD",
    lectures: 60,
    lecturesDuration: 45,
    totalMinutes: 2700,
    // 60 × 45 = 2700 minutes
    features: [
      "Transcribe & summarize 60 lectures",
      "45 minutes per lecture",
      "All features from Student Plan",
      "Highest priority processing",
      "Advanced export options",
      "Dedicated support",
      "Early access to new features"
    ],
    featuresAr: [
      "\u062A\u0644\u062E\u064A\u0635 60 \u0645\u062D\u0627\u0636\u0631\u0629",
      "\u0645\u062F\u0629 \u0643\u0644 \u0645\u062D\u0627\u0636\u0631\u0629 45 \u062F\u0642\u064A\u0642\u0629",
      "\u062C\u0645\u064A\u0639 \u0645\u0645\u064A\u0632\u0627\u062A \u062E\u0637\u0629 \u0627\u0644\u0637\u0627\u0644\u0628",
      "\u0623\u0639\u0644\u0649 \u0623\u0648\u0644\u0648\u064A\u0629 \u0641\u064A \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629",
      "\u062E\u064A\u0627\u0631\u0627\u062A \u062A\u0635\u062F\u064A\u0631 \u0645\u062A\u0642\u062F\u0645\u0629",
      "\u062F\u0639\u0645 \u0645\u062E\u0635\u0635",
      "\u0648\u0635\u0648\u0644 \u0645\u0628\u0643\u0631 \u0644\u0644\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u062C\u062F\u064A\u062F\u0629"
    ],
    badge: "Best Value",
    badgeAr: "\u0627\u0644\u0623\u0641\u0636\u0644 \u0642\u064A\u0645\u0629"
  }
};
function getPlanById(planId) {
  return SUBSCRIPTION_PLANS[planId] || null;
}
function getAllPlans() {
  return Object.values(SUBSCRIPTION_PLANS);
}
var planSelectionSchema = z.object({
  planId: z.enum(["basic", "student", "professional"])
});
var chargilyCheckoutSchema = z.object({
  planId: z.enum(["basic", "student", "professional"]),
  userId: z.string().uuid(),
  userEmail: z.string().email().optional(),
  userName: z.string().optional(),
  locale: z.enum(["ar", "en", "fr"]).default("ar")
});

// server/services/chargily.ts
var CHARGILY_API_KEY = process.env.CHARGILY_API_KEY || "";
var CHARGILY_MODE = process.env.CHARGILY_MODE || "test";
if (!CHARGILY_API_KEY) {
  console.warn("\u26A0\uFE0F  CHARGILY_API_KEY not set. Chargily integration will not work.");
}
var chargilyClient = new ChargilyClient({
  api_key: CHARGILY_API_KEY,
  mode: CHARGILY_MODE
});
async function createCheckout(data) {
  const plan = getPlanById(data.planId);
  if (!plan) {
    throw new Error(`Invalid plan ID: ${data.planId}`);
  }
  const checkoutData = {
    amount: plan.priceDZD,
    currency: "dzd",
    success_url: `${process.env.VITE_APP_URL || "http://localhost:5000"}/success`,
    failure_url: `${process.env.VITE_APP_URL || "http://localhost:5000"}/subscribe`,
    webhook_endpoint: `${process.env.VITE_APP_URL || "http://localhost:5000"}/api/chargily/webhook`,
    locale: data.locale,
    // Optional: Add metadata to track the subscription
    metadata: {
      user_id: data.userId,
      plan_id: data.planId,
      plan_name: plan.nameAr,
      lectures: plan.lectures.toString(),
      total_minutes: plan.totalMinutes.toString()
    }
  };
  try {
    const checkout = await chargilyClient.createCheckout(checkoutData);
    console.log("[Chargily] Checkout created:", {
      checkout_id: checkout.id,
      amount: checkout.amount,
      user_id: data.userId,
      plan_id: data.planId
    });
    return checkout;
  } catch (error) {
    console.error("[Chargily] Error creating checkout:", error);
    throw new Error("Failed to create payment checkout. Please try again.");
  }
}
async function processWebhookEvent(event) {
  console.log("[Chargily] Webhook event received:", {
    type: event.type,
    id: event.id,
    data: event.data
  });
  const eventType = event.type;
  const eventData = event.data;
  switch (eventType) {
    case "checkout.paid":
      return await handleCheckoutPaid(eventData);
    case "checkout.failed":
      return await handleCheckoutFailed(eventData);
    default:
      console.log(`[Chargily] Unhandled event type: ${eventType}`);
      return { processed: false, reason: "Event type not handled" };
  }
}
async function handleCheckoutPaid(checkoutData) {
  console.log("[Chargily] Processing paid checkout:", checkoutData);
  const metadata = checkoutData.metadata || {};
  const userId = metadata.user_id;
  const planId = metadata.plan_id;
  if (!userId || !planId) {
    console.error("[Chargily] Missing required metadata in checkout:", metadata);
    return {
      processed: false,
      reason: "Missing user_id or plan_id in metadata"
    };
  }
  return {
    processed: true,
    action: "activate_subscription",
    data: {
      userId,
      planId,
      checkoutId: checkoutData.id,
      customerId: checkoutData.customer_id,
      amount: checkoutData.amount,
      currency: checkoutData.currency,
      transactionId: checkoutData.transaction_id || checkoutData.id,
      paymentMethod: checkoutData.payment_method
    }
  };
}
async function handleCheckoutFailed(checkoutData) {
  console.log("[Chargily] Processing failed checkout:", checkoutData);
  const metadata = checkoutData.metadata || {};
  return {
    processed: true,
    action: "payment_failed",
    data: {
      userId: metadata.user_id,
      planId: metadata.plan_id,
      checkoutId: checkoutData.id,
      reason: checkoutData.failure_reason || "Unknown"
    }
  };
}
function isChargilyConfigured() {
  return !!CHARGILY_API_KEY;
}

// server/api/chargily-checkout.ts
var createCheckoutSchema = z2.object({
  planId: z2.enum(["basic", "student", "professional"]),
  locale: z2.enum(["ar", "en", "fr"]).default("ar")
});
async function handleCreateCheckout(req, res) {
  try {
    if (!isChargilyConfigured()) {
      return res.status(500).json({
        error: "Payment system is not configured. Please contact support."
      });
    }
    const authenticatedUserId = req.authenticatedUserId;
    const authenticatedUser = req.authenticatedUser;
    if (!authenticatedUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to create a checkout"
      });
    }
    const validation = createCheckoutSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validation.error.errors
      });
    }
    const { planId, locale } = validation.data;
    const checkoutData = {
      planId,
      userId: authenticatedUserId,
      // Use server-verified user ID
      userEmail: authenticatedUser.email,
      userName: authenticatedUser.user_metadata?.name,
      locale
    };
    const checkout = await createCheckout(checkoutData);
    console.log("[API] Checkout created for authenticated user:", {
      userId: authenticatedUserId,
      planId,
      checkoutId: checkout.id
    });
    return res.status(200).json({
      success: true,
      checkoutId: checkout.id,
      checkoutUrl: checkout.checkout_url,
      amount: checkout.amount,
      currency: checkout.currency
    });
  } catch (error) {
    console.error("[API] Error creating Chargily checkout:", error);
    return res.status(500).json({
      error: "Failed to create payment session",
      message: error.message || "An unexpected error occurred"
    });
  }
}

// server/api/chargily-webhook.ts
import { verifySignature } from "@chargily/chargily-pay";
init_db();
var CHARGILY_API_KEY2 = process.env.CHARGILY_API_KEY || "";
async function handleChargilyWebhook(req, res) {
  try {
    const signature = req.get("signature") || "";
    if (!signature) {
      console.error("[Webhook] Missing signature header");
      return res.status(400).json({ error: "Missing signature" });
    }
    const rawBody = req.rawBody;
    if (!rawBody) {
      console.error("[Webhook] Raw body not available");
      return res.status(400).json({ error: "Invalid request body" });
    }
    try {
      if (!verifySignature(rawBody, signature, CHARGILY_API_KEY2)) {
        console.error("[Webhook] Invalid signature");
        return res.status(403).json({ error: "Invalid signature" });
      }
    } catch (error) {
      console.error("[Webhook] Signature verification error:", error);
      return res.status(403).json({ error: "Signature verification failed" });
    }
    const event = req.body;
    console.log("[Webhook] Received event:", {
      type: event.type,
      id: event.id
    });
    const result = await processWebhookEvent(event);
    if (result.processed && result.action === "activate_subscription") {
      await activateSubscription(result.data);
    }
    if (result.processed && result.action === "payment_failed") {
      console.log("[Webhook] Payment failed:", result.data);
    }
    return res.status(200).json({
      received: true,
      processed: result.processed
    });
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
    return res.status(200).json({
      received: true,
      error: error.message
    });
  }
}
function detectPlanFromAmount(amountDZD) {
  const allPlans = getAllPlans();
  let match = allPlans.find((p) => p.priceDZD === amountDZD);
  if (!match) {
    match = allPlans.find((p) => p.priceDZD === Math.round(amountDZD / 100));
  }
  if (!match) {
    if (amountDZD === 1200 || amountDZD === 12e4) return "basic";
    if (amountDZD === 4700 || amountDZD === 47e4) return "student";
  }
  return match?.id || null;
}
async function activateSubscription(data) {
  try {
    let planId = data.planId;
    if (!planId || !getPlanById(planId)) {
      const detected = detectPlanFromAmount(data.amount);
      if (detected) {
        planId = detected;
        console.log(`[Webhook] Detected plan '${planId}' from amount ${data.amount}`);
      }
    }
    const plan = getPlanById(planId);
    if (!plan) {
      console.error("[Webhook] Could not determine plan for amount:", data.amount);
      return;
    }
    if (!data.userId) {
      console.error("[Webhook] Missing user ID in metadata");
      throw new Error("Missing user ID");
    }
    await getOrCreateUser(data.userId);
    const subscription = await createSubscription({
      userId: data.userId,
      planName: plan.nameAr,
      planId: plan.id,
      totalMinutes: plan.totalMinutes,
      // ✅ Basic=225 min, Student=1350 min
      paymentProvider: "chargily"
    });
    console.log(`[Webhook] \u2705 Subscription activated: user=${data.userId} plan=${plan.id} minutes=${plan.totalMinutes}`);
    console.log(`[Webhook] Subscription ID: ${subscription.id}`);
  } catch (error) {
    console.error("[Webhook] Failed to activate subscription:", error);
    throw error;
  }
}

// server/api/user-status.ts
init_db();
init_db();
async function handleGetUserStatus(req, res) {
  const userId = req.authenticatedUserId || req.query.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", canProcess: false });
  }
  try {
    const subscription = await getActiveSubscription(userId);
    const isPaid = subscription !== null && subscription !== void 0 && subscription.plan_name !== "trial" && subscription.status === "active";
    if (isPaid && subscription) {
      const minutesUsed = Number(subscription.trial_minutes_used ?? 0);
      const minutesLimit = Number(subscription.trial_minutes_limit ?? 9999);
      const minutesRemaining = Math.max(0, minutesLimit - minutesUsed);
      const canProcess = minutesRemaining > 0;
      return res.json({
        isPaid: true,
        hasTrial: false,
        trialState: "PAID",
        planName: subscription.plan_name,
        minutesUsed,
        minutesLimit,
        minutesRemaining,
        dailyMinutesUsed: 0,
        dailyMinutesLimit: null,
        // no daily limit for paid
        dailyMinutesRemaining: null,
        daysRemaining: null,
        canProcess,
        blockReason: canProcess ? null : "SUBSCRIPTION_EXHAUSTED"
      });
    }
    const totalMinutesUsed = await getTotalUsage(userId);
    const todayUsage = await getTodayUsage(userId);
    const dailyMinutesUsed = Number(todayUsage?.minutes_used ?? 0);
    const firstUseDateStr = await getFirstUsageDate(userId);
    const totalMinutesRemaining = Math.max(
      0,
      TRIAL_LIMITS.MAX_AUDIO_MINUTES - totalMinutesUsed
    );
    const dailyMinutesRemaining = Math.max(
      0,
      TRIAL_LIMITS.DAILY_LIMIT_MINUTES - dailyMinutesUsed
    );
    const trialCheck = checkTrialStatus({
      firstUseDateStr,
      totalMinutesUsed,
      dailyMinutesUsed
    });
    let daysRemaining = TRIAL_LIMITS.VALIDITY_DAYS;
    if (firstUseDateStr) {
      const firstUse = new Date(firstUseDateStr);
      const daysPassed = Math.floor(
        (Date.now() - firstUse.getTime()) / (1e3 * 60 * 60 * 24)
      );
      daysRemaining = Math.max(0, TRIAL_LIMITS.VALIDITY_DAYS - daysPassed);
    }
    const trialState = !trialCheck.allowed ? trialCheck.blockReason === "days_expired" ? "EXPIRED" : trialCheck.blockReason === "daily_limit" ? "DAILY_LIMIT" : "USED_UP" : "ACTIVE";
    return res.json({
      isPaid: false,
      hasTrial: true,
      trialState,
      planName: "trial",
      minutesUsed: totalMinutesUsed,
      minutesLimit: TRIAL_LIMITS.MAX_AUDIO_MINUTES,
      minutesRemaining: totalMinutesRemaining,
      dailyMinutesUsed,
      dailyMinutesLimit: TRIAL_LIMITS.DAILY_LIMIT_MINUTES,
      dailyMinutesRemaining,
      daysRemaining,
      canProcess: trialCheck.allowed,
      blockReason: trialCheck.allowed ? null : trialCheck.blockReason
    });
  } catch (err) {
    console.error("[user-status] Error:", err);
    return res.status(500).json({ error: "Internal server error", canProcess: true });
  }
}

// server/api/admin.ts
init_db();
async function getAdminStats2(req, res) {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (error) {
    console.error("[Admin] Stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getAdminUsers(req, res) {
  try {
    const search = req.query.search;
    const planFilter = req.query.plan;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await getAllUsersWithStats({ search, planFilter, page, limit });
    res.json(result);
  } catch (error) {
    console.error("[Admin] Users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getAdminUserDetail(req, res) {
  try {
    const { id } = req.params;
    const detail = await getUserDetailForAdmin(id);
    if (!detail.user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(detail);
  } catch (error) {
    console.error("[Admin] User detail error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getUserRole2(req, res) {
  try {
    const userId = req.authenticatedUserId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const role = await getUserRole(userId);
    res.json({ role });
  } catch (error) {
    console.error("[Admin] Role check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// server/middleware/requireAdmin.ts
init_auth();
init_db();
async function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const userId = req.authenticatedUserId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const role = await getUserRole(userId);
      if (role !== "admin") {
        return res.status(403).json({
          error: "Forbidden",
          message: "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644",
          errorCode: "NOT_ADMIN"
        });
      }
      next();
    } catch (error) {
      console.error("[AdminAuth] Error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
}

// server/routes.ts
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
    // 25MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only audio files are allowed."));
    }
  }
});
async function registerRoutes(app2) {
  app2.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app2.post("/api/guest-session", createGuestSession);
  app2.post("/api/save-summary", saveSummary2);
  app2.get("/api/summaries", getSummaries2);
  app2.get("/api/summaries/:id", getSummaryById2);
  app2.delete("/api/summaries/:id", deleteSummary2);
  app2.post("/api/migrate-guest", migrateGuest);
  app2.get("/api/trial-status", getTrialStatus);
  app2.get("/api/user", getUser2);
  app2.post("/api/user/upsert", upsertUser);
  const { requireAuth: requireAuth2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
  app2.get("/api/user/settings", requireAuth2, getUserSettings);
  app2.post("/api/user/settings", requireAuth2, updateUserSettings);
  app2.get("/api/user/status", handleGetUserStatus);
  app2.patch("/api/user/profile", requireAuth2, updateProfile);
  app2.delete("/api/user/account", requireAuth2, deleteAccount);
  app2.get("/api/user/role", requireAuth2, getUserRole2);
  app2.get("/api/admin/stats", requireAdmin, getAdminStats2);
  app2.get("/api/admin/users", requireAdmin, getAdminUsers);
  app2.get("/api/admin/users/:id", requireAdmin, getAdminUserDetail);
  const { getLatestPayment: getLatestPayment2 } = await Promise.resolve().then(() => (init_payment_status(), payment_status_exports));
  app2.get("/api/payment/latest", getLatestPayment2);
  const { getPaymentLink: getPaymentLink2, checkPaymentLinksStatus: checkPaymentLinksStatus2 } = await Promise.resolve().then(() => (init_payment_link(), payment_link_exports));
  app2.get("/api/payment-link/:planId", getPaymentLink2);
  app2.get("/api/payment-links/status", checkPaymentLinksStatus2);
  app2.post("/api/chargily/create-checkout", requireAuth2, handleCreateCheckout);
  app2.post(
    "/api/chargily/webhook",
    bodyParser.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    }),
    handleChargilyWebhook
  );
  app2.post("/api/summarize", async (req, res) => {
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
        language
      });
      res.json({
        summary: result.summary,
        keyPoints: result.keyPoints,
        processingTime: result.processingTime
      });
    } catch (error) {
      console.error("Error in /api/summarize:", error);
      if (error.message?.includes("XAI_API_KEY")) {
        return res.status(500).json({
          error: "XAI API key is not configured"
        });
      }
      res.status(500).json({
        error: error.message || "Failed to summarize text"
      });
    }
  });
  app2.post("/api/process-audio-live", upload.single("audio"), async (req, res) => {
    try {
      const file = req.file;
      const language = req.body.language || "ar";
      const audioDuration = req.body.audioDuration ? parseFloat(req.body.audioDuration) : null;
      if (!file) {
        return res.status(400).json({ error: "No audio file provided" });
      }
      const validLanguages = ["ar", "fr", "dz"];
      if (!validLanguages.includes(language)) {
        return res.status(400).json({ error: "Invalid language selection" });
      }
      if (audioDuration && audioDuration > 2700) {
        return res.status(403).json({
          error: "\u0645\u062F\u0629 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0635\u0648\u062A\u064A \u062A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D (45 \u062F\u0642\u064A\u0642\u0629). \u064A\u0631\u062C\u0649 \u062A\u0642\u0635\u064A\u0631 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0648\u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
          errorCode: "DURATION_EXCEEDED",
          duration: audioDuration,
          maxDuration: 2700
        });
      }
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
          keyPoints: []
        });
      }
      const grokResult = await summarizeWithGrok({
        transcript: transcription,
        language
      });
      res.json({
        transcription,
        summary: grokResult.summary,
        keyPoints: grokResult.keyPoints || [],
        audioDuration: audioDuration || null,
        processedAt: (/* @__PURE__ */ new Date()).toISOString(),
        isLive: true
      });
    } catch (error) {
      console.error("Error in live processing:", error);
      res.json({
        transcription: "",
        summary: "",
        keyPoints: [],
        error: error.message || "Failed to process audio chunk"
      });
    }
  });
  app2.post("/api/process-audio", upload.single("audio"), async (req, res) => {
    const startTime = Date.now();
    const timings = {};
    console.log("[TIMING] /api/process-audio START");
    try {
      const file = req.file;
      const language = req.body.language || "ar";
      const clientDuration = req.body.audioDuration ? parseFloat(req.body.audioDuration) : null;
      const userId = req.authenticatedUserId || req.body.userId || req.headers["x-user-id"];
      timings.upload = Date.now() - startTime;
      console.log(`[TIMING] Upload received: ${timings.upload}ms | File: ${file?.originalname}, Size: ${file?.size || 0}`);
      if (!file) {
        console.log("[FLOW] ERROR: No audio file provided");
        return res.status(400).json({ error: "No audio file provided" });
      }
      if (!userId) {
        return res.status(401).json({
          error: "User ID required",
          errorCode: "UNAUTHORIZED",
          message: "\u064A\u062C\u0628 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0647 \u0627\u0644\u062E\u062F\u0645\u0629"
        });
      }
      const validLanguages = ["ar", "fr", "dz"];
      if (!validLanguages.includes(language)) {
        return res.status(400).json({ error: "Invalid language selection" });
      }
      const durationResult = await validateAndGetDuration(
        file.buffer,
        file.mimetype,
        clientDuration
      );
      const audioDuration = durationResult.duration;
      console.log(`[process-audio] Duration: ${audioDuration.toFixed(2)}s (source: ${durationResult.source})`);
      if (audioDuration > 2700) {
        return res.status(403).json({
          error: "\u0645\u062F\u0629 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0635\u0648\u062A\u064A \u062A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D (45 \u062F\u0642\u064A\u0642\u0629). \u064A\u0631\u062C\u0649 \u062A\u0642\u0635\u064A\u0631 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0648\u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
          errorCode: "DURATION_EXCEEDED",
          duration: audioDuration,
          maxDuration: 2700
        });
      }
      const trialValidation = await validateTrialUsage(userId, audioDuration);
      if (!trialValidation.allowed) {
        console.log(`[process-audio] User ${userId} at limit (${trialValidation.errorCode}) - but completing current operation`);
      } else {
        console.log(`[process-audio] User ${userId} trial OK. Usage: total=${trialValidation.totalMinutesUsed.toFixed(2)}min, today=${trialValidation.dailyMinutesUsed.toFixed(2)}min`);
      }
      const wasAtLimit = !trialValidation.allowed;
      const limitReason = trialValidation.errorCode;
      const transcriptionStart = Date.now();
      console.log(`[TIMING] Whisper transcription START`);
      const transcription = await transcribeAudio(
        file.buffer,
        file.originalname,
        file.mimetype,
        language
      );
      timings.transcription = Date.now() - transcriptionStart;
      console.log(`[TIMING] Whisper transcription DONE: ${timings.transcription}ms | ${transcription.length} chars`);
      if (!transcription || transcription.trim().length === 0) {
        console.log(`[TIMING] ERROR: Transcript is empty or null`);
        return res.status(400).json({ error: "Could not transcribe audio" });
      }
      const summarizationStart = Date.now();
      console.log(`[TIMING] Grok summarization START`);
      const grokResult = await summarizeWithGrok({
        transcript: transcription,
        language
      });
      timings.summarization = Date.now() - summarizationStart;
      console.log(`[TIMING] Grok summarization DONE: ${timings.summarization}ms | ${grokResult.summary?.length || 0} chars`);
      const processedAt = (/* @__PURE__ */ new Date()).toISOString();
      const dbSaveStart = Date.now();
      console.log(`[TIMING] Database save START`);
      const title = grokResult.summary.split(" ").slice(0, 5).join(" ") + "...";
      let savedSummary = null;
      let saveError = null;
      try {
        console.log(`[DB] Inserting summary for user ${userId}...`);
        savedSummary = await saveSummary({
          userId,
          title,
          content: grokResult.summary,
          transcript: transcription,
          keyPoints: grokResult.keyPoints || [],
          language,
          audioDuration
        });
        await recordUsage(userId, audioDuration / 60);
        timings.dbSave = Date.now() - dbSaveStart;
        console.log(`[TIMING] Database save DONE: ${timings.dbSave}ms | ID: ${savedSummary?.id}`);
      } catch (dbError) {
        timings.dbSave = Date.now() - dbSaveStart;
        console.error(`[TIMING] Database save ERROR (${timings.dbSave}ms):`, dbError.message);
      }
      const audioDurationMinutes = audioDuration / 60;
      const newDailyUsage = trialValidation.dailyMinutesUsed + audioDurationMinutes;
      const newDailyRemaining = Math.max(0, 30 - newDailyUsage);
      const isDailyLimitReached = newDailyRemaining <= 0;
      const isTrialExpired2 = limitReason === "TRIAL_DAYS_EXPIRED";
      const nextBlocked = isDailyLimitReached || isTrialExpired2;
      const nextBlockReason = isTrialExpired2 ? "days_expired" : isDailyLimitReached ? "daily_limit" : null;
      const responsePayload = {
        transcription,
        summary: grokResult.summary,
        keyPoints: grokResult.keyPoints || [],
        audioDuration,
        // Server-validated duration in seconds
        durationSource: durationResult.source,
        // For debugging
        processedAt,
        savedSummaryId: savedSummary?.id || null,
        // Let client know if save succeeded
        // Trial status for client to update local state and show modals
        trialStatus: {
          wasAtLimit,
          // Was user already at limit before this request?
          limitReason,
          // Which limit was reached (if any)
          totalMinutesUsed: trialValidation.totalMinutesUsed + audioDurationMinutes,
          dailyMinutesUsed: newDailyUsage,
          dailyMinutesRemaining: newDailyRemaining,
          nextBlocked,
          // Will next attempt be blocked (daily or expiry)?
          nextBlockReason
          // Reason for next block: 'daily_limit' or 'days_expired'
        }
      };
      timings.total = Date.now() - startTime;
      console.log(`[TIMING] ====== PERFORMANCE SUMMARY ======`);
      console.log(`[TIMING] Upload:        ${timings.upload}ms`);
      console.log(`[TIMING] Transcription: ${timings.transcription}ms`);
      console.log(`[TIMING] Summarization: ${timings.summarization}ms`);
      console.log(`[TIMING] Total:         ${timings.total}ms`);
      console.log(`[TIMING] ==================================`);
      res.json({ ...responsePayload, _timings: timings });
      console.log(`[TIMING] Response sent`);
    } catch (error) {
      console.error("FINAL_SUMMARY: ERROR in processing:", error);
      const errorResponse = {
        error: error.message || "Failed to process audio",
        errorCode: error.message?.includes("XAI_API_KEY") ? "API_KEY_MISSING" : "PROCESSING_ERROR",
        transcription: "",
        summary: "",
        keyPoints: []
      };
      console.log(`FINAL_SUMMARY: sending error response`);
      return res.status(500).json(errorResponse);
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs4 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import fs3 from "fs";
import dotenv2 from "dotenv";
var envPath = path3.resolve(import.meta.dirname, ".env");
var env = fs3.existsSync(envPath) ? dotenv2.parse(fs3.readFileSync(envPath, "utf8")) : {};
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  define: {
    // Force-inject VITE_ env vars from project root .env
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ""),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""),
    "import.meta.env.VITE_CHARGILY_LINK_BASIC": JSON.stringify(env.CHARGILY_LINK_BASIC || process.env.CHARGILY_LINK_BASIC || ""),
    "import.meta.env.VITE_CHARGILY_LINK_STUDENT": JSON.stringify(env.CHARGILY_LINK_STUDENT || process.env.CHARGILY_LINK_STUDENT || "")
  },
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  envDir: path3.resolve(import.meta.dirname),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url2 = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs4.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url2, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs4.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
