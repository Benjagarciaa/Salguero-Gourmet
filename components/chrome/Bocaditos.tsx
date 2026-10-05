"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import { resorteGsap } from "@/lib/fisica";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useAfterIdle } from "@/lib/useAfterIdle";
import { cn } from "@/lib/cn";
import styles from "./Bocaditos.module.css";

/**
 * Bocaditos que caen: capa decorativa fija, por detrás de todo el contenido
 * (arriba del fondo ambiental). Son los recortes reales de los productos de la
 * caja, cayendo a lo largo de TODA la página con profundidad de campo, como en
 * una foto:
 *
 * - Fondo: grandes, desenfocados, oscurecidos hacia el marrón de la página y
 *   lentos. Pueden pasar por detrás del texto (en mobile son la presencia
 *   principal): vienen tonados de fábrica para que nunca bajen el contraste.
 * - Lejos: más chicos y apenas desenfocados; en los costados libres (desktop)
 *   o, como el fondo, por detrás del texto (mobile y tablet).
 * - Medio y cerca: nítidos, pocos y solo en las secciones tranquilas; en los
 *   costados libres (desktop) o asomando desde el borde (mobile y tablet).
 *
 * El desenfoque NO es un `filter: blur` en vivo: son variantes ya desenfocadas y
 * al tamaño justo (`public/media/productos/fondo` y `nitido`, generadas con
 * sharp; ver `variante`). Las de fondo traen margen transparente para que el
 * desenfoque no se corte.
 *
 * Cuántas piezas hay en cada zona lo decide el MAPA de densidad (abajo): más en
 * las secciones tranquilas, poco en las escenas pesadas y nada en el hero, la
 * intro de la galería y las letras gigantes de Empresas. Las transiciones son graduales en
 * el espacio (rampas entre secciones) y en el tiempo (cada pieza sube y baja su
 * opacidad con suavizado): nunca aparecen ni desaparecen de golpe.
 *
 * Reglas:
 * - Pura decoración: aria-hidden, sin eventos de puntero, alt vacío.
 * - Un único loop en `gsap.ticker` escribe transform y opacity: cero re-renders
 *   de React por cuadro, sin listeners de scroll. El `y` de cada pieza es
 *   función del scroll (continuo aunque una escena se fije o se suelte). El rAF
 *   de SmoothScroll llama a lenis.raf ANTES del tick de GSAP: el scroll que se
 *   lee en el tick ya es el que se pinta en este cuadro (Lenis ya deshizo el
 *   salto nativo de un ancla o de un foco durante su scroll suave). Se pausa con
 *   la pestaña oculta y no hace nada cuando en la ventana no puede haber
 *   ninguna pieza (hero, intro de la galería).
 * - Capa de GPU (will-change) solo para las piezas vivas: el atributo
 *   `data-viva` se pone cuando su opacidad deja de ser 0 y se saca cuando vuelve
 *   a 0 (Bocaditos.module.css). El transform es 2D: una pieza apagada no es
 *   capa.
 * - Nodos reciclados: una cantidad fija de piezas por tramo; cada vez que una da
 *   la vuelta (fuera de pantalla) cambia de producto. La imagen se pide recién
 *   cuando la pieza puede verse (en pantalla y con densidad en el mapa: nunca
 *   en el hero) y la pieza espera a que cargue para aparecer. Cada archivo se
 *   baja UNA vez: queda retenido en `retenidas` (abajo) y, cuando otra pieza (o
 *   la misma, en otra vuelta) lo vuelve a usar, sale de la memoria en el acto.
 * - Se monta recién en idle (no compite con la hidratación ni con el LCP) y con
 *   reduced-motion no se renderiza. Su código viaja aparte (Decoracion).
 * - Las nítidas nunca pisan el texto: lo visible (más su vaivén) se limita al
 *   costado libre (margen del Container de 1160px + su gutter de 24px).
 */

type Producto =
  | "alfajor"
  | "brownie"
  | "budin"
  | "cafe"
  | "cookie"
  | "granola"
  | "jugo"
  | "lemonie"
  | "medialuna"
  | "mermelada"
  | "sandwich"
  | "scon"
  | "yogur";

const TODOS: Producto[] = [
  "medialuna",
  "alfajor",
  "cafe",
  "scon",
  "cookie",
  "budin",
  "yogur",
  "brownie",
  "lemonie",
  "sandwich",
  "mermelada",
  "granola",
  "jugo",
];
/**
 * Los de tono claro. Tonados y desenfocados siguen leyéndose como producto; los
 * oscuros (brownie, cookie, mermelada) quedan casi del color del fondo. En
 * mobile y tablet, donde hay pocas piezas de fondo y cada una cuenta, van solo
 * estos.
 */
const CLAROS: Producto[] = [
  "medialuna",
  "alfajor",
  "scon",
  "budin",
  "lemonie",
  "sandwich",
  "yogur",
  "jugo",
  "granola",
  "cafe",
];
/**
 * Fondo en desktop: los claros más dos oscuros que, en los costados, dan
 * profundidad sin ocupar lugares vacíos (la cookie tonada no se ve).
 */
const FONDO_ANCHO: Producto[] = [...CLAROS, "brownie", "mermelada"];
/** Los más livianos (mobile y tablet: solo asoman, no hace falta el surtido entero). */
const LIVIANOS: Producto[] = [
  "medialuna",
  "alfajor",
  "scon",
  "lemonie",
  "sandwich",
  "yogur",
  "mermelada",
  "jugo",
];

