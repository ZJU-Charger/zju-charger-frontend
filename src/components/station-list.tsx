"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { StationRecord } from "@/types/station";

interface StationListProps {
  stations: StationRecord[];
  loading: boolean;
  error?: string | null;
  onToggleWatch: (station: StationRecord) => void;
  isWatched: (station: StationRecord) => boolean;
  onSelectStation?: (station: StationRecord) => void;
}

function availabilityClass(station: StationRecord): string {
  if (station.free > 0) return "text-[var(--charger-free)]";
  if (station.error > 0) return "text-[var(--charger-error)]";
  return "text-muted-foreground";
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
}: StationListProps) {
  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">加载中...</div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-200">
        <p className="font-medium">加载数据失败</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-center text-yellow-800 dark:border-yellow-800/50 dark:bg-yellow-900/30 dark:text-yellow-100">
        <p className="font-medium">暂无站点数据</p>
        <p className="text-sm">尝试切换校区或刷新页面</p>
      </div>
    );
  }

  const sorted = [...stations].sort((a, b) => {
    const watchDelta = Number(isWatched(b)) - Number(isWatched(a));
    if (watchDelta !== 0) return watchDelta;
    const fetchedDelta = Number(b.isFetched) - Number(a.isFetched);
    if (fetchedDelta !== 0) return fetchedDelta;
    const freeDelta = b.free - a.free;
    if (freeDelta !== 0) return freeDelta;
    return a.name.localeCompare(b.name, "zh-CN");
  });

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 pr-4">
        {sorted.map((station) => (
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
              <div>
                <h3 className="text-base font-semibold text-card-foreground">
                  {station.name}
                  {!station.isFetched ? (
                    <Badge variant="secondary" className="ml-2">
                      未抓取
                    </Badge>
                  ) : null}
                </h3>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">
                    {station.campusName || "未分配校区"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-purple-200 text-purple-700 dark:border-purple-700 dark:text-purple-200"
                  >
                    {station.provider}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <span
                  className={cn("font-semibold", availabilityClass(station))}
                >
                  空闲 {station.free}
                </span>
                <span className="text-muted-foreground">
                  占用 {station.used}
                </span>
                <span className="text-muted-foreground">
                  故障 {station.error}
                </span>
                <span className="text-muted-foreground">
                  总数 {station.total}
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-[var(--charger-free)]"
                  style={{ width: progressWidth(station) }}
                />
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-3 top-3 rounded-full bg-white text-xl shadow-sm transition",
                "dark:bg-slate-800",
                isWatched(station)
                  ? "text-amber-400"
                  : "text-slate-400 hover:text-amber-300",
              )}
              onClick={(event) => {
                event.stopPropagation();
                onToggleWatch(station);
              }}
              aria-label={isWatched(station) ? "取消关注" : "关注该站点"}
            >
              ★
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
