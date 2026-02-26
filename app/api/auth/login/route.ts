import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, isConsecutiveLogin, readDB, verifyPassword, writeDB } from "@/app/lib/server-db";

export async function POST(request: NextRequest) {
  const { email, password } = (await request.json()) as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: "Thiếu email hoặc mật khẩu." }, { status: 400 });
  }

  const db = await readDB();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  const isPasswordValid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !isPasswordValid) {
    return NextResponse.json({ error: "Thông tin đăng nhập không đúng." }, { status: 401 });
  }

  const now = new Date().toISOString();
  const loginCheck = isConsecutiveLogin(user.lastLoginDate, now);

  if (!loginCheck.sameDay) {
    user.totalLoginDays += 1;
    user.loginCount += 1;

    if (user.lastLoginDate === null) {
      user.loginStreak = 1;
    } else if (loginCheck.consecutive) {
      user.loginStreak += 1;
    } else {
      user.loginStreak = 1;
    }

    user.lastLoginDate = now;
  }

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
