import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, newId, readDB, writeDB } from "@/app/lib/server-db";

const MESSAGE_COOLDOWN_MS = 1000;
const BLOCKED_TERMS = [
  "dm me",
  "sex",
  "porn",
  "xxx",
  "nude",
  "onlyfans",
  "escort",
  "hooker",
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "kill yourself",
  "suicide",
  "terrorist",
  "bomb",
  "drug dealer",
  "cocaine",
  "meth",
  "casino",
  "gambling",
  "betting",
  "scam",
  "phishing",
  "hack account",
  "steal password",
  "credit card",
  "http://",
  "https://",
  "www.",
  "lừa đảo",
  "cờ bạc",
  "đánh bạc",
  "cá độ",
  "ma túy",
  "thuốc lắc",
  "mại dâm",
  "khiêu dâm",
  "ảnh nóng",
  "sex chat",
  "giết",
  "tự tử",
  "khủng bố",
  "bom",
  "hack tài khoản",
  "đánh cắp mật khẩu",
  "thẻ tín dụng",
  "nạp card",
  "link rút gọn",
  "telegram @",
  "zalo @",
  "ib mình",
  "inbox mình",
];

function moderateCommunityMessage(raw: string) {
  const text = raw.trim();
  if (!text) return "Nội dung trống.";
  if (text.length > 500) return "Tin nhắn quá dài (tối đa 500 ký tự).";
  const lowered = text.toLowerCase();
  if (BLOCKED_TERMS.some((term) => lowered.includes(term))) {
    return "Tin nhắn chứa nội dung bị chặn bởi bộ lọc cộng đồng.";
  }
  return null;
}

function checkMessageRateLimit(userId: string, dbPosts: Array<{ userId: string; createdAt: string; type?: string }>) {
  const latest = dbPosts
    .filter((post) => post.userId === userId && (post.type === "message" || post.type === "coin-gift"))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  if (!latest) return null;
  const elapsed = Date.now() - new Date(latest.createdAt).getTime();
  if (elapsed >= MESSAGE_COOLDOWN_MS) return null;
  return Math.ceil((MESSAGE_COOLDOWN_MS - elapsed) / 1000);
}


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
    const waitSec = checkMessageRateLimit(dbUser.id, db.posts);
    if (waitSec) {
      return NextResponse.json({ error: `Bạn đang gửi quá nhanh. Vui lòng chờ ${waitSec}s.` }, { status: 429 });
    }
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

  const contentText = body.content?.trim() ?? "";
  const moderationError = moderateCommunityMessage(contentText);
  if (moderationError) {
    return NextResponse.json({ error: moderationError }, { status: 400 });
  }

  const waitSec = checkMessageRateLimit(dbUser.id, db.posts);
  if (waitSec) {
    return NextResponse.json({ error: `Bạn đang gửi quá nhanh. Vui lòng chờ ${waitSec}s.` }, { status: 429 });
  }

  db.posts.push({
    id: newId("post"),
    userId: dbUser.id,
    userName: dbUser.name,
    content: contentText,
    createdAt: new Date().toISOString(),
    type: "message",
  });
  await writeDB(db);

  return NextResponse.json({ ok: true });
}
