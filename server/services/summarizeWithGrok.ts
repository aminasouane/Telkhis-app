import OpenAI from "openai";

let grokClient: OpenAI | null = null;

function getGrokClient(): OpenAI {
  if (!process.env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is not configured");
  }
  if (!grokClient) {
    grokClient = new OpenAI({
      baseURL: "https://api.x.ai/v1",
      apiKey: process.env.XAI_API_KEY,
    });
  }
  return grokClient;
}

export const SUMMARIZATION_PROMPTS = {
  ar: `أنت مساعد ذكي متخصص في تلخيص المحاضرات الأكاديمية.

المطلوب منك:
1. تلخيص النص بلغة عربية فصحى واضحة ومفهومة
2. تنظيم الملخص في نقاط مرقمة
3. استخراج الأفكار الرئيسية والمفاهيم الأساسية
4. الحفاظ على المعلومات المهمة دون اختصار مُخل
5. إضافة عناوين فرعية إذا كان النص طويلاً

أسلوب الكتابة:
- استخدم لغة أكاديمية واضحة
- تجنب التكرار
- حافظ على تسلسل منطقي للأفكار`,

  fr: `Vous êtes un assistant intelligent spécialisé dans le résumé de cours académiques.

Votre mission:
1. Résumer le texte en français clair et compréhensible
2. Organiser le résumé en points numérotés
3. Extraire les idées principales et les concepts clés
4. Préserver les informations importantes sans abréviation excessive
5. Ajouter des sous-titres si le texte est long

Style d'écriture:
- Utilisez un langage académique clair
- Évitez les répétitions
- Maintenez une séquence logique des idées`,

  dz: `أنت مساعد ذكي متخصص في تلخيص المحاضرات.

المطلوب منك:
1. تلخيص النص بلغة عربية واضحة (يمكن استخدام بعض التعبيرات الدارجة الجزائرية إذا لزم الأمر)
2. تنظيم الملخص في نقاط مرقمة
3. استخراج الأفكار الرئيسية
4. الحفاظ على المعلومات المهمة
5. إضافة عناوين فرعية إذا كان النص طويلاً

أسلوب الكتابة:
- استخدم لغة بسيطة ومفهومة
- تجنب التكرار
- حافظ على تسلسل منطقي للأفكار`,
};

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

  const userPrompt = `النص المراد تلخيصه:

${transcript}

---
قدم الملخص مع النقاط الرئيسية:`;

  try {
    const client = getGrokClient();
    const response = await client.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    });

    const summary = response.choices[0]?.message?.content || "";
    const processingTime = Date.now() - startTime;

    const keyPoints = extractKeyPoints(summary);

    return {
      summary,
      keyPoints,
      processingTime,
    };
  } catch (error: any) {
    console.error("Grok summarization error:", error);

    if (error.status === 401) {
      throw new Error("Invalid XAI API key");
    }
    if (error.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (error.status === 503) {
      throw new Error("Grok service temporarily unavailable");
    }

    throw new Error(`Summarization failed: ${error.message}`);
  }
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
