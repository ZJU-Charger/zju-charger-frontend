import { useCallback, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "@/lib/config";
import type { StationRecord } from "@/types/station";

export interface WatchlistState {
  deviceKeys: Set<string>;
  names: Set<string>;
  stationHashes: Set<string>;
}

function createEmptyWatchlistState(): WatchlistState {
  return {
    deviceKeys: new Set(),
    names: new Set(),
    stationHashes: new Set(),
  };
}

function parseWatchlist(): WatchlistState {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return createEmptyWatchlistState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.watchlist);
    if (!raw) {
      return createEmptyWatchlistState();
    }
    const payload = JSON.parse(raw) as {
      devids?: Array<{ devid: number | string; provider: string }>;
      devdescripts?: string[];
      station_hashes?: Array<string | number>;
    };
    const deviceKeys = new Set<string>();
    payload.devids?.forEach((item) => {
      if (!item?.devid || !item.provider) return;
      deviceKeys.add(`${item.devid}:${item.provider}`);
    });
    const stationHashes = new Set<string>();
    payload.station_hashes?.forEach((hash) => {
      if (!hash) return;
      stationHashes.add(String(hash));
    });
    return {
      deviceKeys,
      names: new Set(payload.devdescripts || []),
      stationHashes,
    };
  } catch (error) {
    console.warn("无法解析本地关注列表", error);
    return createEmptyWatchlistState();
  }
}

function persistWatchlist(state: WatchlistState) {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  const payload = {
    devids: Array.from(state.deviceKeys).map((key) => {
      const [devid, provider] = key.split(":");
      return { devid: Number.parseInt(devid, 10) || devid, provider };
    }),
    devdescripts: Array.from(state.names),
    station_hashes: Array.from(state.stationHashes),
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(payload));
}

export function useWatchlist() {
  const [state, setState] = useState<WatchlistState>(() =>
    createEmptyWatchlistState(),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(parseWatchlist());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistWatchlist(state);
  }, [hydrated, state]);

  const isWatched = useCallback(
    (station: StationRecord) => {
      const hasDevice = station.devids.some((id) =>
        state.deviceKeys.has(`${id}:${station.provider}`),
      );
      if (hasDevice) return true;
      if (station.name && state.names.has(station.name)) return true;
      return false;
    },
    [state],
  );

  const toggleWatch = useCallback((station: StationRecord) => {
    setState((prev) => {
      const next: WatchlistState = {
        deviceKeys: new Set(prev.deviceKeys),
        names: new Set(prev.names),
        stationHashes: new Set(prev.stationHashes),
      };
      const deviceKeys = station.devids.map(
        (id) => `${id}:${station.provider}`,
      );
      const matched =
        deviceKeys.some((key) => next.deviceKeys.has(key)) ||
        next.names.has(station.name);
      if (matched) {
        deviceKeys.forEach((key) => {
          next.deviceKeys.delete(key);
        });
        next.names.delete(station.name);
        if (station.hashId) {
          next.stationHashes.delete(station.hashId);
        }
      } else {
        if (deviceKeys.length > 0) {
          deviceKeys.forEach((key) => {
            next.deviceKeys.add(key);
          });
        } else if (station.name) {
          next.names.add(station.name);
        }
        if (station.hashId) {
          next.stationHashes.add(station.hashId);
        }
      }
      return next;
    });
  }, []);

  const reload = useCallback(() => {
    setState(parseWatchlist());
  }, []);

  const counts = useMemo(
    () => ({
      deviceCount: state.deviceKeys.size,
      nameCount: state.names.size,
      stationCount: state.stationHashes.size,
    }),
    [state],
  );

  return { watchlist: state, isWatched, toggleWatch, reload, counts };
}
