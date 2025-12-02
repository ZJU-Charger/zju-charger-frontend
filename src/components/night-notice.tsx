"use client";

import { Card } from "@/components/ui/card";
import { isNightTime } from "@/lib/time";

export function NightNotice() {
  if (!isNightTime()) return null;
  return (
    <Card className="bg-blue-50/80 text-blue-800 dark:bg-blue-900/30 dark:text-blue-100">
      <p className="text-sm text-center">
        夜深了，充电服务可能暂停，请注意休息 🌙
      </p>
    </Card>
  );
}
