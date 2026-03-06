import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/myreader",
  allowedDevOrigins: ["localhost:3000", "*.loca.lt"],
};

export default nextConfig;
