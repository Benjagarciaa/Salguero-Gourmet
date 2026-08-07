import Image from "next/image";
import { Container } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { cn } from "@/lib/cn";
import { galeria, type GaleriaFoto } from "@/content/data";

/**
 * Una cinta del marquee. Duplica las fotos para que el loop con translate3d(-50%)
 * sea continuo; las copias van aria-hidden para no repetir en lectores de pantalla.
 */
function Track({
  fotos,
  reverse,
}: {
  fotos: GaleriaFoto[];
  reverse?: boolean;
}) {
  const items = [...fotos, ...fotos];
  return (
    <div className="mq-viewport">
      <div className={cn("mq-track", reverse && "mq-track-rev")}>
        {items.map((f, i) => {
          const dup = i >= fotos.length;
          return (
            <figure
              key={i}
              className="mr-4 w-[280px] shrink-0"
              aria-hidden={dup || undefined}
            >
              <div className="relative h-[230px] overflow-hidden rounded-lg border border-hairline">
                <Image
                  src={f.image}
                  alt={dup ? "" : f.alt}
                  fill
                  sizes="280px"
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
        <SectionHead kicker={galeria.head.kicker} title={galeria.head.title} />
      </Container>
      <div className="flex flex-col gap-4">
        <Track fotos={track1} />
        <Track fotos={track2} reverse />
      </div>
    </section>
  );
}
