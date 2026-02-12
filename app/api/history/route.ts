import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, newId, readDB, writeDB } from "@/app/lib/server-db";

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await readDB();
  const histories = db.histories
    .filter((h) => h.userId === user.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json({ histories });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    type?: "master" | "arena" | "auditor";
    title?: string;
    score?: number;
    feedback?: string;
  };

  if (!body.type || !body.title || typeof body.score !== "number") {
    return NextResponse.json({ error: "Dữ liệu lịch sử không hợp lệ." }, { status: 400 });
  }

  const db = await readDB();
  db.histories.push({
    id: newId("his"),
    userId: user.id,
    type: body.type,
    title: body.title,
    score: body.score,
    feedback: body.feedback ?? "",
    createdAt: new Date().toISOString(),
  });
  await writeDB(db);

  return NextResponse.json({ ok: true });
}
