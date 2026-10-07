import type { HeroSecuenciaVersion } from "@/content/data";

/* ==========================================================================
 * Plan de la secuencia de cuadros del hero: qué cuadro se dibuja, cuáles se
 * bajan, cuáles se decodifican y cuáles se conservan decodificados. Funciones
 * puras, sin DOM ni GSAP (se prueban con node); el motor
 * (HeroSecuenciaMotor) las aplica.
 *
 * - Tiempos (`tiemposDe`): el timeline mueve el cuadro del VIDEO (0 al
 *   último, con decimales: la coreografía de heroSecuencia) y los archivos
 *   pueden ser más, con cuadros intermedios en los tramos de `densidad`
 *   (donde los productos se mueven mucho por cuadro). Cada archivo tiene su
 *   tiempo en el video y la posición del timeline se lleva a archivos (con
 *   decimales). Lo que se cuenta en imágenes va en archivos: qué se dibuja,
 *   la ventana y la capacidad de decodificación, las prioridades. Lo que se
 *   cuenta en recorrido de scroll va en cuadros del video: la velocidad del
 *   reloj (y sus umbrales), el largo de los tramos de descarga, las bandas y
 *   la grilla de `paso` (con la pasada): con intermedios cubren lo mismo que
 *   sin ellos.
 * - Dibujo: siempre UN cuadro entero (`elegirCuadro`), el archivo de la
 *   posición redondeada si está decodificado; si no, el decodificado más
 *   cercano y, en un empate, el que ya está en el lienzo. Nunca una mezcla de
 *   dos: un fundido entre cuadros seguidos mostraba los productos que suben
 *   dos veces (imagen doble). Lo continuo del movimiento lo ponen los cuadros
 *   intermedios y el scroll suavizado (Lenis) con el scrub directo.
 * - Descargas (`demanda().bajar`): nada antes de que el motor lo pida
 *   (`cargar`, después de `load`). Primero la pasada: 1 de cada PASADA
 *   cuadros del video y el último (`Tiempos.pasada`; nunca un intermedio),
 *   así desde temprano hay cuadros repartidos por todo el recorrido. Con los
 *   tramos habilitados (primer scroll, en una red que da) se suman los
 *   archivos alrededor de donde está la persona (los intermedios, después de
 *   todos los cuadros del video del tramo y con un cupo de descargas en
 *   vuelo: CUPO_INTERMEDIOS). Mientras falta pedir parte de la
 *   pasada, el tramo pasa antes que ella pero con un CUPO de descargas en
 *   vuelo (CUPO_TRAMO, contando las suyas que ya están bajando): el resto de
 *   los lugares es de la pasada. Sin el cupo, cada lugar que se liberaba lo
 *   tomaba el tramo (siempre había cuadros nuevos alrededor de la persona) y
 *   con rueda rápida apenas cargar la pasada salía recién con el scroll
 *   terminado: la caja se congelaba. Con la pasada pedida, el tramo usa todas
 *   las descargas. Quien mira el principio y se va no baja la secuencia
 *   entera; quien la recorre baja cada archivo una vez.
 * - Decodificación (`demanda().decodificar` y `conservar`): solo una ventana
 *   (en cuadros del video) alrededor de donde va a estar la caja, más larga
 *   hacia donde se scrollea, y nunca más bitmaps que los que entran en el
 *   presupuesto de memoria (`Ajustes.capacidad`, el mismo con o sin
 *   intermedios). Lo ya decodificado que todavía está cerca se conserva
 *   mientras entre (ir y volver no decodifica de nuevo).
 * - En movimiento rápido (más de V_MOVIMIENTO cuadros del video por segundo)
 *   se pide y se decodifica lo que la caja va a mostrar cuando el cuadro esté
 *   listo (la posición adelantada lo que tarda) y solo la grilla de `paso`:
 *   todos los archivos (0) o 1 de cada 1, 2, 4 u 8 cuadros del video, lo
 *   justo para mostrar hasta IMAGENES_EN_MOVIMIENTO distintas por segundo sin
 *   pasar de FRACCION_DECODIFICACION de lo que dan las decodificaciones
 *   medidas. Los intermedios son lo primero que se deja: van solo con la
 *   velocidad corta (`Scroll.velCorta`, que sube antes que la media) por
 *   debajo de su propio tope (FRACCION_INTERMEDIOS e IMAGENES_INTERMEDIOS,
 *   más bajo que el de los cuadros del video), con la caja al día
 *   (ATRASO_INTERMEDIOS) y con la pantalla holgada (`crearRitmo`): sirven con
 *   scroll lento, donde cada cambio de cuadro se ve; rápido, la caja ya
 *   avanza varios por cuadro de pantalla. Decodificar todos a 3000 px/s (~240
 *   cuadros por segundo) dejaba la cola siempre llena: lo que salía ya había
 *   quedado atrás y el trabajo le quitaba cuadros de pantalla al scroll. Lo
 *   de entre medio se pide y se decodifica cuando el scroll se frena. En
 *   movimiento:
 *     · no se decodifica nada nuevo que ya quedó atrás de la posición (lo
 *       decodificado se conserva, por si vuelve): con la rueda rápida más de
 *       la mitad de lo decodificado nunca se llegaba a ver;
 *     · el tramo se pide por BANDAS desde donde va a estar la caja cuando el
 *       cuadro llegue, y en cada banda de lo grueso a lo fino (1 de cada 8,
 *       4, 2 y 1 cuadros del video, hasta `paso`): pedir
 *       primero los cuadros seguidos más cercanos traía cuadros que llegaban
 *       con la caja ya pasada (la velocidad medida va por detrás de la real
 *       al arrancar una deslizada).
 * - Prioridad para la decodificación y, en reposo, para la red: la distancia
 *   (en cuadros del video: en archivos, el tramo x3 quedaba tres veces más
 *   lejos de lo que está) a donde va a estar la caja, con lo de adelante más
 *   barato en reposo (PESO_ADELANTE_REPOSO), lo que quedó atrás más caro en
 *   movimiento (PESO_ATRAS_MOVIMIENTO) y los intermedios PENAL_INTERMEDIOS
 *   cuadros más lejos de lo que están.
 * ========================================================================== */

