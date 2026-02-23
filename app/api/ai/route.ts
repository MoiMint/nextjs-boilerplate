import { NextRequest, NextResponse } from "next/server";

type GeminiListModelsResponse = {
  models?: Array<{
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
};

type GeminiGenerateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function normalizeModelName(name: string) {
  return name.startsWith("models/") ? name.replace("models/", "") : name;
}

async function fetchAvailableModels(apiKey: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
    method: "GET",
  });

  if (!response.ok) return [] as string[];

  const data = (await response.json()) as GeminiListModelsResponse;
  return (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => normalizeModelName(m.name ?? ""))
    .filter(Boolean);
}

async function runGemini(args: { apiKey: string; prompt: string; responseMimeType?: string }) {
  const envModels = (process.env.GEMINI_MODELS ?? "gemini-2.0-flash,gemini-1.5-flash-latest,gemini-1.5-flash")
    .split(",")
    .map((m) => normalizeModelName(m.trim()))
    .filter(Boolean);

  const availableModels = await fetchAvailableModels(args.apiKey);

  const modelCandidates = [
    ...envModels.filter((m) => availableModels.includes(m)),
    ...envModels.filter((m) => !availableModels.includes(m)),
    ...availableModels,
  ].filter((m, i, arr) => arr.indexOf(m) === i);

  const errors: string[] = [];
  const apiVersions = ["v1beta", "v1"];

  for (const model of modelCandidates) {
    for (const apiVersion of apiVersions) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${args.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: args.prompt }] }],
            generationConfig: args.responseMimeType ? { responseMimeType: args.responseMimeType } : undefined,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        errors.push(`${apiVersion}/${model}: ${errorText}`);
        continue;
      }

      const data = (await response.json()) as GeminiGenerateResponse;
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return { ok: true as const, text: rawText, model, apiVersion };
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
        {
          error: "Chưa cấu hình GEMINI_API_KEY trên server. Hãy thêm key vào biến môi trường để dùng AI thật.",
        },
        { status: 500 },
      );
    }

    if (mode === "generate") {
      const generatorPrompt = `Bạn là AI thực thi prompt cho nền tảng Blabla.\nContext: ${context ?? "General"}\nHãy thực thi prompt người dùng và trả về nội dung trả lời tốt nhất ở dạng text thuần.\n\nPrompt người dùng:\n${prompt}`;
      const result = await runGemini({ apiKey, prompt: generatorPrompt });
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

    const result = await runGemini({ apiKey, prompt: userPrompt, responseMimeType: "application/json" });
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
