import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import {
  fetchStationsMetadata,
  fetchStatus,
  mergeStations,
  RateLimitError,
} from "@/lib/api";
import { CAMPUS_LIST } from "@/lib/config";
import type { CampusId, StationRecord } from "@/types/station";

export interface SummaryItem {
  campusId: CampusId;
  campusName: string;
  total: number;
  free: number;
  used: number;
  error: number;
}

export interface UseStationsResult {
  loading: boolean;
  error: string | null;
  rateLimited: boolean;
  updatedAt?: string;
  stations: StationRecord[];
  mapStations: StationRecord[];
  campusStations: StationRecord[];
  summary: SummaryItem[];
  refresh: () => Promise<void>;
}

export function useStations(
  providerId: string,
  campusId: CampusId,
): UseStationsResult {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["stations", providerId || "all"],
    queryFn: async () => {
      const [status, metadata] = await Promise.all([
        fetchStatus(providerId || undefined),
        fetchStationsMetadata(),
      ]);
      const merged = mergeStations(
        status.stations || [],
        metadata.stations || [],
        providerId || undefined,
      );
      return {
        stations: merged,
        updatedAt: status.updated_at || metadata.updated_at,
      };
    },
    refetchOnWindowFocus: false,
  });

  const stations = data?.stations ?? [];
  const updatedAt = data?.updatedAt;

  const refresh = useCallback(async () => {
    await refetch({ throwOnError: false });
  }, [refetch]);

  const campusStations = useMemo(() => {
    if (!campusId) return stations;
    return stations.filter((station) => station.campusId === campusId);
  }, [stations, campusId]);

  const mapStations = useMemo(() => {
    if (!campusId) return stations;
    return stations.filter((station) => station.campusId === campusId);
  }, [stations, campusId]);

  const summary = useMemo(() => {
    return CAMPUS_LIST.map((campus) => {
      const scoped = stations.filter(
        (station) => station.campusId === campus.id,
      );
      return {
        campusId: campus.id,
        campusName: campus.name,
        total: scoped.length,
        free: scoped.reduce((sum, station) => sum + station.free, 0),
        used: scoped.reduce((sum, station) => sum + station.used, 0),
        error: scoped.reduce((sum, station) => sum + station.error, 0),
      } satisfies SummaryItem;
    });
  }, [stations]);

  return {
    loading: isPending || isFetching,
    error: error
      ? error instanceof Error
        ? error.message
        : "加载数据失败"
      : null,
    rateLimited: error instanceof RateLimitError,
    updatedAt,
    stations,
    mapStations,
    campusStations,
    summary,
    refresh,
  };
}
