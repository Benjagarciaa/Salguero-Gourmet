"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "@/lib/motion";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { InstagramIcon } from "@/components/ui/InstagramIcon";
import { contacto, type GaleriaFoto } from "@/content/data";
import { OPACIDAD, RESORTE, SALIDA } from "@/lib/fisica";

/**
 * URL del visor ruteada por el optimizador de Next (avif/webp, resize a 1200px de
 * ancho: suficiente para el visor + zoom, mucho mas liviana que el JPG crudo).
 * w=1200 esta en los deviceSizes por defecto y q=88 esta habilitado en
 * `images.qualities` del next.config (Next 16 rechaza con 400 los `q` fuera de esa
 * allowlist). 88 da un visor mas nitido para el zoom sin pesar de mas.
 */
const viewerSrc = (src: string) =>
  `/_next/image?url=${encodeURIComponent(src)}&w=1200&q=88`;

/** Resorte `panel` sin `type`, para useSpring (lib/fisica.ts). */
const PANEL = {
  stiffness: RESORTE.panel.stiffness,
  damping: RESORTE.panel.damping,
  mass: RESORTE.panel.mass,
};

/** Cambio de foto: la nueva entra 12px desde el lado hacia el que se avanza. */
const FOTO = {
  entra: (d: number) => ({ opacity: 0, x: 12 * d }),
  centro: {
    opacity: 1,
    x: 0,
    transition: { x: RESORTE.panel, opacity: OPACIDAD },
  },
  sale: (d: number) => ({ opacity: 0, x: -12 * d, transition: SALIDA }),
};

/**
 * Deslizar en el visor (dedo, o mouse arrastrando): más de `umbral` px de
 * costado (y más de costado que de alto) pasa de foto. Hasta `eje` px no se
 * decide el gesto (un toque sigue siendo un click: zoom o cerrar).
 */
const DESLIZAR = { umbral: 50, eje: 8 };

/** Un pedido de apertura (lo arma GaleriaLightbox, el disparador). */
export interface PedidoLightbox {
  /** Cuenta de aperturas: cada pedido nuevo vuelve a montar las capas (key). */
  n: number;
  /** Foto del visor en la que abre directo, o null: la grilla completa. */
  indice: number | null;
  /** A dónde vuelve el foco al cerrar (el botón o la foto que lo abrió). */
  retorno: HTMLElement | null;
}

/**
 * Las capas del lightbox: la grilla de todas las fotos curadas y el visor
 * fullscreen con zoom (click para acercar, mouse para desplazar el encuadre) y
 * navegación. Viajan en su propio chunk: GaleriaLightbox (el botón, que sí
 * está en el HTML del servidor) las pide en idle o al acercarse, y las monta
 * recién con el primer pedido de apertura. Cada pedido las monta de nuevo
 * (key), ya abiertas: la entrada es la misma que antes.
 *
 * Las capas se montan en un portal sobre <body>: el disparador puede vivir dentro
 * de un escenario fijado por ScrollTrigger (o de un ancestro con transform), que
 * volvería "fixed" a las capas relativas a ese escenario en vez del viewport.
 *
 * El visor es una CAPA HERMANA opaca (no un hijo del overlay de la grilla): el
 * overlay usa backdrop-filter, que crea un bloque contenedor y volvería "fixed"
 * al visor relativo al overlay scrolleable (haciéndolo desplazarse al scrollear).
 * Como hermano fixed y opaco, el visor queda anclado al viewport y tapa la grilla.
 *
 * Movimiento (lib/fisica.ts): las capas entran con un fundido (OPACIDAD; la
 * grilla además sube 16px con el resorte `panel`) y salen con SALIDA
 * (AnimatePresence). Al cambiar de foto, la actual sale hacia un lado y la nueva
 * entra desde el otro. El zoom escala con el resorte `panel` y el encuadre sigue
 * al mouse suavizado con el mismo resorte, sin renders de React por evento. Con
 * reducir movimiento todo es instantáneo.
 *
 * Accesible: role=dialog + aria-modal, teclado (Escape/flechas), foco atrapado
 * dentro de la capa activa y devuelto a quien lo abrió cuando termina de salir,
 * y bloqueo del scroll de fondo: overflow en <html> (el overflow del body no
 * llega a la ventana porque <html> tiene overflow-x: clip) y data-lenis-prevent
 * para Lenis.
 */
