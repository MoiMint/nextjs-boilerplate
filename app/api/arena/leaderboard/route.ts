import { NextResponse } from "next/server";
import { readDB } from "@/app/lib/server-db";

export async function GET() {
  const db = await readDB();
  const top = [...db.arenaSubmissions]
    .sort((a, b) => {
      if (b.efficiency !== a.efficiency) return b.efficiency - a.efficiency;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return a.tokens - b.tokens;
    })
    .slice(0, 20);

  return NextResponse.json({ leaderboard: top, weekly: db.config.arenaWeekly });
}
