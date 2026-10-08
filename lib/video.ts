/**
 * Videos de escena (hoy solo el de la mesa, en Galería): sacar su arranque del
 * scroll. `trasCargaInactivo` es genérico: también lo usan ProcesoGrid y el
 * visor de la galería.
 *
 * El primer cuadro de un <video> cuesta caro: decodifica, sube la textura y
 * compila el shader YUV del compositor. Si eso pasa cuando la escena entra en
 * pantalla, el scroll se congela (medido: 100 a 420 ms en mobile con CPU x4 y
 * 260 a 360 ms en desktop). Estos helpers hacen ese trabajo antes, en idle y
 * fuera de pantalla, y siempre fail-open: ante cualquier error queda el poster.
 *
 * Solo corren en el cliente (llamarlos desde efectos).
 */
import type { IdleWindow } from "@/lib/idle";

type ConexionConAhorro = { saveData?: boolean };
type VideoConCuadro = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/** La media query estándar del ahorro de datos (Media Queries 5). */
export const MQ_AHORRO = "(prefers-reduced-data: reduce)";

/**
 * La persona pidió ahorro de datos: no precargar video ni bajar la secuencia
 * del hero. Se lee de dos lados:
 * - Save-Data (navigator.connection.saveData), en los navegadores Chromium
 *   (Chrome, Edge, Opera, Samsung Internet) con el ahorro de datos activado;
 * - prefers-reduced-data, la media query estándar (hoy detrás de una bandera
 *   en Chromium: queda lista para cuando salga).
 * Safari no expone ninguna de las dos (el "modo de datos reducidos" del iPhone
 * no llega a la web): ahí cuida la velocidad medida (ver HeroSecuencia).
 */
export function ahorroDeDatos(): boolean {
  const c = (navigator as Navigator & { connection?: ConexionConAhorro })
    .connection;
  if (c?.saveData === true) return true;
  try {
    return window.matchMedia(MQ_AHORRO).matches;
  } catch {
    return false;
  }
}

/**
 * La misma detección que ahorroDeDatos, como expresión JS para los scripts en
 * línea que corren antes de la primera pintura (HeroSecuenciaPoster): si
 * cambia una, cambiar la otra.
 */
export const AHORRO_EN_LINEA = `((navigator.connection&&navigator.connection.saveData===true)||matchMedia("${MQ_AHORRO}").matches)`;

/**
 * Corre `fn` después del evento `load` de la ventana y de un idle del hilo
 * principal (requestIdleCallback con tope de 2 s; donde no existe, setTimeout
 * de 300 ms). Devuelve la cancelación, para la limpieza del efecto.
 */
export function trasCargaInactivo(fn: () => void): () => void {
  const w = window as IdleWindow;
  let cancelado = false;
  let idleId = 0;
  let timeoutId = 0;

  const programar = () => {
    if (cancelado) return;
    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(
        () => {
          if (!cancelado) fn();
        },
        { timeout: 2000 },
      );
    } else {
      timeoutId = window.setTimeout(() => {
        if (!cancelado) fn();
      }, 300);
    }
  };

  if (document.readyState === "complete") programar();
  else window.addEventListener("load", programar, { once: true });

  return () => {
    cancelado = true;
    window.removeEventListener("load", programar);
    if (idleId) w.cancelIdleCallback?.(idleId);
    if (timeoutId) window.clearTimeout(timeoutId);
  };
}

/**
 * Deja el video listo para arrancar sin congelar el scroll: espera a tener el
 * primer cuadro (`loadeddata`) y lo presenta fuera de pantalla, así la textura
 * y el shader YUV se preparan ahora y no en pleno gesto.
 * - Con requestVideoFrameCallback (Chromium, Safari 15.4+) espera a que el
 *   compositor presente un cuadro; si no existe, dibuja el video en un canvas
 *   de 1x1 que se descarta.
 * - En táctiles hace el play() mudo + pause() que "despierta" al video en iOS
 *   (sin eso, el primer play dentro del scroll arranca tarde).
 * Nunca rechaza: ante cualquier error resuelve y queda el poster.
 */
export function calentarVideo(video: HTMLVideoElement): Promise<void> {
  return new Promise<void>((resolver) => {
    let hecho = false;
    const fin = () => {
      if (hecho) return;
      hecho = true;
      resolver();
    };

    try {
      const presentar = () => {
        try {
          const v = video as VideoConCuadro;
          const tactil = navigator.maxTouchPoints > 0;

          // iOS: un play mudo y pausa inmediata deja el decodificador despierto.
          if (tactil && video.paused) {
            video.muted = true;
            // Sin playsinline, iOS abriría el video a pantalla completa.
            video.playsInline = true;
            const p = video.play();
            if (p) {
              void p
                .then(() => {
                  // Si mientras tanto la escena entró en pantalla (y es ella
                  // la que lo quiere corriendo), no pausarlo.
                  if (!enPantalla(video)) video.pause();
                })
                .catch(() => {});
            }
          }

          if (typeof v.requestVideoFrameCallback === "function") {
            // Si el video está pausado y no se pinta, el callback puede no
            // llegar nunca: un tope de 1 s y listo.
            const tope = window.setTimeout(fin, 1000);
            v.requestVideoFrameCallback(() => {
              window.clearTimeout(tope);
              fin();
            });
            if (!tactil) {
              // Sin play no hay cuadro presentado: una vuelta por canvas igual
              // sube la textura a la GPU.
              dibujarEnCanvas(video);
            }
          } else {
            dibujarEnCanvas(video);
            fin();
          }
        } catch {
          fin();
        }
      };

      if (video.readyState >= 2) {
        presentar();
      } else {
        const alCargar = () => {
          video.removeEventListener("error", alFallar);
          presentar();
        };
        const alFallar = () => {
          video.removeEventListener("loadeddata", alCargar);
          fin();
        };
        video.addEventListener("loadeddata", alCargar, { once: true });
        video.addEventListener("error", alFallar, { once: true });
        // Un video con preload="none" no carga solo: pedirle el primer cuadro.
        if (video.preload === "none") video.preload = "auto";
        if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) video.load();
      }
    } catch {
      fin();
    }
  });
}

/** El video (o su caja) cruza la ventana. */
function enPantalla(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

/** Dibuja el cuadro actual en un canvas de 1x1 descartable (sube la textura). */
function dibujarEnCanvas(video: HTMLVideoElement) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    canvas.getContext("2d")?.drawImage(video, 0, 0, 1, 1);
  } catch {
    // Video de otro origen o sin datos: no hace falta más.
  }
}
