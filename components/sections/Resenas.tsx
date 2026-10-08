"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { Section } from "@/components/ui/Section";
import { Kicker } from "@/components/ui/Kicker";
import { Pill } from "@/components/ui/Pill";
import { Reveal } from "@/components/ui/Reveal";
import { Estrellas } from "@/components/ui/Estrellas";
import { resenas, isPlaceholder } from "@/content/data";

/**
 * Reseñas: carrusel "filmstrip" que se desliza horizontalmente con un espacio
 * entre tarjetas. Auto-avanza ~5.2s y se arrastra con el dedo/mouse (snap al
 * soltar). Loop infinito sin costura vía clones del primero/último.
 *
 * Altura estable sin JS: la tira es un flex con `items-stretch`, así TODAS las
 * placas toman la altura de la reseña más larga (puro CSS). El marco queda quieto
 * al navegar -> no empuja ni salta el contenido de abajo. Dentro de cada placa la
 * cita va arriba y el autor abajo (mt-auto), de modo que una reseña corta llena
 * la placa de forma prolija (nunca se ve un card vacío). Fail-open: sin JS queda
 * la primera; con reduced-motion no auto-avanza (navegable por puntitos/arrastre).
 */
export function Resenas() {
  const reduce = useReducedMotion();
  const items = resenas.items;
  const n = items.length;
  const loop = n > 1;
  const showProfile = !isPlaceholder(resenas.profileUrl);

  const slides = loop ? [items[n - 1], ...items, items[0]] : items;
  const [p, setP] = useState(loop ? 1 : 0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [noAnim, setNoAnim] = useState(false);
  const [paused, setPaused] = useState(false);

  const track = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef(0);
  const axis = useRef<null | "h" | "v">(null);
  const lastDx = useRef(0);

  const real = loop ? (((p - 1) % n) + n) % n : 0;

  // Mover ±1 con clamp: p JAMÁS sale del rango de slides [0, n+1]. Aunque el
  // auto-avance o un arrastre pisen el salto del clon antes del reset, en el peor
  // caso queda sobre un clon (que TIENE contenido) y nunca en un hueco vacío.
  const step = useCallback(
    (dir: 1 | -1) => setP((x) => Math.max(0, Math.min(n + 1, x + dir))),
    [n],
  );

  // Auto-avance (pausado al tocar/hoverear).
  useEffect(() => {
    if (reduce || paused || dragging || !loop) return;
    const t = setInterval(() => step(1), 5200);
    return () => clearInterval(t);
  }, [reduce, paused, dragging, loop, step]);

  // Salto sin costura del clon a la reseña real equivalente. Idempotente: si p ya
  // está en rango real no toca nada (no dispara side-effects dentro del updater).
  const snapFromClone = useCallback(() => {
    if (p === n + 1) {
      setNoAnim(true);
      setP(1);
    } else if (p === 0) {
      setNoAnim(true);
      setP(n);
    }
  }, [p, n]);

  // Al terminar el desliz sobre un clon, saltar. Con respaldo por timeout: si el
  // transitionEnd no dispara (transición interrumpida o sin cambio de transform),
  // el salto igual ocurre ~560ms después -> nunca queda "pegado" en un clon.
  const onEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== "transform") return;
    snapFromClone();
  };
  useEffect(() => {
    if (!loop || (p !== 0 && p !== n + 1)) return;
    const t = setTimeout(snapFromClone, 560);
    return () => clearTimeout(t);
  }, [p, loop, n, snapFromClone]);
  useEffect(() => {
    if (!noAnim) return;
    const t = setTimeout(() => setNoAnim(false), 20);
    return () => clearTimeout(t);
  }, [noAnim]);

  // Gestos de puntero con detección de eje: NO capturamos el puntero en el
  // pointerdown. Eso rompía el scroll vertical nativo en mobile (la página
  // quedaba "trabada" y saltaba). Recién cuando el movimiento es claramente
  // HORIZONTAL tomamos el control y arrastramos la tira; si es vertical, lo
  // dejamos pasar y la página scrollea normal (touch-action: pan-y se encarga).
  const onDown = (e: React.PointerEvent) => {
    if (!loop) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    lastDx.current = 0;
    axis.current = null;
    setPaused(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (axis.current == null) {
      // Umbral chico antes de decidir el eje: evita robar el scroll vertical.
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        axis.current = "v"; // gesto vertical: no interferir con el scroll
        return;
      }
      axis.current = "h";
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (axis.current !== "h") return;
    lastDx.current = dx;
    setDrag(dx);
  };
  const onUp = () => {
    if (startX.current == null) return;
    if (axis.current === "h") {
      const w = viewport.current?.offsetWidth ?? 320;
      const threshold = Math.max(44, w * 0.15);
      const dx = lastDx.current;
      if (dx <= -threshold) step(1);
      else if (dx >= threshold) step(-1);
    }
    startX.current = null;
    axis.current = null;
    lastDx.current = 0;
    setDrag(0);
    setDragging(false);
    setPaused(false);
  };

  const transition =
    dragging || noAnim
      ? "none"
      : "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";

  return (
    <Section id="resenas" flush>
      <Reveal>
        <h2 className="sr-only">Reseñas de clientes</h2>
        <Kicker>{resenas.kicker}</Kicker>
        <div className="mb-9 mt-4 flex flex-wrap items-center justify-between gap-6">
          <div
            className="flex items-center gap-4"
            role="img"
            aria-label={`Calificación ${resenas.rating.toFixed(1)} de 5 estrellas`}
          >
            <b className="font-display text-[4rem] font-medium leading-none text-crema">
              {resenas.rating.toFixed(1)}
            </b>
            <div className="text-[22px] tracking-[4px] text-amarillo" aria-hidden>
              <Estrellas count={resenas.stars} />
            </div>
          </div>
          {showProfile ? (
            <Pill
              variant="fantasma"
              href={resenas.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {resenas.profileCta}
            </Pill>
          ) : null}
        </div>
      </Reveal>

      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Viewport: recorta. Su alto lo fija el flex de abajo (la reseña más
            larga), constante al navegar -> no hay salto del contenido. */}
        <div
          ref={viewport}
          className="select-none overflow-hidden"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{
            touchAction: "pan-y",
            cursor: loop ? (dragging ? "grabbing" : "grab") : "default",
          }}
        >
          {/* items-stretch: todas las placas igualan la altura de la más alta. */}
          <div
            ref={track}
            className="flex items-stretch"
            onTransitionEnd={onEnd}
            style={{
              transform: `translate3d(calc(${-p * 100}% + ${drag}px), 0, 0)`,
              transition,
            }}
          >
            {slides.map((rev, idx) => (
              <div
                key={idx}
                aria-hidden={loop && idx !== p ? true : undefined}
                className="w-full shrink-0 px-[7px]"
              >
                <figure className="flex h-full min-h-[120px] flex-col gap-5 rounded-xl border border-hairline bg-surface p-6 min-[760px]:p-8">
                  <blockquote className="text-[16.5px] leading-[1.58] text-crema min-[760px]:text-[19px]">
                    <span className="mr-1 font-display text-amarillo">“</span>
                    {rev.quote}
                  </blockquote>
                  <figcaption className="mt-auto flex flex-col gap-1.5 border-t border-hairline pt-[14px] min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-[10px]">
                    <b className="text-[15px] font-bold text-crema">
                      {rev.author}
                    </b>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-crema-dim">
                      {rev.servicio}
                    </span>
                  </figcaption>
                </figure>
              </div>
            ))}
          </div>
        </div>

        {/* Puntitos: indican y permiten navegar a mano. */}
        <div className="mt-6 flex justify-center gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Ver reseña ${idx + 1} de ${n}`}
              aria-current={idx === real}
              onClick={() => setP(idx + 1)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                idx === real
                  ? "w-6 bg-amarillo"
                  : "w-2 bg-crema-dim/40 hover:bg-crema-dim/70",
              )}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}
