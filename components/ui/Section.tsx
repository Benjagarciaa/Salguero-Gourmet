import { cn } from "@/lib/cn";

/** Contenedor central: max-width 1160px + gutter 24px (el `.wrap` del mockup). */
export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1160px] px-6", className)}>
      {children}
    </div>
  );
}

/**
 * Sección estándar: padding vertical 76px + Container interno.
 * `flush`: quita el padding-top (para secciones encadenadas, como en el mockup).
 */
export function Section({
  id,
  flush,
  className,
  containerClassName,
  children,
}: {
  id?: string;
  flush?: boolean;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(flush ? "pb-[76px]" : "py-[76px]", className)}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
