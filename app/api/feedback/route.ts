import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, newId, readDB, writeDB } from "@/app/lib/server-db";

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const me = await getUserFromToken(token);
  if (!me || !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await readDB();
  const feedbacks = [...db.feedbacks].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json({ feedbacks });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const me = await getUserFromToken(token);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { message?: string };
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Feedback message is required." }, { status: 400 });
  }

  const db = await readDB();
  db.feedbacks.unshift({
    id: newId("feedback"),
    userId: me.id,
    userName: me.name,
    message: message.slice(0, 1200),
    createdAt: new Date().toISOString(),
  });
  await writeDB(db);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const me = await getUserFromToken(token);
  if (!me || !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { feedbackId?: string };
  if (!body.feedbackId) {
    return NextResponse.json({ error: "feedbackId is required." }, { status: 400 });
  }

  const db = await readDB();
  db.feedbacks = db.feedbacks.filter((item) => item.id !== body.feedbackId);
  await writeDB(db);

  return NextResponse.json({ ok: true });
}
