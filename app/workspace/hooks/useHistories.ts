import { useCallback, useState } from "react";
import type { HistoryItem } from "../types";

export const useHistories = (authHeaders: HeadersInit) => {
  const [histories, setHistories] = useState<HistoryItem[]>([]);

  const loadHistories = useCallback(async () => {
    const res = await fetch("/api/history", { headers: authHeaders });
    const data = (await res.json()) as { items?: HistoryItem[] };
    setHistories(data.items ?? []);
  }, [authHeaders]);

  return { histories, setHistories, loadHistories };
};
