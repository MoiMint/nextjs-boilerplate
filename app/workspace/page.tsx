"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminTab } from "./components/AdminTab";
import { ArenaTab } from "./components/ArenaTab";
import { AuditorTab } from "./components/AuditorTab";
import { CommunityTab } from "./components/CommunityTab";
import { DashboardTab } from "./components/DashboardTab";
import { GardenTab } from "./components/GardenTab";
import { PromptMasterTab } from "./components/PromptMasterTab";
import { useGameActions } from "./hooks/useGameActions";
import type { AppConfig, AuditorScenario, FeedbackItem, HistoryItem, Post, PostReport, PromptMasterLesson, SeedSpec, User } from "./types";
import { formatChatTime } from "./utils/format";
import { I18N, TAB_LABELS, type Locale, type Tab } from "./utils/i18n";
import { getActiveTabClass, getNameStyleClass, getThemeClasses } from "./utils/theme";

const SESSION_TOKEN_KEY = "blabla-session-token";
const COMMUNITY_POLL_INTERVAL_MS = 2500;
const SEED_OPTIONS: SeedSpec[] = [
  { id: "seed-basic", name: "Hạt cải", price: 50, reward: 150, growHours: 8 },
  { id: "seed-sun", name: "Hạt hướng dương", price: 120, reward: 380, growHours: 12 },
  { id: "seed-moon", name: "Hạt ánh trăng", price: 240, reward: 820, growHours: 20 },
];
const THEME_LABELS: Record<string, string> = {
  pink: "Hồng",
  ocean: "Đại dương",
  violet: "Tím",
  sunset: "Hoàng hôn",
  aurora: "Cực quang",
  matrix: "Matrix",
};


