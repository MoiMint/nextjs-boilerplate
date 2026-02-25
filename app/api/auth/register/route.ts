import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, newId, readDB, writeDB } from "@/app/lib/server-db";

export async function POST(request: NextRequest) {
  const { name, email, password, role } = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Thiếu thông tin đăng ký." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Mật khẩu tối thiểu 6 ký tự." }, { status: 400 });
  }

  const db = await readDB();
  const existed = db.users.some((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existed) {
    return NextResponse.json({ error: "Email đã tồn tại." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const user = {
    id: newId("user"),
    name,
    email,
    password,
    role: role ?? "office",
    isAdmin: false,
    createdAt: now,
    loginCount: 1,
    totalLoginDays: 1,
    loginStreak: 1,
    lastLoginDate: now,
    coins: 120,
    unlockedLessonIds: [],
    ownedItemIds: [],
    farmPlot: {
      seedType: null,
      plantedAt: null,
      wateredAt: null,
      readyAt: null,
      lastHarvestAt: null,
    },
  };
  db.users.push(user);

  const token = createSessionToken(user.id);
  db.sessions.push({ token, userId: user.id, createdAt: now });
  await writeDB(db);

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      loginCount: user.loginCount,
      totalLoginDays: user.totalLoginDays,
      loginStreak: user.loginStreak,
      lastLoginDate: user.lastLoginDate,
    },
  });
}
