"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * Video del hero superpuesto al poster.
 * - Con reduced-motion: no renderiza nada (queda el poster).
 * - Solo carga en pantallas >= 768px y con buena conexión (no Save-Data, no 2G):
 *   en mobile queda el poster (48KB) y no se baja el .mp4 (~1.7MB), lo que mejora
 *   mucho la performance en celulares sin tocar la calidad.
 * - Difiere la carga (src recién en idle) para no competir con el LCP (poster).
 * - Aparece con un fade cuando puede reproducir; loop, muted, playsInline, autoPlay.
 */
export function HeroVideo({ src }: { src: string }) {
  const reduceMotion = useReducedMotion();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [deferredSrc, setDeferredSrc] = useState<string | undefined>(undefined);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  // Decide si vale la pena cargar el video: pantalla grande + conexión decente.
  useEffect(() => {
    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    const saveData = !!conn?.saveData;
    const slow = /(^|-)2g$/.test(conn?.effectiveType ?? "");
    const bigScreen = window.matchMedia("(min-width: 768px)").matches;
    setAllowed(bigScreen && !saveData && !slow);
  }, []);

  // Carga el src recién cuando está permitido y el navegador está idle.
  useEffect(() => {
    if (!allowed) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
    };
    let idleId = 0;
    let timeoutId = 0;
    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(() => setDeferredSrc(src));
    } else {
      timeoutId = window.setTimeout(() => setDeferredSrc(src), 200);
    }
    return () => {
      if (idleId) window.cancelIdleCallback?.(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [allowed, src]);

  // En mobile / reduced-motion / conexión lenta: queda el poster (Image priority).
  if (reduceMotion || !allowed) return null;

  return (
    <video
      ref={ref}
      src={deferredSrc}
      muted
      loop
      playsInline
      autoPlay
      preload="none"
      aria-hidden="true"
      onCanPlay={() => setVisible(true)}
      className={cn(
        "absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        visible ? "opacity-100" : "opacity-0",
      )}
    />
  );
}
