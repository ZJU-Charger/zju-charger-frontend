"use client";

import { Github, Mail, Moon, Sun } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/time";

interface HeaderBarProps {
  lastUpdated?: string;
  onToggleTheme: () => void;
  theme: "light" | "dark";
}

export function HeaderBar({
  lastUpdated,
  onToggleTheme,
  theme,
}: HeaderBarProps) {
  return (
    <header className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="ZJU Charger Logo"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <div className="flex items-end gap-3">
            <h1 className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              ZJU Charger
            </h1>
            <span className="text-sm text-muted-foreground">by PhilFan</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {formatTimestamp(lastUpdated)}
          </span>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/Phil-Fan/ZJU-Charger"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-emerald-500/70 bg-emerald-50 p-2 text-emerald-600 shadow-sm transition hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-300"
              aria-label="GitHub 仓库"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="mailto:hw.phil.fan@gmail.com"
              className="rounded-full border border-muted-foreground/40 p-2 text-muted-foreground transition hover:bg-muted-foreground/10"
              aria-label="Email"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={onToggleTheme}
            aria-label="切换主题"
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
