import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/chrome/SmoothScroll";
import { QuoteProvider } from "@/components/chrome/QuoteContext";

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

// SEO completo (OG, JSON-LD, sitemap, metadataBase) se arma en FASE 5.
export const metadata: Metadata = {
  title: "Salguero Gourmet · Catering y pastelería en Córdoba",
  description:
    "Catering gourmet, pastelería para eventos, boxes de regalo y propuestas corporativas en Córdoba capital. Pedí tu presupuesto por WhatsApp.",
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
        <SmoothScroll>
          <QuoteProvider>{children}</QuoteProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
