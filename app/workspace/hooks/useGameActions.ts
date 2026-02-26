import { useState } from "react";

type Deps = {
  authHeaders: HeadersInit;
  loadConfig: () => Promise<void>;
  loadMe: () => Promise<unknown>;
};

export const useGameActions = ({ authHeaders, loadConfig, loadMe }: Deps) => {
  const [gameActionLoading, setGameActionLoading] = useState(false);

  const patchConfig = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string; message?: string };
    if (!res.ok) throw new Error(data.error ?? "Không thực hiện được thao tác config.");
    await loadConfig();
    await loadMe();
    return data;
  };

  const runGameAction = async (payload: Record<string, unknown>) => {
    setGameActionLoading(true);
    try {
      const res = await fetch("/api/game", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; coinReward?: number };
      if (!res.ok) throw new Error(data.error ?? "Không thực hiện được hành động.");
      await loadMe();
      await loadConfig();
      return data;
    } finally {
      setGameActionLoading(false);
    }
  };

  return { patchConfig, runGameAction, gameActionLoading };
};
