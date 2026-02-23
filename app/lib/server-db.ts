import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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
};

export type DBPost = {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
};

export type DBShape = {
  users: DBUser[];
  sessions: DBSession[];
  histories: DBHistory[];
  posts: DBPost[];
};

const dbPath = path.join(process.cwd(), "data", "db.json");

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

function ensureAdmin(db: DBShape): DBShape {
  db.users = db.users.map((u) => ensureUserStats(u));
  if (!db.users.some((u) => u.isAdmin)) {
    db.users.unshift(adminSeed);
  }
  return db;
}

export async function readDB(): Promise<DBShape> {
  if (global.__blablaDBCache) {
    return ensureAdmin(global.__blablaDBCache);
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
