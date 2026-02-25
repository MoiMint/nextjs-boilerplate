import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, readDB, writeDB } from "@/app/lib/server-db";

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const me = await getUserFromToken(token);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    action?: "buy_lesson" | "buy_item" | "plant_seed" | "water_plot" | "harvest_plot";
    lessonId?: string;
    itemId?: string;
  };

  const db = await readDB();
  const user = db.users.find((u) => u.id === me.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (body.action === "buy_lesson") {
    const lesson = db.config.promptMasterLessons.find((l) => l.id === body.lessonId);
    if (!lesson) return NextResponse.json({ error: "Không tìm thấy khóa học." }, { status: 404 });
    const price = Math.max(0, Number(lesson.price ?? 0));
    if (price <= 0) {
      if (!user.unlockedLessonIds.includes(lesson.id)) user.unlockedLessonIds.push(lesson.id);
      await writeDB(db);
      return NextResponse.json({ ok: true, coins: user.coins, unlockedLessonIds: user.unlockedLessonIds });
    }
    if (user.unlockedLessonIds.includes(lesson.id)) {
      return NextResponse.json({ ok: true, coins: user.coins, unlockedLessonIds: user.unlockedLessonIds });
    }
    if (user.coins < price) return NextResponse.json({ error: "Không đủ Endless Coin." }, { status: 400 });
    user.coins -= price;
    user.unlockedLessonIds.push(lesson.id);
    await writeDB(db);
    return NextResponse.json({ ok: true, coins: user.coins, unlockedLessonIds: user.unlockedLessonIds });
  }

  if (body.action === "buy_item") {
    const item = db.config.shopItems.find((i) => i.id === body.itemId);
    if (!item) return NextResponse.json({ error: "Không tìm thấy vật phẩm." }, { status: 404 });
    if (user.coins < item.price) return NextResponse.json({ error: "Không đủ Endless Coin." }, { status: 400 });
    user.coins -= item.price;
    user.ownedItemIds.push(item.id);
    await writeDB(db);
    return NextResponse.json({ ok: true, coins: user.coins, ownedItemIds: user.ownedItemIds });
  }

  if (body.action === "plant_seed") {
    if (user.farmPlot.seedType) return NextResponse.json({ error: "Mảnh đất đang có cây." }, { status: 400 });
    const seedItem = db.config.shopItems.find((i) => i.id === "item-seed-basic");
    const seedPrice = seedItem?.price ?? 80;
    if (user.coins < seedPrice) return NextResponse.json({ error: "Không đủ coin mua hạt giống." }, { status: 400 });

    const now = Date.now();
    user.coins -= seedPrice;
    user.farmPlot = {
      seedType: "basic",
      plantedAt: new Date(now).toISOString(),
      wateredAt: null,
      readyAt: new Date(now + 60 * 1000).toISOString(),
      lastHarvestAt: user.farmPlot.lastHarvestAt,
    };
    await writeDB(db);
    return NextResponse.json({ ok: true, coins: user.coins, farmPlot: user.farmPlot });
  }

  if (body.action === "water_plot") {
    if (!user.farmPlot.seedType || !user.farmPlot.readyAt) {
      return NextResponse.json({ error: "Chưa có cây để tưới." }, { status: 400 });
    }
    const now = Date.now();
    const readyAt = new Date(user.farmPlot.readyAt).getTime();
    const reduced = Math.max(now + 10 * 1000, readyAt - 15 * 1000);
    user.farmPlot.wateredAt = new Date(now).toISOString();
    user.farmPlot.readyAt = new Date(reduced).toISOString();
    await writeDB(db);
    return NextResponse.json({ ok: true, farmPlot: user.farmPlot });
  }

  if (body.action === "harvest_plot") {
    if (!user.farmPlot.seedType || !user.farmPlot.readyAt) {
      return NextResponse.json({ error: "Không có gì để thu hoạch." }, { status: 400 });
    }
    if (Date.now() < new Date(user.farmPlot.readyAt).getTime()) {
      return NextResponse.json({ error: "Cây chưa trưởng thành." }, { status: 400 });
    }

    const coinReward = 120;
    user.coins += coinReward;
    if (Math.random() > 0.5) {
      user.ownedItemIds.push("item-water-can");
    }

    user.farmPlot = {
      seedType: null,
      plantedAt: null,
      wateredAt: null,
      readyAt: null,
      lastHarvestAt: new Date().toISOString(),
    };
    await writeDB(db);
    return NextResponse.json({ ok: true, coins: user.coins, farmPlot: user.farmPlot, coinReward });
  }

  return NextResponse.json({ error: "Action không hợp lệ." }, { status: 400 });
}
