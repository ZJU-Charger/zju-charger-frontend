"use client";

import * as echarts from "echarts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "echarts-extension-amap";
import type {
  EChartsOption,
  ScatterSeriesOption,
  TooltipComponentOption,
} from "echarts";
import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from "echarts/types/dist/shared";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import type { GeoPoint } from "@/hooks/use-realtime-location";
import { type AMapMap, type AMapMarker, loadAmap } from "@/lib/amap";
import {
  AMAP_DEFAULT_CENTER,
  CAMPUS_MAP,
  getCampusDisplayName,
} from "@/lib/config";
import {
  isBatterySwapProvider,
  isSpecialStation,
  SPECIAL_STATION_COLORS,
} from "@/lib/station-style";
import { cn } from "@/lib/utils";
import type { CampusId, StationRecord } from "@/types/station";

interface MapViewProps {
  stations: StationRecord[];
  campusId: CampusId;
  theme: "light" | "dark";
  focusStation?: StationRecord | null;
  userLocation: GeoPoint | null;
  tracking: boolean;
  onStartTracking: () => void;
  onStopTracking: () => void;
  trackingHighlight?: boolean;
}

type StationSymbol = Extract<ScatterSeriesOption["symbol"], string>;

interface MapDataPoint {
  name: string;
  value: [number, number, number, number];
  station: StationRecord;
  symbol: StationSymbol;
}

interface TooltipParams {
  data?: MapDataPoint | null;
  name?: string;
}

const buildAmapWebUrl = (station: StationRecord) =>
  `https://uri.amap.com/navigation?to=${station.longitude},${station.latitude},${encodeURIComponent(
    station.name,
  )}&mode=car&src=zju-charger`;

type Platform = "ios" | "android" | "mac" | "else";

const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "else";
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios";
  if (/Macintosh|MacIntel/i.test(ua)) return "mac";
  return "else";
};

const buildAndroidGaodeIntent = (station: StationRecord) =>
  `intent://navi?sourceApplication=ZJU+Charger&poiname=${encodeURIComponent(
    station.name,
  )}&lat=${station.latitude}&lon=${station.longitude}&dev=0&style=2#Intent;scheme=androidamap;package=com.autonavi.minimap;category=android.intent.category.DEFAULT;end`;

const LIGHT_PALETTE = {
  free: "#22c55e",
  busy: "#f97316",
  error: "#f43f5e",
  special: SPECIAL_STATION_COLORS.light,
};

const DARK_PALETTE = {
  free: "#4ade80",
  busy: "#fb923c",
  error: "#fb7185",
  special: SPECIAL_STATION_COLORS.dark,
};

const BATTERY_SWAP_SYMBOL: StationSymbol = "rect";
const DEFAULT_SYMBOL: StationSymbol = "circle";

function getStationColor(
  station: StationRecord,
  palette: typeof LIGHT_PALETTE,
): string {
  if (isSpecialStation(station)) return palette.special;
  
  // 如果站点总数大于10，使用绝对数量规则
  if (station.total > 10) {
    if (station.free <= 4) return palette.error; // 0-4个空余桩：红色
    if (station.free <= 9) return palette.busy; // 5-9个空余桩：橙色
    return palette.free; // 10+个空余桩：绿色
  }
  
  // 如果站点总数小于等于10，使用百分比规则
  const freePercentage = station.total > 0 ? (station.free / station.total) * 100 : 0;
  if (freePercentage < 30) return palette.error; // 小于30%：红色
  if (freePercentage <= 50) return palette.busy; // 30-50%：橙色
  return palette.free; // 大于50%：绿色
}

function getStationSymbol(station: StationRecord): StationSymbol {
  return isBatterySwapProvider(station.provider)
    ? BATTERY_SWAP_SYMBOL
    : DEFAULT_SYMBOL;
}

function createUserMarkerElement() {
  if (typeof document === "undefined") {
    return null;
  }
  const element = document.createElement("div");
  element.className = "user-location-marker";
  element.setAttribute("aria-hidden", "true");
  element.setAttribute("role", "presentation");
  return element;
}

