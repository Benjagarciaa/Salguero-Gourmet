"use client";

import { useRef } from "react";
import { useInView, type UseInViewOptions } from "@/lib/motion";
import { cn } from "@/lib/cn";

/**
 * Palabra destacada (ámbar itálica) de los títulos. En reposo es ámbar sólido; al
 * entrar en viewport dispara UN barrido de brillo (crema recorriendo el ámbar) una
 * sola vez, en vez de un loop infinito de background-position (que repintaba el
 * texto en cada frame y contradecía la regla "solo transform/opacity"). Fail-safe:
 * sin JS queda el ámbar sólido; con reduced-motion el @media de globals.css no
 * activa el barrido.
 * `margin`: cuándo dispara (por defecto, al entrar al 90% de la pantalla). Los
 * titulares que se encienden por scroll lo disparan más arriba, cuando la palabra
 * ya está plena (si no, el brillo pasa mientras la palabra todavía está tenue).
 */
export function TitleEm({
  children,
  className,
  margin = "0px 0px -10% 0px",
}: {
  children: React.ReactNode;
  className?: string;
  margin?: UseInViewOptions["margin"];
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin });
  return (
    <em
      ref={ref}
      className={cn("title-em italic", inView && "is-shimmering", className)}
    >
      {children}
    </em>
  );
}
