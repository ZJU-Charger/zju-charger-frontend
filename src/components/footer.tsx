"use client";

import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <div className="flex items-center gap-2 font-semibold text-emerald-500">
          <span>Give me a star</span>
        </div>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <a
          href="https://github.com/Phil-Fan/ZJU-Charger"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-600 hover:text-emerald-500"
        >
          GitHub
        </a>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <a
          href="mailto:hw.phil.fan@gmail.com"
          className="hover:text-emerald-500"
        >
          Email
        </a>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <span>GPLv3</span>
      </div>
    </footer>
  );
}
