/**
 * Física única de Salguero (beta "dopamina").
 *
 * Reemplaza la curva fija cubic-bezier(0.16, 1, 0.3, 1) de CLAUDE.md §5.5.
 * Esa curva arranca a 6 veces su velocidad media: mueve el 4.3 % del recorrido
 * en el primer cuadro a 180 Hz, llega al 90 % a los 264 ms y deja 540 ms de
 * cola. Se lee como golpe y freno.
 *
 * Un solo criterio: la velocidad nunca salta.
 * 1. TIEMPO (entradas, hovers, paneles, contadores): resortes de motion 13 por
 *    stiffness/damping/mass. NUNCA visualDuration/bounce: con esos, motion
 *    descarta la velocidad heredada al interrumpir (motion-dom spring.mjs,
 *    getSpringOptions). En GSAP, el mismo resorte como ease (resorteGsap). En
 *    CSS, los tokens --ease-resorte y --ease-resorte-lento (globals.css).
 * 2. SCROLL: un solo suavizado. Lenis en rueda y trackpad (SCROLL.lerp), el
 *    momentum nativo con el dedo. Todas las escenas con scrub directo (SCRUB),
 *    sus tramos con TRAMO y cada pin con costura (conCostura, en lib/gsap.ts).
 *    Un resorte NO sirve como ease de scroll: por su cola el contenido corre a
 *    3.3 veces la media y después el scroll queda muerto (el "2x" medido en los
 *    pins).
 * 3. OPACIDAD: tween corto aparte.
 * Con prefers-reduced-motion no corre nada de esto: cada componente lo corta.
 */
import { createGeneratorEasing, spring } from "@/lib/motion";

type Resorte = {
  readonly type: "spring";
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
};

/**
 * Medidos con el solver de motion 13 (con un script local, fuera del repo).
 * ζ = damping / (2·√(stiffness·mass)). "Asienta" = queda a menos del 0.5 % de la meta.
 */
export const RESORTE = {
  /** ζ 0.88 · asienta en 300 ms · sobrepaso 0.3 % · 90 % a los 145 ms. Presión (active/tap), chevrons, íconos. */
  tacto: { type: "spring", stiffness: 520, damping: 40, mass: 1 },
  /** ζ 0.87 · 450 ms · 0.4 % · 90 % a los 169 ms. Hover: lift de pills y placas, giro de la cuchara, zoom chico. */
  hover: { type: "spring", stiffness: 380, damping: 34, mass: 1 },
  /** ζ 0.77 · 500 ms · 2.3 %. Pops que se asientan: estrellas, puntos del mapa, cartas al apoyarse, cuchara del pie. Reemplaza back.out(1.5 a 3), que se pasaba 15 a 25 %. */
  pop: { type: "spring", stiffness: 380, damping: 30, mass: 1 },
  /** ζ 0.99 · 600 ms · 0 % · 90 % a los 253 ms. Paneles: FAQ, lightbox, dropdown, calendario, errores del form. */
  panel: { type: "spring", stiffness: 230, damping: 30, mass: 1 },
  /** ζ 1.0 · 850 ms · 0 % · 90 % a los 372 ms · 0.16 % en el primer cuadro a 180 Hz (hoy 4.3 %). Entradas: Reveal, preguntas del FAQ, letras del pie. */
  entrada: { type: "spring", stiffness: 110, damping: 21, mass: 1 },
  /** ζ 1.0 · 1250 ms · 0 % · 90 % a los 603 ms. Contadores y fundidos largos (capa de bocaditos). */
  lento: { type: "spring", stiffness: 42, damping: 13, mass: 1 },
} as const satisfies Record<string, Resorte>;

export type NombreResorte = keyof typeof RESORTE;

