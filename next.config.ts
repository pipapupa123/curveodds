import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for deployment behind Caddy.
  output: "standalone",
};

export default nextConfig;
