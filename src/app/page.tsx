"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Footer } from "@/components/footer";
import { HeaderBar } from "@/components/header-bar";
import { MapView } from "@/components/map-view";
import { NightNotice } from "@/components/night-notice";
import { ProviderSelect } from "@/components/provider-select";
import { RateLimitToast } from "@/components/rate-limit-toast";
import { StationList } from "@/components/station-list";
import { SummaryGrid } from "@/components/summary-grid";
import { Card } from "@/components/ui/card";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useConfig } from "@/hooks/use-config";
import { useProviders } from "@/hooks/use-providers";
import { useRealtimeLocation } from "@/hooks/use-realtime-location";
import { useStations } from "@/hooks/use-stations";
import { useThemeMode } from "@/hooks/use-theme-mode";
import { useWatchlist } from "@/hooks/use-watchlist";
import { CAMPUS_LIST } from "@/lib/config";
import { distanceBetween } from "@/lib/geo";
import type { CampusId, StationRecord } from "@/types/station";

export default function HomePage() {
  const ALL_PROVIDERS = "all";
  const [campusId, setCampusId] = useState<CampusId>("");
  const [providerId, setProviderId] = useState(ALL_PROVIDERS);
  const { theme, toggleTheme } = useThemeMode();
  const [autoSelectionDone, setAutoSelectionDone] = useState(false);
  const { providers } = useProviders();
  const { watchlist, isWatched, toggleWatch } = useWatchlist();
  const stationsState = useStations(
    providerId === ALL_PROVIDERS ? "" : providerId,
    campusId,
  );
  const refreshInterval = useConfig();
  const [focusStation, setFocusStation] = useState<StationRecord | null>(null);
  const {
    point: userLocation,
    watching,
    start,
    stop,
  } = useRealtimeLocation({
    onError: (message) => toast.error(message),
  });

  const handleRefresh = useCallback(() => {
    void stationsState.refresh();
  }, [stationsState]);

  useAutoRefresh(handleRefresh, refreshInterval);

  const watchlistCount = useMemo(
    () => watchlist.deviceKeys.size + watchlist.names.size,
    [watchlist],
  );

  const handleCampusSelect = useCallback((id: CampusId) => {
    setAutoSelectionDone(true);
    setCampusId((prev) => (prev === id ? "" : id));
    setFocusStation(null);
  }, []);

  const handleStationSelect = useCallback(
    (station: StationRecord) => {
      setFocusStation(station);
      if (station.campusId && station.campusId !== campusId) {
        setAutoSelectionDone(true);
        setCampusId(station.campusId);
      }
    },
    [campusId],
  );

  useEffect(() => {
    if (autoSelectionDone) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCampusId("1");
      setAutoSelectionDone(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        let nearest = CAMPUS_LIST[0];
        let minDist = Number.POSITIVE_INFINITY;
        CAMPUS_LIST.forEach((campus) => {
          const [lng, lat] = campus.center;
          const dist = distanceBetween(longitude, latitude, lng, lat);
          if (dist < minDist) {
            minDist = dist;
            nearest = campus;
          }
        });
        setCampusId(nearest.id);
        setAutoSelectionDone(true);
      },
      () => {
        setCampusId("1");
        setAutoSelectionDone(true);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [autoSelectionDone]);

  return (
    <div className="min-h-screen bg-background">
      <RateLimitToast
        visible={stationsState.rateLimited}
        message={stationsState.error}
      />
      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <HeaderBar
          lastUpdated={stationsState.updatedAt}
          onRefresh={handleRefresh}
          onToggleTheme={toggleTheme}
          theme={theme}
        />

        <Card className="rounded-2xl border bg-card p-4 shadow-sm">
          <SummaryGrid
            summary={stationsState.summary}
            selectedCampusId={campusId}
            onSelectCampus={handleCampusSelect}
          />
        </Card>

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="relative col-span-1 flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm lg:col-span-2 lg:h-[75vh]">
            <MapView
              stations={stationsState.mapStations}
              campusId={campusId}
              theme={theme}
              focusStation={focusStation}
              userLocation={userLocation}
              tracking={watching}
              onStartTracking={start}
              onStopTracking={stop}
            />
          </Card>
          <Card className="flex min-h-[40vh] flex-col overflow-hidden rounded-2xl border bg-card p-4 shadow-sm lg:h-[75vh]">
            <div className="flex items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-lg font-semibold">站点列表</h2>
                <p className="text-xs text-muted-foreground">
                  关注 {watchlistCount} 个站点
                </p>
              </div>
              <ProviderSelect
                providerId={providerId}
                providers={providers}
                onChange={setProviderId}
              />
            </div>
            <div className="py-3">
              <NightNotice />
            </div>
            <div className="relative flex-1 overflow-hidden">
              <StationList
                stations={stationsState.campusStations}
                loading={stationsState.loading}
                error={stationsState.error}
                isWatched={isWatched}
                onToggleWatch={toggleWatch}
                onSelectStation={handleStationSelect}
              />
            </div>
          </Card>
        </div>

        <Footer />
      </main>
    </div>
  );
}
