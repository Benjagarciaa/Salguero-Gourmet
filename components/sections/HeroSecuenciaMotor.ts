import type { HeroSecuenciaVersion } from "@/content/data";
import { resorteGsap } from "@/lib/fisica";
import { despuesDelPintado } from "@/lib/pintado";

/* ==========================================================================
 * Motor de la secuencia de cuadros (sin React y sin GSAP).
 *
 * - Baja los cuadros como WebP comprimidos (Blob, ~35KB cada uno): primero una
 *   pasada de 1 de cada 8 (más el último), así desde temprano hay cuadros
 *   repartidos por todo el recorrido (`cargar`), y después POR TRAMOS
 *   (`seguir`): solo los que quedan cerca de donde está la persona, lo más
 *   cercano primero y más hacia donde scrollea. Quien mira el principio y se va
 *   no baja la secuencia entera; quien la recorre baja cada cuadro una vez.
 *   Una sola cola reparte las descargas (ver `siguiente`): con los tramos ya
 *   habilitados, los cuadros que la caja tiene que mostrar AHORA pasan antes
 *   que el resto de la pasada (con deslizadas tempranas, el cuadro exacto no
 *   espera a que termine la pasada). Con el scroll en movimiento rápido se
 *   pide lo que la caja va a mostrar CUANDO LLEGUE el cuadro (la posición
 *   adelantada lo que tarda una descarga), de lo grueso a lo fino: pedir lo
 *   cercano a la posición actual traía cuadros que ya habían quedado atrás y
 *   la caja iba "de a cuotas" (1 de cada 8, los de la pasada).
 * - Las descargas se comparten entre motores (`descargas`): si la escena se
 *   rearma (el doble montaje de React en desarrollo, un corte de matchMedia que
 *   vuelve a la misma versión) el motor nuevo toma lo que el anterior ya bajó
 *   o seguía bajando, sin cortarlo ni pedirlo de nuevo.
 * - Decodifica (createImageBitmap) SOLO una ventana alrededor del cuadro
 *   actual, más larga hacia donde se scrollea, y libera (bitmap.close) los que
 *   quedan lejos: se usan todos los cuadros sin guardar cientos de MB
 *   decodificados. Los bitmaps salen al tamaño real del cuadro, sin
 *   resizeWidth: el reescalado "high" de createImageBitmap corría en el hilo
 *   principal al resolverse la promesa (tareas de 8.6 a 11 ms por cuadro, con
 *   un presupuesto de 5.6 ms a 180 Hz). drawImage ya escala con cover en la
 *   GPU. Cuesta unos 3.7 MB por bitmap en desktop en vez de 2.6 (en mobile, el
 *   cuadro ya es del tamaño del lienzo) y un cambio de tamaño del lienzo ya no
 *   obliga a decodificar de nuevo.
 * - Los cuadros traen alfa (el fondo es transparente: se ve la página detrás,
 *   así el marco nunca se lee como un rectángulo de otro tono) y el canvas es
 *   transparente.
 * - Fundido sub-cuadro CORTO: la posición es un número con decimales, pero el
 *   peso del cuadro de arriba no es la parte decimal tal cual (un fundido
 *   lineal de 0 a 1 mostraba dos productos a medias, "doble imagen", cuando
 *   dos cuadros seguidos son muy distintos: los productos que suben rápido).
 *   Es una smoothstep centrada que solo funde en el medio del intervalo
 *   (FUNDIDO_ANCHO): el resto del tiempo se ve UN cuadro entero. Los dos se
 *   suman con sus pesos (composición "lighter", que en alfa premultiplicado es
 *   la interpolación exacta) y el paso de uno al otro sigue sin escalones.
 * - En reposo nunca queda un fundido a medias: si el scroll se detiene con la
 *   posición en el tramo del fundido, termina de fundir hacia el cuadro más
 *   cercano (con el resorte `tacto`, ~300 ms), sin mover el scroll.
 * - Mientras falta alguno de los dos, dibuja el decodificado más cercano (el
 *   scrub nunca queda en blanco) y redibuja apenas llega el que corresponde.
 *   El cuadro que está en el lienzo no se libera (`mostrado`): si no, con el
 *   siguiente todavía sin decodificar, el más cercano podía ser el 0 (fijo) y
 *   la caja se volvía a cerrar en pleno recorrido. Si en la ventana no hay
 *   nada bajado, se decodifica lo bajado más cercano aunque quede afuera (red
 *   de seguridad de `planificar`). Antes del primer dibujo, el lienzo no tapa
 *   al <img> de respaldo (el cuadro 0) con un cuadro más lejano.
 * - Dibuja en el momento (irA) si puede: el timeline lo llama una vez por
 *   cuadro de pantalla, en el mismo tick que mueve los textos. Lo que llega
 *   por su cuenta (decodificaciones, cambio de tamaño) pide un rAF.
 * - Puede adoptar el <img> de respaldo como cuadro 0 (ya bajado para el LCP):
 *   ese no se baja dos veces ni se libera. Se dibuja desde un bitmap
 *   decodificado fuera del hilo principal (el archivo sale de la caché):
 *   dibujar el <img> en el lienzo lo decodificaba en el hilo principal
 *   (~40 ms con un celular de gama media) en el primer cuadro.
 * - Con el hero ya pasado duerme (dormir): suelta los bitmaps y deja el lienzo
 *   en 1 px hasta que se vuelve (despertar).
 * ========================================================================== */

/**
 * Descargas a la vez (por defecto: el tope de conexiones de HTTP/1.1; con
 * h2/h3 quien llama puede pedir más, opción `concurrencia`).
 */
const CONCURRENCIA = 6;
/** Decodificaciones a la vez (corren fuera del hilo principal). */
const DECODIFICACIONES = 3;
/** Tope de densidad de píxeles del canvas. */
const DPR_MAX = 2;
/** Diferencia de posición por debajo de la cual no se redibuja. */
const EPSILON = 0.002;
/**
 * Parte del intervalo entre dos cuadros en la que se funden (centrada): con
 * 0.4, del 0 al 0.3 se ve el de abajo entero, del 0.7 al 1 el de arriba, y en
 * el medio una smoothstep (la doble imagen notoria, con los dos pesos por
 * encima de 0.15, queda en ~20% del recorrido contra ~70% del fundido
 * lineal). Más chico = menos doble imagen, más "cuotas".
 */
