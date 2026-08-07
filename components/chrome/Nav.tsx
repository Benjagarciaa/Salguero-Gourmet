import { Wordmark } from "@/components/ui/Wordmark";
import { Pill } from "@/components/ui/Pill";
import { nav } from "@/content/data";

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-hairline bg-[rgba(36,28,21,0.86)] backdrop-blur-[10px]">
      <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-6 py-[13px]">
        <a
          href="#inicio"
          aria-label="Salguero Gourmet, inicio"
          className="shrink-0"
        >
          <Wordmark className="text-[13px] sm:text-[15px]" />
        </a>
        <div className="hidden gap-[26px] text-[14px] text-crema-dim min-[860px]:flex">
          {nav.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-crema"
            >
              {l.label}
            </a>
          ))}
        </div>
        <Pill href={nav.cta.href} size="sm" className="shrink-0">
          {nav.cta.label}
        </Pill>
      </div>
    </nav>
  );
}
