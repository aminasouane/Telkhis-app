import OpenAI from "openai";

const GROK_TIMEOUT_MS = 60000; // 60 seconds timeout for Grok API
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

// Grok API hard limits: 5 concurrent requests, 32 RPM
const MAX_CONCURRENT_REQUESTS = 5;
let activeRequests = 0;
const requestQueue: Array<() => void> = [];

function acquireSemaphore(): Promise<void> {
  return new Promise((resolve) => {
    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
      activeRequests++;
      resolve();
    } else {
      requestQueue.push(() => {
        activeRequests++;
        resolve();
      });
    }
  });
}

function releaseSemaphore(): void {
  activeRequests--;
  if (requestQueue.length > 0) {
    const next = requestQueue.shift()!;
    next();
  }
}

let grokClient: OpenAI | null = null;

function getGrokClient(): OpenAI {
  if (!process.env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is not configured");
  }
  if (!grokClient) {
    grokClient = new OpenAI({
      baseURL: "https://api.x.ai/v1",
      apiKey: process.env.XAI_API_KEY,
      timeout: GROK_TIMEOUT_MS,
    });
  }
  return grokClient;
}

// Prompts updated to request plain text without markdown formatting
export const SUMMARIZATION_PROMPTS = {
  ar: `أنت مساعد ذكي متخصص في تلخيص المحاضرات الأكاديمية.

المطلوب منك:
1. تلخيص النص بلغة عربية فصحى واضحة ومفهومة
2. تنظيم الملخص في فقرات متسلسلة ومرقمة (1. 2. 3. إلخ)
3. استخراج الأفكار الرئيسية والمفاهيم الأساسية
4. الحفاظ على المعلومات المهمة دون اختصار مُخل

تنسيق الإخراج:
- اكتب نصاً عادياً بدون رموز Markdown
- لا تستخدم # أو ## أو * أو - للتنسيق
- استخدم الأرقام العربية (1. 2. 3.) للترقيم فقط
- اكتب فقرات نصية واضحة ومتصلة

أسلوب الكتابة:
- استخدم لغة أكاديمية واضحة
- تجنب التكرار
- حافظ على تسلسل منطقي للأفكار`,

  fr: `Vous êtes un assistant intelligent spécialisé dans le résumé de cours académiques.

Votre mission:
1. Résumer le texte en français clair et compréhensible
2. Organiser le résumé en paragraphes numérotés (1. 2. 3. etc.)
3. Extraire les idées principales et les concepts clés
4. Préserver les informations importantes sans abréviation excessive

Format de sortie:
- Écrivez du texte brut sans symboles Markdown
- N'utilisez pas #, ##, *, ou - pour le formatage
- Utilisez uniquement des chiffres (1. 2. 3.) pour la numérotation
- Rédigez des paragraphes clairs et cohérents

Style d'écriture:
- Utilisez un langage académique clair
- Évitez les répétitions
- Maintenez une séquence logique des idées`,

  dz: `أنت مساعد ذكي متخصص في تلخيص المحاضرات.

المطلوب منك:
1. تلخيص النص بلغة عربية واضحة (يمكن استخدام بعض التعبيرات الدارجة الجزائرية إذا لزم الأمر)
2. تنظيم الملخص في فقرات متسلسلة ومرقمة (1. 2. 3. إلخ)
3. استخراج الأفكار الرئيسية
4. الحفاظ على المعلومات المهمة

تنسيق الإخراج:
- اكتب نصاً عادياً بدون رموز Markdown
- لا تستخدم # أو ## أو * أو - للتنسيق
- استخدم الأرقام (1. 2. 3.) للترقيم فقط
- اكتب فقرات نصية واضحة ومتصلة

أسلوب الكتابة:
- استخدم لغة بسيطة ومفهومة
- تجنب التكرار
- حافظ على تسلسل منطقي للأفكار`,
};

