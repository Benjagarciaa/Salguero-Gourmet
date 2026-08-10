import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF primero (mejor compresion), WebP de fallback.
    formats: ["image/avif", "image/webp"],
    // Calidades permitidas (Next 16 rechaza con 400 las que no estén acá): 75 para
    // el poster del hero (LCP) y 88 para las imágenes de contenido (más nitidez).
    qualities: [75, 88],
  },
};

export default nextConfig;
