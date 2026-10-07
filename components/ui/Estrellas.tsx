"use client";

import { useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";

/**
 * Estrellas del bloque de reseñas: se "encienden" una por una al entrar en
 * vista, con un pop sutil (escala 0.5 -> 1.15 -> 1).
 * Mismo gate FAIL-OPEN de Reveal (ver CLAUDE.md): en SSR, sin JS, con
 * reduced-motion o si ya están en viewport al montar, renderizan planas y
 * visibles, idénticas al texto estático. Solo anima `transform` y `opacity`.
 */
export function Estrellas({ count }: { count: number }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
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
    return <span ref={ref}>{"★".repeat(count)}</span>;
  }

  return (
    <span ref={ref}>
      {Array.from({ length: count }, (_, i) => (
        <m.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: [0, 1, 1], scale: [0.5, 1.15, 1] }}
          viewport={{ once: true, margin: "0px 0px -6% 0px" }}
          transition={{
            duration: 0.45,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.7, 1],
            delay: 0.2 + i * 0.07,
          }}
        >
          ★
        </m.span>
      ))}
    </span>
  );
}