export function GaleriaLightboxCapas({
  fotos,
  pedido,
}: {
  fotos: GaleriaFoto[];
  pedido: PedidoLightbox;
}) {
  // Se monta ya abierto (un montaje por pedido) y queda montado después de
  // cerrar: así las capas pueden salir animadas (AnimatePresence).
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState<number | null>(pedido.indice);
  // Dirección del último cambio de foto (-1 anterior, 1 siguiente, 0 desde la
  // grilla): de qué lado entra la nueva.
  const [dir, setDir] = useState(0);
  // Abierto directo en el visor (desde una foto del carril): sin grilla debajo.
  const [directo, setDirecto] = useState(pedido.indice !== null);
  const [zoom, setZoom] = useState(false);
  // A dónde vuelve el foco al cerrar (el botón o la foto que lo abrió).
  const retornoRef = useRef<HTMLElement | null>(pedido.retorno);
  const gridRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  // Overflow previo de <html> mientras el fondo está bloqueado (null: libre).
  const bloqueoRef = useRef<string | null>(null);
  const openRef = useRef(open);
  const reduceMotion = useReducedMotion();

  // Encuadre del zoom (en %): el mouse mueve el objetivo y el resorte lo sigue.
  const origenX = useMotionValue(50);
  const origenY = useMotionValue(50);
  const suaveX = useSpring(origenX, PANEL);
  const suaveY = useSpring(origenY, PANEL);
  const encuadreX = reduceMotion ? origenX : suaveX;
  const encuadreY = reduceMotion ? origenY : suaveY;
  const transformOrigin = useTransform(
    () => `${encuadreX.get()}% ${encuadreY.get()}%`,
  );

  // Arrastre de costado en el visor: la foto sigue al dedo 1:1 (jump) y, si no
  // alcanza para pasar de foto, vuelve al centro con el resorte `panel`. Si
  // pasa, queda donde se soltó mientras sale (la salida sigue hacia ese lado)
  // y vuelve a 0 cuando ya salió (alSalirFoto), antes de que entre la nueva.
  const arrastre = useMotionValue(0);
  const arrastreSuave = useSpring(arrastre, PANEL);
  const gestoRef = useRef<{
    id: number;
    x: number;
    y: number;
    eje: "x" | "y" | null;
  } | null>(null);
  // Hubo arrastre: el click que el navegador dispara al soltar no cuenta
  // (no cierra el visor ni cambia el zoom).
  const arrastroRef = useRef(false);

  const instantaneo = { duration: 0 };
  const entraFundido = reduceMotion ? instantaneo : OPACIDAD;
  const saleFundido = reduceMotion ? instantaneo : SALIDA;

  /** Encuadre al centro sin animar (foto nueva o visor cerrado). */
  const centrar = useCallback(() => {
    origenX.jump(50);
    origenY.jump(50);
    suaveX.jump(50);
    suaveY.jump(50);
  }, [origenX, origenY, suaveX, suaveY]);

  // Cambiar de foto (o cerrar el visor) siempre reinicia el zoom.
  const irA = useCallback(
    (i: number | null) => {
      setDir(0);
      setActive(i);
      setZoom(false);
      centrar();
    },
    [centrar],
  );
  const close = useCallback(() => {
    setOpen(false);
    setDirecto(false);
    irA(null);
  }, [irA]);
  // Cerrar el visor: si se abrió directo, cierra todo; si no, vuelve a la grilla.
  const cerrarVisor = useCallback(() => {
    if (directo) close();
    else irA(null);
  }, [directo, close, irA]);
  const showPrev = useCallback(() => {
    setDir(-1);
    setActive((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length));
    setZoom(false);
    centrar();
  }, [fotos.length, centrar]);
  const showNext = useCallback(() => {
    setDir(1);
    setActive((i) => (i === null ? i : (i + 1) % fotos.length));
    setZoom(false);
    centrar();
  }, [fotos.length, centrar]);

  // Precargar las fotos vecinas para que paginar sea instantaneo (quedan en cache
  // del navegador antes de que el usuario toque prev/next).
  useEffect(() => {
    if (active === null) return;
    [1, -1].forEach((d) => {
      const i = (active + d + fotos.length) % fotos.length;
      const pre = new window.Image();
      pre.src = viewerSrc(fotos[i].image);
    });
  }, [active, fotos]);

  // Teclado: Escape, flechas y trampa de foco (Tab) dentro de la capa activa.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (active !== null) cerrarVisor();
        else close();
        return;
      }
      if (active !== null && e.key === "ArrowLeft") {
        e.preventDefault();
        showPrev();
        return;
      }
      if (active !== null && e.key === "ArrowRight") {
        e.preventDefault();
        showNext();
        return;
      }
      if (e.key === "Tab") {
        const layer = active !== null ? viewerRef.current : gridRef.current;
        if (!layer) return;
        // Solo elementos realmente renderizados: getClientRects() == 0 para
        // display:none (ej. el link de IG del header, oculto en mobile), que si no
        // se filtra rompe la trampa de foco.
        const f = Array.from(
          layer.querySelectorAll<HTMLElement>(
            'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.getClientRects().length > 0);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (!layer.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, active, close, cerrarVisor, showPrev, showNext]);

  // Bloquear el scroll del fondo al abrir. El desbloqueo y la devolución del
  // foco van al terminar la salida (alTerminarSalida). Sobre <html>: con
  // overflow-x: clip en <html>, el overflow del body no llega a la ventana.
  useEffect(() => {
    openRef.current = open;
    if (!open || bloqueoRef.current !== null) return;
    const html = document.documentElement;
    bloqueoRef.current = html.style.overflow;
    html.style.overflow = "hidden";
  }, [open]);
  // Red de seguridad: si el componente se desmonta abierto, liberar el fondo.
  useEffect(
    () => () => {
      if (bloqueoRef.current === null) return;
      document.documentElement.style.overflow = bloqueoRef.current;
      bloqueoRef.current = null;
    },
    [],
  );

  /**
   * Terminó de salir una capa. Si el lightbox quedó cerrado (y no solo el visor
   * sobre la grilla): libera el fondo y devuelve el foco a quien lo abrió, sin
   * scrollear (el disparador puede estar dentro de un escenario fijado).
   */
  const alTerminarSalida = () => {
    if (openRef.current) return;
    if (bloqueoRef.current !== null) {
      document.documentElement.style.overflow = bloqueoRef.current;
      bloqueoRef.current = null;
    }
    retornoRef.current?.focus({ preventScroll: true });
  };

  // Enfocar la capa activa (grilla o visor) cuando cambia.
  useEffect(() => {
    if (!open) return;
    if (active !== null) viewerRef.current?.focus();
    else gridRef.current?.focus();
  }, [open, active]);

  // Encuadre del zoom: el mouse lo mueve al pasar; el dedo, arrastrando.
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!zoom) return;
    if (e.pointerType !== "mouse" && e.buttons === 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    origenX.set(((e.clientX - r.left) / r.width) * 100);
    origenY.set(((e.clientY - r.top) / r.height) * 100);
  };

  /* ---- Deslizar para pasar de foto (sin zoom) ---- */
  const volverAlCentro = () => {
    if (reduceMotion) arrastreSuave.jump(0);
    arrastre.set(0);
  };
  const alApoyar = (e: React.PointerEvent<HTMLDivElement>) => {
    arrastroRef.current = false;
    if (zoom || e.button !== 0 || !e.isPrimary) return;
    gestoRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      eje: null,
    };
  };
  const alArrastrar = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestoRef.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.eje === null) {
      if (Math.hypot(dx, dy) < DESLIZAR.eje) return;
      g.eje = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      arrastroRef.current = true;
      if (g.eje === "x") {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Sin captura el gesto sigue igual (dentro del visor).
        }
      }
    }
    if (g.eje !== "x" || reduceMotion) return;
    arrastre.jump(dx);
    arrastreSuave.jump(dx);
  };
  const alSoltar = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestoRef.current;
    if (!g || g.id !== e.pointerId) return;
    gestoRef.current = null;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (
      g.eje === "x" &&
      Math.abs(dx) > DESLIZAR.umbral &&
      Math.abs(dx) > Math.abs(dy) &&
      fotos.length > 1
    ) {
      if (dx < 0) showNext();
      else showPrev();
      return;
    }
    volverAlCentro();
  };
  const alCancelar = () => {
    gestoRef.current = null;
    volverAlCentro();
  };
  // La foto anterior ya salió: el arrastre vuelve a 0 antes de que entre la
  // nueva (que entra desde su lado, como con los botones).
  const alSalirFoto = () => {
    arrastre.jump(0);
    arrastreSuave.jump(0);
  };
  const alSalirMouse = () => {
    origenX.set(50);
    origenY.set(50);
  };

  const foto = active !== null ? fotos[active] : null;
  const videoCount = fotos.filter((f) => f.video).length;
  const photoCount = fotos.length - videoCount;

  const capas = (
    <AnimatePresence onExitComplete={alTerminarSalida}>
      {/* Capa 1: grilla scrolleable (no se monta si se abrió directo al visor) */}
      {open && !directo ? (
        <m.div
          key="grilla"
          ref={gridRef}
          role="dialog"
          aria-modal="true"
          aria-label="Galería completa"
          tabIndex={-1}
          inert={active !== null}
          data-lenis-prevent
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: saleFundido }}
          transition={entraFundido}
          className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-[rgba(18,13,9,0.94)] outline-none backdrop-blur-sm"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-hairline bg-[rgba(18,13,9,0.7)] px-4 py-3 backdrop-blur sm:px-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-crema-dim">
              Galería · {photoCount} fotos
              {videoCount ? ` · ${videoCount} videos` : ""}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={contacto.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-2 rounded-full border border-hairline px-4 py-2 text-[13px] font-medium text-crema transition-colors hover:border-amarillo hover:text-amarillo sm:inline-flex"
              >
                <InstagramIcon className="size-4" />
                {contacto.instagramHandle}
              </a>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar galería"
                // before: área táctil de 46px (el círculo sigue de 36).
                className="relative grid size-9 place-items-center rounded-full border border-hairline text-crema transition-colors before:absolute before:-inset-1.5 before:rounded-full hover:border-amarillo hover:text-amarillo"
              >
                <X className="size-[18px]" aria-hidden />
              </button>
            </div>
          </div>

          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? instantaneo
                : { y: RESORTE.panel, opacity: OPACIDAD }
            }
            className="mx-auto grid max-w-[1160px] grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:gap-3 sm:p-5 min-[900px]:grid-cols-4"
          >
            {fotos.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => irA(i)}
                aria-label={`${f.video ? "Reproducir" : "Ampliar"}: ${f.caption}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-hairline"
              >
                <Image
                  src={f.image}
                  alt={f.alt}
                  fill
                  quality={88}
                  sizes="(max-width: 640px) 50vw, (max-width: 900px) 33vw, 280px"
                  className="object-cover transition-transform duration-[650ms] ease-resorte-lento group-hover:scale-105"
                />
                {f.video ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 grid place-items-center"
                  >
                    <span className="grid size-11 place-items-center rounded-full bg-[rgba(18,13,9,0.55)] ring-1 ring-[rgba(245,238,224,0.6)] backdrop-blur-sm transition-transform duration-500 ease-resorte group-hover:scale-110">
                      <Play
                        className="size-5 translate-x-[1px] text-crema"
                        fill="currentColor"
                      />
                    </span>
                  </span>
                ) : null}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(18,13,9,0.9)] to-transparent px-3 pb-2 pt-9 text-left">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-crema">
                    {f.caption}
                  </span>
                </span>
              </button>
            ))}
          </m.div>

          <div className="mx-auto max-w-[1160px] px-4 pb-10 pt-4 text-center sm:px-6">
            <p className="text-[14px] text-crema-dim">
              Todo esto y las novedades en nuestro Instagram
            </p>
            <a
              href={contacto.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-[10px] text-[14px] font-medium text-crema transition-colors hover:border-amarillo hover:text-amarillo"
            >
              <InstagramIcon className="size-[18px]" />
              {contacto.instagramHandle}
            </a>
          </div>
        </m.div>
      ) : null}

      {/* Capa 2: visor de una foto (hermano opaco, anclado al viewport) */}
      {open && foto ? (
        <m.div
          key="visor"
          ref={viewerRef}
          role="dialog"
          aria-modal="true"
          aria-label={foto.caption}
          tabIndex={-1}
          data-lenis-prevent
          onClick={cerrarVisor}
          onClickCapture={(e) => {
            // El click que sigue a un arrastre no cierra ni hace zoom.
            if (!arrastroRef.current) return;
            arrastroRef.current = false;
            e.stopPropagation();
          }}
          onPointerDown={alApoyar}
          onPointerMove={alArrastrar}
          onPointerUp={alSoltar}
          onPointerCancel={alCancelar}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: saleFundido }}
          transition={entraFundido}
          // pinch-zoom: el pellizco sigue siendo del navegador; los gestos de
          // un dedo llegan como pointer events (deslizar, y el encuadre con
          // zoom).
          style={{ touchAction: "pinch-zoom" }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0e0a07] p-4 outline-none"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cerrarVisor();
            }}
            aria-label="Cerrar"
            // before: área táctil de 46px (el círculo sigue de 40).
            className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full border border-hairline text-crema transition-colors before:absolute before:-inset-1 before:rounded-full hover:border-amarillo hover:text-amarillo"
          >
            <X className="size-5" aria-hidden />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              showPrev();
            }}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-hairline bg-[rgba(18,13,9,0.5)] text-crema transition-colors hover:border-amarillo hover:text-amarillo"
          >
            <ChevronLeft className="size-6" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              showNext();
            }}
            aria-label="Siguiente"
            className="absolute right-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-hairline bg-[rgba(18,13,9,0.5)] text-crema transition-colors hover:border-amarillo hover:text-amarillo"
          >
            <ChevronRight className="size-6" aria-hidden />
          </button>

          <figure
            className="flex max-h-full max-w-full flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <m.div style={{ x: reduceMotion ? arrastre : arrastreSuave }}>
            <AnimatePresence
              mode="wait"
              initial={false}
              custom={dir}
              onExitComplete={alSalirFoto}
            >
              <m.div
                key={active}
                custom={dir}
                variants={FOTO}
                initial="entra"
                animate="centro"
                exit="sale"
                transition={reduceMotion ? instantaneo : undefined}
              >
                {foto.video ? (
                  <video
                    key={foto.video}
                    src={foto.video}
                    poster={viewerSrc(foto.image)}
                    aria-label={foto.alt}
                    autoPlay={!reduceMotion}
                    loop={!reduceMotion}
                    muted
                    playsInline
                    controls={!!reduceMotion}
                    className="max-h-[80vh] max-w-[92vw] rounded-lg bg-black"
                  />
                ) : (
                  <div
                    onClick={() => setZoom((z) => !z)}
                    onPointerMove={onMove}
                    onMouseLeave={alSalirMouse}
                    style={{ cursor: zoom ? "zoom-out" : "zoom-in" }}
                    className="overflow-hidden rounded-lg"
                  >
                    <m.img
                      src={viewerSrc(foto.image)}
                      alt={foto.alt}
                      draggable={false}
                      animate={{ scale: zoom ? 2 : 1 }}
                      transition={reduceMotion ? instantaneo : RESORTE.panel}
                      style={{ transformOrigin }}
                      className="max-h-[80vh] max-w-[92vw] select-none object-contain"
                    />
                  </div>
                )}
              </m.div>
            </AnimatePresence>
            </m.div>
            <figcaption className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-crema-dim">
              <span className="text-crema">{foto.caption}</span>
              <span aria-hidden>·</span>
              <span>
                {(active ?? 0) + 1} / {fotos.length}
              </span>
            </figcaption>
          </figure>
        </m.div>
      ) : null}
    </AnimatePresence>
  );

  // Solo se monta en el cliente (después de un pedido): el portal nunca se
  // intenta en el render del servidor.
  return createPortal(capas, document.body);
}
