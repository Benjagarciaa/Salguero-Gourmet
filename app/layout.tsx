import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/content/data";
import { SmoothScroll } from "@/components/chrome/SmoothScroll";
import { QuoteProvider } from "@/components/chrome/QuoteContext";
import { AmbientBackground } from "@/components/chrome/AmbientBackground";
import { MotionProvider } from "@/components/chrome/MotionProvider";
import { ScrollProgress } from "@/components/chrome/ScrollProgress";
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
        <JsonLd />
        <ScrollingTitle />
        <AmbientBackground />
        <MotionProvider>
          <ScrollProgress />
          <SmoothScroll>
            <QuoteProvider>
              <Nav />
              {children}
              <Footer />
            </QuoteProvider>
          </SmoothScroll>
        </MotionProvider>
      </body>
    </html>
  );
}
