import type { MetadataRoute } from "next";
import { site } from "@/content/data";

/** Web App Manifest (PWA basics + theme color de la marca). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "Salguero",
    description: site.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#241c15",
    theme_color: "#241c15",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
