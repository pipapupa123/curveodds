import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for deployment behind Caddy.
  output: "standalone",
  // A separate build dir lets a production build run while `next dev` holds .next.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  devIndicators: false,
};

export default nextConfig;
