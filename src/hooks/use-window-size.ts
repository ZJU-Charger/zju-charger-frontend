import { useEffect, useState } from "react";

type Size = {
  width: number;
  height: number;
};

const defaultSize: Size = { width: 0, height: 0 };

export function useWindowSize() {
  const [size, setSize] = useState<Size>(() => {
    if (typeof window === "undefined") return defaultSize;
    return { width: window.innerWidth, height: window.innerHeight };
  });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}
