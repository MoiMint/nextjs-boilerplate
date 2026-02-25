import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, newId, readDB, writeDB } from "@/app/lib/server-db";

export async function GET() {
  const db = await readDB();
  const posts = db.posts.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 80);
  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    content?: string;
    giftCoin?: { totalCoins?: number; maxReceivers?: number };
    claimGiftPostId?: string;
  };

  const db = await readDB();
  const dbUser = db.users.find((item) => item.id === user.id);
  if (!dbUser) return NextResponse.json({ error: "Không tìm thấy user." }, { status: 404 });

  if (body.claimGiftPostId) {
    const giftPost = db.posts.find((post) => post.id === body.claimGiftPostId && post.type === "coin-gift" && post.gift);
    if (!giftPost?.gift) return NextResponse.json({ error: "Không tìm thấy lì xì coin." }, { status: 404 });

    if (giftPost.gift.claimedUserIds.includes(dbUser.id)) {
      return NextResponse.json({ error: "Bạn đã nhận lì xì này rồi." }, { status: 400 });
    }

    if (giftPost.gift.claimedUserIds.length >= giftPost.gift.maxReceivers) {
      return NextResponse.json({ error: "Lì xì này đã hết lượt nhận." }, { status: 400 });
    }

    giftPost.gift.claimedUserIds.push(dbUser.id);
    dbUser.coins += giftPost.gift.perReceiver;
    db.posts.push({
      id: newId("post"),
      userId: dbUser.id,
      userName: "Hệ thống",
      content: `${dbUser.name} đã nhận ${giftPost.gift.perReceiver} coin từ lì xì của ${giftPost.gift.creatorUserName}.`,
      createdAt: new Date().toISOString(),
      type: "system",
    });

    await writeDB(db);
    return NextResponse.json({ ok: true, received: giftPost.gift.perReceiver, coins: dbUser.coins });
  }

  if (body.giftCoin) {
    const totalCoins = Math.floor(Number(body.giftCoin.totalCoins ?? 0));
    const maxReceivers = Math.floor(Number(body.giftCoin.maxReceivers ?? 0));
    if (totalCoins <= 0 || maxReceivers <= 0) {
      return NextResponse.json({ error: "Số coin và số người nhận phải lớn hơn 0." }, { status: 400 });
    }
    const perReceiver = Math.floor(totalCoins / maxReceivers);
    if (perReceiver <= 0) {
      return NextResponse.json({ error: "Tổng coin phải đủ để chia cho số người nhận (mỗi người ít nhất 1 coin)." }, { status: 400 });
    }
    const lockedTotal = perReceiver * maxReceivers;
    if (dbUser.coins < lockedTotal) {
      return NextResponse.json({ error: "Bạn không đủ coin để gửi lì xì." }, { status: 400 });
    }

    dbUser.coins -= lockedTotal;
    db.posts.push({
      id: newId("post"),
      userId: dbUser.id,
      userName: dbUser.name,
      content: `🎁 Gửi lì xì ${lockedTotal} coin cho ${maxReceivers} người (mỗi người ${perReceiver} coin).`,
      createdAt: new Date().toISOString(),
      type: "coin-gift",
      gift: {
        totalCoins: lockedTotal,
        maxReceivers,
        perReceiver,
        claimedUserIds: [],
        creatorUserName: dbUser.name,
      },
    });
    await writeDB(db);
    return NextResponse.json({ ok: true, coins: dbUser.coins });
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Nội dung trống." }, { status: 400 });
  }

  db.posts.push({
    id: newId("post"),
    userId: dbUser.id,
    userName: dbUser.name,
    content: body.content.trim(),
    createdAt: new Date().toISOString(),
    type: "message",
  });
  await writeDB(db);

  return NextResponse.json({ ok: true });
}
