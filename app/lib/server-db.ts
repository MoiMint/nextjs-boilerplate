import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

type PromptMasterLesson = {
  id: string;
  title: string;
  topic: string;
  situation: string;
  overview: string;
  methodGuide: string;
  practiceChallenge: string;
  samplePrompt: string;
};

type ArenaWeeklyChallenge = {
  weekLabel: string;
  title: string;
  inputText: string;
  goldenResponse: string;
};

type AuditorScenario = {
  title: string;
  wrongAnswer: string;
  requiredIssues: string[];
};

export type DBUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  isAdmin: boolean;
  createdAt: string;
  loginCount: number;
  totalLoginDays: number;
  loginStreak: number;
  lastLoginDate: string | null;
};

export type DBSession = {
  token: string;
  userId: string;
  createdAt: string;
};

export type DBHistory = {
  id: string;
  userId: string;
  type: "master" | "arena" | "auditor";
  title: string;
  score: number;
  feedback: string;
  createdAt: string;
  meta?: Record<string, string | number | boolean>;
};

export type DBPost = {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
};

export type DBArenaSubmission = {
  id: string;
  userId: string;
  userName: string;
  accuracy: number;
  tokens: number;
  efficiency: number;
  prompt: string;
  createdAt: string;
};

export type DBConfig = {
  promptMasterLessons: PromptMasterLesson[];
  arenaWeekly: ArenaWeeklyChallenge;
  auditorScenario: AuditorScenario;
  auditorScenarios?: AuditorScenario[];
};

export type DBShape = {
  users: DBUser[];
  sessions: DBSession[];
  histories: DBHistory[];
  posts: DBPost[];
  arenaSubmissions: DBArenaSubmission[];
  config: DBConfig;
};

const dbPath = path.join(process.cwd(), "data", "db.json");

async function readFromVercelKV() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null as DBShape | null;

  try {
    const response = await fetch(`${url}/get/blabla_db`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { result?: string | DBShape | null };
    if (!data.result) return null;
    if (typeof data.result === "string") return JSON.parse(data.result) as DBShape;
    return data.result as DBShape;
  } catch {
    return null;
  }
}