/** Pasada inicial: 1 de cada PASADA cuadros del video, más el último. */
export const PASADA = 8;
/**
 * Sin cambios de posición durante este tiempo (ms), el scroll está en reposo:
 * la velocidad vuelve a 0 y se planifica sin `paso` (todos los archivos).
 */
export const REPOSO_MS = 150;
/** Constante de tiempo (s) de la media móvil de la velocidad del scroll. */
const VEL_TAU_S = 0.25;
/**
 * Constante de tiempo (s) de la velocidad corta (`Scroll.velCorta`): la de
 * los últimos cuadros de pantalla, que sube en unos 3 cuadros de pantalla a
 * 60 Hz donde la media de VEL_TAU_S tarda un cuarto de segundo. Decide si van
 * los intermedios: al arrancar una rueda rápida o un fling, la media venía de
 * 0 y se pedían y decodificaban intermedios de un tramo que la caja iba a
 * pasar de largo (el tramo x3 de desktop arranca en el cuadro 10: con rueda
 * rápida la caja se atrasaba ahí y recuperaba de golpe).
 */
const VEL_CORTA_TAU_S = 0.06;
/**
 * Un cambio de más cuadros del video que esto en un solo paso es un salto (la
 * página ya scrolleada al primer dibujo, un ancla), no velocidad de scroll (a
 * 1000 px/s son ~1 cuadro por paso en desktop y ~2 en mobile).
 */
const SALTO = 24;
/** Velocidad (cuadros del video/s) desde la que se planifica "en movimiento". */
const V_MOVIMIENTO = 20;
/** Tope de imágenes distintas por segundo en movimiento (define `paso`). */
const IMAGENES_EN_MOVIMIENTO = 120;
/** Parte de la capacidad de decodificación medida que se usa en movimiento. */
const FRACCION_DECODIFICACION = 0.66;
/**
 * Los intermedios van solo mientras todos los archivos (cuadros del video más
 * intermedios) a la velocidad corta del scroll no pasan de esta parte de las
 * decodificaciones medidas ni de IMAGENES_INTERMEDIOS por segundo (la red:
 * cada archivo pesa ~45 KB). Con 25 ms por decodificación son 40 imágenes por
 * segundo: unos 13 cuadros del video por segundo en el tramo x3 y 20 en los
 * x2, el scroll lento donde cada cambio de cuadro se ve. Más rápido, la caja
 * ya avanza varios archivos por cuadro de pantalla y los intermedios solo le
 * quitaban decodificaciones a los cuadros del video (con scroll medio la caja
 * iba un poco más atrasada que sin intermedios).
 */
const FRACCION_INTERMEDIOS = 0.33;
const IMAGENES_INTERMEDIOS = 60;
/**
 * En movimiento, con lo que está en el lienzo a estos archivos o más detrás de
 * la posición (la caja va atrasada), no se piden ni se decodifican
 * intermedios hasta alcanzarla (ver `paso`).
 */
const ATRASO_INTERMEDIOS = 3;
/**
 * En movimiento, la ventana de decodificación se estira hacia adelante lo que
 * se recorre en este tiempo (s).
 */
