import { NextRequest, NextResponse } from "next/server";

type GeminiGenerateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

const GEMINI_MODEL = "gemini-2.5-flash";
const RETRYABLE_STATUS = new Set([429, 500, 503]);

type CallModelResult =
  | {
      ok: true;
      text: string;
    }
  | {
      ok: false;
      status: number;
      errorText: string;
    };

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeFeedback(text: string, fallback = "Không có feedback.") {
  const compact = text
    .replace(/```json|```/gi, "")
    .replace(/Here is (the )?JSON(?: request| response)?[:\s]*/gi, "")
    .trim();

  if (!compact) return fallback;
  const sentences = compact.split(/(?<=[.!?])\s+/).filter(Boolean);
  return (sentences.slice(0, 2).join(" ") || compact).slice(0, 320);
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as { score?: number; feedback?: string };
  } catch {
    // continue
  }

  const jsonBlock = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonBlock) return null;

  try {
    return JSON.parse(jsonBlock[0]) as { score?: number; feedback?: string };
  } catch {
    return null;
  }
}

function heuristicScore(input: string) {
  const text = input.trim();
  if (!text) return 5;

  const words = text.split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words.map((item) => item.toLowerCase()));
  const hasStructure = /:|\n|-|\d\)|\b(role|task|context|output|yêu cầu|mục tiêu|ràng buộc)\b/i.test(text);
  const hasReasonableLength = words.length >= 12;
  const diversity = uniqueWords.size / Math.max(1, words.length);
  const repeatedCharPattern = /(.)\1{4,}/.test(text);
  const looksRandom = !/[a-zA-ZÀ-ỹ]/.test(text) || words.length <= 2 || repeatedCharPattern;

  if (looksRandom) return 10;

  let score = 35;
  if (hasReasonableLength) score += 20;
  if (hasStructure) score += 20;
  if (diversity >= 0.55) score += 12;
  if (/\b(json|table|bullet|step|rubric|tiêu chí)\b/i.test(text)) score += 8;

  return Math.max(0, Math.min(95, Math.round(score)));
}

async function callModel(args: {
  apiKey: string;
  apiVersion: "v1beta" | "v1";
  prompt: string;
  responseMimeType?: string;
}): Promise<CallModelResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/${args.apiVersion}/models/${GEMINI_MODEL}:generateContent?key=${args.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: args.prompt }] }],
        generationConfig: {
          responseMimeType: args.responseMimeType,
          temperature: 0.35,
        },
      }),
    },
  );

  if (response.ok) {
    const data = (await response.json()) as GeminiGenerateResponse;
    return { ok: true, text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "" };
  }

  return { ok: false, status: response.status, errorText: await response.text() };
}

async function runGemini(args: {
  apiKey: string;
  prompt: string;
  responseMimeType?: string;
}) {
  const apiVersions: Array<"v1beta" | "v1"> = ["v1beta", "v1"];
  const errors: string[] = [];

  for (const apiVersion of apiVersions) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const result = await callModel({
        apiKey: args.apiKey,
        apiVersion,
        prompt: args.prompt,
        responseMimeType: args.responseMimeType,
      });

      if (result.ok) {
        return { ok: true as const, text: result.text, model: GEMINI_MODEL, apiVersion };
      }

      errors.push(`${apiVersion}/${GEMINI_MODEL} [${result.status}]#${attempt}`);

      if (!RETRYABLE_STATUS.has(result.status)) break;
      if (attempt < 3) await wait(250 * attempt);
    }
  }

  return { ok: false as const, error: errors.join(" | ") };
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, context, mode } = (await request.json()) as {
      prompt?: string;
      context?: string;
      mode?: "judge" | "generate";
    };

    if (!prompt) return NextResponse.json({ error: "Thiếu prompt." }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Chưa cấu hình GEMINI_API_KEY trên server." }, { status: 500 });

    if (mode === "generate") {
      const generatorPrompt = `Bạn là AI thực thi prompt cho nền tảng Blabla.\nContext: ${context ?? "General"}\nYêu cầu bắt buộc: trả lời ngắn gọn, rõ ý, đi thẳng vào kết quả; không lan man.\n\nPrompt người dùng:\n${prompt}`;
      const result = await runGemini({ apiKey, prompt: generatorPrompt });
      if (!result.ok) {
        return NextResponse.json({ error: `Không gọi được Gemini 2.5 Flash để tạo nội dung. Chi tiết: ${result.error}` }, { status: 502 });
      }

      return NextResponse.json({ output: normalizeFeedback(result.text, "Không có nội dung."), model: result.model, apiVersion: result.apiVersion });
    }

    const userPrompt = `Bạn là AI Judge cho nền tảng Blabla.\nContext: ${context ?? "General"}\nHãy chấm nghiêm khắc theo chất lượng thật sự:\n- Prompt mơ hồ/vô nghĩa/ngắn quá => điểm thấp (<30).\n- Prompt có cấu trúc, mục tiêu, ràng buộc rõ => điểm cao hơn.\nYêu cầu output: JSON duy nhất theo format {"score": number, "feedback": string}.\nFeedback tối đa 2 câu, ngắn gọn và cụ thể.\n\nPrompt người dùng:\n${prompt}`;

    const result = await runGemini({ apiKey, prompt: userPrompt, responseMimeType: "application/json" });
    if (!result.ok) {
      return NextResponse.json({ error: `Không gọi được Gemini 2.5 Flash. Chi tiết: ${result.error}` }, { status: 502 });
    }

    const parsed = extractJsonObject(result.text);
    const baseline = heuristicScore(prompt);

    if (parsed) {
      const aiScore = Number(parsed.score ?? baseline);
      const safeScore = Number.isFinite(aiScore) ? aiScore : baseline;
      const blended = Math.round(safeScore * 0.7 + baseline * 0.3);
      return NextResponse.json({
        score: Math.max(0, Math.min(100, blended)),
        feedback: normalizeFeedback(String(parsed.feedback ?? ""), "Cần nêu rõ mục tiêu, đầu ra và ràng buộc."),
        model: result.model,
        apiVersion: result.apiVersion,
      });
    }

    return NextResponse.json({
      score: baseline,
      feedback: normalizeFeedback(result.text, "Cần viết prompt rõ mục tiêu, đầu ra và tiêu chí."),
      model: result.model,
      apiVersion: result.apiVersion,
    });
  } catch {
    return NextResponse.json({ error: "Không thể xử lý yêu cầu AI." }, { status: 500 });
  }
}
