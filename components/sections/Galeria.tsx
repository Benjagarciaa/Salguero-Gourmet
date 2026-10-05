import { Container } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { GaleriaLightbox } from "@/components/ui/GaleriaLightbox";
import { InstagramIcon } from "@/components/ui/InstagramIcon";
import { Reveal } from "@/components/ui/Reveal";
import { contacto, galeria, type GaleriaFoto } from "@/content/data";
import { GaleriaEscena } from "./GaleriaEscena";
import { Track } from "./GaleriaTrack";
import s from "./Galeria.module.css";

/**
 * Lista del lightbox: el set curado y, al final, las fotos del carril que no
 * están en él (así cada foto del carril abre el visor en esa misma foto).
 */
function listaVisor(): GaleriaFoto[] {
  const faltan = galeria.fotos.filter(
    (f) => !galeria.destacadas.some((d) => d.image === f.image),
  );
  return [...galeria.destacadas, ...faltan];
}

/**
 * Galería. Dos versiones en el HTML del servidor; la media query de
 * Galeria.module.css muestra una sola:
 * - Escena (GaleriaEscena): intro corta con el video de la mesa que avanza con
 *   el scroll y, después, las fotos (desktop: marquee doble; mobile: carril
 *   deslizable).
 * - Quieta: sin JS, con reducir movimiento o en pantallas bajas, la galería de
 *   siempre (encabezado + marquee doble).
 */
export function Galeria() {
  const visor = listaVisor();
  const half = Math.ceil(galeria.fotos.length / 2);
  const track1 = galeria.fotos.slice(0, half);
  const track2 = galeria.fotos.slice(half);
  return (
    <section id="galeria" className="pb-[76px]">
      <GaleriaEscena fotos={galeria.fotos} visor={visor} />

      <div className={s.quieta}>
        <Container>
          <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <SectionHead
              kicker={galeria.head.kicker}
              title={galeria.head.title}
              className="!mb-0"
            />
            <div className="flex flex-wrap items-center gap-3">
              <GaleriaLightbox fotos={visor} />
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
          <Reveal y={0} x={48}>
            <Track fotos={track1} />
          </Reveal>
          <Reveal y={0} x={-48}>
            <Track fotos={track2} reverse />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
