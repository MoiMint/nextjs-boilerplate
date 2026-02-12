"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsers, HISTORY_KEY, saveUsers, SESSION_KEY, type Session, type User } from "../lib/client-auth";

type HistoryItem = {
  id: string;
  type: "master" | "arena" | "auditor";
  title: string;
  score: number;
  feedback: string;
  createdAt: string;
};

type Tab = "master" | "arena" | "auditor" | "history" | "admin";

const roleLabel: Record<string, string> = {
  student: "Học sinh / Sinh viên",
  office: "Nhân viên văn phòng",
  business: "Doanh nghiệp",
  admin: "Quản trị viên",
};

const arenaReference = "0123456789, 0987654321, 0911222333";

function roughTokenCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function scorePromptMaster(prompt: string) {
  const checks = ["vai trò", "mục tiêu", "định dạng", "5 hành động"];
  const normalized = prompt.toLowerCase();
  const passed = checks.filter((keyword) => normalized.includes(keyword)).length;
  return {
    score: Math.min(100, 35 + passed * 16 + Math.max(0, 20 - roughTokenCount(prompt))),
    feedback:
      passed >= 3
        ? "Prompt có cấu trúc khá tốt, có thể đưa thêm ràng buộc dữ liệu để ổn định đầu ra."
        : "Prompt còn thiếu structure. Hãy bổ sung vai trò, mục tiêu, format output và 5 hành động.",
  };
}

