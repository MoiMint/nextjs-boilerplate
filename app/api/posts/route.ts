import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, newId, readDB, writeDB } from "@/app/lib/server-db";

export async function GET() {
  const db = await readDB();
  const posts = db.posts.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 50);
  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = (await request.json()) as { content?: string };
  if (!content?.trim()) {
    return NextResponse.json({ error: "Nội dung trống." }, { status: 400 });
  }

  const db = await readDB();
  db.posts.push({
    id: newId("post"),
    userId: user.id,
    userName: user.name,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  });
  await writeDB(db);

  return NextResponse.json({ ok: true });
}
