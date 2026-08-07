"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * Video del hero superpuesto al poster.
 * - Con reduced-motion: no renderiza nada (queda el poster).
 * - Difiere la carga (src recién tras montar) para no competir con el LCP (poster).
 * - Aparece con un fade cuando puede reproducir; loop, muted, playsInline, autoPlay.
 */
export function HeroVideo({
  src,
  poster,
}: {
  src: string;
  poster: string;
}) {
  const reduceMotion = useReducedMotion();
  const [deferredSrc, setDeferredSrc] = useState<string | undefined>(undefined);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Espera al idle del navegador (o un pequeño delay) antes de cargar el video.
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
  }, [src]);

  if (reduceMotion) return null;

  return (
    <video
      ref={ref}
      src={deferredSrc}
      poster={poster}
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
