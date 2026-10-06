import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { site } from "@/content/data";
import { SCRIPT_MAQUETADO } from "@/lib/maquetado";
import { SmoothScroll } from "@/components/chrome/SmoothScroll";
import { QuoteProvider } from "@/components/chrome/QuoteContext";
import { AmbientBackground } from "@/components/chrome/AmbientBackground";
import { MotionProvider } from "@/components/chrome/MotionProvider";
import { Decoracion } from "@/components/chrome/Decoracion";
import { Clarity } from "@/components/chrome/Clarity";
import { JsonLd } from "@/components/chrome/JsonLd";
import { ScrollingTitle } from "@/components/chrome/ScrollingTitle";
import { Nav } from "@/components/chrome/Nav";
import { Footer } from "@/components/chrome/Footer";

/*
 * Playfair Display (normal e itálica) y JetBrains Mono: los MISMOS archivos que
 * sirve Google Fonts (subset latin, variables, con el eje de peso entero),
 * recortados con fontTools (pyftsubset, todas las features de OpenType) a
 * ASCII, las letras del español (á é í ó ú ü ñ y mayúsculas), ¡ ¿ « » ° º ª ·
 * × © ® ´, comillas tipográficas, – — … • € ™, flechas y espacios finos
 * (app/fonts, ver PENDIENTES.md). Rendimiento: 43 KB menos antes de la primera
 * pintura en celular. La Mono va sin ligaduras de código (calt): ningún texto
 * del sitio las usa. Un carácter fuera de esa lista (en un titular o una
 * etiqueta nuevos) saldría con la letra de respaldo: hay que sumarlo al
 * recorte. DM Sans sigue por next/font/google: también es la letra de lo que
 * la persona escribe en el cotizador (cualquier carácter).
 * Respaldo mientras cargan: las mismas caras métricas que generaba
 * next/font/google ("... Fallback", globals.css), así no cambia nada al llegar.
 */
const playfair = localFont({
  src: [
    { path: "./fonts/playfair-display.woff2", style: "normal" },
    { path: "./fonts/playfair-display-italic.woff2", style: "italic" },
  ],
  weight: "400 900",
  variable: "--font-playfair",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Playfair Display Fallback"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dmsans",
  display: "swap",
});

const jetbrains = localFont({
  src: "./fonts/jetbrains-mono.woff2",
  weight: "100 800",
  style: "normal",
  variable: "--font-jetbrains",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["JetBrains Mono Fallback"],
});

const metaTitle = `${site.name} · ${site.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: metaTitle,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  verification: {
    google: "qMlEPcAri2Kn8moKzbP_hu4ulnQR_VHGWnLxLIO9Ong",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: site.name,
    title: metaTitle,
    description: site.description,
    // La imagen la genera app/opengraph-image.tsx (diseñada, con texto de marca).
  },
  twitter: {
    card: "summary_large_image",
    title: metaTitle,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#241c15",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${playfair.variable} ${dmSans.variable} ${jetbrains.variable}`}
    >
      <body>
        {/* Microsoft Clarity (heatmaps + grabación de sesiones): en el idle
            después de `load` y con el hero ya pintado, solo en el dominio
            publicado (components/chrome/Clarity.tsx). Solo en producción. */}
        {process.env.NODE_ENV === "production" && <Clarity />}
        <JsonLd />
        <ScrollingTitle />
        <AmbientBackground />
        <MotionProvider>
          <Decoracion />
          <SmoothScroll>
            <QuoteProvider>
              <Nav />
              {children}
              <Footer />
            </QuoteProvider>
          </SmoothScroll>
        </MotionProvider>
        {/* Maquetado diferido: suelta de a una las secciones de abajo del
            hero cuando llegan las fuentes (lib/maquetado.ts y el bloque de
            globals.css). Al final del HTML: no frena la lectura del hero. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_MAQUETADO }} />
      </body>
    </html>
  );
}
