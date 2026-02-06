"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

type Session = {
  email: string;
  role: string;
  loggedAt: string;
};

const roleLabel: Record<string, string> = {
  student: "Học sinh / Sinh viên",
  office: "Nhân viên văn phòng",
  business: "Doanh nghiệp",
};

const missions = [
  {
    name: "Prompt Master",
    level: "Level 2",
    score: 86,
    description: "Biến biên bản họp thành kế hoạch hành động 5 bước.",
  },
  {
    name: "Clean Prompt Arena",
    level: "Arena A",
    score: 92,
    description: "Tối ưu prompt để giảm token 30% nhưng vẫn giữ độ chính xác.",
  },
  {
    name: "AI Auditor",
    level: "Audit 1",
    score: 78,
    description: "Phát hiện 3 lỗi ảo giác trong báo cáo AI và đề xuất guardrail.",
  },
];

export default function WorkspacePage() {
  const router = useRouter();
  const session: Session | null = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const rawSession = localStorage.getItem("blabla-session");
    return rawSession ? (JSON.parse(rawSession) as Session) : null;
  }, []);

  useEffect(() => {
    if (!session) {
      router.push("/login");
    }
  }, [router, session]);

  const avgScore = useMemo(() => {
    return Math.round(missions.reduce((sum, mission) => sum + mission.score, 0) / missions.length);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("blabla-session");
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
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Blabla Workspace</p>
            <h1 className="mt-2 text-2xl font-bold">Xin chào, {session.email}</h1>
            <p className="mt-1 text-sm text-slate-300">Vai trò: {roleLabel[session.role] ?? "Người dùng"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm transition hover:border-cyan-300"
          >
            Đăng xuất
          </button>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-300">Nhiệm vụ hoàn thành</p>
            <p className="mt-2 text-3xl font-bold">12</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-300">Điểm trung bình</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">{avgScore}%</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-300">Thứ hạng Arena</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">#24</p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Mô phỏng đang chạy</h2>
          <div className="mt-4 space-y-4">
            {missions.map((mission) => (
              <article
                key={mission.name}
                className="rounded-xl border border-white/10 bg-slate-800/60 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold text-cyan-200">{mission.name}</h3>
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                    {mission.level}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{mission.description}</p>
                <p className="mt-3 text-sm">Điểm gần nhất: {mission.score}%</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
