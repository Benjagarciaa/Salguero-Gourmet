import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded border border-hairline bg-surface px-[14px] py-[13px] text-[15px] text-crema placeholder:text-crema-dim";
const errorRing = "ring-1 ring-amarillo";

/** Envoltorio label + control + error (el `.campo` del mockup). */
function Campo({
  label,
  required,
  error,
  errorId,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  errorId?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("mb-[18px] flex flex-col gap-[7px]", className)}>
      <span className="text-[13.5px] font-medium text-crema">
        {label} {required ? <i className="not-italic text-amarillo">*</i> : null}
      </span>
      {children}
      {error ? (
        <span id={errorId} className="text-[12.5px] text-amarillo">
          {error}
        </span>
      ) : null}
    </label>
  );
}

const errId = (name?: string) => (name ? `${name}-error` : undefined);

type FieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  fieldClassName?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "required">;

export function Field({
  label,
  required,
  error,
  fieldClassName,
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
      className={fieldClassName}
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
  fieldClassName?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "required">;

export function TextArea({
  label,
  required,
  error,
  fieldClassName,
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
      className={fieldClassName}
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

type SelectProps = {
  label: string;
  required?: boolean;
  error?: string;
  options: readonly string[];
  fieldClassName?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "required">;

export function Select({
  label,
  required,
  error,
  options,
  fieldClassName,
  className,
  name,
  ...props
}: SelectProps) {
  const id = errId(name);
  return (
    <Campo
      label={label}
      required={required}
      error={error}
      errorId={id}
      className={fieldClassName}
    >
      <select
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? id : undefined}
        className={cn(control, error && errorRing, className)}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </Campo>
  );
}
