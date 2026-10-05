"use client";

import { getImageProps } from "next/image";
import { cn } from "@/lib/cn";
import type { GaleriaFoto } from "@/content/data";

/**
 * Una banda del marquee de la Galería quieta (Galeria.tsx): la versión sin JS,
 * con reducir movimiento o en pantallas bajas. En modo escena, que es el de
 * casi todo el público, está en display none.
 *
 * Componente cliente a propósito: sus 24 fotos se arman acá, del lado del
 * cliente, con getImageProps (los mismos src, srcSet, sizes, lazy, decoding y
 * style de fill que ponía next/image, calculados con la misma configuración en
 * el servidor y en el cliente) y un <img> común. Así:
 * - las 48 fotos de las dos bandas dejan de hidratarse una por una como
 *   componentes <Image> (solo se hidratan las dos bandas);
 * - el HTML del servidor queda igual (menos el data-nimg, que ningún CSS usa);
 * - el payload RSC no carga 48 srcSet ni el marcado de las figuras: viajan
 *   solo las fotos de cada banda.
 * Sin placeholder, que getImageProps no admite.
 */

/**
 * Arma dos "unidades" idénticas para que translateX(-50%) haga loop sin cortes.
 * Repite el set hasta tener >=12 figuras por unidad, así una unidad siempre
 * supera el ancho del viewport (no aparece hueco al reiniciar el loop).
 */
function buildItems(base: GaleriaFoto[]): GaleriaFoto[] {
  if (base.length === 0) return [];
  const MIN_PER_UNIT = 12;
  const repeats = Math.max(2, Math.ceil(MIN_PER_UNIT / base.length));
  const unit = Array.from({ length: repeats }, () => base).flat();
  return [...unit, ...unit];
}

function FotoMarquee({ foto, alt }: { foto: GaleriaFoto; alt: string }) {
  const { props } = getImageProps({
    src: foto.image,
    alt,
    fill: true,
    quality: 88,
    sizes: "(max-width: 640px) 220px, 280px",
    className:
      "object-cover transition-transform duration-[650ms] ease-resorte-lento group-hover:scale-[1.06]",
  });
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- alt viene en props
  return <img {...props} />;
}

export function Track({
  fotos,
  reverse,
}: {
  fotos: GaleriaFoto[];
  reverse?: boolean;
}) {
  const items = buildItems(fotos);
  return (
    <div className="mq-viewport">
      <div className={cn("mq-track", reverse && "mq-track-rev")}>
        {items.map((f, i) => {
          const real = i < fotos.length;
          return (
            <figure
              key={i}
              className="group relative mr-3 h-[170px] w-[220px] shrink-0 overflow-hidden rounded-lg border border-hairline transition-colors duration-300 hover:border-[rgba(233,188,79,0.55)] sm:mr-4 sm:h-[200px] sm:w-[260px] min-[860px]:h-[230px] min-[860px]:w-[280px]"
              aria-hidden={!real || undefined}
            >
              <FotoMarquee foto={f} alt={real ? f.alt : ""} />
              {/* Etiqueta sobre la imagen con degradé; al hover sube apenas. Siempre
                  visible (sirve también en mobile). */}
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-[rgba(12,8,4,0.88)] via-[rgba(12,8,4,0.3)] to-transparent px-3 pb-3 pt-9">
                <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.13em] text-crema transition-transform duration-500 ease-resorte group-hover:-translate-y-0.5">
                  <span aria-hidden className="h-[7px] w-[7px] shrink-0 bg-amarillo" />
                  {f.caption}
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
