import { CAMPUS_MAP } from "@/lib/config";
import { ensureGcj02 } from "@/lib/geo";
import type {
  CampusId,
  ProviderInfo,
  RawStation,
  StationRecord,
  StationsResponse,
  StatusResponse,
} from "@/types/station";

export class RateLimitError extends Error {
  constructor(message = "请求过于频繁，请稍后再试") {
    super(message);
    this.name = "RateLimitError";
  }
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (response.status === 429) {
    throw new RateLimitError();
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "请求失败");
  }

  return response.json() as Promise<T>;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/$/, "");
function withBase(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE) return `/api${normalizedPath}`;
  return `${API_BASE}${normalizedPath}`;
}

export async function fetchProviders() {
  return request<ProviderInfo[]>(withBase("/providers"));
}

export async function fetchStatus(provider?: string): Promise<StatusResponse> {
  const url = provider
    ? withBase(`/status?provider=${encodeURIComponent(provider)}`)
    : withBase("/status");
  return request<StatusResponse>(url);
}

export async function fetchStationsMetadata(): Promise<StationsResponse> {
  return request<StationsResponse>(withBase("/stations"));
}

function pickNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function pickString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

export function normalizeStation(
  raw: RawStation,
  options?: { fetched?: boolean },
): StationRecord {
  const hashId = pickString(raw.hash_id ?? raw.id);
  const name = pickString(raw.name ?? raw.devdescript);
  const provider = pickString(raw.provider || "unknown");
  const campusCandidate =
    raw.campus_id ?? raw.campus ?? raw.areaid ?? raw.areaId;
  const campusIdValue = campusCandidate ? pickString(campusCandidate) : "";
  const campusConfig = CAMPUS_MAP[campusIdValue] ?? CAMPUS_MAP[""];
  const campusName = raw.campus_name || campusConfig?.name;

  const rawLat = pickNumber(raw.lat ?? raw.latitude);
  const rawLng = pickNumber(raw.lon ?? raw.lng ?? raw.longitude);
  const [longitude, latitude] = ensureGcj02(rawLng, rawLat);

  const devids = Array.isArray(raw.devids)
    ? raw.devids.map((d) => pickString(d))
    : raw.devid
      ? [pickString(raw.devid)]
      : [];

  const campusIdNormalized = (campusIdValue || "") as CampusId;

  const record: StationRecord = {
    hashId,
    name,
    provider,
    campusId: campusIdNormalized,
    campusName,
    latitude,
    longitude,
    free: pickNumber(raw.free) ?? 0,
    used: pickNumber(raw.used) ?? 0,
    total: pickNumber(raw.total) ?? 0,
    error: pickNumber(raw.error) ?? 0,
    devids,
    isFetched: options?.fetched ?? Boolean(raw.isFetched ?? true),
  };

  return record;
}

export function mergeStations(
  liveStations: RawStation[],
  metadataStations: RawStation[],
  providerFilter?: string,
): StationRecord[] {
  const merged: StationRecord[] = [];
  const seen = new Set<string>();

  const shouldInclude = (record: StationRecord) => {
    if (!providerFilter) return true;
    return record.provider === providerFilter;
  };

  liveStations.forEach((station) => {
    const normalized = normalizeStation(station, { fetched: true });
    if (!shouldInclude(normalized)) return;
    if (!normalized.hashId) return;
    seen.add(normalized.hashId);
    merged.push(normalized);
  });

  metadataStations.forEach((station) => {
    const normalized = normalizeStation(
      { ...station, free: station.free ?? 0, total: station.total ?? 0 },
      { fetched: false },
    );
    if (!shouldInclude(normalized)) return;
    if (!normalized.hashId || seen.has(normalized.hashId)) {
      return;
    }
    merged.push(normalized);
  });

  return merged;
}
