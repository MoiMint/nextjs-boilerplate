"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: string;
};

const USERS_KEY = "blabla-users";
const SESSION_KEY = "blabla-session";

function getUsers(): User[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("office");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!name || !email || !password) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }

    const users = getUsers();
    const existed = users.some((user) => user.email.toLowerCase() === email.toLowerCase());

    if (existed) {
      setError("Email đã tồn tại. Vui lòng đăng nhập.");
      return;
    }

    const newUser: User = {
      name,
      email,
      password,
      role,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(USERS_KEY, JSON.stringify([...users, newUser]));
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        loggedAt: new Date().toISOString(),
      }),
    );

    router.push("/workspace");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl shadow-cyan-500/10">
        <p className="text-sm text-cyan-300">Tạo tài khoản Blabla</p>
        <h1 className="mt-2 text-2xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-slate-300">Đăng ký để lưu tiến độ học tập và lịch sử thực chiến prompt.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            Họ và tên
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 outline-none ring-cyan-300 placeholder:text-slate-400 focus:ring-2"
              placeholder="Nguyễn Văn A"
            />
          </label>

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
              placeholder="Tối thiểu 6 ký tự"
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
            Tạo tài khoản
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-300">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </main>
  );
}
