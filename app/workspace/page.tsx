"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; name: string; email: string; role: string; isAdmin: boolean };
type HistoryItem = { id: string; title: string; score: number; feedback: string; createdAt: string };
type Post = { id: string; userName: string; content: string; createdAt: string };
type Tab = "master" | "arena" | "auditor" | "history" | "community" | "admin";

const SESSION_TOKEN_KEY = "blabla-session-token";

export default function WorkspacePage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("master");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(null);
  const [histories, setHistories] = useState<HistoryItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [prompt, setPrompt] = useState("");
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

  const submit = async (type: "master" | "arena" | "auditor") => {
    setLoading(true);
    setResult(null);

    const aiRes = await fetch("/api/ai", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ context: type, prompt }),
    });

    const aiData = (await aiRes.json()) as { score?: number; feedback?: string; error?: string };
    const output = aiRes.ok
      ? { score: aiData.score ?? 70, feedback: aiData.feedback ?? "Không có phản hồi." }
      : { score: 65, feedback: aiData.error ?? "Fallback local scoring." };

    setResult(output);

    await fetch("/api/history", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ type, title: `Task ${type.toUpperCase()}`, score: output.score, feedback: output.feedback }),
    });

    await loadHistories();
    setLoading(false);
  };

  const postCommunity = async () => {
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

  const avgScore = histories.length
    ? Math.round(histories.reduce((sum, item) => sum + item.score, 0) / histories.length)
    : 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8 md:py-8">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <h1 className="text-lg font-bold">{me?.name ?? "Loading..."}</h1>
          <p className="text-sm text-slate-300">{me?.email}</p>
          <div className="mt-5 space-y-2">
            {["master", "arena", "auditor", "history", "community", ...(me?.isAdmin ? ["admin"] : [])].map((key) => (
              <button key={key} onClick={() => setActiveTab(key as Tab)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-all duration-300 ${activeTab === key ? "bg-cyan-400 text-slate-950" : "bg-white/5"}`}>
                {key}
              </button>
            ))}
          </div>
          <button onClick={() => { localStorage.removeItem(SESSION_TOKEN_KEY); router.push('/login'); }} className="mt-6 w-full rounded-lg border border-white/20 px-3 py-2">Đăng xuất</button>
        </aside>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4 scrollbar-pro max-h-[84vh] overflow-y-auto">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs">Bài của tôi</p><p className="text-2xl font-bold">{histories.length}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs">Điểm TB</p><p className="text-2xl font-bold">{avgScore}%</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs">Bài cộng đồng</p><p className="text-2xl font-bold">{posts.length}</p></div>
          </div>

          <div key={activeTab} className="tab-panel">
            {(activeTab === "master" || activeTab === "arena" || activeTab === "auditor") && (
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <h2 className="text-xl font-semibold text-cyan-200">{activeTab.toUpperCase()}</h2>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="mt-3 h-32 w-full rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Nhập prompt..." />
                <button onClick={() => submit(activeTab)} disabled={loading} className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950">{loading ? "AI đang chấm..." : "Nộp bài"}</button>
              </div>
            )}

            {activeTab === "history" && (
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <h2 className="text-xl font-semibold text-cyan-200">Lịch sử của riêng bạn</h2>
                <div className="mt-4 space-y-3">
                  {histories.map((item) => (
                    <article key={item.id} className="rounded-lg border border-white/10 bg-slate-800/70 p-4">
                      <div className="flex justify-between"><p>{item.title}</p><p className="font-bold text-emerald-300">{item.score}%</p></div>
                      <p className="text-sm text-slate-300">{item.feedback}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "community" && (
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <h2 className="text-xl font-semibold text-cyan-200">Cộng đồng (Online)</h2>
                <div className="mt-3 flex gap-2">
                  <input value={communityInput} onChange={(e) => setCommunityInput(e.target.value)} className="flex-1 rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Chia sẻ prompt, tip..." />
                  <button onClick={postCommunity} className="rounded-lg bg-cyan-400 px-3 py-2 font-semibold text-slate-950">Đăng</button>
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
            )}

            {activeTab === "admin" && me?.isAdmin && (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-5">
                <h2 className="text-xl font-semibold text-amber-200">Admin Control</h2>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <input value={adminName} onChange={(e) => setAdminName(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Tên admin" />
                  <input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Email admin" />
                  <input value={adminPass} onChange={(e) => setAdminPass(e.target.value)} className="rounded-lg border border-white/15 bg-slate-800 p-2" placeholder="Password" />
                </div>
                <button onClick={createAdmin} className="mt-2 rounded-lg bg-amber-300 px-4 py-2 font-semibold text-slate-950">Tạo admin mới</button>
                {adminMsg ? <p className="mt-2 text-sm">{adminMsg}</p> : null}

                <div className="mt-4 space-y-2">
                  {allUsers.map((user) => (
                    <div key={user.id} className="rounded-lg border border-white/10 bg-slate-800/70 p-3 text-sm">
                      {user.name} - {user.email} ({user.role})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {result ? <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4"><p className="font-bold">{result.score}%</p><p>{result.feedback}</p></div> : null}
        </section>
      </div>
    </main>
  );
}
