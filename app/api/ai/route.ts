import { NextRequest, NextResponse } from "next/server";

type GeminiGenerateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

const GEMINI_MODEL = "gemini-2.5-flash";
const RETRYABLE_STATUS = new Set([429, 500, 503]);

type CallModelResult = {
  ok: true;
  text: string;
} | {
  ok: false;
  status: number;
  errorText: string;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function normalizeFeedback(text: string, fallback = "Không có feedback.") {
  const compact = text
    .replace(/```json|```/gi, "")
    .replace(/Here is (the )?JSON(?: request| response)?[:\s]*/gi, "")
    .trim();

  if (!compact) return fallback;
  const sentences = compact.split(/(?<=[.!?])\s+/).filter(Boolean);
  return (sentences.slice(0, 2).join(" ") || compact).slice(0, 280);
}

async function callModel(args: {
  apiKey: string;
  apiVersion: "v1beta" | "v1";
  prompt: string;
  responseMimeType?: string;
  maxOutputTokens: number;
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
          maxOutputTokens: args.maxOutputTokens,
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
  maxOutputTokens: number;
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
        maxOutputTokens: args.maxOutputTokens,
      });

      if (result.ok) {
        return { ok: true as const, text: result.text, model: GEMINI_MODEL, apiVersion };
      }

      errors.push(`${apiVersion}/${GEMINI_MODEL} [${result.status}]#${attempt}`);

      if (!RETRYABLE_STATUS.has(result.status)) {
        break;
      }

      if (attempt < 3) {
        await wait(250 * attempt);
      }
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

    if (!prompt) {
      return NextResponse.json({ error: "Thiếu prompt." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình GEMINI_API_KEY trên server." },
        { status: 500 },
      );
    }

    if (mode === "generate") {
      const generatorPrompt = `Bạn là AI thực thi prompt cho nền tảng Blabla.\nContext: ${context ?? "General"}\nYêu cầu bắt buộc:\n- Trả lời ngắn gọn, tối đa 5 câu hoặc 140 từ.\n- Chỉ đưa nội dung cốt lõi, không lan man.\n- Không mở đầu dài dòng.\n\nPrompt người dùng:\n${prompt}`;
      const result = await runGemini({ apiKey, prompt: generatorPrompt, maxOutputTokens: 320 });
      if (!result.ok) {
        return NextResponse.json(
          {
            error: `Không gọi được Gemini 2.5 Flash để tạo nội dung. Chi tiết: ${result.error}`,
          },
          { status: 502 },
        );
      }

      return NextResponse.json({ output: normalizeFeedback(result.text, "Không có nội dung."), model: result.model, apiVersion: result.apiVersion });
    }

    const userPrompt = `Bạn là AI Judge cho nền tảng Blabla.\nContext: ${context ?? "General"}\nNhiệm vụ:\n1) Chấm điểm 0-100.\n2) Feedback rất ngắn gọn, tối đa 2 câu.\n3) Trả về JSON đúng format: {"score": number, "feedback": string}.\n4) Tuyệt đối không thêm văn bản ngoài JSON.\n\nPrompt người dùng:\n${prompt}`;

    const result = await runGemini({
      apiKey,
      prompt: userPrompt,
      responseMimeType: "application/json",
      maxOutputTokens: 220,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          error: `Không gọi được Gemini 2.5 Flash. Chi tiết: ${result.error}`,
        },
        { status: 502 },
      );
    }

    const parsed = extractJsonObject(result.text);
    if (parsed) {
      return NextResponse.json({
        score: Math.max(0, Math.min(100, Number(parsed.score ?? 70))),
        feedback: normalizeFeedback(String(parsed.feedback ?? "")),
        model: result.model,
        apiVersion: result.apiVersion,
      });
    }

    return NextResponse.json({
      score: 70,
      feedback: normalizeFeedback(result.text),
      model: result.model,
      apiVersion: result.apiVersion,
    });
  } catch {
    return NextResponse.json({ error: "Không thể xử lý yêu cầu AI." }, { status: 500 });
  }
}
