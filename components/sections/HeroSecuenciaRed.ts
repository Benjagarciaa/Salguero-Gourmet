/* ==========================================================================
 * Red de la secuencia del hero: las descargas de cuadros y lo que se sabe de
 * la red (sin React y sin GSAP).
 *
 * La medida es de la página, no de un motor: si la escena se rearma (el doble
 * montaje de React en desarrollo, un corte de matchMedia), sigue. Anda en
 * todos los navegadores: Safari no expone navigator.connection, así que en un
 * iPhone la única forma de saber si la red da es medir lo que se baja.
 * ========================================================================== */

/**
 * Red lenta medida (KB/s): por debajo, la carga por tramos no arranca o se
 * corta (igual que con 2G/3G efectivos). ~0.7 Mbps, el mismo corte que usa
 * Chrome para "3g".
 */
export const RED_LENTA_KBS = 90;
/**
 * Cuadros bajados para que la velocidad medida sirva (`medirRed` del motor):
 * una tanda de las descargas a la vez de un celular, que llega casi junta.
 */
export const MUESTRA_RED = 6;
/**
 * Velocidad medida (KB/s) desde la que, con la pasada bajada y la persona
 * todavía sin scrollear, se baja por adelantado el resto de la secuencia (ver
 * `nivelAnticipo`): en una compu, con 2 MB/s (~16 Mbps) todo (cuadros del
 * video e intermedios, ~16 MB); con 500 KB/s los cuadros del video; con menos,
 * 1 de cada 4. En un celular, con 1 MB/s 1 de cada 2 (~3.5 MB más que la
 * pasada); con menos, 1 de cada 4. Sin esto, quien entraba con la caché fría
 * y scrolleaba enseguida recorría el hero con la secuencia todavía bajando y
 * veía la grilla gruesa de la pasada: la caja "en cuotas".
 */
export const ANTICIPO_KBS = { todo: 2000, video: 500, mitad: 1000 };

/**
 * Escalón (cuadros del video) hasta el que se baja por adelantado, según el
 * dispositivo y la velocidad medida: 0 = todos los archivos, 1 = los cuadros
 * del video, 2 = 1 de cada 2, 4 = 1 de cada 4.
 */
export function nivelAnticipo(desktop: boolean, kbs: number): number {
  if (desktop) {
    if (kbs >= ANTICIPO_KBS.todo) return 0;
    return kbs >= ANTICIPO_KBS.video ? 1 : 4;
  }
  return kbs >= ANTICIPO_KBS.mitad ? 2 : 4;
}

/**
 * Bytes y cuadros bajados, tiempo con alguna descarga en vuelo y `latencia`:
 * media móvil de lo que tarda un cuadro desde que se pide hasta tenerlo (ms;
 * 0 = sin medida), para el adelanto de lo que se pide en movimiento.
 */
const red = { bytes: 0, cuadros: 0, ms: 0, desde: 0, enVuelo: 0, latencia: 0 };

/** KB/s medidos hasta ahora, o null si todavía no bajó nada. */
export function kbsRed(): number | null {
  const ms = red.ms + (red.enVuelo > 0 ? performance.now() - red.desde : 0);
  return red.bytes > 0 && ms > 0 ? red.bytes / 1024 / (ms / 1000) : null;
}

/** Latencia medida de un cuadro (ms), o null sin medida. */
export function latenciaRed(): number | null {
  return red.latencia || null;
}

/** Cuadros bajados en la página. */
export function cuadrosBajados(): number {
  return red.cuadros;
}

/**
 * Baja un cuadro como Blob (WebP comprimido) y lo suma a la medida. Resuelve
 * null si falla o se corta (`signal`). /media/secuencia tiene caché de un año:
 * lo que ya se bajó (el primer cuadro, que trajo el <img> del servidor; lo que
 * bajó una escena anterior) sale de la caché.
 */
export function bajarCuadro(
  url: string,
  signal: AbortSignal,
): Promise<Blob | null> {
  const t0 = performance.now();
  if (red.enVuelo++ === 0) red.desde = t0;
  return fetch(url, { signal })
    .then((res) => (res.ok ? res.blob() : null))
    .catch(() => null)
    .then((blob) => {
      const ahora = performance.now();
      if (--red.enVuelo === 0) red.ms += ahora - red.desde;
      if (blob) {
        red.bytes += blob.size;
        red.cuadros++;
        const ms = ahora - t0;
        red.latencia = red.latencia ? red.latencia * 0.7 + ms * 0.3 : ms;
      }
      return blob;
    });
}

/**
 * Tipo de red efectivo que estima el navegador con lo que va midiendo
 * (Chromium: "slow-2g", "2g", "3g" o "4g"), o null donde no se expone
 * (Safari, Firefox).
 */
export function tipoDeRed(): string | null {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string };
  };
  return nav.connection?.effectiveType ?? null;
}

/**
 * ¿Red lenta (2G o 3G efectivos)? Ahí la carga por tramos (lo que falta, hasta
 * ~6.5 MB en mobile) no se baja: el scrub usa el cuadro más cercano de la
 * pasada. Donde no se sabe el tipo (iPhone) lo decide la velocidad medida
 * (RED_LENTA_KBS).
 */
export function redLenta(): boolean {
  return ["slow-2g", "2g", "3g"].includes(tipoDeRed() ?? "");
}

/**
 * ¿La página llegó por h2 o h3? Sin el tope de 6 conexiones de HTTP/1.1, una
 * compu baja la secuencia con más pedidos a la vez (ajustesPara).
 */
export function multiplexa(): boolean {
  const nav = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  return ["h2", "h3"].includes(nav?.nextHopProtocol ?? "");
}
