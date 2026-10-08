"use client";

import { useEffect } from "react";
import { Section } from "@/components/ui/Section";
import { Kicker } from "@/components/ui/Kicker";
import { Pill } from "@/components/ui/Pill";
import { errorPagina } from "@/content/data";

/**
 * Error en el cliente: si algo de la página se rompe en el navegador (el hero
 * con su lienzo, una escena de GSAP, la galería), Next desmonta las secciones
 * y, sin este archivo, mostraba su pantalla genérica en inglés, sin nav ni
 * pill. Acá queda el molde de la 404 (quieto, sin animaciones), dentro del
 * layout (nav y pie siguen), con "Probar de nuevo" (`retry` vuelve a montar
 * las secciones) y la pill directo a WhatsApp, así el pedido de presupuesto
 * sigue a mano aunque la página esté rota. El copy vive en content/data.ts
 * (`errorPagina`). Los errores del servidor llegan con un mensaje genérico y
 * un `digest` (Next no filtra detalles); acá no se muestra nada del error.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);
  const { kicker, titulo, texto, reintentar, boton } = errorPagina;
  return (
    <main>
      <Section className="flex min-h-[70svh] items-center">
        <Kicker>{kicker}</Kicker>
        <h1 className="mt-[14px] font-display text-[clamp(2.1rem,5vw,3.2rem)] font-medium leading-[1.12] text-crema">
          {titulo.pre}
          <em className="title-em italic">{titulo.em}</em>
          {titulo.post}
        </h1>
        <p className="mt-4 max-w-[52ch] text-crema-dim">{texto}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Pill href={boton.href} target="_blank">
            {boton.label}
          </Pill>
          <Pill variant="fantasma" onClick={() => retry()}>
            {reintentar}
          </Pill>
        </div>
      </Section>
    </main>
  );
}
