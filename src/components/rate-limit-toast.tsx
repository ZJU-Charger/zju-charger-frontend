"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

interface RateLimitToastProps {
  visible: boolean;
  message?: string | null;
}

export function RateLimitToast({ visible, message }: RateLimitToastProps) {
  const { language } = useLanguage();
  if (!visible) return null;
  const title = language === "en" ? "Too many requests" : "请求过于频繁";
  const defaultMessage =
    language === "en"
      ? "Please try again later and avoid refreshing too quickly."
      : "请稍后再试，避免频繁刷新页面";
  return (
    <div className="fixed top-6 right-6 z-50 w-full max-w-sm">
      <Alert
        className={cn(
          "border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-100",
        )}
      >
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message ?? defaultMessage}</AlertDescription>
      </Alert>
    </div>
  );
}
