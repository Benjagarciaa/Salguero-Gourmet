"use client";

/**
 * Entrada: wrapper del contenido ABOVE THE FOLD del hero.
 *
 * Regla FAIL-OPEN innegociable (CLAUDE.md): ningún elemento arranca oculto en
 * CSS estático y jamás debe verse el flash visible -> invisible -> fade. Para
 * contenido que YA está en el viewport en la primera pintura, ese flash es
 * inevitable en una entrada "desde oculto": los efectos de React (incluido
 * useLayoutEffect) corren siempre DESPUÉS de que el navegador pintó el HTML del
 * SSR, así que cualquier salto posterior a opacity 0 se ve. El gate temporal
 * anterior (performance.now() < 600ms) no medía la pintura sino el tiempo desde
 * navigation start: en cargas rápidas o cacheadas el hero se pintaba visible y
 * recién ahí saltaba a 0 (el flash), y en mobile lento (hidratación > 600ms) la
 * coreografía no corría nunca -> inconsistente entre dispositivos.
 *
 * Por eso el hero, igual que Reveal para el contenido above-the-fold, se queda
 * VISIBLE y estático. La animación del hero vive en el video, el parallax, el
 * shimmer del título y el conteo de la tira; la entrada por bloques se descartó
 * a propósito. `delay` e `y` se conservan en la firma por compatibilidad con el
 * Hero (que los pasa), pero no se usan.
 */
export function Entrada({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return <div className={className}>{children}</div>;
}
