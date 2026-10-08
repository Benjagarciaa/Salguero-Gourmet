"use client";

import { m, useScroll, useTransform, useReducedMotion } from "motion/react";

/**
 * Parallax sutil ligado al scroll de la página (útil para elementos arriba del
 * todo, como la imagen del hero): en reposo y=0, y se desplaza a medida que se
 * scrollea, dando profundidad. Fail-open: si el JS no monta, es un div normal.
 * Con reduced-motion no se mueve. Solo anima transform.
 */
export function Parallax({
  children,
  className,
  to = -70,
  over = 700,
}: {
  children: React.ReactNode;
  className?: string;
  /** Desplazamiento en px al llegar a `over` px de scroll. */
  to?: number;
  /** Rango de scroll (px) sobre el que se aplica el desplazamiento. */
  over?: number;
}) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, over], [0, to]);
  return (
    <m.div className={className} style={{ y: reduce ? 0 : y }}>
      {children}
    </m.div>
  );
}