type Plano = "fondo" | "lejos" | "medio" | "cerca";
/** Capa de densidad: el mapa reparte por separado las desenfocadas y las nítidas. */
type Capa = "fondo" | "nitidas";
const CAPA: Record<Plano, Capa> = {
  fondo: "fondo",
  lejos: "fondo",
  medio: "nitidas",
  cerca: "nitidas",
};

/* ==========================================================================
 * MAPA DE DENSIDAD (el único lugar donde se decide cuánto hay en cada zona).
 * Cada entrada es un selector de la página y cuánto de cada capa lleva, de 0 a
 * 1 (1 = todas las piezas de esa capa del tramo). Las entradas de más abajo
 * pisan a las de más arriba donde se superponen (así la intro pisa a la
 * galería). Lo que no cubre ninguna entrada toma el valor de sus vecinas.
 * `0 y 0` es zona PROHIBIDA: ninguna pieza la pisa nunca (se apagan antes de
 * llegar, midiendo su borde real). Una escena fijada con ScrollTrigger se mide
 * con su `.pin-spacer` (todo el tiempo que queda fija).
 * Excepciones manuales en cualquier sección: `data-sin-bocaditos` (nada) y
 * `data-con-bocaditos` (todas).
 * ========================================================================== */
interface Densidad {
  sel: string;
  fondo: number;
  nitidas: number;
}
const MAPA: Densidad[] = [
  // Hero: la caja es la protagonista.
  { sel: "#inicio", fondo: 0, nitidas: 0 },
  { sel: "#servicios", fondo: 0.9, nitidas: 0.8 },
  // La galería de costado es una escena pesada: poco y solo desenfocadas.
  { sel: "#galeria", fondo: 0.35, nitidas: 0 },
  // Intro de la galería: el video a pantalla completa.
  { sel: '#galeria [data-g="intro"]', fondo: 0, nitidas: 0 },
  // La cocina de Flor.
  { sel: 'section[aria-labelledby="flor-titulo"]', fondo: 0.9, nitidas: 0.8 },
  { sel: "#resenas", fondo: 0.35, nitidas: 0 },
  // Cómo trabajamos (la sección del mapa del recorrido).
  { sel: "section:has([data-lienzo])", fondo: 0.3, nitidas: 0 },
  // Empresas (palabras gigantes) y cualquier otra marcada a mano.
  { sel: "[data-sin-bocaditos]", fondo: 0, nitidas: 0 },
  { sel: "#faq", fondo: 0.8, nitidas: 1 },
  { sel: "#cotizar", fondo: 0.7, nitidas: 0.8 },
  { sel: "main ~ footer", fondo: 0.9, nitidas: 0.8 },
  { sel: "[data-con-bocaditos]", fondo: 1, nitidas: 1 },
];

/**
 * Variantes de cada recorte (generadas con sharp desde los recortes originales
 * en alta, que quedan fuera de public en `_assets/productos-recortes`; lienzos
 * de 256px):
 * - fondo/<p>-2.webp: producto al 70% del lienzo, desenfoque fuerte (sigma 5%
 *   del producto). fondo/<p>-1.webp: producto al 84%, desenfoque suave (2.5%).
 *   Las dos tonadas: la luminancia se lleva por debajo de 0.044 (conservando el
 *   modelado del producto) y el color se corre hacia un ámbar tostado, así lo
 *   que pasa por detrás del texto nunca lo deja por debajo de AA (medido sobre
 *   los archivos ya comprimidos: crema-dim sobre la pieza 4.6:1 como mínimo,
 *   crema 9:1).
 * - nitido/<p>.webp (280px) y nitido/<p>-chico.webp (176px): el recorte achicado
 *   a 2x de su tamaño en pantalla.
 * En public quedan solo las que usa algún surtido: fondo de todos menos la
 * cookie (FONDO_ANCHO y CLAROS), nítidas grandes de TODOS y chicas de LIVIANOS.
 * Si un surtido suma un producto, hay que generar su variante.
 */
type Nivel = 1 | 2;
const LIENZO: Record<Nivel, number> = { 1: 0.84, 2: 0.7 };
function variante(plano: Plano, tramo: Tramo) {
  if (plano === "medio" || plano === "cerca") {
    const sufijo = tramo.chico ? "-chico" : "";
    return {
      lienzo: 1,
      archivo: (p: Producto) => `/media/productos/nitido/${p}${sufijo}.webp`,
    };
  }
  const nivel: Nivel = plano === "fondo" ? (tramo.nivelFondo ?? 2) : 1;
  return {
    lienzo: LIENZO[nivel],
    archivo: (p: Producto) => `/media/productos/fondo/${p}-${nivel}.webp`,
  };
}

interface Pieza {
  plano: Plano;
  /** Producto con el que arranca; al dar cada vuelta pasa a otro del surtido. */
  producto: Producto;
  /**
   * "izq" / "der": en ese costado libre, sin pisar texto (`pos` 0 = pegada al
   * borde de la pantalla, 1 = pegada al contenido; negativa = parte afuera).
   * "libre": en todo el ancho, por detrás del texto (solo planos desenfocados);
   * `pos` es el centro como fracción del ancho (puede salirse de los bordes).
   */
  lado: "izq" | "der" | "libre";
  /** Escala propia dentro de su plano (variedad de tamaños), ~0.85 a 1.15. */
  escala: number;
  pos: number;
  /** Sentido del giro. */
  giro: 1 | -1;
}

