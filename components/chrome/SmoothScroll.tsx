"use client";

import { useEffect } from "react";
import type Lenis from "lenis";
import "lenis/dist/lenis.css";
import type { IdleWindow } from "@/lib/idle";
import { SCROLL } from "@/lib/fisica";
import { gsap, ScrollTrigger, scrollNativo } from "@/lib/gsap";
import { mantenerPosicion } from "@/lib/posicion";

/**
 * Smooth scroll global con Lenis, SOLO con puntero fino (rueda y trackpad).
 * - No se crea con prefers-reduced-motion (scroll nativo) ni en táctiles
 *   (`scrollNativo()`): con el dedo Lenis no suaviza (syncTouch false) y solo
 *   sumaba listeners no pasivos de touchstart/touchmove en window. Así el toque
 *   queda 100% pasivo, con el momentum nativo, y `anticiparPin()` (lib/gsap)
 *   usa el mismo criterio. En táctiles las anclas son suaves por CSS
 *   (scroll-behavior: smooth en globals.css).
 * - `anchors`: los links #ancla scrollean suave (SCROLL.anclas, easeInOutCubic).
 *   Lenis ya resta el `scroll-margin-top` del destino (globals.css: alto del
 *   nav + aire), así que acá no va un offset extra.
 * - Un rAF propio, registrado ANTES que el del ticker de GSAP, mueve todo: en
 *   cada cuadro llama a `lenis.raf(t)` con el tiempo del vsync y después a
 *   `gsap.ticker.tick()`. Cada cuadro de pantalla tiene su tick (antes, con
 *   Lenis dentro de gsap.ticker, el reloj de GSAP salteaba cuadros a 180 Hz y
 *   el scroll quedaba quieto en 3.4 % de los cuadros, 22 a 25 % en el hero).
 *   El rAF automático de GSAP sigue vivo (GSAP lo despierta solo al crear
 *   tweens) pero no despacha: con fps(1) cada tick manual corre su próximo
 *   turno un segundo, así hay exactamente un tick por cuadro.
 * - A partir de este orden, Lenis escribe el scroll ANTES del tick de GSAP: los
 *   listeners del ticker (Bocaditos, Empresas) leen el scroll del cuadro
 *   actual, no el del anterior.
 * - Cada scroll de Lenis avisa a ScrollTrigger.update. lagSmoothing(0): el
 *   ticker no "compensa" cuadros lentos, así el scroll nunca salta. El
 *   suavizado lo pone SOLO Lenis: las escenas usan scrub directo (SCRUB).
 * - Posición (lib/posicion.ts), en TODOS los modos (táctil y reducir
 *   movimiento incluidos): entrada por ancla, recarga y cambio de tamaño caen
 *   donde tienen que caer aunque los pins cambien el alto de la página.
 * - Solo envuelve children; no agrega DOM.
 * - El código de Lenis se baja recién en `start` (import dinámico): en
 *   táctiles y con reducir movimiento no se baja nunca (el 50 % del tráfico
 *   es celular). Su CSS queda estático (es mínimo y no depende del puntero).
 *   Si el componente se desmonta mientras llega, no se crea.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  // Antes que Lenis y sin su return temprano: corre en todos los modos.
  useEffect(() => mantenerPosicion(), []);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced || scrollNativo()) return;

    let lenis: Lenis | null = null;
    let rafId = 0;
    let idleId = 0;
    let timeoutId = 0;
    // La limpieza lo pone en true: si el import de Lenis llega después de
    // desmontar, no se crea nada.
    let cancelado = false;

    // Lenis mide el DOM y ata listeners al iniciar: se difiere a idle para que
    // ese trabajo no caiga en la ventana de hidratación (Total Blocking Time).
    // Hasta que arranca, el scroll es nativo (imperceptible en los primeros ms)
    // y ScrollTrigger escucha el scroll nativo por su cuenta.
    //
    // El módulo se pide ya (solo acá: puntero fino y con movimiento). Llega en
    // paralelo a la hidratación y en idle se crea igual que antes.
    const modulo = import("lenis");
    modulo.catch(() => {});
    const start = async () => {
      let Clase: typeof Lenis;
      try {
        Clase = (await modulo).default;
      } catch {
        // Sin Lenis (falló la descarga): queda el scroll nativo.
        return;
      }
      if (cancelado) return;

      // easeInOutCubic: arranca y frena suave (evita el "pop" al inicio del salto).
      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const instancia = new Clase({
        // Rueda con lerp (amortiguación continua) y no con duración: cada
        // muesca de la rueda no reinicia una curva que arranca a máxima
        // velocidad. 0.1 = constante de ~167 ms (antes 0.075, ~220 ms): con el
        // scrub directo de las escenas es el único suavizado.
        lerp: SCROLL.lerp,
        smoothWheel: true,
        // El scroll a las anclas (clicks en nav/CTAs) es más largo y con easeInOut
        // para que no salte de golpe.
        anchors: { duration: SCROLL.anclas, easing: easeInOutCubic },
      });
      lenis = instancia;

      instancia.on("scroll", () => ScrollTrigger.update());

      // Un solo loop: el rAF propio queda registrado antes que el de GSAP
      // (sleep lo cancela y wake lo vuelve a pedir DESPUÉS del nuestro), y se
      // re-registra primero en cada cuadro, así mantiene el orden.
      // fps(1): el rAF automático de GSAP sigue vivo pero no despacha mientras
      // corre el nuestro (cada tick manual corre su próximo turno 1 s). Sin
      // esto, en los cuadros pesados (listeners de más de ~3 ms) despachaba
      // una segunda vez en el mismo cuadro: medido, 5 % de los cuadros.
      gsap.ticker.lagSmoothing(0);
      gsap.ticker.fps(1);
      gsap.ticker.sleep();
      const loop = (t: number) => {
        rafId = requestAnimationFrame(loop);
        instancia.raf(t);
        gsap.ticker.tick();
      };
      rafId = requestAnimationFrame(loop);
      gsap.ticker.wake();
    };

    const w = window as IdleWindow;
    const arrancar = () => void start();
    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(arrancar, { timeout: 800 });
    } else {
      timeoutId = window.setTimeout(arrancar, 300);
    }

    return () => {
      cancelado = true;
      if (idleId) w.cancelIdleCallback?.(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
      if (rafId) {
        cancelAnimationFrame(rafId);
        // Vuelve a los valores por defecto de GSAP (240 fps, lagSmoothing).
        gsap.ticker.fps(240);
        gsap.ticker.lagSmoothing(500, 33);
      }
      lenis?.destroy();
    };
  }, []);

  return <>{children}</>;
}
