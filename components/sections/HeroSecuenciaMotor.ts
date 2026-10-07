import type { HeroSecuenciaVersion } from "@/content/data";
import {
  BAJADO,
  BAJANDO,
  crearReloj,
  crearRitmo,
  DECODIFICAR_INICIAL_MS,
  demanda,
  DPR_MAX,
  elegirCuadro,
  FALLO,
  LATENCIA_INICIAL_MS,
  LATENCIA_TOPE_MS,
  MAX_PRIMERO,
  REPOSO_MS,
  tiemposDe,
  urlDeCuadro,
  type Ajustes,
  type Demanda,
  type EstadoCuadros,
} from "./HeroSecuenciaPlan";
import {
  bajarCuadro,
  cuadrosBajados,
  kbsRed,
  latenciaRed,
  MUESTRA_RED,
} from "./HeroSecuenciaRed";

/* ==========================================================================
 * Motor de la secuencia de cuadros (sin React y sin GSAP): aplica el plan de
 * HeroSecuenciaPlan con la red, los bitmaps y el lienzo.
 *
 * - Por cada cuadro de pantalla el timeline llama a `irA` con la posición
 *   (cuadro del VIDEO con decimales, de 0 a `ultimo`): dibuja ahí mismo, en
 *   el mismo tick que mueve los textos, a lo sumo UN drawImage y solo si
 *   cambia el archivo o el tamaño. Lo que llega por su cuenta (un bitmap que
 *   cambia lo que se ve) pide un rAF, que el próximo `irA` cancela.
 * - Los archivos pueden ser más que los cuadros del video (intermedios, ver
 *   `densidad` en content/data.ts): `tiemposDe` (HeroSecuenciaPlan) lleva la
 *   posición del video a archivos y dice qué archivos son de la pasada. Red,
 *   bitmaps y lienzo trabajan en archivos.
 * - Después de cada cambio (una vez por tick, en una microtarea; y otra vez
 *   REPOSO_MS después del último movimiento) `planificar` calcula la demanda
 *   y la aplica: libera los bitmaps que ya no se conservan (el ÚNICO lugar que
 *   los libera), lanza decodificaciones y descargas hasta los topes de los
 *   ajustes (los intermedios dejan siempre una decodificación libre para los
 *   cuadros del video). Las colas no se ordenan de antemano: cada lugar que
 *   se libera toma lo primero de la última demanda. Cada llamada de `irA`
 *   marca además el ritmo de la pantalla (`crearRitmo`): si no da abasto, la
 *   demanda deja los intermedios.
 * - Baja cada cuadro una vez, como WebP comprimido (Blob, ~40 KB), y lo
 *   decodifica con createImageBitmap fuera del hilo principal, al tamaño real
 *   del cuadro (sin resizeWidth: el reescalado "high" corría en el hilo
 *   principal; drawImage ya escala con cover en la GPU). El primer cuadro sale
 *   de la caché: es el mismo archivo que mostró el <img> del servidor.
 * - El lienzo arranca oculto y se muestra con su primer dibujo (`alLienzo`:
 *   quien llama alterna el <img> del servidor y el lienzo en ese mismo cuadro
 *   de pantalla). El primero de todos, el que reemplaza al <img> al cargar,
 *   va solo con el cuadro de la posición (MAX_PRIMERO) o, si no viene ninguno
 *   más cerca, con el más cercano.
 * - El <img> del servidor ES el cuadro 0 y siempre está a mano (como un
 *   bitmap fijo, sin gastar memoria): si queda más cerca de la posición que
 *   lo decodificado, se oculta el lienzo y se ve él. Pasa al volver de golpe
 *   arriba de todo (tecla Inicio, toque en la barra de estado del iPhone)
 *   con el cuadro 0 todavía sin decodificar: se veía un cuadro de la mitad
 *   de la subida unos cuadros de pantalla.
 * - Los cuadros traen alfa (el fondo es transparente: se ve la página detrás,
 *   así el marco nunca se lee como un rectángulo de otro tono) y el lienzo es
 *   transparente.
 * - Con el hero ya pasado duerme (`dormir`): suelta todos los bitmaps, deja
 *   el lienzo en 1 px y vuelve al <img> (el cuadro 0) hasta que se vuelve
 *   (`despertar`); el lienzo reaparece con su primer dibujo. Dormido no
 *   decodifica ni dibuja, pero la pasada sigue bajando (los tramos esperan):
 *   quien entra por un ancla de abajo o recarga ahí encuentra los cuadros al
 *   volver, también con red lenta. Los blobs quedan.
 * ========================================================================== */

