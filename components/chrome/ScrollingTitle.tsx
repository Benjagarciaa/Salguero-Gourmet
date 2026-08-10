"use client";

import { useEffect } from "react";
import { useReducedMotion } from "motion/react";
import { site } from "@/content/data";

/**
 * Hace "scrollear" el título de la pestaña (efecto ticker) para que se lea
 * completo aunque la pestaña sea angosta. Es un realce solo-cliente: el título
 * del SSR (para Google) queda limpio y completo; esto anima por encima tras montar.
 * Con reduced-motion no se mueve (queda el título estático).
 */
export function ScrollingTitle() {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const base = `${site.name} · ${site.tagline}`;
    if (reduceMotion) {
      document.title = base;
      return;
    }
    // Unidad con separador para que el loop cierre prolijo.
    const text = `${base}   ·   `;
    let i = 0;
    const id = window.setInterval(() => {
      document.title = text.slice(i) + text.slice(0, i);
      i = (i + 1) % text.length;
    }, 300);
    return () => {
      window.clearInterval(id);
      document.title = base;
    };
  }, [reduceMotion]);

  return null;
}
