import { cn } from "@/lib/cn";

type PillVariant = "primaria" | "fantasma";

const base =
  "inline-block cursor-pointer rounded-full px-5 py-3 text-center text-[14px] font-medium transition-[transform,filter] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-7 sm:py-[14px] sm:text-[15px]";

const variants: Record<PillVariant, string> = {
  primaria:
    "bg-amarillo text-[#241C15] hover:-translate-y-0.5 hover:brightness-[1.06] active:translate-y-0",
  fantasma: "border border-hairline bg-transparent text-crema hover:border-crema-dim",
};

interface PillProps {
  variant?: PillVariant;
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
  href,
  children,
  className,
  target,
  rel,
  type = "button",
  onClick,
  "aria-label": ariaLabel,
}: PillProps) {
  const classes = cn(base, variants[variant], className);

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
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