interface Tramo {
  /**
   * Piezas del tramo. El orden dentro de cada capa es la prioridad: donde el
   * mapa pide poca densidad quedan solo las primeras.
   */
  piezas: Pieza[];
  /** Tamaño base en px del producto visible en cada plano. */
  tam: Record<Plano, number>;
  /** Fracción mínima visible de una nítida cuando no entra en el costado. */
  asomo: number;
  /** Aire mínimo entre lo visible de una nítida y el texto, en px. */
  aire: number;
  /** Factor del vaivén horizontal de las nítidas (en el gutter casi no hay lugar). */
  vaiven?: number;
  /** Variantes nítidas chicas (176px) en vez de las de 280px. */
  chico?: boolean;
  /**
   * Desenfoque del plano de fondo (2 = fuerte, por defecto). En mobile y tablet
   * va el suave: las piezas son pocas y grandes y así se reconocen.
   */
  nivelFondo?: Nivel;
  /**
   * Factor de la velocidad de caída de todos los planos (1 por defecto). En
   * pantallas bajas y páginas largas (mobile) las piezas lentas se quedaban
   * miles de px en el mismo lugar: más rápido, van apareciendo a lo largo de
   * toda la página y rotan de producto más seguido.
   */
  vel?: number;
  /** Productos que van rotando en cada capa. */
  surtido: Record<Capa, Producto[]>;
}

interface ComportamientoPlano {
  /** px de caída por px de scroll. */
  vel: number;
  opacidad: number;
  /** Recorrido extra fuera de pantalla, en altos de pantalla (espacia las vueltas). */
  extra: number;
  /** Amplitud en px de la flotación vertical (con el tiempo). */
  flota: number;
  /** Amplitud en px del vaivén horizontal. */
  vaiven: number;
  /** Grados por px de scroll y grados por segundo. */
  giroScroll: number;
  giroTiempo: number;
  /** Radianes por segundo de la flotación (las lejanas, más lentas). */
  ritmo: number;
  /** Desfase del plano en el recorrido (los planos no arrancan juntos). */
  desfase: number;
  /** Orden de apilado dentro de la capa. */
  z: number;
}

/** Comportamiento de cada plano (el tamaño lo pone el tramo). */
const PLANOS: Record<Plano, ComportamientoPlano> = {
  fondo: { vel: 0.16, opacidad: 1, extra: 0.15, flota: 10, vaiven: 14, giroScroll: 0.006, giroTiempo: 0.8, ritmo: 0.45, desfase: 0.07, z: 1 },
  lejos: { vel: 0.22, opacidad: 1, extra: 0.4, flota: 3, vaiven: 5, giroScroll: 0.014, giroTiempo: 1.3, ritmo: 0.6, desfase: 0.29, z: 2 },
  medio: { vel: 0.32, opacidad: 0.86, extra: 1.25, flota: 4, vaiven: 7, giroScroll: 0.024, giroTiempo: 2.1, ritmo: 0.7, desfase: 0.53, z: 3 },
  cerca: { vel: 0.6, opacidad: 0.97, extra: 1.7, flota: 6, vaiven: 10, giroScroll: 0.036, giroTiempo: 2.8, ritmo: 0.7, desfase: 0.81, z: 4 },
};

/** >= 1380px: costados de 110px o más. */
const ANCHO: Tramo = {
  tam: { fondo: 210, lejos: 64, medio: 100, cerca: 144 },
  asomo: 0.6,
  aire: 8,
  surtido: { fondo: FONDO_ANCHO, nitidas: TODOS },
  piezas: [
    { plano: "fondo", producto: "medialuna", lado: "libre", escala: 1.1, pos: 0.07, giro: 1 },
    { plano: "fondo", producto: "cafe", lado: "libre", escala: 0.95, pos: 0.9, giro: -1 },
    { plano: "lejos", producto: "brownie", lado: "izq", escala: 1.1, pos: 0.9, giro: 1 },
    { plano: "lejos", producto: "lemonie", lado: "der", escala: 1.05, pos: 0.85, giro: -1 },
    { plano: "fondo", producto: "scon", lado: "libre", escala: 1, pos: 0.58, giro: 1 },
    { plano: "lejos", producto: "granola", lado: "der", escala: 0.95, pos: 1, giro: 1 },
    { plano: "fondo", producto: "mermelada", lado: "libre", escala: 0.9, pos: 0.3, giro: -1 },
    { plano: "lejos", producto: "budin", lado: "izq", escala: 1, pos: 1, giro: -1 },
    { plano: "cerca", producto: "alfajor", lado: "izq", escala: 1.05, pos: -0.12, giro: 1 },
    { plano: "medio", producto: "cookie", lado: "der", escala: 0.95, pos: 0.6, giro: -1 },
    { plano: "cerca", producto: "yogur", lado: "der", escala: 0.9, pos: -0.05, giro: 1 },
    { plano: "medio", producto: "sandwich", lado: "izq", escala: 1.1, pos: 0.35, giro: 1 },
  ],
};