const FUNDIDO_ANCHO = 0.4;
/** Sin cambios de posición durante este tiempo, se asienta en un cuadro. */
const QUIETO_MS = 140;
/**
 * Margen (en cuadros) fuera de la ventana antes de liberar un cuadro
 * decodificado: evita decodificar de nuevo al ir y volver un poco. Cada
 * cuadro vivo es un ImageBitmap entero (2 MB en mobile, 3.7 MB en desktop).
 */
const MARGEN_LIBERAR = 2;
/**
 * Carga por tramos (`seguir`): cuadros que se bajan también hacia atrás del
 * actual (el resto de la ventana va hacia donde se scrollea).
 */
const TRAMO_ATRAS = 4;
/**
 * El horizonte hacia adelante cubre por lo menos estos segundos de scroll a la
 * velocidad actual (si es más que el mínimo que pide quien llama): lo que
 * todavía recorre la inercia de una deslizada (o el suavizado de Lenis) antes
 * de frenar. Con 2 s, dos deslizadas hasta el cuadro ~30 en un celular bajaban
 * 148 de 172 cuadros (5.9 MB); con 0.5 s, 90 (3.4 MB), y el recorrido completo
 * sigue con todos los cuadros exactos.
 */
const TRAMO_SEGUNDOS = 0.5;
/** Media móvil de la velocidad del scroll (s) y pausa que la vuelve a 0 (ms). */
const VELOCIDAD_TAU = 0.25;
const VELOCIDAD_PAUSA_MS = 300;
/**
 * Un cambio de más cuadros que esto en un solo paso es un salto (el primer
 * dibujo con la página ya scrolleada, un ancla), no velocidad de scroll: no
 * cuenta para el horizonte (a 1000 px/s son ~1 cuadro por paso en desktop y
 * ~2 en mobile).
 */
const SALTO = 24;
/**
 * Con los tramos habilitados, lo que la caja tiene que mostrar ya: el cuadro
 * actual y los que siguen hacia donde se scrollea (y uno hacia atrás). Con la
 * pasada todavía en curso pasan antes que ella, pero solo con el scroll en
 * reposo (VELOCIDAD_PAUSA_MS sin moverse): son cuadros que los tramos bajan
 * igual al terminar la pasada (están dentro de su ventana), solo que antes; en
 * plena deslizada no se piden los cuadros por los que se va pasando (eso sí
 * sumaba datos).
 */
const INMEDIATO = { adelante: 3, atras: 1 };
/**
 * Cuadros bajados para que la velocidad medida sirva (`medirRed`): una tanda
 * entera, que llega casi junta.
 */
const MUESTRA_RED = CONCURRENCIA;
/**
 * Scroll en movimiento (`siguiente` y `planificar`): desde esta velocidad
 * (cuadros por segundo; a 3000 px/s en desktop pasan ~240) lo que se pide y lo
 * que se decodifica primero es lo que la caja va a mostrar cuando esté listo,
 * no lo más cercano a la posición actual.
 */
const VEL_MOVIMIENTO = 20;
/**
 * Lo que tarda en decodificarse un cuadro (ms) mientras no hay una medida
 * (después, la media móvil del motor): se suma al adelanto.
 */
const DECODIFICAR_MS = 25;
/**
 * Con el scroll en movimiento rápido no se decodifican todos los cuadros: uno
 * de cada `paso` (1, 2, 4 u 8), lo justo para que la caja muestre hasta
 * IMAGENES_EN_MOVIMIENTO por segundo sin pasar de FRACCION_DECODIFICACION de
 * lo que dan las decodificaciones a la vez (medido). Decodificar todos a 3000
 * px/s (~240 por segundo) dejaba las decodificaciones siempre llenas: lo que
 * salía ya había quedado atrás (la caja iba detrás del scroll) y el trabajo
 * le quitaba cuadros de pantalla al scroll. En reposo, todos. Con 120, en la
 * PC del dueño a 3000 px/s va 1 de cada 2 (con la CPU cargada, de cada 4).
 */
const IMAGENES_EN_MOVIMIENTO = 120;
const FRACCION_DECODIFICACION = 0.66;
/** Latencia de una descarga (ms) mientras no hay una medida. */
const LATENCIA_INICIAL = 120;
/**
 * En movimiento, lo que se pide va en bandas de lo que se recorre en este
 * tiempo (s), cada una de lo grueso a lo fino (1 de cada 8, de cada 4, de
 * cada 2, todos): la primera banda queda cubierta entera antes de seguir con
 * la próxima, y las de más adelante arrancan por los múltiplos de 8, que ya
 * dan un cuadro cada pocos. Ancho mínimo, `BANDA_MIN` cuadros.
 */
const BANDA_SEGUNDOS = 0.2;
const BANDA_MIN = 8;
const PASOS_BANDA = [8, 4, 2, 1];

/* ---------- Descargas compartidas entre motores ---------- */

/**
 * Cuadros bajados o bajando, por URL. Un motor que se destruye no corta lo que
 * pidió: si en seguida se arma otro con la misma versión (el doble montaje de
 * React en desarrollo, un corte de matchMedia que vuelve a la misma versión),
 * lo toma tal cual. Antes se cortaban las 6 descargas en vuelo y el motor
 * nuevo las volvía a pedir (180 pedidos en vez de 174). Una carpeta que ningún
 * motor vivo usa se suelta (y se corta lo que seguía bajando) `SOLTAR_MS`
 * después de destruirse el último.
 */
type Descarga = { promesa: Promise<Blob | null>; corte: AbortController };
const descargas = new Map<string, Descarga>();
/** Motores vivos por carpeta y carpetas a punto de soltarse. */
const vivos = new Map<string, number>();
const soltando = new Map<string, number>();
const SOLTAR_MS = 4000;

