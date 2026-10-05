"use client";

import { LazyMotion, MotionConfig, domAnimation } from "@/lib/motion";
import { RESORTE } from "@/lib/fisica";

/**
 * Provee a los componentes `m.*` solo las features que usa el proyecto:
 * animaciones + gestos (incluye `whileInView`), SIN `drag` ni `layout`. El
 * componente `motion.*` clásico bundlea el set completo; con `m` + LazyMotion
 * se ejecuta menos JS en la hidratación (menos Total Blocking Time). Para que
 * drag, layout y la proyección de verdad queden afuera, todo se importa de
 * `@/lib/motion` (ver ahí por qué nunca de "motion/react").
 *
 * `strict` obliga a usar `m.*` en todo el árbol: si alguien reintroduce
 * `motion.*` (que volvería a cargar el bundle completo) tira error en dev.
 *
 * MotionConfig, red de seguridad de la física del sitio (lib/fisica.ts):
 * - `reducedMotion="user"`: con reducir movimiento, motion no anima transforms
 *   aunque un componente se olvide de chequearlo.
 * - `transition`: todo `m.*` sin transición propia usa el resorte `entrada`
 *   (sin rebote) en vez del resorte por defecto de motion (500/25, que rebota
 *   12 %).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={RESORTE.entrada}>
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
