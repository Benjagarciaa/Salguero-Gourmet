"use client";

import dynamic from "next/dynamic";
import { useNearViewport } from "@/lib/useNearViewport";

/**
 * Carga el Cotizador (la sección client más pesada: form + select/date/stepper
 * custom + validación + contexto) recién cuando se acerca al viewport. Así su
 * chunk no se descarga ni hidrata en el arranque (baja el Total Blocking Time).
 *
 * El placeholder mantiene el ancla `#cotizar` desde el SSR (para que los links
 * "Pedir presupuesto" / "Cotizar X" tengan destino) y reserva alto. El swap a la
 * sección real ocurre 800px antes de entrar en pantalla, fuera de vista, así que
 * no genera layout shift (CLS).
 */
const Cotizador = dynamic(
  () => import("./Cotizador").then((m) => m.Cotizador),
  { ssr: false },
);

export function CotizadorLazy() {
  const { ref, near } = useNearViewport<HTMLDivElement>("800px 0px");
  if (near) return <Cotizador />;
  return (
    <div
      ref={ref}
      id="cotizar"
      aria-hidden
      className="min-h-[820px] min-[860px]:min-h-[560px]"
    />
  );
}
