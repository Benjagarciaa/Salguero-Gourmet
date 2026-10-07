import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { site } from "@/content/data";
import { SCRIPT_MAQUETADO } from "@/lib/maquetado";
import { SmoothScroll } from "@/components/chrome/SmoothScroll";
import { QuoteProvider } from "@/components/chrome/QuoteContext";
import { AmbientBackground } from "@/components/chrome/AmbientBackground";
import { MotionProvider } from "@/components/chrome/MotionProvider";
import { Decoracion } from "@/components/chrome/Decoracion";
import { JsonLd } from "@/components/chrome/JsonLd";
import { ScrollingTitle } from "@/components/chrome/ScrollingTitle";
import { Nav } from "@/components/chrome/Nav";
import { Footer } from "@/components/chrome/Footer";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dmsans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
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
        {/* Microsoft Clarity: heatmaps + grabación de sesiones. lazyOnload = carga
            en el idle, DESPUÉS del LCP, para que sus requests (collect) no le
            compitan el ancho de banda al hero en mobile. Graba la sesión igual.
            Solo en producción: en dev su handler de scroll fuerza layout en cada
            evento (tareas de 39 a 57 ms, la mitad de fps con CPU x4) y además
            ensuciaba los datos con sesiones de localhost. Además corre SOLO en el
            dominio publicado: las vistas previas de Vercel y el `next start`
            local no graban (si no, se mezclan visitas de prueba con las reales). */}
        {process.env.NODE_ENV === "production" && (
          <Script id="ms-clarity" strategy="lazyOnload">
            {`if (/^(www\\.)?salguerogourmet\\.com$/.test(location.hostname)) (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "y0bxo4c1tq");`}
          </Script>
        )}
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
