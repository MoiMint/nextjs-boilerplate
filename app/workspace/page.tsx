"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  createdAt?: string;
  loginCount?: number;
  totalLoginDays?: number;
  loginStreak?: number;
  lastLoginDate?: string | null;
  stats?: { historyCount: number; postCount: number; lastSessionAt: string | null };
};

type HistoryItem = { id: string; title: string; score: number; feedback: string; createdAt: string };
type Post = { id: string; userName: string; content: string; createdAt: string };
type Tab = "dashboard" | "promptmaster" | "arena" | "auditor" | "history" | "community" | "admin";
type PromptMasterLesson = {
  id: string;
  title: string;
  topic: string;
  situation: string;
  overview: string;
  methodGuide: string;
  practiceChallenge: string;
  samplePrompt: string;
};

type ArenaWeekly = {
  weekLabel: string;
  title: string;
  inputText: string;
  goldenResponse: string;
};

type AuditorScenario = {
  title: string;
  wrongAnswer: string;
  requiredIssues: string[];
};

type AppConfig = {
  promptMasterLessons: PromptMasterLesson[];
  arenaWeekly: ArenaWeekly;
  auditorScenario: AuditorScenario;
  auditorScenarios?: AuditorScenario[];
};

const SESSION_TOKEN_KEY = "blabla-session-token";

