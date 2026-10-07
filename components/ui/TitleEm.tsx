"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/cn";

/**
 * Palabra destacada (ámbar itálica) de los títulos. En reposo es ámbar sólido; al
 * entrar en viewport dispara UN barrido de brillo (crema recorriendo el ámbar) una
 * sola vez, en vez de un loop infinito de background-position (que repintaba el
 * texto en cada frame y contradecía la regla "solo transform/opacity"). Fail-safe:
 * sin JS queda el ámbar sólido; con reduced-motion el @media de globals.css no
 * activa el barrido.
 */
export function TitleEm({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  return (
    <em
      ref={ref}
      className={cn("title-em italic", inView && "is-shimmering", className)}
    >
      {children}
    </em>
  );
}
