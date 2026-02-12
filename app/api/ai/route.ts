import { NextRequest, NextResponse } from "next/server";

type GeminiListModelsResponse = {
  models?: Array<{
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
};

function normalizeModelName(name: string) {
  return name.startsWith("models/") ? name.replace("models/", "") : name;
}

async function fetchAvailableModels(apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    { method: "GET" },
  );

  if (!response.ok) return [] as string[];

  const data = (await response.json()) as GeminiListModelsResponse;
  return (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => normalizeModelName(m.name ?? ""))
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, context } = (await request.json()) as { prompt?: string; context?: string };

    if (!prompt) {
      return NextResponse.json({ error: "Thiếu prompt." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Chưa cấu hình GEMINI_API_KEY trên server. Hãy thêm key vào biến môi trường để dùng AI thật.",
        },
        { status: 500 },
      );
    }

    const envModels = (process.env.GEMINI_MODELS ??
      "gemini-2.0-flash,gemini-1.5-flash-latest,gemini-1.5-flash")
      .split(",")
      .map((m) => normalizeModelName(m.trim()))
      .filter(Boolean);

    const availableModels = await fetchAvailableModels(apiKey);

    const modelCandidates = [
      ...envModels.filter((m) => availableModels.includes(m)),
      ...envModels.filter((m) => !availableModels.includes(m)),
      ...availableModels,
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    const userPrompt = `Bạn là AI Judge cho nền tảng Blabla.\nContext: ${context ?? "General"}\nNhiệm vụ:\n1) Chấm điểm 0-100.\n2) Feedback ngắn gọn 2-3 câu.\n3) Trả về JSON: {\"score\": number, \"feedback\": string}.\n\nPrompt người dùng:\n${prompt}`;

    const errors: string[] = [];
    const apiVersions = ["v1beta", "v1"];

    for (const model of modelCandidates) {
      for (const apiVersion of apiVersions) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userPrompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          errors.push(`${apiVersion}/${model}: ${errorText}`);
          continue;
        }

        const data = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

        try {
          const parsed = JSON.parse(rawText) as { score?: number; feedback?: string };
          return NextResponse.json({
            score: parsed.score ?? 70,
            feedback: parsed.feedback ?? "Không có feedback.",
            model,
            apiVersion,
          });
        } catch {
          return NextResponse.json({ score: 70, feedback: rawText, model, apiVersion });
        }
      }
    }

    return NextResponse.json(
      {
        error:
          "Không gọi được model Gemini khả dụng. Hãy kiểm tra GEMINI_API_KEY/GEMINI_MODELS hoặc model access của project. Chi tiết: " +
          errors.join(" | "),
      },
      { status: 502 },
    );
  } catch {
    return NextResponse.json({ error: "Không thể xử lý yêu cầu AI." }, { status: 500 });
  }
}
