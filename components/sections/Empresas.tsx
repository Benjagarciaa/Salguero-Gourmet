import { Container } from "@/components/ui/Section";
import { Kicker } from "@/components/ui/Kicker";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Pill } from "@/components/ui/Pill";
import { Reveal } from "@/components/ui/Reveal";
import { TitleEm } from "@/components/ui/TitleEm";
import { empresas } from "@/content/data";

export function Empresas() {
  return (
    <div className="border-y border-hairline bg-surface">
      <Container>
        <div className="flex flex-col items-start gap-7 py-[52px] min-[760px]:flex-row min-[760px]:items-center min-[760px]:justify-between">
          {/* Entrada convergente: texto desde la izquierda, CTA desde la derecha. */}
          <Reveal x={-20} y={0} duration={0.7}>
            <Kicker>{empresas.kicker}</Kicker>
            <h2 className="mt-3 font-display text-[1.7rem] font-medium leading-tight text-crema">
              {empresas.title.pre}
              <TitleEm className="text-[2.15rem] font-semibold">
                {empresas.title.em}
              </TitleEm>
              {empresas.title.post}
            </h2>
            <div className="mt-[14px] flex flex-wrap gap-x-5 gap-y-2">
              {empresas.items.map((it) => (
                <Etiqueta key={it}>{it}</Etiqueta>
              ))}
            </div>
          </Reveal>
          <Reveal x={20} y={0} delay={0.15} duration={0.7} className="shrink-0">
            <Pill href={empresas.cta.href}>{empresas.cta.label}</Pill>
          </Reveal>
        </div>
      </Container>
    </div>
  );
}
