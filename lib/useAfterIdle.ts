"use client";

import { useEffect, useState } from "react";
import type { IdleWindow } from "@/lib/idle";

/**
 * Devuelve `false` en el primer render (SSR + hidratación) y pasa a `true`
 * cuando el navegador queda ocioso. Sirve para diferir trabajo no crítico
 * (barras decorativas, smooth scroll) fuera de la ventana de hidratación, que
 * es donde se acumula el Total Blocking Time en mobile. El `timeout` garantiza
 * que igual se active aunque el hilo nunca quede del todo libre. En navegadores
 * sin requestIdleCallback se usa un fallback fijo de ~200ms y `timeout` no aplica
 * en ese camino.
 */
export function useAfterIdle(timeout = 1000): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as IdleWindow;
    let idleId = 0;
    let timeoutId = 0;
    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(() => setReady(true), { timeout });
    } else {
      timeoutId = window.setTimeout(() => setReady(true), 200);
    }
    return () => {
      if (idleId) w.cancelIdleCallback?.(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [timeout]);
  return ready;
}
