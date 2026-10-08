import { cn } from "@/lib/cn";

type PillVariant = "primaria" | "fantasma";
type PillSize = "md" | "sm";

const base =
  "inline-block cursor-pointer rounded-full text-center font-medium transition-[transform,filter,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]";

const sizes: Record<PillSize, string> = {
  // CTA principal: compacta en mobile, completa desde sm.
  md: "px-5 py-3 text-[14px] sm:px-7 sm:py-[14px] sm:text-[15px]",
  // Compacta siempre (nav).
  sm: "px-5 py-[10px] text-[14px]",
};

const variants: Record<PillVariant, string> = {
  primaria:
    "relative isolate overflow-hidden bg-amarillo text-[#241C15] before:pointer-events-none before:absolute before:inset-0 before:-translate-x-[130%] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent before:transition-transform before:duration-[700ms] before:ease-[cubic-bezier(0.16,1,0.3,1)] before:content-[''] hover:-translate-y-0.5 hover:brightness-[1.06] hover:before:translate-x-[130%] active:translate-y-0",
  fantasma:
    "border border-hairline bg-transparent text-crema hover:-translate-y-0.5 hover:border-crema-dim active:translate-y-0",
};

interface PillProps {
  variant?: PillVariant;
  size?: PillSize;
  href?: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLElement>;
  "aria-label"?: string;
}

/**
 * CTA en formato pill. Con `href` renderiza <a>; sin `href`, <button>.
 * `primaria` = amarilla (CTA principal); `fantasma` = borde hairline.
 */
export function Pill({
  variant = "primaria",
  size = "md",
  href,
  children,
  className,
  target,
  rel,
  type = "button",
  onClick,
  "aria-label": ariaLabel,
}: PillProps) {
  const classes = cn(base, sizes[size], variants[variant], className);
  // Blinda pestañas nuevas: si un caller abre _blank sin pasar rel, igual sale
  // noopener noreferrer (evita reverse-tabnabbing y fuga de referrer).
  const relFinal =
    rel ?? (target === "_blank" ? "noopener noreferrer" : undefined);

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={relFinal}
        onClick={onClick}
        aria-label={ariaLabel}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      className={classes}
    >
      {children}
    </button>
  );
}
