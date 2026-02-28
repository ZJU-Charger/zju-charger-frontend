import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/config";

type ThemeMode = "light" | "dark";

function getSafeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  const storage = window.localStorage;
  if (!storage || typeof storage.getItem !== "function") return null;
  return storage;
}

function readInitialTheme(): ThemeMode {
  const storage = getSafeLocalStorage();
  if (!storage) return "light";
  const stored = storage.getItem(STORAGE_KEYS.theme) as ThemeMode | null;
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(() => readInitialTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    const storage = getSafeLocalStorage();
    if (storage && typeof storage.setItem === "function") {
      storage.setItem(STORAGE_KEYS.theme, theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme };
}
