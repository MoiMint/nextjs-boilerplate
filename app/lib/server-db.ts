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
  price?: number;
  approved?: boolean;
  createdByUserId?: string;
  pendingApproval?: boolean;
};

type ShopItem = {
  id: string;
  name: string;
  image: string;
  price: number;
  effect: string;
  category?: "dashboard-theme" | "dashboard-decoration" | "garden-decoration" | "name-style";
  themeKey?: string | null;
  nameStyleKey?: string | null;
};

type CourseSubmission = {
  id: string;
  title: string;
  topic: string;
  situation: string;
  overview: string;
  methodGuide: string;
  practiceChallenge: string;
  samplePrompt: string;
  creatorUserId: string;
  creatorName: string;
  status: "pending";
  createdAt: string;
};

type ArenaWeeklyChallenge = {
  weekLabel: string;
  title: string;
  inputText: string;
  goldenResponse: string;
};

type ArenaWeeklyReward = {
  rank: number;
  coins: number;
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
  passwordHash: string;
  role: string;
  isAdmin: boolean;
  createdAt: string;
  loginCount: number;
  totalLoginDays: number;
  loginStreak: number;
  lastLoginDate: string | null;
  coins: number;
  unlockedLessonIds: string[];
  ownedItemIds: string[];
  farmPlot: {
    seedType: string | null;
    plantedAt: string | null;
    wateredAt: string | null;
    readyAt: string | null;
    lastHarvestAt: string | null;
  };
  activeDashboardTheme?: string | null;
  activeNameStyle?: string | null;
  mutedUntil?: string | null;
  bannedUntil?: string | null;
};

export type DBSession = {
  id: string;
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
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
  status?: "active" | "hidden" | "deleted";
  moderation?: {
    reportedCount: number;
    lastReportedAt: string | null;
    hiddenAt: string | null;
    hiddenByUserId: string | null;
    deletedAt: string | null;
    deletedByUserId: string | null;
  };
  type?: "message" | "coin-gift" | "system";
  gift?: {
    totalCoins: number;
    maxReceivers: number;
    perReceiver: number;
    claimedUserIds: string[];
    creatorUserName: string;
  };
};

export type DBPostReport = {
  id: string;
  postId: string;
  postOwnerId: string;
  reporterUserId: string;
  reporterName: string;
  reason: string;
  status: "pending" | "resolved" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  adminNote: string | null;
};

export type DBFeedback = {
  id: string;
  userId: string;
  userName: string;
  message: string;
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
  arenaWeeklyRewards?: ArenaWeeklyReward[];
  shopItems: ShopItem[];
  courseSubmissions: CourseSubmission[];
  createCourseFee: number;
};

