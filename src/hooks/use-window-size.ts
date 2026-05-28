import { useEffect, useState } from "react";

type Size = {
  width: number;
  height: number;
};

const defaultSize: Size = { width: 0, height: 0 };

function readWindowSize(): Size {
  if (typeof window === "undefined") {
    return defaultSize;
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

export function useWindowSize() {
  // Keep the first client render identical to SSR output to avoid hydration mismatches.
  const [size, setSize] = useState<Size>(defaultSize);

  useEffect(() => {
    setSize(readWindowSize());

    function handleResize() {
      setSize(readWindowSize());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}
