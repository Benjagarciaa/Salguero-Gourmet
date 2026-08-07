"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Smooth scroll global con Lenis.
 * - Se desactiva con prefers-reduced-motion (scroll nativo).
 * - `anchors: true` hace que los links #ancla scrolleen suave (el offset del
 *   nav sticky se ajusta en FASE 4, cuando exista el nav).
 * - Solo envuelve children; no agrega DOM.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    // easeInOutCubic: arranca y frena suave (evita el "pop" al inicio del salto).
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // El scroll a las anclas (clicks en nav/CTAs) es más largo y con easeInOut
      // para que no salte de golpe.
      anchors: { offset: -76, duration: 1.9, easing: easeInOutCubic },
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
