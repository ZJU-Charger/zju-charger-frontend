import type { NextConfig } from "next";

const fetchInterval = process.env.FETCH_INTERVAL;

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.*.*", "localhost", "127.0.0.1"],
  reactCompiler: true,
  env: {
    ...(fetchInterval ? { NEXT_PUBLIC_FETCH_INTERVAL: fetchInterval } : {}),
  },
};

export default nextConfig;
