import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, newId, readDB, writeDB } from "@/app/lib/server-db";

const MESSAGE_COOLDOWN_MS = 1000;
const DEFAULT_PAGE_LIMIT = 30;
const MAX_PAGE_LIMIT = 80;
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

function getPaginationParams(request: NextRequest) {
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? DEFAULT_PAGE_LIMIT);
  const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Math.floor(limitRaw)));
  const before = request.nextUrl.searchParams.get("before");
  const after = request.nextUrl.searchParams.get("after");
  return { limit, before, after };
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const viewer = await getUserFromToken(token);
  const includeReports = request.nextUrl.searchParams.get("reports") === "true";

  const db = await readDB();
  const { limit, before, after } = getPaginationParams(request);

  const visiblePosts = db.posts
    .filter((post) => viewer?.isAdmin || post.status === "active")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const filteredPosts = visiblePosts.filter((post) => {
    if (before && !(post.createdAt < before)) return false;
    if (after && !(post.createdAt > after)) return false;
    return true;
  });

  const pagedPosts = filteredPosts.slice(0, limit);
  const posts = pagedPosts.map((post) => {
    const owner = db.users.find((user) => user.id === post.userId);
    return {
      ...post,
      userRole: owner?.role ?? (post.type === "system" ? "system" : "member"),
      activeNameStyle: owner?.activeNameStyle ?? null,
    };
  });

  const nextCursor = pagedPosts.length === limit ? pagedPosts[pagedPosts.length - 1]?.createdAt ?? null : null;
  const prevCursor = pagedPosts.length ? pagedPosts[0]?.createdAt ?? null : null;

  if (!includeReports) {
    return NextResponse.json({ posts, pageInfo: { nextCursor, prevCursor, limit } });
  }

  if (!viewer?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const reports = (db.postReports ?? [])
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json({ posts, reports, pageInfo: { nextCursor, prevCursor, limit } });
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

  if (dbUser.bannedUntil && new Date(dbUser.bannedUntil).getTime() > Date.now()) {
    return NextResponse.json({ error: `Bạn đang bị cấm đến ${new Date(dbUser.bannedUntil).toLocaleString("vi-VN")}.` }, { status: 403 });
  }
  if (dbUser.mutedUntil && new Date(dbUser.mutedUntil).getTime() > Date.now()) {
    return NextResponse.json({ error: `Bạn đang bị tắt chat đến ${new Date(dbUser.mutedUntil).toLocaleString("vi-VN")}.` }, { status: 403 });
  }

  if (body.claimGiftPostId) {
    const giftPost = db.posts.find(
      (post) => post.id === body.claimGiftPostId && post.type === "coin-gift" && post.gift && post.status === "active",
    );
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
      status: "active",
      moderation: {
        reportedCount: 0,
        lastReportedAt: null,
        hiddenAt: null,
        hiddenByUserId: null,
        deletedAt: null,
        deletedByUserId: null,
      },
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
      return NextResponse.json(
        { error: "Tổng coin phải đủ để chia cho số người nhận (mỗi người ít nhất 1 coin)." },
        { status: 400 },
      );
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
      status: "active",
      moderation: {
        reportedCount: 0,
        lastReportedAt: null,
        hiddenAt: null,
        hiddenByUserId: null,
        deletedAt: null,
        deletedByUserId: null,
      },
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
    status: "active",
    moderation: {
      reportedCount: 0,
      lastReportedAt: null,
      hiddenAt: null,
      hiddenByUserId: null,
      deletedAt: null,
      deletedByUserId: null,
    },
    type: "message",
  });
  await writeDB(db);

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { postId?: string; reason?: string };
  const postId = body.postId?.trim();
  const reason = body.reason?.trim();
  if (!postId || !reason) {
    return NextResponse.json({ error: "Thiếu postId hoặc reason." }, { status: 400 });
  }
  if (reason.length < 5 || reason.length > 500) {
    return NextResponse.json({ error: "Lý do report cần từ 5-500 ký tự." }, { status: 400 });
  }

  const db = await readDB();
  const post = db.posts.find((item) => item.id === postId);
  if (!post || post.status === "deleted") return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });

  const duplicate = (db.postReports ?? []).find(
    (report) => report.postId === postId && report.reporterUserId === user.id && report.status === "pending",
  );
  if (duplicate) return NextResponse.json({ error: "Bạn đã report bài viết này rồi." }, { status: 400 });

  post.moderation = {
    reportedCount: (post.moderation?.reportedCount ?? 0) + 1,
    lastReportedAt: new Date().toISOString(),
    hiddenAt: post.moderation?.hiddenAt ?? null,
    hiddenByUserId: post.moderation?.hiddenByUserId ?? null,
    deletedAt: post.moderation?.deletedAt ?? null,
    deletedByUserId: post.moderation?.deletedByUserId ?? null,
  };

  db.postReports = db.postReports ?? [];
  db.postReports.push({
    id: newId("report"),
    postId: post.id,
    postOwnerId: post.userId,
    reporterUserId: user.id,
    reporterName: user.name,
    reason,
    status: "pending",
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedByUserId: null,
    adminNote: null,
  });

  await writeDB(db);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    action?: "moderate-post" | "review-report";
    postId?: string;
    status?: "active" | "hidden" | "deleted";
    reportId?: string;
    decision?: "resolved" | "rejected";
    adminNote?: string;
    postStatus?: "active" | "hidden" | "deleted";
  };

  const db = await readDB();

  if (body.action === "review-report") {
    const report = (db.postReports ?? []).find((item) => item.id === body.reportId);
    if (!report) return NextResponse.json({ error: "Không tìm thấy report." }, { status: 404 });
    if (report.status !== "pending") return NextResponse.json({ error: "Report đã được xử lý." }, { status: 400 });

    const decision = body.decision;
    if (decision !== "resolved" && decision !== "rejected") {
      return NextResponse.json({ error: "Quyết định không hợp lệ." }, { status: 400 });
    }

    report.status = decision;
    report.reviewedAt = new Date().toISOString();
    report.reviewedByUserId = user.id;
    report.adminNote = body.adminNote?.trim() || null;

    if (decision === "resolved" && body.postStatus) {
      const post = db.posts.find((item) => item.id === report.postId);
      if (post) {
        post.status = body.postStatus;
        post.moderation = {
          reportedCount: post.moderation?.reportedCount ?? 0,
          lastReportedAt: post.moderation?.lastReportedAt ?? null,
          hiddenAt: body.postStatus === "hidden" ? new Date().toISOString() : post.moderation?.hiddenAt ?? null,
          hiddenByUserId: body.postStatus === "hidden" ? user.id : post.moderation?.hiddenByUserId ?? null,
          deletedAt: body.postStatus === "deleted" ? new Date().toISOString() : post.moderation?.deletedAt ?? null,
          deletedByUserId: body.postStatus === "deleted" ? user.id : post.moderation?.deletedByUserId ?? null,
        };
      }
    }

    await writeDB(db);
    return NextResponse.json({ ok: true });
  }

  if (body.action !== "moderate-post") {
    return NextResponse.json({ error: "action không hợp lệ." }, { status: 400 });
  }

  const postId = body.postId?.trim();
  const nextStatus = body.status;
  if (!postId || !nextStatus) {
    return NextResponse.json({ error: "Thiếu postId hoặc status." }, { status: 400 });
  }

  const post = db.posts.find((item) => item.id === postId);
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });

  post.status = nextStatus;
  post.moderation = {
    reportedCount: post.moderation?.reportedCount ?? 0,
    lastReportedAt: post.moderation?.lastReportedAt ?? null,
    hiddenAt: nextStatus === "hidden" ? new Date().toISOString() : post.moderation?.hiddenAt ?? null,
    hiddenByUserId: nextStatus === "hidden" ? user.id : post.moderation?.hiddenByUserId ?? null,
    deletedAt: nextStatus === "deleted" ? new Date().toISOString() : post.moderation?.deletedAt ?? null,
    deletedByUserId: nextStatus === "deleted" ? user.id : post.moderation?.deletedByUserId ?? null,
  };

  await writeDB(db);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await readDB();
  db.posts = [];
  db.postReports = [];
  await writeDB(db);

  return NextResponse.json({ ok: true });
}
