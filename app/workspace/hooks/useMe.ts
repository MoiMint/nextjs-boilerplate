import { useCallback, useState } from "react";
import type { User } from "../types";

export const useMe = (authHeaders: HeadersInit) => {
  const [me, setMe] = useState<User | null>(null);

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/me", { headers: authHeaders });
    if (res.status === 401) return null;
    const data = (await res.json()) as User;
    setMe(data);
    return data;
  }, [authHeaders]);

  return { me, setMe, loadMe };
};
