import type { MetadataRoute } from "next";
import { site } from "@/content/data";

/** Sitemap (una sola URL: la landing). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