export interface MotorSecuencia {
  /**
   * Último cuadro del video: el final del timeline (con intermedios hay más
   * archivos que cuadros del video).
   */
  readonly ultimo: number;
  /**
   * Pide mostrar la posición `f` (cuadro del video con decimales; se acota al
   * rango).
   */
  irA(f: number): void;
  /**
   * La pasada (1 de cada 8 cuadros del video y el último). Resuelve al
   * terminar o al destruir.
   */
  cargar(): Promise<void>;
  /** Habilita la carga por tramos: lo que falta alrededor de la persona. */
  seguir(): void;
  /** Corta la carga por tramos (la red resultó lenta). */
  soltarTramos(): void;
  /**
   * Velocidad de la red medida hasta ahora (KB/s: bytes de cuadros bajados en
   * la página sobre el tiempo con alguna descarga en vuelo), o null si no bajó
   * nada.
   */
  velocidadRed(): number | null;
  /**
   * Espera una medida que sirva (una tanda de MUESTRA_RED cuadros bajados, o
   * la pasada terminada) y devuelve velocidadRed().
   */
  medirRed(): Promise<number | null>;
  /**
   * El hero ya pasó y quedó invisible: libera los bitmaps, achica el lienzo a
   * 1 px y lo oculta (`alLienzo(false)`). Mientras duerme no decodifica ni
   * dibuja; la pasada sigue bajando y los tramos esperan.
   */
  dormir(): void;
  /**
   * Vuelve a medir el lienzo y a decodificar alrededor del cuadro actual; el
   * lienzo se muestra con su primer dibujo.
   */
  despertar(): void;
  /** Corta descargas, decodificaciones, timers y observers, y libera todo. */
  destruir(): void;
  /** Estado para el diagnóstico de ?hsdiag (HeroSecuenciaDiag). */
  diagnostico(): {
    /** Archivo en el lienzo (-1: ninguno) y su tiempo en el video. */
    mostrado: number;
    tiempo: number;
    bitmaps: number;
    bytes: number;
    capacidad: number;
    decodificadas: number;
    decodificando: number;
    decodificarMs: number;
    decodificarMaxMs: number;
    paso: number;
    descargas: number;
  };
}

