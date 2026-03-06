import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    allowedDevOrigins: ["localhost:3000", "*.loca.lt"],
  },
};

export default nextConfig;
