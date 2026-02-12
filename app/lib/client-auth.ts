export type User = {
  name: string;
  email: string;
  password: string;
  role: string;
  isAdmin?: boolean;
  createdAt: string;
};

export type Session = {
  email: string;
  name: string;
  role: string;
  isAdmin?: boolean;
  loggedAt: string;
};

export const USERS_KEY = "blabla-users";
export const SESSION_KEY = "blabla-session";
export const HISTORY_KEY = "blabla-history";

export const DEFAULT_ADMIN: User = {
  name: "Admin Blabla",
  email: "admin@blabla.ai",
  password: "123456",
  role: "admin",
  isAdmin: true,
  createdAt: new Date(0).toISOString(),
};

export function getUsers(): User[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(USERS_KEY);
  let users: User[] = [];

  if (raw) {
    try {
      users = JSON.parse(raw) as User[];
    } catch {
      users = [];
    }
  }

  const hasAdmin = users.some((user) => user.isAdmin || user.role === "admin");
  if (!hasAdmin) {
    users = [DEFAULT_ADMIN, ...users];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  return users;
}

export function saveUsers(users: User[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
