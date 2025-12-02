"use client";

import { Moon, RefreshCcw, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/time";

interface HeaderBarProps {
  lastUpdated?: string;
  onRefresh: () => void;
  onToggleTheme: () => void;
  theme: "light" | "dark";
}

export function HeaderBar({
  lastUpdated,
  onRefresh,
  onToggleTheme,
  theme,
}: HeaderBarProps) {
  return (
    <header className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-end gap-3">
            <h1 className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              ZJU Charger
            </h1>
            <span className="text-sm text-muted-foreground">by PhilFan</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {formatTimestamp(lastUpdated)}
          </span>
          <Button
            variant="default"
            size="icon"
            onClick={onRefresh}
            aria-label="刷新"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={onToggleTheme}
            aria-label="切换主题"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