export type DBShape = {
  users: DBUser[];
  sessions: DBSession[];
  histories: DBHistory[];
  posts: DBPost[];
  postReports?: DBPostReport[];
  feedbacks: DBFeedback[];
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
    {
      id: "pm-3",
      title: "Phân tích phản hồi khách hàng theo chủ đề",
      topic: "Data & Insight",
      situation: "Bạn có 120 phản hồi sau sự kiện, đội vận hành cần biết 5 vấn đề nổi bật trong 1 giờ.",
      overview: "Bài học giúp bạn thiết kế prompt để AI phân nhóm phản hồi, trích dẫn câu đại diện và đề xuất ưu tiên xử lý.",
      methodGuide: "Áp dụng cấu trúc: Input schema rõ ràng, quy tắc gom nhóm, giới hạn số nhóm, và format output dạng bảng có độ ưu tiên.",
      practiceChallenge: "Viết prompt để AI phân loại phản hồi thành tối đa 5 nhóm, mỗi nhóm có tỷ lệ %, ví dụ trích dẫn và đề xuất hành động.",
      samplePrompt: "Bạn là CX Analyst. Hãy phân loại danh sách phản hồi thành tối đa 5 nhóm vấn đề, trả về bảng: Nhóm | Tỷ lệ | 2 câu trích dẫn | Hành động ưu tiên trong 7 ngày.",
    },
    {
      id: "pm-4",
      title: "Soạn SOP onboarding nhân sự mới",
      topic: "Vận hành nhân sự",
      situation: "Công ty tuyển liên tục nhưng onboarding chưa nhất quán, người mới thường thiếu thông tin trong tuần đầu.",
      overview: "Bạn học cách viết prompt để AI tạo SOP onboarding theo timeline ngày 1-3-7-14 và checklist theo vai trò.",
      methodGuide: "Nêu rõ vai trò người dùng, đầu ra bắt buộc (timeline/checklist/owner), tiêu chí đo lường hoàn thành, và giọng văn ngắn gọn dễ thực thi.",
      practiceChallenge: "Viết prompt tạo SOP onboarding cho vị trí Sales Executive trong 14 ngày, có checklist và KPI hoàn thành.",
      samplePrompt: "Đóng vai HR Operations Lead. Tạo SOP onboarding 14 ngày cho Sales Executive gồm: mục tiêu từng mốc, checklist công việc, người chịu trách nhiệm, KPI pass/fail.",
    },
    {
      id: "pm-5",
      title: "Thiết kế tutor AI chấm bài tự luận",
      topic: "Giáo dục",
      situation: "Giáo viên cần chấm 80 bài tự luận nhanh nhưng vẫn nhất quán rubric và có feedback cá nhân hóa.",
      overview: "Bài học hướng dẫn tạo prompt để AI chấm theo rubric, chỉ ra điểm mạnh/yếu và gợi ý cải thiện theo từng học sinh.",
      methodGuide: "Đưa rubric có trọng số, quy tắc không bịa thông tin, yêu cầu trích dẫn câu trong bài làm, output JSON dễ lưu trữ.",
      practiceChallenge: "Viết prompt chấm bài tự luận thang 100 theo 4 tiêu chí, trả điểm từng tiêu chí + feedback cụ thể + đề xuất học tiếp.",
      samplePrompt: "Bạn là trợ giảng môn Ngữ văn. Chấm bài theo rubric (Bố cục 20, Luận điểm 30, Dẫn chứng 30, Diễn đạt 20), trả JSON gồm điểm chi tiết, nhận xét mạnh/yếu và 3 hành động cải thiện.",
    },
    {
      id: "pm-6",
      title: "Tạo kế hoạch nội dung TikTok 30 ngày",
      topic: "Marketing nội dung",
      situation: "Team marketing cần lịch nội dung 30 ngày nhưng thiếu ý tưởng theo phễu awareness-consideration-conversion.",
      overview: "Bạn sẽ tạo prompt để AI đề xuất lịch đăng, góc nội dung, CTA và chỉ số theo dõi cho từng video.",
      methodGuide: "Chỉ định audience, mục tiêu kênh, trụ cột nội dung, định dạng output theo bảng ngày/chủ đề/hook/CTA/KPI, và ràng buộc tính khả thi sản xuất.",
      practiceChallenge: "Viết prompt tạo content plan 30 ngày cho thương hiệu skincare, có hook 3 giây đầu và KPI chính cho từng bài.",
      samplePrompt: "Bạn là Content Strategist TikTok. Lập kế hoạch 30 ngày cho brand skincare tuổi 18-24 theo 3 tầng phễu. Output bảng: Ngày | Chủ đề | Hook 3s | Kịch bản 30-45s | CTA | KPI chính.",
    },
  ],
  arenaWeekly: {
    weekLabel: "Tuần 1",
    title: "Trích xuất số điện thoại",
    inputText: "Liên hệ: 0901234567, 0911222333, hotline 02873009999.",
    goldenResponse: '["0901234567","0911222333","02873009999"]',
  },
  arenaWeeklyRewards: [
    { rank: 1, coins: 500 },
    { rank: 2, coins: 350 },
    { rank: 3, coins: 250 },
    { rank: 4, coins: 180 },
    { rank: 5, coins: 120 },
  ],
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
  shopItems: [
    { id: "item-theme-pink", name: "Sơn hồng dashboard", image: "🎨", price: 180, effect: "Đổi dashboard sang chủ đề hồng", category: "dashboard-theme", themeKey: "pink" },
    { id: "item-theme-ocean", name: "Sơn đại dương", image: "🌊", price: 220, effect: "Đổi dashboard sang chủ đề đại dương", category: "dashboard-theme", themeKey: "ocean" },
    { id: "item-theme-violet", name: "Sơn tím galaxy", image: "🪐", price: 260, effect: "Đổi dashboard sang chủ đề tím", category: "dashboard-theme", themeKey: "violet" },
    { id: "item-name-rainbow", name: "Tên cầu vồng", image: "🌈", price: 300, effect: "Màu tên gradient đổi liên tục", category: "name-style", nameStyleKey: "rainbow" },
    { id: "item-name-fire", name: "Tên lửa", image: "🔥", price: 280, effect: "Màu tên đỏ-cam nổi bật", category: "name-style", nameStyleKey: "fire" },
    { id: "item-name-ocean", name: "Tên đại dương", image: "🌊", price: 280, effect: "Màu tên xanh chuyển động", category: "name-style", nameStyleKey: "ocean" },
    { id: "item-neon-frame", name: "Viền neon", image: "💠", price: 140, effect: "Trang trí dashboard", category: "dashboard-decoration", themeKey: null },
    { id: "item-sakura-wall", name: "Tường hoa sakura", image: "🌸", price: 210, effect: "Trang trí dashboard", category: "dashboard-decoration", themeKey: null },
    { id: "item-garden-lamp", name: "Đèn lối đi vườn", image: "🏮", price: 160, effect: "Trang trí khu vườn", category: "garden-decoration", themeKey: null },
    { id: "item-garden-lantern", name: "Đèn lồng lễ hội", image: "🏮", price: 190, effect: "Trang trí khu vườn", category: "garden-decoration", themeKey: null },
    { id: "item-garden-fountain", name: "Đài phun nước mini", image: "⛲", price: 260, effect: "Trang trí khu vườn", category: "garden-decoration", themeKey: null },
  ],
  courseSubmissions: [],
  createCourseFee: 150,
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
    {
      title: "Bắt lỗi SQL và bảo mật dữ liệu",
      wrongAnswer:
        "Hãy chạy câu SQL: SELECT * FROM users WHERE email = 'a@b.com' OR 1=1; để kiểm tra nhanh toàn bộ tài khoản.",
      requiredIssues: [
        "Có dấu hiệu SQL injection (OR 1=1)",
        "Không được truy vấn toàn bộ dữ liệu người dùng trái mục đích",
      ],
    },
    {
      title: "Bắt lỗi tài chính doanh nghiệp",
      wrongAnswer:
        "Lợi nhuận ròng = Doanh thu + Chi phí vận hành, nên tháng này công ty càng tốn chi phí càng lời.",
      requiredIssues: [
        "Công thức đúng là Lợi nhuận ròng = Doanh thu - Tổng chi phí",
        "Chi phí tăng không đồng nghĩa lợi nhuận tăng",
      ],
    },
    {
      title: "Bắt lỗi tư vấn pháp lý mơ hồ",
      wrongAnswer:
        "Bạn cứ sao chép nguyên điều khoản đối thủ vì trên internet ai cũng dùng như nhau, không cần kiểm tra pháp lý.",
      requiredIssues: [
        "Không thể sao chép điều khoản pháp lý của đơn vị khác một cách máy móc",
        "Cần khuyến nghị tham vấn bộ phận pháp chế/luật sư",
      ],
    },
    {
      title: "Bắt lỗi phân tích A/B testing",
      wrongAnswer:
        "Biến thể B có 51 click và A có 49 click, vậy chắc chắn B tốt hơn và có ý nghĩa thống kê tuyệt đối.",
      requiredIssues: [
        "Chênh lệch nhỏ chưa đủ kết luận ý nghĩa thống kê",
        "Cần kiểm tra cỡ mẫu, p-value hoặc độ tin cậy trước khi kết luận",
      ],
    },
    {
      title: "Bắt lỗi định hướng sản phẩm",
      wrongAnswer:
        "Vì 3 người dùng đầu tiên thích tính năng mới nên chúng ta nên bỏ toàn bộ roadmap cũ ngay lập tức.",
      requiredIssues: [
        "Mẫu 3 người dùng là quá nhỏ để quyết định chiến lược",
        "Cần kết hợp dữ liệu định lượng/định tính trước khi đổi roadmap",
      ],
    },
  ],
};

