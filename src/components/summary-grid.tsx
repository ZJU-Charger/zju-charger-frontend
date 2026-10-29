"use client";

import { useLanguage } from "@/hooks/use-language";
import type { SummaryItem } from "@/hooks/use-stations";
import { getCampusDisplayName } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { CampusId } from "@/types/station";

interface SummaryGridProps {
  summary: SummaryItem[];
  selectedCampusId: CampusId;
  onSelectCampus: (campusId: CampusId) => void;
}

export function SummaryGrid({
  summary,
  selectedCampusId,
  onSelectCampus,
}: SummaryGridProps) {
  const { language } = useLanguage();
  const freeLabel = language === "en" ? "Free" : "空余";
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-full flex-nowrap gap-3">
        {summary.map((item) => (
          <button
            key={item.campusId}
            type="button"
            className={cn(
              "flex min-w-[140px] flex-shrink-0 flex-col rounded-2xl border p-3 text-left transition sm:min-w-[180px] sm:p-4",
              "bg-card text-card-foreground shadow-sm hover:bg-accent/40 hover:shadow-md",
              selectedCampusId === item.campusId
                ? "border-brand shadow-md"
                : "border-border",
            )}
            onClick={() => onSelectCampus(item.campusId)}
          >
            <p className="text-sm font-semibold text-card-foreground sm:text-base">
              {getCampusDisplayName(item.campusId, language)}
            </p>
            <p className="mt-2 text-3xl font-bold text-brand sm:mt-3 sm:text-4xl">
              {item.free}
              <span className="ml-1 text-xs font-medium text-muted-foreground sm:ml-2 sm:text-base">
                {freeLabel}
              </span>
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
