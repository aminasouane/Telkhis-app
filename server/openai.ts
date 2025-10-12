import OpenAI, { toFile } from "openai";

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
  mimetype: string
): Promise<string> {
  const openai = getOpenAIClient();

  // Convert buffer to file-like object using OpenAI's toFile helper
  const audioFile = await toFile(audioBuffer, filename, {
    type: mimetype,
  });

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    language: "ar", // Arabic language
  });

  return transcription.text;
}

export async function summarizeText(text: string): Promise<{
  summary: string;
  keyPoints: string[];
}> {
  const openai = getOpenAIClient();
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `أنت مساعد متخصص في تلخيص المحاضرات والنصوص الأكاديمية باللغة العربية. 
مهمتك هي قراءة النص المقدم وتقديم:
1. ملخص شامل ومختصر للمحتوى (2-3 جمل)
2. قائمة بالنقاط الرئيسية (3-5 نقاط)

يجب أن يكون الملخص واضحاً ومفيداً للطالب.`,
      },
      {
        role: "user",
        content: `الرجاء تلخيص النص التالي:\n\n${text}`,
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
