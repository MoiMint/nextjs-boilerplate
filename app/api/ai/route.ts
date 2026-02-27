import { NextRequest, NextResponse } from "next/server";

type GeminiGenerateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function normalizeModelName(name: string) {
  return name.startsWith("models/") ? name.replace("models/", "") : name;
}

const DISABLED_MODEL_HINTS = ["tts", "image", "embedding", "vision"];

function parseEnvModels() {
  return (process.env.GEMINI_MODELS ?? "gemini-2.5-flash,gemini-2.0-flash")
    .split(",")
    .map((m) => normalizeModelName(m.trim()))
    .filter(Boolean)
    .filter((m) => !DISABLED_MODEL_HINTS.some((hint) => m.toLowerCase().includes(hint)));
}

function composeKeyFromParts(prefix: string) {
  const p1 = process.env[`${prefix}_P1`]?.trim() ?? "";
  const p2 = process.env[`${prefix}_P2`]?.trim() ?? "";
  const p3 = process.env[`${prefix}_P3`]?.trim() ?? "";
  const joined = `${p1}${p2}${p3}`.trim();
  return joined.length >= 20 ? joined : "";
}

function parseApiKeys() {
  const splitPrimary = composeKeyFromParts("GEMINI_API_KEY");
  const splitBackup = composeKeyFromParts("GEMINI_API_KEY_BACKUP");
  const singlePrimary = process.env.GEMINI_API_KEY?.trim();
  const singleBackup = process.env.GEMINI_API_KEY_BACKUP?.trim();
  const list = (process.env.GEMINI_API_KEYS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const merged = [splitPrimary, singlePrimary, splitBackup, singleBackup, ...list].filter((item): item is string => !!item);
  return Array.from(new Set(merged));
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const retryAfterRaw = response.headers.get("retry-after");
  const retryAfterMs = retryAfterRaw && Number.isFinite(Number(retryAfterRaw))
    ? Math.max(0, Number(retryAfterRaw) * 1000)
    : undefined;

  return { ok: false as const, status: response.status, retryAfterMs };
}

async function runGemini(args: { prompt: string; responseMimeType?: string }) {
  const apiKeys = parseApiKeys();
  const modelCandidates = parseEnvModels();
  const apiVersions: Array<"v1beta" | "v1"> = ["v1beta", "v1"];
  const errors: string[] = [];

  for (const apiKey of apiKeys) {
    for (const model of modelCandidates) {
      for (const apiVersion of apiVersions) {
        const result = await callModel({
          apiKey,
          apiVersion,
          model,
          prompt: args.prompt,
          responseMimeType: args.responseMimeType,
        });

        if (result.ok) {
          return { ok: true as const, text: result.text, model, apiVersion };
        }

        errors.push(`${apiVersion}/${model} [${result.status}]`);

        if (result.status === 429) {
          await wait(result.retryAfterMs ?? 1200);
          continue;
        }

        if (result.status === 400 || result.status === 404) {
          break;
        }
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

    const keys = parseApiKeys();
    if (!keys.length) {
      return NextResponse.json(
        {
          error: "Chưa cấu hình GEMINI_API_KEY (hoặc dạng chia 3 phần) trên server.",
        },
        { status: 500 },
      );
    }

    if (mode === "generate") {
      const generatorPrompt = `Bạn là AI thực thi prompt cho nền tảng Blabla.\nContext: ${context ?? "General"}\nHãy thực thi prompt người dùng và trả về nội dung trả lời tốt nhất ở dạng text thuần.\n\nPrompt người dùng:\n${prompt}`;
      const result = await runGemini({ prompt: generatorPrompt });
      if (!result.ok) {
        return NextResponse.json(
          {
            error:
              "Không gọi được model Gemini khả dụng để tạo nội dung. Hãy kiểm tra key/model access của project. Chi tiết: " +
              result.error,
          },
          { status: 502 },
        );
      }

      return NextResponse.json({ output: result.text, model: result.model, apiVersion: result.apiVersion });
    }

    const userPrompt = `Bạn là AI Judge cho nền tảng Blabla.\nContext: ${context ?? "General"}\nNhiệm vụ:\n1) Chấm điểm 0-100.\n2) Feedback ngắn gọn 2-3 câu.\n3) Trả về JSON: {"score": number, "feedback": string}.\n\nPrompt người dùng:\n${prompt}`;

    const result = await runGemini({ prompt: userPrompt, responseMimeType: "application/json" });
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            "Không gọi được model Gemini khả dụng. Hãy kiểm tra key/model access của project. Chi tiết: " + result.error,
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
