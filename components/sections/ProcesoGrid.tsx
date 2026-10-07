import { Reveal } from "@/components/ui/Reveal";
import type { Paso } from "@/content/data";

/**
 * Grilla de los 4 pasos del proceso. La línea superior de cada paso hace un
 * "relevo": una barra ámbar dibuja el borde y se apaga, escalonada por paso
 * (1.1s), en loop infinito -> se encienden 1->2->3->4 y vuelve a empezar. La
 * animación vive en `.proceso-line` (globals.css): es pura decoración CSS
 * (fail-open, solo transform/opacity) y con reduced-motion el reset global la
 * congela dejando las líneas base. El número hace un pequeño lift al hover y
 * cada paso entra con un Reveal fail-open escalonado.
 */
export function ProcesoGrid({ pasos }: { pasos: Paso[] }) {
  return (
    <div className="grid grid-cols-1 gap-[18px] min-[520px]:grid-cols-2 min-[860px]:grid-cols-4">
      {pasos.map((p, i) => {
        // El relevo de la línea y el pop del número comparten ciclo (4.4s) y
        // delay (1.1s por paso), así el número se enciende junto a su línea.
        const delay = `${i * 1.1}s`;
        return (
          <Reveal key={p.n} delay={i * 0.12}>
            <div className="group relative border-t border-hairline pt-[18px]">
              <span
                aria-hidden
                className="proceso-line"
                style={{ animationDelay: delay }}
              />
              <b
                className="proceso-num mb-2 block w-fit font-display text-[2.1rem] font-medium italic text-amarillo transition-transform duration-300 ease-out group-hover:-translate-y-1"
                style={{ animationDelay: delay }}
              >
                {p.n}
              </b>
              <h3 className="mb-1.5 text-[16px] font-bold text-crema">
                {p.title}
              </h3>
              <p className="text-[14.5px] text-crema-dim">{p.desc}</p>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
