"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ZoomIn } from "lucide-react";
import type { GaleriaFoto } from "@/content/data";
import { trasCargaInactivo } from "@/lib/video";
import type {
  GaleriaLightboxCapas,
  PedidoLightbox,
} from "./GaleriaLightboxCapas";

/** Lo que el carril de la galería puede pedirle al lightbox. */
export interface GaleriaLightboxHandle {
  /**
   * Abre el visor directo en la foto `indice` (cerrarlo vuelve a la página, no
   * a la grilla). Sin índice válido, abre la grilla completa.
   */
  abrir: (indice?: number) => void;
}

type ComponenteCapas = typeof GaleriaLightboxCapas;

/**
 * Las capas (grilla, visor, zoom, teclado y foco: GaleriaLightboxCapas) viajan
 * en su propio chunk, fuera de la primera carga. Una sola descarga por página,
 * compartida por las dos instancias (escena y quieta); si falla, el próximo
 * pedido la reintenta.
 */
let capas: Promise<ComponenteCapas> | null = null;
function cargarCapas(): Promise<ComponenteCapas> {
  capas ??= import("./GaleriaLightboxCapas").then(
    (mod) => mod.GaleriaLightboxCapas,
    (error: unknown) => {
      capas = null;
      throw error;
    },
  );
  return capas;
}

/**
 * Adelanta la descarga de las capas: el carril la llama cuando el puntero o el
 * foco llegan a las fotos (y el botón, en los suyos). Nunca rechaza.
 */
export function precargarLightbox() {
  cargarCapas().catch(() => {});
}

/**
 * Galería completa en lightbox. El botón "Ver galería completa" (en el HTML del
 * servidor, igual que siempre) abre la grilla de todas las fotos curadas; al
 * tocar una se abre el visor fullscreen. Con `ref` (GaleriaLightboxHandle) el
 * carril abre el visor directo en una foto.
 *
 * Este componente es solo el disparador: guarda el último pedido de apertura
 * y monta las capas con él. Las capas se piden en idle después de `load` (y
 * antes, si el puntero, el foco o el dedo llegan al botón), así que la primera
 * apertura es igual a la de antes. Si se pide abrir antes de que lleguen, abre
 * apenas llegan. Hasta el primer pedido no se monta nada (como antes: el
 * portal nacía con la primera apertura).
 */
export function GaleriaLightbox({
  fotos,
  label = "Ver galería completa",
  ref,
}: {
  fotos: GaleriaFoto[];
  label?: string;
  ref?: React.Ref<GaleriaLightboxHandle>;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pedido, setPedido] = useState<PedidoLightbox | null>(null);
  // El componente de las capas, cuando ya llegó su chunk.
  const [Capas, setCapas] = useState<ComponenteCapas | null>(null);

  const traerCapas = useCallback(() => {
    cargarCapas().then(
      (componente) => setCapas(() => componente),
      () => {},
    );
  }, []);

  // Precarga en idle, después de `load`: no compite con el hero.
  useEffect(() => trasCargaInactivo(traerCapas), [traerCapas]);

  const pedir = useCallback(
    (indice: number | null, retorno: HTMLElement | null) => {
      setPedido((p) => ({ n: (p?.n ?? 0) + 1, indice, retorno }));
      traerCapas();
    },
    [traerCapas],
  );

  useImperativeHandle(
    ref,
    () => ({
      abrir(indice) {
        const valido =
          typeof indice === "number" && indice >= 0 && indice < fotos.length;
        pedir(
          valido ? indice : null,
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null,
        );
      },
    }),
    [fotos.length, pedir],
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => pedir(null, triggerRef.current)}
        onPointerEnter={precargarLightbox}
        onFocus={precargarLightbox}
        onTouchStart={precargarLightbox}
        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-hairline bg-transparent px-5 py-[10px] text-[14px] font-medium text-crema transition-[translate,scale,border-color] duration-500 ease-resorte hover:-translate-y-0.5 hover:border-crema-dim active:translate-y-0 active:scale-[0.97] active:duration-150"
      >
        <ZoomIn className="size-4 text-amarillo" aria-hidden />
        {label}
      </button>

      {pedido && Capas ? (
        <Capas key={pedido.n} fotos={fotos} pedido={pedido} />
      ) : null}
    </>
  );
}
