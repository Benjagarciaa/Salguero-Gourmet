import { cn } from "@/lib/cn";
import { Kicker } from "./Kicker";

export interface EmphasisTitle {
  pre: string;
  em: string;
  post?: string;
}

/**
 * Encabezado de sección: kicker (opcional) + h2 con una palabra en itálica
 * amarilla + bajada (opcional). Replica `.sec-head` del mockup.
 * `as` permite bajar el nivel semántico (ej. h3) sin cambiar el estilo.
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
    <div className={cn("mb-10", className)}>
      {kicker ? <Kicker>{kicker}</Kicker> : null}
      <h2 className="mt-[14px] font-display text-[clamp(1.9rem,4vw,2.7rem)] font-medium leading-[1.15] text-crema">
        {title.pre}
        <em className="italic text-amarillo">{title.em}</em>
        {title.post}
      </h2>
      {description ? (
        <p className="mt-3 max-w-[56ch] text-crema-dim">{description}</p>
      ) : null}
    </div>
  );
}