export default function WorkspacePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("master");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string>("");

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

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>(() => (typeof window === "undefined" ? [] : getUsers()));

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
    const nextHistory = [item, ...history].slice(0, 30);
    setHistory(nextHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  };

  const runAiJudge = async (context: string, prompt: string) => {
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, prompt }),
      });
      const data = (await response.json()) as { score?: number; feedback?: string; error?: string };
      if (!response.ok) {
        setAiFeedback(data.error ?? "AI chưa sẵn sàng. Hãy kiểm tra cấu hình API key.");
        return null;
      }
      setAiFeedback(data.feedback ?? "");
      return { score: data.score ?? 70, feedback: data.feedback ?? "" };
    } catch {
      setAiFeedback("Không gọi được AI server.");
      return null;
    }
  };

  const submitMaster = async () => {
    setLoading(true);
    setResult(null);
    const localScore = scorePromptMaster(masterPrompt);
    const ai = await runAiJudge("Prompt Master", `${masterRaw}\nGoal: ${masterGoal}\nPrompt: ${masterPrompt}`);
    const output = ai ?? localScore;
    setResult(output);
    persistHistory({
      id: crypto.randomUUID(),
      type: "master",
      title: "Prompt Master",
      score: output.score,
      feedback: output.feedback,
      createdAt: new Date().toISOString(),
    });
    setLoading(false);
  };

  const submitArena = async () => {
    setLoading(true);
    setResult(null);
    const local = {
      score: Math.min(100, Math.max(40, 100 - tokenArena * 2)),
      feedback: tokenArena <= 12 ? "Prompt gọn, khá tối ưu token." : "Có thể rút ngắn prompt để tăng efficiency.",
    };
    const ai = await runAiJudge("Clean Prompt Arena", `Input: ${arenaReference}\nPrompt: ${arenaPrompt}`);
    const output = ai ?? local;
    setResult(output);
    persistHistory({
      id: crypto.randomUUID(),
      type: "arena",
      title: "Clean Prompt Arena",
      score: output.score,
      feedback: output.feedback,
      createdAt: new Date().toISOString(),
    });
    setLoading(false);
  };

  const submitAuditor = async () => {
    setLoading(true);
    setResult(null);
    const ai = await runAiJudge(
      "AI Auditor & Agent Architect",
      `Guardrails: ${auditorGuardrails}\nArchitecture: ${auditorArchitecture}`,
    );
    const output = ai ?? { score: 75, feedback: "Bổ sung thêm điều kiện fail-safe và phân quyền theo cấp độ." };
    setResult(output);
    persistHistory({
      id: crypto.randomUUID(),
      type: "auditor",
      title: "AI Auditor",
      score: output.score,
      feedback: output.feedback,
      createdAt: new Date().toISOString(),
    });
    setLoading(false);
  };

  const createAdmin = () => {
    if (!adminName || !adminEmail || !adminPassword) {
      setAdminMessage("Vui lòng nhập đủ thông tin admin mới.");
      return;
    }
    const users = getUsers();
    if (users.some((u) => u.email.toLowerCase() === adminEmail.toLowerCase())) {
      setAdminMessage("Email đã tồn tại.");
      return;
    }

    const newAdmin: User = {
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: "admin",
      isAdmin: true,
      createdAt: new Date().toISOString(),
    };
    const next = [...users, newAdmin];
    saveUsers(next);
    setAllUsers(next);
    setAdminMessage("Tạo admin mới thành công.");
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    router.push("/login");
  };

  if (!session) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">Đang tải workspace...</main>;
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
              ...(session.isAdmin ? [["admin", "Admin Control"]] : []),
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key as Tab);
                  setResult(null);
                  setAiFeedback("");
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-all duration-300 ${
                  activeTab === key ? "bg-cyan-400 text-slate-950 translate-x-1" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button onClick={handleLogout} className="mt-8 w-full rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-cyan-300">
            Đăng xuất
          </button>
        </aside>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4 scrollbar-pro max-h-[84vh] overflow-y-auto">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-300">Bài đã nộp</p><p className="mt-1 text-2xl font-bold">{history.length}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-300">Điểm trung bình</p><p className="mt-1 text-2xl font-bold text-emerald-300">{avgScore}%</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-300">Xếp hạng giả lập</p><p className="mt-1 text-2xl font-bold text-cyan-300">#{Math.max(1, 100 - avgScore)}</p></div>
          </div>

          <div key={activeTab} className="tab-panel">
            {activeTab === "master" && (
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <h2 className="text-xl font-semibold text-cyan-200">Prompt Master</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <textarea value={masterRaw} onChange={(e) => setMasterRaw(e.target.value)} className="h-28 rounded-lg border border-white/15 bg-slate-800 p-2" />
                  <textarea value={masterGoal} onChange={(e) => setMasterGoal(e.target.value)} className="h-28 rounded-lg border border-white/15 bg-slate-800 p-2" />
                </div>
                <textarea value={masterPrompt} onChange={(e) => setMasterPrompt(e.target.value)} className="mt-3 h-32 w-full rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Nhập prompt..." />
                <p className="mt-2 text-xs text-slate-400">Token meter: {tokenMaster}</p>
                <button onClick={submitMaster} disabled={loading} className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950">{loading ? "AI đang chấm..." : "Nộp bài"}</button>
              </div>
            )}

            {activeTab === "arena" && (
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <h2 className="text-xl font-semibold text-cyan-200">Clean Prompt Arena</h2>
                <p className="mt-2 rounded-lg border border-white/10 bg-slate-800/70 p-3 text-sm">Input: {arenaReference}</p>
                <textarea value={arenaPrompt} onChange={(e) => setArenaPrompt(e.target.value)} className="mt-3 h-28 w-full rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Prompt tối ưu..." />
                <p className="mt-2 text-xs text-slate-400">Token meter: {tokenArena}</p>
                <button onClick={submitArena} disabled={loading} className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950">{loading ? "AI đang đối soát..." : "Nộp bài Arena"}</button>
              </div>
            )}

            {activeTab === "auditor" && (
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <h2 className="text-xl font-semibold text-cyan-200">AI Auditor & Agent Architect</h2>
                <textarea value={auditorGuardrails} onChange={(e) => setAuditorGuardrails(e.target.value)} className="mt-3 h-28 w-full rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Guardrails..." />
                <textarea value={auditorArchitecture} onChange={(e) => setAuditorArchitecture(e.target.value)} className="mt-3 h-28 w-full rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Persona -> Task -> Tools..." />
                <p className="mt-2 text-xs text-slate-400">Token meter: {tokenAuditor}</p>
                <button onClick={submitAuditor} disabled={loading} className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950">{loading ? "AI đang loop testing..." : "Nộp bài Auditor"}</button>
              </div>
            )}

            {activeTab === "history" && (
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <h2 className="text-xl font-semibold text-cyan-200">Lịch sử nộp bài</h2>
                <div className="mt-4 space-y-3">
                  {history.map((item) => (
                    <article key={item.id} className="rounded-lg border border-white/10 bg-slate-800/70 p-4">
                      <div className="flex items-center justify-between"><p>{item.title}</p><p className="font-bold text-emerald-300">{item.score}%</p></div>
                      <p className="text-sm text-slate-300">{item.feedback}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "admin" && session.isAdmin && (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-5">
                <h2 className="text-xl font-semibold text-amber-200">Admin Control</h2>
                <p className="text-sm text-slate-200">Xem toàn bộ tài khoản và tạo thêm admin mới.</p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <input value={adminName} onChange={(e) => setAdminName(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Tên admin" />
                  <input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Email admin" />
                  <input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Mật khẩu" />
                </div>
                <button onClick={createAdmin} className="mt-3 rounded-lg bg-amber-300 px-4 py-2 font-semibold text-slate-950">Tạo admin mới</button>
                {adminMessage ? <p className="mt-2 text-sm text-amber-100">{adminMessage}</p> : null}

                <div className="mt-4 space-y-2">
                  {allUsers.map((u) => (
                    <div key={u.email} className="rounded-lg border border-white/10 bg-slate-900/70 p-3 text-sm">
                      <p className="font-semibold">{u.name} - {u.email}</p>
                      <p className="text-slate-300">Role: {u.role} {u.isAdmin ? "(Admin)" : ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {result ? (
            <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4">
              <p className="text-sm text-emerald-200">Kết quả chấm</p>
              <p className="text-xl font-bold">{result.score}%</p>
              <p className="text-sm">{result.feedback}</p>
              {aiFeedback ? <p className="mt-1 text-xs text-cyan-200">AI: {aiFeedback}</p> : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
