import { NIGHT_WINDOW } from "@/lib/config";
import { DEFAULT_LANGUAGE, type Language } from "@/types/language";

export function formatTimestamp(
  value?: string | null,
  language: Language = DEFAULT_LANGUAGE,
): string {
  if (!value) return language === "en" ? "Unknown" : "未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const prefix = language === "en" ? "Updated at" : "更新于";
  return `${prefix} ${hh}:${mi}:${ss}`;
}

export function isNightTime(date = new Date()): boolean {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return (
    minutes >= NIGHT_WINDOW.startMinutes && minutes <= NIGHT_WINDOW.endMinutes
  );
}

export function minutesBetween(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const first = new Date(a).getTime();
  const second = new Date(b).getTime();
  if (Number.isNaN(first) || Number.isNaN(second)) return null;
  return Math.abs(first - second) / 1000 / 60;
}
