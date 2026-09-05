"use client";

import { useId } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

/**
 * Input numérico con flechas ▲▼ propias (dark + ámbar) en vez del spinner nativo
 * del sistema. Mantiene un <input type=number> real (con name) para el form, pero
 * oculta sus flechas nativas (.no-spin) y las reemplaza por botones themed.
 */
export function NumberStepper({
  label,
  name,
  value = "",
  onChange,
  min = 1,
  placeholder,
}: {
  label: string;
  name: string;
  value?: string;
  onChange: (value: string) => void;
  min?: number;
  placeholder?: string;
}) {
  const id = useId();
  const parsed = parseInt(value, 10);
  const current = Number.isNaN(parsed) ? null : parsed;
  const clamp = (n: number) => Math.max(min, n);
  const inc = () => onChange(String(clamp((current ?? min - 1) + 1)));
  const dec = () => onChange(String(clamp((current ?? min) - 1)));

  return (
    <div className="mb-[18px] flex flex-col gap-[7px]">
      <label htmlFor={id} className="text-[13.5px] font-medium text-crema">
        {label}
      </label>
      <div className="flex items-stretch overflow-hidden rounded border border-hairline bg-surface transition-[border-color,box-shadow] duration-200 focus-within:ring-1 focus-within:ring-amarillo">
        <input
          id={id}
          name={name}
          type="number"
          inputMode="numeric"
          min={min}
          placeholder={placeholder}
          value={value}
          onChange={(e) =>
            onChange(e.target.value.replace(/\D/g, "").replace(/^0+/, ""))
          }
          className="no-spin w-full bg-transparent px-[14px] py-[13px] text-[15px] text-crema outline-none placeholder:text-crema-dim"
        />
        <div className="flex w-10 shrink-0 flex-col border-l border-hairline">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Sumar uno"
            onClick={inc}
            className="grid flex-1 place-items-center text-crema-dim transition-colors hover:bg-amarillo hover:text-[#241C15]"
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Restar uno"
            onClick={dec}
            className="grid flex-1 place-items-center border-t border-hairline text-crema-dim transition-colors hover:bg-amarillo hover:text-[#241C15]"
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
