"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsers, SESSION_KEY } from "../lib/client-auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useMemo(() => getUsers(), []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    const users = getUsers();
    const account = users.find((user) => user.email.toLowerCase() === email.toLowerCase());

    if (!account) {
      setError("Email chưa có tài khoản. Vui lòng đăng ký trước.");
      return;
    }

    if (account.password !== password) {
      setError("Mật khẩu không đúng. Vui lòng thử lại.");
      return;
    }

    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        email: account.email,
        name: account.name,
        role: account.role,
        isAdmin: account.isAdmin || account.role === "admin",
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
        <p className="mt-2 text-sm text-slate-300">Đăng nhập để tiếp tục luyện tập và xem lịch sử bài nộp.</p>
        <p className="mt-1 text-xs text-amber-300">Admin mặc định: admin@blabla.ai / 123456</p>

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

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Đăng nhập
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-300">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Tạo tài khoản mới
          </Link>
        </p>
      </div>
    </main>
  );
}
