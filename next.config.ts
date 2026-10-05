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
  // En dev React necesita eval() para sus herramientas de depuración (sin esto el
  // indicador de Next marca "1 Issue" en cada página). En producción no se agrega.
  "script-src 'self' 'unsafe-inline'" +
    (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "") +
    " https://www.clarity.ms https://*.clarity.ms",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  // admin.salguerogourmet.com: el cotizador avisa al panel de gestión (lead).
  // Next sirve estos headers también en dev, donde el panel corre en
  // localhost:3001: se permite solo ahí (la CSP de producción no cambia).
  "connect-src 'self' https://*.clarity.ms https://c.bing.com https://admin.salguerogourmet.com" +
    (process.env.NODE_ENV === "development" ? " http://localhost:3001" : ""),
  "media-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // En dev se omite: el servidor local es http y, abierto desde otro equipo de la
  // red (por ejemplo el celular en 192.168.x.x), el navegador pasaría todos los
  // archivos a https y no cargaría nada. En producción queda igual.
  ...(process.env.NODE_ENV === "development" ? [] : ["upgrade-insecure-requests"]),
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

/**
 * Caché de /media (solo producción). REGLA: lo que cambia en
 * /media/secuencia/ o /media/productos/ cambia de carpeta o de nombre
 * (caja-v6 -> caja-v7, mesa-mobile-v2.mp4, productos-v2); nunca se pisa en el
 * lugar, porque quien ya lo bajó lo conserva un año sin preguntar.
 * - secuencia/ (cuadros del hero, video de Galería) y productos/ (bocaditos):
 *   un año, immutable (la segunda visita no baja ni revalida nada).
 * - El resto de /media (fotos sueltas, un solo nivel): una semana más un día de
 *   stale-while-revalidate. No es immutable: si alguien pisa una foto con el
 *   mismo nombre, se renueva sola en días y no en un año. /_next/image hereda
 *   este max-age (el mayor entre minimumCacheTTL y el de la original).
 * Van después de los de seguridad: no tocan ninguna clave de esos.
 */
const INMUTABLE = "public, max-age=31536000, immutable";
const cacheDeMedia = [
  {
    source: "/media/secuencia/:path*",
    headers: [{ key: "Cache-Control", value: INMUTABLE }],
  },
  {
    source: "/media/productos/:path*",
    headers: [{ key: "Cache-Control", value: INMUTABLE }],
  },
  {
    source: "/media/:archivo",
    headers: [
      {
        key: "Cache-Control",
        value: "public, max-age=604800, stale-while-revalidate=86400",
      },
    ],
  },
];

const nextConfig: NextConfig = {
  // No revelar el stack en el header X-Powered-By.
  poweredByHeader: false,
  // Solo dev: permite abrir el servidor local desde otros equipos de la red de
  // casa (celular en 192.168.x.x) con recarga en caliente. No afecta producción.
  allowedDevOrigins: ["192.168.*.*"],
  images: {
    // AVIF primero (mejor compresion), WebP de fallback.
    formats: ["image/avif", "image/webp"],
    // Calidades permitidas (Next 16 rechaza con 400 las que no estén acá): 75 para
    // el poster del hero (LCP) y 88 para las imágenes de contenido (más nitidez).
    qualities: [75, 88],
  },
  // Headers de seguridad (hardening) aplicados a todas las respuestas y, solo
  // en producción, caché para /media (Next sirve public/ con max-age=0: cada
  // visita volvía a pedir o revalidar los ~7 a 11 MB de la secuencia del hero).
  // En dev no: ahí los archivos se regeneran en el lugar.
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      ...(process.env.NODE_ENV === "production" ? cacheDeMedia : []),
    ];
  },
};

export default nextConfig;
