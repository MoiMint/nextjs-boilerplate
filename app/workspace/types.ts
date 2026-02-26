export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  createdAt?: string;
  loginCount?: number;
  totalLoginDays?: number;
  loginStreak?: number;
  lastLoginDate?: string | null;
  stats?: { historyCount: number; postCount: number; lastSessionAt: string | null };
  coins?: number;
  unlockedLessonIds?: string[];
  ownedItemIds?: string[];
  farmPlot?: {
    seedType: string | null;
    plantedAt: string | null;
    wateredAt: string | null;
    readyAt: string | null;
    lastHarvestAt: string | null;
  };
  activeDashboardTheme?: string | null;
  activeNameStyle?: string | null;
};

export type HistoryItem = { id: string; type?: "master" | "arena" | "auditor"; title: string; score: number; feedback: string; createdAt: string };

export type Post = {
  id: string;
  userName: string;
  content: string;
  createdAt: string;
  userRole?: string;
  activeNameStyle?: string | null;
  type?: "message" | "coin-gift" | "system";
  gift?: {
    totalCoins: number;
    maxReceivers: number;
    perReceiver: number;
    claimedUserIds: string[];
    creatorUserName: string;
  };
};

export type FeedbackItem = {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
};

export type PromptMasterLesson = {
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
  pendingApproval?: boolean;
  createdByUserId?: string;
};

export type ShopItem = {
  id: string;
  name: string;
  image: string;
  price: number;
  effect: string;
  category?: "dashboard-theme" | "dashboard-decoration" | "garden-decoration" | "name-style";
  themeKey?: string | null;
  nameStyleKey?: string | null;
};

export type CourseSubmission = {
  id: string;
  title: string;
  topic: string;
  creatorName: string;
  status: "pending";
};

export type SeedSpec = { id: string; name: string; price: number; reward: number; growHours: number };

export type ArenaWeekly = {
  weekLabel: string;
  title: string;
  inputText: string;
  goldenResponse: string;
};

export type AuditorScenario = {
  title: string;
  wrongAnswer: string;
  requiredIssues: string[];
};

export type ArenaWeeklyReward = {
  rank: number;
  coins: number;
};

export type AppConfig = {
  promptMasterLessons: PromptMasterLesson[];
  arenaWeekly: ArenaWeekly;
  auditorScenario: AuditorScenario;
  auditorScenarios?: AuditorScenario[];
  arenaWeeklyRewards?: ArenaWeeklyReward[];
  shopItems: ShopItem[];
  courseSubmissions: CourseSubmission[];
  createCourseFee: number;
};
