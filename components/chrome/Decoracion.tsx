"use client";

import dynamic from "next/dynamic";

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
  return (
    <>
      <ScrollProgress />
      <Bocaditos />
    </>
  );
}
