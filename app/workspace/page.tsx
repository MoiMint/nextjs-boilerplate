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
type Tab = "dashboard" | "courses" | "history" | "community" | "admin";
type Pillar = "master" | "arena" | "auditor";

const SESSION_TOKEN_KEY = "blabla-session-token";

const courseCatalog: Array<{
  id: Pillar;
  title: string;
  summary: string;
  steps: Array<{ id: string; title: string; guide: string }>;
}> = [
  {
    id: "master",
    title: "Prompt Master - Sản phẩm hóa kiến thức",
    summary: "Biến brief thực tế thành output chuyên nghiệp (email, kế hoạch, kịch bản).",
    steps: [
      { id: "m1", title: "Phân tích dữ liệu gốc", guide: "Tách mục tiêu, đối tượng, ràng buộc." },
      { id: "m2", title: "Thiết kế Prompt có cấu trúc", guide: "Role -> Goal -> Constraints -> Output format." },
      { id: "m3", title: "Đánh giá output", guide: "Kiểm tra đủ ý, đúng format, văn phong phù hợp." },
    ],
  },
  {
    id: "arena",
    title: "Clean Prompt Arena - Tối ưu hiệu suất",
    summary: "Rèn tư duy viết prompt ngắn gọn, chính xác, tiết kiệm token.",
    steps: [
      { id: "a1", title: "Bài toán trích xuất", guide: "Viết prompt ngắn, chỉ rõ output cần thiết." },
      { id: "a2", title: "Giảm token thừa", guide: "Loại bỏ từ đệm, tránh lặp yêu cầu." },
      { id: "a3", title: "So sánh hiệu suất", guide: "Đo accuracy/tokens để tối ưu chi phí." },
    ],
  },
  {
    id: "auditor",
    title: "AI Auditor & Agent Architect",
    summary: "Phát hiện ảo giác AI và thiết kế agent có guardrails an toàn.",
    steps: [
      { id: "u1", title: "Tìm lỗi sai cố ý", guide: "Đặt prompt bắt AI kiểm chứng theo nguồn." },
      { id: "u2", title: "Thiết kế guardrails", guide: "Đặt điều kiện dừng, escalation cho người thật." },
      { id: "u3", title: "Kiến trúc Agent", guide: "Persona -> Task -> Tools -> Constraints." },
    ],
  },
];

