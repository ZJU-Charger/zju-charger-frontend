"use client";

import type { SummaryItem } from "@/hooks/use-stations";
import { cn } from "@/lib/utils";
import type { CampusId } from "@/types/station";

interface SummaryGridProps {
  summary: SummaryItem[];
  selectedCampusId: CampusId;
  onSelectCampus: (campusId: CampusId) => void;
}

const shortName = (name: string) => name.slice(0, 2);

export function SummaryGrid({
  summary,
  selectedCampusId,
  onSelectCampus,
}: SummaryGridProps) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-full gap-3 sm:grid sm:grid-cols-4">
        {summary.map((item) => (
          <button
            key={item.campusId}
            type="button"
            className={cn(
              "flex min-w-[140px] flex-col rounded-2xl border p-4 text-left transition",
              "bg-white text-slate-900 shadow-sm hover:shadow-md",
              "dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700",
              selectedCampusId === item.campusId
                ? "border-emerald-500 dark:border-emerald-400 shadow-md"
                : "border-slate-200",
            )}
            onClick={() => onSelectCampus(item.campusId)}
          >
            <p className="text-sm font-semibold">
              <span className="sm:hidden">{shortName(item.campusName)}</span>
              <span className="hidden sm:inline">{item.campusName}</span>
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {item.free}
            </p>
            <p className="text-xs text-muted-foreground">
              空闲/{item.total} 个站点
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