const ADELANTO_DECOD_S = 0.25;
/**
 * Distancia máxima (archivos) del PRIMER dibujo a la posición: el lienzo
 * reemplaza al <img> del servidor (el cuadro 0) en un solo corte limpio. Con
 * la página ya scrolleada (F5 a mitad del hero) se espera al cuadro de la
 * posición en vez de pasar por los de la pasada (0 → 8 → 80 → 77). Si no
 * viene ninguno más cerca (red lenta: solo la pasada), va el más cercano.
 */
export const MAX_PRIMERO = 1.5;
/**
 * Latencia de una descarga (ms) sin medida, y tope de la medida para el
 * adelanto de lo que se pide en movimiento.
 */
export const LATENCIA_INICIAL_MS = 120;
export const LATENCIA_TOPE_MS = 400;
/** Duración de una decodificación (ms) sin medida. */
export const DECODIFICAR_INICIAL_MS = 25;
/**
 * Mientras falta pedir parte de la pasada, el tramo tiene a lo sumo esta
 * fracción de las descargas en vuelo (6 de 12 en una compu, 3 de 6 en un
 * celular); el resto es de la pasada.
 */
const CUPO_TRAMO = 0.5;
/**
 * Fracción de las descargas en vuelo que pueden ser intermedios (6 de 12 en
 * una compu, 3 de 6 en un celular).
 */
const CUPO_INTERMEDIOS = 0.5;
/**
 * Bandas del tramo en movimiento (ver arriba), en cuadros del video: `min`
 * (una pasada: cada banda trae un cuadro de cada grosor) o lo que se recorre
 * en `s` segundos, lo que sea más.
 */
const BANDA = { min: PASADA, s: 0.2 };
/** Pesos de la distancia en la prioridad (ver arriba). */
const PESO_ADELANTE_REPOSO = 0.6;
const PESO_ATRAS_MOVIMIENTO = 3;
/**
 * Cuadros del video que se suman a la prioridad de un intermedio: a igual
 * distancia, los cuadros del video se decodifican y se conservan antes, y un
 * intermedio lejano le deja el lugar a un cuadro del video más lejano todavía
 * (los cercanos siguen saliendo temprano). Sin esto, en reposo los intermedios
 * de alrededor llenaban la capacidad y lo decodificado cubría la mitad del
 * recorrido (en un celular, 19 bitmaps son 9 cuadros del video con intermedios
 * en vez de 19): al arrancar una deslizada faltaban los cuadros del video de
 * adelante y la caja iba más atrasada que sin intermedios.
 */
const PENAL_INTERMEDIOS = 6;
/** Tope de densidad de píxeles de los lienzos (cuadros y tapa). */
export const DPR_MAX = 2;

/** Estado de red de un cuadro. */
export const NADA = 0;
export const BAJANDO = 1;
export const BAJADO = 2;
export const FALLO = 3;

/** URL pública del archivo `i` (0 = primero) de una versión. */
export function urlDeCuadro(v: HeroSecuenciaVersion, i: number): string {
  const n = String(v.primero + i).padStart(v.digitos, "0");
  return `${v.carpeta}/${v.patron.replace("{n}", n)}`;
}

/* ---------- Tiempos: cuadros del video y archivos ---------- */

export interface Tiempos {
  /** Archivos (los cuadros del video más los intermedios). */
  total: number;
  /** Último cuadro del video: el final del timeline (cuadros del video - 1). */
  ultimo: number;
  /** Tiempo de cada archivo, en cuadros del video (enteros los originales). */
  tiempo: Float64Array;
  /**
   * Grilla más gruesa en la que está cada archivo, en cuadros del video:
   * PASADA para los de la pasada (1 de cada PASADA y el último), 4, 2 o 1
   * para los demás cuadros del video y 0 para los intermedios. Un archivo
   * entra en la grilla de `paso` si su escalón es `paso` o más.
   */
  escalon: Uint8Array;
  /** Los archivos de la pasada, en orden. */
  pasada: number[];
  /**
   * Posición en archivos (con decimales) del cuadro del video `t`: lineal
   * entre dos cuadros seguidos del video. Fuera del recorrido sigue la recta
   * del borde (para lo que se adelanta con la velocidad); quien la usa como
   * índice la acota.
   */
  posicion(t: number): number;
  /** Archivos por cuadro del video alrededor de `t` (1, 2 o 3). */
  densidad(t: number): number;
}

/**
 * Los tiempos de una versión (ver `Tiempos`). Sin `densidad`, un archivo por
 * cuadro del video (archivo i = cuadro i). Con `densidad`, cada paso del video
 * dentro de un tramo lleva x archivos: el original y x - 1 intermedios a
 * tiempos parejos.
 */
