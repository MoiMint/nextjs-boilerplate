import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, readDB, writeDB } from "@/app/lib/server-db";
import { findActiveGoal, upsertWeeklyGoalForAllUsers, upsertWeeklyGoalForUser } from "@/app/lib/weekly-goals";

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await readDB();
  const goal = findActiveGoal(db, user.id) ?? null;
  return NextResponse.json({ goal, canManageGlobal: !!user.isAdmin });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    deadline?: string;
    targetMaster?: number;
    targetArena?: number;
    targetAuditor?: number;
    rewardCoins?: number;
    scope?: "self" | "global";
  };

  if (
    !body.deadline
    || typeof body.targetMaster !== "number"
    || typeof body.targetArena !== "number"
    || typeof body.targetAuditor !== "number"
  ) {
    return NextResponse.json({ error: "Thiếu dữ liệu mục tiêu tuần." }, { status: 400 });
  }

  const db = await readDB();
  try {
    const input = {
      deadline: body.deadline,
      targetMaster: body.targetMaster,
      targetArena: body.targetArena,
      targetAuditor: body.targetAuditor,
      rewardCoins: body.rewardCoins,
    };

    if (body.scope === "global") {
      if (!user.isAdmin) {
        return NextResponse.json({ error: "Chỉ admin mới được cập nhật mục tiêu global." }, { status: 403 });
      }
      const { goalMap, rewardedTotal } = upsertWeeklyGoalForAllUsers(db, input);
      await writeDB(db);
      return NextResponse.json({ goal: goalMap[user.id] ?? null, rewardedTotal, scope: "global" });
    }

    const { goal, rewarded } = upsertWeeklyGoalForUser(db, user.id, input);
    await writeDB(db);
    return NextResponse.json({ goal, rewarded, scope: "self" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể cập nhật mục tiêu tuần." },
      { status: 400 },
    );
  }
}