export function MapView({
  stations,
  campusId,
  theme,
  focusStation,
  userLocation,
  tracking,
  onStartTracking,
  onStopTracking,
  trackingHighlight = false,
}: MapViewProps) {
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chart, setChart] = useState<echarts.ECharts | null>(null);
  const [amapReady, setAmapReady] = useState<boolean>(false);
  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY;
  const [navTarget, setNavTarget] = useState<StationRecord | null>(null);
  const [pendingNavTarget, setPendingNavTarget] =
    useState<StationRecord | null>(null);
  const [isSwitchingNav, setIsSwitchingNav] = useState(false);
  const userMarkerRef = useRef<AMapMarker | null>(null);
  const userMarkerElementRef = useRef<HTMLDivElement | null>(null);
  const [mapRenderKey, setMapRenderKey] = useState(0);
  const navSwitchTimerRef = useRef<number | null>(null);
  const palette = useMemo(
    () => (theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE),
    [theme],
  );
  const startTrackingLabel =
    language === "en" ? "Enable live location" : "开启实时定位";
  const stopTrackingLabel =
    language === "en" ? "Stop live location" : "停止实时定位";
  const platform = useMemo(detectPlatform, []);

  useEffect(() => {
    console.info(
      "[ECharts][Extension][AMap] CAVEAT: The current map doesn't support `setLang` API! Platform:",
      platform,
    );
  }, [platform]);

  const formatCoord = useCallback(
    (station: StationRecord) => `${station.latitude},${station.longitude}`,
    [],
  );

  const navigationConfig = useCallback(
    (station: StationRecord, type: "gaode" | "system") => {
      if (
        station.latitude === null ||
        station.longitude === null ||
        !station.name
      ) {
        return null;
      }
      const { latitude, longitude } = station;
      const coord = formatCoord(station);
      if (type === "gaode") {
        if (platform === "ios") {
          const url = `iosamap://navi?sourceApplication=ZJU+Charger&poiname=${encodeURIComponent(
            station.name,
          )}&lat=${latitude}&lon=${longitude}&dev=0&t=0`;
          return {
            primary: url,
            fallback: buildAmapWebUrl(station),
          };
        }
        if (platform === "android") {
          return {
            primary: buildAndroidGaodeIntent(station),
            fallback: `androidamap://navi?sourceApplication=ZJU+Charger&poiname=${encodeURIComponent(
              station.name,
            )}&lat=${latitude}&lon=${longitude}&dev=0&t=0`,
          };
        }
        if (platform === "mac") {
          return {
            primary: `iosamap://navi?sourceApplication=ZJU+Charger&lat=${latitude}&lon=${longitude}&dev=0&t=0`,
            fallback: buildAmapWebUrl(station),
          };
        }
        return {
          primary: buildAmapWebUrl(station),
          fallback: buildAmapWebUrl(station),
        };
      }

      if (type === "system") {
        if (platform === "ios") {
          return {
            primary: `maps://?daddr=${coord}`,
            fallback: `https://maps.apple.com/?daddr=${coord}`,
          };
        }
        if (platform === "android") {
          return {
            primary: `google.navigation:q=${coord}`,
            fallback: `https://www.google.com/maps/dir/?api=1&destination=${coord}&travelmode=driving`,
          };
        }
        if (platform === "mac") {
          return {
            primary: `https://maps.apple.com/?daddr=${coord}`,
            fallback: `https://maps.apple.com/?daddr=${coord}`,
          };
        }
        return null;
      }

      return null;
    },
    [platform, formatCoord],
  );

  const attemptOpen = useCallback(
    (primary: string, fallback?: string) => {
      if (typeof window === "undefined") {
        if (fallback) {
          globalThis?.open?.(fallback, "_blank");
        }
        return;
      }
      const isHttp = /^https?:\/\//i.test(primary);
      if (isHttp) {
        window.open(primary, "_blank");
        return;
      }

      let timerId: number | null = null;
      let navIframe: HTMLIFrameElement | null = null;
      const handleVisibilityChange = () => {
        if (document.hidden) {
          cleanup();
        }
      };
      const cleanup = () => {
        if (timerId !== null) {
          window.clearTimeout(timerId);
          timerId = null;
        }
        if (navIframe && document.body.contains(navIframe)) {
          document.body.removeChild(navIframe);
        }
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      };

      if (platform === "ios" || platform === "android" || platform === "mac") {
        window.location.href = primary;
      } else {
        document.addEventListener("visibilitychange", handleVisibilityChange);
        navIframe = document.createElement("iframe");
        navIframe.style.display = "none";
        navIframe.src = primary;
        document.body.appendChild(navIframe);
      }

      timerId = window.setTimeout(() => {
        cleanup();
        if (fallback) {
          window.open(fallback, "_blank");
        }
      }, 1200);

      window.setTimeout(cleanup, 1500);
    },
    [platform],
  );

  const cancelNavTransition = useCallback(() => {
    if (navSwitchTimerRef.current !== null) {
      window.clearTimeout(navSwitchTimerRef.current);
      navSwitchTimerRef.current = null;
    }
    setIsSwitchingNav(false);
    setPendingNavTarget(null);
  }, []);

  const requestNavTarget = useCallback(
    (station: StationRecord) => {
      cancelNavTransition();
      if (!navTarget) {
        setNavTarget(station);
        return;
      }
      if (navTarget.hashId === station.hashId) {
        setNavTarget(station);
        return;
      }
      setIsSwitchingNav(true);
      setPendingNavTarget(station);
      navSwitchTimerRef.current = window.setTimeout(() => {
        setNavTarget(station);
        setIsSwitchingNav(false);
        setPendingNavTarget(null);
        navSwitchTimerRef.current = null;
      }, 220);
    },
    [cancelNavTransition, navTarget],
  );

  useEffect(() => {
    return () => {
      cancelNavTransition();
    };
  }, [cancelNavTransition]);

  const dataPoints = useMemo<MapDataPoint[]>(
    () =>
      stations
        .filter(
          (station) => station.longitude !== null && station.latitude !== null,
        )
        .map((station) => ({
          name: station.name,
          value: [
            station.longitude as number,
            station.latitude as number,
            station.free,
            station.total,
          ],
          station,
          symbol: getStationSymbol(station),
        })),
    [stations],
  );
  useEffect(() => {
    if (!amapKey) return;
    let disposed = false;
    let instance: echarts.ECharts | null = null;
    let resizeHandler: (() => void) | null = null;

    loadAmap(amapKey)
      .then(() => {
        if (!containerRef.current || disposed) return;
        instance = echarts.init(containerRef.current);
        setChart(instance);
        setAmapReady(true);
        resizeHandler = () => instance?.resize();
        window.addEventListener("resize", resizeHandler);
      })
      .catch((error) => {
        console.error("AMap 初始化失败", error);
      });

    return () => {
      disposed = true;
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
      }
      instance?.dispose();
      setChart(null);
      setAmapReady(false);
    };
  }, [amapKey]);

  useEffect(() => {
    if (!chart || !amapReady) return;
    const campus = campusId ? CAMPUS_MAP[campusId] : null;
    const center = campus?.center ?? AMAP_DEFAULT_CENTER;
    let zoom = campusId ? 15 : 13;
    if (campusId === "2") {
      zoom = 13;
    }

    const campusLabel = language === "en" ? "Campus" : "校区";
    const providerLabel = language === "en" ? "Provider" : "服务商";
    const freeLabel = language === "en" ? "Free" : "空闲";
    const totalLabel = language === "en" ? "Total" : "总数";
    const faultLabel = language === "en" ? "Fault" : "故障";
    const unassignedLabel = language === "en" ? "Unassigned" : "未分配";

    const tooltipOption: TooltipComponentOption = {
      trigger: "item",
      formatter: (params: TopLevelFormatterParams) => {
        const payload = params as TooltipParams;
        const station = payload.data?.station ?? undefined;
        const name = (params as { name?: string }).name;
        if (!station) return name ?? "";
        const translatedCampus =
          station.campusId && station.campusId.length > 0
            ? getCampusDisplayName(station.campusId, language)
            : station.campusName || unassignedLabel;
        return `
          <div style="min-width: 180px">
            <strong>${station.name}</strong><br/>
            ${campusLabel}：${translatedCampus}<br/>
            ${providerLabel}：${station.provider}<br/>
            ${freeLabel}：${station.free} / ${totalLabel}：${station.total}<br/>
            ${faultLabel}：${station.error}
          </div>
        `;
      },
    };

    const scatterSeries: ScatterSeriesOption = {
      name: language === "en" ? "Stations" : "站点",
      type: "scatter",
      coordinateSystem: "amap",
      data: dataPoints,
      symbolSize: (rawParams: CallbackDataParams) => {
        const params = rawParams as TooltipParams;
        const station = params.data?.station;
        const free = station?.free ?? 0;
        const baseSize = free > 8 ? 30 : free > 4 ? 26 : 22;
        if (params.data?.symbol === BATTERY_SWAP_SYMBOL) {
          return [baseSize - 2, baseSize - 2];
        }
        return baseSize;
      },
      itemStyle: {
        color: (rawParams: CallbackDataParams) => {
          const params = rawParams as TooltipParams;
          const station = params.data?.station ?? undefined;
          if (station) {
            const color = getStationColor(station, palette);
            // 临时调试日志
            if (process.env.NODE_ENV === "development") {
              console.log(`Station ${station.name}: total=${station.total}, free=${station.free}, color=${color}`);
            }
            return color;
          }
          return palette.free;
        },
        borderColor: "#ffffff",
        borderWidth: 2,
      },
      label: {
        show: true,
        formatter: (rawParams: CallbackDataParams) => {
          const params = rawParams as TooltipParams;
          return `${params.data?.station?.free ?? 0}`;
        },
        position: "inside",
        color: "#ffffff",
        fontWeight: "bold",
      },
    };

    const option: EChartsOption = {
      amap: {
        viewMode: "2D",
        zoom,
        resizeEnable: true,
        center,
        mapStyle:
          theme === "dark" ? "amap://styles/dark" : "amap://styles/normal",
        features: ["bg", "road", "building", "point"],
      },
      tooltip: tooltipOption,
      series: [scatterSeries],
    };

    chart.setOption(option, true);
    setMapRenderKey((value) => value + 1);
  }, [chart, dataPoints, campusId, amapReady, theme, palette, language]);

  const gaodeNavOption = navTarget
    ? navigationConfig(navTarget, "gaode")
    : null;
  const systemNavOption = navTarget
    ? navigationConfig(navTarget, "system")
    : null;
  const navTitle =
    navTarget && language === "en"
      ? `Navigate to ${navTarget.name}`
      : navTarget
        ? `导航到 ${navTarget.name}`
        : "";
  const switchingNavText =
    language === "en" ? "Switching navigation..." : "正在切换导航...";
  const pendingNavText =
    pendingNavTarget && language === "en"
      ? `Switching to ${pendingNavTarget.name}`
      : pendingNavTarget
        ? `切换至 ${pendingNavTarget.name}`
        : null;
  const closeNavAria =
    language === "en" ? "Close navigation panel" : "关闭导航面板";
  const gaodeButtonText =
    language === "en" ? "Gaode Map Nav" : "高德地图导航";
  const systemButtonText = language === "en" ? "System Map Nav" : "系统地图导航";

  const getAmap = useCallback((): AMapMap | null => {
    if (!chart) return null;
    const model = (
      chart as unknown as {
        getModel: () => {
          getComponent: (
            name: string,
          ) => { getAMap?: () => AMapMap | null } | null;
        };
      }
    ).getModel();
    const component = model.getComponent("amap");
    return component?.getAMap?.() ?? null;
  }, [chart]);

  useEffect(() => {
    return () => {
      const amap = getAmap();
      if (amap && userMarkerRef.current) {
        amap.remove(userMarkerRef.current);
        userMarkerRef.current = null;
        userMarkerElementRef.current = null;
      }
    };
  }, [getAmap]);

  useEffect(() => {
    const amap = getAmap();
    if (!amap) return;

    if (
      focusStation &&
      focusStation.longitude !== null &&
      focusStation.latitude !== null
    ) {
      amap.setZoom(17);
      amap.setCenter([focusStation.longitude, focusStation.latitude]);
      return;
    }

    const filtered = stations.filter(
      (station) => station.longitude !== null && station.latitude !== null,
    );
    if (filtered.length === 0) return;

    const campusFiltered = campusId
      ? filtered.filter((station) => station.campusId === campusId)
      : filtered;
    const dataset = campusFiltered.length > 0 ? campusFiltered : filtered;

    const bounds = dataset.reduce(
      (acc, station) => {
        const lng = station.longitude as number;
        const lat = station.latitude as number;
        acc.sw[0] = Math.min(acc.sw[0], lng);
        acc.sw[1] = Math.min(acc.sw[1], lat);
        acc.ne[0] = Math.max(acc.ne[0], lng);
        acc.ne[1] = Math.max(acc.ne[1], lat);
        return acc;
      },
      {
        sw: [Infinity, Infinity] as [number, number],
        ne: [-Infinity, -Infinity] as [number, number],
      },
    );

    if (!Number.isFinite(bounds.sw[0]) || !Number.isFinite(bounds.ne[0]))
      return;

    const centerLng = (bounds.sw[0] + bounds.ne[0]) / 2;
    const centerLat = (bounds.sw[1] + bounds.ne[1]) / 2;
    const radiusLng = bounds.ne[0] - bounds.sw[0];
    const radiusLat = bounds.ne[1] - bounds.sw[1];
    const span = Math.max(radiusLng, radiusLat);
    const zoom = span > 0.3 ? 12 : span > 0.15 ? 13 : span > 0.08 ? 15 : 16;

    amap.setZoom(zoom);
    amap.setCenter([centerLng, centerLat]);
  }, [focusStation, stations, campusId, getAmap]);

  useEffect(() => {
    if (!chart) return;
    let longPressTimer: number | null = null;

    const navTargetFromParams = (params: CallbackDataParams) => {
      const point = params as TooltipParams;
      const station = point.data?.station;
      if (station) {
        requestNavTarget(station);
      }
    };

    const startLongPress = (params: CallbackDataParams) => {
      const point = params as TooltipParams;
      const station = point.data?.station;
      if (!station) return;
      if (longPressTimer) {
        window.clearTimeout(longPressTimer);
      }
      longPressTimer = window.setTimeout(() => {
        requestNavTarget(station);
        longPressTimer = null;
      }, 600);
    };

    const cancelLongPress = () => {
      if (longPressTimer) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    chart.on("dblclick", navTargetFromParams);
    chart.on("mousedown", startLongPress);
    chart.on("mouseup", cancelLongPress);
    chart.on("globalout", cancelLongPress);

    return () => {
      cancelLongPress();
      chart.off("dblclick", navTargetFromParams);
      chart.off("mousedown", startLongPress);
      chart.off("mouseup", cancelLongPress);
      chart.off("globalout", cancelLongPress);
    };
  }, [chart, requestNavTarget]);

  useEffect(() => {
    const amap = getAmap();
    if (!amap) return;
    const MarkerCtor = window.AMap?.Marker;
    if (!MarkerCtor) return;
    void mapRenderKey;

    if (!tracking || !userLocation) {
      if (userMarkerRef.current) {
        amap.remove(userMarkerRef.current);
        userMarkerRef.current = null;
        userMarkerElementRef.current = null;
      }
      return;
    }

    if (!userMarkerRef.current) {
      const markerElement =
        userMarkerElementRef.current ?? createUserMarkerElement();
      if (!markerElement) return;
      userMarkerElementRef.current = markerElement;
      userMarkerRef.current = new MarkerCtor({
        position: [userLocation.longitude, userLocation.latitude],
        bubble: true,
        content: markerElement,
      });
    } else if (!userMarkerElementRef.current) {
      const markerElement = createUserMarkerElement();
      if (markerElement) {
        userMarkerElementRef.current = markerElement;
        userMarkerRef.current.setContent?.(markerElement);
      }
    }

    userMarkerRef.current?.setPosition?.([
      userLocation.longitude,
      userLocation.latitude,
    ]);
    if (userMarkerRef.current?.setMap) {
      userMarkerRef.current.setMap(amap);
    } else {
      amap.add(userMarkerRef.current);
    }
  }, [userLocation, tracking, getAmap, mapRenderKey]);

  if (!amapKey) {
    return (
      <div className="flex h-full min-h-[360px] flex-1 flex-col items-center justify-center rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
        <p>
          {language === "en"
            ? "Missing AMap Key (set NEXT_PUBLIC_AMAP_KEY)."
            : "缺少 AMap Key（设置 NEXT_PUBLIC_AMAP_KEY 环境变量）"}
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-[360px]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute bottom-4 right-4">
        <Button
          size="sm"
          variant={tracking ? "default" : "secondary"}
          onClick={tracking ? onStopTracking : onStartTracking}
          className={cn(
            "shadow-lg",
            !tracking && trackingHighlight
              ? "ring-2 ring-emerald-400/70 ring-offset-2 animate-pulse"
              : undefined,
          )}
        >
          {tracking ? stopTrackingLabel : startTrackingLabel}
        </Button>
      </div>
      {navTarget && (
        <div className="absolute top-4 right-4 w-72 rounded-2xl border bg-card p-4 shadow-xl transition duration-200 ease-out">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold" aria-live="polite">
                {isSwitchingNav ? switchingNavText : navTitle}
              </p>
              {isSwitchingNav && pendingNavText ? (
                <p className="text-xs text-emerald-500">{pendingNavText}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-emerald-50 text-emerald-500 shadow-sm transition hover:bg-emerald-100 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:bg-emerald-400/15 dark:text-emerald-200"
              onClick={() => {
                cancelNavTransition();
                setNavTarget(null);
              }}
              aria-label={closeNavAria}
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <Button
              onClick={() =>
                gaodeNavOption &&
                attemptOpen(gaodeNavOption.primary, gaodeNavOption.fallback)
              }
            >
              {gaodeButtonText}
            </Button>
            {systemNavOption ? (
              <Button
                variant="secondary"
                className="border border-slate-300/70 bg-white/90 text-slate-900 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                onClick={() =>
                  attemptOpen(systemNavOption.primary, systemNavOption.fallback)
                }
              >
                {systemButtonText}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
