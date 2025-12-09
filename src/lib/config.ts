import type { Language } from "@/types/language";
import type { CampusId } from "@/types/station";

export interface CampusConfig {
  id: CampusId;
  name: string;
  center: [number, number];
}

export const AMAP_DEFAULT_CENTER: [number, number] = [120.129265, 30.269646];

export const CAMPUS_LIST: CampusConfig[] = [
  { id: "1", name: "玉泉", center: [120.129265, 30.269646] },
  {
    id: "2",
    name: "紫金港",
    center: [120.07707846383452, 30.30430871105789],
  },
  {
    id: "3",
    name: "华家池",
    center: [120.20209784840182, 30.275736891986803],
  },
  {
    id: "4",
    name: "西溪",
    center: [120.14657666404574, 30.28148122455162],
  },
  {
    id: "5",
    name: "之江",
    center: [120.13081866629506, 30.198068966319635],
  },
];

type CampusLookup = Record<string, CampusConfig>;

export const CAMPUS_MAP: CampusLookup = CAMPUS_LIST.reduce<CampusLookup>(
  (acc, campus) => {
    acc[campus.id] = campus;
    return acc;
  },
  { "": { id: "" as CampusId, name: "全部", center: AMAP_DEFAULT_CENTER } },
);

const CAMPUS_NAME_TRANSLATIONS: Record<
  CampusId | "",
  Record<Language, string>
> = {
  "": { zh: "全部", en: "All campuses" },
  "1": { zh: "玉泉", en: "Yuquan" },
  "2": { zh: "紫金港", en: "Zijingang" },
  "3": { zh: "华家池", en: "Huajiachi" },
  "4": { zh: "西溪", en: "Xixi" },
  "5": { zh: "之江", en: "Zhijiang" },
};

export function getCampusDisplayName(
  campusId: CampusId | "",
  language: Language,
): string {
  const translations = CAMPUS_NAME_TRANSLATIONS[campusId];
  const fallback = CAMPUS_NAME_TRANSLATIONS[""];
  if (!translations) {
    return fallback[language] ?? fallback.zh;
  }
  return (
    translations[language] ??
    translations.zh ??
    fallback[language] ??
    fallback.zh
  );
}

export const DEFAULT_CAMPUS_ID: CampusId = "";

export const STORAGE_KEYS = {
  watchlist: "zju_charger_watchlist",
  theme: "zju_charger_theme",
  guideHidden: "zju_charger_guide_hidden",
  language: "zju_charger_language",
} as const;

export const DEFAULT_FETCH_INTERVAL = 60;
export const NIGHT_WINDOW = { startMinutes: 10, endMinutes: 350 } as const;

export const CHARGER_COLORS = {
  free: "var(--charger-free)",
  busy: "var(--charger-busy)",
  error: "var(--charger-error)",
};
