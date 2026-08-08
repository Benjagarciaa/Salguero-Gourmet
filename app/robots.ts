import type { MetadataRoute } from "next";
import { site } from "@/content/data";

/** robots.txt: indexación abierta + referencia al sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
