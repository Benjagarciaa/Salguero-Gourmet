"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { despuesDelPintado } from "@/lib/pintado";

/**
 * Capas decorativas (bocaditos que caen y la cuchara de progreso) fuera de la
 * primera carga de JS: cada una viaja en su propio chunk, que se pide al
 * hidratar y no demora al hero.
 *
 * Sin `loading` ni placeholder, y sin cambio de HTML: las dos ya devolvían
 * null en el servidor y en el primer render del cliente (se montan recién en
 * idle, useAfterIdle), así que diferir su código no puede correr nada (CLS 0)
 * ni esconder contenido. `ssr: false` solo se puede usar desde un componente
 * cliente (guía de Next 16, lazy-loading.md): por eso este envoltorio, que
 * app/layout.tsx (servidor) monta en el mismo lugar que antes.
 *
 * Los chunks se piden con el hero ya pintado (despuesDelPintado,
 * lib/pintado.ts): en una página visible es al hidratar, como siempre; en una
 * pestaña que todavía no se muestra, no le compiten a la primera pintura.
 */
const Bocaditos = dynamic(
  () => import("./Bocaditos").then((m) => m.Bocaditos),
  { ssr: false },
);
const ScrollProgress = dynamic(
  () => import("./ScrollProgress").then((m) => m.ScrollProgress),
  { ssr: false },
);

export function Decoracion() {
  const [pintado, setPintado] = useState(false);
  useEffect(() => despuesDelPintado(() => setPintado(true)), []);
  if (!pintado) return null;
  return (
    <>
      <ScrollProgress />
      <Bocaditos />
    </>
  );
}
