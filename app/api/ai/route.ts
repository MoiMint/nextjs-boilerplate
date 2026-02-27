import { NextRequest, NextResponse } from "next/server";

type GeminiGenerateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { code?: number; message?: string; status?: string };
};

function normalizeModelName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/^models\//, "")
    .replace(/\s+/g, "-");
}

const DISABLED_MODEL_HINTS = ["tts", "image", "embedding", "vision"];

// Keep defaults focused on models that are commonly available for low-cost / free-tier usage.
const FREE_TIER_MODEL_FALLBACKS = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

const HARDCODED_BACKUP_KEYS = [
  "AIzaSyDAwaiBIJ5QxUU8SMS7F5ASJ-IIbUdsxkw",
  "AIzaSyCWYGgYS27yfPr7WgGzTebkwt3xTzOFPxM",
];

function resolveModelAliases(input: string) {
  const normalized = normalizeModelName(input);

  const aliasMap: Record<string, string[]> = {
    "gemini-2.0-flash": ["gemini-2.0-flash"],
    "gemini-2.0-flash-lite": ["gemini-2.0-flash-lite", "gemini-2.0-flash"],
    "gemini-1.5-flash": ["gemini-1.5-flash"],
    "gemini-2.5-flash": ["gemini-2.0-flash", "gemini-1.5-flash"],
    "gemini-2.5-flash-lite": ["gemini-2.0-flash-lite", "gemini-2.0-flash"],
    "gemini-2.5-flash-tts": [],
    "gemini-3-flash": ["gemini-2.0-flash", "gemini-1.5-flash"],
  };

  return aliasMap[normalized] ?? [normalized];
}

function isRunnableTextModel(model: string) {
  return !DISABLED_MODEL_HINTS.some((hint) => model.includes(hint));
}

function parseEnvModels() {
  const raw = (process.env.GEMINI_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const expanded = raw.flatMap((model) => resolveModelAliases(model));

  const combined = [...expanded, ...FREE_TIER_MODEL_FALLBACKS]
    .map((model) => normalizeModelName(model))
    .filter(Boolean)
    .filter(isRunnableTextModel);

  return combined.filter((model, index) => combined.indexOf(model) === index);
}

function compactErrorText(raw: string) {
  const text = raw.replace(/\s+/g, " ").trim();
  return text.length <= 180 ? text : `${text.slice(0, 180)}...`;
}

function isQuotaExceededError(raw: string) {
  const normalized = raw.toLowerCase();
  return normalized.includes("quota") || normalized.includes("billing") || normalized.includes("exceeded your current quota");
}

function maskKey(key: string) {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function getApiKeyCandidates() {
  const envPrimary = (process.env.GEMINI_API_KEY ?? "").trim();
  const envBackups = (process.env.GEMINI_API_KEY_BACKUPS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  // Prioritize user-provided backup keys first as requested, then env keys.
  const merged = [...HARDCODED_BACKUP_KEYS, envPrimary, ...envBackups]
    .map((item) => item.trim())
    .filter(Boolean);

  return merged.filter((item, index) => merged.indexOf(item) === index);
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
        generationConfig: {
          ...(args.responseMimeType ? { responseMimeType: args.responseMimeType } : {}),
          maxOutputTokens: 512,
          temperature: 0.5,
        },
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

async function runGemini(args: { apiKeys: string[]; prompt: string; responseMimeType?: string }) {
  const envModels = parseEnvModels();
  const modelCandidates = envModels.length ? envModels.slice(0, 4) : FREE_TIER_MODEL_FALLBACKS;
  const apiVersions: Array<"v1beta" | "v1"> = ["v1beta", "v1"];
  const errors: string[] = [];

  for (const apiKey of args.apiKeys) {
    let quotaExceededOnThisKey = false;

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
          return { ok: true as const, text: result.text, model, apiVersion, keyUsed: maskKey(apiKey) };
        }

        errors.push(`${maskKey(apiKey)} ${apiVersion}/${model} [${result.status}] ${compactErrorText(result.errorText)}`);

        if (result.status === 429 && isQuotaExceededError(result.errorText)) {
          quotaExceededOnThisKey = true;
          break;
        }
      }

      if (quotaExceededOnThisKey) break;
    }
  }

  return { ok: false as const, error: errors.join(" | ") };
}

function parseJudgeResult(text: string) {
  const trimmed = text.trim();

  const direct = (() => {
    try {
      return JSON.parse(trimmed) as { score?: number; feedback?: string };
    } catch {
      return null;
    }
  })();
  if (direct) return direct;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  if (!fenced) return null;

  try {
    return JSON.parse(fenced) as { score?: number; feedback?: string };
  } catch {
    return null;
  }
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

    const apiKeys = getApiKeyCandidates();
    if (!apiKeys.length) {
      return NextResponse.json(
        {
          error: "Chưa cấu hình GEMINI_API_KEY (hoặc backup keys).",
        },
        { status: 500 },
      );
    }

    if (mode === "generate") {
      const generatorPrompt = `Bạn là AI thực thi prompt cho nền tảng Blabla.\nContext: ${context ?? "General"}\nHãy thực thi prompt người dùng và trả về nội dung trả lời tốt nhất ở dạng text thuần.\n\nPrompt người dùng:\n${prompt}`;
      const result = await runGemini({ apiKeys, prompt: generatorPrompt });
      if (!result.ok) {
        return NextResponse.json(
          {
            error:
              "Không gọi được model Gemini free-tier khả dụng để tạo nội dung. Hãy kiểm tra GEMINI_API_KEY/GEMINI_MODELS/quota. Chi tiết: " +
              result.error,
          },
          { status: 502 },
        );
      }

      return NextResponse.json({ output: result.text, model: result.model, apiVersion: result.apiVersion, keyUsed: result.keyUsed });
    }

    const userPrompt = `Bạn là AI Judge cho nền tảng Blabla.\nContext: ${context ?? "General"}\nNhiệm vụ:\n1) Chấm điểm 0-100.\n2) Feedback ngắn gọn 2-3 câu.\n3) Trả về JSON: {"score": number, "feedback": string}.\n\nPrompt người dùng:\n${prompt}`;

    const result = await runGemini({ apiKeys, prompt: userPrompt, responseMimeType: "application/json" });
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            "Không gọi được model Gemini free-tier khả dụng. Hãy kiểm tra GEMINI_API_KEY/GEMINI_MODELS/quota. Chi tiết: " +
            result.error,
        },
        { status: 502 },
      );
    }

    const parsed = parseJudgeResult(result.text);
    if (!parsed) {
      return NextResponse.json({ score: 70, feedback: result.text, model: result.model, apiVersion: result.apiVersion, keyUsed: result.keyUsed });
    }

    return NextResponse.json({
      score: parsed.score ?? 70,
      feedback: parsed.feedback ?? "Không có feedback.",
      model: result.model,
      apiVersion: result.apiVersion,
      keyUsed: result.keyUsed,
    });
  } catch {
    return NextResponse.json({ error: "Không thể xử lý yêu cầu AI." }, { status: 500 });
  }
}
