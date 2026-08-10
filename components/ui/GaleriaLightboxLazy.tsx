"use client";

import dynamic from "next/dynamic";
import { ZoomIn } from "lucide-react";
import { useNearViewport } from "@/lib/useNearViewport";
import type { GaleriaFoto } from "@/content/data";

/**
 * Carga el lightbox de galería (grilla de todas las fotos + visor con zoom +
 * clips de video + trampa de foco + íconos de lucide) recién cuando la sección
 * se acerca al viewport. Su chunk sale del bundle inicial: no se parsea ni
 * hidrata en el arranque (baja el Total Blocking Time).
 *
 * Mientras tanto muestra un botón skeleton de las MISMAS dimensiones, así al
 * montar el real no hay salto. Para cuando el botón es visible/clickeable, el
 * swap ya ocurrió (rootMargin de anticipación).
 */
const GaleriaLightbox = dynamic(
  () => import("./GaleriaLightbox").then((m) => m.GaleriaLightbox),
  { ssr: false },
);

const BTN_CLASS =
  "inline-flex shrink-0 items-center gap-2 rounded-full border border-hairline px-5 py-[10px] text-[14px] font-medium text-crema transition-colors hover:border-amarillo hover:text-amarillo";

export function GaleriaLightboxLazy({
  fotos,
  label = "Ver galería completa",
}: {
  fotos: GaleriaFoto[];
  label?: string;
}) {
  const { ref, near } = useNearViewport<HTMLButtonElement>("500px 0px");
  if (near) return <GaleriaLightbox fotos={fotos} label={label} />;
  return (
    <button ref={ref} type="button" aria-hidden tabIndex={-1} className={BTN_CLASS}>
      <ZoomIn className="size-4" aria-hidden />
      {label}
    </button>
  );
}