/** 1200-1379px: costados de 40 a 110px. Menos piezas y más chicas. */
const MEDIO: Tramo = {
  tam: { fondo: 190, lejos: 48, medio: 72, cerca: 104 },
  asomo: 0.5,
  aire: 8,
  surtido: { fondo: FONDO_ANCHO, nitidas: TODOS },
  piezas: [
    { plano: "fondo", producto: "medialuna", lado: "libre", escala: 1.1, pos: 0.06, giro: 1 },
    { plano: "fondo", producto: "cafe", lado: "libre", escala: 0.95, pos: 0.92, giro: -1 },
    { plano: "lejos", producto: "brownie", lado: "izq", escala: 1.05, pos: 0.9, giro: 1 },
    { plano: "fondo", producto: "scon", lado: "libre", escala: 1, pos: 0.55, giro: 1 },
    { plano: "lejos", producto: "lemonie", lado: "der", escala: 0.95, pos: 1, giro: -1 },
    { plano: "fondo", producto: "mermelada", lado: "libre", escala: 0.9, pos: 0.28, giro: -1 },
    { plano: "cerca", producto: "alfajor", lado: "izq", escala: 1, pos: -0.2, giro: 1 },
    { plano: "medio", producto: "cookie", lado: "der", escala: 1, pos: 0.5, giro: -1 },
    { plano: "cerca", producto: "yogur", lado: "der", escala: 0.95, pos: -0.15, giro: 1 },
  ],
};

/**
 * 760-1199px (tablet): sin costado, solo el gutter de 24px. Fondo grande por
 * detrás del texto y nítidas que asoman desde el borde (lo visible más el
 * vaivén nunca pasa del gutter).
 */
const TABLET: Tramo = {
  tam: { fondo: 230, lejos: 110, medio: 76, cerca: 76 },
  asomo: 0.3,
  aire: 5,
  vaiven: 0.3,
  chico: true,
  nivelFondo: 1,
  vel: 1.4,
  surtido: { fondo: CLAROS, nitidas: LIVIANOS },
  piezas: [
    { plano: "fondo", producto: "medialuna", lado: "libre", escala: 1.1, pos: 0.1, giro: 1 },
    { plano: "fondo", producto: "cafe", lado: "libre", escala: 0.95, pos: 0.88, giro: -1 },
    { plano: "lejos", producto: "budin", lado: "libre", escala: 1, pos: 0.62, giro: -1 },
    { plano: "fondo", producto: "scon", lado: "libre", escala: 1, pos: 0.4, giro: 1 },
    { plano: "fondo", producto: "lemonie", lado: "libre", escala: 0.9, pos: 0.75, giro: -1 },
    { plano: "medio", producto: "medialuna", lado: "der", escala: 1.1, pos: 0, giro: -1 },
    { plano: "medio", producto: "scon", lado: "izq", escala: 1.05, pos: 0, giro: -1 },
    { plano: "medio", producto: "alfajor", lado: "der", escala: 1, pos: 0, giro: 1 },
    { plano: "medio", producto: "lemonie", lado: "izq", escala: 0.95, pos: 0, giro: 1 },
  ],
};

/**
 * < 760px (mobile): menos piezas y más grandes. El fondo desenfocado pasa por
 * detrás del texto (es la presencia principal: grandes, solo productos claros y
 * cayendo más rápido que en desktop para que se renueven a lo largo de la
 * página) y tres nítidas asoman desde el borde.
 */
const BORDE: Tramo = {
  tam: { fondo: 200, lejos: 96, medio: 72, cerca: 72 },
  asomo: 0.3,
  aire: 5,
  vaiven: 0.3,
  chico: true,
  nivelFondo: 1,
  vel: 1.8,
  surtido: { fondo: CLAROS, nitidas: LIVIANOS },
  piezas: [
    { plano: "fondo", producto: "medialuna", lado: "libre", escala: 1.1, pos: 0.16, giro: 1 },
    { plano: "fondo", producto: "cafe", lado: "libre", escala: 1, pos: 0.86, giro: -1 },
    { plano: "lejos", producto: "alfajor", lado: "libre", escala: 1, pos: 0.6, giro: -1 },
    { plano: "fondo", producto: "scon", lado: "libre", escala: 0.95, pos: 0.45, giro: 1 },
    { plano: "lejos", producto: "budin", lado: "libre", escala: 0.85, pos: 0.24, giro: 1 },
    { plano: "medio", producto: "medialuna", lado: "der", escala: 1.1, pos: 0, giro: -1 },
    { plano: "medio", producto: "alfajor", lado: "izq", escala: 1, pos: 0, giro: 1 },
    { plano: "medio", producto: "scon", lado: "der", escala: 1.05, pos: 0, giro: -1 },
  ],
};

type NombreTramo = "borde" | "tablet" | "medio" | "ancho";
const TRAMOS: Record<NombreTramo, Tramo> = {
  borde: BORDE,
  tablet: TABLET,
  medio: MEDIO,
  ancho: ANCHO,
};

/** Ancho del contenido (Container) y su gutter interno, en px. */
const CONTENIDO = 1160;
const GUTTER = 24;
/**
 * Distancia (en altos de pantalla, mínimo FUNDIDO_MIN px) entre el borde real
 * de una pieza y una zona prohibida en la que la pieza se termina de apagar. Es
 * la red de seguridad (espacial, sin suavizado temporal): para cuando llega, la
 * densidad del mapa ya la fue bajando.
 */
