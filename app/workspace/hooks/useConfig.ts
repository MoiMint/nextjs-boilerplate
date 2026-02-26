import { useCallback, useState } from "react";
import type { AppConfig } from "../types";

export const useConfig = (authHeaders: HeadersInit) => {
  const [config, setConfig] = useState<AppConfig | null>(null);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/config", { headers: authHeaders });
    if (!res.ok) return;
    const data = (await res.json()) as AppConfig;
    setConfig(data);
  }, [authHeaders]);

  return { config, setConfig, loadConfig };
};
