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
 * Link que preselecciona un servicio y lleva al cotizador (#cotizar).
 * El scroll suave hasta el ancla lo maneja Lenis.
 */
export function CotizarLink({
  servicio,
  children,
  className,
}: {
  servicio: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setServicio } = useQuote();
  return (
    <a
      href="#cotizar"
      onClick={() => setServicio(servicio)}
      className={cn(
        "text-[15px] font-medium text-amarillo hover:underline",
        className,
      )}
    >
      {children}
    </a>
  );
}
