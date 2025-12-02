import { useEffect, useState } from "react";
import { fetchConfig } from "@/lib/api";
import { DEFAULT_FETCH_INTERVAL } from "@/lib/config";

const envRefresh = Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL ?? "");
const ENV_INTERVAL =
  Number.isFinite(envRefresh) && envRefresh > 0 ? envRefresh : null;

export function useConfig() {
  const [intervalSeconds, setIntervalSeconds] = useState(
    ENV_INTERVAL ?? DEFAULT_FETCH_INTERVAL,
  );

  useEffect(() => {
    if (ENV_INTERVAL) {
      return;
    }
    let cancelled = false;
    async function loadConfig() {
      try {
        const seconds = await fetchConfig();
        if (!cancelled && seconds > 0) {
          setIntervalSeconds(seconds);
        }
      } catch (error) {
        console.warn("加载配置失败，使用默认刷新频率", error);
      }
    }
    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  return intervalSeconds;
}
