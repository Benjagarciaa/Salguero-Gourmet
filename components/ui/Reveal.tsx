"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * Reveal FAIL-OPEN (regla innegociable del proyecto, ver CLAUDE.md):
 * - En SSR y sin JS, el contenido se renderiza VISIBLE (nunca oculto por CSS).
 * - Recién tras montar (JS garantizado) `motion` anima opacity + translateY una
 *   sola vez con `whileInView`.
 * - Con prefers-reduced-motion, todo queda visible y estático.
 * Solo anima `transform` y `opacity`.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  // Fallback visible: SSR, primer render del cliente, o reduced-motion.
  if (!ready || reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
