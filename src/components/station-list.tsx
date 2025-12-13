"use client";

import { Navigation } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/use-language";
import type { GeoPoint } from "@/hooks/use-realtime-location";
import { getCampusDisplayName } from "@/lib/config";
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

function availabilityClass(station: StationRecord): string {
  if (isSpecialStation(station)) return "text-[var(--charger-exclusive)]";
  if (station.error > 0) return "text-[var(--charger-error)]";

  // 如果站点总数大于10，使用绝对数量规则
  if (station.total > 10) {
    if (station.free <= 4) return "text-[var(--charger-error)]"; // 0-4个空余桩：红色
    if (station.free <= 9) return "text-[var(--charger-busy)]"; // 5-9个空余桩：橙色
    return "text-[var(--charger-free)]"; // 10+个空余桩：绿色
  }

  // 如果站点总数小于等于10，使用百分比规则
  const freePercentage =
    station.total > 0 ? (station.free / station.total) * 100 : 0;
  if (freePercentage < 30) return "text-[var(--charger-error)]"; // 小于30%：红色
  if (freePercentage <= 50) return "text-[var(--charger-busy)]"; // 30-50%：橙色
  return "text-[var(--charger-free)]"; // 大于50%：绿色
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
  const campusFallback = language === "en" ? "Unassigned campus" : "未分配校区";
  const freeLabel = language === "en" ? "Free" : "空闲";
  const usedLabel = language === "en" ? "In use" : "占用";
  const faultLabel = language === "en" ? "Fault" : "故障";
  const totalLabel = language === "en" ? "Total" : "总数";
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

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {loadingText}
      </div>
    );
  }

  if (error) {
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
        {stationMeta.map(({ station, distance, watched }) => {
          const distanceLabel = formatDistance(distance);
          const specialStation = isSpecialStation(station);
          const providerBadgeClass = specialStation
            ? "border-slate-200 text-[var(--charger-exclusive)] dark:border-slate-600 dark:text-[var(--charger-exclusive)]"
            : "border-purple-200 text-purple-700 dark:border-purple-700 dark:text-purple-200";
          const progressBarClass = specialStation
            ? "h-full rounded-full bg-[var(--charger-exclusive)]"
            : "h-full rounded-full bg-[var(--charger-free)]";
          const campusLabel =
            station.campusId && station.campusId.length > 0
              ? getCampusDisplayName(station.campusId, language)
              : station.campusName || campusFallback;
          return (
            <div key={station.hashId} className="relative">
              <button
                type="button"
                className={cn(
                  "group flex w-full cursor-pointer flex-col rounded-2xl border p-4 pr-16 text-left shadow-sm transition",
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
                    {distanceLabel ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Navigation className="h-3 w-3" />
                        {distanceLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{campusLabel}</Badge>
                    <Badge variant="outline" className={providerBadgeClass}>
                      {station.provider}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 overflow-x-auto whitespace-nowrap text-sm">
                  <span
                    className={cn(
                      "shrink-0 font-semibold",
                      availabilityClass(station),
                    )}
                  >
                    {freeLabel} {station.free}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {usedLabel} {station.used}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {faultLabel} {station.error}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {totalLabel} {station.total}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={progressBarClass}
                    style={{ width: progressWidth(station) }}
                  />
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-sm transition focus-visible:ring-2",
                  "dark:bg-slate-800",
                  watched
                    ? "text-amber-400 hover:text-amber-300 focus-visible:ring-amber-400/60 focus-visible:text-amber-300"
                    : "text-slate-400 hover:text-amber-300 focus-visible:ring-slate-400/50 focus-visible:text-slate-400",
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleWatch(station);
                }}
                aria-label={watched ? removeFavoriteLabel : addFavoriteLabel}
                aria-pressed={watched}
              >
                <span aria-hidden>★</span>
                <span className="sr-only">
                  {watched ? favoriteStateLabel : favoriteActionLabel}
                </span>
              </Button>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
