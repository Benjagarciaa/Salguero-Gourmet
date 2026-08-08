import { site, contacto } from "@/content/data";

/**
 * Datos estructurados (schema.org) del negocio local. Alimentados desde
 * content/data.ts, sin inventar campos. Google los usa para entender la entidad
 * (SEO local, rich results). Se renderiza como <script type="application/ld+json">.
 */
export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": ["Caterer", "Bakery"],
    "@id": `${site.url}/#business`,
    name: site.name,
    description: site.description,
    url: site.url,
    image: `${site.url}/media/og-base.jpg`,
    telephone: contacto.whatsappDisplay,
    email: contacto.email,
    servesCuisine: ["Catering", "Pastelería", "Gastronomía de autor"],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Córdoba",
      addressRegion: "Córdoba",
      addressCountry: "AR",
    },
    areaServed: { "@type": "City", name: "Córdoba" },
    sameAs: [contacto.instagramUrl, contacto.googleProfileUrl],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: site.rating.toFixed(1),
      reviewCount: String(site.reviewCount),
      bestRating: "5",
    },
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify escapa el contenido; es data propia, no input de usuario.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
