import Image from "next/image";
import { Container } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { GaleriaLightbox } from "@/components/ui/GaleriaLightbox";
import { InstagramIcon } from "@/components/ui/InstagramIcon";
import { cn } from "@/lib/cn";
import { contacto, galeria, type GaleriaFoto } from "@/content/data";

/**
 * Arma dos "unidades" idénticas para que translateX(-50%) haga loop sin cortes.
 * Repite el set hasta tener >=12 figuras por unidad, así una unidad siempre
 * supera el ancho del viewport (no aparece hueco al reiniciar el loop).
 */
function buildItems(base: GaleriaFoto[]): GaleriaFoto[] {
  const MIN_PER_UNIT = 12;
  const repeats = Math.max(2, Math.ceil(MIN_PER_UNIT / base.length));
  const unit = Array.from({ length: repeats }, () => base).flat();
  return [...unit, ...unit];
}

function Track({ fotos, reverse }: { fotos: GaleriaFoto[]; reverse?: boolean }) {
  const items = buildItems(fotos);
  return (
    <div className="mq-viewport">
      <div className={cn("mq-track", reverse && "mq-track-rev")}>
        {items.map((f, i) => {
          const real = i < fotos.length;
          return (
            <figure
              key={i}
              className="mr-3 w-[220px] shrink-0 sm:mr-4 sm:w-[260px] min-[860px]:w-[280px]"
              aria-hidden={!real || undefined}
            >
              <div className="relative h-[170px] overflow-hidden rounded-lg border border-hairline sm:h-[200px] min-[860px]:h-[230px]">
                <Image
                  src={f.image}
                  alt={real ? f.alt : ""}
                  fill
                  quality={88}
                  sizes="(max-width: 640px) 220px, 280px"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-2">
                <Etiqueta>{f.caption}</Etiqueta>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

export function Galeria() {
  const half = Math.ceil(galeria.fotos.length / 2);
  const track1 = galeria.fotos.slice(0, half);
  const track2 = galeria.fotos.slice(half);
  return (
    <section id="galeria" className="pb-[76px]">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <SectionHead
            kicker={galeria.head.kicker}
            title={galeria.head.title}
            className="!mb-0"
          />
          <div className="flex flex-wrap items-center gap-3">
            <GaleriaLightbox fotos={galeria.destacadas} />
            <a
              href={contacto.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-hairline px-[18px] py-[9px] text-[13.5px] font-medium text-crema-dim transition-colors hover:border-amarillo hover:text-amarillo"
            >
              <InstagramIcon className="size-[17px]" />
              {contacto.instagramHandle}
            </a>
          </div>
        </div>
      </Container>
      <div className="flex flex-col gap-3 sm:gap-4">
        <Track fotos={track1} />
        <Track fotos={track2} reverse />
      </div>
    </section>
  );
}
