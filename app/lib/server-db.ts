import { promises as fs } from "node:fs";
import path from "node:path";

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

export async function readDB(): Promise<DBShape> {
  const raw = await fs.readFile(dbPath, "utf-8");
  return JSON.parse(raw) as DBShape;
}

export async function writeDB(data: DBShape) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf-8");
}

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export async function getUserFromToken(token: string | null) {
  if (!token) return null;
  const db = await readDB();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  return db.users.find((u) => u.id === session.userId) ?? null;
}
