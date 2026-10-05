import { altoNav, ScrollTrigger, scrollNativo } from "@/lib/gsap";

/**
 * Dónde queda la persona cuando la página cambia de alto por los pins.
 *
 * Las escenas fijadas (hero, Servicios, Galería, Flor, Reseñas) suman miles de
 * px de pin-spacer recién al hidratar, y ScrollTrigger conserva el número de
 * scroll en cada refresh, no el contenido. Tres casos caían en otro lado:
 * - Entrada por ancla (/#cotizar, o un link compartido después de tocar el
 *   nav): el navegador salta al ancla sobre el HTML del servidor, antes de los
 *   pins; después los pins corren todo y quedaba casi siempre en el hero.
 * - Recarga (o volver atrás sin bfcache): el navegador restauraba el número de
 *   scroll viejo sobre la página todavía sin pins.
 * - Cambio de tamaño (girar el celular y volver, redimensionar la ventana): el
 *   hero pasa a su versión quieta y vuelve, los pins cambian de largo.
 *
 * Qué hace:
 * - scroll restoration manual (también la memoria de ScrollTrigger).
 * - Al cargar, el destino es la sección del ancla (menos su scroll-margin-top,
 *   igual que un click en el nav: respeta los márgenes negativos de Galería y
 *   Reseñas) o, al recargar / volver, la posición guardada en `pagehide`: el
 *   bloque de la página (hijo de <main> o el pie) que estaba arriba y cuántos
 *   px dentro de él (o qué fracción, si cambió el tamaño de la ventana).
 * - Después de cada refresh de ScrollTrigger (pins, fuentes, la pasada
 *   inicial del hero) vuelve al destino, con scroll instantáneo, hasta que la
 *   persona usa rueda, tecla, mouse o dedo, o hasta un rato sin refresh.
 * - En cada scrollEnd y refresh anota dónde está. Si un refresh llega con otro
 *   tamaño de ventana (en táctiles, solo otro ancho: la barra del navegador
 *   cambia el alto), vuelve a esa anotación por fracción del bloque.
 * Corre en todos los modos (táctil, rueda, reducir movimiento). Sin listeners
 * de scroll propios: usa los eventos de ScrollTrigger.
 */

/** Bloque de la página y posición dentro de él. i: -1 = arriba de todo, -2 = al final. */
type Ancla = { i: number; off: number; frac: number; w: number; h: number };
type Destino = { tipo: "el"; el: HTMLElement } | ({ tipo: "bloque" } & Ancla);

const CLAVE = "salguero:posicion";

/** Cuánto (ms) se sostiene el destino sin que llegue otro refresh. */
const ESPERA = { montaje: 4000, load: 4000, refresh: 1500, sondeo: 200 };

/** El destino de esta carga: se lee una sola vez (StrictMode monta dos veces). */
let inicial: Destino | null | undefined;

/** Bloques de la página, en orden: los hijos de <main> y el pie. */
function bloques(): HTMLElement[] {
  const main = document.querySelector("main");
  const lista = main ? (Array.from(main.children) as HTMLElement[]) : [];
  const pie = document.querySelector<HTMLElement>("main ~ footer");
  if (pie) lista.push(pie);
  return lista;
}

/** Alto de documento del borde de arriba (offsetTop: sin transforms). */
function offsetDoc(el: HTMLElement): number {
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
    y += n.offsetTop;
  }
  return y;
}

/**
 * Posición de documento de `el`, esté o no fijado: si está dentro de un
 * pin-spacer, se mide desde el spacer (que queda en el flujo) más su lugar
 * dentro del elemento fijado.
 */
function topDoc(el: HTMLElement): number {
  const spacer = el.closest<HTMLElement>(".pin-spacer");
  if (!spacer) return offsetDoc(el);
  const fijo = spacer.firstElementChild as HTMLElement | null;
  const dentro =
    fijo && fijo !== el
      ? el.getBoundingClientRect().top - fijo.getBoundingClientRect().top
      : 0;
  return topDoc(spacer) + dentro;
}

const maxScroll = () =>
  Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

/** El mismo tamaño de ventana (en táctiles, el mismo ancho). */
const mismoTamano = (a: Ancla) =>
  a.w === window.innerWidth && (scrollNativo() || a.h === window.innerHeight);

/** Dónde está la persona: el bloque que cruza el borde de abajo del nav. */
function anotar(): Ancla | null {
  const y = window.scrollY;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (y < 2) return { i: -1, off: 0, frac: 0, w, h };
  if (y >= maxScroll() - 2) return { i: -2, off: 0, frac: 0, w, h };
  const linea = y + altoNav();
  const lista = bloques();
  for (let i = 0; i < lista.length; i++) {
    const top = topDoc(lista[i]);
    const alto = lista[i].offsetHeight;
    if (alto > 0 && linea < top + alto) {
      const off = y - top;
      return { i, off, frac: off / alto, w, h };
    }
  }
  return null;
}

function yDestino(d: Destino): number | null {
  const max = maxScroll();
  let y: number;
  if (d.tipo === "el") {
    if (!d.el.isConnected) return null;
    const margen = parseFloat(getComputedStyle(d.el).scrollMarginTop) || 0;
    y = topDoc(d.el) - margen;
  } else if (d.i === -1) {
    y = 0;
  } else if (d.i === -2) {
    y = max;
  } else {
    const b = bloques()[d.i];
    if (!b) return null;
    y = topDoc(b) + (mismoTamano(d) ? d.off : d.frac * b.offsetHeight);
  }
  return Math.round(Math.min(max, Math.max(0, y)));
}

