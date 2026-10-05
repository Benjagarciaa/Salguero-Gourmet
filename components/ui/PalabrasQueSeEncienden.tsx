"use client";

import { useMemo, useRef } from "react";
import type { EmphasisTitle } from "@/content/data";
import { OPACIDAD_GSAP, SCRUB, TRAMO } from "@/lib/fisica";
import { gsap, ScrollTrigger, useGSAPAlAcercarse } from "@/lib/gsap";
import { TitleEm } from "./TitleEm";

/**
 * Opacidad de una palabra todavía "apagada" (tenue, nunca invisible). 0.4 deja
 * el crema en ~3.4:1 sobre el fondo: pasa AA para texto grande (los h2) aun en
 * el estado tenue, que es el que ve una auditoría al cargar.
 */
const TENUE = 0.4;

/** Separación (s) entre palabras al terminar de encenderse por tiempo. */
const ESCALON = 0.04;

type Parte =
  | { tipo: "espacio"; texto: string }
  | { tipo: "palabra" | "em"; texto: string; indice: number };

/**
 * Parte el titular en unidades: cada palabra de `pre`/`post` es una unidad, la
 * palabra destacada (`em`) es UNA sola unidad (conserva su TitleEm con brillo) y
 * los espacios quedan como texto plano entre spans (el corte de línea no cambia).
 */
function trocear({ pre, em, post }: EmphasisTitle): {
  partes: Parte[];
  total: number;
} {
  const partes: Parte[] = [];
  let total = 0;
  const partir = (s: string) => {
    for (const t of s.split(/(\s+)/)) {
      if (!t) continue;
      if (/^\s+$/.test(t)) partes.push({ tipo: "espacio", texto: t });
      else partes.push({ tipo: "palabra", texto: t, indice: total++ });
    }
  };
  partir(pre);
  partes.push({ tipo: "em", texto: em, indice: total++ });
  partir(post ?? "");
  return { partes, total };
}

/**
 * Cuánto corre hacia abajo al título, en este momento, la entrada de Reveal que
 * lo envuelve (SectionHead): translate(0, 24px) antes de entrar, 0 al terminar.
 * ScrollTrigger mide con getBoundingClientRect (con ese transform): sin
 * descontarlo, el encendido arrancaba 24px tarde (con el título al 82% y no al
 * 85%) y el punto cambiaba según si el refresh caía antes o después de la
 * entrada.
 */
function corrimientoReveal(h: HTMLElement): number {
  const r = h.parentElement?.closest<HTMLElement>("[data-reveal]");
  if (!r) return 0;
  const t = getComputedStyle(r).transform;
  return t && t !== "none" ? new DOMMatrixReadOnly(t).m42 : 0;
}

/** Punto del ScrollTrigger con el borde de arriba del título SIN el corrimiento de Reveal. */
function borde(h: HTMLElement, pantalla: string): string {
  const d = Math.round(corrimientoReveal(h) * 100) / 100;
  return `top${d >= 0 ? "-=" : "+="}${Math.abs(d)} ${pantalla}`;
}

/**
 * Titular que se "enciende" palabra por palabra mientras cruza la pantalla
 * (estilo Apple): desde que su borde superior está al 85% del viewport hasta que
 * llega al 40%, cada palabra pasa de tenue (0.4) a plena, en cascada.
 *
 * - Texto real: el heading sigue siendo texto seleccionable y legible por lectores
 *   de pantalla (solo se envuelve cada palabra en un span, sin roles ni aria).
 * - Un ScrollTrigger con scrub directo (SCRUB): todo lo atado al scroll corre en
 *   el mismo loop que el resto de las escenas, sin medir en cada evento. Cada
 *   palabra ocupa un tramo de 2 unidades que se solapa con la siguiente (la
 *   unidad k va de k a k+2 sobre total+1), con ease TRAMO: arranca y termina
 *   con velocidad 0.
 * - Nunca queda a mitad de camino: si el scroll se detiene con el encendido
 *   empezado y sin terminar (ScrollTrigger "scrollEnd"), el scrub se corta y
 *   las palabras que faltan se encienden por tiempo, en cascada, con el
 *   fundido de opacidad de lib/fisica (OPACIDAD_GSAP). Una sola vez: después
 *   ya no vuelven a tenue.
 * - Fail-open: en SSR, sin JS y con reduced-motion todas las palabras están a
 *   opacidad 1. Si al armarse el título ya pasó el 85% de la pantalla (recarga a
 *   mitad de página, ancla), queda pleno y no se arma: nunca pasa de visible a
 *   tenue (mismo criterio que Reveal).
 * - Solo anima `opacity`. Sin listeners de scroll manuales.
 * - Se arma al acercarse (useGSAPAlAcercarse, lib/gsap.ts), no al hidratar:
 *   el encendido arranca recién con el título al 85% de la pantalla.
 */
