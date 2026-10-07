import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the dev badge clear of the search bar and the country card (top/right)
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
