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
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // "hold": render plano visible (SSR, primer render, reduced-motion o ya en
  // viewport). "animate": estaba por debajo del fold al montar -> animar al entrar.
  const [mode, setMode] = useState<"hold" | "animate">("hold");

  useEffect(() => {
    if (reduceMotion) return;
    const el = ref.current;
    if (!el) return;
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
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </m.div>
  );
}
