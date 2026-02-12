import { NextRequest, NextResponse } from "next/server";
import { newId, readDB, writeDB } from "@/app/lib/server-db";

export async function POST(request: NextRequest) {
  const { email, password } = (await request.json()) as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: "Thiếu email hoặc mật khẩu." }, { status: 400 });
  }

  const db = await readDB();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Thông tin đăng nhập không đúng." }, { status: 401 });
  }

  const token = newId("sess");
  db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  await writeDB(db);

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
    },
  });
}
