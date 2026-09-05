import { cn } from "@/lib/cn";

/**
 * Logo de la marca: SALGUERO + cuchara amarilla + GOURMET.
 * Decisión cerrada del cliente (ver CLAUDE.md): este wordmark, sin sello ni trío.
 * La cuchara escala con el tamaño de fuente (h-[1.45em]).
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[10px] font-sans font-bold tracking-[0.14em] text-crema",
        className,
      )}
    >
      SALGUERO
      <svg
        viewBox="0 0 34 180"
        aria-hidden="true"
        className="h-[1.45em] w-auto origin-[50%_20%] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/logo:-rotate-12 group-hover/logo:-translate-y-[2px]"
      >
        <g fill="#E9BC4F">
          <ellipse cx="17" cy="27" rx="17" ry="27" />
          <rect x="12.25" y="48" width="9.5" height="132" rx="4.75" />
        </g>
      </svg>
      GOURMET
    </span>
  );
}
