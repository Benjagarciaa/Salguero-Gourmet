"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { cn } from "@/lib/cn";

/**
 * Estado compartido de preselección del cotizador.
 * Los links "Cotizar X" setean el servicio; el formulario (FASE 4) lo consume
 * para preseleccionar el <select> y para armar el mensaje de WhatsApp.
 */
type QuoteState = {
  servicio: string | null;
  /** nonce para re-disparar el flash aunque se elija el mismo servicio */
  nonce: number;
  setServicio: (s: string) => void;
};

const QuoteCtx = createContext<QuoteState | null>(null);

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const [servicio, setServicioState] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const setServicio = useCallback((s: string) => {
    setServicioState(s);
    setNonce((n) => n + 1);
  }, []);
  return (
    <QuoteCtx.Provider value={{ servicio, nonce, setServicio }}>
      {children}
    </QuoteCtx.Provider>
  );
}

export function useQuote(): QuoteState {
  const ctx = useContext(QuoteCtx);
  if (!ctx) throw new Error("useQuote debe usarse dentro de <QuoteProvider>");
  return ctx;
}

/**
 * Tarjeta-link: toda la placa de un servicio es clickeable y hace lo mismo que el
 * link "Cotizar X" (preselecciona el servicio y baja al #cotizar). Es `group` para
 * que el subrayado ámbar del <CotizarCue> se dibuje al hover/foco/tap de la tarjeta,
 * y al hover la placa "prende" con un glow ámbar. Lenis maneja el scroll suave.
 */
export function CotizarCard({
  servicio,
  ariaLabel,
  children,
  className,
}: {
  servicio: string;
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setServicio } = useQuote();
  return (
    <a
      href="#cotizar"
      onClick={() => setServicio(servicio)}
      aria-label={ariaLabel}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-lg border border-hairline bg-surface transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-[rgba(233,188,79,0.6)] hover:shadow-[0_20px_44px_rgba(0,0,0,0.45),0_0_30px_rgba(233,188,79,0.35)]",
        className,
      )}
    >
      {children}
    </a>
  );
}

/**
 * Señal visual "Cotizar X" dentro de una <CotizarCard>: subrayado ámbar animado por
 * el estado del grupo (la tarjeta), no por sí mismo. Al tocar/hoverear cualquier
 * parte de la placa, la línea se dibuja como si se hubiera tocado el botón. No es un
 * <a> (evita anidar links dentro del link-tarjeta).
 */
export function CotizarCue({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="relative inline-block w-fit text-[15px] font-semibold text-crema after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[1.5px] after:origin-left after:scale-x-0 after:bg-amarillo after:content-[''] after:transition-transform after:duration-200 after:ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100 group-active:after:scale-x-100"
    >
      {children}
    </span>
  );
}
