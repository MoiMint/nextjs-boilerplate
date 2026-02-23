import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/app/lib/server-db";

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      loginCount: user.loginCount,
      totalLoginDays: user.totalLoginDays,
      loginStreak: user.loginStreak,
      lastLoginDate: user.lastLoginDate,
    },
  });
}
