import { cn } from "@/lib/cn";

/**
 * Placa: tarjeta base sobre `surface` con borde hairline y radio 8px.
 * `interactive` agrega el hover de las placas de servicios (lift + borde amarillo).
 */
export function Placa({
  children,
  className,
  interactive,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-hairline bg-surface",
        interactive &&
          // Solo se anima transform (lift) y border-color (regla del proyecto:
          // nada de propiedades de paint por frame). La sombra se aplica en el
          // hover sin transición: pinta una vez al entrar/salir, no cada frame.
          "transition-[transform,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-[rgba(233,188,79,0.4)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
