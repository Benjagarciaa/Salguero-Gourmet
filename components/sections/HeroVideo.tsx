"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * Video del hero superpuesto al poster.
 * - Con reduced-motion: no renderiza nada (queda el poster).
 * - Carga en todas las pantallas siempre que la conexión sea decente (no Save-Data,
 *   no 2G). El clip es un montaje liviano (~570KB) con +faststart, así que también
 *   corre en mobile sin castigar la performance; en Save-Data / 2G queda el poster.
 * - Difiere la carga (src recién en idle) para no competir con el LCP (poster).
 * - Aparece con un fade cuando puede reproducir; loop, muted, playsInline, autoPlay.
 */
export function HeroVideo({ src }: { src: string }) {
  const reduceMotion = useReducedMotion();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [deferredSrc, setDeferredSrc] = useState<string | undefined>(undefined);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  // Decide si vale la pena cargar el video: alcanza con una conexión decente.
  useEffect(() => {
    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    const saveData = !!conn?.saveData;
    const slow = /(^|-)2g$/.test(conn?.effectiveType ?? "");
    setAllowed(!saveData && !slow);
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

  // Con reduced-motion / Save-Data / 2G: queda el poster (Image priority).
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