export function tiemposDe(v: HeroSecuenciaVersion): Tiempos {
  const tramos = v.densidad ?? [];
  const extra = tramos.reduce(
    (s, d) => s + (d.hasta - d.desde) * (d.x - 1),
    0,
  );
  const ultimo = v.cuadros - 1 - extra;
  const tiempo = new Float64Array(v.cuadros);
  const escalon = new Uint8Array(v.cuadros);
  /** Archivo de cada cuadro del video. */
  const archivo = new Int32Array(Math.max(1, ultimo + 1));
  const pasada: number[] = [];
  let i = 0;
  for (let t = 0; t <= ultimo; t++) {
    archivo[t] = i;
    let k = PASADA;
    if (t !== ultimo) while (k > 1 && t % k !== 0) k /= 2;
    if (k === PASADA) pasada.push(i);
    tiempo[i] = t;
    escalon[i++] = k;
    if (t === ultimo) break;
    const x = tramos.find((d) => t >= d.desde && t < d.hasta)?.x ?? 1;
    for (let j = 1; j < x; j++) tiempo[i++] = t + j / x;
  }
  // Datos que no cierran (otra cantidad de archivos que la de `densidad`):
  // quien arma la escena pasa a la versión final (fail-open).
  if (i !== v.cuadros || ultimo < 0) {
    throw new Error(
      `HeroSecuencia: la densidad da ${i} archivos y hay ${v.cuadros}`,
    );
  }
  // Paso entre dos cuadros seguidos del video, el de `t` (acotado al
  // recorrido: fuera de él sigue el del borde).
  const tramoDe = (t: number) =>
    Math.min(Math.max(0, ultimo - 1), Math.max(0, Math.floor(t)));
  return {
    total: v.cuadros,
    ultimo,
    tiempo,
    escalon,
    pasada,
    posicion(t) {
      if (ultimo <= 0) return 0;
      const n = tramoDe(t);
      return archivo[n] + (t - n) * (archivo[n + 1] - archivo[n]);
    },
    densidad(t) {
      if (ultimo <= 0) return 1;
      const n = tramoDe(t);
      return archivo[n + 1] - archivo[n];
    },
  };
}

/* ---------- Reloj: posición, velocidad y sentido del scroll ---------- */

export interface Scroll {
  /** Cuadro del video, con decimales. */
  pos: number;
  /** Cuadros del video por segundo, con signo (0 en reposo). */
  vel: number;
  /**
   * Cuadros del video por segundo de los últimos cuadros de pantalla (media
   * de VEL_CORTA_TAU_S, con signo; 0 en reposo): reacciona antes que `vel`
   * al arrancar y al frenar.
   */
  velCorta: number;
  /** Sentido del último cambio. */
  dir: 1 | -1;
}

/**
 * Lleva la posición (cuadros del video), las velocidades (medias móviles de
 * VEL_TAU_S y VEL_CORTA_TAU_S, que arrancan de 0 después de un reposo y no
 * cuentan los saltos) y el sentido.
 */
export function crearReloj() {
  let pos = 0;
  let vel = 0;
  let velCorta = 0;
  let dir: 1 | -1 = 1;
  let t = -Infinity;
  return {
    marcar(f: number, ahora: number) {
      const dt = (ahora - t) / 1000;
      const df = f - pos;
      if (dt * 1000 >= REPOSO_MS) {
        vel = 0;
        velCorta = 0;
      } else if (dt > 0.002 && Math.abs(df) <= SALTO) {
        const v = df / dt;
        vel += (v - vel) * (1 - Math.exp(-dt / VEL_TAU_S));
        velCorta += (v - velCorta) * (1 - Math.exp(-dt / VEL_CORTA_TAU_S));
      }
      if (df !== 0) dir = df > 0 ? 1 : -1;
      pos = f;
      t = ahora;
    },
    leer(ahora: number): Scroll {
      const reposo = ahora - t >= REPOSO_MS;
      return {
        pos,
        vel: reposo ? 0 : vel,
        velCorta: reposo ? 0 : velCorta,
        dir,
      };
    },
  };
}

/* ---------- Ritmo: ¿la pantalla da abasto? ---------- */

/**
 * Ritmo de los cuadros de pantalla mientras se scrollea: el intervalo entre
 * llamadas seguidas del timeline (los de más de `pausaMs` son pausas y no
 * cuentan) que deja atrás 3 de cada 4 de los últimos `ultimos`. Por encima
 * de `apuradoMs` (uno de cada cuatro cuadros de pantalla, por lo menos, ya
 * llega tarde a 50 por segundo) se dejan los intermedios hasta que vuelve a
 * menos de `holgadoMs`: en un celular de gama media (CPU x4), con los
 * intermedios los cuadros de pantalla de más de 25 ms pasaban del 36 al 50%
 * con el dedo lento; con la pantalla holgada (compu, iPhone) no cambian.
 */
