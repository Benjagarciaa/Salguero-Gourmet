import { cn } from "@/lib/cn";

/**
 * Etiqueta: mono en mayúsculas con tick cuadrado amarillo, inline.
 * Como el kicker pero con tracking .14em y en línea (para chips, captions, metadatos).
 */
export function Etiqueta({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-crema-dim",
        className,
      )}
    >
      <span aria-hidden className="h-[6px] w-[6px] shrink-0 bg-amarillo" />
      {children}
    </span>
  );
}
