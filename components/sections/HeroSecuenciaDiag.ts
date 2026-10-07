import type { MotorSecuencia } from "./HeroSecuenciaMotor";

/* ==========================================================================
 * Diagnóstico de la secuencia del hero, para probar en un teléfono: con
 * ?hsdiag en la URL, un recuadro fijo arriba a la izquierda con lo que hace
 * el motor y cómo van los cuadros de pantalla. Sirve para sacar una captura
 * en un iPhone, donde el inspector de Safari necesita una Mac. Sin el
 * parámetro ni se baja (import dinámico desde HeroSecuencia).
 *   - fps: cuadros de pantalla en el último segundo; >20ms: cuadros de más de
 *     20 ms desde que se montó (con el peor del último segundo);
 *   - cuadro: el de la posición del scroll y el que está en el lienzo;
 *   - decod: decodificaciones hechas, en vuelo y ms (media móvil y máxima);
 *   - paso (1 de cada cuántos cuadros en movimiento) y bitmaps vivos, MB y
 *     capacidad; red: descargas en vuelo y KB/s medidos.
 * ========================================================================== */

export function montarDiag(
  motor: MotorSecuencia,
  objetivo: () => number,
): () => void {
  const caja = document.createElement("div");
  caja.setAttribute("aria-hidden", "true");
  caja.style.cssText =
    "position:fixed;left:6px;top:6px;z-index:2147483647;pointer-events:none;" +
    "font:11px/1.35 ui-monospace,Menlo,monospace;color:#fff;" +
    "background:rgba(0,0,0,.78);padding:6px 8px;border-radius:6px;white-space:pre";
  document.body.appendChild(caja);

  const cuadros: number[] = [];
  let largos = 0;
  let previo = 0;
  let raf = 0;
  const bucle = (t: number) => {
    if (previo && t - previo > 20) largos++;
    previo = t;
    cuadros.push(t);
    while (cuadros.length && t - cuadros[0] > 1000) cuadros.shift();
    raf = requestAnimationFrame(bucle);
  };
  raf = requestAnimationFrame(bucle);

  const pintar = () => {
    const d = motor.diagnostico();
    let peor = 0;
    for (let k = 1; k < cuadros.length; k++) {
      peor = Math.max(peor, cuadros[k] - cuadros[k - 1]);
    }
    const kbs = motor.velocidadRed();
    const ms = `${Math.round(d.decodificarMs)}/${Math.round(d.decodificarMaxMs)}`;
    const mb = (d.bytes / 1048576).toFixed(0);
    caja.textContent = [
      `fps ${cuadros.length}  >20ms ${largos}  peor ${Math.round(peor)}ms`,
      `cuadro ${objetivo().toFixed(1)} → ${d.mostrado}`,
      `decod ${d.decodificadas} (${d.decodificando} en vuelo) ${ms}ms`,
      `paso ${d.paso}  bitmaps ${d.bitmaps} (${mb} MB) de ${d.capacidad}`,
      `red ${d.descargas} en vuelo  ${kbs === null ? "-" : Math.round(kbs)} KB/s`,
      `${navigator.vendor || "?"} dpr ${devicePixelRatio}`,
    ].join("\n");
  };
  const intervalo = window.setInterval(pintar, 250);
  pintar();

  return () => {
    cancelAnimationFrame(raf);
    window.clearInterval(intervalo);
    caja.remove();
  };
}