function valida(a: unknown): a is Ancla {
  if (!a || typeof a !== "object") return false;
  const o = a as Record<string, unknown>;
  return ["i", "off", "frac", "w", "h"].every(
    (k) => typeof o[k] === "number" && Number.isFinite(o[k]),
  );
}

function leerInicial(): Destino | null {
  if (inicial !== undefined) return inicial;
  inicial = null;
  const nav = performance.getEntriesByType?.("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  // Como el navegador: al recargar o volver, donde estaba; si no, el ancla.
  if (nav?.type === "reload" || nav?.type === "back_forward") {
    try {
      const guardada: unknown = JSON.parse(
        sessionStorage.getItem(CLAVE) ?? "null",
      );
      if (valida(guardada)) inicial = { tipo: "bloque", ...guardada };
    } catch {
      // Sin sessionStorage (modo privado estricto): queda el ancla.
    }
  }
  if (!inicial && location.hash.length > 1) {
    let id = location.hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // Hash raro: se busca tal cual.
    }
    const el = document.getElementById(id);
    if (el) inicial = { tipo: "el", el };
  }
  return inicial;
}

/** Arma todo y devuelve la limpieza. Solo en el cliente. */
export function mantenerPosicion(): () => void {
  try {
    history.scrollRestoration = "manual";
  } catch {
    // Navegadores sin la API: queda la restauración del navegador.
  }
  // ScrollTrigger vuelve a poner su valor guardado en cada refresh: se le
  // avisa el nuevo.
  ScrollTrigger.clearScrollMemory("manual");

  let destino: Destino | null = null;
  let hasta = 0;
  let sondeo = 0;
  let ultima: Ancla | null = null;

  const extender = (ms: number) => {
    hasta = Math.max(hasta, performance.now() + ms);
  };
  const terminar = () => {
    destino = null;
    if (sondeo) window.clearInterval(sondeo);
    sondeo = 0;
    ultima = anotar();
  };
  /** Lleva al destino (instantáneo) si hace falta. */
  const corregir = () => {
    if (!destino) return;
    if (performance.now() > hasta && document.readyState === "complete") {
      terminar();
      return;
    }
    const y = yDestino(destino);
    if (y === null) {
      terminar();
      return;
    }
    if (Math.abs(window.scrollY - y) < 1.5) return;
    // Instantáneo: en táctiles <html> lleva scroll-behavior: smooth. Lenis,
    // quieto, toma el scroll nativo nuevo (onNativeScroll).
    window.scrollTo({ top: y, behavior: "instant" });
    ScrollTrigger.update();
  };
  const activar = (d: Destino, ms: number) => {
    destino = d;
    extender(ms);
    if (!sondeo) sondeo = window.setInterval(corregir, ESPERA.sondeo);
  };

  // La persona tomó el control: el destino se suelta.
  const soltar = () => {
    if (destino) terminar();
  };
  const entradas = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
  const opciones = { capture: true, passive: true } as const;
  entradas.forEach((t) => window.addEventListener(t, soltar, opciones));

  const alIniciarRefresh = () => {
    // Otro tamaño de ventana: volver a la última anotación, por fracción.
    if (destino || !ultima || mismoTamano(ultima)) return;
    activar({ tipo: "bloque", ...ultima }, ESPERA.refresh);
  };
  const alRefrescar = () => {
    if (destino) {
      extender(ESPERA.refresh);
      corregir();
    } else {
      ultima = anotar();
    }
  };
  // Los rearmados de matchMedia (hero, Reseñas) llegan después del refresh.
  const alCambiarMedios = () => corregir();
  const alTerminarScroll = () => {
    if (!destino) ultima = anotar();
  };
  const alCargar = () => {
    if (!destino) return;
    extender(ESPERA.load);
    corregir();
  };
  const alOcultar = () => {
    if (destino) corregir();
    const a = anotar();
    if (!a) return;
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(a));
    } catch {
      // Sin sessionStorage: al recargar vuelve arriba (o al ancla).
    }
  };

  ScrollTrigger.addEventListener("refreshInit", alIniciarRefresh);
  ScrollTrigger.addEventListener("refresh", alRefrescar);
  ScrollTrigger.addEventListener("matchMedia", alCambiarMedios);
  ScrollTrigger.addEventListener("scrollEnd", alTerminarScroll);
  window.addEventListener("load", alCargar);
  window.addEventListener("pagehide", alOcultar);

  const d = leerInicial();
  let raf = 0;
  if (d) {
    activar(d, ESPERA.montaje);
    corregir();
    // Y otra vez en el cuadro siguiente (los pins recién creados ya midieron).
    raf = requestAnimationFrame(corregir);
  } else {
    ultima = anotar();
  }

  return () => {
    if (raf) cancelAnimationFrame(raf);
    if (sondeo) window.clearInterval(sondeo);
    entradas.forEach((t) => window.removeEventListener(t, soltar, opciones));
    ScrollTrigger.removeEventListener("refreshInit", alIniciarRefresh);
    ScrollTrigger.removeEventListener("refresh", alRefrescar);
    ScrollTrigger.removeEventListener("matchMedia", alCambiarMedios);
    ScrollTrigger.removeEventListener("scrollEnd", alTerminarScroll);
    window.removeEventListener("load", alCargar);
    window.removeEventListener("pagehide", alOcultar);
  };
}
