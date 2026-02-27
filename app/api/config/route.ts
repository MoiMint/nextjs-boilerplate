import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, newId, readDB, writeDB } from "@/app/lib/server-db";

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const me = await getUserFromToken(token);
  const db = await readDB();

  const visibleLessons = me?.isAdmin
    ? db.config.promptMasterLessons
    : db.config.promptMasterLessons.filter((lesson) => lesson.approved !== false && !lesson.pendingApproval);

  return NextResponse.json({
    config: {
      ...db.config,
      promptMasterLessons: visibleLessons,
      courseSubmissions: me?.isAdmin ? db.config.courseSubmissions : [],
    },
  });
}

export async function PATCH(request: NextRequest) {
  const token = request.headers.get("x-session-token");
  const me = await getUserFromToken(token);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    promptLesson?: {
      title: string;
      topic: string;
      situation: string;
      overview: string;
      methodGuide: string;
      practiceChallenge: string;
      samplePrompt: string;
      price?: number;
    };
    arenaWeekly?: { weekLabel: string; title: string; inputText: string; goldenResponse: string };
    deleteLessonId?: string;
    setLessonPrice?: { lessonId: string; price: number };
    updateLesson?: {
      lessonId: string;
      title: string;
      topic: string;
      situation: string;
      overview: string;
      methodGuide: string;
      practiceChallenge: string;
      samplePrompt: string;
      price: number;
    };
    addShopItem?: {
      name: string;
      image: string;
      price: number;
      effect: string;
      category?: "dashboard-theme" | "dashboard-decoration" | "garden-decoration";
      themeKey?: string | null;
    };
    createCourseSubmission?: {
      title: string;
      topic: string;
      situation: string;
      overview: string;
      methodGuide: string;
      practiceChallenge: string;
      samplePrompt: string;
    };
    approveSubmissionId?: string;
    rejectSubmissionId?: string;
    deleteShopItemId?: string;
    grantCoins?: { userId?: string; amount: number };
    addAuditorScenario?: {
      title: string;
      wrongAnswer: string;
      requiredIssues: string[];
    };
    deleteAuditorScenarioTitle?: string;
  };

  const db = await readDB();
  const dbMe = db.users.find((u) => u.id === me.id);
  if (!dbMe) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (body.createCourseSubmission) {
    if (dbMe.coins < db.config.createCourseFee) {
      return NextResponse.json(
        { error: `Bạn cần ${db.config.createCourseFee} Endless Coin để tạo khoá học.` },
        { status: 400 },
      );
    }

    dbMe.coins -= db.config.createCourseFee;
    db.config.courseSubmissions.push({
      id: newId("course-sub"),
      ...body.createCourseSubmission,
      creatorUserId: dbMe.id,
      creatorName: dbMe.name,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    await writeDB(db);
    return NextResponse.json({ ok: true, message: "Đã gửi khoá học chờ admin duyệt." });
  }

  if (!dbMe.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (body.promptLesson) {
    db.config.promptMasterLessons.push({
      id: newId("pm"),
      title: body.promptLesson.title,
      topic: body.promptLesson.topic,
      situation: body.promptLesson.situation,
      overview: body.promptLesson.overview,
      methodGuide: body.promptLesson.methodGuide,
      practiceChallenge: body.promptLesson.practiceChallenge,
      samplePrompt: body.promptLesson.samplePrompt,
      price: Math.max(0, Number(body.promptLesson.price ?? 0)),
      approved: true,
      pendingApproval: false,
      createdByUserId: dbMe.id,
    });
  }

  if (body.arenaWeekly) {
    db.config.arenaWeekly = body.arenaWeekly;
  }

  if (body.deleteLessonId) {
    db.config.promptMasterLessons = db.config.promptMasterLessons.filter((lesson) => lesson.id !== body.deleteLessonId);
  }

  if (body.setLessonPrice) {
    const lesson = db.config.promptMasterLessons.find((item) => item.id === body.setLessonPrice?.lessonId);
    if (lesson) lesson.price = Math.max(0, Number(body.setLessonPrice.price ?? 0));
  }

  if (body.updateLesson) {
    const lesson = db.config.promptMasterLessons.find((item) => item.id === body.updateLesson?.lessonId);
    if (lesson) {
      lesson.title = body.updateLesson.title;
      lesson.topic = body.updateLesson.topic;
      lesson.situation = body.updateLesson.situation;
      lesson.overview = body.updateLesson.overview;
      lesson.methodGuide = body.updateLesson.methodGuide;
      lesson.practiceChallenge = body.updateLesson.practiceChallenge;
      lesson.samplePrompt = body.updateLesson.samplePrompt;
      lesson.price = Math.max(0, Number(body.updateLesson.price ?? 0));
    }
  }

  if (body.addShopItem) {
    const cleanName = body.addShopItem.name?.trim();
    if (!cleanName) {
      return NextResponse.json({ error: "Tên vật phẩm không được để trống." }, { status: 400 });
    }

    db.config.shopItems.push({
      id: newId("shop"),
      name: cleanName,
      image: body.addShopItem.image?.trim() || "🧩",
      price: Math.max(1, Number(body.addShopItem.price)),
      effect: body.addShopItem.effect?.trim() || "Trang trí",
      category: body.addShopItem.category ?? "dashboard-decoration",
      themeKey: body.addShopItem.themeKey ?? null,
    });
  }

  if (body.approveSubmissionId) {
    const submission = db.config.courseSubmissions.find((item) => item.id === body.approveSubmissionId);
    if (submission) {
      db.config.promptMasterLessons.push({
        id: newId("pm"),
        title: submission.title,
        topic: submission.topic,
        situation: submission.situation,
        overview: submission.overview,
        methodGuide: submission.methodGuide,
        practiceChallenge: submission.practiceChallenge,
        samplePrompt: submission.samplePrompt,
        approved: true,
        pendingApproval: false,
        createdByUserId: submission.creatorUserId,
        price: 0,
      });
      db.config.courseSubmissions = db.config.courseSubmissions.filter((item) => item.id !== submission.id);
    }
  }

  if (body.rejectSubmissionId) {
    db.config.courseSubmissions = db.config.courseSubmissions.filter((item) => item.id !== body.rejectSubmissionId);
  }

  if (body.deleteShopItemId) {
    db.config.shopItems = db.config.shopItems.filter((item) => item.id !== body.deleteShopItemId);
    db.users = db.users.map((user) => {
      user.ownedItemIds = user.ownedItemIds.filter((id) => id !== body.deleteShopItemId);
      const activeThemeStillOwned = db.config.shopItems.some(
        (item) => item.category === "dashboard-theme" && item.themeKey === user.activeDashboardTheme && user.ownedItemIds.includes(item.id),
      );
      if (!activeThemeStillOwned) user.activeDashboardTheme = null;
      return user;
    });
  }

  if (body.addAuditorScenario) {
    const title = body.addAuditorScenario.title.trim();
    if (!title) {
      return NextResponse.json({ error: "Tiêu đề câu hỏi Auditor không được để trống." }, { status: 400 });
    }

    const requiredIssues = (body.addAuditorScenario.requiredIssues ?? [])
      .map((item) => item.trim())
      .filter(Boolean);

    if (!requiredIssues.length) {
      return NextResponse.json({ error: "Cần ít nhất 1 lỗi đúng cho câu hỏi Auditor." }, { status: 400 });
    }

    const list = db.config.auditorScenarios ?? [db.config.auditorScenario];
    if (!list.some((item) => item.title === title)) {
      list.push({
        title,
        wrongAnswer: body.addAuditorScenario.wrongAnswer?.trim() || "",
        requiredIssues,
      });
    }
    db.config.auditorScenarios = list;
    db.config.auditorScenario = list[0] ?? db.config.auditorScenario;
  }

  if (body.deleteAuditorScenarioTitle) {
    const list = (db.config.auditorScenarios ?? [db.config.auditorScenario]).filter(
      (item) => item.title !== body.deleteAuditorScenarioTitle,
    );
    db.config.auditorScenarios = list.length ? list : [db.config.auditorScenario];
    db.config.auditorScenario = db.config.auditorScenarios[0] ?? db.config.auditorScenario;
  }

  if (body.grantCoins) {
    const grant = body.grantCoins;
    const amount = Number(grant.amount ?? 0);
    const targetUser = grant.userId ? db.users.find((u) => u.id === grant.userId) : dbMe;
    if (targetUser && amount !== 0) {
      targetUser.coins += amount;
    }
  }

  await writeDB(db);
  return NextResponse.json({ ok: true, config: db.config });
}