export default function WorkspacePage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(false);

  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [selectedCourse, setSelectedCourse] = useState<Pillar>("master");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [studentPrompt, setStudentPrompt] = useState("");
  const [aiDiscussion, setAiDiscussion] = useState("");
  const [courseResult, setCourseResult] = useState<{ score: number; feedback: string; isPassed: boolean } | null>(null);

  const [communityInput, setCommunityInput] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminMsg, setAdminMsg] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem(SESSION_TOKEN_KEY) : null;
  const authHeaders = useMemo(
    () => ({ "Content-Type": "application/json", "x-session-token": token ?? "" }),
    [token],
  );

  const activeCourse = useMemo(
    () => courseCatalog.find((course) => course.id === selectedCourse) ?? courseCatalog[0],
    [selectedCourse],
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

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadMe();
    loadHistories();
    loadPosts();
  }, [router, token, loadMe, loadHistories, loadPosts]);

  useEffect(() => {
    if (me?.isAdmin) {
      loadUsers();
    }
  }, [me, loadUsers]);

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      void loadPosts();
    }, 3000);

    return () => clearInterval(timer);
  }, [token, loadPosts]);

  const avgScore = histories.length
    ? Math.round(histories.reduce((sum, item) => sum + item.score, 0) / histories.length)
    : 0;

  const completedCourses = new Set(
    histories
      .filter((item) => item.title.startsWith("Khoá học:"))
      .map((item) => item.title.replace("Khoá học: ", "").toLowerCase()),
  ).size;

  const resetCourseFlow = (course: Pillar) => {
    setSelectedCourse(course);
    setCurrentStepIndex(0);
    setStudentPrompt("");
    setAiDiscussion("");
    setCourseResult(null);
  };

  const askAiInStep = async () => {
    if (!studentPrompt.trim()) return;
    setLoading(true);
    const step = activeCourse.steps[currentStepIndex];
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        context: `${activeCourse.title} | Bước ${currentStepIndex + 1}: ${step.title}`,
        prompt: `Người học hỏi: ${studentPrompt}\nHãy hướng dẫn ngắn gọn cách làm đúng và cảnh báo lỗi thường gặp.`,
      }),
    });

    const data = (await response.json()) as { feedback?: string; error?: string };
    setAiDiscussion(response.ok ? data.feedback ?? "AI không phản hồi." : data.error ?? "AI tạm thời lỗi.");
    setLoading(false);
  };

  const completeCurrentStep = () => {
    if (currentStepIndex < activeCourse.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setStudentPrompt("");
      setAiDiscussion("");
      return;
    }

    void finishCourse();
  };

  const finishCourse = async () => {
    setLoading(true);
    const summaryPrompt = `Hãy đánh giá kết quả học viên cho khoá ${activeCourse.title}.\nCác bước đã hoàn thành: ${activeCourse.steps.map((s) => s.title).join(", ")}\nDựa trên mức độ hoàn thành, trả feedback ngắn gọn, khắt khe và điểm số.`;

    const aiRes = await fetch("/api/ai", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ context: `Course Final Review - ${activeCourse.id}`, prompt: summaryPrompt }),
    });

    const aiData = (await aiRes.json()) as { score?: number; feedback?: string; error?: string };
    const finalScore = aiRes.ok ? aiData.score ?? 75 : 65;
    const finalFeedback = aiRes.ok
      ? aiData.feedback ?? "Bạn đã hoàn thành khoá học."
      : aiData.error ?? "Không gọi được AI evaluator.";

    const final = {
      score: finalScore,
      feedback: finalFeedback,
      isPassed: finalScore >= 70,
    };
    setCourseResult(final);

    await fetch("/api/history", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        type: activeCourse.id,
        title: `Khoá học: ${activeCourse.title}`,
        score: final.score,
        feedback: final.feedback,
      }),
    });

    await loadHistories();
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

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8 md:py-8">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <h1 className="text-lg font-bold">{me?.name ?? "Loading..."}</h1>
          <p className="text-sm text-slate-300">{me?.email}</p>
          <p className="mt-1 text-xs text-cyan-300">Chuỗi đăng nhập: {me?.loginStreak ?? 0} ngày</p>

          <div className="mt-5 space-y-2">
            {(["dashboard", "courses", "history", "community", ...(me?.isAdmin ? ["admin"] : [])] as Tab[]).map(
              (key) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-all duration-300 ${
                    activeTab === key ? "bg-cyan-400 text-slate-950" : "bg-white/5"
                  }`}
                >
                  {key}
                </button>
              ),
            )}
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
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs">Điểm trung bình</p>
              <p className="text-2xl font-bold">{avgScore}%</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs">Số ngày đăng nhập</p>
              <p className="text-2xl font-bold">{me?.totalLoginDays ?? 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs">Chuỗi hiện tại</p>
              <p className="text-2xl font-bold text-emerald-300">{me?.loginStreak ?? 0} ngày</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs">Khoá học hoàn thành</p>
              <p className="text-2xl font-bold text-cyan-300">{completedCourses}</p>
            </div>
          </div>

          {activeTab === "dashboard" ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold text-cyan-200">Dashboard năng lực AI</h2>
              <p className="mt-2 text-sm text-slate-300">
                Theo dõi tiến độ học tập, nhịp đăng nhập hằng ngày, hiệu suất prompt và mức độ hoàn thành khóa học.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-800/70 p-4">
                  <p className="font-semibold">Mục tiêu tuần</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    <li>Hoàn thành 1 khóa Prompt Master.</li>
                    <li>Duy trì chuỗi đăng nhập &gt;= 5 ngày.</li>
                    <li>Nâng điểm trung bình lên &gt;= 80.</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-800/70 p-4">
                  <p className="font-semibold">Tóm tắt</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Bạn đã đăng nhập {me?.loginCount ?? 0} lần. Lần cuối: {me?.lastLoginDate ? new Date(me.lastLoginDate).toLocaleString("vi-VN") : "-"}.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "courses" ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold text-cyan-200">Khoá học AI theo lộ trình</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {courseCatalog.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => resetCourseFlow(course.id)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selectedCourse === course.id
                        ? "border-cyan-300 bg-cyan-500/10"
                        : "border-white/10 bg-slate-800/60"
                    }`}
                  >
                    <p className="font-semibold">{course.title}</p>
                    <p className="mt-2 text-xs text-slate-300">{course.summary}</p>
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-slate-800/70 p-4">
                <p className="text-sm text-cyan-200">
                  Bước {currentStepIndex + 1}/{activeCourse.steps.length}: {activeCourse.steps[currentStepIndex].title}
                </p>
                <p className="mt-2 text-sm text-slate-300">{activeCourse.steps[currentStepIndex].guide}</p>

                <textarea
                  value={studentPrompt}
                  onChange={(e) => setStudentPrompt(e.target.value)}
                  className="mt-3 h-28 w-full rounded-lg border border-white/15 bg-slate-900 p-2"
                  placeholder="Nhập prompt hoặc câu hỏi của bạn trong bước này..."
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={askAiInStep}
                    disabled={loading}
                    className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950"
                  >
                    {loading ? "AI đang phản hồi..." : "Hỏi & trao đổi với AI"}
                  </button>
                  <button
                    onClick={completeCurrentStep}
                    disabled={loading}
                    className="rounded-lg border border-emerald-300/40 px-3 py-2 text-sm font-semibold text-emerald-200"
                  >
                    {currentStepIndex < activeCourse.steps.length - 1 ? "Hoàn thành bước" : "Kết thúc khoá học"}
                  </button>
                </div>

                {aiDiscussion ? (
                  <div className="mt-3 rounded-lg border border-cyan-300/30 bg-cyan-500/10 p-3 text-sm">
                    <p className="font-semibold text-cyan-200">AI phản hồi</p>
                    <p className="mt-1 text-slate-100">{aiDiscussion}</p>
                  </div>
                ) : null}
              </div>

              {courseResult ? (
                <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-4">
                  <p className="font-semibold text-emerald-200">Đánh giá cuối khoá</p>
                  <p className="mt-1 text-2xl font-bold">{courseResult.score}%</p>
                  <p className="mt-1 text-sm text-slate-200">{courseResult.feedback}</p>
                  <p className="mt-1 text-xs text-slate-300">{courseResult.isPassed ? "Đạt yêu cầu" : "Cần luyện thêm"}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "history" ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold text-cyan-200">Lịch sử & kết quả cá nhân</h2>
              <div className="mt-4 space-y-3">
                {histories.map((item) => (
                  <article key={item.id} className="rounded-lg border border-white/10 bg-slate-800/70 p-4">
                    <div className="flex justify-between">
                      <p>{item.title}</p>
                      <p className="font-bold text-emerald-300">{item.score}%</p>
                    </div>
                    <p className="text-sm text-slate-300">{item.feedback}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "community" ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold text-cyan-200">Cộng đồng học AI</h2>
              <div className="mt-3 flex gap-2">
                <input
                  value={communityInput}
                  onChange={(e) => setCommunityInput(e.target.value)}
                  className="flex-1 rounded-lg border border-white/15 bg-slate-800 p-2"
                  placeholder="Chia sẻ bài học, prompt hay..."
                />
                <button onClick={postCommunity} className="rounded-lg bg-cyan-400 px-3 py-2 font-semibold text-slate-950">
                  Đăng
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {posts.map((post) => (
                  <div key={post.id} className="rounded-lg border border-white/10 bg-slate-800/70 p-3">
                    <p className="text-sm font-semibold text-cyan-200">{post.userName}</p>
                    <p className="text-sm">{post.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "admin" && me?.isAdmin ? (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-5">
              <h2 className="text-xl font-semibold text-amber-200">Admin Control</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="rounded-lg border border-white/15 bg-slate-800 p-2"
                  placeholder="Tên admin"
                />
                <input
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="rounded-lg border border-white/15 bg-slate-800 p-2"
                  placeholder="Email admin"
                />
                <input
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="rounded-lg border border-white/15 bg-slate-800 p-2"
                  placeholder="Password"
                />
              </div>
              <button onClick={createAdmin} className="mt-2 rounded-lg bg-amber-300 px-4 py-2 font-semibold text-slate-950">
                Tạo admin mới
              </button>
              {adminMsg ? <p className="mt-2 text-sm">{adminMsg}</p> : null}

              <div className="mt-4 space-y-2">
                {allUsers.map((user) => (
                  <div key={user.id} className="rounded-lg border border-white/10 bg-slate-800/70 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p>
                        {user.name} - {user.email} ({user.role})
                      </p>
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="rounded-md border border-cyan-300/40 px-2 py-1 text-xs text-cyan-200"
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedUser ? (
                <div className="mt-4 rounded-lg border border-cyan-300/30 bg-slate-900/80 p-4 text-sm">
                  <p className="font-semibold text-cyan-200">Chi tiết tài khoản: {selectedUser.name}</p>
                  <p>Email: {selectedUser.email}</p>
                  <p>Vai trò: {selectedUser.role}</p>
                  <p>Ngày tạo: {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString("vi-VN") : "-"}</p>
                  <p>Số bài đã nộp: {selectedUser.stats?.historyCount ?? 0}</p>
                  <p>Số bài cộng đồng: {selectedUser.stats?.postCount ?? 0}</p>
                  <p>
                    Đăng nhập gần nhất: {selectedUser.stats?.lastSessionAt
                      ? new Date(selectedUser.stats.lastSessionAt).toLocaleString("vi-VN")
                      : "-"}
                  </p>
                  <p>Chuỗi đăng nhập: {selectedUser.loginStreak ?? 0} ngày</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