const FUNDIDO = 0.25;
const FUNDIDO_MIN = 160;
/** Huecos entre zonas prohibidas más chicos que esto (px) se tratan como zona. */
const HUECO_MIN = 240;
/** Resolución (px) del mapa de densidad a lo largo de la página. */
const PASO = 8;
/** Ancho (en altos de pantalla) de la rampa entre dos densidades vecinas. */
const RAMPA = 0.5;
/** Umbral máximo de la última pieza de cada capa y ancho de su fundido. */
const UMBRAL_MAX = 0.8;
const SUAVE = 0.2;
/** Segundos (constante de tiempo) del suavizado de opacidad al subir y al bajar. */
const TAU_SUBE = 0.6;
const TAU_BAJA = 0.28;
const MQ_ANCHO = "(min-width: 1380px)";
const MQ_MEDIO = "(min-width: 1200px)";
const MQ_TABLET = "(min-width: 760px)";
const MQ_QUIETO = "(prefers-reduced-motion: reduce)";

function suscribirMedios(onChange: () => void) {
  const mqs = [MQ_ANCHO, MQ_MEDIO, MQ_TABLET, MQ_QUIETO].map((q) =>
    window.matchMedia(q),
  );
  mqs.forEach((mq) => mq.addEventListener("change", onChange));
  return () => mqs.forEach((mq) => mq.removeEventListener("change", onChange));
}
/** Tramo actual, o null con reduced-motion (no se renderiza nada). */
const tramoActual = (): NombreTramo | null =>
  window.matchMedia(MQ_QUIETO).matches
    ? null
    : window.matchMedia(MQ_ANCHO).matches
      ? "ancho"
      : window.matchMedia(MQ_MEDIO).matches
        ? "medio"
        : window.matchMedia(MQ_TABLET).matches
          ? "tablet"
          : "borde";
const tramoServidor = (): NombreTramo | null => null;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mod = (a: number, n: number) => ((a % n) + n) % n;
const mcd = (a: number, b: number): number => (b ? mcd(b, a % b) : a);

/**
 * Una imagen por archivo ya pedido, retenida mientras viva la página. Sin
 * esto, cuando una pieza cambiaba de producto nadie retenía la imagen
 * anterior y Chrome la volvía a pedir entera (medido en dev: 73 pedidos para
 * 17 archivos en celular, 74 para 19 en compu; en producción, como mínimo una
 * revalidación cada vez). Con la imagen retenida, asignar la misma URL al
 * <img> de una pieza la toma de la memoria y `complete` da true en el acto.
 * Son 17 a 19 archivos de pocos KB.
 */
const retenidas = new Map<string, HTMLImageElement>();
function retener(url: string) {
  if (retenidas.has(url)) return;
  const im = new Image();
  im.decoding = "async";
  im.src = url;
  retenidas.set(url, im);
}

/**
 * Valores fijos de cada pieza: los de su plano, sus tamaños, su fase en el
 * recorrido, su umbral de densidad y su surtido.
 */
function derivar(tramo: Tramo) {
  const base = tramo.piezas.map((p) => {
    const plano = PLANOS[p.plano];
    const tam = Math.round(tramo.tam[p.plano] * p.escala);
    const v = variante(p.plano, tramo);
    const caja = Math.round(tam / v.lienzo);
    return { p, plano, tam, caja, capa: CAPA[p.plano], archivo: v.archivo };
  });
  return base.map(({ p, plano, tam, caja, capa, archivo }) => {
    // Grupo: mismo plano y lado. Caen a la misma velocidad, con el mismo
    // recorrido y repartidas a distancias iguales: nunca se chocan.
    const grupo = base.filter(
      (q) => q.p.plano === p.plano && q.p.lado === p.lado,
    );
    const k = grupo.findIndex((q) => q.p === p);
    const paso = (k + (p.lado === "der" ? 0.5 : 0)) / grupo.length;
    // Lo que agregan arriba y abajo el giro (la diagonal) y la flotación.
    const extDe = (c: number) => c * 0.21 + plano.flota;
    const margen = Math.max(...grupo.map((q) => q.caja + extDe(q.caja)));
    // Umbral de densidad: orden dentro de su capa.
    const deCapa = base.filter((q) => q.capa === capa);
    const orden = deCapa.findIndex((q) => q.p === p);
    const surtido = tramo.surtido[capa];
    let salto = [5, 3, 7, 2].find((s) => mcd(s, surtido.length) === 1) ?? 1;
    if (surtido.length < 3) salto = 1;
    const vaiven =
      p.lado === "libre" ? plano.vaiven : plano.vaiven * (tramo.vaiven ?? 1);
    return {
      ...p,
      ...plano,
      vel: plano.vel * (tramo.vel ?? 1),
      capa,
      tam,
      caja,
      ext: extDe(caja),
      margen,
      vaiven,
      giroScroll: p.giro * plano.giroScroll,
      giroTiempo: p.giro * plano.giroTiempo,
      fase: (paso + plano.desfase) % 1,
      umbral: (orden / deCapa.length) * UMBRAL_MAX,
      surtido,
      inicio: Math.max(surtido.indexOf(p.producto), 0),
      salto,
      archivo,
    };
  });
}

export function Bocaditos() {
  const listo = useAfterIdle(2000);
  const tramo = useSyncExternalStore(
    suscribirMedios,
    tramoActual,
    tramoServidor,
  );
  if (!listo || !tramo) return null;
  return <Lluvia key={tramo} tramo={TRAMOS[tramo]} />;
}

/** Rango [arriba, abajo] en coordenadas del documento (con su pin-spacer si está fijado). */
function rango(el: Element, y0: number): [number, number] {
  const padre = el.parentElement;
  const t = padre?.classList.contains("pin-spacer") ? padre : el;
  const r = t.getBoundingClientRect();
  return [r.top + y0, r.bottom + y0];
}

