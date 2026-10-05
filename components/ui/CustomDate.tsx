"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { OPACIDAD, RESORTE, SALIDA } from "@/lib/fisica";

const WEEKDAYS = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function fromISO(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
const formatDisplay = (s: string) => {
  const d = fromISO(s);
  return d
    ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
    : "";
};
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
};
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
// Desplaza `delta` meses conservando el dia (clamp al ultimo dia del mes destino,
// asi el 31 no se desborda a otro mes).
const shiftMonth = (d: Date, delta: number) => {
  const target = new Date(d.getFullYear(), d.getMonth() + delta, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  return new Date(
    target.getFullYear(),
    target.getMonth(),
    Math.min(d.getDate(), lastDay),
  );
};

const control =
  "flex w-full items-center justify-between gap-2 rounded border border-hairline bg-surface px-[14px] py-[13px] text-left text-[16px] min-[1024px]:text-[15px] transition-[border-color,box-shadow] duration-200";

/** Cambio de mes: la grilla nueva entra 12px desde el lado hacia el que se va. */
const MES = {
  entra: (d: number) => ({ opacity: 0, x: 12 * d }),
  centro: {
    opacity: 1,
    x: 0,
    transition: { x: RESORTE.panel, opacity: OPACIDAD },
  },
  sale: (d: number) => ({ opacity: 0, x: -12 * d, transition: SALIDA }),
};

/**
 * Date picker propio (dark + ámbar), reemplaza al <input type=date> nativo cuyo
 * calendario es del sistema operativo (claro) y no se puede estilar. Mantiene el
 * value en ISO (YYYY-MM-DD) para lib/wa y la validación. Accesible por teclado:
 * flechas para navegar días, PageUp/Down para meses, Enter para elegir, Escape
 * para cerrar. El mes se muestra localizado en español.
 *
 * Movimiento (lib/fisica.ts): el calendario abre con el resorte `panel` y
 * cierra con una salida corta; al cambiar de mes la grilla sale hacia un lado
 * y la nueva entra desde el otro (12px, según la dirección). Con reducir
 * movimiento todo es instantáneo.
 */
export function CustomDate({
  label,
  required,
  name,
  value = "",
  onChange,
  placeholder = "dd/mm/aaaa",
  ayuda,
}: {
  label: string;
  required?: boolean;
  name: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Línea de ayuda debajo del campo (siempre visible; el trigger la anuncia). */
  ayuda?: string;
}) {
  const selected = fromISO(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = selected ?? new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [active, setActive] = useState<Date>(
    () => selected ?? startOfDay(new Date()),
  );
  // Dirección del último cambio de mes (-1 atrás, 1 adelante): de qué lado
  // entra la grilla nueva.
  const [dir, setDir] = useState(0);
  const reducir = useReducedMotion();
  // El día activo más reciente para el teclado: mientras la grilla del mes
  // anterior sale, sus handlers son los de ese render.
  const activoRef = useRef(active);
  useLayoutEffect(() => {
    activoRef.current = active;
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Intención de mover el foco al día activo: true al abrir y al navegar con
  // teclado (el foco sigue al día); false cuando el mes cambia por clic en las
  // flechas (así el foco no salta del botón de flecha a una celda del grid).
  const moveFocus = useRef(true);

  const labelId = `${name}-label`;
  const ayudaId = `${name}-ayuda`;

  // Al abrir: sincronizar vista y día activo con lo seleccionado (o hoy). Se
  // ajusta durante el render (no en un efecto, que renderiza en cascada); el
  // foco al día activo lo pide `toggleOpen` (moveFocus) y lo hace el efecto de abajo.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      const base = fromISO(value) ?? startOfDay(new Date());
      setView({ year: base.getFullYear(), month: base.getMonth() });
      setActive(base);
    }
  }
  // Abrir o cerrar desde el trigger. Al abrir, el foco entra al día activo.
  const toggleOpen = (next: boolean) => {
    if (next) moveFocus.current = true;
    setOpen(next);
  };

  // Cerrar al clickear afuera.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const claveMes = `${view.year}-${view.month}`;

  // Enfocar el día activo cuando cambia (con el calendario abierto). Solo si la
  // intención es mover el foco (apertura o teclado): al cambiar de mes con clic en
  // las flechas, moveFocus queda en false y el foco se conserva en el botón.
  // Si cambió el mes, la grilla nueva entra recién cuando sale la anterior: se
  // espera a que esté (data-mes) para no enfocar una celda que se va.
  useEffect(() => {
    if (!open || !moveFocus.current) return;
    let raf = 0;
    let intentos = 0;
    const enfocar = () => {
      const grilla = gridRef.current;
      if (grilla && grilla.dataset.mes === claveMes) {
        grilla
          .querySelector<HTMLElement>(`[data-iso="${toISO(active)}"]`)
          ?.focus();
        return;
      }
      if (++intentos < 90) raf = requestAnimationFrame(enfocar);
    };
    enfocar();
    return () => cancelAnimationFrame(raf);
  }, [active, open, claveMes]);

  const today = startOfDay(new Date());
  const first = new Date(view.year, view.month, 1);
  const gridStart = addDays(first, -first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const choose = (d: Date) => {
    // Un evento no puede ser en una fecha que ya pasó.
    if (d < today) return;
    onChange(toISO(d));
    setOpen(false);
    triggerRef.current?.focus();
  };
  const moveMonth = (delta: number) => {
    moveFocus.current = false; // clic en la flecha: no robar el foco al grid
    setDir(Math.sign(delta));
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    // Reubicar el dia activo dentro del nuevo mes: siempre queda una celda con
    // tabIndex 0, asi el grid sigue alcanzable por teclado.
    setActive((a) => shiftMonth(a, delta));
  };

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    let next: Date | null = null;
    const active = activoRef.current;
    switch (e.key) {
      case "ArrowLeft":
        next = addDays(active, -1);
        break;
      case "ArrowRight":
        next = addDays(active, 1);
        break;
      case "ArrowUp":
        next = addDays(active, -7);
        break;
      case "ArrowDown":
        next = addDays(active, 7);
        break;
      case "Home":
        next = addDays(active, -active.getDay());
        break;
      case "End":
        next = addDays(active, 6 - active.getDay());
        break;
      case "PageUp":
        next = shiftMonth(active, -1);
        break;
      case "PageDown":
        next = shiftMonth(active, 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        return;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      default:
        return;
    }
    if (next) {
      e.preventDefault();
      moveFocus.current = true; // navegación por teclado: el foco sigue al día
      if (
        next.getMonth() !== active.getMonth() ||
        next.getFullYear() !== active.getFullYear()
      ) {
        setDir(next > active ? 1 : -1);
      }
      activoRef.current = next;
      setActive(next);
      setView({ year: next.getFullYear(), month: next.getMonth() });
    }
  };

  return (
    <div className="mb-[18px] flex flex-col gap-[7px]" ref={rootRef}>
      <span id={labelId} className="text-[13.5px] font-medium text-crema">
        {label}{" "}
        {required ? <i className="not-italic text-amarillo">*</i> : null}
      </span>
      <div className="relative">
        <button
          type="button"
          ref={triggerRef}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={labelId}
          aria-describedby={ayuda ? ayudaId : undefined}
          onClick={() => toggleOpen(!open)}
          onKeyDown={(e) => {
            if (
              !open &&
              (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
            ) {
              e.preventDefault();
              toggleOpen(true);
            }
          }}
          className={cn(control, selected ? "text-crema" : "text-crema-dim")}
        >
          <span>{selected ? formatDisplay(value) : placeholder}</span>
          <CalendarIcon
            className="size-[18px] shrink-0 text-crema-dim"
            aria-hidden
          />
        </button>

        <AnimatePresence>
          {open ? (
            <m.div
              key="calendario"
              role="dialog"
              aria-label={label}
              initial={{ opacity: 0, y: -4, scaleY: 0.98 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{
                opacity: 0,
                y: -4,
                transition: reducir ? { duration: 0 } : SALIDA,
              }}
              transition={
                reducir
                  ? { duration: 0 }
                  : {
                      y: RESORTE.panel,
                      scaleY: RESORTE.panel,
                      opacity: OPACIDAD,
                    }
              }
              className="absolute left-0 top-[calc(100%+6px)] z-30 w-[288px] origin-top rounded-lg border border-hairline bg-surface p-3 shadow-[0_14px_30px_rgba(0,0,0,0.45)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Mes anterior"
                  onClick={() => moveMonth(-1)}
                  className="grid size-8 place-items-center rounded text-crema-dim transition-colors hover:bg-amarillo hover:text-[#241C15]"
                >
                  <ChevronLeft className="size-[18px]" aria-hidden />
                </button>
                <span
                  aria-live="polite"
                  className="text-[14px] font-medium capitalize text-crema"
                >
                  {MONTHS[view.month]} {view.year}
                </span>
                <button
                  type="button"
                  aria-label="Mes siguiente"
                  onClick={() => moveMonth(1)}
                  className="grid size-8 place-items-center rounded text-crema-dim transition-colors hover:bg-amarillo hover:text-[#241C15]"
                >
                  <ChevronRight className="size-[18px]" aria-hidden />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {WEEKDAYS.map((w) => (
                  <span
                    key={w}
                    className="grid h-8 place-items-center font-mono text-[10px] uppercase tracking-[0.04em] text-crema-dim"
                  >
                    {w}
                  </span>
                ))}
              </div>

              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <m.div
                  key={claveMes}
                  ref={gridRef}
                  role="grid"
                  aria-label={label}
                  data-mes={claveMes}
                  onKeyDown={onGridKeyDown}
                  custom={dir}
                  variants={MES}
                  initial="entra"
                  animate="centro"
                  exit="sale"
                  transition={reducir ? { duration: 0 } : undefined}
                  className="grid grid-cols-7 gap-0.5"
                >
                  {cells.map((d) => {
                    const inMonth = d.getMonth() === view.month;
                    const isToday = sameDay(d, today);
                    const isSelected = selected ? sameDay(d, selected) : false;
                    const isActive = sameDay(d, active);
                    // Días pasados: se ven apagados y no se pueden elegir. Siguen
                    // siendo enfocables (aria-disabled) para no cortar el teclado.
                    const pasado = d < today;
                    return (
                      <button
                        key={toISO(d)}
                        type="button"
                        role="gridcell"
                        data-iso={toISO(d)}
                        tabIndex={isActive ? 0 : -1}
                        aria-selected={isSelected}
                        aria-disabled={pasado || undefined}
                        aria-label={`${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`}
                        onClick={() => choose(d)}
                        className={cn(
                          "grid h-9 place-items-center rounded text-[13.5px] transition-colors",
                          pasado
                            ? "cursor-not-allowed text-crema-dim/35"
                            : isSelected
                              ? "bg-amarillo font-bold text-[#241C15]"
                              : inMonth
                                ? "text-crema hover:bg-amarillo/20"
                                : "text-crema-dim hover:bg-amarillo/20",
                          isToday &&
                            !isSelected &&
                            "ring-1 ring-inset ring-amarillo/60",
                        )}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </m.div>
              </AnimatePresence>

              <div className="mt-2 flex items-center justify-between border-t border-hairline pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="rounded px-1 text-[13px] text-crema-dim transition-colors hover:text-amarillo"
                >
                  Borrar
                </button>
                <button
                  type="button"
                  onClick={() => choose(today)}
                  className="rounded px-1 text-[13px] font-medium text-amarillo transition-colors hover:underline"
                >
                  Hoy
                </button>
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
      {ayuda ? (
        <span
          id={ayudaId}
          className="text-[12.5px] leading-[1.45] text-crema-dim"
        >
          {ayuda}
        </span>
      ) : null}
    </div>
  );
}
