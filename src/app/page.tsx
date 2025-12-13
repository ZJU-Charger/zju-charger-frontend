"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HeaderBar } from "@/components/header-bar";
import { MapView } from "@/components/map-view";
import { RateLimitToast } from "@/components/rate-limit-toast";
import { StationPanel } from "@/components/station-panel";
import { SummaryGrid } from "@/components/summary-grid";
import { Card } from "@/components/ui/card";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useConfig } from "@/hooks/use-config";
import { useLanguage } from "@/hooks/use-language";
import { useProviders } from "@/hooks/use-providers";
import { useRealtimeLocation } from "@/hooks/use-realtime-location";
import { useStations } from "@/hooks/use-stations";
import { useThemeMode } from "@/hooks/use-theme-mode";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useWindowSize } from "@/hooks/use-window-size";
import { CAMPUS_LIST } from "@/lib/config";
import { distanceBetween } from "@/lib/geo";
import { useUIStore } from "@/store/ui.store";
import type { CampusId, StationRecord } from "@/types/station";

const DEFAULT_SHORT_SCREEN_CARD_COUNT = 3;
const DEFAULT_SHORT_SCREEN_HEIGHT = 700;
const DESKTOP_BREAKPOINT = 1024;
const DESKTOP_PANEL_MIN_HEIGHT = 420;
const MOBILE_MAP_HEIGHT_RATIO = 0.4;
const MOBILE_MAP_MIN_HEIGHT = 280;
const DESKTOP_SECTION_GAP = 24;
const MOBILE_SECTION_GAP = 16;

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
  const { theme, toggleTheme } = useThemeMode();
  const campusId = useUIStore((state) => state.campusId);
  const providerId = useUIStore((state) => state.providerId);
  const autoSelectionDone = useUIStore((state) => state.autoSelectionDone);
  const focusStation = useUIStore((state) => state.focusStation);
  const trackingHighlight = useUIStore((state) => state.trackingHighlight);
  const setCampusId = useUIStore((state) => state.setCampusId);
  const toggleCampus = useUIStore((state) => state.toggleCampus);
  const setProviderId = useUIStore((state) => state.setProviderId);
  const setAutoSelectionDone = useUIStore(
    (state) => state.setAutoSelectionDone,
  );
  const setFocusStation = useUIStore((state) => state.setFocusStation);
  const clearFocusStation = useUIStore((state) => state.clearFocusStation);
  const setTrackingHighlight = useUIStore(
    (state) => state.setTrackingHighlight,
  );
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const { language } = useLanguage();
  const { providers } = useProviders();
  const { counts, isWatched, toggleWatch } = useWatchlist();
  const stationsState = useStations(
    providerId === ALL_PROVIDERS ? "" : providerId,
    campusId,
  );
  const refreshInterval = useConfig();
  const trackingHighlightTimer = useRef<number | null>(null);
  const headerSectionRef = useRef<HTMLDivElement | null>(null);
  const summarySectionRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const [chromeHeight, setChromeHeight] = useState(0);
  const {
    point: userLocation,
    watching,
    start,
    stop,
  } = useRealtimeLocation({
    onError: (message) => toast.error(message),
    language,
  });

  const handleRefresh = useCallback(() => {
    void stationsState.refresh();
  }, [stationsState]);

  useAutoRefresh(handleRefresh, refreshInterval);

  const watchlistCount = counts.stationCount;

  const handleCampusSelect = useCallback(
    (id: CampusId) => {
      setAutoSelectionDone(true);
      toggleCampus(id);
      clearFocusStation();
    },
    [setAutoSelectionDone, toggleCampus, clearFocusStation],
  );

  const handleStationSelect = useCallback(
    (station: StationRecord) => {
      setFocusStation(station);
      if (station.campusId && station.campusId !== campusId) {
        setAutoSelectionDone(true);
        setCampusId(station.campusId);
      }
    },
    [campusId, setAutoSelectionDone, setCampusId, setFocusStation],
  );

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (autoSelectionDone || !userLocation) return;
    let nearest = CAMPUS_LIST[0];
    let minDist = Number.POSITIVE_INFINITY;
    CAMPUS_LIST.forEach((campus) => {
      const [lng, lat] = campus.center;
      const dist = distanceBetween(
        userLocation.longitude,
        userLocation.latitude,
        lng,
        lat,
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = campus;
      }
    });
    setCampusId(nearest.id);
    setAutoSelectionDone(true);
  }, [autoSelectionDone, userLocation, setAutoSelectionDone, setCampusId]);

  useEffect(() => {
    if (autoSelectionDone) return;
    const timer = window.setTimeout(() => {
      setCampusId("1");
      setAutoSelectionDone(true);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [autoSelectionDone, setAutoSelectionDone, setCampusId]);

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
  const desktopPanelHeight =
    windowHeight > 0
      ? Math.max(
          Math.floor(windowHeight - chromeHeight),
          DESKTOP_PANEL_MIN_HEIGHT,
        )
      : DESKTOP_PANEL_MIN_HEIGHT;

  const updateChromeHeight = useCallback(() => {
    if (typeof window === "undefined") return;
    const headerHeight = headerSectionRef.current?.offsetHeight ?? 0;
    const summaryHeight = summarySectionRef.current?.offsetHeight ?? 0;
    const padding =
      mainRef.current && window.getComputedStyle
        ? (() => {
            const style = window.getComputedStyle(mainRef.current);
            const top = parseFloat(style.paddingTop) || 0;
            const bottom = parseFloat(style.paddingBottom) || 0;
            return top + bottom;
          })()
        : 0;
    const gap =
      (windowWidth >= DESKTOP_BREAKPOINT
        ? DESKTOP_SECTION_GAP
        : MOBILE_SECTION_GAP) * 2;
    setChromeHeight(headerHeight + summaryHeight + padding + gap);
  }, [windowWidth]);

  useEffect(() => {
    updateChromeHeight();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateChromeHeight);
      return () => window.removeEventListener("resize", updateChromeHeight);
    }
    const observer = new ResizeObserver(() => updateChromeHeight());
    if (headerSectionRef.current) observer.observe(headerSectionRef.current);
    if (summarySectionRef.current) observer.observe(summarySectionRef.current);
    if (mainRef.current) observer.observe(mainRef.current);
    return () => observer.disconnect();
  }, [updateChromeHeight]);

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
  }, [userLocation, trackingHighlight, setTrackingHighlight]);

  const triggerTrackingHighlight = useCallback(() => {
    setTrackingHighlight(true);
    if (trackingHighlightTimer.current) {
      window.clearTimeout(trackingHighlightTimer.current);
    }
    trackingHighlightTimer.current = window.setTimeout(() => {
      setTrackingHighlight(false);
      trackingHighlightTimer.current = null;
    }, 1600);
  }, [setTrackingHighlight]);

  return (
    <div className="flex min-h-screen flex-col bg-background lg:h-screen lg:overflow-hidden">
      <RateLimitToast
        visible={stationsState.rateLimited}
        message={stationsState.error}
      />
      <main
        ref={mainRef}
        className="mx-auto flex w-full max-w-7xl flex-1 min-h-0 flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6 lg:overflow-hidden"
      >
        <div ref={headerSectionRef} className="shrink-0">
          <HeaderBar
            lastUpdated={stationsState.updatedAt}
            onToggleTheme={toggleTheme}
            theme={theme}
          />
        </div>

        <div ref={summarySectionRef} className="shrink-0">
          <Card className="rounded-2xl border bg-card p-4 shadow-sm">
            <SummaryGrid
              summary={stationsState.summary}
              selectedCampusId={campusId}
              onSelectCampus={handleCampusSelect}
            />
          </Card>
        </div>

        <div className="flex flex-1 min-h-0 flex-col gap-4 lg:grid lg:auto-rows-[minmax(0,1fr)] lg:grid-cols-3 lg:gap-6">
          <StationPanel
            providers={providers}
            providerId={providerId}
            onProviderChange={setProviderId}
            watchlistCount={watchlistCount}
            stations={stationsState.campusStations}
            loading={stationsState.loading}
            error={stationsState.error}
            isWatched={isWatched}
            onToggleWatch={toggleWatch}
            onSelectStation={handleStationSelect}
            userLocation={userLocation}
            maxVisible={limitVisibleCards}
            onRequireLocation={triggerTrackingHighlight}
            style={isDesktopWidth ? { height: desktopPanelHeight } : undefined}
          />
          <Card
            className="order-1 flex min-h-[40vh] w-full flex-1 flex-col rounded-2xl border bg-card p-4 shadow-sm lg:order-2 lg:col-span-2 lg:min-h-0 lg:h-full lg:p-0"
            style={
              isDesktopWidth
                ? { height: desktopPanelHeight }
                : { height: mobileMapHeight }
            }
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
      <footer className="shrink-0 px-4 pb-2 text-center text-xs text-muted-foreground">
        {language === "en"
          ? "ICP No. 浙ICP备2025206156号 · Open source under GPLv3"
          : "浙ICP备2025206156号 · 使用 GPLv3 协议开源"}
      </footer>
    </div>
  );
}
