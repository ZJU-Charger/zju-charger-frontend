import { useCallback, useEffect, useRef, useState } from "react";
import { wgs84ToGcj02 } from "@/lib/geo";

export interface GeoPoint {
  longitude: number;
  latitude: number;
  accuracy?: number | null;
}

interface Options {
  onError?: (message: string) => void;
}

export function useRealtimeLocation({ onError }: Options = {}) {
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [watching, setWatching] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setWatching(false);
    setPoint(null);
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      onError?.("当前浏览器不支持定位");
      return;
    }
    if (watchIdRef.current !== null) {
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const [lng, lat] = wgs84ToGcj02(
          position.coords.longitude,
          position.coords.latitude,
        );
        setPoint({
          longitude: lng,
          latitude: lat,
          accuracy: position.coords.accuracy,
        });
        setWatching(true);
      },
      (error) => {
        const messages: Record<number, string> = {
          1: "定位权限被拒绝",
          2: "无法获取定位信号",
          3: "定位超时",
        };
        onError?.(messages[error.code] ?? error.message);
        stop();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
    watchIdRef.current = id;
  }, [onError, stop]);

  useEffect(() => () => stop(), [stop]);

  return { point, watching, start, stop };
}
