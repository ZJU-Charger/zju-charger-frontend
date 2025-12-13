"use client";

import { create } from "zustand";
import { DEFAULT_LANGUAGE, type Language } from "@/types/language";
import type { CampusId, StationRecord } from "@/types/station";

type UIState = {
  campusId: CampusId;
  providerId: string;
  autoSelectionDone: boolean;
  focusStation: StationRecord | null;
  trackingHighlight: boolean;
  guideManualOpen: boolean;
  guideSuppressed: boolean;
  language: Language;
  setCampusId: (id: CampusId) => void;
  toggleCampus: (id: CampusId) => void;
  setProviderId: (id: string) => void;
  setAutoSelectionDone: (done: boolean) => void;
  setFocusStation: (station: StationRecord | null) => void;
  clearFocusStation: () => void;
  setTrackingHighlight: (highlight: boolean) => void;
  setGuideManualOpen: (open: boolean) => void;
  setGuideSuppressed: (suppressed: boolean) => void;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
};

const DEFAULT_PROVIDER = "all";

export const useUIStore = create<UIState>((set) => ({
  campusId: "" as CampusId,
  providerId: DEFAULT_PROVIDER,
  autoSelectionDone: false,
  focusStation: null,
  trackingHighlight: false,
  guideManualOpen: false,
  guideSuppressed: false,
  language: DEFAULT_LANGUAGE,
  setCampusId: (id) => set({ campusId: id }),
  toggleCampus: (id) =>
    set((state) => ({
      campusId: state.campusId === id ? ("" as CampusId) : id,
    })),
  setProviderId: (id) => set({ providerId: id }),
  setAutoSelectionDone: (done) => set({ autoSelectionDone: done }),
  setFocusStation: (station) => set({ focusStation: station }),
  clearFocusStation: () => set({ focusStation: null }),
  setTrackingHighlight: (highlight) => set({ trackingHighlight: highlight }),
  setGuideManualOpen: (open) => set({ guideManualOpen: open }),
  setGuideSuppressed: (suppressed) => set({ guideSuppressed: suppressed }),
  setLanguage: (language) => set({ language }),
  toggleLanguage: () =>
    set((state) => ({ language: state.language === "zh" ? "en" : "zh" })),
}));
