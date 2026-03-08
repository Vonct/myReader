import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/myreader",
  distDir: "node_modules/.cache/next",
  allowedDevOrigins: ["localhost:3000", "100.76.49.16", "100.76.49.16:3000", "*.loca.lt"],
  async redirects() {
    return [
      {
        source: "/",
        destination: "/myreader",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
