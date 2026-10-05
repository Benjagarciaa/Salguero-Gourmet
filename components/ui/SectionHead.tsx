import type { EmphasisTitle } from "@/content/data";
import { cn } from "@/lib/cn";
import { Kicker } from "./Kicker";
import { Reveal } from "./Reveal";
import { PalabrasQueSeEncienden } from "./PalabrasQueSeEncienden";

/**
 * Encabezado de sección: kicker (opcional) + h2 con una palabra en itálica
 * amarilla + bajada (opcional). Replica `.sec-head` del mockup.
 * El h2 se "enciende" palabra por palabra al cruzar la pantalla (ver
 * PalabrasQueSeEncienden); sin JS o con reduced-motion se ve pleno.
 */
export function SectionHead({
  kicker,
  title,
  description,
  className,
}: {
  kicker?: string;
  title: EmphasisTitle;
  description?: string;
  className?: string;
}) {
  return (
    <Reveal className={cn("mb-10", className)}>
      {kicker ? <Kicker>{kicker}</Kicker> : null}
      <PalabrasQueSeEncienden
        title={title}
        className="mt-[14px] font-display text-[clamp(1.9rem,4vw,2.7rem)] font-medium leading-[1.15] text-crema"
      />
      {description ? (
        <p className="mt-3 max-w-[56ch] text-crema-dim">{description}</p>
      ) : null}
    </Reveal>
  );
}