export default function WorkspacePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [locale, setLocale] = useState<Locale>("vi");
  const [masterLoading, setMasterLoading] = useState(false);
  const [arenaLoading, setArenaLoading] = useState(false);
  const [auditorLoading, setAuditorLoading] = useState(false);

  const [me, setMe] = useState<User | null>(null);
  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postReports, setPostReports] = useState<PostReport[]>([]);
  const [postNextCursor, setPostNextCursor] = useState<string | null>(null);
  const [reportReasonByPost, setReportReasonByPost] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<AppConfig | null>(null);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [masterPrompt, setMasterPrompt] = useState("");
  const [masterResult, setMasterResult] = useState<string>("");
  const [learningLessonId, setLearningLessonId] = useState<string>("");
  const [lessonStep, setLessonStep] = useState<1 | 2 | 3>(1);
  const [step1Reflection, setStep1Reflection] = useState("");
  const [step2DraftPrompt, setStep2DraftPrompt] = useState("");

  const [arenaPrompt, setArenaPrompt] = useState("");
  const [arenaResult, setArenaResult] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<
    Array<{ id: string; userName: string; accuracy: number; tokens: number; efficiency: number }>
  >([]);

  const [auditorIssues, setAuditorIssues] = useState("");
  const [auditorRePrompt, setAuditorRePrompt] = useState("");
  const [auditorResult, setAuditorResult] = useState("");
  const [activeAuditorScenario, setActiveAuditorScenario] = useState<AuditorScenario | null>(null);

  const [communityInput, setCommunityInput] = useState("");
  const [communitySending, setCommunitySending] = useState(false);
  const [communityError, setCommunityError] = useState("");
  const [giftCoinAmount, setGiftCoinAmount] = useState(100);
  const [giftReceiverLimit, setGiftReceiverLimit] = useState(5);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const communityStickToBottomRef = useRef(true);

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminMsg, setAdminMsg] = useState("");

  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonTopic, setNewLessonTopic] = useState("");
  const [newLessonSituation, setNewLessonSituation] = useState("");
  const [newLessonOverview, setNewLessonOverview] = useState("");
  const [newLessonMethodGuide, setNewLessonMethodGuide] = useState("");
  const [newLessonPracticeChallenge, setNewLessonPracticeChallenge] = useState("");
  const [newLessonSamplePrompt, setNewLessonSamplePrompt] = useState("");

  const [newArenaWeek, setNewArenaWeek] = useState("");
  const [newArenaTitle, setNewArenaTitle] = useState("");
  const [newArenaInput, setNewArenaInput] = useState("");
  const [newArenaGolden, setNewArenaGolden] = useState("");

  const [shopMsg, setShopMsg] = useState("");
  const [promptMasterMsg, setPromptMasterMsg] = useState("");
  const [gardenMsg, setGardenMsg] = useState("");
  const [nowTick, setNowTick] = useState(0);
  const [courseCreateTitle, setCourseCreateTitle] = useState("");
  const [courseCreateTopic, setCourseCreateTopic] = useState("");
  const [courseCreateSituation, setCourseCreateSituation] = useState("");
  const [courseCreateOverview, setCourseCreateOverview] = useState("");
  const [courseCreateMethod, setCourseCreateMethod] = useState("");
  const [courseCreatePractice, setCourseCreatePractice] = useState("");
  const [courseCreateSample, setCourseCreateSample] = useState("");
  const [shopItemName, setShopItemName] = useState("");
  const [shopItemImage, setShopItemImage] = useState("🌱");
  const [shopItemPrice, setShopItemPrice] = useState(80);
  const [shopItemEffect, setShopItemEffect] = useState("Trang trí dashboard");
  const [shopItemCategory, setShopItemCategory] = useState<"dashboard-theme" | "dashboard-decoration" | "garden-decoration">("dashboard-decoration");
  const [shopItemThemeKey, setShopItemThemeKey] = useState<"pink" | "ocean" | "violet" | "sunset" | "aurora" | "matrix" | "none">("none");
  const [coursePriceDraft, setCoursePriceDraft] = useState<Record<string, number>>({});
  const [selectedSeed, setSelectedSeed] = useState<string>("seed-basic");
  const [lessonMenuId, setLessonMenuId] = useState<string>("");
  const [lessonEditDraft, setLessonEditDraft] = useState<PromptMasterLesson | null>(null);
  const [showLearningModal, setShowLearningModal] = useState(false);
  const [harvestFxActive, setHarvestFxActive] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem(SESSION_TOKEN_KEY) : null;
  const authHeaders = useMemo(
    () => ({ "Content-Type": "application/json", "x-session-token": token ?? "" }),
    [token],
  );

  const selectedLesson = useMemo(
    () => config?.promptMasterLessons.find((l) => l.id === selectedLessonId) ?? config?.promptMasterLessons[0],
    [config, selectedLessonId],
  );

  const playUiSound = (frequency = 520) => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.04;
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.08);
      oscillator.onended = () => void ctx.close();
    } catch {
      // no audio device or blocked by browser
    }
  };

  const isLearningSelectedLesson = !!selectedLesson && learningLessonId === selectedLesson.id;

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/me", { headers: { "x-session-token": token ?? "" } });
    if (!res.ok) {
      router.push("/login");
      return;
    }
    const data = (await res.json()) as { user: User };
    setMe(data.user);
  }, [router, token]);

  const loadHistories = useCallback(async () => {
    const res = await fetch("/api/history", { headers: { "x-session-token": token ?? "" } });
    if (!res.ok) return;
    const data = (await res.json()) as { histories: HistoryItem[] };
    setHistories(data.histories);
  }, [token]);

  const loadPosts = useCallback(async (cursor?: string | null, mode: "reset" | "append" = "reset") => {
    const params = new URLSearchParams({ limit: "30" });
    if (cursor) params.set("before", cursor);
    if (me?.isAdmin) params.set("reports", "true");
    const res = await fetch(`/api/posts?${params.toString()}`, { headers: { "x-session-token": token ?? "" } });
    if (!res.ok) return;
    const data = (await res.json()) as { posts: Post[]; reports?: PostReport[]; pageInfo?: { nextCursor?: string | null } };
    setPosts((prev) => (mode === "append" ? [...prev, ...data.posts] : data.posts));
    setPostReports(data.reports ?? []);
    setPostNextCursor(data.pageInfo?.nextCursor ?? null);
  }, [me?.isAdmin, token]);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users", { headers: { "x-session-token": token ?? "" } });
    if (!res.ok) return;
    const data = (await res.json()) as { users: User[] };
    setAllUsers(data.users);
  }, [token]);

  const loadFeedbacks = useCallback(async () => {
    const res = await fetch("/api/feedback", { headers: { "x-session-token": token ?? "" } });
    if (!res.ok) return;
    const data = (await res.json()) as { feedbacks: FeedbackItem[] };
    setFeedbacks(data.feedbacks);
  }, [token]);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/config", { headers: { "x-session-token": token ?? "" } });
    if (!res.ok) return;
    const data = (await res.json()) as { config: AppConfig };
    setConfig(data.config);
    setSelectedLessonId((prev) => prev || data.config.promptMasterLessons[0]?.id || "");
    setActiveAuditorScenario((prev) => prev ?? data.config.auditorScenarios?.[0] ?? data.config.auditorScenario ?? null);
  }, [token]);

  const loadLeaderboard = useCallback(async () => {
    const res = await fetch("/api/arena/leaderboard");
    if (!res.ok) return;
    const data = (await res.json()) as {
      leaderboard: Array<{ id: string; userName: string; accuracy: number; tokens: number; efficiency: number }>;
    };
    setLeaderboard(data.leaderboard);
  }, []);

  const { patchConfig, runGameAction, gameActionLoading } = useGameActions({ authHeaders, loadConfig, loadMe });

  const refreshCommunity = useCallback(async () => {
    await loadPosts(null, "reset");
  }, [loadPosts]);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadMe();
    loadHistories();
    loadPosts();
    loadConfig();
    loadLeaderboard();
  }, [router, token, loadMe, loadHistories, loadPosts, loadConfig, loadLeaderboard]);

  useEffect(() => {
    if (me?.isAdmin) {
      loadUsers();
      loadFeedbacks();
    }
  }, [me, loadUsers, loadFeedbacks]);

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      void loadLeaderboard();
    }, 4000);

    return () => clearInterval(timer);
  }, [token, loadLeaderboard]);

  useEffect(() => {
    if (activeTab !== "community") return;
    const el = chatContainerRef.current;
    if (!el || !communityStickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [activeTab, posts]);

  useEffect(() => {
    if (activeTab !== "community" || typeof document === "undefined") return;

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      void loadPosts();
    };

    const timer = setInterval(refreshWhenVisible, COMMUNITY_POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    refreshWhenVisible();

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [activeTab, loadPosts]);

  useEffect(() => {
    if (activeTab !== "garden") return;
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("blabla-lesson-progress");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        learningLessonId?: string;
        lessonStep?: 1 | 2 | 3;
        step1Reflection?: string;
        step2DraftPrompt?: string;
        masterPrompt?: string;
      };
      if (parsed.learningLessonId) setLearningLessonId(parsed.learningLessonId);
      if (parsed.lessonStep) setLessonStep(parsed.lessonStep);
      if (parsed.step1Reflection) setStep1Reflection(parsed.step1Reflection);
      if (parsed.step2DraftPrompt) setStep2DraftPrompt(parsed.step2DraftPrompt);
      if (parsed.masterPrompt) setMasterPrompt(parsed.masterPrompt);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      "blabla-lesson-progress",
      JSON.stringify({ learningLessonId, lessonStep, step1Reflection, step2DraftPrompt, masterPrompt }),
    );
  }, [learningLessonId, lessonStep, step1Reflection, step2DraftPrompt, masterPrompt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedLocale = window.localStorage.getItem("blabla-locale");
    if (savedLocale === "vi" || savedLocale === "en") setLocale(savedLocale);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("blabla-locale", locale);
  }, [locale]);

  const text = I18N[locale];

  const avgScore = histories.length
    ? Math.round(histories.reduce((sum, item) => sum + item.score, 0) / histories.length)
    : 0;

  const completedCourses = new Set(
    histories.filter((item) => item.title.startsWith("Khoá Prompt Master")).map((item) => item.title),
  ).size;
  const arenaAttempts = histories.filter((item) => item.type === "arena").length;
  const auditorAttempts = histories.filter((item) => item.type === "auditor").length;
  const communityPosts = posts.length;
  const topArena = leaderboard[0];
  const myArenaRank = me ? leaderboard.findIndex((entry) => entry.userName === me.name) + 1 : 0;
  const arenaWeekTitle = config ? `Arena tuần: ${config.arenaWeekly.weekLabel}` : "";
  const alreadySubmittedArena = !!histories.find((item) => item.type === "arena" && item.title === arenaWeekTitle);
  const readyAt = me?.farmPlot?.readyAt ? new Date(me.farmPlot.readyAt).getTime() : 0;
  const remainMs = readyAt ? Math.max(0, readyAt - nowTick) : 0;
  const remainSec = Math.ceil(remainMs / 1000);
  const ownedDecorations = (config?.shopItems ?? []).filter((item) => (me?.ownedItemIds ?? []).includes(item.id));
  const ownedThemes = ownedDecorations.filter((item) => item.category === "dashboard-theme" && item.themeKey);
  const ownedThemeLabels = ownedThemes.map((item) => item.name);
  const ownedNameStyles = ownedDecorations.filter((item) => item.category === "name-style" && item.nameStyleKey);
  const ownedDashboardDecorations = ownedDecorations.filter((item) => item.category === "dashboard-decoration");
  const ownedGardenDecorations = ownedDecorations.filter((item) => item.category === "garden-decoration");
  const hasNeonFrame = (me?.ownedItemIds ?? []).includes("item-neon-frame");
  const activeTheme = me?.activeDashboardTheme ?? null;

  const { themeClass, appThemeClass } = getThemeClasses(activeTheme);
  const panelClass = `tab-panel rounded-2xl border p-5 ${themeClass} ${hasNeonFrame ? "neon-frame" : ""}`;

  const submitPromptMaster = async () => {
    if (!selectedLesson) return;
    setMasterLoading(true);

    const aiRunPrompt = `Nhiệm vụ thực hành: ${selectedLesson.practiceChallenge}

Hãy trả lời theo đúng yêu cầu bài tập bằng cách thực thi prompt học viên dưới đây:
${masterPrompt}`;
    const aiRunRes = await fetch("/api/ai", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ context: "Prompt Master Practice", mode: "generate", prompt: aiRunPrompt }),
    });
    const aiRunData = (await aiRunRes.json()) as { output?: string; error?: string };
    const generatedOutput = aiRunRes.ok
      ? aiRunData.output ?? "AI chưa tạo được output."
      : aiRunData.error ?? "AI không tạo được output.";

    const reviewerPrompt = `Bạn là reviewer chỉ tập trung vào chất lượng prompt, KHÔNG biết nội dung đề bài cụ thể.
Hãy đánh giá prompt sau theo tiêu chí rõ vai trò, rõ output, ràng buộc và khả năng lặp cải tiến.
Trả về JSON {"score": number, "feedback": string}.
Prompt học viên:
${masterPrompt}`;

    const reviewerRes = await fetch("/api/ai", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ context: "Prompt Master Reviewer", prompt: reviewerPrompt }),
    });
    const reviewerData = (await reviewerRes.json()) as { score?: number; feedback?: string; error?: string };
    const reviewerFeedback = reviewerRes.ok
      ? reviewerData.feedback ?? "Reviewer chưa có phản hồi."
      : reviewerData.error ?? "Reviewer gặp lỗi.";

    const auditorPrompt = `Bạn là AI tổng kết biết đầy đủ bối cảnh bài học.
Thông tin bài học:
- Thực trạng: ${selectedLesson.situation}
- Tóm tắt: ${selectedLesson.overview}
- Phương pháp viết prompt tốt: ${selectedLesson.methodGuide}
- Yêu cầu thực hành: ${selectedLesson.practiceChallenge}

Prompt của học viên:
${masterPrompt}

Output AI tạo ra từ prompt:
${generatedOutput}

Phản hồi của reviewer (chỉ biết prompt):
${reviewerFeedback}

Nhiệm vụ: tự kiểm tra output AI và phản hồi reviewer đã bám yêu cầu chưa, rồi chấm điểm cuối cùng và góp ý cải thiện prompt. Trả về JSON {"score": number, "feedback": string}.`;

    const finalRes = await fetch("/api/ai", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ context: "Prompt Master Final Auditor", prompt: auditorPrompt }),
    });

    const finalData = (await finalRes.json()) as { score?: number; feedback?: string; error?: string };
    const score = finalRes.ok ? finalData.score ?? 72 : 60;
    const finalFeedback = finalRes.ok
      ? finalData.feedback ?? "Không có nhận xét cuối."
      : finalData.error ?? "AI tổng kết lỗi.";

    await fetch("/api/history", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        type: "master",
        title: `Khoá Prompt Master: ${selectedLesson.title}`,
        score,
        feedback: `AI Output: ${generatedOutput} | Reviewer: ${reviewerFeedback} | Tổng kết: ${finalFeedback}`,
      }),
    });

    await loadHistories();
    await loadMe();
    setMasterResult(`AI tạo output: ${generatedOutput}\n\nReviewer: ${reviewerFeedback}\n\nĐiểm cuối: ${score}% | Tổng kết: ${finalFeedback}\n\n+40 Endless Coin`);
    setMasterLoading(false);
  };

  const submitArena = async () => {
    if (!config) return;
    setArenaLoading(true);

    const solvePrompt = `Bài toán Arena: ${config.arenaWeekly.title}
Input chuẩn: ${config.arenaWeekly.inputText}
Hãy thực thi prompt sau của học viên và tạo output cuối:
${arenaPrompt}`;
    const solveRes = await fetch("/api/ai", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ context: "Arena Solver", mode: "generate", prompt: solvePrompt }),
    });
    const solveData = (await solveRes.json()) as { output?: string; error?: string };
    const generatedOutput = solveRes.ok ? solveData.output ?? "" : "";

    if (!generatedOutput) {
      setArenaResult(solveData.error ?? "AI không tạo được output cho Arena.");
      setArenaLoading(false);
      return;
    }

    const selfJudgePrompt = `Golden response: ${config.arenaWeekly.goldenResponse}
Output AI tạo ra: ${generatedOutput}
Hãy tự đánh giá output có khớp yêu cầu chưa, nêu đúng/sai ngắn gọn.`;
    const selfJudgeRes = await fetch("/api/ai", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ context: "Arena Self Judge", prompt: selfJudgePrompt }),
    });
    const selfJudgeData = (await selfJudgeRes.json()) as { feedback?: string; error?: string };
    const selfJudgeFeedback = selfJudgeRes.ok
      ? selfJudgeData.feedback ?? "Chưa có tự đánh giá."
      : selfJudgeData.error ?? "Tự đánh giá thất bại.";

    const res = await fetch("/api/arena/submit", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ prompt: arenaPrompt, output: generatedOutput }),
    });
    const data = (await res.json()) as { accuracy?: number; tokens?: number; efficiency?: number; error?: string };

    if (!res.ok) {
      setArenaResult(data.error ?? "Nộp Arena thất bại.");
      setArenaLoading(false);
      return;
    }

    setArenaResult(
      `AI output: ${generatedOutput}

Tự đánh giá: ${selfJudgeFeedback}

Accuracy: ${data.accuracy}% | Tokens: ${data.tokens} | Efficiency: ${data.efficiency}`,
    );
    await loadLeaderboard();
    await loadHistories();
    await loadMe();
    setArenaResult((prev) => `${prev}\n\n+35 Endless Coin`);
    setArenaLoading(false);
  };

  const randomizeAuditorScenario = () => {
    if (!config) return;
    const pool = config.auditorScenarios?.length ? config.auditorScenarios : [config.auditorScenario];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setActiveAuditorScenario(pick);
    setAuditorIssues("");
    setAuditorRePrompt("");
    setAuditorResult("");
  };

  const submitAuditor = async () => {
    const scenario = activeAuditorScenario ?? config?.auditorScenario;
    if (!scenario) return;
    setAuditorLoading(true);

    const correctedAnswerPrompt = `Bạn đang sửa câu trả lời AI bị sai.
Câu sai ban đầu:
${scenario.wrongAnswer}

Hãy thực thi prompt sửa của học viên để tạo ra câu trả lời đúng hơn:
${auditorRePrompt}`;
    const correctionRes = await fetch("/api/ai", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ context: "AI Auditor Correction", mode: "generate", prompt: correctedAnswerPrompt }),
    });
    const correctionData = (await correctionRes.json()) as { output?: string; error?: string };
    const correctedAnswer = correctionRes.ok
      ? correctionData.output ?? ""
      : correctionData.error ?? "AI không tạo được câu trả lời sửa.";

    const judgePrompt = `Danh sách lỗi đúng cần tìm: ${scenario.requiredIssues.join(", ")}
Người dùng phát hiện lỗi: ${auditorIssues}
Prompt sửa của người dùng: ${auditorRePrompt}
Câu trả lời mới do AI tạo từ prompt sửa: ${correctedAnswer}
Hãy chấm theo rubric AI Auditor, ưu tiên kiểm tra câu trả lời mới đã đúng chưa.`;

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ context: "AI Auditor Judge", prompt: judgePrompt }),
    });

    const data = (await res.json()) as { score?: number; feedback?: string; error?: string };
    const score = res.ok ? data.score ?? 75 : 65;
    const feedback = res.ok ? data.feedback ?? "Không có nhận xét." : data.error ?? "AI lỗi.";

    await fetch("/api/history", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        type: "auditor",
        title: `AI Auditor: ${scenario.title}`,
        score,
        feedback: `Câu trả lời mới: ${correctedAnswer} | Đánh giá: ${feedback}`,
      }),
    });

    await loadHistories();
    await loadMe();
    setAuditorResult(`AI trả lời sau khi sửa: ${correctedAnswer}\n\nĐiểm: ${score}% | Nhận xét: ${feedback}\n\n+30 Endless Coin`);
    setAuditorLoading(false);
  };

  const postCommunity = async () => {
    if (!communityInput.trim() || communitySending) return;
    setCommunitySending(true);
    setCommunityError("");

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ content: communityInput }),
    });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setCommunityError(data.error ?? "Không gửi được tin nhắn.");
      setCommunitySending(false);
      return;
    }

    setCommunityInput("");
    await refreshCommunity();
    setCommunitySending(false);
  };

  const sendCoinGift = async () => {
    if (communitySending) return;
    setCommunitySending(true);
    setCommunityError("");

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        giftCoin: { totalCoins: giftCoinAmount, maxReceivers: giftReceiverLimit },
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setCommunityError(data.error ?? "Không gửi được lì xì coin.");
      setCommunitySending(false);
      return;
    }
    await loadMe();
    await refreshCommunity();
    setCommunitySending(false);
  };

  const claimCoinGift = async (postId: string) => {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ claimGiftPostId: postId }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setCommunityError(data.error ?? "Không nhận được lì xì.");
      return;
    }
    await loadMe();
    await refreshCommunity();
  };

  const clearCommunityPosts = async () => {
    if (!me?.isAdmin || communitySending) return;
    const confirmed = window.confirm("Xóa toàn bộ lịch sử chat cộng đồng?");
    if (!confirmed) return;

    setCommunitySending(true);
    setCommunityError("");

    const res = await fetch("/api/posts", {
      method: "DELETE",
      headers: authHeaders,
    });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setCommunityError(data.error ?? "Không thể xóa lịch sử chat.");
      setCommunitySending(false);
      return;
    }

    communityStickToBottomRef.current = true;
    await refreshCommunity();
    setCommunitySending(false);
  };

  const reportPost = async (postId: string) => {
    const reason = (reportReasonByPost[postId] ?? "").trim();
    if (!reason) {
      setCommunityError("Vui lòng nhập lý do report.");
      return;
    }
    const res = await fetch("/api/posts", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ postId, reason }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setCommunityError(data.error ?? "Không report được bài viết.");
      return;
    }
    setReportReasonByPost((prev) => ({ ...prev, [postId]: "" }));
    setCommunityError("");
    await refreshCommunity();
  };

  const moderatePost = async (postId: string, status: "active" | "hidden" | "deleted") => {
    const res = await fetch("/api/posts", {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ action: "moderate-post", postId, status }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setCommunityError(data.error ?? "Không thể cập nhật trạng thái bài viết.");
      return;
    }
    await refreshCommunity();
  };

  const reviewReport = async (reportId: string, decision: "resolved" | "rejected", postStatus?: "active" | "hidden" | "deleted") => {
    const res = await fetch("/api/posts", {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ action: "review-report", reportId, decision, postStatus }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setCommunityError(data.error ?? "Không xử lý report được.");
      return;
    }
    await refreshCommunity();
  };

  const createAdmin = async () => {
    const res = await fetch("/api/admin/create", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: adminName, email: adminEmail, password: adminPass }),
    });
    const data = (await res.json()) as { error?: string };
    setAdminMsg(res.ok ? "Tạo admin thành công." : data.error ?? "Lỗi tạo admin.");
    if (res.ok) {
      setAdminName("");
      setAdminEmail("");
      setAdminPass("");
      loadUsers();
    }
  };

  const addPromptLesson = async () => {
    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        promptLesson: {
          title: newLessonTitle,
          topic: newLessonTopic,
          situation: newLessonSituation,
          overview: newLessonOverview,
          methodGuide: newLessonMethodGuide,
          practiceChallenge: newLessonPracticeChallenge,
          samplePrompt: newLessonSamplePrompt,
          price: coursePriceDraft["new"] ?? 0,
        },
      }),
    });
    if (!res.ok) {
      setAdminMsg("Không thêm được lesson.");
      return;
    }
    setAdminMsg("Đã thêm khóa Prompt Master.");
    setNewLessonTitle("");
    setNewLessonTopic("");
    setNewLessonSituation("");
    setNewLessonOverview("");
    setNewLessonMethodGuide("");
    setNewLessonPracticeChallenge("");
    setNewLessonSamplePrompt("");
    loadConfig();
  };

  const updateArenaWeekly = async () => {
    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        arenaWeekly: {
          weekLabel: newArenaWeek,
          title: newArenaTitle,
          inputText: newArenaInput,
          goldenResponse: newArenaGolden,
        },
      }),
    });
    if (!res.ok) {
      setAdminMsg("Không cập nhật được Arena tuần.");
      return;
    }
    setAdminMsg("Đã cập nhật challenge tuần cho Arena.");
    setNewArenaWeek("");
    setNewArenaTitle("");
    setNewArenaInput("");
    setNewArenaGolden("");
    loadConfig();
    loadLeaderboard();
  };

  const buyLesson = async (lessonId: string) => {
    try {
      await runGameAction({ action: "buy_lesson", lessonId });
      setPromptMasterMsg("Mua khóa học thành công. Đã mở khóa vĩnh viễn!");
      playUiSound(780);
    } catch (error) {
      setPromptMasterMsg(error instanceof Error ? error.message : "Mua khóa thất bại.");
    }
  };

  const buyItem = async (itemId: string) => {
    try {
      await runGameAction({ action: "buy_item", itemId });
      setShopMsg("Mua vật phẩm thành công.");
      playUiSound(740);
    } catch (error) {
      setShopMsg(error instanceof Error ? error.message : "Mua vật phẩm thất bại.");
    }
  };

  const createCommunityCourse = async () => {
    try {
      const data = await patchConfig({
        createCourseSubmission: {
          title: courseCreateTitle,
          topic: courseCreateTopic,
          situation: courseCreateSituation,
          overview: courseCreateOverview,
          methodGuide: courseCreateMethod,
          practiceChallenge: courseCreatePractice,
          samplePrompt: courseCreateSample,
        },
      });
      setPromptMasterMsg(data.message ?? "Đã gửi khóa học chờ duyệt.");
      setCourseCreateTitle("");
      setCourseCreateTopic("");
      setCourseCreateSituation("");
      setCourseCreateOverview("");
      setCourseCreateMethod("");
      setCourseCreatePractice("");
      setCourseCreateSample("");
      playUiSound(650);
    } catch (error) {
      setPromptMasterMsg(error instanceof Error ? error.message : "Không gửi được khóa học.");
    }
  };

  const submitFeedback = async () => {
    if (!feedbackInput.trim()) return;
    setFeedbackSending(true);
    setFeedbackMsg("");
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ message: feedbackInput }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setFeedbackMsg(data.error ?? "Không gửi được feedback.");
      setFeedbackSending(false);
      return;
    }
    setFeedbackInput("");
    setFeedbackMsg(text.feedbackSent);
    setFeedbackSending(false);
    setShowFeedbackModal(false);
  };

  const deleteFeedback = async (feedbackId: string) => {
    const res = await fetch("/api/feedback", {
      method: "DELETE",
      headers: authHeaders,
      body: JSON.stringify({ feedbackId }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setAdminMsg(data.error ?? "Không xóa được feedback.");
      return;
    }
    setFeedbacks((prev) => prev.filter((item) => item.id !== feedbackId));
  };

  const deleteUser = async (userId: string) => {
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: authHeaders,
      body: JSON.stringify({ userId }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setAdminMsg(data.error ?? "Không xóa được tài khoản.");
      return;
    }
    setSelectedUser(null);
    setAdminMsg("Đã xóa tài khoản người dùng.");
    await loadUsers();
  };

  const unlockable = (lesson: PromptMasterLesson) => (lesson.price ?? 0) > 0 && !(me?.unlockedLessonIds ?? []).includes(lesson.id);

  const openLessonEditor = (lesson: PromptMasterLesson) => {
    setLessonMenuId(lesson.id);
    setLessonEditDraft({ ...lesson });
  };

  const openLearningModal = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setLearningLessonId(lessonId);
    setLessonStep(1);
    setStep1Reflection("");
    setStep2DraftPrompt("");
    setMasterPrompt("");
    setMasterResult("");
    setShowLearningModal(true);
  };

  const applyNameStyle = async (styleItem: AppConfig["shopItems"][number]) => {
    const nextStyle = styleItem.nameStyleKey ?? null;
    setMe((prev) => (prev ? { ...prev, activeNameStyle: nextStyle } : prev));
    try {
      await runGameAction({ action: "set_name_style", nameStyleKey: styleItem.nameStyleKey });
      setShopMsg(`Đã áp dụng ${styleItem.name}.`);
    } catch (error) {
      await loadMe();
      setShopMsg(error instanceof Error ? error.message : "Không áp dụng được hiệu ứng tên.");
    }
  };

  const saveLessonEditor = async () => {
    if (!lessonEditDraft) return;
    await patchConfig({
      updateLesson: {
        lessonId: lessonEditDraft.id,
        title: lessonEditDraft.title,
        topic: lessonEditDraft.topic,
        situation: lessonEditDraft.situation,
        overview: lessonEditDraft.overview,
        methodGuide: lessonEditDraft.methodGuide,
        practiceChallenge: lessonEditDraft.practiceChallenge,
        samplePrompt: lessonEditDraft.samplePrompt,
        price: lessonEditDraft.price ?? 0,
      },
    });
    setPromptMasterMsg("Đã cập nhật bài học.");
    setLessonMenuId("");
    setLessonEditDraft(null);
  };

  useEffect(() => {
    if (!config || !selectedLessonId) return;
    const exists = config.promptMasterLessons.some((lesson) => lesson.id === selectedLessonId);
    if (!exists) {
      setSelectedLessonId(config.promptMasterLessons[0]?.id ?? "");
      setLearningLessonId("");
      setLessonStep(1);
    }
  }, [config, selectedLessonId]);

  const navTabs = (["dashboard", "promptmaster", "arena", "auditor", "history", "community", "garden", ...(me?.isAdmin ? ["admin"] : [])] as Tab[]);
  const mobileBottomTabs = (["dashboard", "promptmaster", "community", "garden", ...(me?.isAdmin ? ["admin"] : [])] as Tab[]);

  const handleLogout = async () => {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (sessionToken) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-session-token": sessionToken },
      });
    }
    localStorage.removeItem(SESSION_TOKEN_KEY);
    router.push("/login");
  };

  return (
    <main className={`min-h-screen overflow-x-hidden bg-gradient-to-br px-3 py-4 pb-24 text-slate-100 md:px-8 md:py-8 md:pb-8 ${appThemeClass}`}>
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[260px_1fr]">
        <aside className={`hidden rounded-2xl border p-4 md:block ${themeClass}`}>
          <h1 className={`text-lg font-bold ${getNameStyleClass(me?.activeNameStyle)}`}>{me?.name ?? "Loading..."}</h1>
          <p className="text-sm text-slate-300">{me?.email}</p>
          <p className="mt-1 text-xs text-cyan-300">Chuỗi đăng nhập: {me?.loginStreak ?? 0} ngày</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setLocale("vi")} className={`rounded-md border px-2 py-1 text-xs ${locale === "vi" ? "border-cyan-300 text-cyan-200" : "border-white/20 text-slate-300"}`}>VN</button>
            <button onClick={() => setLocale("en")} className={`rounded-md border px-2 py-1 text-xs ${locale === "en" ? "border-cyan-300 text-cyan-200" : "border-white/20 text-slate-300"}`}>ENG</button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 md:block md:space-y-2">
            {navTabs.map((key) => (
              <button
                key={key}
                onClick={() => { playUiSound(480); setActiveTab(key); }}
                className={`w-full rounded-lg px-3 py-2 text-center text-sm transition-all duration-300 md:text-left ${
                  getActiveTabClass(activeTab === key, activeTheme, hasNeonFrame)
                }`}
              >
                {TAB_LABELS[locale][key]}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              void handleLogout();
            }}
            className="mt-6 w-full rounded-lg border border-white/20 px-3 py-2"
          >
            {text.logout}
          </button>
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="mt-2 w-full rounded-lg border border-cyan-300/40 px-3 py-2 text-sm text-cyan-200"
          >
            {text.feedback}
          </button>
        </aside>

        <section className={`space-y-4 break-words rounded-2xl border p-3 md:p-4 md:max-h-[84vh] md:overflow-y-auto scrollbar-pro ${themeClass}`}>
          <div className="rounded-xl border border-cyan-300/20 bg-slate-900/55 p-3 md:hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-base font-bold ${getNameStyleClass(me?.activeNameStyle)}`}>{me?.name ?? "Loading..."}</p>
                <p className="text-xs text-slate-300">{me?.email}</p>
                <p className="mt-1 text-xs text-cyan-300">{TAB_LABELS[locale][activeTab]}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400">Endless Coin</p>
                <p className="text-lg font-semibold text-yellow-300">{me?.coins ?? 0}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={() => setLocale("vi")} className={`rounded-md border px-2 py-1 text-xs ${locale === "vi" ? "border-cyan-300 text-cyan-200" : "border-white/20 text-slate-300"}`}>VN</button>
              <button onClick={() => setLocale("en")} className={`rounded-md border px-2 py-1 text-xs ${locale === "en" ? "border-cyan-300 text-cyan-200" : "border-white/20 text-slate-300"}`}>ENG</button>
              <button onClick={() => setShowFeedbackModal(true)} className="ml-auto rounded-md border border-cyan-300/40 px-2 py-1 text-xs text-cyan-200">{text.feedback}</button>
              <button onClick={() => { void handleLogout(); }} className="rounded-md border border-white/20 px-2 py-1 text-xs">{text.logout}</button>
            </div>
          </div>
          {ownedDashboardDecorations.length ? (
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-cyan-300/20 bg-slate-900/35 px-3 py-2">
              {ownedDashboardDecorations.map((item) => (
                <span key={`orn-${item.id}`} className="text-xl dashboard-ornament" title={item.name}>{item.image}</span>
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className={`rounded-xl border p-4 ${themeClass}`}><p className="text-xs">Điểm trung bình</p><p className="text-2xl font-bold">{avgScore}%</p></div>
            <div className={`rounded-xl border p-4 ${themeClass}`}><p className="text-xs">Số ngày đăng nhập</p><p className="text-2xl font-bold">{me?.totalLoginDays ?? 0}</p></div>
            <div className={`rounded-xl border p-4 ${themeClass}`}><p className="text-xs">Chuỗi hiện tại</p><p className="text-2xl font-bold text-emerald-300">{me?.loginStreak ?? 0} ngày</p></div>
            <div className={`rounded-xl border p-4 ${themeClass}`}><p className="text-xs">Khoá PromptMaster đã xong</p><p className="text-2xl font-bold text-cyan-300">{completedCourses}</p></div>
            <div className={`rounded-xl border p-4 ${themeClass}`}><p className="text-xs">Lượt Arena / Auditor</p><p className="text-xl font-bold text-violet-300">{arenaAttempts} / {auditorAttempts}</p></div>
            <div className={`rounded-xl border p-4 ${themeClass}`}><p className="text-xs">Bài cộng đồng</p><p className="text-2xl font-bold text-amber-300">{communityPosts}</p></div>
            <div className={`rounded-xl border p-4 ${themeClass}`}><p className="text-xs">Endless Coin</p><p className="text-2xl font-bold text-yellow-300">{me?.coins ?? 0}</p></div>
          </div>

          {activeTab === "dashboard" && (
            <DashboardTab>
              <div className={panelClass}>
              <h2 className="text-xl font-semibold text-cyan-200">Dashboard năng lực AI</h2>
              {ownedDashboardDecorations.length ? <div className="mt-2 flex flex-wrap gap-2">{ownedDashboardDecorations.map((item) => <span key={item.id} className="rounded-full border border-cyan-300/30 bg-slate-900/70 px-2 py-1 text-xs" title={item.name}><span className="text-base dashboard-ornament">{item.image}</span></span>)}</div> : null}
              <p className="mt-2 text-sm text-slate-300">Learning by Doing & Winning - học qua nhiệm vụ thật và dữ liệu thật.</p>
              <div className="mt-3 rounded-lg border border-cyan-300/20 bg-slate-900/60 p-3 text-xs text-cyan-100">
                <p className="font-semibold">{text.contactTitle}</p>
                <p className="mt-1">{text.contactPhone}</p>
                <p>{text.contactEmail}</p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-slate-800/70 p-3 text-sm">
                  <p className="font-semibold text-cyan-200">Hiệu suất Arena</p>
                  <p className="mt-1">Top hiện tại: {topArena ? `${topArena.userName} (${topArena.efficiency})` : "Chưa có dữ liệu"}</p>
                  <p className="mt-1">Xếp hạng của bạn: {myArenaRank > 0 ? `#${myArenaRank}` : "Chưa có"}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-800/70 p-3 text-sm">
                  <p className="font-semibold text-cyan-200">Hoạt động gần đây</p>
                  <p className="mt-1">Tổng lượt nộp bài: {histories.length}</p>
                  <p className="mt-1">Bài mới nhất: {histories[0] ? `${histories[0].title} (${histories[0].score}%)` : "Chưa có"}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-4">
                <h3 className="text-lg font-semibold text-emerald-200">{text.shopTitle}</h3>
                <p className="mt-1 text-xs text-slate-300">{text.shopDesc}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {config?.shopItems.map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/10 bg-slate-900/70 p-3 text-sm">
                      <p className="text-xl">{item.image}</p>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-slate-300">{item.effect}</p>
                      <p className="mt-1 text-xs text-amber-300">{item.price} Coin</p>
                      {item.category === "name-style" && (me?.ownedItemIds ?? []).includes(item.id) ? (
                        <button
                          onClick={() => void applyNameStyle(item)}
                          disabled={gameActionLoading}
                          className="mt-2 rounded-lg border border-cyan-300/40 px-3 py-1 text-xs text-cyan-200 disabled:opacity-50"
                        >
                          {me?.activeNameStyle === item.nameStyleKey ? `✅ Đang dùng ${item.name}` : `Sử dụng ${item.name}`}
                        </button>
                      ) : (
                        <button onClick={() => void buyItem(item.id)} disabled={gameActionLoading} className="mt-2 rounded-lg border border-amber-300/40 px-3 py-1 text-xs text-amber-200 disabled:opacity-50">{text.buy}</button>
                      )}
                    </div>
                  ))}
                </div>
                {shopMsg ? <p className="mt-2 text-xs text-amber-200">{shopMsg}</p> : null}
              </div>

              <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-4">
                <h3 className="text-lg font-semibold text-cyan-200">{text.ownedTitle}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ownedDecorations.length ? ownedDecorations.map((item) => (
                    <span key={item.id} className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-slate-900/70 px-3 py-1 text-xs">
                      <span>{item.image} {item.name}</span>
                      <button
                        onClick={async () => {
                          const data = await runGameAction({ action: "sell_item", itemId: item.id });
                          const refund = (data as { refund?: number }).refund ?? 0;
                          setShopMsg(`Đã bán ${item.name} và nhận lại ${refund} coin.`);
                        }}
                        className="rounded border border-rose-300/40 px-1 text-rose-300"
                        title={text.sell}
                      >
                        ×
                      </button>
                    </span>
                  )) : <p className="text-xs text-slate-300">{text.noItems}</p>}
                </div>
                {ownedDashboardDecorations.length ? (
                  <p className="mt-3 text-xs text-cyan-200">Dashboard decor: {ownedDashboardDecorations.map((item)=>`${item.image} ${item.name}`).join(" • ")}</p>
                ) : null}
                {ownedGardenDecorations.length ? (
                  <p className="mt-3 text-xs text-emerald-200">{text.gardenOwned}: {ownedGardenDecorations.map((item)=>`${item.image} ${item.name}`).join(" • ")}</p>
                ) : null}
                {ownedThemes.length ? (
                  <div className="mt-3">
                    <p className="mb-2 text-xs text-cyan-200">Nút chọn sơn đã sở hữu: {ownedThemeLabels.join(" • ")}</p>
                    <div className="flex flex-wrap gap-2">
                      {ownedThemes.map((theme) => {
                        const themeKey = theme.themeKey ?? "";
                        const themeLabel = THEME_LABELS[themeKey] ?? theme.name;
                        const paintLabel = theme.name?.trim().startsWith("Sơn") ? theme.name : `Sơn ${themeLabel}`;
                        const activeButtonClass = themeKey === "pink"
                          ? "border-pink-300/70 bg-pink-500/20 text-pink-100"
                          : themeKey === "ocean"
                            ? "border-cyan-300/70 bg-cyan-500/20 text-cyan-100"
                            : themeKey === "violet"
                              ? "border-violet-300/70 bg-violet-500/20 text-violet-100"
                              : themeKey === "sunset"
                                ? "border-orange-300/70 bg-orange-500/20 text-orange-100"
                                : themeKey === "aurora"
                                  ? "border-sky-300/70 bg-sky-500/20 text-sky-100"
                                  : "border-emerald-300/70 bg-emerald-500/20 text-emerald-100";
                        const idleButtonClass = themeKey === "pink"
                          ? "border-pink-300/40 text-pink-100"
                          : themeKey === "ocean"
                            ? "border-cyan-300/40 text-cyan-100"
                            : themeKey === "violet"
                              ? "border-violet-300/40 text-violet-100"
                              : themeKey === "sunset"
                                ? "border-orange-300/40 text-orange-100"
                                : themeKey === "aurora"
                                  ? "border-sky-300/40 text-sky-100"
                                  : "border-emerald-300/40 text-emerald-100";

                        return (
                          <button
                            key={theme.id}
                            onClick={async () => {
                              const nextTheme = theme.themeKey ?? null;
                              setMe((prev) => (prev ? { ...prev, activeDashboardTheme: nextTheme } : prev));
                              try {
                                await runGameAction({ action: "set_dashboard_theme", themeKey: theme.themeKey });
                                setShopMsg(`Đã áp dụng ${paintLabel}.`);
                              } catch (error) {
                                await loadMe();
                                setShopMsg(error instanceof Error ? error.message : "Không áp dụng được chủ đề.");
                              }
                            }}
                            className={`rounded-lg border px-3 py-1 text-xs ${activeTheme === theme.themeKey ? activeButtonClass : idleButtonClass}`}
                          >
                            {activeTheme === theme.themeKey ? `✅ Đang dùng ${paintLabel}` : `${text.useTheme} ${paintLabel}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {ownedNameStyles.length ? (
                  <div className="mt-3">
                    <p className="mb-2 text-xs text-cyan-200">Nút chọn hiệu ứng tên:</p>
                    <div className="flex flex-wrap gap-2">
                      {ownedNameStyles.map((styleItem) => {
                        const styleKey = styleItem.nameStyleKey ?? "";
                        const activeButtonClass = styleKey === "rainbow"
                          ? "border-pink-300/70 bg-pink-500/20 text-pink-100"
                          : styleKey === "fire"
                            ? "border-orange-300/70 bg-orange-500/20 text-orange-100"
                            : "border-cyan-300/70 bg-cyan-500/20 text-cyan-100";
                        const idleButtonClass = styleKey === "rainbow"
                          ? "border-pink-300/40 text-pink-100"
                          : styleKey === "fire"
                            ? "border-orange-300/40 text-orange-100"
                            : "border-cyan-300/40 text-cyan-100";

                        return (
                          <button
                            key={styleItem.id}
                            onClick={() => void applyNameStyle(styleItem)}
                            className={`rounded-lg border px-3 py-1 text-xs ${me?.activeNameStyle === styleItem.nameStyleKey ? activeButtonClass : idleButtonClass}`}
                          >
                            {me?.activeNameStyle === styleItem.nameStyleKey ? `✅ Đang dùng ${styleItem.name}` : `${text.useTheme} ${styleItem.name}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              </div>
            </DashboardTab>
          )}

          {activeTab === "promptmaster" && config && (
            <PromptMasterTab>
              <div className={panelClass}>
              <h2 className="text-xl font-semibold text-cyan-200">Prompt Master - Nhiều khóa học</h2>
              {ownedDashboardDecorations.length ? <div className="mt-2 flex flex-wrap gap-2">{ownedDashboardDecorations.map((item) => <span key={item.id} className="rounded-full border border-cyan-300/30 bg-slate-900/70 px-2 py-1 text-xs" title={item.name}><span className="text-base dashboard-ornament">{item.image}</span></span>)}</div> : null}
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {config.promptMasterLessons.map((lesson) => (
                  <div key={lesson.id} className={`relative rounded-lg border p-3 ${selectedLesson?.id===lesson.id?'border-cyan-300 bg-cyan-500/10':'border-white/10 bg-slate-800/70'}`}>
                    {me?.isAdmin ? (
                      <button
                        onClick={() => openLessonEditor(lesson)}
                        className="absolute right-2 top-2 rounded-full border border-white/30 px-2 text-xs text-slate-200"
                        title="Tùy chọn"
                      >
                        ...
                      </button>
                    ) : null}
                    <button onClick={() => setSelectedLessonId(lesson.id)} className="w-full text-left">
                      <p className="font-semibold">{lesson.title}</p>
                      <p className="text-xs text-slate-300">{lesson.topic}</p>
                      {(lesson.price ?? 0) > 0 ? <p className="mt-1 text-xs text-amber-300">Giá: {lesson.price} Endless Coin</p> : null}
                    </button>
                    {unlockable(lesson) ? (
                      <button onClick={() => void buyLesson(lesson.id)} disabled={gameActionLoading} className="mt-3 rounded-lg border border-amber-300/40 px-3 py-2 text-xs text-amber-200 disabled:opacity-50">
                        {(lesson.price ?? 0)} Coin
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          playUiSound(620);
                          openLearningModal(lesson.id);
                        }}
                        className="mt-3 rounded-lg border border-cyan-300/40 px-3 py-2 text-xs text-cyan-200"
                      >
                        {text.learn}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {promptMasterMsg ? <p className="mt-2 text-xs text-amber-200">{promptMasterMsg}</p> : null}
              {lessonMenuId && lessonEditDraft ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
                  <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/15 bg-slate-950/95 p-3 text-xs">
                  <p className="font-semibold text-cyan-200">Chỉnh sửa khóa học (admin)</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <input value={lessonEditDraft.title} onChange={(e)=>setLessonEditDraft({ ...lessonEditDraft, title: e.target.value })} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Tên khóa"/>
                    <input value={lessonEditDraft.topic} onChange={(e)=>setLessonEditDraft({ ...lessonEditDraft, topic: e.target.value })} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Chủ đề"/>
                    <input value={lessonEditDraft.situation} onChange={(e)=>setLessonEditDraft({ ...lessonEditDraft, situation: e.target.value })} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Thực trạng"/>
                    <input value={lessonEditDraft.overview} onChange={(e)=>setLessonEditDraft({ ...lessonEditDraft, overview: e.target.value })} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Tóm tắt"/>
                    <input value={lessonEditDraft.methodGuide} onChange={(e)=>setLessonEditDraft({ ...lessonEditDraft, methodGuide: e.target.value })} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Phương pháp"/>
                    <input value={lessonEditDraft.practiceChallenge} onChange={(e)=>setLessonEditDraft({ ...lessonEditDraft, practiceChallenge: e.target.value })} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Bài thực hành"/>
                    <input value={lessonEditDraft.samplePrompt} onChange={(e)=>setLessonEditDraft({ ...lessonEditDraft, samplePrompt: e.target.value })} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Prompt mẫu"/>
                    <input type="number" value={lessonEditDraft.price ?? 0} onChange={(e)=>setLessonEditDraft({ ...lessonEditDraft, price: Number(e.target.value) })} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Giá coin"/>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={saveLessonEditor} className="rounded-lg border border-cyan-300/40 px-3 py-2 text-cyan-200">Lưu</button>
                    <button onClick={async ()=>{ if (!window.confirm("Bạn chắc chưa? Xóa bài học này sẽ không thể hoàn tác.")) return; await patchConfig({ deleteLessonId: lessonMenuId }); setLessonMenuId(""); setLessonEditDraft(null); setPromptMasterMsg("Đã xóa bài học."); }} className="rounded-lg border border-rose-300/40 px-3 py-2 text-rose-300">Xóa</button>
                    <button onClick={()=>{ setLessonMenuId(""); setLessonEditDraft(null); }} className="rounded-lg border border-white/20 px-3 py-2">Đóng</button>
                  </div>
                  </div>
                </div>
              ) : null}
              <div className="mt-4 rounded-lg border border-white/10 bg-slate-900/60 p-3">
                <p className="text-sm font-semibold text-cyan-200">Tạo khoá học cộng đồng (phí {config.createCourseFee} coin)</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <input value={courseCreateTitle} onChange={(e)=>setCourseCreateTitle(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Tên khóa"/>
                  <input value={courseCreateTopic} onChange={(e)=>setCourseCreateTopic(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Chủ đề"/>
                  <input value={courseCreateSituation} onChange={(e)=>setCourseCreateSituation(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Thực trạng"/>
                  <input value={courseCreateOverview} onChange={(e)=>setCourseCreateOverview(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Tóm tắt"/>
                  <input value={courseCreateMethod} onChange={(e)=>setCourseCreateMethod(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Phương pháp"/>
                  <input value={courseCreatePractice} onChange={(e)=>setCourseCreatePractice(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Bài thực hành"/>
                  <input value={courseCreateSample} onChange={(e)=>setCourseCreateSample(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Prompt mẫu"/>
                </div>
                <button onClick={createCommunityCourse} className="mt-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-sm text-cyan-200">Gửi admin duyệt</button>
              </div>

              {showLearningModal && selectedLesson && isLearningSelectedLesson ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
                  <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-cyan-300/30 bg-slate-900 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-cyan-200">Học: {selectedLesson.title}</p>
                      <button onClick={() => setShowLearningModal(false)} className="rounded-lg border border-white/20 px-2 py-1 text-xs">{text.close}</button>
                    </div>
                    <>
                      <p className="text-xs text-slate-400">{text.progress}: {text.step} {lessonStep}/3</p>

                      {lessonStep === 1 && (
                        <div className="mt-2">
                          <p className="text-sm font-semibold text-cyan-200">{text.step1Title}</p>
                          <p className="mt-1 text-sm text-slate-200">{selectedLesson.situation}</p>
                          <p className="mt-2 text-sm text-slate-300">{selectedLesson.overview}</p>
                          <textarea
                            value={step1Reflection}
                            onChange={(e)=>setStep1Reflection(e.target.value)}
                            className="mt-3 h-20 w-full rounded-lg border border-white/15 bg-slate-900 p-2"
                            placeholder="Viết tóm tắt điều bạn hiểu từ bối cảnh (>= 20 ký tự)..."
                          />
                          <button
                            onClick={() => {
                              playUiSound(670);
                              setLessonStep(2);
                            }}
                            disabled={step1Reflection.trim().length < 20}
                            className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
                          >
                            {text.continueStep2}
                          </button>
                        </div>
                      )}

                      {lessonStep === 2 && (
                        <div className="mt-2">
                          <p className="text-sm font-semibold text-cyan-200">{text.step2Title}</p>
                          <p className="mt-1 text-sm text-slate-300">{selectedLesson.methodGuide}</p>
                          <p className="mt-1 text-xs text-slate-400">(Mục này tập trung cách viết prompt AI để tạo prompt chất lượng)</p>
                          <textarea
                            value={step2DraftPrompt}
                            onChange={(e)=>setStep2DraftPrompt(e.target.value)}
                            className="mt-3 h-24 w-full rounded-lg border border-white/15 bg-slate-900 p-2"
                            placeholder="Viết prompt nháp dựa trên phương pháp (>= 30 ký tự)..."
                          />
                          <button
                            onClick={() => {
                              playUiSound(700);
                              if (!masterPrompt.trim()) setMasterPrompt(step2DraftPrompt);
                              setLessonStep(3);
                            }}
                            disabled={step2DraftPrompt.trim().length < 30}
                            className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
                          >
                            {text.continueStep3}
                          </button>
                        </div>
                      )}

                      {lessonStep === 3 && (
                        <div className="mt-2">
                          <p className="text-sm font-semibold text-cyan-200">{text.step3Title}</p>
                          <p className="text-sm text-slate-200">Đề bài: {selectedLesson.practiceChallenge}</p>
                          <p className="mt-2 text-xs text-slate-300">Prompt tham khảo: {selectedLesson.samplePrompt}</p>
                          <textarea value={masterPrompt} onChange={(e)=>setMasterPrompt(e.target.value)} className="mt-3 h-24 w-full rounded-lg border border-white/15 bg-slate-900 p-2" placeholder="Viết prompt của bạn..."/>
                          <button onClick={() => { playUiSound(760); void submitPromptMaster(); }} disabled={masterLoading || !masterPrompt.trim()} className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{masterLoading ? text.evaluating : text.gradePromptMaster}</button>
                          {masterResult ? <p className="mt-2 whitespace-pre-line text-sm text-slate-200">{masterResult}</p> : null}
                        </div>
                      )}
                    </>
                  </div>
                </div>
              ) : null}
              </div>
            </PromptMasterTab>
          )}

          {activeTab === "arena" && config && (
            <ArenaTab>
              <div className={panelClass}>
              <h2 className="text-xl font-semibold text-cyan-200">Clean Prompt Arena - Chủ đề tuần</h2>
              {ownedDashboardDecorations.length ? <div className="mt-2 flex flex-wrap gap-2">{ownedDashboardDecorations.map((item) => <span key={item.id} className="rounded-full border border-cyan-300/30 bg-slate-900/70 px-2 py-1 text-xs" title={item.name}><span className="text-base dashboard-ornament">{item.image}</span></span>)}</div> : null}
              <p className="mt-2 text-sm text-slate-300">{config.arenaWeekly.weekLabel}: {config.arenaWeekly.title}</p>
              <p className="mt-2 rounded-lg border border-white/10 bg-slate-800/70 p-3 text-sm">Input: {config.arenaWeekly.inputText}</p>
              <textarea value={arenaPrompt} onChange={(e)=>setArenaPrompt(e.target.value)} className="mt-3 h-20 w-full rounded-lg border border-white/15 bg-slate-900 p-2" placeholder="Prompt của bạn"/>
              {alreadySubmittedArena ? <p className="mt-2 text-xs text-amber-300">Bạn đã nộp đề tuần này, mỗi người chỉ được trả lời 1 lần.</p> : null}
              <button onClick={() => { playUiSound(740); void submitArena(); }} disabled={arenaLoading || alreadySubmittedArena || !arenaPrompt.trim()} className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{arenaLoading ? "AI đang chấm..." : "Nộp Arena"}</button>
              {arenaResult ? <p className="mt-2 whitespace-pre-line text-sm">{arenaResult}</p> : null}

              <div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-500/10 p-3">
                <p className="text-sm font-semibold text-amber-200">Thưởng Arena theo tuần ({config.arenaWeekly.weekLabel})</p>
                <p className="mt-1 text-xs text-slate-300">Top 1-5 sẽ nhận thưởng Endless Coin khi admin chốt bảng xếp hạng tuần.</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {(config.arenaWeeklyRewards ?? []).map((reward) => (
                    <div key={reward.rank} className="rounded-lg border border-amber-300/30 bg-slate-900/70 p-2 text-center text-xs">
                      <p className="font-semibold text-amber-200">Top {reward.rank}</p>
                      <p className="text-yellow-300">+{reward.coins} coin</p>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="mt-5 text-lg font-semibold text-cyan-200">Leaderboard Accuracy / Tokens</h3>
              <div className="mt-2 space-y-2">
                {leaderboard.map((item, idx) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-slate-800/70 p-3 text-sm">
                    #{idx + 1} {item.userName} - Accuracy {item.accuracy}% | Tokens {item.tokens} | Efficiency {item.efficiency}
                  </div>
                ))}
              </div>
              </div>
            </ArenaTab>
          )}

          {activeTab === "auditor" && config && (
            <AuditorTab>
              <div className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-cyan-200">AI Auditor</h2>
                {ownedDashboardDecorations.length ? <div className="mt-2 flex flex-wrap gap-2">{ownedDashboardDecorations.map((item) => <span key={item.id} className="rounded-full border border-cyan-300/30 bg-slate-900/70 px-2 py-1 text-xs" title={item.name}><span className="text-base dashboard-ornament">{item.image}</span></span>)}</div> : null}
                <button onClick={randomizeAuditorScenario} disabled={auditorLoading} className="rounded-lg border border-cyan-300/50 px-3 py-2 text-sm text-cyan-200 disabled:opacity-50">{text.refreshAuditor}</button>
              </div>
              <p className="mt-2 text-sm text-cyan-100">Đề hiện tại: {(activeAuditorScenario ?? config.auditorScenario).title}</p>
              <p className="mt-2 text-sm text-slate-300">Câu trả lời AI sai: {(activeAuditorScenario ?? config.auditorScenario).wrongAnswer}</p>
              <p className="mt-1 text-xs text-slate-400">Nhiệm vụ: nêu lỗi và viết prompt sửa để AI ra đúng.</p>
              <textarea value={auditorIssues} onChange={(e)=>setAuditorIssues(e.target.value)} className="mt-3 h-24 w-full rounded-lg border border-white/15 bg-slate-900 p-2" placeholder="Nêu các lỗi bạn phát hiện..."/>
              <textarea value={auditorRePrompt} onChange={(e)=>setAuditorRePrompt(e.target.value)} className="mt-2 h-24 w-full rounded-lg border border-white/15 bg-slate-900 p-2" placeholder="Prompt sửa lại để AI trả lời đúng..."/>
              <button onClick={() => { playUiSound(760); void submitAuditor(); }} disabled={auditorLoading || !auditorRePrompt.trim()} className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{auditorLoading ? "AI đang chấm..." : "Chấm điểm Auditor"}</button>
              {auditorResult ? <p className="mt-2 whitespace-pre-line text-sm">{auditorResult}</p> : null}
              </div>
            </AuditorTab>
          )}


          {activeTab === "garden" && (
            <GardenTab>
              <div className={panelClass}>
              <h2 className="text-xl font-semibold text-emerald-200">Trồng cây</h2>
              {ownedDashboardDecorations.length ? <div className="mt-2 flex flex-wrap gap-2">{ownedDashboardDecorations.map((item) => <span key={item.id} className="rounded-full border border-cyan-300/30 bg-slate-900/70 px-2 py-1 text-xs" title={item.name}><span className="text-base dashboard-ornament">{item.image}</span></span>)}</div> : null}
              <p className="mt-1 text-sm text-slate-300">Mảnh đất của bạn dùng Endless Coin để mua hạt giống, gieo, tưới và thu hoạch.</p>

              <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm">🌾 Mảnh đất: {me?.farmPlot?.seedType ? `Đang trồng (${me.farmPlot.seedType})` : "Trống"}</p>
                <p className="text-xs text-slate-400">Sẵn sàng thu hoạch: {me?.farmPlot?.readyAt ? (remainSec <= 0 ? "Đã sẵn sàng thu hoạch" : `${new Date(me.farmPlot.readyAt).toLocaleTimeString("vi-VN")} (${remainSec}s)`) : "-"}</p>
                <div className="mt-2">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full bg-emerald-400 transition-all" style={{ width: `${me?.farmPlot?.seedType ? Math.min(100, Math.max(0, 100 - Math.floor((remainSec / ((SEED_OPTIONS.find((seed) => seed.id === me?.farmPlot?.seedType)?.growHours ?? 1) * 3600)) * 100))) : 0}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-300">Tiến trình: {me?.farmPlot?.seedType ? `${Math.min(100, Math.max(0, 100 - Math.floor((remainSec / ((SEED_OPTIONS.find((seed) => seed.id === me?.farmPlot?.seedType)?.growHours ?? 1) * 3600)) * 100)))}%` : "0%"}</p>
                </div>
                <div className="mt-2 text-4xl">{remainSec <= 0 && me?.farmPlot?.seedType ? "🌸" : me?.farmPlot?.seedType ? "🌱" : "🪴"}</div>
                <div className="mt-2 rounded-lg border border-emerald-300/20 bg-emerald-900/20 p-2 text-xs text-emerald-200">
                  <div className="flex flex-wrap gap-2">
                    {ownedGardenDecorations.length ? ownedGardenDecorations.map((item) => <span key={item.id} className="rounded-full border border-emerald-300/40 bg-slate-900/60 px-2 py-1 text-base dashboard-ornament" title={item.name}>{item.image}</span>) : <span>(chưa có)</span>}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {SEED_OPTIONS.map((seed) => (
                    <button key={seed.id} onClick={() => setSelectedSeed(seed.id)} className={`rounded-lg border px-3 py-2 text-left text-xs ${selectedSeed === seed.id ? "border-emerald-300/60 bg-emerald-500/20" : "border-white/15 bg-slate-800"}`}>
                      <p className="font-semibold">{seed.name}</p>
                      <p className="text-slate-300">Giá {seed.price} → {seed.reward} coin / {seed.growHours}h</p>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={async ()=>{ try { const picked = SEED_OPTIONS.find((seed)=>seed.id===selectedSeed); await runGameAction({ action: "plant_seed", seedType: selectedSeed }); setGardenMsg(`Đã gieo ${picked?.name ?? "hạt giống"}.`); playUiSound(620);} catch(e){ setGardenMsg(e instanceof Error ? e.message : "Lỗi gieo hạt.");}}} disabled={gameActionLoading} className="rounded-lg border border-emerald-300/40 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50">Gieo hạt đã chọn</button>
                  <button onClick={async ()=>{ try { await runGameAction({ action: "water_plot" }); setGardenMsg("Đã tưới cây, giảm 1 giờ trưởng thành."); playUiSound(650);} catch(e){ setGardenMsg(e instanceof Error ? e.message : "Lỗi tưới cây.");}}} disabled={gameActionLoading} className="rounded-lg border border-cyan-300/40 px-3 py-2 text-xs text-cyan-200 disabled:opacity-50">Tưới cây</button>
                  <button onClick={async ()=>{ try { const data = await runGameAction({ action: "harvest_plot" }); setGardenMsg(`Thu hoạch thành công +${(data as { coinReward?: number }).coinReward ?? 0} coin`); setHarvestFxActive(true); setTimeout(()=>setHarvestFxActive(false), 1400); playUiSound(780);} catch(e){ setGardenMsg(e instanceof Error ? e.message : "Lỗi thu hoạch.");}}} disabled={gameActionLoading} className="rounded-lg border border-amber-300/40 px-3 py-2 text-xs text-amber-200 disabled:opacity-50">Thu hoạch</button>
                  <button onClick={async ()=>{ try { await runGameAction({ action: "abandon_plot" }); setGardenMsg("Đã bỏ cây đang trồng."); } catch(e){ setGardenMsg(e instanceof Error ? e.message : "Không bỏ cây được."); }} } disabled={gameActionLoading} className="rounded-lg border border-rose-300/40 px-3 py-2 text-xs text-rose-200 disabled:opacity-50">Bỏ cây</button>
                </div>
              </div>
              {gardenMsg ? <p className="mt-2 text-xs text-emerald-200">{gardenMsg}</p> : null}
              {harvestFxActive ? <div className="pointer-events-none mt-2 animate-pulse text-center text-2xl">🎉 ✨ 🎆 ✨ 🎉</div> : null}
              </div>
            </GardenTab>
          )}

          {activeTab === "history" && (
            <div className={panelClass}>
              <h2 className="text-xl font-semibold text-cyan-200">Lịch sử cá nhân</h2>
              {ownedDashboardDecorations.length ? <div className="mt-2 flex flex-wrap gap-2">{ownedDashboardDecorations.map((item) => <span key={item.id} className="rounded-full border border-cyan-300/30 bg-slate-900/70 px-2 py-1 text-xs" title={item.name}><span className="text-base dashboard-ornament">{item.image}</span></span>)}</div> : null}
              <div className="mt-3 space-y-2">
                {histories.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-slate-800/70 p-3 text-sm">
                    <div className="flex justify-between"><p>{item.title}</p><p className="font-bold text-emerald-300">{item.score}%</p></div>
                    <p className="text-slate-300">{item.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "community" && (
            <CommunityTab>
              <div className={panelClass}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-cyan-200">Chat cộng đồng</h2>
                {ownedDashboardDecorations.length ? <div className="mt-2 flex flex-wrap gap-2">{ownedDashboardDecorations.map((item) => <span key={item.id} className="rounded-full border border-cyan-300/30 bg-slate-900/70 px-2 py-1 text-xs" title={item.name}><span className="text-base dashboard-ornament">{item.image}</span></span>)}</div> : null}
                <button
                  onClick={refreshCommunity}
                  className="rounded-lg border border-cyan-300/40 px-3 py-2 text-xs text-cyan-200"
                >
                  Làm mới ngay
                </button>
                {me?.isAdmin ? (
                  <button
                    onClick={clearCommunityPosts}
                    disabled={communitySending}
                    className="rounded-lg border border-rose-300/40 px-3 py-2 text-xs text-rose-200 disabled:opacity-50"
                  >
                    Xóa lịch sử chat
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-400">Hiển thị tin nhắn cộng đồng theo danh sách hiện tại. Bấm &quot;Làm mới ngay&quot; để cập nhật.</p>
              <div className="mt-3 grid gap-2 rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 md:grid-cols-3">
                <input type="number" min={1} value={giftCoinAmount} onChange={(e)=>setGiftCoinAmount(Number(e.target.value))} className="rounded-lg border border-white/15 bg-slate-800 p-2 text-sm" placeholder="Tổng coin gửi"/>
                <input type="number" min={1} value={giftReceiverLimit} onChange={(e)=>setGiftReceiverLimit(Number(e.target.value))} className="rounded-lg border border-white/15 bg-slate-800 p-2 text-sm" placeholder="Số người nhận"/>
                <button onClick={sendCoinGift} disabled={communitySending} className="rounded-lg border border-amber-300/50 px-3 py-2 text-xs text-amber-200 disabled:opacity-50">Gửi lì xì coin</button>
              </div>

              <div
                ref={chatContainerRef}
                onScroll={(e) => {
                  const target = e.currentTarget;
                  const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
                  communityStickToBottomRef.current = distanceToBottom < 80;
                }}
                className="mt-3 max-h-[42vh] space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/70 p-3"
              >
                {posts
                  .slice()
                  .reverse()
                  .map((post) => {
                    const mine = post.userName === me?.name;
                    const isHidden = post.status === "hidden";
                    const isDeleted = post.status === "deleted";
                    return (
                      <div key={post.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                            mine
                              ? "bg-cyan-500/20 text-cyan-100"
                              : "border border-white/10 bg-slate-800 text-slate-100"
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                            <span className={mine ? "text-cyan-200" : "text-slate-300"}><span className={getNameStyleClass(post.activeNameStyle)}>{post.userName}</span> <span className="text-[10px] uppercase text-cyan-300/80">({post.userRole ?? "member"})</span></span>
                            <span className="text-slate-400">{formatChatTime(post.createdAt)}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words">{isDeleted ? "[Bài viết đã bị xóa]" : isHidden ? "[Bài viết đã bị ẩn]" : post.content}</p>
                          <p className="mt-1 text-[11px] text-slate-400">Reports: {post.moderation?.reportedCount ?? 0} • Status: {post.status ?? "active"}</p>
                          {post.type === "coin-gift" && post.gift ? (
                            <div className="mt-2 rounded-lg border border-amber-300/30 bg-amber-500/10 p-2 text-xs">
                              <p>Đã nhận: {post.gift.claimedUserIds.length}/{post.gift.maxReceivers} người</p>
                              <button
                                onClick={() => void claimCoinGift(post.id)}
                                disabled={(post.gift.claimedUserIds ?? []).includes(me?.id ?? "") || post.gift.claimedUserIds.length >= post.gift.maxReceivers}
                                className="mt-1 rounded border border-amber-300/40 px-2 py-1 text-amber-200 disabled:opacity-50"
                              >
                                {(post.gift.claimedUserIds ?? []).includes(me?.id ?? "") ? "Đã nhận" : "Nhận coin"}
                              </button>
                            </div>
                          ) : null}
                          {!me?.isAdmin && post.status === "active" ? (
                            <div className="mt-2 rounded-md border border-rose-300/20 p-2">
                              <input
                                value={reportReasonByPost[post.id] ?? ""}
                                onChange={(e) => setReportReasonByPost((prev) => ({ ...prev, [post.id]: e.target.value }))}
                                className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs"
                                placeholder="Lý do report..."
                              />
                              <button onClick={() => void reportPost(post.id)} className="mt-1 rounded border border-rose-300/40 px-2 py-1 text-xs text-rose-200">Report</button>
                            </div>
                          ) : null}
                          {me?.isAdmin ? (
                            <div className="mt-2 flex flex-wrap gap-1 text-xs">
                              <button onClick={() => void moderatePost(post.id, "hidden")} className="rounded border border-amber-300/40 px-2 py-1 text-amber-200">Ẩn</button>
                              <button onClick={() => void moderatePost(post.id, "deleted")} className="rounded border border-rose-300/40 px-2 py-1 text-rose-200">Xóa</button>
                              <button onClick={() => void moderatePost(post.id, "active")} className="rounded border border-emerald-300/40 px-2 py-1 text-emerald-200">Khôi phục</button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                {!posts.length ? <p className="text-center text-xs text-slate-400">Chưa có tin nhắn nào.</p> : null}
                {postNextCursor ? (
                  <div className="pt-2 text-center">
                    <button onClick={() => void loadPosts(postNextCursor, "append")} className="rounded border border-white/20 px-3 py-1 text-xs text-slate-200">Tải thêm tin cũ</button>
                  </div>
                ) : null}
              </div>

              {me?.isAdmin ? (
                <div className="mt-3 rounded-xl border border-amber-300/20 bg-slate-950/70 p-3">
                  <p className="text-sm font-semibold text-amber-200">Hàng chờ report ({postReports.filter((item) => item.status === "pending").length})</p>
                  <div className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs">
                    {postReports.map((report) => (
                      <div key={report.id} className="rounded border border-white/10 p-2">
                        <p className="text-slate-200">#{report.postId.slice(0, 8)} • {report.reporterName}</p>
                        <p className="text-slate-400">{report.reason}</p>
                        <p className="text-slate-500">{report.status}</p>
                        {report.status === "pending" ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            <button onClick={() => void reviewReport(report.id, "resolved", "hidden")} className="rounded border border-amber-300/40 px-2 py-1 text-amber-200">Duyệt + Ẩn</button>
                            <button onClick={() => void reviewReport(report.id, "resolved", "deleted")} className="rounded border border-rose-300/40 px-2 py-1 text-rose-200">Duyệt + Xóa</button>
                            <button onClick={() => void reviewReport(report.id, "rejected")} className="rounded border border-slate-300/40 px-2 py-1 text-slate-200">Bỏ qua</button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {!postReports.length ? <p className="text-slate-500">Chưa có report.</p> : null}
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex gap-2">
                <textarea
                  value={communityInput}
                  onChange={(e) => setCommunityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void postCommunity();
                    }
                  }}
                  className="h-20 flex-1 rounded-lg border border-white/15 bg-slate-800 p-2"
                  placeholder="Nhập tin nhắn cho cộng đồng... (Enter để gửi, Shift+Enter xuống dòng)"
                />
                <button
                  onClick={postCommunity}
                  disabled={communitySending}
                  className="rounded-lg bg-cyan-400 px-3 py-2 font-semibold text-slate-950 disabled:opacity-60"
                >
                  {communitySending ? "Đang gửi..." : "Gửi"}
                </button>
              </div>
              {communityError ? <p className="mt-2 text-xs text-rose-300">{communityError}</p> : null}
              </div>
            </CommunityTab>
          )}

          {activeTab === "admin" && me?.isAdmin && (
            <AdminTab>
              <div className={panelClass}>
              <h2 className="text-xl font-semibold text-amber-200">Admin Control</h2>
              {ownedDashboardDecorations.length ? <div className="mt-2 flex flex-wrap gap-2">{ownedDashboardDecorations.map((item) => <span key={item.id} className="rounded-full border border-cyan-300/30 bg-slate-900/70 px-2 py-1 text-xs" title={item.name}><span className="text-base dashboard-ornament">{item.image}</span></span>)}</div> : null}

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <input value={adminName} onChange={(e)=>setAdminName(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Tên admin"/>
                <input value={adminEmail} onChange={(e)=>setAdminEmail(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Email admin"/>
                <input value={adminPass} onChange={(e)=>setAdminPass(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Password"/>
              </div>
              <button onClick={createAdmin} className="mt-2 rounded-lg bg-amber-300 px-4 py-2 font-semibold text-slate-950">Tạo admin mới</button>

              <h3 className="mt-4 font-semibold text-amber-200">Thêm khóa Prompt Master</h3>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <input value={newLessonTitle} onChange={(e)=>setNewLessonTitle(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Tên khóa"/>
                <input value={newLessonTopic} onChange={(e)=>setNewLessonTopic(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Chủ đề"/>
                <input value={newLessonSituation} onChange={(e)=>setNewLessonSituation(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Thực trạng"/>
                <input value={newLessonOverview} onChange={(e)=>setNewLessonOverview(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Thông tin sơ qua"/>
                <input value={newLessonMethodGuide} onChange={(e)=>setNewLessonMethodGuide(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Phương pháp và cách dạy"/>
                <input value={newLessonPracticeChallenge} onChange={(e)=>setNewLessonPracticeChallenge(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Đề bài thực hành"/>
                <input value={newLessonSamplePrompt} onChange={(e)=>setNewLessonSamplePrompt(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Prompt mẫu"/>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input type="number" value={coursePriceDraft["new"] ?? 0} onChange={(e)=>setCoursePriceDraft((prev)=>({ ...prev, new: Number(e.target.value) }))} className="w-40 rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Giá coin"/>
                <button onClick={addPromptLesson} className="rounded-lg border border-cyan-300/40 px-3 py-2 text-sm text-cyan-200">Thêm khóa Prompt Master</button>
              </div>

              <h3 className="mt-4 font-semibold text-amber-200">Duyệt khóa học người dùng gửi</h3>
              <div className="mt-2 space-y-2">
                {(config?.courseSubmissions ?? []).map((sub) => (
                  <div key={sub.id} className="rounded-lg border border-white/10 bg-slate-900/60 p-3 text-xs">
                    <p className="font-semibold">{sub.title} - {sub.topic}</p>
                    <p className="text-slate-300">Tác giả: {sub.creatorName}</p>
                    <div className="mt-2 flex gap-2">
                      <button onClick={async ()=>{ await patchConfig({ approveSubmissionId: sub.id }); setAdminMsg("Đã duyệt khóa học."); }} className="rounded-md border border-emerald-300/40 px-2 py-1 text-emerald-200">Duyệt</button>
                      <button onClick={async ()=>{ await patchConfig({ rejectSubmissionId: sub.id }); setAdminMsg("Đã từ chối và xóa đề xuất."); }} className="rounded-md border border-rose-300/40 px-2 py-1 text-rose-200">Từ chối</button>
                    </div>
                  </div>
                ))}
                {!(config?.courseSubmissions?.length) ? <p className="text-xs text-slate-400">Không có khóa học chờ duyệt.</p> : null}
              </div>

              <h3 className="mt-4 font-semibold text-amber-200">Shop - thêm vật phẩm bán</h3>
              <p className="mt-1 text-xs text-slate-300">Phần công dụng chọn từ danh sách có sẵn.</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <input value={shopItemName} onChange={(e)=>setShopItemName(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Tên vật phẩm"/>
                <input value={shopItemImage} onChange={(e)=>setShopItemImage(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Emoji/URL hình"/>
                <input type="number" value={shopItemPrice} onChange={(e)=>setShopItemPrice(Number(e.target.value))} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Giá"/>
                <select value={shopItemEffect} onChange={(e)=>setShopItemEffect(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2">
                  <option>Trang trí dashboard</option>
                  <option>Trang trí khu vườn</option>
                  <option>Đổi dashboard sang chủ đề hồng</option>
                  <option>Đổi dashboard sang chủ đề đại dương</option>
                </select>
                <select value={shopItemCategory} onChange={(e)=>setShopItemCategory(e.target.value as "dashboard-theme" | "dashboard-decoration" | "garden-decoration")} className="rounded-lg border border-white/15 bg-slate-800 p-2">
                  <option value="dashboard-decoration">Dashboard decoration</option>
                  <option value="garden-decoration">Garden decoration</option>
                  <option value="dashboard-theme">Dashboard theme</option>
                </select>
                {shopItemCategory === "dashboard-theme" ? (
                  <select value={shopItemThemeKey} onChange={(e)=>setShopItemThemeKey(e.target.value as "pink" | "ocean" | "violet" | "sunset" | "aurora" | "matrix" | "none")} className="rounded-lg border border-white/15 bg-slate-800 p-2">
                    <option value="pink">Hồng</option>
                    <option value="ocean">Đại dương</option>
                    <option value="violet">Tím galaxy</option>
                    <option value="sunset">Hoàng hôn (cam-hồng)</option>
                    <option value="aurora">Cực quang (xanh-tím)</option>
                    <option value="matrix">Matrix (xanh neon)</option>
                    <option value="none">Không chọn</option>
                  </select>
                ) : <div />}
              </div>
              <button onClick={async ()=>{ await patchConfig({ addShopItem: { name: shopItemName, image: shopItemImage, price: shopItemPrice, effect: shopItemEffect, category: shopItemCategory, themeKey: shopItemCategory === "dashboard-theme" ? shopItemThemeKey : null } }); setAdminMsg("Đã thêm vật phẩm shop."); setShopItemName(""); setShopItemImage("🌱"); setShopItemPrice(80); setShopItemEffect("Trang trí dashboard"); setShopItemCategory("dashboard-decoration"); setShopItemThemeKey("none"); }} className="mt-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-sm text-cyan-200">Thêm vật phẩm shop</button>
              <div className="mt-2 space-y-2">
                {(config?.shopItems ?? []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/60 p-2 text-xs">
                    <p>{item.image} {item.name} - {item.price} coin</p>
                    <button
                      onClick={async () => { await patchConfig({ deleteShopItemId: item.id }); setAdminMsg("Đã xóa vật phẩm shop."); }}
                      className="rounded border border-rose-300/40 px-2 py-1 text-rose-300"
                    >
                      {text.adminDeleteItem}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={async ()=>{ await patchConfig({ grantCoins: { amount: 1000 } }); setAdminMsg("Đã cộng +1000 coin."); }} className="rounded-lg bg-amber-300 px-3 py-2 text-sm font-semibold text-slate-950">+1000 coin</button>
              </div>

              <h3 className="mt-4 font-semibold text-amber-200">Thay đổi đề bài Arena tuần</h3>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <input value={newArenaWeek} onChange={(e)=>setNewArenaWeek(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Week label"/>
                <input value={newArenaTitle} onChange={(e)=>setNewArenaTitle(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Tên challenge"/>
                <input value={newArenaInput} onChange={(e)=>setNewArenaInput(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Input text"/>
                <input value={newArenaGolden} onChange={(e)=>setNewArenaGolden(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2 md:col-span-2" placeholder="Golden response"/>
              </div>
              <button onClick={updateArenaWeekly} className="mt-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-sm text-cyan-200">Cập nhật Arena tuần</button>

              {adminMsg ? <p className="mt-3 text-sm">{adminMsg}</p> : null}

              <div className="mt-4 space-y-2">
                {allUsers.map((user) => (
                  <div key={user.id} className="rounded-lg border border-white/10 bg-slate-800/70 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p>{user.name} - {user.email} ({user.role})</p>
                      <button onClick={()=>setSelectedUser(user)} className="rounded-md border border-cyan-300/40 px-2 py-1 text-xs text-cyan-200">{text.viewDetail}</button>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="mt-4 font-semibold text-amber-200">{text.feedbackListTitle}</h3>
              <div className="mt-2 space-y-2">
                {feedbacks.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-slate-900/60 p-3 text-xs">
                    <p className="font-semibold text-cyan-100">{item.userName}</p>
                    <p className="mt-1 whitespace-pre-line text-slate-200">{item.message}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-slate-400">{new Date(item.createdAt).toLocaleString(locale === "en" ? "en-US" : "vi-VN")}</p>
                      <button onClick={() => { void deleteFeedback(item.id); }} className="rounded border border-rose-300/40 px-2 py-1 text-rose-300">{text.deleteFeedback}</button>
                    </div>
                  </div>
                ))}
                {!feedbacks.length ? <p className="text-xs text-slate-400">{text.noFeedback}</p> : null}
              </div>

              {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
                  <div className="w-full max-w-lg rounded-2xl border border-cyan-300/30 bg-slate-900 p-4 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-cyan-200">User Dashboard: {selectedUser.name}</p>
                      <button onClick={() => setSelectedUser(null)} className="rounded-md border border-white/20 px-2 py-1 text-xs">{text.closeModal}</button>
                    </div>
                    <p className="mt-2">Email: {selectedUser.email}</p>
                    <p>Role: {selectedUser.role}</p>
                    <p>History: {selectedUser.stats?.historyCount ?? 0}</p>
                    <p>Community posts: {selectedUser.stats?.postCount ?? 0}</p>
                    <p>Login streak: {selectedUser.loginStreak ?? 0}</p>
                    <p>Total login days: {selectedUser.totalLoginDays ?? 0}</p>
                    <p>Last session: {selectedUser.stats?.lastSessionAt ? new Date(selectedUser.stats.lastSessionAt).toLocaleString(locale === "en" ? "en-US" : "vi-VN") : "-"}</p>
                    {me?.isAdmin ? (
                      <button onClick={() => { void deleteUser(selectedUser.id); }} className="mt-3 rounded-md border border-rose-300/40 px-3 py-2 text-rose-300">{text.deleteAccount}</button>
                    ) : null}
                  </div>
                </div>
              )}
              </div>
            </AdminTab>
          )}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-300/20 bg-slate-950/95 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1">
          {mobileBottomTabs.map((key) => (
            <button
              key={`mobile-${key}`}
              onClick={() => {
                playUiSound(480);
                setActiveTab(key);
              }}
              className={`min-w-[88px] flex-1 rounded-lg px-2 py-2 text-[11px] font-medium ${activeTab === key ? "border border-cyan-300/50 bg-cyan-500/20 text-cyan-100" : "border border-white/10 bg-slate-900/70 text-slate-300"}`}
            >
              {TAB_LABELS[locale][key]}
            </button>
          ))}
        </div>
      </nav>

      {showFeedbackModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-300/30 bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-cyan-200">{text.feedback}</p>
              <button onClick={() => setShowFeedbackModal(false)} className="rounded-md border border-white/20 px-2 py-1 text-xs">{text.closeModal}</button>
            </div>
            <textarea
              value={feedbackInput}
              onChange={(e) => setFeedbackInput(e.target.value)}
              className="mt-3 h-28 w-full rounded-lg border border-white/15 bg-slate-800 p-2"
              placeholder={text.feedbackPlaceholder}
            />
            {feedbackMsg ? <p className="mt-2 text-xs text-cyan-200">{feedbackMsg}</p> : null}
            <button onClick={() => { void submitFeedback(); }} disabled={feedbackSending || !feedbackInput.trim()} className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{feedbackSending ? text.sending : text.send}</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
