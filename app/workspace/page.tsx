"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Session = {
  email: string;
  name: string;
  role: string;
  loggedAt: string;
};

type HistoryItem = {
  id: string;
  type: "master" | "arena" | "auditor";
  title: string;
  score: number;
  feedback: string;
  createdAt: string;
};

type Tab = "master" | "arena" | "auditor" | "history";

const SESSION_KEY = "blabla-session";
const HISTORY_KEY = "blabla-history";

const roleLabel: Record<string, string> = {
  student: "Học sinh / Sinh viên",
  office: "Nhân viên văn phòng",
  business: "Doanh nghiệp",
};

const arenaReference = "0123456789, 0987654321, 0911222333";

function roughTokenCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function scorePromptMaster(prompt: string) {
  const checks = ["vai trò", "mục tiêu", "định dạng", "5 hành động"];
  const normalized = prompt.toLowerCase();
  const passed = checks.filter((keyword) => normalized.includes(keyword)).length;
  const score = Math.min(100, 35 + passed * 16 + Math.max(0, 20 - roughTokenCount(prompt)));

  return {
    score,
    feedback:
      passed >= 3
        ? "Prompt đã có cấu trúc tốt. Bạn có thể thêm ràng buộc dữ liệu đầu vào để tăng độ chính xác."
        : "Prompt còn thiếu cấu trúc. Hãy thêm vai trò, mục tiêu, định dạng output và số lượng hành động cụ thể.",
  };
}

function scoreArena(prompt: string) {
  const tokens = roughTokenCount(prompt);
  const normalized = prompt.toLowerCase();
  const hasTask = normalized.includes("trích xuất") || normalized.includes("extract");
  const hasPhone = normalized.includes("số điện thoại") || normalized.includes("phone");
  const quality = hasTask && hasPhone ? 90 : 60;
  const efficiency = Math.max(0, 35 - tokens);
  const score = Math.min(100, Math.round((quality * 0.7 + efficiency * 0.9)));

  return {
    score,
    feedback:
      score >= 85
        ? "Excellent! Prompt ngắn gọn và đúng mục tiêu."
        : "Cần tối ưu hơn: dùng câu lệnh ngắn, rõ nhiệm vụ và định dạng output mong muốn.",
  };
}

function scoreAuditor(guardrails: string, architecture: string) {
  const g = guardrails.toLowerCase();
  const a = architecture.toLowerCase();
  const checks = [g.includes("không bịa"), g.includes("nguồn"), g.includes("ngưỡng phê duyệt"), a.includes("persona"), a.includes("task"), a.includes("tools")];
  const passed = checks.filter(Boolean).length;
  const score = Math.min(100, 30 + passed * 12);

  return {
    score,
    feedback:
      passed >= 5
        ? "Thiết kế Agent khá đầy đủ guardrails và kiến trúc vận hành."
        : "Hãy bổ sung guardrails chống ảo giác, kiểm tra nguồn dữ liệu và phân quyền phê duyệt rõ ràng.",
  };
}

