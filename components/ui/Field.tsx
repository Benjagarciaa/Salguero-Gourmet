"use client";

import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { AnimatePresence, m, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { OPACIDAD, RESORTE, SALIDA } from "@/lib/fisica";
import { ScrollTrigger } from "@/lib/gsap";

const control =
  "w-full rounded border border-hairline bg-surface px-[14px] py-[13px] text-[16px] min-[1024px]:text-[15px] text-crema placeholder:text-crema-dim transition-[border-color,box-shadow] duration-200";
const errorRing = "ring-1 ring-amarillo";

/** Hueco (px) del flex del campo: el error lo absorbe mientras abre o cierra. */
const HUECO = 7;

/**
 * Abrir o cerrar un error cambia el alto de la página: cuando termina, un
 * refresh de ScrollTrigger (agrupado: un envío vacío abre tres a la vez) para
 * que los triggers de más abajo (el parallax del pie) no queden con las
 * posiciones viejas. refresh(true) es el seguro: si el usuario está
 * scrolleando, GSAP lo posterga al final del scroll (como en el FAQ).
 */
let esperaRefresh = 0;
function refrescarScroll() {
  window.clearTimeout(esperaRefresh);
  esperaRefresh = window.setTimeout(() => ScrollTrigger.refresh(true), 0);
}

/**
 * Envoltorio label + control + error (el `.campo` del mockup).
 *
 * El error abre y cierra su lugar (alto y posición con el resorte `panel`,
 * opacidad aparte): el formulario se acomoda sin saltos. Con reducir
 * movimiento aparece y desaparece en el acto. Conserva el id al que apunta el
 * aria-describedby del control.
 */
function Campo({
  label,
  required,
  error,
  errorId,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  errorId?: string;
  children: React.ReactNode;
}) {
  const reducir = useReducedMotion();
  const entra = reducir
    ? { duration: 0 }
    : {
        height: RESORTE.panel,
        y: RESORTE.panel,
        marginTop: RESORTE.panel,
        opacity: OPACIDAD,
      };
  const sale = reducir
    ? { duration: 0 }
    : {
        height: RESORTE.panel,
        y: RESORTE.panel,
        marginTop: RESORTE.panel,
        opacity: SALIDA,
      };
  return (
    <label className="mb-[18px] flex flex-col gap-[7px]">
      <span className="text-[13.5px] font-medium text-crema">
        {label} {required ? <i className="not-italic text-amarillo">*</i> : null}
      </span>
      {children}
      <AnimatePresence initial={false} onExitComplete={refrescarScroll}>
        {error ? (
          <m.span
            key="error"
            id={errorId}
            className="block overflow-hidden text-[12.5px] text-amarillo"
            initial={{ height: 0, opacity: 0, y: -4, marginTop: -HUECO }}
            animate={{ height: "auto", opacity: 1, y: 0, marginTop: 0 }}
            exit={{
              height: 0,
              opacity: 0,
              y: -4,
              marginTop: -HUECO,
              transition: sale,
            }}
            transition={entra}
            onAnimationComplete={refrescarScroll}
          >
            {error}
          </m.span>
        ) : null}
      </AnimatePresence>
    </label>
  );
}

const errId = (name?: string) => (name ? `${name}-error` : undefined);

type FieldProps = {
  label: string;
  required?: boolean;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "required">;

export function Field({
  label,
  required,
  error,
  className,
  name,
  ...props
}: FieldProps) {
  const id = errId(name);
  return (
    <Campo
      label={label}
      required={required}
      error={error}
      errorId={id}
    >
      <input
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? id : undefined}
        className={cn(control, error && errorRing, className)}
        {...props}
      />
    </Campo>
  );
}

type TextAreaProps = {
  label: string;
  required?: boolean;
  error?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "required">;

export function TextArea({
  label,
  required,
  error,
  className,
  name,
  ...props
}: TextAreaProps) {
  const id = errId(name);
  return (
    <Campo
      label={label}
      required={required}
      error={error}
      errorId={id}
    >
      <textarea
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? id : undefined}
        className={cn(control, "min-h-[110px] resize-y", error && errorRing, className)}
        {...props}
      />
    </Campo>
  );
}