/**
 * La velocidad de la red se mide acá, con todas las descargas de cuadros de la
 * página: bytes y cuadros bajados y el tiempo con alguna en vuelo. Es de la
 * red, no de un motor (si la escena se rearma, la medida sigue). `latencia`:
 * media móvil de lo que tarda un cuadro desde que se pide hasta tenerlo (ms;
 * 0 = sin medida), para el adelanto de lo que se pide en movimiento.
 */
const red = { bytes: 0, cuadros: 0, ms: 0, desde: 0, enVuelo: 0, latencia: 0 };

/** KB/s medidos hasta ahora, o null si todavía no bajó nada. */
function kbsRed(): number | null {
  const ms = red.ms + (red.enVuelo > 0 ? performance.now() - red.desde : 0);
  return red.bytes > 0 && ms > 0 ? red.bytes / 1024 / (ms / 1000) : null;
}

/** La descarga de `url` (la que ya está, o una nueva). Resuelve null si falla. */
function descargar(url: string): Promise<Blob | null> {
  const previa = descargas.get(url);
  if (previa) return previa.promesa;
  const corte = new AbortController();
  const t0 = performance.now();
  if (red.enVuelo++ === 0) red.desde = t0;
  const promesa = fetch(url, { signal: corte.signal })
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
      } else if (descargas.get(url)?.corte === corte) {
        // Lo que falla no queda: otro motor (o este, más tarde) puede reintentar.
        descargas.delete(url);
      }
      return blob;
    });
  descargas.set(url, { promesa, corte });
  return promesa;
}

function tomarCarpeta(carpeta: string) {
  vivos.set(carpeta, (vivos.get(carpeta) ?? 0) + 1);
  const t = soltando.get(carpeta);
  if (t !== undefined) {
    window.clearTimeout(t);
    soltando.delete(carpeta);
  }
}

function soltarCarpeta(carpeta: string) {
  const quedan = Math.max(0, (vivos.get(carpeta) ?? 1) - 1);
  vivos.set(carpeta, quedan);
  if (quedan > 0 || soltando.has(carpeta)) return;
  soltando.set(
    carpeta,
    window.setTimeout(() => {
      soltando.delete(carpeta);
      if ((vivos.get(carpeta) ?? 0) > 0) return;
      const prefijo = `${carpeta}/`;
      for (const [url, d] of descargas) {
        if (!url.startsWith(prefijo)) continue;
        d.corte.abort();
        descargas.delete(url);
      }
    }, SOLTAR_MS),
  );
}

/** Peso del cuadro de arriba para la parte decimal `t` (0 a 1). */
function pesoFundido(t: number): number {
  const x = Math.min(1, Math.max(0, (t - (1 - FUNDIDO_ANCHO) / 2) / FUNDIDO_ANCHO));
  return x * x * (3 - 2 * x);
}

type Fuente = ImageBitmap | HTMLImageElement;

/** URL pública del cuadro `i` (0 = primero) de una versión. */
export function urlDeCuadro(v: HeroSecuenciaVersion, i: number): string {
  const n = String(v.primero + i).padStart(v.digitos, "0");
  return `${v.carpeta}/${v.patron.replace("{n}", n)}`;
}

/**
 * Índices por pasada, sin repetir: con [8, 1] y 172 cuadros la primera trae
 * 0, 8, 16... y el último (el estado final disponible temprano) y la segunda
 * el resto, en orden.
 */
export function pasadasDeCarga(total: number, pasos: number[]): number[][] {
  const vistos = new Set<number>();
  const pasadas: number[][] = [];
  pasos.forEach((paso, k) => {
    const pasada: number[] = [];
    const sumar = (i: number) => {
      if (!vistos.has(i)) {
        vistos.add(i);
        pasada.push(i);
      }
    };
    for (let i = 0; i < total; i += Math.max(1, paso)) sumar(i);
    if (k === 0) sumar(total - 1);
    if (pasada.length) pasadas.push(pasada);
  });
  return pasadas;
}

export interface MotorSecuencia {
  /** Pide mostrar la posición `f` (cuadro con decimales; se acota al rango). */
  irA(f: number): void;
  /**
   * Usa un <img> que ya está en la página como cuadro `i`, si muestra ese
   * cuadro (su currentSrc incluye la URL del cuadro, también vía next/image).
   * Mientras tanto ese cuadro no se pide (la pasada y los tramos no esperan).
   */
  adoptar(i: number, img: HTMLImageElement): void;
  /**
   * La pasada: baja esos índices (los ya bajados se saltean), lo más cercano a
   * la persona primero. Resuelve al terminar o al destruir.
   */
  cargar(indices: number[]): Promise<void>;
  /**
   * Velocidad de la red medida hasta ahora (KB/s: bytes de cuadros bajados en
   * la página sobre el tiempo con alguna descarga en vuelo), o null si no bajó
   * nada. Anda en todos los navegadores (Safari no expone
   * navigator.connection).
   */
  velocidadRed(): number | null;
  /**
   * Espera una medida que sirva (una tanda de `MUESTRA_RED` cuadros bajados, o
   * la pasada terminada) y devuelve velocidadRed().
   */
  medirRed(): Promise<number | null>;
  /**
   * Carga por tramos: baja los cuadros que faltan dentro de una ventana que
   * sigue a la posición actual, de `TRAMO_ATRAS` cuadros hacia atrás a
   * `horizonte` hacia adelante (o lo que se recorre en `TRAMO_SEGUNDOS` a la
   * velocidad del scroll, si es más), lo más cercano primero y lo de adelante
   * antes. Con el scroll en movimiento rápido, en cambio, lo que la caja va a
   * mostrar cuando llegue (ver `siguiente`). Puede arrancar con la pasada en
   * curso: comparten la cola (lo de los tramos que la caja necesita primero,
   * después la pasada, después el resto del tramo). Sin nada que bajar en la
   * ventana, espera a que se mueva; dormido, a despertar.
   * Resuelve cuando no falta ninguno, al soltar los tramos o al destruir.
   */
  seguir(opciones: { horizonte: number }): Promise<void>;
  /** Corta la carga por tramos (la red resultó lenta): `seguir` resuelve. */
  soltarTramos(): void;
  /**
   * El hero ya pasó y quedó invisible: libera los bitmaps (menos los fijos) y
   * achica el lienzo a 1 px. Mientras duerme no decodifica ni dibuja; los
   * blobs quedan (volver no baja nada de nuevo).
   */
  dormir(): void;
  /** Vuelve a medir el lienzo y a decodificar la ventana del cuadro actual. */
  despertar(): void;
  /**
   * Corta decodificaciones, observers y el frame pendiente, y suelta las
   * descargas (las que siguen en vuelo quedan un rato para otro motor).
   */
  destruir(): void;
}

