"use client";

import { useEffect, useRef, useState } from "react";
import { m, useInView, useMotionValue, useReducedMotion } from "@/lib/motion";
import { OPACIDAD, RESORTE } from "@/lib/fisica";

/**
 * Reveal FAIL-OPEN (regla innegociable del proyecto, ver CLAUDE.md):
 * - En SSR y sin JS, el contenido se renderiza VISIBLE (nunca oculto por CSS).
 * - Al montar se mide la posición: si el elemento YA está en viewport (o por
 *   encima) queda visible y estático (evita el flash visible->invisible->fade en
 *   contenido above-the-fold). Solo el contenido por debajo del fold se anima con
 *   `motion` (opacity + transform, una sola vez con `whileInView`).
 * - Con prefers-reduced-motion, todo queda visible y estático.
 * Solo anima `transform` y `opacity`.
 *
 * Física (lib/fisica.ts): el desplazamiento entra con el resorte `entrada`
 * (sin rebote, sin golpe inicial: 0.16 % del recorrido en el primer cuadro a
 * 180 Hz) y la opacidad con un fundido corto aparte (OPACIDAD). Se anima el
 * `transform` entero como string y no x/y sueltos: así motion lo acelera con
 * WAAPI (corre en el compositor, no se traba con el hero ni con la
 * hidratación). Al terminar, el transform pasa a `none` (sin capa ni contexto
 * de apilamiento de más): el valor animado se cambia por un MotionValue fijo en
 * `none` (estado `listo`). Antes se limpiaba el estilo a mano y motion lo
 * volvía a escribir (`translate(0px, 0px)`) en cada render del padre (tipear en
 * el cotizador): cada fila quedaba con su contexto de apilamiento y los paneles
 * abiertos (servicio, calendario) quedaban debajo de la fila siguiente. El
 * valor de la entrada sigue siendo el de motion (con dueño): así la entrada
 * sigue acelerada por WAAPI.
 *
 * Teclado: `data-reveal` + globals.css muestran entero un Reveal que recibe
 * foco antes de su entrada (Tab a un botón que quedó en el borde de abajo).
 *
 * Las props `x`/`y` permiten entradas direccionales (por defecto sube 24px).
 * El tiempo lo da el resorte.
 *
 * El `delay` de cascada se anula en una sola columna (mobile): ahí cada placa
 * entra al viewport aislada, así que un delay fijo por índice se percibe como
 * lag y no como cascada. La cascada solo se lee cuando los ítems entran juntos
 * (la grilla multi-columna de desktop), donde el delay se conserva.
 *
 * Rendimiento: es SIEMPRE el mismo elemento (`m.div`), en reposo y animando.
 * Antes, el reposo era un <div> y al decidir animar pasaba a <m.div>: para
 * React es otro tipo de elemento, así que desmontaba y volvía a crear TODO el
 * contenido (el formulario del cotizador entero, los encabezados con sus
 * escenas) apenas hidrataba: ~60 ms de bloqueo en un celular de gama media.
 * Ahora la entrada va por estados (`animate` con variantes): `oculto` se pone
 * al instante (el elemento está debajo del fold) y `visible` corre con los
 * mismos resortes y el mismo margen de pantalla que el whileInView de antes.
 * En reposo no lleva estilos: el HTML del servidor es el mismo.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  x = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // null = "hold": render plano visible (SSR, primer render, reduced-motion o
  // ya en viewport). Con valor = estaba por debajo del fold al montar -> animar
  // al entrar, con el delay efectivo de la cascada (se resuelve en el efecto,
  // del lado del cliente, y se anula en una sola columna: mobile).
  const [animar, setAnimar] = useState<{ delay: number } | null>(null);
  // Terminó la entrada: el transform queda en `none` para siempre.
  const [listo, setListo] = useState(false);
  const sinTransform = useMotionValue("none");
  // El mismo margen que tenía el whileInView: una sola vez.
  const enVista = useInView(ref, { once: true, margin: "0px 0px -6% 0px" });

  useEffect(() => {
    if (reduceMotion) return;
    const el = ref.current;
    if (!el) return;
    const unaColumna = window.matchMedia("(max-width: 759px)").matches;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    // Solo animar si el elemento arranca por debajo del fold.
    if (el.getBoundingClientRect().top >= vh)
      setAnimar({ delay: unaColumna ? 0 : delay });
  }, [reduceMotion, delay]);

  return (
    <m.div
      ref={ref}
      data-reveal={animar ? "" : undefined}
      className={className}
      // En reposo (SSR, primer render, reduced-motion o ya en viewport) no
      // anima nada ni pone estilos.
      initial={false}
      animate={animar ? (enVista ? "visible" : "oculto") : undefined}
      variants={{
        // Debajo del fold: escondido al instante (fuera de la pantalla).
        oculto: {
          opacity: 0,
          transform: `translate(${x}px, ${y}px)`,
          transition: { duration: 0 },
        },
        // El delay va dentro de cada valor: la transición por valor no
        // hereda el de afuera.
        visible: {
          opacity: 1,
          transform: "translate(0px, 0px)",
          transition: {
            transform: { ...RESORTE.entrada, delay: animar?.delay ?? 0 },
            opacity: { ...OPACIDAD, delay: animar?.delay ?? 0 },
          },
        },
      }}
      // Con `listo`, el MotionValue fijo reemplaza al animado (motion lo
      // respeta en todos los renders siguientes).
      style={listo ? { transform: sinTransform } : undefined}
      // Identidad 2D: `none`, sin contexto de apilamiento.
      onAnimationComplete={(definicion) => {
        if (definicion === "visible") setListo(true);
      }}
    >
      {children}
    </m.div>
  );
}