const adminSeed: DBUser = {
  id: "admin-seed",
  name: "Admin Blabla",
  email: "admin@blabla.ai",
  passwordHash: "scrypt$01010101010101010101010101010101$abd8129e5c37cfaee19872c3bc74909da46c758f98bc04c612eed5b277951d58b85154faa1b3ffd6dbc8dbcaa8d89ab7f94ef5c264806c6572bcb2dd6bd4a36b",
  role: "admin",
  isAdmin: true,
  createdAt: new Date(0).toISOString(),
  loginCount: 0,
  totalLoginDays: 0,
  loginStreak: 0,
  lastLoginDate: null,
  coins: 1000,
  unlockedLessonIds: [],
  ownedItemIds: [],
  farmPlot: {
    seedType: null,
    plantedAt: null,
    wateredAt: null,
    readyAt: null,
    lastHarvestAt: null,
  },
  activeDashboardTheme: null,
  activeNameStyle: null,
  mutedUntil: null,
  bannedUntil: null,
};

const defaultDB = (): DBShape => ({
  users: [adminSeed],
  sessions: [],
  histories: [],
  posts: [],
  postReports: [],
  feedbacks: [],
  arenaSubmissions: [],
  config: defaultConfig,
});

declare global {
  var __blablaDBCache: DBShape | undefined;
}

