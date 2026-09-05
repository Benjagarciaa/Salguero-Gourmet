import type { CSSProperties } from "react";
import Image from "next/image";
import { Section } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { Placa } from "@/components/ui/Placa";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { CotizarLink } from "@/components/chrome/QuoteContext";
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
            <Placa
              interactive
              className={cn(
                "group flex h-full flex-col overflow-hidden",
                s.wide && "min-[760px]:grid min-[760px]:grid-cols-[1.15fr_1fr]",
              )}
            >
              <div
                className={cn(
                  "relative h-[200px] overflow-hidden",
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
              <div className="flex flex-1 flex-col gap-[10px] px-6 pb-6 pt-[22px]">
                <h3 className="font-display text-[1.45rem] font-medium text-crema">
                  {s.title}
                </h3>
                <p className="flex-1 text-[15px] text-crema-dim">{s.desc}</p>
                <Etiqueta>{s.etiqueta}</Etiqueta>
                <CotizarLink servicio={s.servicioValue}>
                  {s.ctaLabel}
                </CotizarLink>
              </div>
            </Placa>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
