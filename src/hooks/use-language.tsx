"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { STORAGE_KEYS } from "@/lib/config";
import { DEFAULT_LANGUAGE, type Language } from "@/types/language";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

function readInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }
  const stored = localStorage.getItem(STORAGE_KEYS.language);
  return stored === "en" ? "en" : DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    readInitialLanguage(),
  );

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

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "zh" ? "en" : "zh"));
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
    }),
    [language, toggleLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export type { Language } from "@/types/language";