function ensureUserStats(user: Partial<DBUser>): DBUser {
  const legacyPassword = (user as Partial<DBUser> & { password?: string }).password;
  return {
    id: user.id ?? "",
    name: user.name ?? "",
    email: user.email ?? "",
    passwordHash: user.passwordHash ?? legacyPassword ?? "",
    role: user.role ?? "office",
    isAdmin: user.isAdmin ?? false,
    createdAt: user.createdAt ?? new Date().toISOString(),
    loginCount: user.loginCount ?? 0,
    totalLoginDays: user.totalLoginDays ?? 0,
    loginStreak: user.loginStreak ?? 0,
    lastLoginDate: user.lastLoginDate ?? null,
    coins: user.coins ?? 0,
    unlockedLessonIds: user.unlockedLessonIds ?? [],
    ownedItemIds: user.ownedItemIds ?? [],
    farmPlot: user.farmPlot ?? {
      seedType: null,
      plantedAt: null,
      wateredAt: null,
      readyAt: null,
      lastHarvestAt: null,
    },
    activeDashboardTheme: user.activeDashboardTheme ?? null,
    activeNameStyle: user.activeNameStyle ?? null,
    mutedUntil: user.mutedUntil ?? null,
    bannedUntil: user.bannedUntil ?? null,
  };
}

