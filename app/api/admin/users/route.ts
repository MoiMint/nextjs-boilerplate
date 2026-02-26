import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, readDB, writeDB } from "@/app/lib/server-db";

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const me = await getUserFromToken(token);
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await readDB();
  const users = db.users.map((user) => {
    const historyCount = db.histories.filter((h) => h.userId === user.id).length;
    const postCount = db.posts.filter((p) => p.userId === user.id).length;
    const lastSessionAt = db.sessions
      .filter((s) => s.userId === user.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]?.createdAt;

    return {
      ...user,
      stats: {
        historyCount,
        postCount,
        lastSessionAt: lastSessionAt ?? null,
      },
    };
  });

  return NextResponse.json({ users });
}

export async function DELETE(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const me = await getUserFromToken(token);
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { userId?: string };
  if (!body.userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });
  if (body.userId === me.id) return NextResponse.json({ error: "Bạn không thể tự xóa chính mình." }, { status: 400 });

  const db = await readDB();
  const target = db.users.find((user) => user.id === body.userId);
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  db.users = db.users.filter((user) => user.id !== body.userId);
  db.sessions = db.sessions.filter((session) => session.userId !== body.userId);
  db.histories = db.histories.filter((item) => item.userId !== body.userId);
  db.posts = db.posts.filter((item) => item.userId !== body.userId);
  db.feedbacks = db.feedbacks.filter((item) => item.userId !== body.userId);
  db.arenaSubmissions = db.arenaSubmissions.filter((item) => item.userId !== body.userId);

  await writeDB(db);
  return NextResponse.json({ ok: true });
}
