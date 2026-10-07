"use client";

import { useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";

/**
 * Reveal FAIL-OPEN (regla innegociable del proyecto, ver CLAUDE.md):
 * - En SSR y sin JS, el contenido se renderiza VISIBLE (nunca oculto por CSS).
 * - Al montar se mide la posición: si el elemento YA está en viewport (o por
 *   encima) queda visible y estático (evita el flash visible->invisible->fade en
 *   contenido above-the-fold). Solo el contenido por debajo del fold se anima con
 *   `motion` (opacity + translateY, una sola vez con `whileInView`).
 * - Con prefers-reduced-motion, todo queda visible y estático.
 * Solo anima `transform` y `opacity`.
 * Las props `x`/`y`/`duration` permiten entradas direccionales y más livianas
 * (los defaults reproducen exacto el comportamiento clásico: y 30, 0.8s).
 *
 * El `delay` de cascada se anula en una sola columna (mobile): ahí cada placa
 * entra al viewport aislada, así que un delay fijo por índice se percibe como
 * lag y no como cascada. La cascada solo se lee cuando los ítems entran juntos
 * (la grilla multi-columna de desktop), donde el delay se conserva.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 30,
  x = 0,
  duration = 0.8,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
  duration?: number;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // "hold": render plano visible (SSR, primer render, reduced-motion o ya en
  // viewport). "animate": estaba por debajo del fold al montar -> animar al entrar.
  const [mode, setMode] = useState<"hold" | "animate">("hold");
  // Delay efectivo de la cascada. Se resuelve en el efecto (client) para no
  // tocar el render de SSR y se anula en una sola columna (mobile).
  const delayRef = useRef(delay);

  useEffect(() => {
    if (reduceMotion) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(max-width: 759px)").matches) delayRef.current = 0;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    // Solo animar si el elemento arranca por debajo del fold.
    if (el.getBoundingClientRect().top >= vh) setMode("animate");
  }, [reduceMotion]);

  if (mode === "hold") {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "0px 0px -6% 0px" }}
      transition={{ duration, ease: [0.16, 1, 0.3, 1], delay: delayRef.current }}
    >
      {children}
    </m.div>
  );
}
