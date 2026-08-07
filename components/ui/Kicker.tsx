import { cn } from "@/lib/cn";

/**
 * Kicker: etiqueta mono en mayúsculas con tick cuadrado amarillo.
 * Uso: encabezado de sección (arriba del título). tracking .18em.
 */
export function Kicker({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-[10px] font-mono text-[11px] uppercase tracking-[0.18em] text-crema-dim",
        className,
      )}
    >
      <span aria-hidden className="h-[6px] w-[6px] shrink-0 bg-amarillo" />
      {children}
    </span>
  );
}
