"use client";

import { ArrowUpDown, Filter } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HeaderBar } from "@/components/header-bar";
import { MapView } from "@/components/map-view";
import { NightNotice } from "@/components/night-notice";
import { ProviderSelect } from "@/components/provider-select";
import { RateLimitToast } from "@/components/rate-limit-toast";
import { SortSelect } from "@/components/sort-select";
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
import { useWindowSize } from "@/hooks/use-window-size";
import { CAMPUS_LIST } from "@/lib/config";
import { distanceBetween } from "@/lib/geo";
import type { SortMode } from "@/types/sort";
import type { CampusId, StationRecord } from "@/types/station";

const DEFAULT_SHORT_SCREEN_CARD_COUNT = 3;
const DEFAULT_SHORT_SCREEN_HEIGHT = 700;
const DESKTOP_BREAKPOINT = 1024;
const MOBILE_MAP_HEIGHT_RATIO = 0.4;
const MOBILE_MAP_MIN_HEIGHT = 280;

function readPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SHORT_SCREEN_CARD_LIMIT = readPositiveNumber(
  process.env.NEXT_PUBLIC_SHORT_SCREEN_CARD_COUNT,
  DEFAULT_SHORT_SCREEN_CARD_COUNT,
);

const SHORT_SCREEN_HEIGHT = readPositiveNumber(
  process.env.NEXT_PUBLIC_SHORT_SCREEN_HEIGHT,
  DEFAULT_SHORT_SCREEN_HEIGHT,
);

export default function HomePage() {
  const ALL_PROVIDERS = "all";
  const [campusId, setCampusId] = useState<CampusId>("");
  const [providerId, setProviderId] = useState(ALL_PROVIDERS);
  const { theme, toggleTheme } = useThemeMode();
  const [autoSelectionDone, setAutoSelectionDone] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const { providers } = useProviders();
  const { counts, isWatched, toggleWatch } = useWatchlist();
  const stationsState = useStations(
    providerId === ALL_PROVIDERS ? "" : providerId,
    campusId,
  );
  const refreshInterval = useConfig();
  const [focusStation, setFocusStation] = useState<StationRecord | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("free");
  const [trackingHighlight, setTrackingHighlight] = useState(false);
  const trackingHighlightTimer = useRef<number | null>(null);
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

  const watchlistCount = counts.stationCount;

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

  const isDesktopWidth =
    windowWidth > 0 ? windowWidth >= DESKTOP_BREAKPOINT : false;
  const isShortScreen =
    windowHeight > 0 ? windowHeight < SHORT_SCREEN_HEIGHT : false;
  const shouldLimitVisibleCards =
    (windowWidth > 0 ? windowWidth < DESKTOP_BREAKPOINT : false) ||
    isShortScreen;
  const limitVisibleCards = shouldLimitVisibleCards
    ? SHORT_SCREEN_CARD_LIMIT
    : undefined;
  const mobileMapHeight =
    windowHeight > 0
      ? Math.max(
          Math.floor(windowHeight * MOBILE_MAP_HEIGHT_RATIO),
          MOBILE_MAP_MIN_HEIGHT,
        )
      : MOBILE_MAP_MIN_HEIGHT;

  useEffect(() => {
    return () => {
      if (trackingHighlightTimer.current) {
        window.clearTimeout(trackingHighlightTimer.current);
        trackingHighlightTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (userLocation && trackingHighlight) {
      setTrackingHighlight(false);
      if (trackingHighlightTimer.current) {
        window.clearTimeout(trackingHighlightTimer.current);
        trackingHighlightTimer.current = null;
      }
    }
  }, [userLocation, trackingHighlight]);

  const handleSortChange = useCallback((mode: SortMode) => {
    setSortMode(mode);
  }, []);

  const handleRequireLocation = useCallback(() => {
    toast.info("开启实时定位后才能按距离排序");
    setTrackingHighlight(true);
    if (trackingHighlightTimer.current) {
      window.clearTimeout(trackingHighlightTimer.current);
    }
    trackingHighlightTimer.current = window.setTimeout(() => {
      setTrackingHighlight(false);
      trackingHighlightTimer.current = null;
    }, 1600);
  }, []);

  useEffect(() => {
    if (sortMode === "distance" && !userLocation) {
      setSortMode("free");
    }
  }, [sortMode, userLocation]);

  return (
    <div className="flex min-h-screen flex-col bg-background lg:h-screen lg:overflow-hidden">
      <RateLimitToast
        visible={stationsState.rateLimited}
        message={stationsState.error}
      />
      <main className="mx-auto flex w-full max-w-7xl flex-1 min-h-0 flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6 lg:overflow-hidden">
        <div className="shrink-0">
          <HeaderBar
            lastUpdated={stationsState.updatedAt}
            onToggleTheme={toggleTheme}
            theme={theme}
          />
        </div>

        <Card className="shrink-0 rounded-2xl border bg-card p-4 shadow-sm">
          <SummaryGrid
            summary={stationsState.summary}
            selectedCampusId={campusId}
            onSelectCampus={handleCampusSelect}
          />
        </Card>

        <div className="flex flex-1 min-h-0 flex-col gap-4 lg:grid lg:auto-rows-[minmax(0,1fr)] lg:grid-cols-3 lg:gap-6">
          <Card className="order-2 flex flex-1 min-h-0 flex-col rounded-2xl border bg-card p-4 shadow-sm lg:order-1 lg:h-full">
            <div className="flex flex-col gap-4 border-b pb-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">站点列表</h2>
                <p className="text-xs text-muted-foreground">
                  关注 {watchlistCount} 个站点
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-1">
                  <Filter
                    className="h-4 w-4 text-muted-foreground"
                    aria-label="筛选"
                  />
                  <ProviderSelect
                    providerId={providerId}
                    providers={providers}
                    onChange={setProviderId}
                  />
                </div>
                <div className="flex items-center gap-1 justify-end ml-auto">
                  <ArrowUpDown
                    className="h-4 w-4 text-muted-foreground"
                    aria-label="排序"
                  />
                  <SortSelect
                    value={sortMode}
                    onChange={handleSortChange}
                    distanceEnabled={Boolean(userLocation)}
                    onRequireLocation={handleRequireLocation}
                  />
                </div>
              </div>
            </div>
            <div className="py-3">
              <NightNotice />
            </div>
            <div className="relative flex-1 overflow-hidden min-h-0">
              <StationList
                stations={stationsState.campusStations}
                loading={stationsState.loading}
                error={stationsState.error}
                isWatched={isWatched}
                onToggleWatch={toggleWatch}
                onSelectStation={handleStationSelect}
                userLocation={userLocation}
                sortMode={sortMode}
                maxVisible={limitVisibleCards}
              />
            </div>
          </Card>
          <Card
            className="order-1 flex min-h-[40vh] w-full flex-1 flex-col rounded-2xl border bg-card p-4 shadow-sm lg:order-2 lg:col-span-2 lg:min-h-0 lg:h-full lg:p-0"
            style={isDesktopWidth ? undefined : { height: mobileMapHeight }}
          >
            <MapView
              stations={stationsState.mapStations}
              campusId={campusId}
              theme={theme}
              focusStation={focusStation}
              userLocation={userLocation}
              tracking={watching}
              onStartTracking={start}
              onStopTracking={stop}
              trackingHighlight={trackingHighlight}
            />
          </Card>
        </div>
      </main>
      <footer className="px-4 pb-4 text-center text-xs text-muted-foreground">
        浙ICP备2025206156号 · 使用 GPLv3 协议开源
      </footer>
    </div>
  );
}
