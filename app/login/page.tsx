"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("office");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    localStorage.setItem(
      "blabla-session",
      JSON.stringify({
        email,
        role,
        loggedAt: new Date().toISOString(),
      }),
    );

    router.push("/workspace");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl shadow-cyan-500/10">
        <p className="text-sm text-cyan-300">Đăng nhập hệ thống Blabla</p>
        <h1 className="mt-2 text-2xl font-bold">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-300">
          Truy cập dashboard mô phỏng để luyện Prompt Master, Arena và AI Auditor.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 outline-none ring-cyan-300 placeholder:text-slate-400 focus:ring-2"
              placeholder="ban@blabla.ai"
            />
          </label>

          <label className="block text-sm">
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 outline-none ring-cyan-300 placeholder:text-slate-400 focus:ring-2"
              placeholder="••••••••"
            />
          </label>

          <label className="block text-sm">
            Vai trò
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 outline-none ring-cyan-300 focus:ring-2"
            >
              <option value="student">Học sinh / Sinh viên</option>
              <option value="office">Nhân viên văn phòng</option>
              <option value="business">Doanh nghiệp</option>
            </select>
          </label>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Đăng nhập
          </button>
        </form>
      </div>
    </main>
  );
}
