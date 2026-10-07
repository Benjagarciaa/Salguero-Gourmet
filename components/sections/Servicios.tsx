import type { CSSProperties } from "react";
import Image from "next/image";
import { Section } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { CotizarCard, CotizarCue } from "@/components/chrome/QuoteContext";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { servicios } from "@/content/data";

export function Servicios() {
  return (
    <Section
      id="servicios"
      className="!pt-[40px] min-[860px]:!pt-[76px]"
    >
      <SectionHead kicker={servicios.head.kicker} title={servicios.head.title} />
      <div className="grid grid-cols-1 gap-[18px] min-[760px]:grid-cols-2">
        {servicios.items.map((s, i) => (
          <Reveal
            key={s.id}
            delay={i * 0.09}
            y={24}
            duration={0.7}
            className={cn("h-full", s.wide && "min-[760px]:col-span-2")}
          >
            <CotizarCard
              servicio={s.servicioValue}
              ariaLabel={`Cotizar ${s.title}`}
              className={cn(
                s.wide && "min-[760px]:grid min-[760px]:grid-cols-[1.15fr_1fr]",
              )}
            >
              <div
                className={cn(
                  "relative h-[200px] overflow-hidden max-[759px]:h-[172px]",
                  s.wide &&
                    "min-[760px]:h-auto min-[760px]:min-h-[200px] min-[760px]:max-h-[270px]",
                )}
              >
                <Image
                  src={s.image}
                  alt={s.alt}
                  fill
                  quality={88}
                  sizes="(max-width: 760px) 100vw, (max-width: 1160px) 50vw, 580px"
                  style={
                    {
                      "--obj-m": s.objectPositionMobile ?? s.objectPosition,
                      "--obj-d": s.objectPosition,
                    } as CSSProperties
                  }
                  className="serv-obj object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                />
              </div>
              <div className="flex flex-1 flex-col gap-[10px] px-5 pb-5 pt-[18px] min-[760px]:px-6 min-[760px]:pb-6 min-[760px]:pt-[22px]">
                <h3 className="font-display text-[1.45rem] font-medium text-crema">
                  {s.title}
                </h3>
                <p className="flex-1 text-[15px] text-crema-dim">{s.desc}</p>
                <Etiqueta>{s.etiqueta}</Etiqueta>
                <CotizarCue>{s.ctaLabel}</CotizarCue>
              </div>
            </CotizarCard>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
