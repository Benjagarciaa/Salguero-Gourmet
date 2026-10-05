/**
 * `window` con las APIs opcionales de requestIdleCallback / cancelIdleCallback,
 * que no están en todos los lib.dom. Tipo compartido para diferir trabajo no
 * crítico a idle (smooth scroll, barras y capas decorativas).
 */
export type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};
