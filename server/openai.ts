import OpenAI from "openai";
import { transcribeWithWhisperCpp, ensureModelReady } from "./services/whisperCpp";

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not configured");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  mimetype: string,
  language: string = "ar"
): Promise<string> {
  console.log(`[transcribeAudio] Using whisper.cpp for transcription`);
  console.log(`[transcribeAudio] File: ${filename}, Language: ${language}`);

  const transcription = await transcribeWithWhisperCpp(audioBuffer, filename, language);
  return transcription;
}

export async function initializeWhisper(): Promise<void> {
  await ensureModelReady();
}

export async function summarizeText(
  text: string,
  language: string = "ar"
): Promise<{
  summary: string;
  keyPoints: string[];
}> {
  const openai = getOpenAIClient();

  // Prepare system message based on selected language
  let systemMessage = "";
  let userMessage = "";

  switch (language) {
    case "ar":
      systemMessage = `أنت مساعد متخصص في تلخيص المحاضرات والنصوص الأكاديمية باللغة العربية الفصحى. 
مهمتك هي قراءة النص المقدم وتقديم:
1. ملخص شامل ومختصر للمحتوى (2-3 جمل)
2. قائمة بالنقاط الرئيسية (3-5 نقاط)

يجب أن يكون الملخص واضحاً ومفيداً للطالب باللغة العربية الفصحى.`;
      userMessage = `الرجاء تلخيص النص التالي:\n\n${text}`;
      break;

    case "fr":
      systemMessage = `Vous êtes un assistant spécialisé dans la synthèse de cours et de textes académiques en français.
Votre tâche est de lire le texte fourni et de fournir :
1. Un résumé complet et concis du contenu (2-3 phrases)
2. Une liste des points clés (3-5 points)

Le résumé doit être clair et utile pour l'étudiant en français académique.`;
      userMessage = `Veuillez résumer le texte suivant :\n\n${text}`;
      break;

    case "dz":
      // اللهجة الجزائرية: نحول التلخيص إلى عربية فصحى مبسطة
      // لأن العربية الفصحى أكثر وضوحاً ومناسبة للسياق الأكاديمي
      systemMessage = `أنت مساعد متخصص في تلخيص المحاضرات والنصوص الأكاديمية.
مهمتك هي قراءة النص المقدم (الذي قد يكون باللهجة الجزائرية أو العربية) وتقديم تلخيص بالعربية الفصحى المبسطة والواضحة.
قدّم:
1. ملخص شامل ومختصر للمحتوى (2-3 جمل)
2. قائمة بالنقاط الرئيسية (3-5 نقاط)

يجب أن يكون التلخيص بالعربية الفصحى الواضحة والمفهومة للطالب.`;
      userMessage = `الرجاء تلخيص النص التالي:\n\n${text}`;
      break;

    default:
      systemMessage = `أنت مساعد متخصص في تلخيص المحاضرات والنصوص الأكاديمية باللغة العربية الفصحى. 
مهمتك هي قراءة النص المقدم وتقديم:
1. ملخص شامل ومختصر للمحتوى (2-3 جمل)
2. قائمة بالنقاط الرئيسية (3-5 نقاط)

يجب أن يكون الملخص واضحاً ومفيداً للطالب.`;
      userMessage = `الرجاء تلخيص النص التالي:\n\n${text}`;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "summary_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "ملخص شامل للنص",
            },
            keyPoints: {
              type: "array",
              items: { type: "string" },
              description: "قائمة بالنقاط الرئيسية",
            },
          },
          required: ["summary", "keyPoints"],
          additionalProperties: false,
        },
      },
    },
  });

  const result = JSON.parse(completion.choices[0].message.content || "{}");
  return {
    summary: result.summary || "",
    keyPoints: result.keyPoints || [],
  };
}
