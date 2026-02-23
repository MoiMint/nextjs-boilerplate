import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, newId, readDB, writeDB } from "@/app/lib/server-db";

export async function GET() {
  const db = await readDB();
  return NextResponse.json({ config: db.config });
}

export async function PATCH(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const me = await getUserFromToken(token);
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    promptLesson?: { title: string; topic: string; brief: string; sample: string };
    arenaWeekly?: { weekLabel: string; title: string; inputText: string; goldenResponse: string };
  };

  const db = await readDB();

  if (body.promptLesson) {
    db.config.promptMasterLessons.push({
      id: newId("pm"),
      title: body.promptLesson.title,
      topic: body.promptLesson.topic,
      brief: body.promptLesson.brief,
      sample: body.promptLesson.sample,
    });
  }

  if (body.arenaWeekly) {
    db.config.arenaWeekly = body.arenaWeekly;
  }

  await writeDB(db);
  return NextResponse.json({ ok: true, config: db.config });
}
