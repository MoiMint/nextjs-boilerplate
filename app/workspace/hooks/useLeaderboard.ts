import { useCallback, useState } from "react";

type LeaderboardEntry = { userName: string; bestScore: number; avgScore: number; attempts: number; efficiency: string };

export const useLeaderboard = (authHeaders: HeadersInit) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const loadLeaderboard = useCallback(async () => {
    const res = await fetch("/api/leaderboard", { headers: authHeaders });
    if (!res.ok) return;
    const data = (await res.json()) as { leaderboard?: LeaderboardEntry[] };
    setLeaderboard(data.leaderboard ?? []);
  }, [authHeaders]);

  return { leaderboard, setLeaderboard, loadLeaderboard };
};
