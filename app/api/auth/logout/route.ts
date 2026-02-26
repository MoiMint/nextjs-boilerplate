import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/app/lib/server-db";

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-session-token");

  if (!token) {
    return NextResponse.json({ error: "Thiếu session token." }, { status: 400 });
  }

  const db = await readDB();
  const session = db.sessions.find((item) => item.token === token);

  if (session && !session.revokedAt) {
    session.revokedAt = new Date().toISOString();
    await writeDB(db);
  }

  return NextResponse.json({ ok: true });
}
