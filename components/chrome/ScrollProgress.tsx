"use client";

import { m, useScroll, useSpring, useReducedMotion } from "motion/react";
import { useAfterIdle } from "@/lib/useAfterIdle";

/**
 * Barra fina de progreso de scroll, fija por encima de todo (feedback sutil que
 * mantiene la página "viva" mientras se recorre). Es puramente decorativa, así
 * que se monta recién cuando el navegador queda ocioso: su spring corre un RAF
 * continuo y no debe competir con la hidratación (Total Blocking Time).
 */
export function ScrollProgress() {
  const ready = useAfterIdle();
  if (!ready) return null;
  return <ScrollProgressBar />;
}

function ScrollProgressBar() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });
  return (
    <m.div
      aria-hidden
      style={{ scaleX: reduce ? scrollYProgress : smooth }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-amarillo"
    />
  );
}
