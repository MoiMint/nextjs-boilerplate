import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, newId, readDB, writeDB } from "@/app/lib/server-db";

function tokenCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, output } = (await request.json()) as { prompt?: string; output?: string };
  if (!prompt || !output) return NextResponse.json({ error: "Thiếu dữ liệu nộp bài." }, { status: 400 });

  const db = await readDB();
  const arenaTitle = `Arena tuần: ${db.config.arenaWeekly.weekLabel}`;
  const alreadySubmitted = db.histories.some(
    (item) => item.userId === user.id && item.type === "arena" && item.title === arenaTitle,
  );
  if (alreadySubmitted) {
    return NextResponse.json(
      { error: "Bạn đã nộp bài cho đề Arena tuần này. Mỗi người chỉ được nộp 1 lần." },
      { status: 409 },
    );
  }

  const golden = db.config.arenaWeekly.goldenResponse.toLowerCase();
  const out = output.toLowerCase();

  const overlap = golden.split(/[\[\]",\s]+/).filter(Boolean).filter((tokenWord) => out.includes(tokenWord)).length;
  const total = Math.max(1, golden.split(/[\[\]",\s]+/).filter(Boolean).length);
  const accuracy = Math.min(100, Math.round((overlap / total) * 100));
  const tokens = tokenCount(prompt);
  const efficiency = Math.max(0, Math.round(accuracy - tokens * 0.8));

  db.arenaSubmissions.push({
    id: newId("arena"),
    userId: user.id,
    userName: user.name,
    accuracy,
    tokens,
    efficiency,
    prompt,
    createdAt: new Date().toISOString(),
  });

  db.histories.push({
    id: newId("his"),
    userId: user.id,
    type: "arena",
    title: arenaTitle,
    score: efficiency,
    feedback: `Accuracy ${accuracy}%, Tokens ${tokens}, Efficiency ${efficiency}.`,
    createdAt: new Date().toISOString(),
  });

  await writeDB(db);
  return NextResponse.json({ accuracy, tokens, efficiency });
}
