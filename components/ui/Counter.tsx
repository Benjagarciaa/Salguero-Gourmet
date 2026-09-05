"use client";

import { useEffect, useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";

/**
 * Contador de la tira de confianza.
 * - SSR e inicial = valor FINAL (el HTML servido muestra el número real).
 * - Al entrar en vista, anima 0 -> final una sola vez, mutando textContent por
 *   frame (sin re-render de React cada frame).
 * - Reserva el ancho del valor final (`ch` sobre JetBrains Mono = ancho exacto
 *   de dígito) para que el conteo por valores de 1 dígito no empuje al texto
 *   vecino. Arranca ni bien el elemento entra en vista: la tira del hero se
 *   pinta estática (ver Entrada), así que un delay solo alargaría la ventana en
 *   la que se ve el valor final del SSR antes de reiniciar el conteo.
 * - Con reduced-motion, se queda en el valor final.
 */
export function Counter({ to }: { to: number }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const started = useRef(false);

  useEffect(() => {
    if (reduceMotion || !inView || started.current) return;
    const el = ref.current;
    if (!el) return;
    started.current = true;

    const duration = 1100;
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduceMotion, to]);

  return (
    <span
      ref={ref}
      className="inline-block text-left"
      style={{ minWidth: `${String(to).length}ch` }}
    >
      {to}
    </span>
  );
}