async function writeToVercelKV(data: DBShape) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;

  try {
    const response = await fetch(`${url}/set/blabla_db`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

const defaultConfig: DBConfig = {
  promptMasterLessons: [
    {
      id: "pm-1",
      title: "Dashboard quản lý chi tiêu học sinh",
      topic: "Ứng dụng số với ChatGPT + Claude",
      situation:
        "Nhiều bạn tiêu tiền tiêu vặt rất nhanh nhưng không biết đang chi vào đâu nên cuối tháng thường thiếu hụt.",
      overview:
        "Bạn sẽ học cách biến vấn đề thực tế thành app dashboard theo dõi chi tiêu trực quan để kiểm soát tài chính cá nhân.",
      methodGuide:
        "Áp dụng RTRI: (1) Role - giao vai trò rõ cho AI, (2) Task - nêu nhiệm vụ cụ thể, (3) Requirement - ràng buộc kỹ thuật và giao diện, (4) Iterate - thử nghiệm rồi tinh chỉnh. Quy trình: lên ý tưởng bằng ChatGPT, chuyển sang Claude Artifacts để sinh app, test dữ liệu và cải tiến.",
      practiceChallenge:
        "Viết prompt để AI tạo dashboard quản lý chi tiêu có danh mục ăn uống/đi lại/học tập/giải trí/khác, hỗ trợ thêm-xóa khoản chi và hiển thị biểu đồ tổng quan.",
      samplePrompt:
        "Bạn là Senior Product Designer + Frontend Mentor. Hãy tạo web app quản lý chi tiêu học sinh bằng HTML/CSS/JS, có form nhập khoản chi, danh mục, nút xoá, tổng theo danh mục và biểu đồ cột. Output gồm: mô tả kiến trúc, mã hoàn chỉnh, checklist test nhanh.",
    },
    {
      id: "pm-2",
      title: "Email xử lý khủng hoảng truyền thông",
      topic: "Truyền thông",
      situation: "Khách hàng phàn nàn đơn hàng trễ 5 ngày và đang rất bức xúc trên mạng xã hội.",
      overview:
        "Mục tiêu của bài là tạo prompt giúp AI viết email xin lỗi chuyên nghiệp và kế hoạch xử lý rõ ràng, giữ được niềm tin khách hàng.",
      methodGuide:
        "Xác định rõ giọng điệu thương hiệu, đối tượng người nhận, cấu trúc email 4 phần (xin lỗi - nguyên nhân - hành động - cam kết), thêm ràng buộc độ dài và định dạng bullet.",
      practiceChallenge:
        "Viết prompt yêu cầu AI soạn email xin lỗi + 3 hành động khắc phục + ưu đãi đền bù, ngắn gọn dưới 220 từ.",
      samplePrompt:
        "Vai trò: Chuyên viên CSKH cao cấp. Nhiệm vụ: viết email xin lỗi chuyên nghiệp cho khách hàng bị giao trễ 5 ngày. Yêu cầu: giọng điệu đồng cảm, nêu 3 hành động khắc phục, kết thúc bằng ưu đãi 15%, tối đa 220 từ.",
    },
  ],
  arenaWeekly: {
    weekLabel: "Tuần 1",
    title: "Trích xuất số điện thoại",
    inputText: "Liên hệ: 0901234567, 0911222333, hotline 02873009999.",
    goldenResponse: '["0901234567","0911222333","02873009999"]',
  },
  auditorScenario: {
    title: "Bắt lỗi ảo giác trong báo cáo AI",
    wrongAnswer:
      "Việt Nam có 70 tỉnh thành, thủ đô đặt tại TP.HCM, và đồng tiền chính là Dollar Việt Nam.",
    requiredIssues: [
      "Việt Nam có 63 tỉnh thành",
      "Thủ đô là Hà Nội",
      "Đồng tiền là Việt Nam Đồng (VND)",
    ],
  },
  auditorScenarios: [
    {
      title: "Bắt lỗi ảo giác trong báo cáo AI",
      wrongAnswer:
        "Việt Nam có 70 tỉnh thành, thủ đô đặt tại TP.HCM, và đồng tiền chính là Dollar Việt Nam.",
      requiredIssues: [
        "Việt Nam có 63 tỉnh thành",
        "Thủ đô là Hà Nội",
        "Đồng tiền là Việt Nam Đồng (VND)",
      ],
    },
    {
      title: "Bắt lỗi số liệu marketing",
      wrongAnswer:
        "Tỷ lệ chuyển đổi chiến dịch A là 72% dù chỉ có 45 đơn trên 1000 lượt truy cập; CPC là 2 đồng mỗi click.",
      requiredIssues: [
        "Tỷ lệ chuyển đổi đúng là 4.5%",
        "Số liệu CPC 2 đồng/click không thực tế, cần kiểm tra đơn vị ngân sách",
      ],
    },
    {
      title: "Bắt lỗi tư vấn sức khoẻ thiếu an toàn",
      wrongAnswer:
        "Bạn có thể tự ý ngừng thuốc huyết áp nếu hôm nay cảm thấy khỏe hơn và thay bằng nước ép cần tây.",
      requiredIssues: [
        "Không được tự ý ngừng thuốc kê đơn",
        "Cần khuyến nghị tham vấn bác sĩ trước khi thay đổi phác đồ",
      ],
    },
  ],
};

const adminSeed: DBUser = {
  id: "admin-seed",
  name: "Admin Blabla",
  email: "admin@blabla.ai",
  password: "123456",
  role: "admin",
  isAdmin: true,
  createdAt: new Date(0).toISOString(),
  loginCount: 0,
  totalLoginDays: 0,
  loginStreak: 0,
  lastLoginDate: null,
};

const defaultDB = (): DBShape => ({
  users: [adminSeed],
  sessions: [],
  histories: [],
  posts: [],
  arenaSubmissions: [],
  config: defaultConfig,
});

declare global {
  var __blablaDBCache: DBShape | undefined;
}

function ensureUserStats(user: Partial<DBUser>): DBUser {
  return {
    id: user.id ?? "",
    name: user.name ?? "",
    email: user.email ?? "",
    password: user.password ?? "",
    role: user.role ?? "office",
    isAdmin: user.isAdmin ?? false,
    createdAt: user.createdAt ?? new Date().toISOString(),
    loginCount: user.loginCount ?? 0,
    totalLoginDays: user.totalLoginDays ?? 0,
    loginStreak: user.loginStreak ?? 0,
    lastLoginDate: user.lastLoginDate ?? null,
  };
}

function ensureConfig(config?: Partial<DBConfig>): DBConfig {
  const normalizedLessons = (config?.promptMasterLessons?.length
    ? config.promptMasterLessons
    : defaultConfig.promptMasterLessons
  ).map((lesson) => {
    const legacy = lesson as PromptMasterLesson & { brief?: string; sample?: string };
    return {
      ...lesson,
      situation: lesson.situation ?? legacy.brief ?? "",
      overview: lesson.overview ?? legacy.brief ?? "",
      methodGuide: lesson.methodGuide ?? legacy.sample ?? "",
      practiceChallenge: lesson.practiceChallenge ?? legacy.brief ?? "",
      samplePrompt: lesson.samplePrompt ?? legacy.sample ?? "",
    };
  });

  return {
    promptMasterLessons: normalizedLessons,
    arenaWeekly: config?.arenaWeekly ?? defaultConfig.arenaWeekly,
    auditorScenario: config?.auditorScenario ?? defaultConfig.auditorScenario,
    auditorScenarios:
      config?.auditorScenarios?.length
        ? config.auditorScenarios
        : [config?.auditorScenario ?? defaultConfig.auditorScenario, ...(defaultConfig.auditorScenarios ?? [])],
  };
}

function ensureAdmin(db: DBShape): DBShape {
  db.users = db.users.map((u) => ensureUserStats(u));
  if (!db.users.some((u) => u.isAdmin)) {
    db.users.unshift(adminSeed);
  }

  db.arenaSubmissions = db.arenaSubmissions ?? [];
  db.config = ensureConfig(db.config);
  return db;
}

export async function readDB(): Promise<DBShape> {
  if (global.__blablaDBCache) {
    return ensureAdmin(global.__blablaDBCache);
  }

  const kvData = await readFromVercelKV();
  if (kvData) {
    const parsed = ensureAdmin(kvData);
    global.__blablaDBCache = parsed;
    return parsed;
  }

  try {
    const raw = await fs.readFile(dbPath, "utf-8");
    const parsed = ensureAdmin(JSON.parse(raw) as DBShape);
    global.__blablaDBCache = parsed;
    return parsed;
  } catch {
    const fallback = defaultDB();
    global.__blablaDBCache = fallback;
    return fallback;
  }
}

export async function writeDB(data: DBShape) {
  const normalized = ensureAdmin(data);
  global.__blablaDBCache = normalized;

  const wroteKV = await writeToVercelKV(normalized);

  if (wroteKV) return;

  try {
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    // read-only runtime
  }
}

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

const tokenSecret = process.env.SESSION_SECRET ?? "blabla-dev-secret";

export function createSessionToken(userId: string) {
  const issuedAt = Date.now().toString();
  const payload = `${userId}.${issuedAt}`;
  const signature = crypto.createHmac("sha256", tokenSecret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function readUserIdFromToken(token: string | null) {
  if (!token) return null;
  const [userId, issuedAt, signature] = token.split(".");
  if (!userId || !issuedAt || !signature) return null;

  const payload = `${userId}.${issuedAt}`;
  const expected = crypto.createHmac("sha256", tokenSecret).update(payload).digest("hex");
  if (expected !== signature) return null;

  return userId;
}

export async function getUserFromToken(token: string | null) {
  const userId = readUserIdFromToken(token);
  if (!userId) return null;

  const db = await readDB();
  return db.users.find((u) => u.id === userId) ?? null;
}

export function isConsecutiveLogin(previousDate: string | null, currentDate: string) {
  if (!previousDate) return { sameDay: false, consecutive: false };
  const prev = new Date(previousDate);
  const current = new Date(currentDate);
  const prevDay = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate()).getTime();
  const currDay = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
  const diff = (currDay - prevDay) / (1000 * 60 * 60 * 24);
  return {
    sameDay: diff === 0,
    consecutive: diff === 1,
  };
}
