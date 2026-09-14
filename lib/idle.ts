/**
 * `window` con las APIs opcionales de requestIdleCallback / cancelIdleCallback,
 * que no están en todos los lib.dom. Tipo compartido para diferir trabajo no
 * crítico a idle (smooth scroll, barras decorativas, carga del video del hero).
 */
export type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};
