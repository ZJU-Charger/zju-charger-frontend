"use client";

import { type ReactNode, useEffect } from "react";
import { STORAGE_KEYS } from "@/lib/config";
import { useUIStore } from "@/store/ui.store";
import { DEFAULT_LANGUAGE, type Language } from "@/types/language";

function readInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }
  const stored = localStorage.getItem(STORAGE_KEYS.language);
  return stored === "en" ? "en" : DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useUIStore((state) => state.language);
  const setLanguage = useUIStore((state) => state.setLanguage);

  useEffect(() => {
    setLanguage(readInitialLanguage());
  }, [setLanguage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(STORAGE_KEYS.language, language);
    const html = document.documentElement;
    if (html) {
      html.lang = language === "en" ? "en-US" : "zh-CN";
      html.dataset.language = language;
    }
  }, [language]);

  return children;
}

export function useLanguage() {
  const language = useUIStore((state) => state.language);
  const setLanguage = useUIStore((state) => state.setLanguage);
  const toggleLanguage = useUIStore((state) => state.toggleLanguage);
  return { language, setLanguage, toggleLanguage };
}

export type { Language } from "@/types/language";