/** Promedio móvil (caja de 2r+1 muestras), con los bordes repetidos. */
function suavizar(a: Float32Array, r: number) {
  const n = a.length;
  const acum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) acum[i + 1] = acum[i] + a[i];
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const lo = i - r;
    const hi = i + r;
    let s = acum[Math.min(hi, n - 1) + 1] - acum[Math.max(lo, 0)];
    if (lo < 0) s += a[0] * -lo;
    if (hi > n - 1) s += a[n - 1] * (hi - n + 1);
    out[i] = s / (2 * r + 1);
  }
  return out;
}

/** Completa las muestras sin dato interpolando entre las vecinas con dato. */
function completar(a: Float32Array) {
  const n = a.length;
  let prev = -1;
  for (let i = 0; i <= n; i++) {
    if (i < n && Number.isNaN(a[i])) continue;
    const desde = prev >= 0 ? a[prev] : i < n ? a[i] : 0;
    const hasta = i < n ? a[i] : desde;
    for (let j = prev + 1; j < i; j++) {
      const f = prev >= 0 && i < n ? (j - prev) / (i - prev) : 0;
      a[j] = prev >= 0 ? desde + (hasta - desde) * f : hasta;
    }
    prev = i;
  }
}

function Lluvia({ tramo }: { tramo: Tramo }) {
  const capa = useRef<HTMLDivElement>(null);
  const piezas = useMemo(() => derivar(tramo), [tramo]);

  useGSAP(
    () => {
      const raiz = capa.current;
      if (!raiz) return;
      const els = Array.from(raiz.children) as HTMLElement[];
      const imgs = els.map((el) => el.firstElementChild as HTMLImageElement);

      // Estado medido (px). `alto` solo cambia si cambia el ancho o si el alto
      // cambia mucho: en mobile la barra del navegador aparece y desaparece al
      // scrollear, y como el recorrido usa módulo eso haría saltar las piezas.
      let ancho = raiz.clientWidth;
      let alto = window.innerHeight;
      let fundido = Math.max(alto * FUNDIDO, FUNDIDO_MIN);
      const est = piezas.map(() => ({
        x: 0,
        recorrido: 1,
        vuelta: Number.NaN,
        producto: "",
        /** Producto cuya imagen ya se pidió (src asignado). */
        pedido: "",
        cargada: false,
        o: 0,
        ultimaO: "",
      }));

      // Mapa de densidad medido: una muestra cada PASO px del documento.
      const campo: Record<Capa, Float32Array> = {
        fondo: new Float32Array(1),
        nitidas: new Float32Array(1),
      };
      /** Zonas prohibidas [arriba, abajo] en px del documento. */
      let prohibidas: [number, number][] = [];
      /** Para cada muestra, la próxima (hacia abajo) con alguna pieza posible. */
      let proxima = new Int32Array(1);
      let muestras = 1;

      const medirLados = () => {
        const libre = Math.max((ancho - CONTENIDO) / 2, 0) + GUTTER - tramo.aire;
        piezas.forEach((p, i) => {
          est[i].recorrido = alto * (1 + p.extra) + p.margen * 2;
          if (p.lado === "libre") {
            est[i].x = p.pos * ancho - p.caja / 2;
            return;
          }
          // Borde izquierdo del producto (en su lado, como si fuera el izquierdo).
          const xMax = libre - p.tam - p.vaiven; // lo visible + vaivén no pasa al texto
          const xMin = -p.tam * (1 - tramo.asomo); // asoma al menos `asomo`
          const ideal = p.pos >= 0 ? p.pos * Math.max(xMax, 0) : p.pos * p.tam;
          const x = Math.min(Math.max(ideal, xMin), xMax);
          const izq = p.lado === "izq" ? x : ancho - x - p.tam;
          est[i].x = izq - (p.caja - p.tam) / 2;
        });
      };

      const medirZonas = () => {
        const y0 = window.scrollY;
        const docAlto = Math.max(
          document.documentElement.scrollHeight,
          y0 + alto,
        );
        const n = Math.ceil(docAlto / PASO) + 2;
        const crudo: Record<Capa, Float32Array> = {
          fondo: new Float32Array(n).fill(Number.NaN),
          nitidas: new Float32Array(n).fill(Number.NaN),
        };
        const dura = new Uint8Array(n);
        for (const d of MAPA) {
          let lista: NodeListOf<Element>;
          try {
            lista = document.querySelectorAll(d.sel);
          } catch {
            continue; // selector no soportado (`:has` en navegadores viejos)
          }
          const nada = d.fondo <= 0 && d.nitidas <= 0;
          for (const el of lista) {
            const [a, b] = rango(el, y0);
            if (b - a < 1) continue;
            const i0 = Math.max(Math.floor(a / PASO), 0);
            const i1 = Math.min(Math.ceil(b / PASO), n - 1);
            for (let i = i0; i <= i1; i++) {
              crudo.fondo[i] = d.fondo;
              crudo.nitidas[i] = d.nitidas;
              dura[i] = nada ? 1 : 0;
            }
          }
        }
        // Zonas prohibidas (las casi pegadas se unen; la primera, si arranca
        // cerca del tope, cubre también lo de arriba: el nav).
        prohibidas = [];
        for (let i = 0; i < n; i++) {
          if (!dura[i]) continue;
          let j = i;
          while (j + 1 < n && dura[j + 1]) j++;
          const a = i * PASO;
          const b = (j + 1) * PASO;
          const ultima = prohibidas[prohibidas.length - 1];
          if (ultima && a - ultima[1] < HUECO_MIN) ultima[1] = b;
          else prohibidas.push([a < 200 ? -1e6 : a, b]);
          i = j;
        }
        const r = Math.max(Math.round((alto * RAMPA) / 2 / 2 / PASO), 1);
        for (const c of ["fondo", "nitidas"] as const) {
          completar(crudo[c]);
          // La rampa hacia una zona prohibida termina en su borde (no a mitad de
          // camino): antes de suavizar, la zona se agranda medio ancho de rampa
          // (2r muestras) de cada lado. Así las piezas bajan con la densidad,
          // suavizadas en el tiempo, antes de llegar al fundido de seguridad.
          for (const [a, b] of prohibidas) {
            const i0 = Math.max(Math.floor(a / PASO) - 2 * r, 0);
            const i1 = Math.min(Math.ceil(b / PASO) + 2 * r, n - 1);
            for (let i = i0; i <= i1; i++) crudo[c][i] = 0;
          }
          // Dos pasadas de caja = rampa triangular de ~RAMPA altos de pantalla.
          const liso = suavizar(suavizar(crudo[c], r), r);
          for (const [a, b] of prohibidas) {
            const i0 = Math.max(Math.floor(a / PASO), 0);
            const i1 = Math.min(Math.ceil(b / PASO), n - 1);
            for (let i = i0; i <= i1; i++) liso[i] = 0;
          }
          campo[c] = liso;
        }
        proxima = new Int32Array(n);
        let sig = 1e9;
        for (let i = n - 1; i >= 0; i--) {
          if (campo.fondo[i] > 0.001 || campo.nitidas[i] > 0.001) sig = i;
          proxima[i] = sig;
        }
        muestras = n;
      };

      // En mobile la barra del navegador dispara resize en pleno gesto: ahí
      // (mismo ancho, alto casi igual) las zonas se miden agrupadas, no en el
      // acto (medirZonas recorre todo el documento).
      const alRedimensionar = () => {
        const w = raiz.clientWidth;
        const h = window.innerHeight;
        if (w !== ancho || Math.abs(h - alto) > 160) {
          ancho = w;
          alto = h;
          fundido = Math.max(alto * FUNDIDO, FUNDIDO_MIN);
          medirLados();
          medirZonas();
        } else programarZonas();
      };

      medirLados();
      medirZonas();
      window.addEventListener("resize", alRedimensionar);
      // El alto de la página cambia con fuentes, imágenes, pins o el acordeón
      // del FAQ: se vuelven a medir las zonas (no es un listener de scroll).
      // Agrupado: mientras una pregunta del FAQ abre o cierra (su alto se
      // anima 300 a 600 ms) el body cambia de alto en cada cuadro, y medir
      // las zonas en todos era trabajo tirado. Mide una vez, 150 ms después
      // del último cambio (refresh y resize siguen midiendo en el momento).
      let esperaZonas = 0;
      const programarZonas = () => {
        window.clearTimeout(esperaZonas);
        esperaZonas = window.setTimeout(medirZonas, 150);
      };
      const ro = new ResizeObserver(programarZonas);
      ro.observe(document.body);
      ScrollTrigger.addEventListener("refresh", medirZonas);

      // Cada imagen avisa cuando cargó (la pieza espera para aparecer).
      const alCargar = imgs.map((img, i) => {
        const fn = () => {
          est[i].cargada = img.naturalWidth > 0;
        };
        img.addEventListener("load", fn);
        return fn;
      });

      const opacidad = (i: number, o: string) => {
        const previa = est[i].ultimaO;
        if (previa === o) return;
        els[i].style.opacity = o;
        est[i].ultimaO = o;
        // Capa de GPU solo mientras se ve (cruce de 0 en cualquier sentido).
        const viva = o !== "0";
        if (viva !== (previa !== "" && previa !== "0")) {
          if (viva) els[i].setAttribute("data-viva", "");
          else els[i].removeAttribute("data-viva");
        }
      };

      const margenMax = Math.max(...piezas.map((p) => p.margen));
      let apagadas = false;

      // Scroll que se pinta en este cuadro. Con Lenis (rueda y trackpad), su
      // raf corre antes de este tick (SmoothScroll) y ya escribió el scroll del
      // cuadro: también el que corrige el salto nativo de un ancla o de un foco
      // en medio de su scroll suave, así que acá ya no hay cuadro fantasma que
      // retener. Sin Lenis (táctil o reducir movimiento) todo salto es real.
      const scrollPintado = () => window.scrollY;

      const tick = (t: number, dtMs: number) => {
        // Con el lightbox abierto (bloquea el scroll con overflow en <html>)
        // la capa queda detrás de su overlay: no se anima, así el desenfoque
        // del overlay no se recalcula en cada cuadro.
        if (document.documentElement.style.overflow === "hidden") return;
        const s = scrollPintado();
        // Cero trabajo si en la ventana (más lo que puede asomar) no puede haber
        // ninguna pieza y todas ya terminaron de apagarse.
        if (apagadas) {
          const i0 = Math.min(Math.max(Math.floor((s - margenMax) / PASO), 0), muestras - 1);
          const i1 = Math.ceil((s + alto + margenMax) / PASO);
          if (proxima[i0] > i1) return;
        }
        const dt = Math.min(Math.max(dtMs, 0), 100) / 1000;
        const kSube = 1 - Math.exp(-dt / TAU_SUBE);
        const kBaja = 1 - Math.exp(-dt / TAU_BAJA);
        let todasApagadas = true;
        for (let i = 0; i < piezas.length; i++) {
          const p = piezas[i];
          const e = est[i];
          const { recorrido } = e;
          const bruto = s * p.vel + p.fase * recorrido;
          const vuelta = Math.floor(bruto / recorrido);
          // Al dar la vuelta (siempre fuera de pantalla) cambia de producto.
          // Solo se anota: la imagen se pide cuando la pieza puede verse.
          if (vuelta !== e.vuelta) {
            e.vuelta = vuelta;
            const prod = p.surtido[mod(p.inicio + vuelta * p.salto, p.surtido.length)];
            if (prod !== e.producto) {
              e.producto = prod;
              if (prod !== e.pedido) e.cargada = false;
            }
          }
          const fi = p.fase * Math.PI * 2;
          const y = bruto - vuelta * recorrido - p.margen + Math.sin(t * p.ritmo + fi) * p.flota;
          const fuera = y - p.ext > alto || y + p.caja + p.ext < 0;
          // Densidad del mapa en el centro de la pieza (suavizada en el tiempo).
          let objetivo = 0;
          if (!fuera) {
            const c = Math.min(Math.max(Math.round((s + y + p.caja / 2) / PASO), 0), muestras - 1);
            const densidad = campo[p.capa][c];
            // La imagen se pide recién acá: en pantalla y con densidad (nunca
            // en el hero ni en otra zona prohibida, así no le compite al
            // primer lote de cuadros del hero).
            if (densidad > p.umbral && e.pedido !== e.producto) {
              e.pedido = e.producto;
              const url = p.archivo(e.producto as Producto);
              retener(url);
              imgs[i].src = url;
              // Ya usada (en la memoria del documento): queda completa en el
              // acto, sin esperar el evento load (llega recién en otra tarea
              // y, mientras, la pieza bajaría su opacidad).
              e.cargada = imgs[i].complete && imgs[i].naturalWidth > 0;
            }
            if (e.cargada) objetivo = clamp01((densidad - p.umbral) / SUAVE);
          }
          e.o += (objetivo - e.o) * (objetivo > e.o ? kSube : kBaja);
          if (e.o < 0.002 && objetivo === 0) e.o = 0;
          // Zonas prohibidas: se apaga antes de que su borde real (con giro y
          // flotación) llegue a la zona. Sin suavizado temporal: ni con un
          // scroll rápido llega a pisarla.
          let o = fuera ? 0 : e.o;
          for (let k = 0; k < prohibidas.length && o > 0; k++) {
            const [a, b] = prohibidas[k];
            const dist = Math.max(a - (s + y + p.caja + p.ext), s + y - p.ext - b);
            o *= clamp01(dist / fundido);
          }
          if (e.o > 0) todasApagadas = false;
          if (o <= 0.003) {
            opacidad(i, "0");
            continue;
          }
          const dx = Math.sin(s * 0.0016 + t * 0.35 + fi) * p.vaiven;
          const rot = fi * 57.3 + s * p.giroScroll + t * p.giroTiempo;
          const esc = 0.92 + 0.08 * o;
          // 2D: la pieza viva ya es capa por will-change ([data-viva]); con
          // translate3d también lo sería apagada.
          els[i].style.transform = `translate(${(e.x + dx).toFixed(1)}px,${y.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${esc.toFixed(3)})`;
          opacidad(i, (o * p.opacidad).toFixed(3));
        }
        apagadas = todasApagadas;
      };

      // Primero en el ticker: lee window.scrollY antes de que los tweens del
      // ticker escriban estilos en el mismo cuadro (leerlo después forzaría un
      // recálculo de estilo sincrónico). Pausado con la pestaña oculta.
      let corriendo = false;
      const arrancar = () => {
        if (!corriendo) gsap.ticker.add(tick, false, true);
        corriendo = true;
      };
      const parar = () => {
        gsap.ticker.remove(tick);
        corriendo = false;
      };
      const alCambiarVisibilidad = () => (document.hidden ? parar() : arrancar());
      document.addEventListener("visibilitychange", alCambiarVisibilidad);
      if (!document.hidden) arrancar();

      // Entrada de la capa entera (las piezas ya están donde van): fundido
      // largo con el resorte `lento`, sin el arranque de golpe de expo.out.
      gsap.to(raiz, { opacity: 1, ...resorteGsap("lento") });

      return () => {
        parar();
        document.removeEventListener("visibilitychange", alCambiarVisibilidad);
        window.removeEventListener("resize", alRedimensionar);
        ro.disconnect();
        window.clearTimeout(esperaZonas);
        ScrollTrigger.removeEventListener("refresh", medirZonas);
        imgs.forEach((img, i) => img.removeEventListener("load", alCargar[i]));
      };
    },
    { scope: capa },
  );

  return (
    <div ref={capa} className={styles.capa} aria-hidden>
      {piezas.map((p, i) => (
        <div
          key={i}
          className={styles.pieza}
          style={{ width: p.caja, height: p.caja, zIndex: p.z }}
        >
          {/* Sin src en el render: lo pone el loop al elegir el producto de
              cada vuelta (variantes ya livianas y al tamaño justo). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            width={p.caja}
            height={p.caja}
            decoding="async"
            fetchPriority="low"
            draggable={false}
            className={cn(styles.img, p.plano === "cerca" && styles.cerca)}
          />
        </div>
      ))}
    </div>
  );
}
