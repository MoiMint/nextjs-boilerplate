import { NextRequest, NextResponse } from "next/server";

type GeminiGenerateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

const GEMINI_MODEL = "gemini-2.5-flash";

type CallModelResult = {
  ok: true;
  text: string;
} | {
  ok: false;
  status: number;
  errorText: string;
};

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
          temperature: 0.4,
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

    errors.push(`${apiVersion}/${GEMINI_MODEL} [${result.status}]`);

    if (result.status === 429) {
      return {
        ok: false as const,
        error: `Gemini rate limit (429). Attempts: ${errors.join(", ")}`,
      };
    }

    if (result.status === 400 || result.status === 404) {
      break;
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
      const generatorPrompt = `Bạn là AI thực thi prompt cho nền tảng Blabla.\nContext: ${context ?? "General"}\nYêu cầu bắt buộc:\n- Trả lời ngắn gọn, tối đa 5 câu hoặc 120 từ.\n- Chỉ đưa nội dung cốt lõi, không lan man.\n- Không mở đầu dài dòng.\n\nPrompt người dùng:\n${prompt}`;
      const result = await runGemini({ apiKey, prompt: generatorPrompt, maxOutputTokens: 220 });
      if (!result.ok) {
        return NextResponse.json(
          {
            error: `Không gọi được Gemini 2.5 Flash để tạo nội dung. Chi tiết: ${result.error}`,
          },
          { status: 502 },
        );
      }

      return NextResponse.json({ output: result.text, model: result.model, apiVersion: result.apiVersion });
    }

    const userPrompt = `Bạn là AI Judge cho nền tảng Blabla.\nContext: ${context ?? "General"}\nNhiệm vụ:\n1) Chấm điểm 0-100.\n2) Feedback rất ngắn gọn, tối đa 2 câu.\n3) Trả về JSON đúng format: {"score": number, "feedback": string}.\n\nPrompt người dùng:\n${prompt}`;

    const result = await runGemini({
      apiKey,
      prompt: userPrompt,
      responseMimeType: "application/json",
      maxOutputTokens: 160,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          error: `Không gọi được Gemini 2.5 Flash. Chi tiết: ${result.error}`,
        },
        { status: 502 },
      );
    }

    try {
      const parsed = JSON.parse(result.text) as { score?: number; feedback?: string };
      return NextResponse.json({
        score: parsed.score ?? 70,
        feedback: parsed.feedback ?? "Không có feedback.",
        model: result.model,
        apiVersion: result.apiVersion,
      });
    } catch {
      return NextResponse.json({ score: 70, feedback: result.text, model: result.model, apiVersion: result.apiVersion });
    }
  } catch {
    return NextResponse.json({ error: "Không thể xử lý yêu cầu AI." }, { status: 500 });
  }
}
