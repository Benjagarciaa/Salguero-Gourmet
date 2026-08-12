import type { NextConfig } from "next";

/**
 * Content-Security-Policy. `'unsafe-inline'` en script/style es un compromiso a
 * propósito: el sitio es estático (prerender), así que usar nonces obligaría a
 * render dinámico y mataría el cacheo. Se permiten los dominios de Microsoft
 * Clarity (carga del script + envío de datos) para que las grabaciones sigan
 * funcionando. next/font auto-hostea las fuentes (mismo origen); los dominios de
 * Google Fonts se dejan por las dudas pero no se usan en runtime.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.clarity.ms https://*.clarity.ms",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.clarity.ms https://c.bing.com",
  "media-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  images: {
    // AVIF primero (mejor compresion), WebP de fallback.
    formats: ["image/avif", "image/webp"],
    // Calidades permitidas (Next 16 rechaza con 400 las que no estén acá): 75 para
    // el poster del hero (LCP) y 88 para las imágenes de contenido (más nitidez).
    qualities: [75, 88],
  },
  // Headers de seguridad (hardening) aplicados a todas las respuestas.
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
