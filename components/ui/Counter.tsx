"use client";

import { useEffect, useRef } from "react";
import { animateValue, useInView, useReducedMotion } from "@/lib/motion";
import { RESORTE } from "@/lib/fisica";

/**
 * Contador de la tira de confianza.
 * - SSR e inicial = valor FINAL (el HTML servido muestra el número real).
 * - Al entrar en vista, anima 0 -> final una sola vez con el resorte `lento`
 *   de lib/fisica.ts (sin rebote, arranca sin golpe: la ease-out cúbica de
 *   antes arrancaba a 3 veces su velocidad media). Muta textContent por cuadro
 *   (sin re-render de React). animateValue es el motor de motion-dom que ya
 *   está cargado: no suma peso.
 * - Reserva el ancho del valor final (`ch` sobre JetBrains Mono = ancho exacto
 *   de dígito) y usa cifras tabulares, para que el conteo no empuje al texto
 *   vecino. Arranca ni bien el elemento entra en vista: la tira del hero se
 *   pinta estática, así que un delay solo alargaría la ventana en
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

    const a = animateValue({
      keyframes: [0, to],
      ...RESORTE.lento,
      onUpdate: (v: number) => {
        el.textContent = String(Math.round(v));
      },
    });
    return () => {
      a.stop();
      // Si se corta a mitad de camino, queda el valor real.
      el.textContent = String(to);
    };
  }, [inView, reduceMotion, to]);

  return (
    <span
      ref={ref}
      className="inline-block text-left tabular-nums"
      style={{ minWidth: `${String(to).length}ch` }}
    >
      {to}
    </span>
  );
}
