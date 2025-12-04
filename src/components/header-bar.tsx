"use client";

import { BookOpen, Github, Mail, Moon, Sun } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { STORAGE_KEYS } from "@/lib/config";
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
  const [manualOpen, setManualOpen] = useState(false);
  const [dontShowGuide, setDontShowGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const suppressed = localStorage.getItem(STORAGE_KEYS.guideHidden) === "1";
    setManualOpen(!suppressed);
    setDontShowGuide(suppressed);
  }, []);

  const handleGuideToggle = (value: boolean) => {
    setDontShowGuide(value);
    if (typeof window === "undefined") return;
    if (value) {
      localStorage.setItem(STORAGE_KEYS.guideHidden, "1");
    } else {
      localStorage.removeItem(STORAGE_KEYS.guideHidden);
    }
  };

  const handleGuideConfirm = () => {
    if (!dontShowGuide && typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.guideHidden);
    }
    setManualOpen(false);
  };
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
              className="rounded-full border border-muted-foreground/40 p-2 text-muted-foreground transition hover:bg-muted-foreground/10 dark:border-muted-foreground/40 dark:text-muted-foreground"
              aria-label="Email"
            >
              <Mail className="h-4 w-4" />
            </a>
            <Dialog open={manualOpen} onOpenChange={setManualOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border border-muted-foreground/40 p-2 text-muted-foreground transition hover:bg-muted-foreground/10 dark:border-muted-foreground/40 dark:text-muted-foreground"
                  aria-label="使用说明书"
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent
                className="w-[92vw] max-w-md space-y-4 sm:max-w-lg"
                hideCloseButton
              >
                <DialogHeader>
                  <DialogTitle>使用说明书</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <ol className="space-y-2 list-decimal pl-5">
                    <li>
                      校区卡片：点击<b>校区卡片</b>切换校区。
                    </li>
                    <li>地图：<b>长按或双击</b>地图站点可选择导航。</li>
                    <li>站点列表：
                      <ul>
                        <li>点击列表<b>筛选</b>服务商并选择距离优先/空闲优先的<b>排序方式</b>。</li>
                        <li>点击站点列表中的<b>站点</b>，地图上可以快速定位跳转。</li>
                        <li>点击<b>星标</b>关注站点，并显示在列表最上方。</li>
                      </ul>
                    </li>
                    <li>颜色模式：点击右上角按钮切换颜色模式。</li>
                    <li>快捷方式：点击 Safari 分享→添加到主屏幕。</li>
                  </ol>
                </div>
                <DialogFooter className="flex flex-row flex-nowrap w-full items-center justify-between sm:justify-between gap-3 space-x-0 sm:space-x-0">
                  <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <Switch
                      checked={dontShowGuide}
                      onCheckedChange={handleGuideToggle}
                      aria-label="不再显示说明书"
                    />
                    <span>不再显示</span>
                  </div>
                  <DialogClose asChild>
                    <Button size="sm" onClick={handleGuideConfirm}>
                      了解！
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
