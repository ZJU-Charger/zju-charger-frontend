"use client";

import { Card } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { isNightTime } from "@/lib/time";

export function NightNotice() {
  const { language } = useLanguage();
  if (!isNightTime()) return null;
  const message =
    language === "en"
      ? "It's late and charging services may be paused. Get some rest 🌙"
      : "夜深了，充电服务暂停，请注意休息 🌙";
  return (
    <Card className="bg-blue-50/80 text-blue-800 dark:bg-blue-900/30 dark:text-blue-100">
      <p className="text-sm text-center">{message}</p>
    </Card>
  );
}
