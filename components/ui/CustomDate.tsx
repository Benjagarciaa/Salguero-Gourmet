"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";

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
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : "";
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
  "flex w-full items-center justify-between gap-2 rounded border border-hairline bg-surface px-[14px] py-[13px] text-left text-[15px] transition-[border-color,box-shadow] duration-200";

/**
 * Date picker propio (dark + ámbar), reemplaza al <input type=date> nativo cuyo
 * calendario es del sistema operativo (claro) y no se puede estilar. Mantiene el
 * value en ISO (YYYY-MM-DD) para lib/wa y la validación. Accesible por teclado:
 * flechas para navegar días, PageUp/Down para meses, Enter para elegir, Escape
 * para cerrar. El mes se muestra localizado en español.
 */
export function CustomDate({
  label,
  required,
  name,
  value = "",
  onChange,
  placeholder = "dd/mm/aaaa",
}: {
  label: string;
  required?: boolean;
  name: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const labelId = `${name}-label`;

  // Al abrir: sincronizar vista y día activo con lo seleccionado (o hoy).
  useEffect(() => {
    if (!open) return;
    const base = fromISO(value) ?? startOfDay(new Date());
    setView({ year: base.getFullYear(), month: base.getMonth() });
    setActive(base);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Enfocar el día activo cuando cambia (con el calendario abierto).
  useEffect(() => {
    if (!open) return;
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-iso="${toISO(active)}"]`)
      ?.focus();
  }, [active, open]);

  const today = startOfDay(new Date());
  const first = new Date(view.year, view.month, 1);
  const gridStart = addDays(first, -first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const choose = (d: Date) => {
    onChange(toISO(d));
    setOpen(false);
    triggerRef.current?.focus();
  };
  const moveMonth = (delta: number) => {
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
      setActive(next);
      setView({ year: next.getFullYear(), month: next.getMonth() });
    }
  };

  return (
    <div className="mb-[18px] flex flex-col gap-[7px]" ref={rootRef}>
      <span id={labelId} className="text-[13.5px] font-medium text-crema">
        {label} {required ? <i className="not-italic text-amarillo">*</i> : null}
      </span>
      <div className="relative">
        <button
          type="button"
          ref={triggerRef}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={labelId}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (
              !open &&
              (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
            ) {
              e.preventDefault();
              setOpen(true);
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

        {open ? (
          <div
            role="dialog"
            aria-label={label}
            className="absolute left-0 top-[calc(100%+6px)] z-30 w-[288px] rounded-lg border border-hairline bg-surface p-3 shadow-[0_14px_30px_rgba(0,0,0,0.45)]"
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

            <div
              ref={gridRef}
              role="grid"
              aria-label={label}
              onKeyDown={onGridKeyDown}
              className="grid grid-cols-7 gap-0.5"
            >
              {cells.map((d) => {
                const inMonth = d.getMonth() === view.month;
                const isToday = sameDay(d, today);
                const isSelected = selected ? sameDay(d, selected) : false;
                const isActive = sameDay(d, active);
                return (
                  <button
                    key={toISO(d)}
                    type="button"
                    role="gridcell"
                    data-iso={toISO(d)}
                    tabIndex={isActive ? 0 : -1}
                    aria-selected={isSelected}
                    aria-label={`${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`}
                    onClick={() => choose(d)}
                    className={cn(
                      "grid h-9 place-items-center rounded text-[13.5px] transition-colors",
                      isSelected
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
            </div>

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
          </div>
        ) : null}
      </div>
    </div>
  );
}