const HASH_PREFIX = "scrypt";

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
  return `${HASH_PREFIX}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [prefix, saltHex, keyHex] = passwordHash.split("$");
  if (prefix !== HASH_PREFIX || !saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const key = Buffer.from(keyHex, "hex");
  const testKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, key.length, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });

  if (testKey.length !== key.length) return false;
  return crypto.timingSafeEqual(testKey, key);
}

async function migrateLegacyPasswords(db: DBShape): Promise<boolean> {
  let hasChanges = false;
  for (const user of db.users as Array<DBUser & { password?: string }>) {
    if (typeof user.password === "string") {
      user.passwordHash = await hashPassword(user.password);
      delete user.password;
      hasChanges = true;
      continue;
    }

    if (!user.passwordHash) {
      user.passwordHash = await hashPassword(crypto.randomUUID());
      hasChanges = true;
      continue;
    }

    const isCurrentHash = user.passwordHash.startsWith(`${HASH_PREFIX}$`);
    if (!isCurrentHash) {
      user.passwordHash = await hashPassword(user.passwordHash);
      hasChanges = true;
    }
  }

  return hasChanges;
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
      price: lesson.price ?? 0,
      approved: lesson.approved ?? true,
      pendingApproval: lesson.pendingApproval ?? false,
      createdByUserId: lesson.createdByUserId ?? "",
    };
  });

  const mergedShopItems = [
    ...(config?.shopItems ?? []),
    ...defaultConfig.shopItems,
  ];
  const uniqueShopItems = mergedShopItems
    .filter((item) => !!item?.id)
    .reduce<ShopItem[]>((acc, item) => {
      if (acc.some((existing) => existing.id === item.id)) return acc;
      acc.push({
        ...item,
        name: item.name ?? "Vật phẩm",
        image: item.image ?? "🧩",
        price: Math.max(1, Number(item.price ?? 1)),
        effect: item.effect ?? "Trang trí",
        category: item.category ?? "dashboard-decoration",
        themeKey: item.themeKey ?? null,
      });
      return acc;
    }, []);

  return {
    promptMasterLessons: normalizedLessons,
    arenaWeekly: config?.arenaWeekly ?? defaultConfig.arenaWeekly,
    auditorScenario: config?.auditorScenario ?? defaultConfig.auditorScenario,
    auditorScenarios:
      config?.auditorScenarios?.length
        ? config.auditorScenarios
        : [config?.auditorScenario ?? defaultConfig.auditorScenario, ...(defaultConfig.auditorScenarios ?? [])],
    arenaWeeklyRewards:
      config?.arenaWeeklyRewards?.length
        ? config.arenaWeeklyRewards
            .filter((item) => Number(item?.rank) > 0)
            .sort((a, b) => a.rank - b.rank)
            .map((item) => ({ rank: Math.floor(item.rank), coins: Math.max(0, Math.floor(item.coins ?? 0)) }))
        : defaultConfig.arenaWeeklyRewards,
    shopItems: uniqueShopItems,
    courseSubmissions: config?.courseSubmissions ?? [],
    createCourseFee: config?.createCourseFee ?? defaultConfig.createCourseFee,
  };
}

function ensureAdmin(db: DBShape): DBShape {
  db.users = db.users.map((u) => ensureUserStats(u));
  if (!db.users.some((u) => u.isAdmin)) {
    db.users.unshift(adminSeed);
  }

  db.feedbacks = db.feedbacks ?? [];
  db.sessions = (db.sessions ?? []).map((session) => {
    const createdAt = session.createdAt ?? new Date().toISOString();
    const expiresAt =
      session.expiresAt ?? new Date(new Date(createdAt).getTime() + 1000 * 60 * 60 * 24 * 7).toISOString();

    return {
      ...session,
      id: session.id ?? newId("sess"),
      createdAt,
      expiresAt,
      revokedAt: session.revokedAt ?? null,
    };
  });
  db.arenaSubmissions = db.arenaSubmissions ?? [];
  db.posts = (db.posts ?? []).map((post) => ({
    ...post,
    status: post.status ?? "active",
    moderation: {
      reportedCount: post.moderation?.reportedCount ?? 0,
      lastReportedAt: post.moderation?.lastReportedAt ?? null,
      hiddenAt: post.moderation?.hiddenAt ?? null,
      hiddenByUserId: post.moderation?.hiddenByUserId ?? null,
      deletedAt: post.moderation?.deletedAt ?? null,
      deletedByUserId: post.moderation?.deletedByUserId ?? null,
    },
    type: post.type ?? "message",
    gift: post.gift
      ? {
          ...post.gift,
          claimedUserIds: post.gift.claimedUserIds ?? [],
          creatorUserName: post.gift.creatorUserName ?? post.userName,
        }
      : undefined,
  }));
  db.postReports = db.postReports ?? [];
  db.config = ensureConfig(db.config);
  return db;
}

export async function readDB(): Promise<DBShape> {
  const kvData = await readFromVercelKV();
  if (kvData) {
    const parsed = ensureAdmin(kvData);
    const migrated = await migrateLegacyPasswords(parsed);
    if (migrated) await writeDB(parsed);
    global.__blablaDBCache = parsed;
    return parsed;
  }

  try {
    const raw = await fs.readFile(dbPath, "utf-8");
    const parsed = ensureAdmin(JSON.parse(raw) as DBShape);
    const migrated = await migrateLegacyPasswords(parsed);
    if (migrated) await writeDB(parsed);
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

export function createSessionToken(userId: string, sessionId: string) {
  const issuedAt = Date.now().toString();
  const payload = `${userId}.${sessionId}.${issuedAt}`;
  const signature = crypto.createHmac("sha256", tokenSecret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function readUserIdFromToken(token: string | null) {
  if (!token) return null;
  const [userId, sessionId, issuedAt, signature] = token.split(".");
  if (!userId || !sessionId || !issuedAt || !signature) return null;

  const payload = `${userId}.${sessionId}.${issuedAt}`;
  const expected = crypto.createHmac("sha256", tokenSecret).update(payload).digest("hex");
  if (expected !== signature) return null;

  return userId;
}

export async function getUserFromToken(token: string | null) {
  if (!token) return null;

  const [userId, sessionId, issuedAt, signature] = token.split(".");
  if (!userId || !sessionId || !issuedAt || !signature) return null;

  const payload = `${userId}.${sessionId}.${issuedAt}`;
  const expected = crypto.createHmac("sha256", tokenSecret).update(payload).digest("hex");
  if (expected !== signature) return null;

  const db = await readDB();
  const session = db.sessions.find((s) => s.id === sessionId && s.token === token && s.userId === userId);
  if (!session) return null;
  if (session.revokedAt) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) return null;

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