export function PalabrasQueSeEncienden({
  title,
  className,
  as: Tag = "h2",
}: {
  title: EmphasisTitle;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { partes, total } = useMemo(() => trocear(title), [title]);

  useGSAPAlAcercarse(
    () => {
      const h = ref.current;
      if (!h) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Ya está arriba del punto de arranque: queda pleno.
        const arriba = h.getBoundingClientRect().top - corrimientoReveal(h);
        if (arriba < window.innerHeight * 0.85) return;
        const palabras = gsap.utils.toArray<HTMLElement>("[data-palabra]", h);
        if (!palabras.length) return;
        gsap.set(palabras, { opacity: TENUE });
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: h,
            // Funciones: se recalculan en cada refresh con el corrimiento
            // de Reveal de ese momento.
            start: () => borde(h, "85%"),
            end: () => borde(h, "40%"),
            scrub: SCRUB,
          },
        });
        palabras.forEach((el, k) => {
          tl.fromTo(
            el,
            { opacity: TENUE },
            { opacity: 1, duration: 2, ease: TRAMO },
            k,
          );
        });

        // El scroll se detuvo con el título a mitad de encenderse: se
        // termina por tiempo (sin tocar el movimiento mientras se scrollea).
        // Sin sacar el listener acá: ScrollTrigger recorre la lista mientras
        // despacha y sacarlo salteaba al título siguiente. Se saca al limpiar.
        let hecho = false;
        const alDetener = () => {
          const p = tl.progress();
          if (hecho || !(p > 0 && p < 1)) return;
          hecho = true;
          // Lo que había al detenerse, ANTES de cortar el scrub.
          const actual = palabras.map((el) =>
            Number(gsap.getProperty(el, "opacity")),
          );
          // kill(false): corta el scrub SIN revertir. kill() sin argumento
          // revierte (disable → revert) y deja el timeline en progreso 0: todas
          // las palabras volvían a tenue y las que ya estaban plenas, al no
          // entrar en `faltan`, quedaban grises para siempre.
          tl.scrollTrigger?.kill(false);
          tl.kill();
          // Por las dudas, cada palabra se queda donde estaba (sin parpadeo).
          gsap.set(palabras, { opacity: (i: number) => actual[i] });
          const faltan = palabras.filter((_, i) => actual[i] < 0.999);
          // Con el título casi al final del tramo pueden estar todas plenas:
          // sin nada que encender no se arma el tween (GSAP avisaba "target
          // not found" con la lista vacía).
          if (!faltan.length) return;
          gsap.to(faltan, {
            opacity: 1,
            ...OPACIDAD_GSAP,
            stagger: ESCALON,
            overwrite: true,
          });
        };
        ScrollTrigger.addEventListener("scrollEnd", alDetener);
        return () => ScrollTrigger.removeEventListener("scrollEnd", alDetener);
      });
    },
    { scope: ref, dependencies: [total] },
  );

  return (
    <Tag ref={ref} className={className}>
      {partes.map((parte, i) => {
        if (parte.tipo === "espacio") return parte.texto;
        return (
          <span key={i} data-palabra="">
            {parte.tipo === "em" ? (
              // El brillo dispara cuando el título ya llegó al 40% de la
              // pantalla: con la palabra destacada ya plena.
              <TitleEm margin="0px 0px -60% 0px">{parte.texto}</TitleEm>
            ) : (
              parte.texto
            )}
          </span>
        );
      })}
    </Tag>
  );
}
