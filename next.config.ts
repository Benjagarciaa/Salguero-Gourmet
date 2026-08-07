import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF primero (mejor compresion), WebP de fallback.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
