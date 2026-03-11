"use client";

import { Navigation, Pin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/use-language";
import type { GeoPoint } from "@/hooks/use-realtime-location";
import { distanceBetween } from "@/lib/geo";
import { isSpecialStation } from "@/lib/station-style";
import { cn } from "@/lib/utils";
import type { SortMode } from "@/types/sort";
import type { StationRecord } from "@/types/station";

interface StationListProps {
  stations: StationRecord[];
  loading: boolean;
  error?: string | null;
  onToggleWatch: (station: StationRecord) => void;
  isWatched: (station: StationRecord) => boolean;
  onSelectStation?: (station: StationRecord) => void;
  userLocation?: GeoPoint | null;
  sortMode: SortMode;
  maxVisible?: number;
}

interface StationMeta {
  station: StationRecord;
  distance: number | null;
  watched: boolean;
}

function formatDistance(distance: number | null): string | null {
  if (distance === null) return null;
  if (distance < 1000) return `${Math.round(distance)}m`;
  const km = distance / 1000;
  return `${km >= 10 ? Math.round(km) : km.toFixed(1)}km`;
}

function progressWidth(station: StationRecord): string {
  if (!station.total) return "0%";
  const ratio = Math.min(1, Math.max(0, station.free / station.total));
  return `${Math.round(ratio * 100)}%`;
}

export function StationList({
  stations,
  loading,
  error,
  onToggleWatch,
  isWatched,
  onSelectStation,
  userLocation,
  sortMode,
  maxVisible,
}: StationListProps) {
  const { language } = useLanguage();
  const loadingText = language === "en" ? "Loading..." : "加载中...";
  const loadErrorTitle =
    language === "en" ? "Failed to load data" : "加载数据失败";
  const defaultErrorMessage =
    language === "en"
      ? "Unable to fetch the latest station data."
      : "无法获取最新站点数据。";
  const emptyTitle = language === "en" ? "No station data" : "暂无站点数据";
  const emptyHint =
    language === "en"
      ? "Try switching campuses or refreshing."
      : "尝试切换校区或刷新页面";
  const notFetchedLabel = language === "en" ? "Not fetched" : "未抓取";
  const freeStatLabel = language === "en" ? "Free" : "空闲";
  const totalStatLabel = language === "en" ? "Total" : "总计";
  const removeFavoriteLabel =
    language === "en" ? "Remove from favorites" : "取消关注";
  const addFavoriteLabel =
    language === "en" ? "Favorite this station" : "关注该站点";
  const favoriteStateLabel = language === "en" ? "Favorited" : "已关注";
  const favoriteActionLabel =
    language === "en" ? "Mark as favorite" : "标记为关注";
  const errorDetailsLabel = language === "en" ? "Details" : "详情";
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [limitedHeight, setLimitedHeight] = useState<number | null>(null);

  const stationMeta: StationMeta[] = useMemo(() => {
    const meta = stations.map((station) => {
      const hasCoords =
        userLocation &&
        typeof userLocation.longitude === "number" &&
        typeof userLocation.latitude === "number" &&
        station.longitude !== null &&
        station.latitude !== null;
      const distance =
        hasCoords && userLocation
          ? distanceBetween(
              userLocation.longitude,
              userLocation.latitude,
              station.longitude as number,
              station.latitude as number,
            )
          : null;
      return { station, distance, watched: isWatched(station) };
    });

    const effectiveSort: SortMode =
      sortMode === "distance" && !userLocation ? "free" : sortMode;

    meta.sort((a, b) => {
      const watchDelta = Number(b.watched) - Number(a.watched);
      if (watchDelta !== 0) return watchDelta;
      const fetchedDelta =
        Number(b.station.isFetched) - Number(a.station.isFetched);
      if (fetchedDelta !== 0) return fetchedDelta;

      if (effectiveSort === "distance") {
        const distA = a.distance ?? Number.POSITIVE_INFINITY;
        const distB = b.distance ?? Number.POSITIVE_INFINITY;
        if (distA !== distB) return distA - distB;
      } else {
        const freeDelta = b.station.free - a.station.free;
        if (freeDelta !== 0) return freeDelta;
      }

      return a.station.name.localeCompare(b.station.name, "zh-CN");
    });

    return meta;
  }, [stations, isWatched, userLocation, sortMode]);
  const stationCount = stationMeta.length;

  useEffect(() => {
    if (!maxVisible) {
      setLimitedHeight(null);
      return;
    }
    if (stationCount === 0) {
      setLimitedHeight(null);
      return;
    }
    const container = contentRef.current;
    if (!container) {
      setLimitedHeight(null);
      return;
    }

    const measure = () => {
      if (!contentRef.current) {
        setLimitedHeight(null);
        return;
      }
      const children = Array.from(contentRef.current.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      );
      if (children.length === 0) {
        setLimitedHeight(null);
        return;
      }
      const slice = children.slice(0, Math.min(maxVisible, children.length));
      const first = slice[0];
      const last = slice[slice.length - 1];
      const height = last.offsetTop + last.offsetHeight - first.offsetTop;
      setLimitedHeight(Math.ceil(height));
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => measure());
      observer.observe(container);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [maxVisible, stationCount]);

  const scrollStyle = limitedHeight
    ? { height: `${limitedHeight}px` }
    : undefined;
  const skeletonCount = maxVisible ? Math.max(3, Math.min(maxVisible, 6)) : 6;
  const skeletonKeys = useMemo(
    () =>
      Array.from(
        { length: skeletonCount },
        (_, number) => `station-skeleton-${number + 1}`,
      ),
    [skeletonCount],
  );

  if (loading) {
    return (
      <ScrollArea
        type="always"
        className={cn("w-full min-h-0", limitedHeight ? undefined : "h-full")}
        style={scrollStyle}
      >
        <div className="flex flex-col gap-4 pr-4" aria-live="polite" aria-busy>
          <span className="sr-only">{loadingText}</span>
          {skeletonKeys.map((skeletonKey) => (
            <div
              key={skeletonKey}
              className={cn(
                "flex w-full flex-col gap-3 rounded-2xl border p-4 pr-12 shadow-sm",
                "border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-900",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="skeleton-shimmer h-5 w-40 rounded-md bg-slate-200 dark:bg-slate-700" />
                <div className="skeleton-shimmer h-4 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="skeleton-shimmer h-4 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="skeleton-shimmer mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  if (error && stations.length === 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-200">
        <p className="font-medium">{loadErrorTitle}</p>
        <p className="text-sm">
          {defaultErrorMessage}
          {error ? (
            <span className="mt-1 block text-xs text-muted-foreground">
              {errorDetailsLabel}: {error}
            </span>
          ) : null}
        </p>
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-center text-yellow-800 dark:border-yellow-800/50 dark:bg-yellow-900/30 dark:text-yellow-100">
        <p className="font-medium">{emptyTitle}</p>
        <p className="text-sm">{emptyHint}</p>
      </div>
    );
  }

  return (
    <ScrollArea
      type="always"
      className={cn("w-full min-h-0", limitedHeight ? undefined : "h-full")}
      style={scrollStyle}
    >
      <div ref={contentRef} className="flex flex-col gap-4 pr-4">
        {stationMeta.map(({ station, distance, watched }, index) => {
          const distanceLabel = formatDistance(distance);
          const entranceDelay = Math.min(index, 10) * 70;
          const specialStation = isSpecialStation(station);
          const providerBadgeClass = specialStation
            ? "border-slate-200 text-[var(--charger-exclusive)] dark:border-slate-600 dark:text-[var(--charger-exclusive)]"
            : "border-slate-200 text-slate-700 dark:border-slate-600 dark:text-slate-200";
          const progressBarClass = specialStation
            ? "h-full rounded-full bg-[var(--charger-exclusive)]"
            : "h-full rounded-full bg-[var(--charger-free)]";
          return (
            <div
              key={station.hashId}
              className="relative station-card-entrance"
              style={{ animationDelay: `${entranceDelay}ms` }}
            >
              <button
                type="button"
                className={cn(
                  "group flex w-full cursor-pointer flex-col rounded-2xl border p-4 text-left shadow-sm transition",
                  "bg-white border-slate-100 hover:shadow-md",
                  "dark:bg-slate-900 dark:border-slate-700 dark:shadow-[0_0_0_1px_rgba(15,23,42,0.7)] dark:hover:bg-slate-900/95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
                )}
                onClick={() => onSelectStation?.(station)}
              >
                <div className="flex flex-col gap-2 pr-10">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-base font-semibold text-card-foreground">
                      {station.name}
                      {!station.isFetched ? (
                        <Badge variant="secondary" className="ml-2">
                          {notFetchedLabel}
                        </Badge>
                      ) : null}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className={providerBadgeClass}>
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        {station.provider}
                        {distanceLabel ? (
                          <>
                            <span className="text-slate-300 dark:text-slate-500">
                              /
                            </span>
                            <Navigation className="h-3 w-3" />
                            {distanceLabel}
                          </>
                        ) : null}
                      </span>
                    </Badge>
                    <span className="pointer-events-none shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                      <span className="inline-flex items-center gap-3 whitespace-nowrap text-[11px] font-medium text-slate-500 dark:text-slate-300">
                        <span className="inline-flex items-baseline gap-1 tracking-[0.06em]">
                          <span>{freeStatLabel}</span>
                          <span className="tabular-nums tracking-normal">
                            {station.free}
                          </span>
                        </span>
                        <span className="inline-flex items-baseline gap-1 tracking-[0.06em]">
                          <span>{totalStatLabel}</span>
                          <span className="tabular-nums tracking-normal">
                            {station.total}
                          </span>
                        </span>
                      </span>
                    </span>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={progressBarClass}
                    style={{ width: progressWidth(station) }}
                  />
                </div>
              </button>
              <button
                type="button"
                className={cn(
                  "absolute right-3 top-2.5 inline-flex items-center justify-center p-1 transition duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70",
                  watched
                    ? "-rotate-12 text-emerald-500 hover:text-emerald-400"
                    : "rotate-0 text-slate-400 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-400",
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleWatch(station);
                }}
                aria-label={watched ? removeFavoriteLabel : addFavoriteLabel}
                aria-pressed={watched}
              >
                <Pin
                  aria-hidden
                  className={cn(
                    "h-[18px] w-[18px] transition-transform duration-200",
                    watched ? "rotate-0 fill-current" : "rotate-12",
                  )}
                  strokeWidth={2.2}
                />
                <span className="sr-only">
                  {watched ? favoriteStateLabel : favoriteActionLabel}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
