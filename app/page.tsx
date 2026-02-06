import Link from "next/link";

const pillars = [
  {
    title: "Prompt Master",
    description:
      "Thực hành tạo sản phẩm thật từ dữ liệu thô: email, kế hoạch kinh doanh, kịch bản truyền thông.",
  },
  {
    title: "Clean Prompt Arena",
    description:
      "Đấu hạng accuracy/tokens để luyện viết prompt ngắn gọn, chính xác, tối ưu chi phí AI.",
  },
  {
    title: "AI Auditor & Agent Architect",
    description:
      "Phát hiện ảo giác AI, thiết kế agent có guardrails, quy trình và cơ chế kiểm soát rủi ro.",
  },
];

const audiences = [
  "Học sinh - sinh viên",
  "Nhân viên văn phòng",
  "Đội ngũ doanh nghiệp SME",
  "Team chuyển đổi số",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 md:px-10">
        <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/30 via-slate-900 to-cyan-700/20 p-8 md:p-12">
          <p className="mb-3 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Blabla - AI Command Simulator
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
            Nền tảng mô phỏng giúp người dùng làm chủ AI bằng tư duy hệ thống
          </h1>
          <p className="mt-5 max-w-2xl text-sm text-slate-300 md:text-base">
            Không học prompt mẫu, không học lý thuyết suông. Blabla tập trung vào learning by doing:
            giao nhiệm vụ thật, chấm điểm đa AI và vinh danh theo hiệu suất thực chiến.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              Bắt đầu dùng thử
            </Link>
            <a
              href="#features"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-200"
            >
              Xem tính năng
            </a>
          </div>
        </header>

        <section>
          <h2 className="text-2xl font-bold">Đối tượng phù hợp</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {audiences.map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="grid gap-4 md:grid-cols-3">
          {pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-indigo-950/30"
            >
              <h3 className="text-lg font-semibold text-cyan-200">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{pillar.description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-6">
          <h2 className="text-xl font-semibold text-emerald-200">Lộ trình sử dụng</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm text-slate-200">
            <li>Đăng nhập và chọn chuyên môn (marketing, kế toán, IT...)</li>
            <li>Tham gia sandbox có ràng buộc thời gian và dữ liệu</li>
            <li>Nhận phản hồi, điểm số, token-efficiency và thứ hạng leaderboard</li>
            <li>Tiến hóa thành AI Auditor và Agent Architect</li>
          </ol>
        </section>
      </section>
    </main>
  );
}
