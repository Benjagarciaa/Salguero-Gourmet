import Image from "next/image";
import { Container } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { GaleriaLightbox } from "@/components/ui/GaleriaLightbox";
import { InstagramIcon } from "@/components/ui/InstagramIcon";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { contacto, galeria, type GaleriaFoto } from "@/content/data";

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
              className="group relative mr-3 h-[170px] w-[220px] shrink-0 overflow-hidden rounded-lg border border-hairline transition-colors duration-300 hover:border-[rgba(233,188,79,0.55)] sm:mr-4 sm:h-[200px] sm:w-[260px] min-[860px]:h-[230px] min-[860px]:w-[280px]"
              aria-hidden={!real || undefined}
            >
              <Image
                src={f.image}
                alt={real ? f.alt : ""}
                fill
                quality={88}
                sizes="(max-width: 640px) 220px, 280px"
                className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
              />
              {/* Etiqueta sobre la imagen con degradé; al hover sube apenas. Siempre
                  visible (sirve también en mobile). */}
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-[rgba(12,8,4,0.88)] via-[rgba(12,8,4,0.3)] to-transparent px-3 pb-3 pt-9">
                <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.13em] text-crema transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5">
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
      {/* Cada banda entra desde la dirección hacia la que scrollea; el clip
          evita overflow horizontal transitorio por el corrimiento de 48px. */}
      <div className="flex flex-col gap-3 overflow-x-clip sm:gap-4">
        <Reveal y={0} x={48} duration={0.9}>
          <Track fotos={track1} />
        </Reveal>
        <Reveal y={0} x={-48} duration={0.9}>
          <Track fotos={track2} reverse />
        </Reveal>
      </div>
    </section>
  );
}
