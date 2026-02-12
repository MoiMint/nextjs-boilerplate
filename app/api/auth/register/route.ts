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

  const user = {
    id: newId("user"),
    name,
    email,
    password,
    role: role ?? "office",
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);

  const token = createSessionToken(user.id);
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
