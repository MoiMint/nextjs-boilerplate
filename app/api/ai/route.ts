import { NextRequest, NextResponse } from "next/server";

type GeminiGenerateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { code?: number; message?: string; status?: string };
};

function normalizeModelName(name: string) {
  return name.startsWith("models/") ? name.replace("models/", "") : name;
}

const DISABLED_MODEL_HINTS = ["tts", "image", "embedding", "vision"];

function parseEnvModels() {
  return (process.env.GEMINI_MODELS ?? "gemini-2.5-flash,gemini-2.0-flash,gemini-1.5-flash")
    .split(",")
    .map((m) => normalizeModelName(m.trim()))
    .filter(Boolean)
    .filter((m) => !DISABLED_MODEL_HINTS.some((hint) => m.toLowerCase().includes(hint)));
}

async function callModel(args: {
  apiKey: string;
  apiVersion: "v1beta" | "v1";
  model: string;
  prompt: string;
  responseMimeType?: string;
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/${args.apiVersion}/models/${args.model}:generateContent?key=${args.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: args.prompt }] }],
        generationConfig: args.responseMimeType ? { responseMimeType: args.responseMimeType } : undefined,
      }),
    },
  );

  if (response.ok) {
    const data = (await response.json()) as GeminiGenerateResponse;
    return { ok: true as const, text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "" };
  }

  const status = response.status;
  const errorText = await response.text();
  return { ok: false as const, status, errorText };
}

async function runGemini(args: { apiKey: string; prompt: string; responseMimeType?: string }) {
  const envModels = parseEnvModels();
  const modelCandidates = envModels.length ? envModels.slice(0, 4) : ["gemini-2.5-flash", "gemini-2.0-flash"];
  const apiVersions: Array<"v1beta" | "v1"> = ["v1beta", "v1"];
  const errors: string[] = [];

  for (const model of modelCandidates) {
    for (const apiVersion of apiVersions) {
      const result = await callModel({
        apiKey: args.apiKey,
        apiVersion,
        model,
        prompt: args.prompt,
        responseMimeType: args.responseMimeType,
      });

      if (result.ok) {
        return { ok: true as const, text: result.text, model, apiVersion };
      }

      errors.push(`${apiVersion}/${model} [${result.status}]`);

      if (result.status === 400 || result.status === 404) {
        break;
      }

      if (result.status === 429) {
        return {
          ok: false as const,
          error: `Gemini rate limit (429). Stop retry to avoid spam requests. Attempts: ${errors.join(", ")}`,
        };
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

    const primaryKey = process.env.GEMINI_API_KEY;
    const backupKey = process.env.GEMINI_API_KEY_BACKUP;
    const apiKeys = [primaryKey, backupKey].filter((item): item is string => !!item && item.trim().length > 0);
    if (!apiKeys.length) {
      return NextResponse.json(
        {
          error: "Chưa cấu hình GEMINI_API_KEY trên server. Hãy thêm key vào biến môi trường để dùng AI thật.",
        },
        { status: 500 },
      );
    }

    if (mode === "generate") {
      const generatorPrompt = `Bạn là AI thực thi prompt cho nền tảng Blabla.\nContext: ${context ?? "General"}\nHãy thực thi prompt người dùng và trả về nội dung trả lời tốt nhất ở dạng text thuần.\n\nPrompt người dùng:\n${prompt}`;
      let result: Awaited<ReturnType<typeof runGemini>> | null = null;
      for (const apiKey of apiKeys) {
        result = await runGemini({ apiKey, prompt: generatorPrompt });
        if (result.ok) break;
      }
      if (!result) result = { ok: false as const, error: "No API key configured" };
      if (!result.ok) {
        return NextResponse.json(
          {
            error:
              "Không gọi được model Gemini khả dụng để tạo nội dung. Hãy kiểm tra GEMINI_API_KEY/GEMINI_MODELS hoặc model access của project. Chi tiết: " +
              result.error,
          },
          { status: 502 },
        );
      }

      return NextResponse.json({ output: result.text, model: result.model, apiVersion: result.apiVersion });
    }

    const userPrompt = `Bạn là AI Judge cho nền tảng Blabla.\nContext: ${context ?? "General"}\nNhiệm vụ:\n1) Chấm điểm 0-100.\n2) Feedback ngắn gọn 2-3 câu.\n3) Trả về JSON: {"score": number, "feedback": string}.\n\nPrompt người dùng:\n${prompt}`;

    let result: Awaited<ReturnType<typeof runGemini>> | null = null;
    for (const apiKey of apiKeys) {
      result = await runGemini({ apiKey, prompt: userPrompt, responseMimeType: "application/json" });
      if (result.ok) break;
    }
    if (!result) result = { ok: false as const, error: "No API key configured" };
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            "Không gọi được model Gemini khả dụng. Hãy kiểm tra GEMINI_API_KEY/GEMINI_MODELS hoặc model access của project. Chi tiết: " +
            result.error,
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
