"use client";

import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/ui/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

type Paso = { n: string; title: string; desc: string };

/**
 * Grilla de los 4 pasos del proceso, animada para que la sección no pase
 * desapercibida al scrollear:
 * - Cada paso entra con un reveal fail-open escalonado (fade + subida).
 * - Un barrido ámbar dibuja el borde superior al aparecer y se desvanece (no deja
 *   ámbar permanente: respeta la dosis de color).
 * - El número hace un pequeño lift al hover.
 * Con reduced-motion el barrido no se monta y el reveal queda estático.
 */
export function ProcesoGrid({ pasos }: { pasos: Paso[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid grid-cols-1 gap-[18px] min-[520px]:grid-cols-2 min-[860px]:grid-cols-4">
      {pasos.map((p, i) => (
        <Reveal key={p.n} delay={i * 0.12}>
          <div className="group relative border-t border-hairline pt-[18px]">
            {reduce ? null : (
              <motion.span
                aria-hidden
                className="absolute inset-x-0 top-[-1.5px] h-[2px] origin-left bg-amarillo"
                initial={{ scaleX: 0, opacity: 1 }}
                whileInView={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }}
                viewport={{ once: true, margin: "0px 0px -8% 0px" }}
                transition={{
                  duration: 1.1,
                  ease: "easeInOut",
                  times: [0, 0.55, 1],
                  delay: i * 0.12 + 0.1,
                }}
              />
            )}
            <b className="mb-2 block font-display text-[2.1rem] font-medium italic text-amarillo transition-transform duration-300 ease-out group-hover:-translate-y-1">
              {p.n}
            </b>
            <h3 className="mb-1.5 text-[16px] font-bold text-crema">{p.title}</h3>
            <p className="text-[14.5px] text-crema-dim">{p.desc}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
