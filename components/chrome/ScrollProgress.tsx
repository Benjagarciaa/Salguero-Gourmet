"use client";

import { useRef } from "react";
import { OPACIDAD_GSAP } from "@/lib/fisica";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useAfterIdle } from "@/lib/useAfterIdle";
import styles from "./ScrollProgress.module.css";

/**
 * Progreso de scroll como detalle de marca: la cuchara del logo, fija al borde
 * derecho, que se llena de amarillo desde la punta del mango hasta el cuenco a
 * medida que se recorre la página (el cuenco termina de llenarse al llegar al
 * cotizador y al pie). Discreta: arranca oculta en el tope, queda tenue en
 * reposo y se enciende solo mientras se scrollea (como las barras de macOS).
 *
 * - Decorativa: aria-hidden, sin foco ni eventos de puntero.
 * - Se monta recién en idle: no compite con la hidratación (TBT).
 * - El progreso se calcula con el alto real del documento, medido con un
 *   ResizeObserver (no depende de que ScrollTrigger se refresque cuando otra
 *   sección cambia de alto). ScrollTrigger solo avisa cuándo hubo scroll.
 * - El nivel se escribe directo en cada update (quickSetter): el scroll ya viene
 *   suavizado (Lenis con la rueda, el momentum nativo con el dedo, las anclas en
 *   1.9 s). Un quickTo encima era un tercer retraso que además arrancaba sin
 *   velocidad en cada update.
 * - El brillo (encendida mientras se scrollea, tenue en reposo) es un tween
 *   corto de opacidad (OPACIDAD_GSAP), solo cuando cambia el objetivo.
 * - Con reduced-motion el nivel sigue al scroll sin suavizado ni fundidos (es un
 *   indicador de estado, no una animación).
 */
export function ScrollProgress() {
  const ready = useAfterIdle();
  if (!ready) return null;
  return <Cuchara />;
}

/** Opacidad en reposo (sin scroll reciente) y mientras se scrollea. */
const REPOSO = 0.45;
const ACTIVA = 1;
/** Segundos sin scroll antes de volver al reposo. */
const ESPERA = 1.2;

/**
 * Zonas a sangre sobre las que la cuchara se oculta (el texto pasa por el
 * borde derecho, justo debajo de ella):
 * - `[data-sin-cuchara]`: la tira de palabras gigantes de Empresas.
 * - las filas del marquee de fotos de la Galería, con sus etiquetas en
 *   movimiento: la escena de compu (`[data-g="mq-fila"]`) y la versión quieta
 *   (`.mq-viewport`, sin JS o con reducir movimiento). Entre 1024 y 1280 de
 *   ancho la cuchara quedaba encima de "Meriendas" o "Cookies".
 *   Pendiente: cuando se vuelva a tocar la Galería, pasarle `data-sin-cuchara`
 *   a esas filas y dejar acá solo el atributo.
 */
const ZONAS_SIN_CUCHARA = [
  "[data-sin-cuchara]",
  '[data-g="mq-fila"]',
  ".mq-viewport",
].join(", ");

