"use client";

import { motion, useScroll, useSpring, useReducedMotion } from "motion/react";

/**
 * Barra fina de progreso de scroll, fija por encima de todo (feedback sutil que
 * mantiene la página "viva" mientras se recorre). scaleX ligado al progreso del
 * scroll y suavizado con un spring. aria-hidden: es puramente informativa.
 * Con reduced-motion se usa el valor crudo (sin overshoot del spring).
 */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX: reduce ? scrollYProgress : smooth }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-amarillo"
    />
  );
}
