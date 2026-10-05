import { ArrowUp } from "lucide-react";
import { Container } from "@/components/ui/Section";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { FooterMarca } from "./FooterMarca";
import { contacto, footer, nav, site } from "@/content/data";

/** Links del pie: mismo trato que los del nav (subrayado amarillo al hover/foco). */
const LINK =
  "relative inline-block text-crema-dim transition-colors duration-200 hover:text-crema focus-visible:text-crema after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-amarillo after:content-[''] after:transition-transform after:duration-500 after:ease-resorte hover:after:scale-x-100 focus-visible:after:scale-x-100";

/**
 * Pie: cierre de la página. Arriba, la bajada de marca y dos columnas cortas
 * (secciones y contacto directo); en el medio, el wordmark grande a todo el
 * ancho del contenido (FooterMarca, con su movimiento sutil); abajo, la línea
 * legal y "volver arriba". Todo es HTML del servidor, visible sin JS; el único
 * componente cliente es el wordmark.
 */
export function Footer() {
  const [bajada, lugar] = footer.tagline.split(" · ");
  const contactos = [
    { label: contacto.whatsappDisplay, href: contacto.whatsappHref, externo: true },
    { label: contacto.email, href: `mailto:${contacto.email}`, externo: false },
    { label: contacto.instagramHandle, href: contacto.instagramUrl, externo: true },
  ];

  return (
    <footer className="relative border-t border-hairline">
      <Container className="pt-16 min-[760px]:pt-20">
        <div className="grid gap-10 min-[760px]:grid-cols-[1.5fr_1fr_1fr] min-[760px]:gap-8">
          <p className="max-w-[20ch] font-display text-[26px] font-medium leading-[1.2] text-crema min-[760px]:text-[30px]">
            {bajada}
            {lugar ? (
              <span className="mt-1 block text-crema-dim">{lugar}</span>
            ) : null}
          </p>

          <nav aria-label={footer.navLabel}>
            <Etiqueta>{footer.secciones}</Etiqueta>
            <ul className="mt-5 flex flex-col gap-2.5 text-[15px]">
              {[...nav.links, nav.cta].map((l) => (
                <li key={l.href}>
                  <a href={l.href} className={LINK}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <Etiqueta>{footer.contacto}</Etiqueta>
            <ul className="mt-5 flex flex-col gap-2.5 text-[15px]">
              {contactos.map((c) => (
                <li key={c.href}>
                  <a
                    href={c.href}
                    className={LINK}
                    {...(c.externo
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <FooterMarca
          nombre={site.name}
          className="mt-16 min-[760px]:mt-24"
        />

        <div className="mt-8 flex flex-col gap-3 border-t border-hairline pb-10 pt-6 text-[13.5px] text-crema-dim min-[760px]:mt-10 min-[760px]:flex-row min-[760px]:items-center min-[760px]:justify-between">
          <span>{footer.copyright}</span>
          <a href="#inicio" className={`${LINK} group/arriba self-start`}>
            {footer.arriba}
            <ArrowUp
              aria-hidden
              className="ml-1.5 inline-block h-3.5 w-3.5 align-[-2px] transition-transform duration-500 ease-resorte group-hover/arriba:-translate-y-0.5"
            />
          </a>
        </div>
      </Container>
    </footer>
  );
}
