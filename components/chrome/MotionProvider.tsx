"use client";

import { LazyMotion, domAnimation } from "motion/react";

/**
 * Provee a los componentes `m.*` solo las features que usa el proyecto:
 * animaciones + gestos (incluye `whileInView`), SIN `drag` ni `layout`. El
 * componente `motion.*` clásico bundlea el set completo; con `m` + LazyMotion
 * se ejecuta menos JS en la hidratación (menos Total Blocking Time).
 *
 * `strict` obliga a usar `m.*` en todo el árbol: si alguien reintroduce
 * `motion.*` (que volvería a cargar el bundle completo) tira error en dev.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
