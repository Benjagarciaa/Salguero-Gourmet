import { Section } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { Pill } from "@/components/ui/Pill";
import { Reveal } from "@/components/ui/Reveal";
import { ProcesoGrid } from "./ProcesoGrid";
import { proceso } from "@/content/data";

/**
 * 7 · Cómo trabajamos. El encabezado se renderiza acá (servidor) y viaja como
 * slot al escenario cliente (ProcesoGrid), que lo ubica junto al mapa del
 * recorrido y los 4 pasos. El botón del cierre (L6, "Contanos tu evento")
 * viaja igual, como slot: va debajo de los pasos, en su misma columna, y
 * entra con Reveal (resorte `entrada`, una sola vez, fail-open). Queda fuera
 * de la lista: los disparadores de la coreografía miden la lista y no cambian.
 * La sección no se fija (la coreografía va por tiempo): el alto es el natural.
 * Debajo va el FAQ (Empresas pasó a ir después de Servicios, 30/9/2026): el
 * aire de abajo es el mismo que dejaba Empresas antes del FAQ (40px en mobile,
 * 48px desde 760px, más los 76px de arriba del FAQ).
 */
export function Proceso() {
  return (
    <Section flush pbClassName="pb-10 min-[760px]:pb-12">
      <ProcesoGrid
        pasos={proceso.pasos}
        head={
          <SectionHead
            kicker={proceso.head.kicker}
            title={proceso.head.title}
            className="mb-0! min-[860px]:mb-8!"
          />
        }
        cierre={
          <Reveal y={16} className="mt-8 min-[860px]:mt-9">
            <Pill href={proceso.cta.href}>{proceso.cta.label}</Pill>
          </Reveal>
        }
      />
    </Section>
  );
}