export function crearMotor({
  canvas,
  version,
  foco,
  ajustes,
  escalaMax = () => 1,
  alLienzo,
}: {
  canvas: HTMLCanvasElement;
  version: HeroSecuenciaVersion;
  /** Foco en % (50/50 = centro), igual que object-position. */
  foco: { x: number; y: number };
  /** Topes de red, decodificación y memoria del dispositivo (ajustesPara). */
  ajustes: Ajustes;
  /**
   * Escala CSS máxima que puede tener el canvas (el acercamiento de desktop):
   * el lienzo se mide para verse nítido también agrandado.
   */
  escalaMax?: () => number;
  /**
   * El lienzo pasa a la vista (true: en el mismo tick de un dibujo, al cargar
   * y al despertar) o deja de estarlo (false: al dormir, ya vacío, o cuando
   * el <img>, que es el cuadro 0, queda más cerca de la posición).
   */
  alLienzo?: (aLaVista: boolean) => void;
}): MotorSecuencia {
  /** Los archivos en el tiempo del video (con intermedios, son más). */
  const tiempos = tiemposDe(version);
  const { total, pasada } = tiempos;
  const ctx = canvas.getContext("2d");
  const fx = foco.x / 100;
  const fy = foco.y / 100;
  /** Posición, velocidad y sentido, en cuadros del video. */
  const reloj = crearReloj();
  /** ¿La pantalla da abasto? (sin intermedios si no; HeroSecuenciaPlan). */
  const ritmo = crearRitmo();
  /** Estado de red de cada archivo (NADA, BAJANDO, BAJADO o FALLO) y lo bajado. */
  const red = new Uint8Array(total);
  const blobs: (Blob | undefined)[] = new Array(total);
  const bitmaps = new Map<number, ImageBitmap>();
  const decodificando = new Set<number>();
  const tiene = (i: number) => bitmaps.has(i);
  const corte = new AbortController();
  const medidas = {
    latenciaMs: LATENCIA_INICIAL_MS,
    decodificarMs: DECODIFICAR_INICIAL_MS,
    tramos: false,
    holgada: true,
  };
  /** Decodificaciones terminadas y la más larga (para el diagnóstico). */
  let decodificadas = 0;
  let decodificarMaxMs = 0;
  /** La pasada se pidió (`cargar`) y le falta algo. */
  let pasadaPendiente = false;
  /** El archivo que está en el lienzo (-1: ninguno) y si hay que repintarlo. */
  let mostrado = -1;
  let limpio = true;
  const estado: EstadoCuadros = {
    tiempos,
    red,
    decodificado: tiene,
    decodificando: (i) => decodificando.has(i),
    get mostrado() {
      return mostrado;
    },
    get pasadaPendiente() {
      return pasadaPendiente;
    },
  };
  let ultima: Demanda = {
    bajar: [],
    decodificar: [],
    conservar: new Set(),
    paso: 0,
  };
  /** Posición (cuadro del video) para la que se calculó `ultima`. */
  let posPlan = NaN;
  let enVuelo = 0;
  /**
   * El próximo dibujo es el que reemplaza al <img> al cargar (la regla de
   * MAX_PRIMERO): deja de serlo con el primer dibujo o al dormir.
   */
  let alCargar = true;
  /** El lienzo está a la vista (si no, se ve el <img> del servidor). */
  let aLaVista = false;
  let dormido = false;
  let muerto = false;
  let programado = false;
  let raf = 0;
  let esperaReposo = 0;
  /** Tamaño CSS del lienzo (lo da el ResizeObserver; 0 = sin medir). */
  let tam = { w: 0, h: 0 };
  /** Promesas de `cargar` y `medirRed` esperando su condición. */
  let esperas: { listo: () => boolean; resolver: () => void }[] = [];

  /* ---------- Dibujo ---------- */

  /**
   * ¿Puede llegar un archivo a menos de `d` de `x` (posición en archivos)?
   * (bajando, por bajar, decodificándose o por decodificar según la última
   * demanda). Solo para el primer dibujo.
   */
  const llegaMasCerca = (x: number, d: number) => {
    const desde = Math.max(0, Math.ceil(x - d));
    const hasta = Math.min(total - 1, Math.floor(x + d));
    for (let j = desde; j <= hasta; j++) {
      if (Math.abs(j - x) >= d) continue;
      if (
        red[j] === BAJANDO ||
        decodificando.has(j) ||
        (ultima.conservar.has(j) && !tiene(j)) ||
        ultima.bajar.includes(j)
      ) {
        return true;
      }
    }
    return false;
  };

  /** Cover: escala para llenar el lienzo y recorta alrededor del foco. */
  const pintar = (i: number) => {
    const img = bitmaps.get(i);
    if (!ctx || !img) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const k = Math.max(cw / img.width, ch / img.height);
    const dw = img.width * k;
    const dh = img.height * k;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - dw) * fx, (ch - dh) * fy, dw, dh);
    mostrado = i;
    limpio = false;
  };

  /** El lienzo a la vista (true) o el <img> del servidor (false). */
  const mostrar = (si: boolean) => {
    if (si === aLaVista) return;
    aLaVista = si;
    alLienzo?.(si);
  };

  /** UN cuadro entero (elegirCuadro), solo si cambia lo que se ve. */
  const dibujar = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (muerto || dormido || !ctx || !tam.w) return;
    const { pos, dir } = reloj.leer(performance.now());
    const x = tiempos.posicion(pos);
    const n = elegirCuadro(pos, dir, tiempos, tiene, mostrado);
    // El <img> (el cuadro 0) queda más cerca de la posición: se ve él.
    if (n < 0 || Math.abs(tiempos.tiempo[n] - pos) > pos) {
      mostrar(false);
      return;
    }
    if (alCargar) {
      // El primer dibujo reemplaza al <img> (el cuadro 0) en un solo corte:
      // con el archivo de la posición o, si con la demanda de esta misma
      // posición no viene ninguno más cerca, con el más cercano. Al
      // despertar no se espera: con el scroll en camino de vuelta, el más
      // cercano está más cerca que el cuadro 0 del <img>.
      const d = Math.abs(n - x);
      if (d > MAX_PRIMERO && (posPlan !== pos || llegaMasCerca(x, d))) {
        return;
      }
    }
    if (n !== mostrado || limpio) pintar(n);
    alCargar = false;
    mostrar(true);
  };

  const pedirDibujo = () => {
    if (!raf && !muerto && !dormido) raf = requestAnimationFrame(dibujar);
  };

  /* ---------- Plan: decodificación y red ---------- */

  const revisarEsperas = () => {
    esperas = esperas.filter((e) => {
      if (!muerto && !e.listo()) return true;
      e.resolver();
      return false;
    });
  };
  const esperar = (listo: () => boolean) =>
    new Promise<void>((resolver) => {
      if (muerto || listo()) resolver();
      else esperas.push({ listo, resolver });
    });

  const decodificar = (i: number, blob: Blob) => {
    decodificando.add(i);
    const t0 = performance.now();
    createImageBitmap(blob)
      .then(
        (bitmap) => {
          const ms = performance.now() - t0;
          medidas.decodificarMs = medidas.decodificarMs * 0.7 + ms * 0.3;
          decodificadas++;
          decodificarMaxMs = Math.max(decodificarMaxMs, ms);
          // Lo que dejó de hacer falta mientras se decodificaba no se queda.
          if (muerto || dormido || !ultima.conservar.has(i)) {
            bitmap.close();
            return;
          }
          bitmaps.set(i, bitmap);
          const { pos, dir } = reloj.leer(performance.now());
          if (elegirCuadro(pos, dir, tiempos, tiene, mostrado) !== mostrado) {
            pedirDibujo();
          }
        },
        () => {
          // Un cuadro que no se decodifica no se reintenta: se usa el vecino.
          red[i] = FALLO;
          blobs[i] = undefined;
        },
      )
      .finally(() => {
        decodificando.delete(i);
        programar();
      });
  };

  const bajar = (i: number) => {
    red[i] = BAJANDO;
    enVuelo++;
    void bajarCuadro(urlDeCuadro(version, i), corte.signal).then((blob) => {
      enVuelo--;
      if (muerto) return;
      // Un cuadro que falla no frena la secuencia (se usa el vecino) ni se
      // vuelve a pedir en bucle.
      if (blob) {
        blobs[i] = blob;
        red[i] = BAJADO;
      } else {
        red[i] = FALLO;
      }
      if (pasadaPendiente && pasada.every((j) => red[j] >= BAJADO)) {
        pasadaPendiente = false;
      }
      revisarEsperas();
      programar();
    });
  };

  function planificar() {
    programado = false;
    if (muerto) return;
    const s = reloj.leer(performance.now());
    medidas.holgada = ritmo.holgada;
    medidas.latenciaMs = Math.min(
      LATENCIA_TOPE_MS,
      latenciaRed() ?? LATENCIA_INICIAL_MS,
    );
    // Dormido sigue la pasada (ordenada desde donde quedó la caja: el cierre
    // primero si se fue por abajo); los tramos esperan a despertar.
    ultima = demanda(
      s,
      estado,
      ajustes,
      dormido ? { ...medidas, tramos: false } : medidas,
    );
    posPlan = s.pos;
    if (!dormido) {
      for (const [i, bitmap] of bitmaps) {
        if (ultima.conservar.has(i)) continue;
        bitmap.close();
        bitmaps.delete(i);
      }
      // Los intermedios dejan siempre una decodificación libre para los
      // cuadros del video: si la persona acelera, el que pasa a hacer falta no
      // espera detrás de intermedios que ya no se van a ver.
      let intermedios = 0;
      for (const j of decodificando) if (!tiempos.escalon[j]) intermedios++;
      for (const i of ultima.decodificar) {
        if (decodificando.size >= ajustes.decodificaciones) break;
        const blob = blobs[i];
        if (!blob) continue;
        if (!tiempos.escalon[i]) {
          if (intermedios >= Math.max(1, ajustes.decodificaciones - 1)) continue;
          intermedios++;
        }
        decodificar(i, blob);
      }
    }
    for (const i of ultima.bajar) {
      if (enVuelo >= ajustes.descargas) break;
      bajar(i);
    }
    // Con el lienzo oculto, la demanda nueva puede habilitar el primer dibujo.
    if (!aLaVista) dibujar();
  }

  /** Una planificación por tick como mucho. */
  function programar() {
    if (programado || muerto) return;
    programado = true;
    queueMicrotask(planificar);
  }

  /* ---------- Tamaño ---------- */

  // Tamaño del lienzo = tamaño de layout (sin las escalas CSS, que se animan)
  // x DPR x acercamiento máximo, sin pasar el tamaño real del cuadro (más no
  // suma detalle). Cambiarlo borra el lienzo y su estado: se redibuja en el
  // mismo callback (antes de pintar).
  const dimensionar = () => {
    if (dormido || !(tam.w > 0 && tam.h > 0)) return;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    const z = Math.max(1, escalaMax());
    const tope = Math.min(1, version.ancho / (tam.w * dpr * z));
    const w = Math.max(1, Math.round(tam.w * dpr * z * tope));
    const h = Math.max(1, Math.round(tam.h * dpr * z * tope));
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }
    limpio = true;
    dibujar();
  };
  const ro = new ResizeObserver((entradas) => {
    const r = entradas[entradas.length - 1]?.contentRect;
    if (!r) return;
    tam = { w: r.width, h: r.height };
    dimensionar();
  });
  ro.observe(canvas);

  return {
    ultimo: tiempos.ultimo,

    irA(f) {
      const n = Math.min(tiempos.ultimo, Math.max(0, f));
      const ahora = performance.now();
      if (n === reloj.leer(ahora).pos) return;
      reloj.marcar(n, ahora);
      ritmo.marcar(ahora);
      dibujar();
      programar();
      // Al quedar quieto se planifica de nuevo, ya en reposo (sin `paso`).
      window.clearTimeout(esperaReposo);
      esperaReposo = window.setTimeout(programar, REPOSO_MS + 5);
    },

    cargar() {
      pasadaPendiente = pasada.some((j) => red[j] < BAJADO);
      programar();
      return esperar(() => !pasadaPendiente);
    },

    seguir() {
      medidas.tramos = true;
      programar();
    },

    soltarTramos() {
      medidas.tramos = false;
      programar();
    },

    velocidadRed: kbsRed,

    async medirRed() {
      await esperar(() => cuadrosBajados() >= MUESTRA_RED || !pasadaPendiente);
      return kbsRed();
    },

    dormir() {
      if (muerto || dormido) return;
      dormido = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      for (const bitmap of bitmaps.values()) bitmap.close();
      bitmaps.clear();
      mostrado = -1;
      alCargar = false;
      canvas.width = 1;
      canvas.height = 1;
      // Vacío, vuelve el <img> (el cuadro 0): al volver de golpe arriba de
      // todo (tecla Inicio, toque en la barra de estado del iPhone) se ve la
      // caja entera hasta el primer dibujo, nunca el lienzo vacío.
      mostrar(false);
    },

    despertar() {
      if (muerto || !dormido) return;
      dormido = false;
      dimensionar();
      programar();
    },

    destruir() {
      if (muerto) return;
      muerto = true;
      corte.abort();
      window.clearTimeout(esperaReposo);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      for (const bitmap of bitmaps.values()) bitmap.close();
      bitmaps.clear();
      revisarEsperas();
    },

    diagnostico() {
      let bytes = 0;
      for (const b of bitmaps.values()) bytes += b.width * b.height * 4;
      return {
        mostrado,
        tiempo: mostrado >= 0 ? tiempos.tiempo[mostrado] : -1,
        bitmaps: bitmaps.size,
        bytes,
        capacidad: ajustes.capacidad,
        decodificadas,
        decodificando: decodificando.size,
        decodificarMs: medidas.decodificarMs,
        decodificarMaxMs,
        paso: ultima.paso,
        descargas: enVuelo,
      };
    },
  };
}