const RITMO = { pausaMs: 100, ultimos: 8, apuradoMs: 20, holgadoMs: 18 };

export function crearRitmo() {
  let previo = -Infinity;
  let holgada = true;
  const recientes: number[] = [];
  return {
    /** Una llamada del timeline con la posición cambiada, en `ahora` (ms). */
    marcar(ahora: number) {
      const dt = ahora - previo;
      previo = ahora;
      if (!(dt > 0 && dt < RITMO.pausaMs)) return;
      recientes.push(dt);
      if (recientes.length > RITMO.ultimos) recientes.shift();
      if (recientes.length < RITMO.ultimos) return;
      const orden = [...recientes].sort((a, b) => a - b);
      const lento = orden[Math.floor(RITMO.ultimos * 0.75)];
      if (lento > RITMO.apuradoMs) holgada = false;
      else if (lento < RITMO.holgadoMs) holgada = true;
    },
    get holgada() {
      return holgada;
    },
  };
}

/* ---------- Ajustes por dispositivo ---------- */

export interface Ajustes {
  /** Descargas a la vez. */
  descargas: number;
  /** Decodificaciones a la vez (corren fuera del hilo principal). */
  decodificaciones: number;
  /** Bitmaps decodificados que entran en el presupuesto de memoria. */
  capacidad: number;
  /**
   * Ventana de decodificación: tope de distancia (cuadros del video) hacia
   * atrás y hacia adelante.
   */
  ventana: { atras: number; adelante: number };
  /**
   * Tramo de descarga, en cuadros del video (con intermedios son más
   * archivos: cubre el mismo recorrido de scroll): hacia atrás, y hacia
   * adelante lo que sea más entre `adelanteMin` cuadros y lo que se recorre
   * en `adelanteS` segundos a la velocidad actual (lo que todavía recorre la
   * inercia de una deslizada).
   */
  tramo: { atras: number; adelanteMin: number; adelanteS: number };
}

/**
 * Presupuesto de bitmaps (bytes): con puntero fino (compu) y táctil
 * (celular, tablet).
 */
const PRESUPUESTO = { fino: 96e6, tactil: 40e6 };
/** Decodificaciones a la vez (corren fuera del hilo principal). */
const DECODIFICACIONES = 3;

/**
 * Ajustes del motor para el dispositivo:
 * - descargas: 12 en desktop con puntero fino y h2/h3 (sin el tope de 6
 *   conexiones de HTTP/1.1); 6 en el resto (en mobile manda la red y los
 *   datos). Más a la vez en una compu con rueda rápida apenas entrar: con
 *   solo la pasada, la caja iba "de a cuotas";
 * - decodificaciones: DECODIFICACIONES en todos lados (más le quitaban
 *   cuadros de pantalla al scroll en una PC de 6 núcleos). También en WebKit
 *   (Safari y todo navegador de iPhone y iPad): con 1 o 2, en deslizadas
 *   medias y rápidas la caja salteaba de a 2 a 8 cuadros y se atrasaba;
 * - memoria: 96 MB con puntero fino (26 bitmaps de 720x1280) y 40 MB en
 *   táctiles (19 de 540x960 en un celular; 10 de 720x1280 en una tablet con
 *   la versión desktop). Cada bitmap es el cuadro entero: ancho x alto x 4.
 *   Los intermedios no cambian el tope: son más archivos, no más memoria.
 *   WebKit recarga la pestaña si se queda sin memoria: ahí la capacidad
 *   descuenta las decodificaciones en vuelo (salvo una), así el pico
 *   (conservados + el mostrado + en vuelo) es de 21 bitmaps de 540x960
 *   (~43 MB), igual que con una sola decodificación;
 * - ventana: 8 cuadros del video hacia atrás y 20 hacia adelante en desktop,
 *   4 y 12 en mobile (la capacidad la recorta: con intermedios entran menos
 *   cuadros del video, los más cercanos);
 * - tramos: 4 cuadros del video hacia atrás; hacia adelante 40 cuadros o 1 s
 *   de recorrido en desktop, 48 o 0.5 s en mobile (dos deslizadas en un
 *   celular bajaban el 86% de la secuencia con 2 s; con 0.5 s, el 52%).
 */