/** motion: la opacidad va aparte del resorte. */
export const OPACIDAD = { duration: 0.4, ease: "easeOut" } as const;
/** motion: salidas (exit de AnimatePresence), más cortas que las entradas. */
export const SALIDA = { duration: 0.18, ease: "easeIn" } as const;
/** GSAP: lo mismo que OPACIDAD. */
export const OPACIDAD_GSAP = { duration: 0.4, ease: "sine.out" } as const;
/** GSAP: lo mismo que SALIDA (fundidos de salida cortos). */
export const SALIDA_GSAP = { duration: 0.18, ease: "sine.in" } as const;

const cache = new Map<NombreResorte, { ease: (p: number) => number; duration: number }>();

/**
 * El mismo resorte como ease de GSAP, que acepta una función: devuelve { ease, duration }.
 * Duraciones en segundos: tacto 0.30, hover 0.45, pop 0.50, panel 0.60, entrada 0.85, lento 1.25.
 * - Por tiempo: gsap.to(el, { y: 0, ...resorteGsap("entrada") }).
 * - Dentro de un timeline con scrub va solo la forma: { ease: resorteGsap("pop").ease, duration: LUZ }.
 * No hereda velocidad al interrumpirse: lo que se interrumpe seguido va con motion.
 */
export function resorteGsap(nombre: NombreResorte) {
  let r = cache.get(nombre);
  if (!r) {
    const { stiffness, damping, mass } = RESORTE[nombre];
    const g = createGeneratorEasing({ stiffness, damping, mass }, 100, spring);
    r = { ease: g.ease, duration: g.duration };
    cache.set(nombre, r);
  }
  return r;
}

/* -------------------------------- Scroll -------------------------------- */

/** Lenis, solo con puntero fino. lerp 0.15 = constante de ~100 ms (antes 0.1, ~167 ms):
 *  al soltar la rueda el scroll frena enseguida, sin el "movimiento de más" que
 *  notaba Benjamin (7/10/2026). Anclas: 1.9 s con easeInOutCubic. */
export const SCROLL = { lerp: 0.15, anclas: 1.9 } as const;

/** Scrub de TODAS las escenas: directo. Un scrub numérico encima de Lenis era doble suavizado. */
export const SCRUB = true as const;

/**
 * Ease de los tramos de un timeline con scrub: velocidad 0 al empezar y al
 * terminar, con pico de 1.57 veces la media. Para comparar: power2.out
 * arrancaba a 2x, expo.out a 6.9x y un resorte tiene pico de 3.3x.
 */
export const TRAMO = "sine.inOut";

/** Costura de los pins: el pin se fija d px antes y el contenido frena en 2d px de scroll (y acelera igual antes de soltarse). 80 px ≈ 200 ms a velocidad típica de rueda. */
export const COSTURA = { d: 80 } as const;

/** Lo que recorre todo un pin (carril, video): acelera en la fracción `a` inicial, va parejo y frena en la final. Velocidad continua, pico 1/(1-a). */
export function rampa(a: number): (p: number) => number {
  const v = 1 / (1 - a);
  return (p) =>
    p <= 0 ? 0 : p >= 1 ? 1
    : p < a ? (v * p * p) / (2 * a)
    : p > 1 - a ? 1 - (v * (1 - p) * (1 - p)) / (2 * a)
    : v * (p - a / 2);
}

/**
 * Deriva al soltar un pin (el contenido sube a una fracción `deriva` de la
 * velocidad de la página): arranca compensando toda la velocidad de la página
 * y la suelta de a poco, sin escalón al soltar.
 * Hero: deriva 0.2 da 1-(1-p)^5, que es power4.out.
 */
export function despegue(deriva: number): (p: number) => number {
  const n = 1 / deriva;
  return (p) => 1 - Math.pow(1 - p, n);
}

/* ---------------------------------- CSS ---------------------------------- */

/* Los linear() de app/globals.css (--ease-resorte y --ease-resorte-lento) salen de
   RESORTE.hover (500 ms) y RESORTE.panel (650 ms), muestreados cada 20 ms. */
