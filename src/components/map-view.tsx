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
import type { GeoPoint } from "@/hooks/use-realtime-location";
import { type AMapMap, type AMapMarker, loadAmap } from "@/lib/amap";
import { AMAP_DEFAULT_CENTER, CAMPUS_MAP } from "@/lib/config";
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
}

interface MapDataPoint {
  name: string;
  value: [number, number, number, number];
  station: StationRecord;
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
  // 根据 UA 判断平台
  if (typeof navigator === "undefined") return "else";
  const ua = navigator.userAgent || "";
  console.info("UA:", ua);
  if (/Android/i.test(ua)) return "android"; // 安卓
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios"; // ios
  if (/Macintosh|MacIntel/i.test(ua)) return "mac"; // 苹果电脑
  return "else"; // 其他
};

const LIGHT_PALETTE = {
  free: "#22c55e",
  busy: "#f97316",
  error: "#f43f5e",
};

const DARK_PALETTE = {
  free: "#4ade80",
  busy: "#fb923c",
  error: "#fb7185",
};

function getStationColor(
  station: StationRecord,
  palette: typeof LIGHT_PALETTE,
): string {
  if (station.error > 0) return palette.error;
  if (station.free === 0) return palette.error;
  if (station.free <= 3) return palette.busy;
  return palette.free;
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
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chart, setChart] = useState<echarts.ECharts | null>(null);
  const [amapReady, setAmapReady] = useState<boolean>(false);
  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY;
  const [navTarget, setNavTarget] = useState<StationRecord | null>(null);
  const [pendingNavTarget, setPendingNavTarget] =
    useState<StationRecord | null>(null);
  const [isSwitchingNav, setIsSwitchingNav] = useState(false);
  const userMarkerRef = useRef<AMapMarker | null>(null);
  const navSwitchTimerRef = useRef<number | null>(null);
  const palette = useMemo(
    () => (theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE),
    [theme],
  );
  const platform = useMemo(detectPlatform, []);

  useEffect(() => {
    console.info("Platform:", platform);
  }, [platform]);

  const formatCoord = useCallback(
    (station: StationRecord) => `${station.latitude},${station.longitude}`,
    [],
  );

  const buildAndroidGaodeIntent = (station: StationRecord) => {
    const encodedName = encodeURIComponent(station.name);
    return `intent://navi?sourceApplication=ZJU+Charger&poiname=${encodedName}&lat=${station.latitude}&lon=${station.longitude}&dev=0&style=2#Intent;scheme=androidamap;package=com.autonavi.minimap;category=android.intent.category.DEFAULT;end`;
  };

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
          const url = `iosamap://navi?sourceApplication=ZJUCharger&poiname=${encodeURIComponent(
            station.name,
          )}&lat=${latitude}&lon=${longitude}&dev=0`;
          console.info("URL:", url);
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

    const tooltipOption: TooltipComponentOption = {
      trigger: "item",
      formatter: (params: TopLevelFormatterParams) => {
        const payload = params as TooltipParams;
        const station = payload.data?.station ?? undefined;
        const name = (params as { name?: string }).name;
        if (!station) return name ?? "";
        return `
          <div style="min-width: 180px">
            <strong>${station.name}</strong><br/>
            校区：${station.campusName || "未分配"}<br/>
            服务商：${station.provider}<br/>
            空闲：${station.free} / 总数：${station.total}<br/>
            故障：${station.error}
          </div>
        `;
      },
    };

    const scatterSeries: ScatterSeriesOption = {
      name: "站点",
      type: "scatter",
      coordinateSystem: "amap",
      data: dataPoints,
      symbolSize: (rawParams: CallbackDataParams) => {
        const params = rawParams as TooltipParams;
        const free = params.data?.station?.free ?? 0;
        if (free > 8) return 30;
        if (free > 4) return 26;
        return 22;
      },
      itemStyle: {
        color: (rawParams: CallbackDataParams) => {
          const params = rawParams as TooltipParams;
          const station = params.data?.station ?? undefined;
          return station ? getStationColor(station, palette) : palette.free;
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
  }, [chart, dataPoints, campusId, amapReady, theme, palette]);

  const gaodeNavOption = navTarget
    ? navigationConfig(navTarget, "gaode")
    : null;
  const systemNavOption = navTarget
    ? navigationConfig(navTarget, "system")
    : null;

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

    if (userLocation) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = new MarkerCtor({
          position: [userLocation.longitude, userLocation.latitude],
          bubble: true,
        });
        amap.add(userMarkerRef.current);
      }
      userMarkerRef.current?.setPosition?.([
        userLocation.longitude,
        userLocation.latitude,
      ]);
    } else if (userMarkerRef.current) {
      amap.remove(userMarkerRef.current);
      userMarkerRef.current = null;
    }
  }, [userLocation, getAmap]);

  if (!amapKey) {
    return (
      <div className="flex h-full min-h-[360px] flex-1 flex-col items-center justify-center rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
        <p>缺少 AMap Key（设置 NEXT_PUBLIC_AMAP_KEY 环境变量）</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-[360px]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <Button
          size="sm"
          variant={tracking ? "default" : "secondary"}
          onClick={tracking ? onStopTracking : onStartTracking}
        >
          {tracking ? "停止实时定位" : "开启实时定位"}
        </Button>
      </div>
      {navTarget && (
        <div className="absolute top-4 right-4 w-72 rounded-2xl border bg-card p-4 shadow-xl transition duration-200 ease-out">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold" aria-live="polite">
                {isSwitchingNav
                  ? "正在切换导航..."
                  : `导航到 ${navTarget.name}`}
              </p>
              {isSwitchingNav && pendingNavTarget ? (
                <p className="text-xs text-emerald-500">
                  切换至 {pendingNavTarget.name}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="h-9 w-9 rounded-xl border border-muted-foreground/40 bg-white/70 text-sm text-muted-foreground transition hover:border-emerald-400 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
              onClick={() => {
                cancelNavTransition();
                setNavTarget(null);
              }}
              aria-label="关闭导航面板"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <Button
              onClick={() =>
                gaodeNavOption &&
                attemptOpen(gaodeNavOption.primary, gaodeNavOption.fallback)
              }
            >
              高德地图导航
            </Button>
            {systemNavOption ? (
              <Button
                variant="secondary"
                className="border border-slate-300/70 bg-white/90 text-slate-900 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                onClick={() =>
                  attemptOpen(systemNavOption.primary, systemNavOption.fallback)
                }
              >
                系统导航
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