export default function WorkspacePage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(false);

  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);

  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [masterPrompt, setMasterPrompt] = useState("");
  const [masterOutput, setMasterOutput] = useState("");
  const [masterResult, setMasterResult] = useState<string>("");

  const [arenaPrompt, setArenaPrompt] = useState("");
  const [arenaOutput, setArenaOutput] = useState("");
  const [arenaResult, setArenaResult] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<
    Array<{ id: string; userName: string; accuracy: number; tokens: number; efficiency: number }>
  >([]);

  const [auditorIssues, setAuditorIssues] = useState("");
  const [auditorRePrompt, setAuditorRePrompt] = useState("");
  const [auditorResult, setAuditorResult] = useState("");
  const [activeAuditorScenario, setActiveAuditorScenario] = useState<AuditorScenario | null>(null);

  const [communityInput, setCommunityInput] = useState("");

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

  const token = typeof window !== "undefined" ? localStorage.getItem(SESSION_TOKEN_KEY) : null;
  const authHeaders = useMemo(
    () => ({ "Content-Type": "application/json", "x-session-token": token ?? "" }),
    [token],
  );

  const selectedLesson = useMemo(
    () => config?.promptMasterLessons.find((l) => l.id === selectedLessonId) ?? config?.promptMasterLessons[0],
    [config, selectedLessonId],
  );

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

  const loadPosts = useCallback(async () => {
    const res = await fetch("/api/posts");
    const data = (await res.json()) as { posts: Post[] };
    setPosts(data.posts);
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users", { headers: { "x-session-token": token ?? "" } });
    if (!res.ok) return;
    const data = (await res.json()) as { users: User[] };
    setAllUsers(data.users);
  }, [token]);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/config");
    if (!res.ok) return;
    const data = (await res.json()) as { config: AppConfig };
    setConfig(data.config);
    if (!selectedLessonId && data.config.promptMasterLessons.length) {
      setSelectedLessonId(data.config.promptMasterLessons[0].id);
    }
    if (!activeAuditorScenario) {
      setActiveAuditorScenario(data.config.auditorScenarios?.[0] ?? data.config.auditorScenario ?? null);
    }
  }, [activeAuditorScenario, selectedLessonId]);

  const loadLeaderboard = useCallback(async () => {
    const res = await fetch("/api/arena/leaderboard");
    if (!res.ok) return;
    const data = (await res.json()) as {
      leaderboard: Array<{ id: string; userName: string; accuracy: number; tokens: number; efficiency: number }>;
    };
    setLeaderboard(data.leaderboard);
  }, []);

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
    }
  }, [me, loadUsers]);

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      void loadPosts();
      void loadLeaderboard();
    }, 3000);

    return () => clearInterval(timer);
  }, [token, loadPosts, loadLeaderboard]);

  const avgScore = histories.length
    ? Math.round(histories.reduce((sum, item) => sum + item.score, 0) / histories.length)
    : 0;

  const completedCourses = new Set(
    histories.filter((item) => item.title.startsWith("Khoá Prompt Master")).map((item) => item.title),
  ).size;

  const submitPromptMaster = async () => {
    if (!selectedLesson) return;
    setLoading(true);

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
- Phương pháp: ${selectedLesson.methodGuide}
- Yêu cầu thực hành: ${selectedLesson.practiceChallenge}

Prompt của học viên:
${masterPrompt}

Phản hồi của reviewer (chỉ biết prompt):
${reviewerFeedback}

Nhiệm vụ: tự kiểm tra phản hồi reviewer đã bám yêu cầu chưa, rồi chấm điểm cuối cùng và góp ý. Trả về JSON {"score": number, "feedback": string}.`;

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
        feedback: `Reviewer: ${reviewerFeedback} | Tổng kết: ${finalFeedback}`,
      }),
    });

    await loadHistories();
    setMasterResult(`Reviewer: ${reviewerFeedback}

Điểm cuối: ${score}% | Tổng kết: ${finalFeedback}`);
    setLoading(false);
  };

  const submitArena = async () => {
    setLoading(true);
    const res = await fetch("/api/arena/submit", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ prompt: arenaPrompt, output: arenaOutput }),
    });
    const data = (await res.json()) as { accuracy?: number; tokens?: number; efficiency?: number; error?: string };

    if (!res.ok) {
      setArenaResult(data.error ?? "Nộp Arena thất bại.");
      setLoading(false);
      return;
    }

    setArenaResult(
      `Accuracy: ${data.accuracy}% | Tokens: ${data.tokens} | Efficiency: ${data.efficiency}`,
    );
    await loadLeaderboard();
    await loadHistories();
    setLoading(false);
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
    setLoading(true);

    const judgePrompt = `
Danh sách lỗi đúng cần tìm: ${scenario.requiredIssues.join(", ")}
Người dùng phát hiện lỗi: ${auditorIssues}
Prompt sửa của người dùng: ${auditorRePrompt}
Hãy chấm theo rubric AI Auditor.`;

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
        feedback,
      }),
    });

    await loadHistories();
    setAuditorResult(`Điểm: ${score}% | Nhận xét: ${feedback}`);
    setLoading(false);
  };

  const postCommunity = async () => {
    if (!communityInput.trim()) return;
    await fetch("/api/posts", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ content: communityInput }),
    });
    setCommunityInput("");
    loadPosts();
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

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8 md:py-8">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <h1 className="text-lg font-bold">{me?.name ?? "Loading..."}</h1>
          <p className="text-sm text-slate-300">{me?.email}</p>
          <p className="mt-1 text-xs text-cyan-300">Chuỗi đăng nhập: {me?.loginStreak ?? 0} ngày</p>

          <div className="mt-5 space-y-2">
            {(["dashboard", "promptmaster", "arena", "auditor", "history", "community", ...(me?.isAdmin ? ["admin"] : [])] as Tab[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-all duration-300 ${
                  activeTab === key ? "bg-cyan-400 text-slate-950" : "bg-white/5"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              localStorage.removeItem(SESSION_TOKEN_KEY);
              router.push("/login");
            }}
            className="mt-6 w-full rounded-lg border border-white/20 px-3 py-2"
          >
            Đăng xuất
          </button>
        </aside>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4 scrollbar-pro max-h-[84vh] overflow-y-auto">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs">Điểm trung bình</p><p className="text-2xl font-bold">{avgScore}%</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs">Số ngày đăng nhập</p><p className="text-2xl font-bold">{me?.totalLoginDays ?? 0}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs">Chuỗi hiện tại</p><p className="text-2xl font-bold text-emerald-300">{me?.loginStreak ?? 0} ngày</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs">Khoá PromptMaster đã xong</p><p className="text-2xl font-bold text-cyan-300">{completedCourses}</p></div>
          </div>

          {activeTab === "dashboard" && (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold text-cyan-200">Dashboard năng lực AI</h2>
              <p className="mt-2 text-sm text-slate-300">Learning by Doing & Winning - học qua nhiệm vụ thật và dữ liệu thật.</p>
            </div>
          )}

          {activeTab === "promptmaster" && config && (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold text-cyan-200">Prompt Master - Nhiều khóa học</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {config.promptMasterLessons.map((lesson) => (
                  <button key={lesson.id} onClick={() => setSelectedLessonId(lesson.id)} className={`rounded-lg border p-3 text-left ${selectedLesson?.id===lesson.id?'border-cyan-300 bg-cyan-500/10':'border-white/10 bg-slate-800/70'}`}>
                    <p className="font-semibold">{lesson.title}</p>
                    <p className="text-xs text-slate-300">{lesson.topic}</p>
                  </button>
                ))}
              </div>

              {selectedLesson && (
                <div className="mt-4 rounded-lg border border-white/10 bg-slate-800/70 p-4">
                  <p className="text-sm font-semibold text-cyan-200">Bước 1 - Thực trạng</p>
                  <p className="text-sm text-slate-200">{selectedLesson.situation}</p>
                  <p className="mt-3 text-sm font-semibold text-cyan-200">Bước 2 - Thông tin sơ qua</p>
                  <p className="text-sm text-slate-300">{selectedLesson.overview}</p>
                  <p className="mt-3 text-sm font-semibold text-cyan-200">Bước 3 - Phương pháp và cách dạy</p>
                  <p className="text-sm text-slate-300">{selectedLesson.methodGuide}</p>
                  <p className="mt-3 text-sm font-semibold text-cyan-200">Bước 4 - Thực hành</p>
                  <p className="text-sm text-slate-200">Đề bài: {selectedLesson.practiceChallenge}</p>
                  <p className="mt-2 text-xs text-slate-300">Prompt tham khảo: {selectedLesson.samplePrompt}</p>
                  <textarea value={masterPrompt} onChange={(e)=>setMasterPrompt(e.target.value)} className="mt-3 h-24 w-full rounded-lg border border-white/15 bg-slate-900 p-2" placeholder="Viết prompt của bạn..."/>
                  <textarea value={masterOutput} onChange={(e)=>setMasterOutput(e.target.value)} className="mt-2 h-20 w-full rounded-lg border border-white/15 bg-slate-900 p-2" placeholder="(Tuỳ chọn) Dán output AI tạo ra..."/>
                  <button onClick={submitPromptMaster} disabled={loading} className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950">{loading?"AI đang chấm...":"Chấm Prompt Master"}</button>
                  {masterResult ? <p className="mt-2 whitespace-pre-line text-sm text-slate-200">{masterResult}</p> : null}
                </div>
              )}
            </div>
          )}

          {activeTab === "arena" && config && (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold text-cyan-200">Clean Prompt Arena - Chủ đề tuần</h2>
              <p className="mt-2 text-sm text-slate-300">{config.arenaWeekly.weekLabel}: {config.arenaWeekly.title}</p>
              <p className="mt-2 rounded-lg border border-white/10 bg-slate-800/70 p-3 text-sm">Input: {config.arenaWeekly.inputText}</p>
              <textarea value={arenaPrompt} onChange={(e)=>setArenaPrompt(e.target.value)} className="mt-3 h-20 w-full rounded-lg border border-white/15 bg-slate-900 p-2" placeholder="Prompt của bạn"/>
              <textarea value={arenaOutput} onChange={(e)=>setArenaOutput(e.target.value)} className="mt-2 h-20 w-full rounded-lg border border-white/15 bg-slate-900 p-2" placeholder="Output AI của bạn"/>
              <button onClick={submitArena} disabled={loading} className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950">Nộp Arena</button>
              {arenaResult ? <p className="mt-2 text-sm">{arenaResult}</p> : null}

              <h3 className="mt-5 text-lg font-semibold text-cyan-200">Leaderboard Accuracy / Tokens</h3>
              <div className="mt-2 space-y-2">
                {leaderboard.map((item, idx) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-slate-800/70 p-3 text-sm">
                    #{idx + 1} {item.userName} - Accuracy {item.accuracy}% | Tokens {item.tokens} | Efficiency {item.efficiency}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "auditor" && config && (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-cyan-200">AI Auditor</h2>
                <button onClick={randomizeAuditorScenario} className="rounded-lg border border-cyan-300/50 px-3 py-2 text-sm text-cyan-200">Làm mới đề ngẫu nhiên</button>
              </div>
              <p className="mt-2 text-sm text-cyan-100">Đề hiện tại: {(activeAuditorScenario ?? config.auditorScenario).title}</p>
              <p className="mt-2 text-sm text-slate-300">Câu trả lời AI sai: {(activeAuditorScenario ?? config.auditorScenario).wrongAnswer}</p>
              <p className="mt-1 text-xs text-slate-400">Nhiệm vụ: nêu lỗi và viết prompt sửa để AI ra đúng.</p>
              <textarea value={auditorIssues} onChange={(e)=>setAuditorIssues(e.target.value)} className="mt-3 h-24 w-full rounded-lg border border-white/15 bg-slate-900 p-2" placeholder="Nêu các lỗi bạn phát hiện..."/>
              <textarea value={auditorRePrompt} onChange={(e)=>setAuditorRePrompt(e.target.value)} className="mt-2 h-24 w-full rounded-lg border border-white/15 bg-slate-900 p-2" placeholder="Prompt sửa lại để AI trả lời đúng..."/>
              <button onClick={submitAuditor} disabled={loading} className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950">Chấm điểm Auditor</button>
              {auditorResult ? <p className="mt-2 text-sm">{auditorResult}</p> : null}
            </div>
          )}

          {activeTab === "history" && (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold text-cyan-200">Lịch sử cá nhân</h2>
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
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold text-cyan-200">Cộng đồng</h2>
              <div className="mt-3 flex gap-2">
                <input value={communityInput} onChange={(e)=>setCommunityInput(e.target.value)} className="flex-1 rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Chia sẻ prompt hay..."/>
                <button onClick={postCommunity} className="rounded-lg bg-cyan-400 px-3 py-2 font-semibold text-slate-950">Đăng</button>
              </div>
              <div className="mt-3 space-y-2">
                {posts.map((post) => (
                  <div key={post.id} className="rounded-lg border border-white/10 bg-slate-800/70 p-3">
                    <p className="text-sm font-semibold text-cyan-200">{post.userName}</p>
                    <p className="text-sm">{post.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "admin" && me?.isAdmin && (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-5">
              <h2 className="text-xl font-semibold text-amber-200">Admin Control</h2>

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
              <button onClick={addPromptLesson} className="mt-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-sm text-cyan-200">Thêm khóa Prompt Master</button>

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
                      <button onClick={()=>setSelectedUser(user)} className="rounded-md border border-cyan-300/40 px-2 py-1 text-xs text-cyan-200">Xem chi tiết</button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedUser && (
                <div className="mt-4 rounded-lg border border-cyan-300/30 bg-slate-900/80 p-4 text-sm">
                  <p className="font-semibold text-cyan-200">User Dashboard: {selectedUser.name}</p>
                  <p>Email: {selectedUser.email}</p>
                  <p>Vai trò: {selectedUser.role}</p>
                  <p>Số bài đã nộp: {selectedUser.stats?.historyCount ?? 0}</p>
                  <p>Số bài cộng đồng: {selectedUser.stats?.postCount ?? 0}</p>
                  <p>Chuỗi đăng nhập: {selectedUser.loginStreak ?? 0} ngày</p>
                  <p>Tổng ngày đăng nhập: {selectedUser.totalLoginDays ?? 0}</p>
                  <p>Lần đăng nhập gần nhất: {selectedUser.stats?.lastSessionAt ? new Date(selectedUser.stats.lastSessionAt).toLocaleString("vi-VN") : "-"}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
