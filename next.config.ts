import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for deployment behind Caddy.
  output: "standalone",
  devIndicators: false,
};

export default nextConfig;
