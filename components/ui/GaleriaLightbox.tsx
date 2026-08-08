"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ZoomIn, Play } from "lucide-react";
import { InstagramIcon } from "@/components/ui/InstagramIcon";
import { contacto, type GaleriaFoto } from "@/content/data";

/**
 * URL del visor ruteada por el optimizador de Next (avif/webp, resize a 1200px de
 * ancho: suficiente para el visor + zoom, mucho mas liviana que el JPG crudo).
 * w=1200 esta en los deviceSizes por defecto y q=75 es la calidad permitida por
 * defecto (Next 16 rechaza con 400 los `q` fuera de la allowlist).
 */
const viewerSrc = (src: string) =>
  `/_next/image?url=${encodeURIComponent(src)}&w=1200&q=75`;

/**
 * Galería completa en lightbox. Un botón "Ver galería completa" abre un modal con
 * una grilla de todas las fotos curadas; al tocar una se abre un visor fullscreen
 * con zoom (click para acercar, mouse para desplazar el encuadre) y navegación.
 *
 * El visor es una CAPA HERMANA opaca (no un hijo del overlay de la grilla): el
 * overlay usa backdrop-filter, que crea un bloque contenedor y volvería "fixed"
 * al visor relativo al overlay scrolleable (haciéndolo desplazarse al scrollear).
 * Como hermano fixed y opaco, el visor queda anclado al viewport y tapa la grilla.
 *
 * Accesible: role=dialog + aria-modal, teclado (Escape/flechas), foco atrapado
 * dentro de la capa activa y devuelto al disparador, y bloqueo del scroll de fondo
 * (incluido Lenis via data-lenis-prevent). Con reduced-motion el reset global deja
 * el zoom instantáneo.
 */
export function GaleriaLightbox({
  fotos,
  label = "Ver galería completa",
}: {
  fotos: GaleriaFoto[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("center center");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const close = useCallback(() => {
    setOpen(false);
    setActive(null);
  }, []);
  const showPrev = useCallback(
    () =>
      setActive((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length)),
    [fotos.length],
  );
  const showNext = useCallback(
    () => setActive((i) => (i === null ? i : (i + 1) % fotos.length)),
    [fotos.length],
  );

  // Reiniciar el zoom al cambiar de foto o cerrar el visor.
  useEffect(() => {
    setZoom(false);
    setOrigin("center center");
  }, [active]);

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
        if (active !== null) setActive(null);
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
  }, [open, active, close, showPrev, showNext]);

  // Bloquear el scroll del fondo; devolver el foco al disparador al cerrar.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      triggerRef.current?.focus();
    };
  }, [open]);

  // Enfocar la capa activa (grilla o visor) cuando cambia.
  useEffect(() => {
    if (!open) return;
    if (active !== null) viewerRef.current?.focus();
    else gridRef.current?.focus();
  }, [open, active]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoom) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  const foto = active !== null ? fotos[active] : null;
  const videoCount = fotos.filter((f) => f.video).length;
  const photoCount = fotos.length - videoCount;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-hairline px-5 py-[10px] text-[14px] font-medium text-crema transition-colors hover:border-amarillo hover:text-amarillo"
      >
        <ZoomIn className="size-4" aria-hidden />
        {label}
      </button>

      {open ? (
        <>
          {/* Capa 1: grilla scrolleable */}
          <div
            ref={gridRef}
            role="dialog"
            aria-modal="true"
            aria-label="Galería completa"
            tabIndex={-1}
            inert={active !== null}
            data-lenis-prevent
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
                  className="grid size-9 place-items-center rounded-full border border-hairline text-crema transition-colors hover:border-amarillo hover:text-amarillo"
                >
                  <X className="size-[18px]" aria-hidden />
                </button>
              </div>
            </div>

            <div className="mx-auto grid max-w-[1160px] grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:gap-3 sm:p-5 min-[900px]:grid-cols-4">
              {fotos.map((f, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`${f.video ? "Reproducir" : "Ampliar"}: ${f.caption}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-hairline"
                >
                  <Image
                    src={f.image}
                    alt={f.alt}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 900px) 33vw, 280px"
                    className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                  {f.video ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 grid place-items-center"
                    >
                      <span className="grid size-11 place-items-center rounded-full bg-[rgba(18,13,9,0.55)] ring-1 ring-[rgba(245,238,224,0.6)] backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
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
            </div>

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
          </div>

          {/* Capa 2: visor de una foto (hermano opaco, anclado al viewport) */}
          {foto ? (
            <div
              ref={viewerRef}
              role="dialog"
              aria-modal="true"
              aria-label={foto.caption}
              tabIndex={-1}
              data-lenis-prevent
              onClick={() => setActive(null)}
              className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0e0a07] p-4 outline-none"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive(null);
                }}
                aria-label="Cerrar"
                className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full border border-hairline text-crema transition-colors hover:border-amarillo hover:text-amarillo"
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
                    onMouseMove={onMove}
                    onMouseLeave={() => setOrigin("center center")}
                    style={{ cursor: zoom ? "zoom-out" : "zoom-in" }}
                    className="overflow-hidden rounded-lg"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewerSrc(foto.image)}
                      alt={foto.alt}
                      draggable={false}
                      style={{
                        transform: zoom ? "scale(2)" : "scale(1)",
                        transformOrigin: origin,
                      }}
                      className="max-h-[80vh] max-w-[92vw] select-none object-contain transition-transform duration-300 ease-out"
                    />
                  </div>
                )}
                <figcaption className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-crema-dim">
                  <span className="text-crema">{foto.caption}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {active! + 1} / {fotos.length}
                  </span>
                </figcaption>
              </figure>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
