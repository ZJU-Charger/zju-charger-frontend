"use client";

import { ArrowUpDown, Filter } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { NightNotice } from "@/components/night-notice";
import { ProviderSelect } from "@/components/provider-select";
import { SortSelect } from "@/components/sort-select";
import { StationList } from "@/components/station-list";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import type { GeoPoint } from "@/hooks/use-realtime-location";
import { cn } from "@/lib/utils";
import type { SortMode } from "@/types/sort";
import type { ProviderInfo, StationRecord } from "@/types/station";

interface StationPanelProps {
  providers: ProviderInfo[];
  providerId: string;
  onProviderChange: (id: string) => void;
  watchlistCount: number;
  stations: StationRecord[];
  loading: boolean;
  error?: string | null;
  isWatched: (station: StationRecord) => boolean;
  onToggleWatch: (station: StationRecord) => void;
  onSelectStation?: (station: StationRecord) => void;
  userLocation?: GeoPoint | null;
  maxVisible?: number;
  onRequireLocation?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function StationPanel({
  providers,
  providerId,
  onProviderChange,
  watchlistCount,
  stations,
  loading,
  error,
  isWatched,
  onToggleWatch,
  onSelectStation,
  userLocation,
  maxVisible,
  onRequireLocation,
  className,
  style,
}: StationPanelProps) {
  const { language } = useLanguage();
  const [sortMode, setSortMode] = useState<SortMode>("free");
  const listTitle = language === "en" ? "Station list" : "站点列表";
  const watchSummary =
    language === "en"
      ? `Watching ${watchlistCount} station${watchlistCount === 1 ? "" : "s"}`
      : `关注 ${watchlistCount} 个站点`;
  const filterLabel = language === "en" ? "Filter" : "筛选";
  const sortLabel = language === "en" ? "Sort" : "排序";

  const handleSortChange = (mode: SortMode) => {
    setSortMode(mode);
  };

  const handleRequireLocation = () => {
    toast.info(
      language === "en"
        ? "Enable live location to sort by distance."
        : "开启实时定位后才能按距离排序",
    );
    onRequireLocation?.();
  };

  return (
    <Card
      className={cn(
        "order-2 flex flex-1 min-h-0 flex-col rounded-2xl border bg-card p-4 shadow-sm lg:order-1 lg:h-full",
        className,
      )}
      style={style}
    >
      <div className="flex flex-col gap-4 border-b border-border/80 pb-5 dark:border-white/20">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{listTitle}</h2>
          <p className="text-xs text-muted-foreground">{watchSummary}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Filter className="size-4 text-muted-foreground" aria-label={filterLabel} />
            <ProviderSelect
              providerId={providerId}
              providers={providers}
              onChange={onProviderChange}
            />
          </div>
          <div className="ml-auto flex items-center justify-end gap-1">
            <ArrowUpDown className="size-4 text-muted-foreground" aria-label={sortLabel} />
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
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <StationList
          stations={stations}
          loading={loading}
          error={error}
          isWatched={isWatched}
          onToggleWatch={onToggleWatch}
          onSelectStation={onSelectStation}
          userLocation={userLocation}
          sortMode={sortMode}
          maxVisible={maxVisible}
        />
      </div>
    </Card>
  );
}
