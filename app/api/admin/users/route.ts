import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, readDB } from "@/app/lib/server-db";

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
