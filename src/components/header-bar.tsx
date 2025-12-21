"use client";

import { BookOpen, Github, Mail, Moon, Sun } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useEffect } from "react";
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
import { useLanguage } from "@/hooks/use-language";
import { STORAGE_KEYS } from "@/lib/config";
import { formatTimestamp } from "@/lib/time";
import { useUIStore } from "@/store/ui.store";
import type { Language } from "@/types/language";

interface HeaderBarProps {
  lastUpdated?: string;
  onToggleTheme: () => void;
  theme: "light" | "dark";
}

const LANGUAGE_SHORT_LABELS: Record<Language, string> = {
  zh: "zh",
  en: "en",
};

interface GuideEntry {
  id: string;
  content: Record<Language, ReactNode>;
}

const GUIDE_STEPS: GuideEntry[] = [
  {
    id: "campus",
    content: {
      zh: (
        <>
          校区切换：点击<b>校区卡片</b>即可切换校区。
        </>
      ),
      en: (
        <>
          Campus switch: tap a <b>campus card</b> to change campuses.
        </>
      ),
    },
  },
  {
    id: "sorting",
    content: {
      zh: "站点排序：开启定位后，实时显示站点距离，可按照距离优先或者空闲数量优先对站点进行排序。",
      en: "Station sorting: after enabling location, view live distances and sort by distance or available slots.",
    },
  },
  {
    id: "navigation",
    content: {
      zh: (
        <>
          站点导航：在地图站点上可通过<b>长按或双击</b>选择导航。
        </>
      ),
      en: (
        <>
          Navigation: long-press or double-click a station on the map to open
          navigation.
        </>
      ),
    },
  },
  {
    id: "favorites",
    content: {
      zh: (
        <>
          站点关注：点击<b>星标</b>关注站点，显示并保存在列表顶部。
        </>
      ),
      en: (
        <>
          Favorites: tap the <b>star</b> to pin a station at the top of the
          list.
        </>
      ),
    },
  },
  {
    id: "theme",
    content: {
      zh: "颜色模式：点击右上角按钮可切换明亮/暗色模式。",
      en: "Theme: use the top-right button to toggle light or dark mode.",
    },
  },
  {
    id: "shortcut",
    content: {
      zh: "快捷方式：在 Safari 中通过“分享 → 添加到主屏幕”可创建快捷方式。",
      en: "Shortcut: in Safari, use “Share → Add to Home Screen” to create an app icon.",
    },
  },
];

const GUIDE_NOTES: GuideEntry[] = [
  {
    id: "location",
    content: {
      zh: (
        <>
          实时定位默认开启，可通过地图右下角按钮关闭。
          <b>微信内直接打开无法使用实时定位</b>，请使用系统浏览器打开。
        </>
      ),
      en: (
        <>
          Live location is on by default and can be turned off via the map
          button.
          <b> WeChat’s in-app browser cannot access location</b>; please open in
          the system browser.
        </>
      ),
    },
  },
  {
    id: "source",
    content: {
      zh: (
        <>
          数据来源为各服务商小程序，遵循各自 Robots 协议获取，无任何合作关系，
          <b>更新频率为90秒</b>。
        </>
      ),
      en: (
        <>
          Data is sourced from each provider&apos;s mini-program under their
          Robots rules with no partnerships;
          <b> it refreshes every 90 seconds</b>.
        </>
      ),
    },
  },
  {
    id: "disclaimer",
    content: {
      zh: (
        <>
          隐私声明：本网站不储存任何个人信息，不收集除了流量统计（由第三方平台提供）所需以外的任何信息，请大家放心使用。
          本站为个人公益开发，仅用于学习交流，使用本网站即表示同意：<b>使用过程中出现的任何问题由使用者自行承担</b>。
        </>
      ),
      en: (
        <>
            <b>Privacy Notice:</b> This website does not store any personal information. The site includes JavaScript scripts to count and record visitor data and click sources, provided by third-party analytics platforms. This site is a personal, non-profit project for learning only; by using it, you agree to assume any risks yourself.
        </>
      ),
    },
  },
];

export function HeaderBar({
  lastUpdated,
  onToggleTheme,
  theme,
}: HeaderBarProps) {
  const { language, toggleLanguage } = useLanguage();
  const manualOpen = useUIStore((state) => state.guideManualOpen);
  const dontShowGuide = useUIStore((state) => state.guideSuppressed);
  const setManualOpen = useUIStore((state) => state.setGuideManualOpen);
  const setDontShowGuide = useUIStore((state) => state.setGuideSuppressed);
  const guideLabel = language === "en" ? "User guide" : "使用说明书";
  const dontShowAriaLabel =
    language === "en" ? "Do not show the guide again" : "不再显示说明书";
  const dontShowText = language === "en" ? "Don't show again" : "不再显示";
  const confirmLabel = language === "en" ? "Got it!" : "了解！";
  const themeAriaLabel = language === "en" ? "Toggle theme" : "切换主题";
  const languageAriaLabel =
    language === "en" ? "Switch to Chinese mode" : "切换到英文模式";
  const languageButtonText = LANGUAGE_SHORT_LABELS[language];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const suppressed = localStorage.getItem(STORAGE_KEYS.guideHidden) === "1";
    setManualOpen(!suppressed);
    setDontShowGuide(suppressed);
  }, [setManualOpen, setDontShowGuide]);

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
            {formatTimestamp(lastUpdated, language)}
          </span>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/Phil-Fan/ZJU-Charger"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-emerald-500/70 bg-emerald-50 p-2 text-emerald-600 shadow-sm transition hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-300"
              aria-label={
                language === "en" ? "GitHub repository" : "GitHub 仓库"
              }
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
                  aria-label={guideLabel}
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent
                className="flex flex-col w-[92vw] max-w-md sm:max-w-lg max-h-[85vh]"
                hideCloseButton
              >
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>{guideLabel}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-3 text-sm text-muted-foreground pr-2 -mr-2">
                  <ol className="space-y-2 list-decimal pl-5">
                    {GUIDE_STEPS.map((entry) => (
                      <li key={entry.id}>{entry.content[language]}</li>
                    ))}
                  </ol>
                  <ul className="list-disc pl-5 space-y-2">
                    {GUIDE_NOTES.map((entry) => (
                      <li key={entry.id}>{entry.content[language]}</li>
                    ))}
                  </ul>
                </div>
                <DialogFooter className="flex-shrink-0 flex flex-row flex-nowrap w-full items-center justify-between sm:justify-between gap-3 space-x-0 sm:space-x-0 pt-4">
                  <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <Switch
                      checked={dontShowGuide}
                      onCheckedChange={handleGuideToggle}
                      aria-label={dontShowAriaLabel}
                    />
                    <span>{dontShowText}</span>
                  </div>
                  <DialogClose asChild>
                    <Button size="sm" onClick={handleGuideConfirm}>
                      {confirmLabel}
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleLanguage}
              aria-label={languageAriaLabel}
              className="font-semibold"
            >
              {languageButtonText}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={onToggleTheme}
              aria-label={themeAriaLabel}
            >
              {theme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
