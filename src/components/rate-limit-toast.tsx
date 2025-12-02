"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface RateLimitToastProps {
  visible: boolean;
  message?: string | null;
}

export function RateLimitToast({ visible, message }: RateLimitToastProps) {
  if (!visible) return null;
  return (
    <div className="fixed top-6 right-6 z-50 w-full max-w-sm">
      <Alert
        className={cn(
          "border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-100",
        )}
      >
        <AlertTitle>请求过于频繁</AlertTitle>
        <AlertDescription>
          {message ?? "请稍后再试，避免频繁刷新页面"}
        </AlertDescription>
      </Alert>
    </div>
  );
}