export function ajustesPara({
  desktop,
  punteroFino,
  webkit,
  multiplexa,
  version,
}: {
  /** Versión desktop de la escena (también en una tablet apaisada). */
  desktop: boolean;
  punteroFino: boolean;
  /** Safari o cualquier navegador de iPhone y iPad (menos memoria). */
  webkit: boolean;
  /** La página llegó por h2 o h3. */
  multiplexa: boolean;
  version: Pick<HeroSecuenciaVersion, "ancho" | "alto">;
}): Ajustes {
  const fino = desktop && punteroFino;
  const presupuesto = fino ? PRESUPUESTO.fino : PRESUPUESTO.tactil;
  const entran = Math.floor(presupuesto / (version.ancho * version.alto * 4));
  return {
    descargas: fino && multiplexa ? 12 : 6,
    decodificaciones: DECODIFICACIONES,
    capacidad: Math.max(
      4,
      webkit ? entran - (DECODIFICACIONES - 1) : entran,
    ),
    ventana: desktop ? { atras: 8, adelante: 20 } : { atras: 4, adelante: 12 },
    tramo: desktop
      ? { atras: 4, adelanteMin: 40, adelanteS: 1 }
      : { atras: 4, adelanteMin: 48, adelanteS: 0.5 },
  };
}

/* ---------- Demanda: qué bajar, qué decodificar, qué conservar ---------- */

export interface EstadoCuadros {
  /** Los archivos en el tiempo del video (tiemposDe). */
  tiempos: Tiempos;
  /** Estado de red de cada archivo (NADA, BAJANDO, BAJADO o FALLO). */
  red: ArrayLike<number>;
  /** ¿Hay bitmap del archivo? */
  decodificado(i: number): boolean;
  /** ¿Se está decodificando? */
  decodificando(i: number): boolean;
  /** El archivo que está en el lienzo (-1: ninguno). */
  mostrado: number;
  /** ¿Falta bajar algo de la pasada que se pidió? */
  pasadaPendiente: boolean;
}

export interface Medidas {
  latenciaMs: number;
  decodificarMs: number;
  /** Carga por tramos habilitada. */
  tramos: boolean;
  /** La pantalla sigue el ritmo (`crearRitmo`): si no, sin intermedios. */
  holgada: boolean;
}

export interface Demanda {
  /** Archivos para bajar, en orden. */
  bajar: number[];
  /** Archivos bajados para decodificar, en orden (todos dentro de `conservar`). */
  decodificar: number[];
  /**
   * Los bitmaps que se quedan (los demás se liberan): a lo sumo `capacidad`
   * más el mostrado.
   */
  conservar: Set<number>;
  /**
   * Grilla de lo que se pide y se decodifica: 0, todos los archivos (en
   * reposo o lento); si no, 1 de cada `paso` cuadros del video (1, 2, 4 u 8;
   * sin los intermedios).
   */
  paso: number;
}

/**
 * Lo que el motor tiene que hacer ahora, para el scroll `s` y el estado `e`.
 * Pura: el motor la vuelve a calcular cada vez que algo cambia (una vez por
 * cuadro de pantalla como mucho).
 */
