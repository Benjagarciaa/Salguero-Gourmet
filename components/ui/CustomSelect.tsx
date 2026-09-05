"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const control =
  "flex w-full items-center justify-between gap-2 rounded border border-hairline bg-surface px-[14px] py-[13px] text-left text-[15px] text-crema transition-[border-color,box-shadow] duration-200";

/**
 * Dropdown propio, accesible (patrón combobox + listbox de ARIA APG).
 * Reemplaza al <select> nativo para poder estilar la lista con la paleta de la
 * marca (highlight amarillo) en vez del popup del sistema operativo.
 * Teclado: flechas, Home/End, Enter/Espacio, Escape, y typeahead.
 */
export function CustomSelect({
  label,
  required,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  name: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const labelId = `${name}-label`;
  const listId = `${name}-listbox`;
  const optId = (i: number) => `${name}-opt-${i}`;

  // Al abrir, el ítem activo arranca en el seleccionado.
  useEffect(() => {
    if (open) setActiveIndex(Math.max(0, options.indexOf(value)));
  }, [open, value, options]);

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

  // Scroll del ítem activo a la vista.
  useEffect(() => {
    if (open && listRef.current) {
      (listRef.current.children[activeIndex] as HTMLElement | undefined)?.scrollIntoView(
        { block: "nearest" },
      );
    }
  }, [activeIndex, open]);

  const choose = (i: number) => {
    onChange(options[i]);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        else setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) setOpen(true);
        else setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setActiveIndex(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setActiveIndex(options.length - 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) choose(activeIndex);
        else setOpen(true);
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const idx = options.findIndex((o) =>
            o.toLowerCase().startsWith(e.key.toLowerCase()),
          );
          if (idx >= 0) {
            setOpen(true);
            setActiveIndex(idx);
          }
        }
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
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={labelId}
          aria-activedescendant={open ? optId(activeIndex) : undefined}
          data-servicio-trigger
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onKeyDown}
          className={control}
        >
          <span className="truncate">{value}</span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-[18px] shrink-0 text-crema-dim transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
        {open ? (
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            ref={listRef}
            className="absolute left-0 top-[calc(100%+6px)] z-20 max-h-[260px] w-full origin-top animate-[dd-in_180ms_cubic-bezier(0.16,1,0.3,1)] overflow-auto rounded border border-hairline bg-surface py-1 shadow-[0_14px_30px_rgba(0,0,0,0.45)]"
          >
            {options.map((opt, i) => {
              const selected = opt === value;
              const active = i === activeIndex;
              return (
                <li
                  key={opt}
                  id={optId(i)}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(i)}
                  className={cn(
                    "cursor-pointer px-[14px] py-2.5 text-[15px]",
                    active
                      ? "bg-amarillo text-[#241C15]"
                      : selected
                        ? "text-amarillo"
                        : "text-crema",
                  )}
                >
                  {opt}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
