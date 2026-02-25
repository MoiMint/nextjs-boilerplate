import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, newId, readDB, writeDB } from "@/app/lib/server-db";

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const me = await getUserFromToken(token);
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password } = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Thiếu thông tin admin." }, { status: 400 });
  }

  const db = await readDB();
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: "Email đã tồn tại." }, { status: 409 });
  }

  db.users.push({
    id: newId("user"),
    name,
    email,
    password,
    role: "admin",
    isAdmin: true,
    createdAt: new Date().toISOString(),
    loginCount: 0,
    totalLoginDays: 0,
    loginStreak: 0,
    lastLoginDate: null,
    coins: 500,
    unlockedLessonIds: [],
    ownedItemIds: [],
    farmPlot: {
      seedType: null,
      plantedAt: null,
      wateredAt: null,
      readyAt: null,
      lastHarvestAt: null,
    },
  });
  await writeDB(db);
  return NextResponse.json({ ok: true });
}
