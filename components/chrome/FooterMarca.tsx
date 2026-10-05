"use client";

import { useRef } from "react";
import { OPACIDAD_GSAP, SCRUB, resorteGsap } from "@/lib/fisica";
import { capaActiva, gsap, ScrollTrigger, useGSAPAlAcercarse } from "@/lib/gsap";
import { cn } from "@/lib/cn";
import styles from "./FooterMarca.module.css";

/** Las dos palabras del wordmark (el logo es el mismo del nav, en grande). */
const PALABRAS = ["SALGUERO", "GOURMET"] as const;

/**
 * Wordmark grande del pie: SALGUERO + cuchara + GOURMET a todo el ancho del
 * contenido. Movimiento sutil, una sola vez y encima de lo que ya se ve:
 *
 * - Al entrar en pantalla, las letras suben desde su línea (máscara) en cascada
 *   desde el centro con el resorte `entrada` (sin rebote) y la cuchara cae a su
 *   lugar con el resorte `pop` (se pasa 2.3 % y se asienta). La opacidad de la
 *   cuchara va aparte, con un tween corto (lib/fisica.ts).
 * - Mientras el pie entra, el renglón sube un poco más lento que la página
 *   (parallax con scrub directo); en el fondo de la página queda en su lugar
 *   exacto.
 * - Capas de GPU solo cuando hacen falta (FooterMarca.module.css): el renglón
 *   con `[data-capa]` (capaActiva, alrededor del pie) y las letras y la cuchara
 *   con `[data-animando]`, que dura lo que la entrada.
 * - Con mouse, al pasar por encima las letras hacen una ola y la cuchara
 *   "revuelve".
 *
 * Fail-open: el HTML servido es el wordmark completo y quieto. GSAP recién
 * esconde las letras en el cliente, y solo si el pie todavía no está a la vista
 * (si ya se ve, no se anima). Con reduced-motion no hay nada de esto. El nombre
 * para lectores de pantalla va como texto real (sr-only); las letras sueltas
 * son aria-hidden.
 *
 * Se arma al acercarse (useGSAPAlAcercarse, lib/gsap.ts), no al hidratar: no
 * fija nada ni cambia el alto, y su parallax arranca con el pie asomando.
 */
export function FooterMarca({
  nombre,
  className,
}: {
  nombre: string;
  className?: string;
}) {
  const raiz = useRef<HTMLDivElement>(null);

  useGSAPAlAcercarse(
    () => {
      const el = raiz.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
        const fila = el.querySelector<HTMLElement>("[data-fila]");
        const cuchara = el.querySelector<SVGSVGElement>("[data-cuchara]");
        const letras = gsap.utils.toArray<HTMLElement>("[data-letra]", el);
        if (!fila || !cuchara || !letras.length) return;

        // Parallax: el renglón sube un poco más lento que el scroll mientras el
        // pie entra, y llega a su lugar cuando su borde toca el pie de pantalla.
        gsap.fromTo(
          fila,
          { yPercent: 40 },
          {
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom bottom",
              scrub: SCRUB,
              // Se refresca después de los pins de más arriba (su posición
              // depende del alto que agregan).
              refreshPriority: -1,
              invalidateOnRefresh: true,
            },
          },
        );

        // El renglón es capa de GPU solo alrededor del pie (lo mueve el scrub).
        const sinCapa = capaActiva(el);

        // Entrada, una sola vez. Letras y cuchara son capa solo mientras dura.
        const animando = (si: boolean) => {
          if (si) el.setAttribute("data-animando", "");
          else el.removeAttribute("data-animando");
        };
        const entrada = gsap.timeline({
          paused: true,
          onStart: () => animando(true),
          onComplete: () => animando(false),
        });
        entrada
          .from(
            letras,
            {
              yPercent: 118,
              ...resorteGsap("entrada"),
              stagger: { each: 0.035, from: "center" },
            },
            0,
          )
          .from(
            cuchara,
            {
              yPercent: -80,
              rotation: -50,
              scale: 0.4,
              ...resorteGsap("pop"),
            },
            0.1,
          )
          .from(cuchara, { autoAlpha: 0, ...OPACIDAD_GSAP }, 0.1);

        let io: IntersectionObserver | null = null;
        if (ScrollTrigger.isInViewport(el, 0.05)) {
          // Ya se ve (recarga al fondo de la página): nada de esconderlo.
          entrada.progress(1);
        } else {
          io = new IntersectionObserver(
            (entradas) => {
              if (entradas.some((e) => e.isIntersecting)) {
                entrada.play();
                io?.disconnect();
              }
            },
            { rootMargin: "0px 0px -6% 0px" },
          );
          io.observe(el);
        }

        // Ola al pasar el mouse (solo con puntero fino).
        let ola: gsap.core.Timeline | null = null;
        const alEntrar = ctx.add("ola", () => {
          if (entrada.isActive() || ola?.isActive()) return;
          ola = gsap
            .timeline()
            .to(
              letras,
              {
                yPercent: -10,
                ...resorteGsap("hover"),
                stagger: { each: 0.028, yoyo: true, repeat: 1 },
              },
              0,
            )
            .to(
              cuchara,
              {
                rotation: -16,
                ...resorteGsap("hover"),
                yoyo: true,
                // A la vuelta, la misma forma: se posa sin golpe.
                yoyoEase: true,
                repeat: 1,
              },
              0.16,
            );
        }) as () => void;
        const conMouse = window.matchMedia(
          "(hover: hover) and (pointer: fine)",
        ).matches;
        if (conMouse) el.addEventListener("pointerenter", alEntrar);

        return () => {
          io?.disconnect();
          el.removeEventListener("pointerenter", alEntrar);
          sinCapa();
          animando(false);
        };
      });
    },
    { scope: raiz },
  );

  return (
    <div ref={raiz} className={cn(styles.caja, className)}>
      <p className={styles.marca}>
        <span className="sr-only">{nombre}</span>
        <span className={styles.fila} data-fila aria-hidden>
          <Palabra texto={PALABRAS[0]} />
          <svg
            viewBox="0 0 34 180"
            className={styles.cuchara}
            data-cuchara
            focusable="false"
          >
            <g fill="#E9BC4F">
              <ellipse cx="17" cy="27" rx="17" ry="27" />
              <rect x="12.25" y="48" width="9.5" height="132" rx="4.75" />
            </g>
          </svg>
          <Palabra texto={PALABRAS[1]} />
        </span>
      </p>
    </div>
  );
}

function Palabra({ texto }: { texto: string }) {
  return (
    <span className={styles.palabra}>
      {Array.from(texto, (letra, i) => (
        <span key={i} className={styles.letra} data-letra>
          {letra}
        </span>
      ))}
    </span>
  );
}
