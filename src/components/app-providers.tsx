"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "@/hooks/use-language";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
