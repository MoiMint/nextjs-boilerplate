"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const SESSION_TOKEN_KEY = "blabla-session-token";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = (await response.json()) as { token?: string; error?: string };
    if (!response.ok || !data.token) {
      setError(data.error ?? "Đăng nhập thất bại.");
      setLoading(false);
      return;
    }

    localStorage.setItem(SESSION_TOKEN_KEY, data.token);
    router.push("/workspace");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl shadow-cyan-500/10">
        <p className="text-sm text-cyan-300">Đăng nhập hệ thống Blabla (Online)</p>
        <h1 className="mt-2 text-2xl font-bold">Welcome back</h1>
        <div className="mt-3">
          <Link href="/" className="text-sm font-medium text-slate-300 hover:text-cyan-300">← Quay lại trang chủ</Link>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2" placeholder="Mật khẩu" />
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950">{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
        </form>

        <p className="mt-5 text-sm text-slate-300">
          Chưa có tài khoản? <Link href="/register" className="font-semibold text-cyan-300">Tạo tài khoản mới</Link>
        </p>
      </div>
    </main>
  );
}