export function demanda(
  s: Scroll,
  e: EstadoCuadros,
  a: Ajustes,
  m: Medidas,
): Demanda {
  const t = e.tiempos;
  const { total } = t;
  const v = Math.abs(s.vel);
  /** La velocidad que manda para los intermedios: la que suba antes. */
  const vCorta = Math.max(v, Math.abs(s.velCorta));
  const moviendo = v > V_MOVIMIENTO;
  const x = t.posicion(s.pos);
  /** Decodificaciones medidas por segundo. */
  const decodifica = (a.decodificaciones * 1000) / m.decodificarMs;
  const tope = Math.min(
    IMAGENES_EN_MOVIMIENTO,
    decodifica * FRACCION_DECODIFICACION,
  );
  const topeIntermedios = Math.min(
    IMAGENES_INTERMEDIOS,
    decodifica * FRACCION_INTERMEDIOS,
  );
  // `paso`: lo justo para no pasar de `tope` imágenes por segundo. Los
  // intermedios (paso 0) van solo si todos los archivos, a la velocidad
  // corta (la que ya subió al arrancar o al dar la vuelta, cuando la media
  // todavía viene de 0), no pasan de su propio tope, con la pantalla holgada
  // (`Medidas.holgada`) y con la caja al día (ATRASO_INTERMEDIOS): atrasada,
  // decodificar todos los archivos la dejaba más atrás todavía.
  const atrasada =
    e.mostrado >= 0 && (x - e.mostrado) * s.dir >= ATRASO_INTERMEDIOS;
  let paso =
    m.holgada && !atrasada && vCorta * t.densidad(s.pos) <= topeIntermedios
      ? 0
      : 1;
  if (moviendo && v > tope) {
    while (paso < PASADA && v / paso > tope) paso *= 2;
  }
  // El último siempre (escalón PASADA): si no, la caja llegaba al final un
  // instante después que el scroll.
  const enGrilla = (i: number) => t.escalon[i] >= paso;
  /** Prioridad de `i` con la caja en `ref` (cuadro del video): menos, antes. */
  const prioridad = (i: number, ref: number) => {
    const d = (t.tiempo[i] - ref) * s.dir;
    const base =
      d >= 0
        ? moviendo
          ? d
          : d * PESO_ADELANTE_REPOSO
        : moviendo
          ? -d * PESO_ATRAS_MOVIMIENTO
          : -d;
    return t.escalon[i] ? base : base + PENAL_INTERMEDIOS;
  };
  const acotar = (i: number) => Math.min(total - 1, Math.max(0, i));
  const porPrioridad = (adelantoMs: number) => {
    const ref = s.pos + (s.vel * adelantoMs) / 1000;
    return (i: number, j: number) => prioridad(i, ref) - prioridad(j, ref);
  };

  // 1 · Decodificación, alrededor de donde va a estar la caja cuando termine
  // de decodificarse. Candidatos: lo ya decodificado (o decodificándose) a no
  // más de `adelante` del centro, hacia los dos lados, y lo bajado de la
  // grilla dentro de la ventana (en movimiento, desde la posición hacia
  // adelante); los de mejor prioridad hasta la capacidad. La ventana va en
  // cuadros del video (con intermedios son más archivos y la capacidad se
  // queda con los más cercanos): en archivos, sin los intermedios (`paso`)
  // quedaba un tercio de los cuadros del video por delante y con scroll medio
  // la caja se atrasaba.
  const tDecod = m.decodificarMs;
  const centroT = s.pos + (s.vel * tDecod) / 1000;
  const { atras } = a.ventana;
  const adelante = moviendo
    ? Math.max(a.ventana.adelante, Math.ceil(v * ADELANTO_DECOD_S))
    : a.ventana.adelante;
  const borde = (dt: number) => acotar(Math.round(t.posicion(centroT + dt)));
  const lo = borde(s.dir > 0 ? -atras : -adelante);
  const hi = borde(s.dir > 0 ? adelante : atras);
  const loConservar = Math.min(lo, borde(-a.ventana.adelante));
  const hiConservar = Math.max(hi, borde(a.ventana.adelante));
  const candidatos: number[] = [];
  for (let i = loConservar; i <= hiConservar; i++) {
    const tiene = e.decodificado(i) || e.decodificando(i);
    const nuevo =
      i >= lo &&
      i <= hi &&
      e.red[i] === BAJADO &&
      enGrilla(i) &&
      (!moviendo || (i - x) * s.dir > -0.5);
    if (tiene || nuevo) candidatos.push(i);
  }
  candidatos.sort(porPrioridad(tDecod));
  const elegidos = candidatos.slice(0, a.capacidad);
  const conservar = new Set(elegidos);
  if (e.mostrado >= 0) conservar.add(e.mostrado);
  const decodificar = elegidos.filter(
    (i) => !e.decodificado(i) && !e.decodificando(i),
  );

  // 2 · Red: el tramo (donde va a estar la caja cuando el cuadro llegue y se
  // decodifique) y lo que falta de la pasada. Mientras falta pedir parte de
  // la pasada, del tramo pasan primero solo los que entran en su cupo de
  // descargas en vuelo (CUPO_TRAMO, descontadas las suyas que ya bajan),
  // después la pasada y al final el resto del tramo.
  const bajar: number[] = [];
  const sumados = new Uint8Array(total);
  const sumar = (i: number) => {
    if (sumados[i] || e.red[i] !== NADA) return;
    sumados[i] = 1;
    bajar.push(i);
  };
  const pasada = e.pasadaPendiente
    ? t.pasada.filter((i) => e.red[i] === NADA).sort(porPrioridad(0))
    : [];
  if (m.tramos) {
    // El largo, en cuadros del video; los extremos, en archivos.
    const largo = Math.max(
      a.tramo.adelanteMin,
      Math.ceil(v * a.tramo.adelanteS),
    );
    const extremo = (dt: number) => acotar(Math.round(t.posicion(s.pos + dt)));
    const desde = extremo(s.dir > 0 ? -a.tramo.atras : -largo);
    const hasta = extremo(s.dir > 0 ? largo : a.tramo.atras);
    let tramo: number[] = [];
    for (let i = desde; i <= hasta; i++) {
      if (enGrilla(i) && e.red[i] === NADA) tramo.push(i);
    }
    if (moviendo) {
      // Por bandas desde donde va a estar la caja cuando el cuadro llegue;
      // en cada una, de lo grueso (la pasada) a lo fino. Lo de atrás de ese
      // punto, al final (lo más cercano primero). Las bandas, en cuadros del
      // video, como la grilla.
      const llega = s.pos + (s.vel * (m.latenciaMs + m.decodificarMs)) / 1000;
      const banda = Math.max(BANDA.min, Math.ceil(v * BANDA.s));
      const fino = (i: number) => {
        const k = t.escalon[i];
        return k ? Math.log2(PASADA / k) : Math.log2(PASADA) + 1;
      };
      const grosores = Math.log2(PASADA) + 2;
      const orden = (i: number) => {
        const d = (t.tiempo[i] - llega) * s.dir;
        if (d < 0) return 1e9 - d;
        return Math.floor(d / banda) * grosores + fino(i) + d / (t.ultimo + 1);
      };
      tramo.sort((i, j) => orden(i) - orden(j));
    } else {
      tramo.sort(porPrioridad(m.latenciaMs + m.decodificarMs));
    }
    // Los intermedios, después de todos los cuadros del video del tramo (cada
    // grupo en ese orden) y ocupando a lo sumo CUPO_INTERMEDIOS de las
    // descargas en vuelo (contando los suyos que ya bajan). Un intermedio solo
    // mejora el scroll lento; un cuadro del video que falta deja la caja en
    // los de la pasada. Con la red justa, los intermedios cercanos antes que
    // los cuadros del video de más adelante dejaban la caja sin cuadros unos
    // segundos después (saltos de hasta 8 cuadros), y sin el cupo, al acelerar
    // los cuadros del video que pasaban a hacer falta esperaban detrás de
    // intermedios ya pedidos (una descarga no se corta; con la red cargada
    // tardaban de 300 a 800 ms). Así, en el peor caso, la caja anda como sin
    // intermedios.
    const intermedios = tramo.filter((i) => t.escalon[i] === 0);
    if (intermedios.length) {
      let cupoInter = Math.floor(a.descargas * CUPO_INTERMEDIOS);
      for (let i = 0; i < total; i++) {
        if (e.red[i] === BAJANDO && t.escalon[i] === 0) cupoInter--;
      }
      tramo = tramo
        .filter((i) => t.escalon[i] > 0)
        .concat(intermedios.slice(0, Math.max(0, cupoInter)));
    }
    let cupo = tramo.length;
    if (pasada.length) {
      cupo = Math.floor(a.descargas * CUPO_TRAMO);
      for (let i = 0; i < total; i++) {
        if (e.red[i] === BAJANDO && t.escalon[i] < PASADA) cupo--;
      }
    }
    tramo.slice(0, Math.max(0, cupo)).forEach(sumar);
    pasada.forEach(sumar);
    tramo.forEach(sumar);
  } else {
    pasada.forEach(sumar);
  }
  return { bajar, decodificar, conservar, paso };
}