// Clean markdown symbols and normalize text for display
export function cleanSummaryText(text: string): string {
  let cleaned = text;
  
  // Remove markdown headers (# ## ### etc.)
  cleaned = cleaned.replace(/^#{1,6}\s*/gm, "");
  
  // Remove bold/italic markers (* ** *** ___)
  cleaned = cleaned.replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1");
  cleaned = cleaned.replace(/_{1,3}([^_]+)_{1,3}/g, "$1");
  
  // Remove bullet points (- * •) at start of lines, keep the text
  cleaned = cleaned.replace(/^[\s]*[-*•]\s+/gm, "");
  
  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  
  // Remove horizontal rules
  cleaned = cleaned.replace(/^[-*_]{3,}$/gm, "");
  
  // Remove links but keep text [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  
  // Normalize multiple newlines to double newline
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  
  // Trim whitespace from each line
  cleaned = cleaned.split("\n").map(line => line.trim()).join("\n");
  
  // Final trim
  cleaned = cleaned.trim();
  
  return cleaned;
}

export interface SummarizeOptions {
  transcript: string;
  language: "ar" | "fr" | "dz";
  maxTokens?: number;
}

export interface SummarizeResult {
  summary: string;
  keyPoints?: string[];
  processingTime: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function summarizeWithGrok(
  options: SummarizeOptions
): Promise<SummarizeResult> {
  const { transcript, language, maxTokens = 2000 } = options;

  if (!process.env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is not configured");
  }

  if (!transcript || transcript.trim().length === 0) {
    throw new Error("Transcript is empty");
  }

  const startTime = Date.now();
  const systemPrompt = SUMMARIZATION_PROMPTS[language] || SUMMARIZATION_PROMPTS.ar;

  const userPrompt = `النص المراد تلخيصه:\n\n${transcript}\n\n---\nقدم الملخص مع النقاط الرئيسية:`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Acquire semaphore slot — blocks here if 5 requests are already in-flight
    await acquireSemaphore();
    let retryDelayMs: number | null = null;

    try {
      console.log(`Starting Grok summarization for ${transcript.length} chars in ${language} (Attempt ${attempt + 1}/${MAX_RETRIES + 1}, active: ${activeRequests})...`);
      
      const client = getGrokClient();
      
      // Create AbortController for timeout handling
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
              { role: "user", content: userPrompt },
            ],
            max_tokens: maxTokens,
            temperature: 0.3,
          },
          { signal: abortController.signal }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const rawSummary = response.choices[0]?.message?.content || "";
      const processingTime = Date.now() - startTime;
      
      console.log(`Grok summarization completed in ${processingTime}ms`);

      // Clean markdown symbols from the summary
      const summary = cleanSummaryText(rawSummary);
      const keyPoints = extractKeyPoints(summary);

      return {
        summary,
        keyPoints,
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`Grok summarization error after ${processingTime}ms (Attempt ${attempt + 1}):`, error.message || error);

      const isRateLimit = error.status === 429 || error.message?.includes("429") || error.message?.includes("Too many requests");
      const isNetworkError = error.code === "ETIMEDOUT" || error.code === "ECONNABORTED" || error.status === 503 || error.status === 500;

      if ((isRateLimit || isNetworkError) && attempt < MAX_RETRIES) {
        // Exponential backoff: 2s, 4s, 8s — sleep happens AFTER releasing semaphore
        retryDelayMs = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.log(`Retrying Grok API in ${retryDelayMs}ms due to ${isRateLimit ? 'rate limit' : 'network error'}...`);
      } else {
        // Non-retryable or exhausted retries — throw formatted error
        if (error.name === "AbortError" || error.message?.includes("aborted")) {
          throw new Error("انتهت مهلة الاتصال بخادم التلخيص (60 ثانية). يرجى المحاولة مرة أخرى.");
        }
        if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
          throw new Error("انتهت مهلة الاتصال بخادم التلخيص. يرجى المحاولة مرة أخرى.");
        }
        if (error.status === 401) {
          throw new Error("مفتاح API غير صالح");
        }
        if (error.status === 429 || error.message?.includes("429") || error.message?.includes("Too many requests")) {
          throw new Error("الخادم يواجه ضغطاً عالياً حالياً. يرجى المحاولة بعد لحظات قليلة.");
        }
        if (error.status === 503 || error.status === 500) {
          throw new Error("خدمة التلخيص غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.");
        }
        throw new Error(`فشل التلخيص: ${error.message || "خطأ غير معروف"}`);
      }
    } finally {
      // Always release the semaphore slot so the queue can progress
      releaseSemaphore();
    }

    // Sleep OUTSIDE the semaphore hold so the freed slot can serve other requests
    if (retryDelayMs !== null) {
      await sleep(retryDelayMs);
    }
  }
  
  throw new Error("فشل التلخيص بعد عدة محاولات.");
}

function extractKeyPoints(summary: string): string[] {
  const lines = summary.split("\n");
  const keyPoints: string[] = [];

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
