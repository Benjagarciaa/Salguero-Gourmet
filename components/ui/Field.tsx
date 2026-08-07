import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded border border-hairline bg-surface px-[14px] py-[13px] text-[15px] text-crema placeholder:text-crema-dim";

/** Envoltorio label + control (el `.campo` del mockup). El label envuelve al control. */
function Campo({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("mb-[18px] flex flex-col gap-[7px]", className)}>
      <span className="text-[13.5px] font-medium text-crema">
        {label} {required ? <i className="not-italic text-amarillo">*</i> : null}
      </span>
      {children}
    </label>
  );
}

type FieldProps = {
  label: string;
  required?: boolean;
  fieldClassName?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "required">;

export function Field({
  label,
  required,
  fieldClassName,
  className,
  ...props
}: FieldProps) {
  return (
    <Campo label={label} required={required} className={fieldClassName}>
      <input
        required={required}
        className={cn(control, className)}
        {...props}
      />
    </Campo>
  );
}

type TextAreaProps = {
  label: string;
  required?: boolean;
  fieldClassName?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "required">;

export function TextArea({
  label,
  required,
  fieldClassName,
  className,
  ...props
}: TextAreaProps) {
  return (
    <Campo label={label} required={required} className={fieldClassName}>
      <textarea
        required={required}
        className={cn(control, "min-h-[110px] resize-y", className)}
        {...props}
      />
    </Campo>
  );
}

type SelectProps = {
  label: string;
  required?: boolean;
  options: readonly string[];
  fieldClassName?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "required">;

export function Select({
  label,
  required,
  options,
  fieldClassName,
  className,
  ...props
}: SelectProps) {
  return (
    <Campo label={label} required={required} className={fieldClassName}>
      <select
        required={required}
        className={cn(control, className)}
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