function Cuchara() {
  const raiz = useRef<HTMLDivElement>(null);
  const relleno = useRef<SVGRectElement>(null);

  useGSAP(
    () => {
      const el = raiz.current;
      const nivelEl = relleno.current;
      if (!el || !nivelEl) return;

      let max = 1;
      // Lo pone el contexto de abajo: reajusta el nivel sin "encender" la
      // cuchara (p. ej. al abrir una pregunta del FAQ cambia el alto).
      let reajustar = () => {};
      const medir = () => {
        max = Math.max(
          1,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        reajustar();
      };
      medir();
      const ro = new ResizeObserver(medir);
      ro.observe(document.body);
      window.addEventListener("resize", medir);

      // Oculta mientras una zona a sangre cruza la altura de la cuchara (fija
      // al centro, ±32px en desktop): ZONAS_SIN_CUCHARA, hoy las letras
      // gigantes de Empresas y las filas del marquee de fotos de la Galería
      // (sus etiquetas pasan por el borde). Sobre ellas se leería como una
      // rayita de más. Cambio instantáneo (un fundido dejaría media cuchara
      // sobre el borde de la zona). Es un indicador de estado: también con
      // reducir movimiento, por eso va fuera del matchMedia. Con visibility y
      // no opacity: la opacidad la maneja GSAP en línea (brillo).
      // Búsqueda global (las zonas están fuera del scope de este componente).
      // Solo cuentan las zonas que se ven: la versión de la galería que no
      // corresponde al ancho está en display none, y ScrollTrigger le
      // calcularía un tramo cualquiera.
      let zonas: ScrollTrigger[] = [];
      const ocultar = () => {
        const tapa = zonas.some(
          (st) =>
            st.isActive &&
            st.trigger instanceof HTMLElement &&
            st.trigger.getClientRects().length > 0,
        );
        if (tapa) el.setAttribute("data-oculta", "");
        else el.removeAttribute("data-oculta");
      };
      zonas = Array.from(
        document.querySelectorAll<HTMLElement>(ZONAS_SIN_CUCHARA),
        (zona) =>
          ScrollTrigger.create({
            trigger: zona,
            start: "top 50%+=34",
            end: "bottom 50%-=34",
            onToggle: ocultar,
            onRefresh: ocultar,
          }),
      );
      ocultar();

      const mm = gsap.matchMedia();
      mm.add(
        {
          mover: "(prefers-reduced-motion: no-preference)",
          quieto: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const { quieto } = ctx.conditions as { quieto: boolean };
          const progreso = () => gsap.utils.clamp(0, 1, window.scrollY / max);

          gsap.set(nivelEl, {
            scaleY: progreso(),
            transformOrigin: "50% 100%",
          });
          // Directo, con y sin reduced-motion: el scroll ya llega suavizado.
          const nivel = gsap.quickSetter(nivelEl, "scaleY") as (
            v: number,
          ) => void;
          // Solo cuando cambia el objetivo: un tween por cambio, no por cuadro.
          let objetivo = Number.NaN;
          const brillo = (v: number) => {
            if (v === objetivo) return;
            objetivo = v;
            if (quieto) gsap.set(el, { opacity: v });
            else
              gsap.to(el, { opacity: v, ...OPACIDAD_GSAP, overwrite: "auto" });
          };

          let reposo: gsap.core.Tween | null = null;
          // Método del contexto: lo que crea (tweens y delayedCall) queda en el
          // contexto y se revierte con él.
          const actualizar = ctx.add("actualizar", () => {
            const p = progreso();
            nivel(p);
            reposo?.pause();
            // En el tope no se muestra (el nav ya tiene su cuchara).
            if (p < 0.004) {
              brillo(0);
              return;
            }
            if (quieto) {
              brillo(0.8);
              return;
            }
            brillo(ACTIVA);
            // Una sola llamada demorada, reiniciada en cada update (sin crear
            // una nueva por cuadro).
            if (reposo) reposo.restart(true);
            else reposo = gsap.delayedCall(ESPERA, () => brillo(REPOSO));
          }) as () => void;

          reajustar = () => nivel(progreso());

          // Estado inicial (recarga a mitad de página): tenue, sin destello.
          const p0 = progreso();
          objetivo = p0 < 0.004 ? 0 : quieto ? 0.8 : REPOSO;
          gsap.set(el, { opacity: objetivo });

          ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: actualizar,
          });

          return () => {
            reposo?.kill();
            reajustar = () => {};
          };
        },
      );

      return () => {
        ro.disconnect();
        window.removeEventListener("resize", medir);
        zonas.forEach((st) => st.kill());
        el.removeAttribute("data-oculta");
      };
    },
    { scope: raiz },
  );

  return (
    <div ref={raiz} className={styles.cuchara} aria-hidden>
      <svg viewBox="0 0 34 180" className={styles.svg} focusable="false">
        <defs>
          <clipPath id="cuchara-progreso">
            <ellipse cx="17" cy="27" rx="17" ry="27" />
            <rect x="12.25" y="48" width="9.5" height="132" rx="4.75" />
          </clipPath>
        </defs>
        <g clipPath="url(#cuchara-progreso)">
          <rect width="34" height="180" className={styles.vacio} />
          <rect
            ref={relleno}
            width="34"
            height="180"
            className={styles.relleno}
          />
        </g>
      </svg>
    </div>
  );
}
