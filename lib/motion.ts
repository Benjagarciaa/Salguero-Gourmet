/**
 * motion del sitio: TODO lo de motion se importa desde acá, nunca de
 * "motion/react".
 *
 * Por qué: `motion/react` (node_modules/motion/dist/es/react.mjs) hace
 * `const motion = fm.motion` en el nivel superior del módulo. Esa lectura
 * conserva el componente `motion.*` completo y, con él, drag, layout y la
 * proyección (unos 37 KB sin comprimir, 10 KB gzip), aunque el sitio use solo
 * `m.*` con LazyMotion (MotionProvider). Reexportando con nombre desde
 * "framer-motion" (el mismo paquete, 13.0.0, que motion ya instalaba debajo)
 * el bundler descarta todo lo que no se nombra acá. En el build de producción,
 * la cadena `isProjectionDirty` tiene que dar 0 en .next/static/chunks.
 *
 * Un solo punto de entrada también garantiza un solo contexto de LazyMotion y
 * de MotionConfig: si un componente importara de "motion/react" y otro de acá,
 * seguirían siendo el mismo paquete, pero se volvería a colar el bundle
 * completo.
 *
 * Si hace falta algo más de motion, sumarlo a esta lista (con nombre, nunca
 * `export *`). No sumar `motion` (el componente clásico): `m` + LazyMotion.
 */
export {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  animateValue,
  createGeneratorEasing,
  spring,
} from "framer-motion";
export type { UseInViewOptions } from "framer-motion";
