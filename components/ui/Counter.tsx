"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

/**
 * Contador de la tira de confianza.
 * - SSR e inicial = valor FINAL (el HTML servido muestra el número real).
 * - Al entrar en vista, anima 0 -> final una sola vez (realce client-side).
 * - Con reduced-motion, se queda en el valor final.
 */
export function Counter({ to }: { to: number }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [value, setValue] = useState(to);
  const started = useRef(false);

  useEffect(() => {
    if (reduceMotion || !inView || started.current) return;
    started.current = true;

    const duration = 1100;
    let raf = 0;
    let start: number | null = null;
    setValue(0);
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduceMotion, to]);

  return <span ref={ref}>{value}</span>;
}