export function crearMotor({
  canvas,
  version,
  foco,
  escalaMax = () => 1,
  ventana,
  alDibujar,
  concurrencia = CONCURRENCIA,
  segundosEnMovimiento = TRAMO_SEGUNDOS,
}: {
  canvas: HTMLCanvasElement;
  version: HeroSecuenciaVersion;
  /** Foco en % (50/50 = centro), igual que object-position. */
  foco: { x: number; y: number };
  /**
   * Escala CSS máxima que puede tener el canvas (el acercamiento de desktop):
   * el lienzo se mide para verse nítido también agrandado.
   */
  escalaMax?: () => number;
  /** Cuadros decodificados hacia atrás y hacia adelante del actual. */
  ventana: { atras: number; adelante: number };
  /** Se llama una vez, después del primer dibujo. */
  alDibujar?: () => void;
  /** Descargas a la vez (CONCURRENCIA si no se pasa). */
  concurrencia?: number;
  /**
   * Con el scroll en movimiento rápido, cuántos segundos de recorrido hacia
   * adelante se piden (o `horizonte` cuadros, si es más).
   */
  segundosEnMovimiento?: number;
}): MotorSecuencia {
  const total = version.cuadros;
  const blobs: (Blob | undefined)[] = new Array(total);
  const listos: (Fuente | undefined)[] = new Array(total);
  const fijos = new Set<number>();
  const decodificando = new Set<number>();
  const ctx = canvas.getContext("2d");
  const fx = foco.x / 100;
  const fy = foco.y / 100;
  // Las descargas de esta carpeta siguen vivas mientras haya un motor.
  tomarCarpeta(version.carpeta);

  let pos = 0;
  /**
   * Posición que se dibuja: igual a `pos`, salvo mientras se asienta (va de
   * `pos` al cuadro entero más cercano) o ya asentada.
   */
  let vista = 0;
  let quieto = 0;
  let asentando = 0;
  let dir = 1;
  let dibujadoClave = "";
  let exacto = false;
  let raf = 0;
  let muerto = false;
  /** Dormido (dormir): sin bitmaps, lienzo de 1 px, sin decodificar ni dibujar. */
  let dormido = false;
  /** Último tamaño CSS del lienzo (el ResizeObserver avisa también dormido). */
  let tamCss = { w: 0, h: 0 };
  let avisado = false;
  /**
   * Cuadro dominante del último dibujo (el que está en el lienzo): no se
   * libera, así el respaldo de `dibujar` (masCercano) siempre tiene algo tan
   * cercano como lo que ya se ve. -1 = ninguno.
   */
  let mostrado = -1;
  /**
   * Cuadros que se están adoptando (adoptar): no se piden mientras tanto (no
   * se bajan dos veces), pero la cola no los espera para pedir el resto.
   */
  const adoptando = new Set<number>();
  /**
   * El hero ya se ve (despuesDelPintado, lib/pintado.ts): la adopción pide su
   * archivo recién entonces. En una página visible ya pasó al armar (no espera
   * nada); en una pestaña que todavía no se muestra, el pedido no le compite
   * a la primera pintura. Mientras tanto se ve el <img>, el mismo cuadro.
   */
  let pintado: Promise<void> | null = null;
  let cancelarPintado = () => {};
  const esperarPintado = () =>
    (pintado ??= new Promise<void>((resolve) => {
      cancelarPintado = despuesDelPintado(resolve);
    }));
  /** Pedidos en vuelo y los que fallaron (no se piden de nuevo). */
  const enVuelo = new Set<number>();
  const fallidos = new Set<number>();
  /** La pasada pendiente (`cargar`) y la carga por tramos (`seguir`). */
  const pasada = new Set<number>();
  let tramo: { horizonte: number } | null = null;
  /** Promesas de `cargar`, `seguir` y `medirRed` esperando su condición. */
  let esperas: { listo: () => boolean; resolver: () => void }[] = [];
  /** Cuadro entero y sentido de la última ventana avisada (no pedir de más). */
  let ventanaAvisada = "";
  /** Scroll en reposo (VELOCIDAD_PAUSA_MS sin cambios de posición) y su espera. */
  let reposo = false;
  let esperaReposo = 0;
  /** Velocidad del scroll en cuadros por segundo (media móvil) y su última muestra. */
  let velocidad = 0;
  let tVelocidad = 0;
  /** Duración de una decodificación (ms, media móvil). */
  let msDecodificar = DECODIFICAR_MS;
  /** El asentado espera a que se decodifique el cuadro de destino. */
  let asentarPendiente = false;

  /* ---------- Dibujo ---------- */

  /** El cuadro listo más cercano a `f` (o -1 si todavía no hay ninguno). */
  const masCercano = (f: number) => {
    const c = Math.round(f);
    if (listos[c]) return c;
    for (let d = 1; d < total; d++) {
      const a = c - d;
      const b = c + d;
      if (a < 0 && b >= total) break;
      if (a >= 0 && listos[a]) return a;
      if (b < total && listos[b]) return b;
    }
    return -1;
  };

  /**
   * Qué tan lejos de la posición dibujada queda lo mejor que hay para mostrar
   * (en cuadros): el cuadro listo más cercano o, antes del primer dibujo, el
   * <img> de respaldo, que es el cuadro 0.
   */
  const distanciaVisible = () => {
    const n = masCercano(vista);
    const d = n < 0 ? Infinity : Math.abs(n - vista);
    return avisado ? d : Math.min(d, vista);
  };

  const pintar = (img: Fuente, alpha: number) => {
    if (!ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
    const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
    if (!iw || !ih) return;
    // Cover: escala para llenar el marco y recorta alrededor del foco.
    const s = Math.max(cw / iw, ch / ih);
    const dw = iw * s;
    const dh = ih * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (cw - dw) * fx, (ch - dh) * fy, dw, dh);
  };

  /** Uno solo, o dos sumados con sus pesos (interpolación exacta). */
  const componer = (pasos: [Fuente, number][]) => {
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (pasos.length > 1) ctx.globalCompositeOperation = "lighter";
    for (const [img, peso] of pasos) pintar(img, peso);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  };

  const dibujar = () => {
    raf = 0;
    if (muerto || dormido || !ctx || canvas.width < 2 || canvas.height < 2) return;
    const i0 = Math.floor(vista);
    const i1 = Math.min(total - 1, i0 + 1);
    const w = pesoFundido(vista - i0);
    const a = listos[i0];
    const b = listos[i1];
    let clave: string;
    let pasos: [Fuente, number][];
    let dominante: number;
    if (a && (w < EPSILON || i1 === i0)) {
      clave = `${i0}`;
      pasos = [[a, 1]];
      exacto = true;
      dominante = i0;
    } else if (b && w > 1 - EPSILON) {
      clave = `${i1}`;
      pasos = [[b, 1]];
      exacto = true;
      dominante = i1;
    } else if (a && b) {
      // Fundido corto: (1 - w) del de abajo + w del de arriba.
      const wq = Math.round(w * 500) / 500;
      clave = `${i0}+${i1}@${wq}`;
      pasos = [
        [a, 1 - wq],
        [b, wq],
      ];
      exacto = true;
      dominante = wq >= 0.5 ? i1 : i0;
    } else {
      const n = masCercano(vista);
      // Antes del primer dibujo se ve el <img> de respaldo, que es el cuadro
      // 0: el lienzo lo tapa solo con un cuadro más cercano a la posición. Si
      // no, en reposo la pasada podía traer el 8 antes que el bitmap del 0
      // adoptado y los productos aparecían corridos un instante.
      if (n < 0 || (!avisado && n !== 0 && Math.abs(n - vista) >= vista)) {
        return;
      }
      clave = `${n}`;
      pasos = [[listos[n]!, 1]];
      exacto = false;
      dominante = n;
    }
    clave += `|${canvas.width}x${canvas.height}`;
    if (clave === dibujadoClave) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    componer(pasos);
    dibujadoClave = clave;
    mostrado = dominante;
    if (!avisado) {
      avisado = true;
      alDibujar?.();
    }
  };

  const pedirDibujo = () => {
    if (!raf && !muerto && !dormido) raf = requestAnimationFrame(dibujar);
  };

  /* ---------- Asentado en reposo ---------- */

  const cortarAsentado = () => {
    if (quieto) window.clearTimeout(quieto);
    if (asentando) cancelAnimationFrame(asentando);
    quieto = 0;
    asentando = 0;
    asentarPendiente = false;
  };

  /**
   * El scroll se detuvo: si lo que se ve es un fundido a medias, lo termina
   * hacia el cuadro más cercano (curva de salida). Solo cambia lo dibujado.
   */
  const asentar = () => {
    quieto = 0;
    asentarPendiente = false;
    if (muerto || dormido) return;
    // Ya no está en movimiento: se decodifica la ventana entera, lo más
    // cercano primero (en movimiento iba uno de cada `paso`).
    planificar();
    const i0 = Math.floor(vista);
    const w = pesoFundido(vista - i0);
    if (w < EPSILON || w > 1 - EPSILON) return;
    const desde = vista;
    const hasta = Math.min(total - 1, Math.round(vista));
    if (!listos[hasta]) {
      // Se asienta apenas llegue (decodificar).
      asentarPendiente = true;
      return;
    }
    const t0 = performance.now();
    // Resorte `tacto` (lib/fisica): sin sobrepaso visible y sin golpe al
    // llegar. Se acota a 1: pasarse dibujaría un fundido con el vecino.
    const { ease, duration } = resorteGsap("tacto");
    const paso = (ahora: number) => {
      const k = Math.min(1, (ahora - t0) / (duration * 1000));
      const e = k >= 1 ? 1 : Math.min(1, ease(k));
      vista = desde + (hasta - desde) * e;
      dibujar();
      asentando = k < 1 && !muerto ? requestAnimationFrame(paso) : 0;
    };
    asentando = requestAnimationFrame(paso);
  };

  /* ---------- Ventana de decodificación ---------- */

  const rango = () => {
    const c = Math.round(pos);
    const { atras, adelante } = ventana;
    return dir >= 0
      ? { lo: c - atras, hi: c + adelante }
      : { lo: c - adelante, hi: c + atras };
  };

  const liberar = (i: number) => {
    const img = listos[i];
    if (!img || fijos.has(i) || i === mostrado) return;
    if (!(img instanceof HTMLImageElement)) img.close();
    listos[i] = undefined;
  };

  /** Velocidad vigente del scroll (cuadros/s; 0 después de una pausa). */
  const velocidadActual = () =>
    performance.now() - tVelocidad > VELOCIDAD_PAUSA_MS ? 0 : velocidad;

  /**
   * En movimiento (para decodificar y para pedir): uno de cada cuántos
   * cuadros (potencia de 2, hasta 8) a `v` cuadros/s, según lo que dan las
   * decodificaciones medidas (ver IMAGENES_EN_MOVIMIENTO).
   */
  const pasoEnMovimiento = (v: number) => {
    const capacidad = (DECODIFICACIONES * 1000) / msDecodificar;
    const tope = Math.min(
      IMAGENES_EN_MOVIMIENTO,
      capacidad * FRACCION_DECODIFICACION,
    );
    let paso = 1;
    while (paso < 8 && v / paso > tope) paso *= 2;
    return paso;
  };

  const decodificar = async (i: number, blob: Blob) => {
    decodificando.add(i);
    const t0 = performance.now();
    let img: Fuente | null = null;
    try {
      // Al tamaño real: sin resize, todo el trabajo queda fuera del hilo
      // principal (el escalado lo hace drawImage en la GPU). Sin
      // createImageBitmap no se llega acá: el hero queda en "final" (un <img>
      // con blob: lo bloquea la CSP, img-src sin blob:).
      img = await createImageBitmap(blob);
    } catch {
      img = null; // un cuadro que falla no frena la secuencia: se usa el vecino
    }
    decodificando.delete(i);
    if (!img) return;
    msDecodificar = msDecodificar * 0.7 + (performance.now() - t0) * 0.3;
    const { lo, hi } = rango();
    // Fuera de la ventana se queda igual si acerca la caja a la posición más
    // que lo que hay para mostrar (red de seguridad, ver planificar).
    const fuera = i < lo - MARGEN_LIBERAR || i > hi + MARGEN_LIBERAR;
    if (
      muerto ||
      dormido ||
      fijos.has(i) ||
      // Nunca debería haber otro (decodificando lo evita): por las dudas, se
      // queda el que ya estaba (puede ser el que está en el lienzo).
      listos[i] ||
      (fuera && Math.abs(i - vista) >= distanciaVisible())
    ) {
      if (!(img instanceof HTMLImageElement)) img.close();
    } else {
      listos[i] = img;
      const f0 = Math.floor(vista);
      if (i === f0 || i === f0 + 1 || !exacto) {
        dibujadoClave = "";
        pedirDibujo();
      }
      if (asentarPendiente && i === Math.min(total - 1, Math.round(vista))) {
        asentar();
      }
    }
    planificar();
  };

  /**
   * Libera lo lejano y decodifica lo que falta, lo más cercano primero.
   * Red de seguridad: si en la ventana no hay nada bajado, decodifica el
   * cuadro bajado más cercano a la posición aunque quede afuera, si acerca la
   * caja más que lo que hay para mostrar (y no lo libera mientras sea el más
   * cercano). Con el scroll arrancando junto con `load`, la pasada (pedida con
   * la caja en el 0) llegaba con el scroll ya lejos: quedaba fuera de la
   * ventana sin decodificarse y la caja seguía cerrada en el 0 hasta que
   * llegaban los de la posición (hasta ~1.2 s) y después saltaba al final.
   */
  function planificar() {
    if (muerto || dormido) return;
    const { lo, hi } = rango();
    const respaldo = masCercano(vista);
    for (let i = 0; i < total; i++) {
      if (
        listos[i] &&
        i !== respaldo &&
        (i < lo - MARGEN_LIBERAR || i > hi + MARGEN_LIBERAR)
      ) {
        liberar(i);
      }
    }
    if (decodificando.size >= DECODIFICACIONES) return;
    // En movimiento rápido (scroll en los últimos QUIETO_MS), uno de cada
    // `paso` cuadros (pasoEnMovimiento) y el último (donde termina la
    // secuencia: si no, la caja llegaba al final un instante después del
    // scroll); quieto o lento, todos.
    const v = velocidadActual();
    const moviendo =
      v > VEL_MOVIMIENTO && performance.now() - tVelocidad < QUIETO_MS;
    const paso = moviendo ? pasoEnMovimiento(v) : 1;
    const candidatos: number[] = [];
    let bajadosEnVentana = 0;
    for (let i = Math.max(0, lo); i <= Math.min(total - 1, hi); i++) {
      if (fijos.has(i) || !blobs[i]) continue;
      bajadosEnVentana++;
      if (decodificando.has(i)) continue;
      if (paso > 1 && i % paso !== 0 && i !== total - 1) continue;
      if (!listos[i]) candidatos.push(i);
    }
    if (!bajadosEnVentana && !decodificando.size) {
      // Red de seguridad (ver arriba): uno solo a la vez.
      let mejor = -1;
      let dMejor = distanciaVisible();
      for (let i = 0; i < total; i++) {
        if (fijos.has(i) || !blobs[i] || listos[i]) continue;
        const d = Math.abs(i - vista);
        if (d < dMejor) {
          dMejor = d;
          mejor = i;
        }
      }
      if (mejor >= 0) void decodificar(mejor, blobs[mejor]!);
      return;
    }
    // Quieto o lento: lo más cercano primero, los de adelante pesan menos (se
    // llega antes a ellos). En movimiento, la distancia se mide desde donde
    // va a estar la posición cuando termine de decodificarse (`meta`): lo que
    // para entonces ya quedó atrás casi no se llega a ver (pesa el triple).
    const meta = moviendo ? pos + (dir * v * msDecodificar) / 1000 : pos;
    const peso = (i: number) => {
      const d = i - meta;
      if (moviendo) return d * dir >= 0 ? Math.abs(d) : Math.abs(d) * 3;
      return Math.sign(d) === Math.sign(dir) ? Math.abs(d) * 0.6 : Math.abs(d);
    };
    candidatos.sort((a, b) => peso(a) - peso(b));
    for (const i of candidatos) {
      if (decodificando.size >= DECODIFICACIONES) break;
      void decodificar(i, blobs[i]!);
    }
  }

  /* ---------- Descargas: una sola cola ---------- */

  /** Bajado o fallido: no se pide más. */
  const resuelto = (i: number) => !!blobs[i] || fallidos.has(i);
  /** Se puede pedir: en rango, sin bajar, sin pedido en vuelo y sin fallar. */
  const libre = (i: number) =>
    i >= 0 &&
    i < total &&
    !resuelto(i) &&
    !enVuelo.has(i) &&
    !adoptando.has(i);
  /** Mismo criterio que planificar(): distancia a `pos`, lo de adelante x0.6. */
  const peso = (i: number) => {
    const d = i - pos;
    return Math.sign(d) === Math.sign(dir) ? Math.abs(d) * 0.6 : Math.abs(d);
  };
  /** El libre de menor peso entre `lo` y `hi` (o -1). */
  const mejorEntre = (lo: number, hi: number) => {
    let mejor = -1;
    let pesoMejor = Infinity;
    for (let i = Math.max(0, lo); i <= Math.min(total - 1, hi); i++) {
      if (!libre(i)) continue;
      const p = peso(i);
      if (p < pesoMejor) {
        pesoMejor = p;
        mejor = i;
      }
    }
    return mejor;
  };

  /**
   * El primer cuadro libre múltiplo de `paso` desde `desde` (redondeado) hacia
   * donde se scrollea, dentro de `largo` cuadros (o -1).
   */
  const primeroHacia = (desde: number, largo: number, paso: number) => {
    const a = Math.round(desde);
    const s = dir >= 0 ? 1 : -1;
    for (let k = 0; k <= largo; k++) {
      const i = a + s * k;
      if (i < 0 || i >= total) break;
      if (i % paso === 0 && libre(i)) return i;
    }
    return -1;
  };

  /**
   * Con el scroll en movimiento (`v` cuadros/s): lo que la caja va a mostrar
   * cuando el pedido llegue y se decodifique. Arranca adelantado lo que la
   * posición avanza en ese tiempo (latencia medida de la red más
   * DECODIFICAR_MS) y sigue por bandas (BANDA_SEGUNDOS) hasta
   * `segundosEnMovimiento` de recorrido (o `horizonte` cuadros, si es más);
   * cada banda, de lo grueso a lo fino (PASOS_BANDA). -1 si no falta nada.
   */
  const enMovimiento = (v: number, horizonte: number) => {
    const latencia = red.latencia || LATENCIA_INICIAL;
    const adelanto = (v * (latencia + msDecodificar)) / 1000;
    const largo = Math.max(horizonte, Math.ceil(v * segundosEnMovimiento));
    const banda = Math.max(BANDA_MIN, Math.ceil(v * BANDA_SEGUNDOS));
    // Lo que no se va a decodificar en movimiento tampoco se pide (lo de
    // entre medio llega cuando el scroll se frena: INMEDIATO y el tramo).
    const pasoMin = pasoEnMovimiento(v);
    const s = dir >= 0 ? 1 : -1;
    for (let b = 0; b * banda <= largo; b++) {
      const desde = pos + s * (adelanto + b * banda);
      if (desde < -0.5 || desde > total - 0.5) break;
      for (const paso of PASOS_BANDA) {
        if (paso < pasoMin) break;
        const i = primeroHacia(desde, banda - 1, paso);
        if (i >= 0) return i;
      }
    }
    return -1;
  };

  /**
   * El próximo cuadro a bajar, por orden:
   *   1. con tramos (y despierto) y el scroll en movimiento rápido, lo que la
   *      caja va a mostrar cuando llegue (enMovimiento); quieto o lento, lo
   *      INMEDIATO: el cuadro actual y los que siguen hacia donde se
   *      scrollea, lo que la caja tiene que mostrar ya (con la pasada en
   *      curso, solo con el scroll en reposo);
   *   2. la pasada (repartida por todo el recorrido), lo más cercano primero;
   *   3. con tramos y la pasada terminada, el resto de la ventana: de
   *      `TRAMO_ATRAS` hacia atrás a `horizonte` hacia adelante (o lo que la
   *      inercia recorre en TRAMO_SEGUNDOS, si es más), orientada por `dir`.
   * -1 si no hay nada que pedir ahora.
   */
  const siguiente = () => {
    const c = Math.round(pos);
    const conTramo = tramo !== null && !dormido;
    const enPasada = pasada.size > 0;
    const vel = velocidadActual();
    if (conTramo && tramo && vel > VEL_MOVIMIENTO) {
      const i = enMovimiento(vel, tramo.horizonte);
      if (i >= 0) return i;
    } else if (conTramo && (reposo || !enPasada)) {
      const { adelante, atras } = INMEDIATO;
      const i =
        dir >= 0
          ? mejorEntre(c - atras, c + adelante)
          : mejorEntre(c - adelante, c + atras);
      if (i >= 0) return i;
    }
    let mejor = -1;
    let pesoMejor = Infinity;
    for (const i of pasada) {
      if (!libre(i)) continue;
      const p = peso(i);
      if (p < pesoMejor) {
        pesoMejor = p;
        mejor = i;
      }
    }
    if (mejor >= 0 || !conTramo || !tramo || enPasada) return mejor;
    const h = Math.max(tramo.horizonte, Math.ceil(vel * TRAMO_SEGUNDOS));
    return dir >= 0
      ? mejorEntre(c - TRAMO_ATRAS, c + h)
      : mejorEntre(c - h, c + TRAMO_ATRAS);
  };

  /** Resuelve las esperas cumplidas (todas, si el motor murió). */
  const revisarEsperas = () => {
    if (!esperas.length) return;
    const quedan: typeof esperas = [];
    for (const e of esperas) {
      if (muerto || e.listo()) e.resolver();
      else quedan.push(e);
    }
    esperas = quedan;
  };
  const esperar = (listo: () => boolean) =>
    new Promise<void>((resolver) => {
      if (muerto || listo()) resolver();
      else esperas.push({ listo, resolver });
    });

  /** Baja `i` (o toma la descarga de otro motor) y sigue con la cola. */
  const bajar = async (i: number) => {
    enVuelo.add(i);
    const blob = await descargar(urlDeCuadro(version, i));
    enVuelo.delete(i);
    if (muerto) return;
    if (blob) {
      if (!blobs[i]) blobs[i] = blob;
    } else {
      // Un cuadro que falla no frena la secuencia (se usa el vecino) ni se
      // vuelve a pedir en bucle.
      fallidos.add(i);
    }
    pasada.delete(i);
    planificar();
    revisarEsperas();
    bombear();
  };

  /** Llena los lugares libres de la cola (hasta `concurrencia` en vuelo). */
  function bombear() {
    while (!muerto && enVuelo.size < concurrencia) {
      const i = siguiente();
      if (i < 0) return;
      void bajar(i);
    }
  }

  /** La ventana de carga cambió (otro cuadro entero u otro sentido): pedir. */
  const moverVentana = () => {
    const clave = `${Math.round(pos)}|${dir}`;
    if (clave === ventanaAvisada) return;
    ventanaAvisada = clave;
    bombear();
  };

  /** Todos bajados (o fallidos): `seguir` terminó. */
  const completo = () => {
    for (let i = 0; i < total; i++) if (!resuelto(i)) return false;
    return true;
  };

  /* ---------- Tamaño ---------- */

  // Tamaño del lienzo = tamaño de layout (sin las escalas CSS, que se animan)
  // x DPR x acercamiento máximo, sin pasar el tamaño real del cuadro (más no
  // suma detalle). Cambiarlo borra el canvas: se redibuja en el mismo callback
  // (antes del paint).
  const medir = (cssW: number, cssH: number) => {
    if (!(cssW > 0 && cssH > 0)) return;
    tamCss = { w: cssW, h: cssH };
    // Dormido, el lienzo queda en 1 px: el tamaño se aplica al despertar.
    if (dormido) return;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    const z = Math.max(1, escalaMax());
    const tope = Math.min(1, version.ancho / (cssW * dpr * z));
    const w = Math.max(1, Math.round(cssW * dpr * z * tope));
    const h = Math.max(1, Math.round(cssH * dpr * z * tope));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      dibujadoClave = "";
      if (raf) cancelAnimationFrame(raf);
      dibujar();
      planificar();
    }
  };
  const ro = new ResizeObserver((entradas) => {
    const r = entradas[entradas.length - 1]?.contentRect;
    if (r) medir(r.width, r.height);
  });
  ro.observe(canvas);
  {
    const cs = getComputedStyle(canvas);
    medir(parseFloat(cs.width), parseFloat(cs.height));
  }

  return {
    irA(f) {
      const n = Math.min(total - 1, Math.max(0, f));
      if (Math.abs(n - pos) < EPSILON / 2) return;
      // Velocidad del scroll (cuadros/s) para el horizonte de la carga por
      // tramos. Después de una pausa arranca de 0.
      const ahora = performance.now();
      const dt = (ahora - tVelocidad) / 1000;
      if (!tVelocidad || dt * 1000 > VELOCIDAD_PAUSA_MS) {
        velocidad = 0;
      } else if (dt > 0 && Math.abs(n - pos) <= SALTO) {
        const k = 1 - Math.exp(-dt / VELOCIDAD_TAU);
        velocidad += (Math.abs(n - pos) / dt - velocidad) * k;
      }
      tVelocidad = ahora;
      // Reposo: VELOCIDAD_PAUSA_MS sin moverse (lo INMEDIATO puede pasar
      // antes que la pasada en curso).
      reposo = false;
      window.clearTimeout(esperaReposo);
      esperaReposo = window.setTimeout(() => {
        reposo = true;
        bombear();
      }, VELOCIDAD_PAUSA_MS);
      if (n !== pos) dir = n > pos ? 1 : -1;
      pos = n;
      vista = n;
      cortarAsentado();
      quieto = window.setTimeout(asentar, QUIETO_MS);
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      dibujar();
      planificar();
      moverVentana();
    },

    adoptar(i, img) {
      if (i < 0 || i >= total || listos[i] || adoptando.has(i)) return;
      const url = urlDeCuadro(version, i);
      // Mientras se adopta no se pide (no se baja dos veces); si al final no
      // se puede adoptar, se suelta y la cola lo pide como a cualquier otro.
      adoptando.add(i);
      const soltar = () => {
        if (adoptando.delete(i) && !muerto) bombear();
      };
      img
        .decode()
        .then(esperarPintado)
        .then(() => {
          if (muerto || listos[i] || !img.naturalWidth) return;
          let actual = img.currentSrc;
          try {
            actual = decodeURIComponent(actual);
          } catch {
            // URL rara: se compara tal cual.
          }
          if (!actual.includes(url)) return;
          // Marca de bajado (no se vuelve a pedir).
          fijos.add(i);
          blobs[i] = blobs[i] ?? new Blob();
          adoptando.delete(i);
          pasada.delete(i);
          revisarEsperas();
          // El mismo archivo, de la caché, a un bitmap decodificado fuera del
          // hilo principal (como los demás cuadros). Si no se puede, el <img>.
          return fetch(img.currentSrc, { cache: "force-cache" })
            .then((r) => (r.ok ? r.blob() : Promise.reject()))
            .then((blob) => createImageBitmap(blob))
            .catch(() => img)
            .then((fuente) => {
              if (muerto || listos[i]) {
                if (!(fuente instanceof HTMLImageElement)) fuente.close();
                return;
              }
              listos[i] = fuente;
              pedirDibujo();
            });
        })
        .catch(() => {})
        .finally(soltar);
    },

    async cargar(indices) {
      // A la cola (sin esperar a las adopciones: lo que se está adoptando no
      // se pide mientras tanto): cada lugar libre toma el cuadro pendiente
      // más cercano a donde está la persona AHORA (lo de adelante x0.6). Sin
      // scroll es el orden de siempre (0, 8, 16...); si ya bajó antes de que
      // termine `load` (red lenta), el cuadro que toca llega primero y la caja
      // no se queda cerrada esperando toda la pasada.
      const lista = indices.filter((i) => i >= 0 && i < total && !resuelto(i));
      lista.forEach((i) => pasada.add(i));
      bombear();
      await esperar(() => lista.every(resuelto));
    },

    velocidadRed() {
      return kbsRed();
    },

    async medirRed() {
      await esperar(
        () => red.cuadros >= MUESTRA_RED || [...pasada].every(resuelto),
      );
      return kbsRed();
    },

    async seguir({ horizonte }) {
      tramo = { horizonte };
      bombear();
      await esperar(() => !tramo || completo());
    },

    soltarTramos() {
      tramo = null;
      revisarEsperas();
    },

    dormir() {
      if (muerto || dormido) return;
      dormido = true;
      cortarAsentado();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      mostrado = -1;
      for (let i = 0; i < total; i++) liberar(i);
      canvas.width = 1;
      canvas.height = 1;
      dibujadoClave = "";
    },

    despertar() {
      if (muerto || !dormido) return;
      dormido = false;
      dibujadoClave = "";
      // medir redibuja y planifica si el tamaño cambió (siempre, desde 1 px).
      medir(tamCss.w, tamCss.h);
      planificar();
      pedirDibujo();
      // La carga por tramos sigue desde donde quedó.
      bombear();
    },

    destruir() {
      if (muerto) return;
      muerto = true;
      cancelarPintado();
      cortarAsentado();
      window.clearTimeout(esperaReposo);
      // Las esperas terminan; las descargas en vuelo quedan para otro motor
      // (o se cortan solas al soltarse la carpeta).
      revisarEsperas();
      soltarCarpeta(version.carpeta);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      mostrado = -1;
      for (let i = 0; i < total; i++) liberar(i);
    },
  };
}