export default function WorkspacePage() {
  const router = useRouter();
  const session: Session | null = useMemo(() => {
    if (typeof window === "undefined") return null;

    const rawSession = localStorage.getItem(SESSION_KEY);
    if (!rawSession) return null;

    try {
      return JSON.parse(rawSession) as Session;
    } catch {
      return null;
    }
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>("master");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window === "undefined") return [];

    const rawHistory = localStorage.getItem(HISTORY_KEY);
    if (!rawHistory) return [];

    try {
      return JSON.parse(rawHistory) as HistoryItem[];
    } catch {
      return [];
    }
  });

  const [masterRaw, setMasterRaw] = useState(
    "Biên bản họp 10 trang lộn xộn, nhiều ý trùng lặp về deadline và người phụ trách.",
  );
  const [masterGoal, setMasterGoal] = useState("Tạo danh sách 5 hành động ưu tiên trong tuần này.");
  const [masterPrompt, setMasterPrompt] = useState("");

  const [arenaPrompt, setArenaPrompt] = useState("");

  const [auditorGuardrails, setAuditorGuardrails] = useState("");
  const [auditorArchitecture, setAuditorArchitecture] = useState("");

  useEffect(() => {
    if (!session) {
      router.push("/login");
    }
  }, [router, session]);

  const tokenMaster = useMemo(() => roughTokenCount(masterPrompt), [masterPrompt]);
  const tokenArena = useMemo(() => roughTokenCount(arenaPrompt), [arenaPrompt]);
  const tokenAuditor = useMemo(
    () => roughTokenCount(auditorGuardrails) + roughTokenCount(auditorArchitecture),
    [auditorGuardrails, auditorArchitecture],
  );

  const avgScore = useMemo(() => {
    if (!history.length) return 0;
    return Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length);
  }, [history]);

  const persistHistory = (item: HistoryItem) => {
    const nextHistory = [item, ...history].slice(0, 20);
    setHistory(nextHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  };

  const simulateAsyncJudge = async (action: () => { score: number; feedback: string }) => {
    setLoading(true);
    setResult(null);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const output = action();
    setResult(output);
    setLoading(false);
    return output;
  };

  const submitMaster = async () => {
    const output = await simulateAsyncJudge(() => scorePromptMaster(masterPrompt));

    persistHistory({
      id: crypto.randomUUID(),
      type: "master",
      title: "Prompt Master - Sản phẩm hóa kiến thức",
      score: output.score,
      feedback: output.feedback,
      createdAt: new Date().toISOString(),
    });
  };

  const submitArena = async () => {
    const output = await simulateAsyncJudge(() => scoreArena(arenaPrompt));

    persistHistory({
      id: crypto.randomUUID(),
      type: "arena",
      title: "Clean Prompt Arena - Tối ưu hiệu suất",
      score: output.score,
      feedback: output.feedback,
      createdAt: new Date().toISOString(),
    });
  };

  const submitAuditor = async () => {
    const output = await simulateAsyncJudge(() => scoreAuditor(auditorGuardrails, auditorArchitecture));

    persistHistory({
      id: crypto.randomUUID(),
      type: "auditor",
      title: "AI Auditor & Agent Architect",
      score: output.score,
      feedback: output.feedback,
      createdAt: new Date().toISOString(),
    });
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    router.push("/login");
  };

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        Đang tải workspace...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8 md:py-8">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Blabla Simulator</p>
          <h1 className="mt-2 text-lg font-bold">{session.name}</h1>
          <p className="text-sm text-slate-300">{session.email}</p>
          <p className="mt-1 text-sm text-slate-400">{roleLabel[session.role] ?? "Người dùng"}</p>

          <div className="mt-6 space-y-2">
            {[
              ["master", "Prompt Master"],
              ["arena", "Clean Prompt Arena"],
              ["auditor", "AI Auditor"],
              ["history", "Lịch sử & phân tích"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key as Tab);
                  setResult(null);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeTab === key ? "bg-cyan-400 text-slate-950" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="mt-8 w-full rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-cyan-300"
          >
            Đăng xuất
          </button>
        </aside>

        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Bài đã nộp</p>
              <p className="mt-1 text-2xl font-bold">{history.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Điểm trung bình</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">{avgScore}%</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Xếp hạng giả lập</p>
              <p className="mt-1 text-2xl font-bold text-cyan-300">#{Math.max(1, 100 - avgScore)}</p>
            </div>
          </div>

          {activeTab === "master" ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold text-cyan-200">Prompt Master</h2>
              <p className="mt-1 text-sm text-slate-300">Biến brief lộn xộn thành sản phẩm đầu ra chuyên nghiệp.</p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  Raw data
                  <textarea
                    value={masterRaw}
                    onChange={(event) => setMasterRaw(event.target.value)}
                    className="mt-2 h-28 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2"
                  />
                </label>

                <label className="text-sm">
                  Goal
                  <textarea
                    value={masterGoal}
                    onChange={(event) => setMasterGoal(event.target.value)}
                    className="mt-2 h-28 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2"
                  />
                </label>
              </div>

              <label className="mt-3 block text-sm">
                Prompt của bạn
                <textarea
                  value={masterPrompt}
                  onChange={(event) => setMasterPrompt(event.target.value)}
                  className="mt-2 h-32 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2"
                  placeholder="Ví dụ: Vai trò: chuyên gia vận hành... Mục tiêu... Định dạng output... 5 hành động..."
                />
              </label>

              <div className="mt-2 text-xs text-slate-400">Token meter: {tokenMaster}</div>
              <div className="mt-1 text-xs text-slate-500">Brief mô phỏng: {masterRaw.slice(0, 80)}... | Goal: {masterGoal}</div>

              <button
                onClick={submitMaster}
                disabled={loading}
                className="mt-4 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
              >
                {loading ? "AI Judge đang chấm..." : "Nộp bài Prompt Master"}
              </button>
            </div>
          ) : null}

          {activeTab === "arena" ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold text-cyan-200">Clean Prompt Arena</h2>
              <p className="mt-1 text-sm text-slate-300">Challenge: Trích xuất tất cả số điện thoại với prompt ngắn nhất.</p>

              <p className="mt-3 rounded-lg border border-white/10 bg-slate-800/70 p-3 text-sm text-slate-200">
                Dữ liệu đầu vào: {arenaReference}
              </p>

              <label className="mt-3 block text-sm">
                Prompt của bạn
                <textarea
                  value={arenaPrompt}
                  onChange={(event) => setArenaPrompt(event.target.value)}
                  className="mt-2 h-28 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2"
                  placeholder="Ví dụ: Trích xuất toàn bộ số điện thoại từ văn bản, trả về mảng JSON."
                />
              </label>

              <div className="mt-2 text-xs text-slate-400">Token meter (real-time): {tokenArena}</div>
              <button
                onClick={submitArena}
                disabled={loading}
                className="mt-4 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
              >
                {loading ? "Arena đang đối soát..." : "Nộp bài Arena"}
              </button>
            </div>
          ) : null}

          {activeTab === "auditor" ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold text-cyan-200">AI Auditor & Agent Architect</h2>
              <p className="mt-1 text-sm text-slate-300">Thiết kế guardrails và kiến trúc agent có kiểm soát.</p>

              <label className="mt-3 block text-sm">
                Guardrails
                <textarea
                  value={auditorGuardrails}
                  onChange={(event) => setAuditorGuardrails(event.target.value)}
                  className="mt-2 h-28 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2"
                  placeholder="Ví dụ: Không bịa thông tin, bắt buộc trích nguồn, đơn trên 10 triệu cần phê duyệt..."
                />
              </label>

              <label className="mt-3 block text-sm">
                Agent architecture (Persona → Task → Tools)
                <textarea
                  value={auditorArchitecture}
                  onChange={(event) => setAuditorArchitecture(event.target.value)}
                  className="mt-2 h-28 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2"
                  placeholder="Persona: ... Task: ... Tools: ..."
                />
              </label>

              <div className="mt-2 text-xs text-slate-400">Token meter: {tokenAuditor}</div>
              <button
                onClick={submitAuditor}
                disabled={loading}
                className="mt-4 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
              >
                {loading ? "Đang loop testing..." : "Nộp bài Auditor"}
              </button>
            </div>
          ) : null}

          {activeTab === "history" ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold text-cyan-200">Lịch sử nộp bài</h2>
              <p className="mt-1 text-sm text-slate-300">Lưu cục bộ theo tài khoản đang đăng nhập.</p>

              <div className="mt-4 space-y-3">
                {history.length ? (
                  history.map((item) => (
                    <article key={item.id} className="rounded-lg border border-white/10 bg-slate-800/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-cyan-200">{item.title}</p>
                        <span className="text-sm font-bold text-emerald-300">{item.score}%</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{item.feedback}</p>
                      <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Chưa có dữ liệu. Hãy nộp bài ở các tab để bắt đầu.</p>
                )}
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4">
              <p className="text-sm text-emerald-200">Kết quả AI Judge</p>
              <p className="mt-1 text-xl font-bold">{result.score}%</p>
              <p className="mt-1 text-sm text-slate-200">{result.feedback}</p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
