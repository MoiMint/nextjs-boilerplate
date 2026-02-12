import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, readDB } from "@/app/lib/server-db";

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const me = await getUserFromToken(token);
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await readDB();
  return NextResponse.json({ users: db.users });
}
