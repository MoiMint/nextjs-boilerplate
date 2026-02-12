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

const defaultDB = (): DBShape => ({
  users: [
    {
      id: "admin-seed",
      name: "Admin Blabla",
      email: "admin@blabla.ai",
      password: "123456",
      role: "admin",
      isAdmin: true,
      createdAt: new Date(0).toISOString(),
    },
  ],
  sessions: [],
  histories: [],
  posts: [],
});

declare global {
  var __blablaDBCache: DBShape | undefined;
}

function ensureAdmin(db: DBShape): DBShape {
  if (!db.users.some((u) => u.isAdmin)) {
    db.users.unshift(defaultDB().users[0]);
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
    // Môi trường read-only/serverless vẫn giữ dữ liệu trong memory của instance hiện tại.
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