/* ---------- Qué cuadro se dibuja ---------- */

/**
 * El archivo que se dibuja en la posición `pos` (cuadro del video, con
 * decimales): el de la posición redondeada (en archivos) si `tiene` su
 * bitmap; si no, el decodificado más cercano EN TIEMPO del video (en un
 * empate, el de atrás según el sentido `dir`: la caja no se adelanta para
 * después volver) o el que ya está en el lienzo (`mostrado`) si queda igual
 * de cerca. -1 si no hay ninguno. La distancia va en tiempo y no en archivos:
 * con los intermedios sin decodificar (`paso` 1 o más), en archivos el
 * intermedio de la posición empataba a los dos cuadros del video vecinos y
 * ganaba el de atrás, la caja cambiaba de cuadro medio cuadro tarde (atraso
 * de 0.75 en vez de 0.5 en los tramos x2).
 */
export function elegirCuadro(
  pos: number,
  dir: 1 | -1,
  t: Tiempos,
  tiene: (i: number) => boolean,
  mostrado: number,
): number {
  const { total } = t;
  const c = Math.min(total - 1, Math.max(0, Math.round(t.posicion(pos))));
  if (tiene(c)) return c;
  const dist = (i: number) => Math.abs(t.tiempo[i] - pos);
  let atras = -1;
  for (let i = c - 1; i >= 0 && atras < 0; i--) if (tiene(i)) atras = i;
  let adelante = -1;
  for (let i = c + 1; i < total && adelante < 0; i++) {
    if (tiene(i)) adelante = i;
  }
  let n: number;
  if (atras < 0 || adelante < 0) {
    n = atras < 0 ? adelante : atras;
  } else {
    const da = dist(atras);
    const dd = dist(adelante);
    n = da < dd ? atras : dd < da ? adelante : dir > 0 ? atras : adelante;
  }
  if (
    n >= 0 &&
    mostrado >= 0 &&
    mostrado !== n &&
    tiene(mostrado) &&
    dist(mostrado) <= dist(n)
  ) {
    return mostrado;
  }
  return n;
}
