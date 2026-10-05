/**
 * motion del sitio: TODO lo de motion se importa desde acá, nunca de
 * "motion/react".
 *
 * Por qué: el paquete `motion` (ya desinstalado) reexportaba framer-motion
 * completo desde `motion/react`, y hacía `const motion = fm.motion` en el nivel
 * superior del módulo. Esa lectura conservaba el componente `motion.*` entero
 * y, con él, drag, layout y la proyección (unos 37 KB sin comprimir, 10 KB
 * gzip), aunque el sitio use solo `m.*` con LazyMotion (MotionProvider). Por
 * eso se importa con nombre desde "framer-motion" (13.0.0, dependencia
 * directa): el bundler descarta todo lo que no se nombra acá. En el build de
 * producción, la cadena `isProjectionDirty` tiene que dar 0 en
 * .next/static/chunks.
 *
 * Un solo punto de entrada también garantiza un solo contexto de LazyMotion y
 * de MotionConfig. Si alguien volviera a instalar `motion` e importara de
 * "motion/react", se volvería a colar el bundle completo.
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
