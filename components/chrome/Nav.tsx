import { Wordmark } from "@/components/ui/Wordmark";
import { Pill } from "@/components/ui/Pill";
import { nav } from "@/content/data";

/**
 * Nav sticky. Debajo de 410px la fila (wordmark + pill) no entraba en el ancho
 * útil y ensanchaba la página: ahí se achican apenas el gap, el wordmark y la
 * pill (con el mismo alto: el hero se fija debajo del nav), y debajo de 370px
 * (Android de 360) también el margen lateral. Debajo de 360px (iPhone SE de
 * 320) se achican un paso más el wordmark y la pill, y debajo de 320px (Galaxy
 * Fold de 280) también el margen y el gap. De 360px para arriba no cambia nada.
 */
export function Nav() {
  return (
    <nav
      aria-label="Principal"
      className="sticky top-0 z-50 border-b border-hairline bg-[rgba(36,28,21,0.86)] backdrop-blur-[10px]"
    >
      <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-6 py-[13px] max-[410px]:gap-2 max-[370px]:px-4 max-[320px]:gap-1.5 max-[320px]:px-3">
        <a
          href="#inicio"
          aria-label="Salguero Gourmet, inicio"
          className="group/logo shrink-0"
        >
          <Wordmark className="text-[13px] max-[410px]:text-[12px] max-[360px]:gap-[7px] max-[360px]:text-[10.5px] max-[320px]:gap-[6px] max-[320px]:text-[9.5px] sm:text-[15px]" />
        </a>
        <div className="hidden gap-[26px] text-[14px] text-crema-dim min-[860px]:flex">
          {nav.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative transition-colors hover:text-crema after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-amarillo after:content-[''] after:transition-transform after:duration-500 after:ease-resorte hover:after:scale-x-100 focus-visible:after:scale-x-100"
            >
              {l.label}
            </a>
          ))}
        </div>
        <Pill
          href={nav.cta.href}
          size="sm"
          className="shrink-0 max-[410px]:px-3.5 max-[410px]:text-[13px] max-[410px]:leading-[23px] max-[360px]:px-3 max-[360px]:text-[12px] max-[320px]:px-[9px] max-[320px]:text-[11px]"
        >
          {nav.cta.label}
        </Pill>
      </div>
    </nav>
  );
}
