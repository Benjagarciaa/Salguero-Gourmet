"use client";

import { useEffect } from "react";
import type { IdleWindow } from "@/lib/idle";
import { despuesDeLoadYPintura } from "@/lib/pintado";

/** Proyecto de Microsoft Clarity del sitio. */
const PROYECTO = "y0bxo4c1tq";

/**
 * Microsoft Clarity: heatmaps + grabación de sesiones. Carga en el idle
 * después de `load` (lo que hacía next/script con lazyOnload), para que sus
 * pedidos no le compitan el ancho de banda al hero en mobile, y además con la
 * página ya pintada (despuesDeLoadYPintura, lib/pintado.ts). En una página
 * visible es exactamente lo mismo que antes (la primera pintura llega antes
 * que `load`) y graba la sesión igual; en una pestaña que todavía no se
 * muestra (abierta en segundo plano, o un navegador automatizado que demora
 * los cuadros, como el de PageSpeed) espera a que se muestre en vez de
 * bajarse antes que lo que se ve.
 *
 * Solo el dominio publicado: las vistas previas de Vercel y el `next start`
 * local no graban (si no, se mezclan visitas de prueba con las reales). Solo
 * en producción (lo decide layout.tsx): en dev su handler de scroll fuerza
 * layout en cada evento y ensuciaba los datos con sesiones de localhost.
 */
export function Clarity() {
  useEffect(() => {
    if (!/^(www\.)?salguerogourmet\.com$/.test(location.hostname)) return;
    const w = window as IdleWindow & {
      clarity?: ((...args: unknown[]) => void) & { q?: unknown[][] };
    };
    let idle = 0;
    let espera = 0;
    // El snippet oficial de Clarity.
    const cargar = () => {
      w.clarity =
        w.clarity ||
        function (...args: unknown[]) {
          (w.clarity!.q = w.clarity!.q || []).push(args);
        };
      const tag = document.createElement("script");
      tag.async = true;
      tag.src = `https://www.clarity.ms/tag/${PROYECTO}`;
      const primero = document.getElementsByTagName("script")[0];
      if (primero?.parentNode) primero.parentNode.insertBefore(tag, primero);
      else document.head.appendChild(tag);
    };
    const cancelar = despuesDeLoadYPintura(() => {
      if (typeof w.requestIdleCallback === "function") {
        idle = w.requestIdleCallback(cargar);
      } else {
        espera = window.setTimeout(cargar, 1);
      }
    });
    return () => {
      cancelar();
      if (idle) w.cancelIdleCallback?.(idle);
      if (espera) window.clearTimeout(espera);
    };
  }, []);
  return null;
}
