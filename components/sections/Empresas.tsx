import { Container } from "@/components/ui/Section";
import { Kicker } from "@/components/ui/Kicker";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Pill } from "@/components/ui/Pill";
import { Reveal } from "@/components/ui/Reveal";
import { TitleEm } from "@/components/ui/TitleEm";
import { empresas } from "@/content/data";

export function Empresas() {
  return (
    <div className="relative overflow-hidden border-y border-hairline bg-surface">
      {/* Realce del borde superior: un hilo ámbar tenue despega la banda del fondo. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(233,188,79,0.35)] to-transparent"
      />
      {/* Glow ámbar detrás, del lado del CTA: da profundidad sin sumar color
          nuevo. La capa cubre TODA la banda y el degradé se apaga dentro de ella
          (elipse anclada al borde derecho), así no hay borde duro de la caja en
          ningún alto (antes, un elemento angosto dejaba un seam en mobile). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(65% 75% at 100% 50%, rgba(233,188,79,0.14), rgba(233,188,79,0) 66%)",
        }}
      />
      <Container>
        <div className="relative z-[1] flex flex-col items-start gap-7 py-[52px] min-[760px]:flex-row min-[760px]:items-center min-[760px]:justify-between">
          {/* Entrada convergente: el texto entra desde la izquierda, el CTA desde
              la derecha, y los tags asoman escalonados para darle presencia. */}
          <div>
            <Reveal x={-20} y={0} duration={0.7}>
              <Kicker>{empresas.kicker}</Kicker>
              <h2 className="mt-3 font-display text-[1.7rem] font-medium leading-tight text-crema">
                {empresas.title.pre}
                <TitleEm className="text-[2.15rem] font-semibold">
                  {empresas.title.em}
                </TitleEm>
                {empresas.title.post}
              </h2>
            </Reveal>
            <div className="mt-[14px] flex flex-wrap gap-x-5 gap-y-2">
              {empresas.items.map((it, i) => (
                <Reveal key={it} y={10} duration={0.5} delay={0.2 + i * 0.09}>
                  <Etiqueta>{it}</Etiqueta>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal x={20} y={0} delay={0.15} duration={0.7} className="shrink-0">
            <Pill href={empresas.cta.href}>{empresas.cta.label}</Pill>
          </Reveal>
        </div>
      </Container>
    </div>
  );
}
