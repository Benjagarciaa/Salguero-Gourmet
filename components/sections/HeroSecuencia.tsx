"use client";

import { useRef } from "react";
import { heroSecuencia, isPlaceholder } from "@/content/data";
import {
  altoNav,
  gsap,
  medidaPorTarea,
  prepararTransformes,
  ScrollTrigger,
  useGSAPEnCola,
} from "@/lib/gsap";
import {
  despegue,
  OPACIDAD_GSAP,
  resorteGsap,
  SCRUB,
  TRAMO,
} from "@/lib/fisica";
import { ahorroDeDatos } from "@/lib/video";
import { despuesDeLoad } from "@/lib/pintado";
import {
  crearMotor,
  pasadasDeCarga,
  type MotorSecuencia,
} from "./HeroSecuenciaMotor";
import {
  crearTapa,
  type CapaTapa,
  type Desplazamiento,
} from "./HeroSecuenciaTapa";
import {
  HeroMarcaAhorro,
  HeroSecuenciaPoster,
  HeroTapaFija,
  posterDeAhorro,
} from "./HeroSecuenciaPoster";
import {
  HeroAviso,
  HeroCierre,
  HeroCifras,
  HeroFichas,
  HeroHorneado,
} from "./HeroSecuenciaCapas";

/* ==========================================================================
 * Hero "escenario": la caja como protagonista (la técnica de las páginas de
 * Apple).
 *
 * El hero entero queda fijo (pin de ScrollTrigger con scrub) mientras dos
 * <canvas> dibujan lo que corresponde al progreso:
 *   - la tapa (HeroSecuenciaTapa): se levanta hacia la cámara, se desenfoca y
 *     se desvanece, con su sombra sobre la caja; transformaciones continuas;
 *   - el video (HeroSecuenciaMotor): cuadros con un fundido corto entre uno y
 *     el siguiente, decodificados solo alrededor del actual.
 * El marco va centrado y a todo el alto útil; los textos aparecen por
 * momentos, todos en el MISMO timeline (ver heroSecuencia en content/data.ts):
 *   1. inicio (visible al cargar) · 2. horneado (centrado debajo de la caja,
 *   palabra por palabra) · 3. cifras · 4. fichas de productos (solo desktop)
 *   · 5. cierre, el remate (título grande y botón, centrado debajo
 *   de la caja abierta) · 6. salida.
 *   - Desktop (>=860px de ancho y >=600px de alto): inicio y cifras a la
 *     izquierda del marco, confianza a la derecha, fichas a los dos lados;
 *     recorrido de `recorrido.desktop` pantallas. La imagen arranca agrandada
 *     (`acercamiento`) y vuelve a su tamaño con los productos.
 *   - Mobile (<860px y >=560px de alto): el marco llena el escenario y los
 *     textos van arriba y abajo. El marco arranca un poco más abajo (lugar
 *     para el inicio) y sube a su lugar con el primer scroll. La caja abierta
 *     queda sin rótulos.
 *   - Cierre (las dos): antes, el encuadre (.hs-encuadre: productos, caja y
 *     fichas) sube y, si hace falta, se achica lo justo para que el cierre
 *     entre entero debajo de la caja (medido en cada refresh).
 *   - Salida (las dos): con el hero todavía fijo las fichas se apagan y la
 *     caja abierta y el cierre empiezan a alejarse juntos (misma escala desde
 *     el centro de la caja, misma opacidad); ya suelto, el grupo sube más
 *     lento que la página (no se encima con Servicios) y se apaga mientras
 *     Servicios entra pegado por abajo. Son ScrollTrigger aparte, con
 *     posiciones en px que salen del pin (se recalculan en cada refresh): sin
 *     huecos ni saltos.
 *   - Pantallas bajas: no entra, así que no se fija (versión quieta).
 *
 * Modos (atributo data-hs del <header>, el CSS vive en globals.css):
 *   - sin atributo: SSR y primera pintura. Geometría del escenario (la caja
 *     cerrada: primer cuadro + tapa fija); el horneado en flujo debajo,
 *     oculto hasta GSAP (o la red de seguridad CSS).
 *   - "escena": GSAP tomó el control (pin + scrub).
 *   - "final": la geometría del SSR sin pin ni scrub y todo visible. Para
 *     hidratación tardía (la red de seguridad ya mostró las capas) y como
 *     salida si falla el armado: el layout no salta.
 *   - "quieto": reducir movimiento, pantalla baja o ahorro de datos (flujo
 *     normal, último cuadro, todo visible; no se baja la secuencia). Las dos
 *     primeras las arma ya la media query del CSS; el ahorro de datos no tiene
 *     media query: lo marca antes de la primera pintura el script en línea
 *     del <header> (HeroMarcaAhorro) y el CSS aplica el mismo bloque.
 * Rendimiento: nada de estado de React por cuadro; los dos lienzos se dibujan
 * en el mismo tick que el timeline (una vez por cuadro de pantalla). Todo se
 * limpia al desmontar (useGSAP + matchMedia).
 * ========================================================================== */

/*
 * Física (lib/fisica.ts): scrub directo (SCRUB), porque Lenis ya suaviza la
 * rueda y un scrub con retraso era un segundo suavizado encima; los tramos que
 * se ven llegar usan TRAMO (velocidad 0 al empezar y al terminar) y la deriva
 * de la salida, despegue (sin escalón de velocidad al soltarse el pin).
 */
/**
 * Descarga de los cuadros: después de `load`, 1 de cada 8 (y el último); con
 * el primer scroll, por tramos (`seguir` del motor): solo los cercanos a donde
 * está la persona, hasta `HORIZONTE` cuadros hacia adelante (o lo que la
 * inercia todavía va a recorrer, si es más: TRAMO_SEGUNDOS en el motor). Quien
 * mira el principio y se va no baja la secuencia entera (celular, dos
 * deslizadas y quieto: 3.4 MB de cuadros en vez de los 6.6 de la secuencia).
 * Los tramos no esperan a que termine la pasada: arrancan apenas hay scroll en
 * una red que da (el tipo de red que dice el navegador o, si no lo dice, una
 * tanda medida) y, con el scroll en reposo, lo que la caja tiene que mostrar
 * ya pasa antes que el resto de la pasada (ver `siguiente` en el motor). Con
 * ahorro de datos no se baja nada: versión quieta.
 */
const PASADA_INICIAL = 8;
const HORIZONTE = { desktop: 40, mobile: 48 };
/**
 * Red lenta medida (KB/s): por debajo, la carga por tramos no arranca o se
 * corta (igual que con 2G/3G efectivos). Donde el navegador no dice el tipo de
 * red (iPhone) decide la primera tanda de la pasada, si la persona ya
 * scrolleó; en todos, la pasada entera al terminar. ~0.7 Mbps, el mismo corte
 * que usa Chrome para "3g": así también se respeta en iPhone, donde Safari no
 * expone navigator.connection (ni el ahorro de datos ni el tipo de red).
 */
const RED_LENTA_KBS = 90;
/**
 * Cuadros decodificados alrededor del actual (más hacia donde se scrollea).
 * Mobile: con el margen de liberación del motor quedan hasta 21 bitmaps de
 * 540x960 (unos 43 MB; antes 29, unos 60 MB): lo que más memoria pedía en un
 * iPhone, donde Safari recarga la pestaña si se queda sin memoria.
 */
const VENTANA = {
  desktop: { atras: 8, adelante: 20 },
  mobile: { atras: 4, adelante: 12 },
};
/** Entrada o salida de un momento (horneado, cifras), en progreso. */
const FUNDIDO = 0.05;
/** Entrada de una ficha, en progreso. */
const FUNDIDO_FICHA = 0.035;
/**
 * Tramo (en progreso) que se le reserva a la entrada del horneado y del
 * cierre para ubicarla en el recorrido (enRango): `PALABRA` más
 * `ESCALON_PALABRA` por palabra. La entrada en sí corre por TIEMPO (ver
 * entradaPorTiempo): con scrub, si el scroll se detenía en el tramo, el
 * texto quedaba quieto a medio escribir.
 */
const PALABRA = 0.045;
const ESCALON_PALABRA = 0.0065;
/** Desde dónde sube cada palabra (yPercent): con la ventana, no asoma nada. */
const PALABRA_DESDE = 135;
/**
 * Entrada por tiempo (s): separación entre palabras (`palabra`), cuándo
 * arrancan las piezas si hay palabras (`piezas`) y separación entre piezas
 * (`pieza`). El cierre va más junto: su tramo propio de scroll es corto (~450
 * px en 1440x900) y con rueda continua (~1000 px/s) el botón, que esperaba a
 * que terminara el título, no llegaba a verse entero antes de la
 * salida. Ahora arranca casi con las palabras: todo el cierre queda a la
 * vista (opacidad 0.95) en ~0.45 s (antes ~0.95 s).
 */
type Ritmo = { palabra: number; piezas: number; pieza: number };
const RITMO = {
  horneado: { palabra: 0.055, piezas: 0.12, pieza: 0.1 },
  cierre: { palabra: 0.03, piezas: 0.09, pieza: 0.05 },
} satisfies Record<string, Ritmo>;
/** Al volver por arriba del tramo, la entrada se deshace así de más rápido. */
const VUELTA_RAPIDA = 2.2;
/** Margen mínimo (px) entre el inicio y los bordes del escenario. */
const MARGEN = 10;
/**
 * Salida: el marco y el cierre se apagan juntos desde esta fracción de la
 * salida hasta el final, con curva de entrada (lento al principio: el cierre
 * se sigue leyendo mientras el grupo empieza a alejarse). 0.2 (antes 0.05):
 * el grupo sigue al 100% hasta ~90 px después de soltarse el pin (desktop;
 * antes se empezaba a apagar todavía fijo), así con rueda rápida el cierre se
 * ve entero un momento antes de irse.
 * El final no cambia (y el del cierre sigue acotado para no encimarse con
 * Servicios).
 */
const APAGADO_SALIDA = { desde: 0.2, curva: "sine.in" };
/** Cierre: aire (px) entre la caja y el cierre, y arriba de los productos.
 *  Mobile con 22 (antes 14): sin la bajada, el título quedaba pegado a la caja. */
const AIRE_CIERRE = { desktop: 22, mobile: 22 };
const AIRE_ARRIBA = { desktop: 22, mobile: 14 };

/** Mismos cortes que globals.css (bloque del hero) y HeroSecuenciaPoster. */
const MQ = {
  desktop: "(min-width: 860px) and (min-height: 600px)",
  bajo: "(min-width: 860px) and (max-height: 599.98px), (max-width: 859.98px) and (max-height: 559.98px)",
  mobile: "(max-width: 859.98px) and (min-height: 560px)",
  reduce: "(prefers-reduced-motion: reduce)",
};

type Condiciones = {
  desktop: boolean;
  bajo: boolean;
  mobile: boolean;
  reduce: boolean;
};

/**
 * Tipo de red efectivo que estima el navegador con lo que va midiendo
 * (Chromium: "slow-2g", "2g", "3g" o "4g"), o null donde no se expone
 * (Safari, Firefox).
 */
function tipoDeRed(): string | null {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string };
  };
  return nav.connection?.effectiveType ?? null;
}

/**
 * ¿Red lenta (2G o 3G efectivos)? Ahí la carga por tramos (lo que falta, hasta
 * ~6.5 MB en mobile) no se baja: el scrub usa el cuadro listo más cercano de
 * la pasada inicial. Donde no se sabe el tipo (iPhone) lo decide la velocidad
 * medida (RED_LENTA_KBS).
 */
function redLenta(): boolean {
  return ["slow-2g", "2g", "3g"].includes(tipoDeRed() ?? "");
}

/**
 * ¿La red de seguridad CSS (hs-failsafe) ya mostró las capas antes de
 * hidratar? Pasa en celulares lentos: esconderlas de nuevo para arrancar la
 * escena sería un salto visible, así que el hero se queda en "final".
 */
function failsafeCorrio(): boolean {
  if (typeof document === "undefined" || !document.getAnimations) return false;
  return document
    .getAnimations()
    .some(
      (a) =>
        (a as CSSAnimation).animationName === "hs-failsafe" &&
        Number(a.currentTime) >= 4000,
    );
}

/** Posición en el timeline acotada para que ningún tramo lo alargue más de 1. */
const enRango = (pos: number, dur: number) =>
  Math.min(Math.max(0, pos), 1 - dur);

export function HeroSecuencia({
  inicio,
  confianza,
}: {
  /** Momento 1: kicker, h1, bajada y botones (Hero.tsx, render del servidor). */
  inicio: React.ReactNode;
  /** Etiquetas de confianza (momento 1). */
  confianza: React.ReactNode;
}) {
  const rootRef = useRef<HTMLElement>(null);
  // Se lee una sola vez (el doble montaje de StrictMode no la recalcula).
  const tardeRef = useRef<boolean | null>(null);
  // El ScrollTrigger del pin vigente (para el ancla al cruzar un corte).
  const pinRef = useRef<ScrollTrigger | null>(null);

  useGSAPEnCola(
    () => {
      const root = rootRef.current;
      if (!root) return;
      if (tardeRef.current === null) tardeRef.current = failsafeCorrio();
      const tarde = tardeRef.current;

      // Trigger permanente, sin animación ni callbacks. Cuando se mata el
      // último trigger de un scroller, ScrollTrigger olvida la posición de
      // scroll que restaura en el refresh: al cruzar un corte de matchMedia
      // (rotar una tablet, redimensionar) el revert mataba el del pin y la
      // página volvía a scroll 0. Con este siempre queda uno vivo. Lo revierte
      // el contexto de useGSAP al desmontar.
      ScrollTrigger.create({
        trigger: root,
        start: "top bottom",
        end: "bottom top",
      });

      // Ancla de contenido al cruzar un corte de matchMedia. Aun con el
      // trigger permanente, en el cambio GSAP lleva el scroll a 0 para
      // recalcular y el pin nuevo (que se refresca solo al crearse) le borra la
      // posición a restaurar: la página quedaba arriba de todo. En el evento
      // resize (el navegador lo dispara ANTES de avisar los cambios de media
      // queries, con los pines todavía puestos) se anota qué hay arriba (el
      // progreso del hero si está fijado, o la primera sección visible y a qué
      // altura) y cuando ScrollTrigger termina el cambio se vuelve ahí.
      let ancla:
        | { tipo: "pin"; p: number; t: number }
        | { tipo: "el"; el: Element; dy: number; t: number }
        | null = null;
      const anotar = () => {
        ancla = null;
        const t = performance.now();
        if (window.scrollY < 2) return;
        const pinSt = pinRef.current;
        if (pinSt?.isActive) {
          ancla = { tipo: "pin", p: pinSt.progress, t };
          return;
        }
        const tope = altoNav();
        const bloques = document.querySelectorAll("main > *, footer");
        for (const el of Array.from(bloques)) {
          const r = el.getBoundingClientRect();
          if (r.bottom > tope + 1) {
            ancla = { tipo: "el", el, dy: r.top, t };
            return;
          }
        }
      };
      const volver = () => {
        const a = ancla;
        ancla = null;
        // Solo un ancla recién anotada (del resize que provocó el cambio).
        if (!a || performance.now() - a.t > 1500) return;
        let y: number | null = null;
        if (a.tipo === "pin") {
          const st = pinRef.current;
          if (st) y = st.start + a.p * (st.end - st.start);
        } else if (a.el.isConnected) {
          const r = a.el.getBoundingClientRect();
          if (Math.abs(r.top - a.dy) > 2) y = window.scrollY + r.top - a.dy;
        }
        if (y !== null && Math.abs(y - window.scrollY) > 2) {
          // Instantáneo: en táctiles <html> lleva scroll-behavior: smooth.
          window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: "instant" });
          ScrollTrigger.update();
        }
      };
      window.addEventListener("resize", anotar);
      ScrollTrigger.addEventListener("matchMedia", volver);

      // matchMedia rearma todo si cambia el tamaño (versión y geometría) o la
      // preferencia de movimiento, y lo revierte al desmontar.
      const mm = gsap.matchMedia();
      mm.add(MQ, (ctx) => {
        const { desktop, bajo, reduce } = ctx.conditions as Condiciones;
        const { versiones, recorrido, foco, encuadre: medidas } = heroSecuencia;
        const version = desktop ? versiones.desktop : versiones.mobile;
        const ultimo = version.cuadros - 1;
        const limpiar = () => {
          delete root.dataset.hs;
          delete root.dataset.hsLienzo;
          delete root.dataset.hsTapa;
          root.style.removeProperty("--hs-m1-h");
          root.style.removeProperty("--hs-ficha-z");
        };

        // Reducir movimiento, pantalla baja o ahorro de datos: versión quieta,
        // sin bajar la secuencia. Las dos primeras ya las arma el CSS; con
        // ahorro de datos el script en línea del <header> ya la marcó antes de
        // pintar (HeroMarcaAhorro) y el <picture> eligió el último cuadro:
        // acá se confirma (por si el script no corrió).
        const ahorro = ahorroDeDatos();
        if (reduce || bajo || ahorro) {
          if (ahorro) posterDeAhorro(root);
          root.dataset.hs = "quieto";
          return limpiar;
        }

        const q = <T extends Element = HTMLElement>(sel: string) =>
          root.querySelector<T>(sel);
        const pin = q(".hs-pin");
        const canvas = q<HTMLCanvasElement>(".hs-canvas");
        const lienzoTapa = q<HTMLCanvasElement>(".hs-tapa-lienzo");
        const tapaImg = q<HTMLImageElement>(".hs-tapa-img");
        const marco = q(".hs-marco");
        const encuadre = q(".hs-encuadre");
        const poster = q<HTMLImageElement>(".hs-poster img");
        const imagen = q(".hs-imagen");
        const halo = q(".hs-halo");
        const aviso = q(".hs-aviso-in");
        const m1 = q(".hs-m1-in");
        const m2 = q(".hs-m2-in");
        const m3 = q(".hs-m3-in");
        const m4 = q(".hs-m4-in");
        const m4Caja = q(".hs-m4");
        const cierreBoton = q(".hs-cierre-boton");
        const conf = q(".hs-confianza-in");
        const capaFichas = q(".hs-fichas");
        const todas = (el: HTMLElement | null, sel: string) =>
          el ? Array.from(el.querySelectorAll<HTMLElement>(sel)) : [];
        const palabrasHorneado = todas(m2, ".hs-pal-in");
        const palabrasCierre = todas(m4, ".hs-cierre-titulo .hs-pal-in");
        const cifras = Array.from(
          root.querySelectorAll<HTMLElement>(".hs-cifra"),
        );
        const fichas = Array.from(
          root.querySelectorAll<HTMLElement>(".hs-ficha"),
        );
        // Todo lo que GSAP puede tocar (para limpiarlo si algo falla).
        const animados = [
          marco,
          encuadre,
          imagen,
          halo,
          aviso,
          m1,
          m2,
          m3,
          m4,
          m4Caja,
          cierreBoton,
          conf,
          capaFichas,
          ...palabrasHorneado,
          ...palabrasCierre,
          ...cifras,
          ...fichas.flatMap((f) =>
            Array.from(
              f.querySelectorAll<HTMLElement>(
                ".hs-ficha-texto, .hs-ficha-linea, .hs-ficha-punto",
              ),
            ),
          ),
        ].filter((el): el is HTMLElement => el !== null);
        const pantallas = desktop ? recorrido.desktop : recorrido.mobile;

        let motor: MotorSecuencia | null = null;
        let capa: CapaTapa | null = null;
        // Se asigna dentro de armarEscena: el cast evita que TS lo dé por null.
        let tl = null as gsap.core.Timeline | null;
        let vivo = true;
        // Redibujo pendiente tras un render silencioso del timeline (ver
        // `estado` en armarEscena).
        let sucio = false;
        let rafSync = 0;
        let cancelar = () => {};
        let quitarEspera = () => {};
        let quitarRefresh = () => {};
        let restaurarBotones = () => {};
        let quitarPreparacion = () => {};

        // Desktop: escala inicial de la imagen (--hs-z en globals.css, que la
        // toma de heroSecuencia.acercamiento y la baja en pantallas angostas).
        const zoom = () =>
          parseFloat(getComputedStyle(root).getPropertyValue("--hs-z")) || 1;

        // Mobile: cuánto arranca más abajo el marco (fracción de su alto). Lo
        // define el CSS (--hs-baja, más en teléfonos bajos); se lee en cada
        // refresh para que el timeline lo deshaga exacto.
        const baja = () =>
          parseFloat(getComputedStyle(root).getPropertyValue("--hs-baja")) ||
          0;

        // Momento 5 (desktop y mobile): cuánto sube (y, px) y cuánto se achica
        // (s) el encuadre para que el cierre entre ENTERO debajo de la caja
        // vacía. Primero solo sube; si la fila de arriba quedaría pegada al
        // nav, también se achica (con origen arriba al medio), hasta
        // escalaMin. Todo con medidas de layout (offset*, sin
        // transformaciones): da lo mismo en cualquier punto del scroll y se
        // recalcula en cada refresh.
        const aireCierre = desktop ? AIRE_CIERRE.desktop : AIRE_CIERRE.mobile;
        const aireArriba = desktop ? AIRE_ARRIBA.desktop : AIRE_ARRIBA.mobile;
        const ajusteCierre = () => {
          if (!marco || !m4Caja || !pin) return { y: 0, s: 1 };
          const { productosArriba, cajaFinal } = medidas;
          const alto = pin.clientHeight;
          const mh = marco.offsetHeight;
          // Arriba del marco ya subido (mobile: el timeline deshace la bajada
          // inicial; en desktop no hay bajada).
          const tope = marco.offsetTop - baja() * mh;
          const arriba = (productosArriba / 100) * mh;
          const abajo = (cajaFinal.abajo / 100) * mh;
          // La caja tiene que terminar acá (el cierre y su aire, debajo).
          const limite = alto - m4Caja.offsetHeight - aireCierre;
          let s = 1;
          let y = Math.min(0, limite - (tope + abajo));
          if (tope + y + arriba < aireArriba) {
            const { escalaMin } = heroSecuencia.cierre.ajuste;
            s = gsap.utils.clamp(
              escalaMin,
              1,
              (limite - aireArriba) / (abajo - arriba),
            );
            y = aireArriba - tope - s * arriba;
          }
          return { y: Math.round(y), s };
        };

        // Desktop: el encuadre se achica para el cierre y con él los rótulos
        // de las fichas (en 1280x720, a 9.5px). --hs-ficha-z los compensa
        // (globals.css) para que las etiquetas queden en 11px al final.
        const compensarFichas = () => {
          if (!desktop) return;
          const { s } = ajusteCierre();
          if (s < 0.999) {
            root.style.setProperty("--hs-ficha-z", (1 / s).toFixed(4));
          } else {
            root.style.removeProperty("--hs-ficha-z");
          }
        };

        // Pin + scrub: el timeline mueve la tapa, los cuadros y las capas.
        const armarEscena = (m: MotorSecuencia, pinEl: HTMLElement) => {
          // El <img> de respaldo ya trae el primer cuadro: se usa como cuadro 0
          // (no se baja dos veces).
          if (poster) m.adoptar(0, poster);
          // Rendimiento: GSAP lee los transforms de todo lo que mueve en una
          // sola tanda, y las opacidades quedan en línea (prepararTransformes,
          // lib/gsap.ts). La capa de las fichas solo cambia de opacidad.
          // Al cruzar un corte de matchMedia, lo que animaba el modo anterior
          // puede quedar con su transform en línea: los tweens de valores en
          // función (conFunciones) se invalidan en cada refresh y, al
          // rearmarse, GSAP anota como "estilo original" el que él mismo había
          // escrito, y al revertir lo deja puesto (al pasar de desktop a
          // mobile, la imagen seguía con el acercamiento de 1.3 y la caja
          // tapaba el cierre). El servidor no les pone transform ni opacidad
          // en línea: el modo nuevo arranca de cero. Fuera del registro del
          // contexto (ignore): al revertir este modo no hay nada que restaurar.
          // Solo lo que GSAP ya tocó (tiene su caché, _gsap): con los demás no
          // hay nada que limpiar, y el set les creaba la caché leyendo el
          // transform de cada uno intercalado con las escrituras (un recálculo
          // de estilos forzado por elemento al hidratar; rendimiento, el
          // resultado en pantalla es el mismo).
          const tocados = animados.filter(
            (el) => (el as HTMLElement & { _gsap?: unknown })._gsap,
          );
          if (tocados.length) {
            ctx.ignore(() =>
              gsap.set(tocados, {
                clearProps: "transform,translate,rotate,scale,opacity",
              }),
            );
          }
          quitarPreparacion = prepararTransformes(
            animados.filter((el) => el !== capaFichas),
            animados,
          );

          // Tapa y cuadro actuales como números que el timeline interpola, con
          // accesores: todo render del timeline que los cambia los marca. Los
          // renders silenciosos de ScrollTrigger (el primero del pin, que llega
          // un tick después de armarlo, y cada refresh) no llaman a onUpdate:
          // con la página ya scrolleada al hidratar, los lienzos quedaban en el
          // estado del armado (la caja cerrada) mientras los textos iban por
          // las cifras, hasta el próximo scroll (L8). Lo marcado se dibuja en
          // el cuadro siguiente si onUpdate no lo hizo antes.
          const valores = { tapa: 0, cuadro: 0 };
          const marcar = () => {
            sucio = true;
            if (rafSync) return;
            rafSync = requestAnimationFrame(() => {
              rafSync = 0;
              if (sucio && vivo) alActualizar();
            });
          };
          const estado = {
            get tapa() {
              return valores.tapa;
            },
            set tapa(v: number) {
              if (v === valores.tapa) return;
              valores.tapa = v;
              marcar();
            },
            get cuadro() {
              return valores.cuadro;
            },
            set cuadro(v: number) {
              if (v === valores.cuadro) return;
              valores.cuadro = v;
              marcar();
            },
          };
          // Los tweens con valores en función de la geometría (la subida del
          // marco en mobile, el acercamiento en desktop y el ajuste del cierre)
          // se vuelven a calcular en cada refresh: se invalidan solo esos.
          // Antes iba invalidateOnRefresh en todo el timeline, que en cada
          // refresh revertía y rearmaba los ~40 tweens (los demás tienen
          // valores fijos): ~20 ms de bloqueo por refresh en un celular de gama
          // media, y al cargar hay dos (el del pin al armarse y el completo).
          const conFunciones: gsap.core.Animation[] = [];
          const linea = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: pinEl,
              pin: true,
              // Función: se recalcula en cada refresh (si cambia el nav).
              start: () => `top ${altoNav()}px`,
              end: () => `+=${Math.round(window.innerHeight * pantallas)}`,
              scrub: SCRUB,
              // Convención de los pins (CLAUDE.md §6): refresh por posición.
              refreshPriority: 0,
              onRefreshInit: () => {
                conFunciones.forEach((t) => t.invalidate());
              },
              onRefresh: () => {
                compensarFichas();
                // La tapa vuelve a medir su geometría de layout.
                capa?.recalcular();
              },
            },
          });
          tl = linea;
          compensarFichas();
          pinRef.current = linea.scrollTrigger ?? null;

          // La tapa, en su tramo; el video, desde `video.desde` hasta el final
          // (lineal con el scroll: el timeline dura exactamente 1).
          const { tapa: datosTapa, video } = heroSecuencia;
          linea.to(
            estado,
            {
              tapa: 1,
              duration: datosTapa.tramo.hasta - datosTapa.tramo.desde,
            },
            datosTapa.tramo.desde,
          );
          const curva = video.curva;
          linea.to(
            estado,
            {
              cuadro: ultimo,
              duration: 1 - video.desde,
              ease: (q: number) => Math.pow(q, curva),
            },
            video.desde,
          );

          // Halo: un foco cálido y muy sutil sobre la caja, que se abre apenas
          // cuando la tapa ya no está.
          if (halo) {
            linea.fromTo(
              halo,
              { scale: 0.9, opacity: 0.55 },
              { scale: 1.08, opacity: 1, duration: 0.6, ease: "sine.inOut" },
              0.1,
            );
          }

          if (aviso) {
            linea.to(aviso, { opacity: 0, y: -8, duration: 0.03 }, 0);
          }

          // Desktop: la imagen arranca agrandada (la caja cerrada protagonista)
          // y vuelve a su tamaño mientras suben los productos. La escala
          // inicial ya la pone el CSS antes de hidratar: no hay salto.
          if (desktop && imagen) {
            const { tramo: acerca } = heroSecuencia.acercamiento;
            linea.fromTo(
              imagen,
              { scale: () => zoom() },
              {
                scale: 1,
                duration: acerca.hasta - acerca.desde,
                ease: TRAMO,
              },
              acerca.desde,
            );
            conFunciones.push(linea.recent() as gsap.core.Tween);
          }

          // 1 · Inicio: se va hacia afuera cuando empieza a subir la tapa. Arriba
          // de todo está 100% opaco; el desvanecido arranca después de un poco
          // de scroll y con curva de entrada (lento al principio).
          const { bajo: inicioBajo } = heroSecuencia.inicio;
          const pantallaBaja =
            !desktop && window.innerHeight < inicioBajo.alto;
          const salida = desktop
            ? heroSecuencia.inicio.salida.desktop
            : pantallaBaja
              ? inicioBajo.salida
              : heroSecuencia.inicio.salida.mobile;
          const dSalida = salida.hasta - salida.desde;
          const easeSalida = TRAMO;
          if (m1) {
            linea.fromTo(
              m1,
              { opacity: 1, x: 0, y: 0 },
              {
                opacity: 0,
                x: desktop ? -48 : 0,
                y: desktop ? 0 : -28,
                duration: dSalida,
                ease: easeSalida,
              },
              salida.desde,
            );
          }
          if (conf) {
            linea.fromTo(
              conf,
              { opacity: 1, x: 0, y: 0 },
              {
                opacity: 0,
                x: desktop ? 48 : 0,
                y: desktop ? 0 : 24,
                duration: dSalida,
                ease: easeSalida,
              },
              salida.desde,
            );
          }
          // Mobile: el marco sube a su lugar (deshace la bajada inicial) un
          // poco después de que el inicio empieza a irse.
          if (!desktop && marco) {
            const subida = pantallaBaja
              ? inicioBajo.subida
              : heroSecuencia.inicio.subida;
            linea.fromTo(
              marco,
              { yPercent: 0 },
              {
                yPercent: () => -baja() * 100,
                duration: subida.hasta - subida.desde,
                ease: TRAMO,
              },
              subida.desde,
            );
            conFunciones.push(linea.recent() as gsap.core.Tween);
          }

          // Entrada por TIEMPO (horneado y cierre): cuando el scroll cruza
          // `t` hacia abajo, cada palabra sube desde abajo de su ventana con
          // el resorte `entrada` (la opacidad aparte, corta) y un escalón
          // chico entre una y otra; casi a la par, las `piezas` (el botón
          // del cierre), con el `ritmo` de cada momento (RITMO).
          // Al volver por arriba de `t` se deshace, más rápido. El scroll solo
          // decide el momento: si se detiene en el tramo, el texto termina de
          // entrar igual (nunca queda a medio escribir). Un marcador en el
          // timeline avisa el cruce también en los renders silenciosos de
          // ScrollTrigger (refresh, scroll restaurado); se decide con el
          // progreso real del scroll (al armar el pin, ScrollTrigger
          // renderiza el timeline en su final para medirlo).
          const { ease: easeEntrada, duration: durEntrada } =
            resorteGsap("entrada");
          const entradaPorTiempo = (
            palabras: HTMLElement[],
            piezas: HTMLElement[],
            t: number,
            ritmo: Ritmo,
            alCambiar?: () => void,
          ) => {
            const tlE = gsap.timeline({ paused: true });
            if (palabras.length) {
              tlE.fromTo(
                palabras,
                { yPercent: PALABRA_DESDE },
                {
                  yPercent: 0,
                  duration: durEntrada,
                  ease: easeEntrada,
                  stagger: ritmo.palabra,
                },
                0,
              );
              tlE.fromTo(
                palabras,
                { opacity: 0 },
                {
                  opacity: 1,
                  ...OPACIDAD_GSAP,
                  stagger: ritmo.palabra,
                },
                0,
              );
            }
            if (piezas.length) {
              const t0 = palabras.length ? ritmo.piezas : 0;
              tlE.fromTo(
                piezas,
                { y: 16 },
                {
                  y: 0,
                  duration: durEntrada,
                  ease: easeEntrada,
                  stagger: ritmo.pieza,
                },
                t0,
              );
              tlE.fromTo(
                piezas,
                { opacity: 0 },
                {
                  opacity: 1,
                  ...OPACIDAD_GSAP,
                  stagger: ritmo.pieza,
                },
                t0,
              );
            }
            let dentro = false;
            const marca = {
              get p() {
                return dentro ? 1 : 0;
              },
              set p(_v: number) {
                const st = linea.scrollTrigger;
                const ahora = (st ? st.progress : linea.progress()) >= t;
                if (ahora === dentro) return;
                dentro = ahora;
                if (ahora) tlE.timeScale(1).play();
                else tlE.timeScale(VUELTA_RAPIDA).reverse();
                alCambiar?.();
              },
            };
            linea.fromTo(marca, { p: 0 }, { p: 1, duration: 0.001 }, t);
            return { dentro: () => dentro };
          };

          // 2 · Horneado: centrado debajo de la caja, entra palabra por
          // palabra ("el mismo día" en la itálica amarilla) y se apaga antes
          // de que la caja (que baja mientras suben los productos) llegue.
          const tramo = desktop
            ? heroSecuencia.horneado.desktop
            : heroSecuencia.horneado.mobile;
          if (m2) {
            const dur2 =
              PALABRA + ESCALON_PALABRA * (palabrasHorneado.length - 1);
            const t2 = enRango(tramo.desde, dur2);
            // El contenedor queda encendido (las palabras esperan escondidas
            // en sus ventanas); sin palabras, entra el contenedor entero.
            entradaPorTiempo(
              palabrasHorneado,
              palabrasHorneado.length ? [] : [m2],
              t2,
              RITMO.horneado,
            );
            linea.fromTo(
              m2,
              { opacity: 1, y: 0 },
              {
                // Se apaga apenas hacia abajo: la caja, que baja, nunca la
                // alcanza.
                opacity: 0,
                y: 8,
                duration: FUNDIDO,
                ease: "power2.in",
                immediateRender: false,
              },
              enRango(tramo.hasta - FUNDIDO, FUNDIDO),
            );
          }

          // 3 · Cifras: una por una (el número y su rótulo) y se van juntas. El
          // contenedor también arranca en 0: en mobile lleva un velo arriba
          // que, visible desde el principio, apagaba el inicio (quedaba encima
          // del kicker y del título aunque las cifras no se vieran).
          const tc = desktop
            ? heroSecuencia.cifras.desktop
            : heroSecuencia.cifras.mobile;
          if (m3 && cifras.length) {
            const escalon = FUNDIDO * 0.4;
            const t3 = enRango(tc.desde, FUNDIDO + escalon * (cifras.length - 1));
            linea.fromTo(
              m3,
              { opacity: 0 },
              { opacity: 1, duration: FUNDIDO * 0.6, ease: "power1.out" },
              t3,
            );
            linea.fromTo(
              cifras,
              { opacity: 0, y: 22 },
              {
                opacity: 1,
                y: 0,
                duration: FUNDIDO,
                ease: TRAMO,
                stagger: escalon,
              },
              t3,
            );
            linea.fromTo(
              m3,
              { opacity: 1, y: 0 },
              {
                opacity: 0,
                y: -18,
                duration: FUNDIDO,
                ease: "power2.in",
                immediateRender: false,
              },
              enRango(tc.hasta - FUNDIDO, FUNDIDO),
            );
          }

          // 4 · Fichas (solo desktop), fila por fila. Las de los costados:
          // primero el punto junto al producto, después la línea y el rótulo.
          heroSecuencia.fichas.forEach((d, i) => {
            const f = fichas[i];
            if (!f || !desktop) return;
            const texto = f.querySelector<HTMLElement>(".hs-ficha-texto");
            const trazo = f.querySelector<HTMLElement>(".hs-ficha-linea");
            const punto = f.querySelector<HTMLElement>(".hs-ficha-punto");
            const t0 = enRango(d.desde, FUNDIDO_FICHA * 1.5);
            if (d.lado !== "centro") {
              if (punto) {
                linea.fromTo(
                  punto,
                  { opacity: 0, scale: 0 },
                  {
                    opacity: 1,
                    scale: 1,
                    duration: FUNDIDO_FICHA * 0.5,
                    ease: TRAMO,
                  },
                  t0,
                );
              }
              if (trazo) {
                linea.fromTo(
                  trazo,
                  { scaleX: 0 },
                  { scaleX: 1, duration: FUNDIDO_FICHA, ease: TRAMO },
                  t0,
                );
              }
              if (texto) {
                linea.fromTo(
                  texto,
                  { opacity: 0, x: d.lado === "izq" ? 12 : -12 },
                  {
                    opacity: 1,
                    x: 0,
                    duration: FUNDIDO_FICHA,
                    ease: TRAMO,
                  },
                  t0 + FUNDIDO_FICHA * 0.5,
                );
              }
            } else if (texto) {
              linea.fromTo(
                texto,
                { opacity: 0, y: 8 },
                { opacity: 1, y: 0, duration: FUNDIDO_FICHA, ease: TRAMO },
                t0,
              );
            }
          });

          // 5 · Cierre, el remate. Antes, el encuadre (productos, caja y
          // fichas) sube y, si hace falta, se achica lo justo (ajusteCierre)
          // para que el cierre entre entero debajo de la caja. Después: el
          // título palabra por palabra y el botón. Queda hasta el
          // final del recorrido (se va con la salida).
          const { cierre } = heroSecuencia;
          if (encuadre) {
            const { tramo: aj } = cierre.ajuste;
            gsap.set(encuadre, { transformOrigin: "50% 0%" });
            linea.fromTo(
              encuadre,
              { y: 0, scale: 1 },
              {
                y: () => ajusteCierre().y,
                scale: () => ajusteCierre().s,
                duration: aj.hasta - aj.desde,
                ease: TRAMO,
              },
              aj.desde,
            );
            conFunciones.push(linea.recent() as gsap.core.Tween);
          }
          const desde4 = desktop ? cierre.desde.desktop : cierre.desde.mobile;
          const dur4 = PALABRA + ESCALON_PALABRA * 3 + 0.05;
          const t4 = enRango(desde4, dur4);
          // Desde que el cierre entra, su botón recibe clicks y foco (lo
          // decide la entrada: ver sincronizar, más abajo).
          let cierreDentro = () => false;
          if (m4) {
            const piezas = [cierreBoton].filter(
              (el): el is HTMLElement => el !== null,
            );
            const entrada = entradaPorTiempo(
              palabrasCierre,
              palabrasCierre.length ? piezas : [m4],
              t4,
              RITMO.cierre,
              () => sincronizar(),
            );
            cierreDentro = entrada.dentro;
          }

          // 6 · Salida hacia Servicios: la caja abierta y el cierre se alejan
          // juntos sobre el mismo fondo. ScrollTrigger aparte (no se puede
          // soltar el pin en medio de su timeline), con posiciones en px que
          // salen del pin y se recalculan en cada refresh (se crean después de
          // él):
          //   - `aleja`, desde `salida.desde` (todavía fijo) hasta `despues`
          //     escenarios después de soltarse: las fichas se apagan, y el
          //     marco y el cierre (un solo grupo: la misma escala desde el
          //     mismo punto, el centro de la caja abierta) se achican y el
          //     marco se desvanece a lo largo de TODA la salida (sube visible y
          //     termina de irse bajo el nav: arriba no queda un hueco mientras
          //     Servicios entra por abajo);
          //   - `deriva`, solo desde que se suelta: el grupo sube más lento
          //     que la página (profundidad, sin encimarse);
          //   - el fundido del cierre: el mismo tramo y la misma curva que el
          //     del marco (se apagan juntos: debajo de la caja no queda un
          //     hueco donde estaba el cierre). Solo si el encabezado de
          //     Servicios (que sube a la velocidad de la página y se le acerca
          //     lo que el cierre se atrasa, menos lo que el cierre sube al
          //     achicarse) fuera a recorrer antes el 80% de la distancia que
          //     los separa al soltarse, termina ahí: nunca se ven encimados.
          // Tocan scale, opacity e y del marco (el pin solo le mueve yPercent
          // en mobile), scale, opacity e y del envoltorio del cierre (.hs-m4;
          // el pin anima su interior) y la opacidad del contenedor de las
          // fichas (las fichas sueltas las mueve el pin): nunca dos timelines
          // en la misma propiedad del mismo elemento.
          const st = linea.scrollTrigger;
          let apagaCierre: gsap.core.Tween | null = null;
          if (st && marco) {
            const sal = heroSecuencia.salida;
            const desdeSalida = desktop ? sal.desde.desktop : sal.desde.mobile;
            // El alto del escenario, medido una vez por tarea (medidaPorTarea):
            // la deriva y el fundido de abajo lo piden cientos de veces por
            // refresh (recorren la salida de a 4 px).
            const altoPin = medidaPorTarea(() => pinEl.clientHeight);
            const tras = () => sal.despues * altoPin();
            const inicioSalida = () =>
              st.start + desdeSalida * (st.end - st.start);
            const finSalida = () => st.end + tras();
            // Centro de la caja abierta (productos + caja), donde quedó
            // después del ajuste del cierre: en el marco y en el escenario
            // (mobile: con la bajada inicial ya deshecha por el pin).
            const centroCaja = () => {
              const { y, s } = ajusteCierre();
              const f =
                (medidas.productosArriba + medidas.cajaFinal.abajo) / 200;
              const enMarco = y + s * f * marco.offsetHeight;
              const tope = marco.offsetTop - baja() * marco.offsetHeight;
              return { enMarco, enEscenario: tope + enMarco };
            };
            // El grupo se aleja desde ese punto: el marco y el cierre, cada
            // uno con el origen en sus coordenadas.
            const ubicarOrigenes = () => {
              const centro = centroCaja();
              gsap.set(marco, {
                transformOrigin: `50% ${Math.round(centro.enMarco)}px`,
              });
              if (m4Caja) {
                gsap.set(m4Caja, {
                  transformOrigin: `50% ${Math.round(centro.enEscenario - m4Caja.offsetTop)}px`,
                });
              }
            };
            ubicarOrigenes();
            // Sin invalidateOnRefresh: sus valores son fijos (las posiciones
            // en función sí se recalculan en cada refresh). Rearmarlo en cada
            // refresh solo costaba bloqueo.
            const aleja = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                start: inicioSalida,
                end: finSalida,
                scrub: SCRUB,
                onRefresh: () => {
                  ubicarOrigenes();
                  capa?.recalcular();
                },
              },
            });
            if (desktop && capaFichas) {
              aleja.fromTo(
                capaFichas,
                { opacity: 1 },
                { opacity: 0, duration: 0.16, ease: "sine.in" },
                0,
              );
            }
            // Se achica desde que arranca (todavía fijo: responde al scroll
            // enseguida) y se apaga de a poco mientras sube: sigue a la vista
            // en la mitad de arriba mientras entra Servicios y se termina de
            // ir cuando ya pasó bajo el nav.
            aleja.fromTo(
              m4Caja ? [marco, m4Caja] : marco,
              { scale: 1 },
              { scale: sal.escala, duration: 1, ease: TRAMO },
              0,
            );
            aleja.fromTo(
              marco,
              { opacity: 1 },
              {
                opacity: 0,
                duration: 1 - APAGADO_SALIDA.desde,
                ease: APAGADO_SALIDA.curva,
              },
              APAGADO_SALIDA.desde,
            );
            // Geometría de la salida con Servicios (null sin cierre o sin
            // encabezado): `hueco`, px entre la base del cierre y el encabezado
            // de Servicios al soltarse el pin (el escenario, fijo, arranca
            // justo debajo del nav); `brazo`, px entre el centro de la caja (de
            // donde se achica el grupo) y esa base. Con medidas de layout
            // (offset*, sin las transformaciones del momento en que se mide).
            const encabezadoServicios =
              document.querySelector<HTMLElement>(
                '#servicios [data-sv-parte="cabecera"]',
              ) ?? document.getElementById("servicios");
            const geometria = () => {
              const r = encabezadoServicios?.getBoundingClientRect();
              if (!m4Caja || !r) return null;
              const base =
                m4Caja.offsetTop +
                m4Caja.offsetHeight -
                (parseFloat(getComputedStyle(m4Caja).paddingBottom) || 0);
              const encabezado = r.top + window.scrollY - st.end - altoNav();
              return {
                hueco: encabezado - base,
                brazo: Math.max(0, base - centroCaja().enEscenario),
              };
            };
            const curvaEscala = gsap.parseEase(TRAMO);
            /** Escala del grupo `px` después de soltarse el pin. */
            const escalaTras = (px: number) => {
              const a = inicioSalida();
              const u = (st.end + px - a) / Math.max(1, finSalida() - a);
              return (
                1 - (1 - sal.escala) * curvaEscala(gsap.utils.clamp(0, 1, u))
              );
            };
            /**
             * Cuánto se le acercó el encabezado de Servicios a la base del
             * cierre `px` después de soltarse: lo que el grupo se atrasa (con
             * un atraso total `total`) menos lo que la base sube al achicarse.
             */
            const acercamiento = (px: number, total: number, brazo: number) => {
              const largo = tras();
              const atrasado =
                total > 0 ? total * despegue(total / largo)(px / largo) : 0;
              return atrasado - brazo * (1 - escalaTras(px));
            };
            // Deriva (profundidad), solo desde que se suelta: el grupo sube
            // más lento que la página. Despegue: al soltarse arranca
            // compensando TODA la velocidad de la página (sigue quieto en
            // pantalla) y la va soltando de a poco, hasta ir con la página
            // (con ease lineal pasaba en un cuadro de 0 a (1 - deriva) veces la
            // velocidad del scroll); en total se atrasa `atraso` px. Mientras
            // tanto el encabezado de Servicios se le acerca: si con la deriva
            // de los datos llegaría a recorrer más del 80% del hueco (mobile,
            // donde el cierre queda más cerca de Servicios), el atraso baja lo
            // justo: el despegue es más corto, como una costura, y arranca
            // igual desde velocidad 0.
            let derivaReal = sal.deriva;
            const atraso = () => {
              const largo = tras();
              let total = sal.deriva * largo;
              const g = geometria();
              if (g) {
                const tope = 0.8 * Math.max(0, g.hueco);
                for (let i = 0; i < 24 && total > 1; i++) {
                  let maximo = -Infinity;
                  for (let px = 0; px <= largo; px += 4) {
                    maximo = Math.max(maximo, acercamiento(px, total, g.brazo));
                  }
                  if (maximo <= tope) break;
                  total *= 0.85;
                }
              }
              derivaReal = Math.max(0.001, total / largo);
              return total;
            };
            const suelta = (p: number) => despegue(derivaReal)(p);
            const tlDeriva = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                start: () => st.end,
                end: () => st.end + tras(),
                scrub: SCRUB,
                invalidateOnRefresh: true,
              },
            });
            // El marco y el cierre, con la misma deriva y la misma curva (no
            // se enciman).
            tlDeriva.fromTo(
              m4Caja ? [marco, m4Caja] : marco,
              { y: 0 },
              { y: atraso, duration: 1, ease: suelta },
              0,
            );
            if (m4Caja) {
              // Red de seguridad: si aun así el encabezado llegara a recorrer
              // el 80% del hueco antes del final de la salida, cuántos px
              // después de soltarse (null: no llega).
              const choque = () => {
                const g = geometria();
                if (!g) return null;
                if (!(g.hueco > 0)) return 0;
                const largo = tras();
                const total = atraso();
                for (let px = 0; px <= largo; px += 4) {
                  if (acercamiento(px, total, g.brazo) >= 0.8 * g.hueco) {
                    return px;
                  }
                }
                return null;
              };
              const inicioFundido = () =>
                inicioSalida() +
                APAGADO_SALIDA.desde * (finSalida() - inicioSalida());
              const finFundido = () => {
                const px = choque();
                const fin =
                  px === null ? finSalida() : Math.min(finSalida(), st.end + px);
                return Math.max(inicioFundido() + 8, fin);
              };
              apagaCierre = gsap.fromTo(
                m4Caja,
                { opacity: 1 },
                {
                  opacity: 0,
                  ease: APAGADO_SALIDA.curva,
                  immediateRender: false,
                  // Valores fijos: sin invalidateOnRefresh (como `aleja`).
                  scrollTrigger: {
                    start: inicioFundido,
                    end: finFundido,
                    scrub: SCRUB,
                  },
                },
              );
            }

            // Memoria: una pantalla después de que la salida dejó el marco en
            // opacidad 0, el motor suelta sus bitmaps y achica el lienzo (en
            // un iPhone pesan justo cuando entra el video de Galería). Al
            // volver, una pantalla antes de que el marco se vuelva a ver, los
            // decodifica de nuevo (los blobs quedaron). Dormido, la carga por
            // tramos también espera.
            ScrollTrigger.create({
              start: () => st.end + tras() + window.innerHeight,
              end: "max",
              invalidateOnRefresh: true,
              onEnter: () => m.dormir(),
              onLeaveBack: () => m.despertar(),
            });
          }

          // Botones del inicio y del cierre: mientras su momento no se ve, no
          // reciben clicks ni foco de teclado (Tab no lleva a un botón
          // invisible ni lo muestra encima de otro momento). Solo se tocan los
          // atributos cuando cambia el estado, no en cada cuadro.
          const botones = (el: HTMLElement | null) =>
            el ? Array.from(el.querySelectorAll<HTMLElement>("a, button")) : [];
          const botonesM1 = botones(m1);
          const botonesM4 = botones(m4);
          const activar = (
            el: HTMLElement | null,
            lista: HTMLElement[],
            si: boolean,
          ) => {
            if (el) {
              if (si) el.style.removeProperty("pointer-events");
              else el.style.pointerEvents = "none";
            }
            lista.forEach((b) =>
              si ? b.removeAttribute("tabindex") : b.setAttribute("tabindex", "-1"),
            );
          };
          let ve1: boolean | null = null;
          let ve4: boolean | null = null;
          const sincronizar = () => {
            const p = linea.progress();
            const a = p < salida.desde + dSalida / 2;
            // El cierre: desde que entra hasta que la salida lo apaga.
            const b = cierreDentro() && (apagaCierre?.progress() ?? 0) < 0.6;
            if (a !== ve1) {
              ve1 = a;
              activar(m1, botonesM1, a);
            }
            if (b !== ve4) {
              ve4 = b;
              activar(m4, botonesM4, b);
            }
          };
          // Un solo callback por render del timeline: los dos lienzos se
          // dibujan en el mismo tick que se mueven los textos.
          const alActualizar = () => {
            sucio = false;
            m.irA(estado.cuadro);
            capa?.dibujar(estado.tapa);
            sincronizar();
          };
          // Durante un refresh de ScrollTrigger (al cargar, con las fuentes,
          // al cambiar el tamaño, cuando otra escena recalcula) el timeline se
          // revierte para medir: se renderiza en 0, con onUpdate, y vuelve a
          // su lugar sin avisar. Dibujar ahí llevaba el motor al cuadro 0: le
          // soltaba los cuadros decodificados de donde está la persona (al
          // volver, la caja mostraba otro cuadro hasta decodificarlos de
          // nuevo, ~50 ms) y la cola pedía los del principio. Mientras dura,
          // solo se marca: se dibuja en el cuadro siguiente, ya restaurado.
          let refrescando = false;
          const alEmpezarRefresh = () => {
            refrescando = true;
          };
          const alTerminarRefresh = () => {
            refrescando = false;
          };
          ScrollTrigger.addEventListener("refreshInit", alEmpezarRefresh);
          ScrollTrigger.addEventListener("refresh", alTerminarRefresh);
          quitarRefresh = () => {
            ScrollTrigger.removeEventListener("refreshInit", alEmpezarRefresh);
            ScrollTrigger.removeEventListener("refresh", alTerminarRefresh);
          };
          linea.eventCallback("onUpdate", () =>
            refrescando ? marcar() : alActualizar(),
          );
          apagaCierre?.eventCallback("onUpdate", () => {
            if (!refrescando) sincronizar();
          });
          // Rendimiento: el timeline queda iniciado (un render en 0, sin
          // callbacks). Si no, el primer refresh de su pin lo renderiza al
          // final y al principio para medir y después lo invalida entero (GSAP
          // no quiere fijar valores de partida antes de tiempo): todos los
          // tweens se volvían a armar, el doble de trabajo al cargar. Acá no
          // hace falta: lo que depende de la geometría se recalcula en cada
          // refresh (conFunciones) y el resto tiene valores fijos.
          linea.render(0, true, true);
          alActualizar();
          restaurarBotones = () => {
            [m1, m4].forEach((el) => el?.style.removeProperty("pointer-events"));
            [...botonesM1, ...botonesM4].forEach((b) =>
              b.removeAttribute("tabindex"),
            );
          };

          // Precarga después de `load` (no le compite al LCP). La tapa
          // desenfocada y la pasada inicial van enseguida; al terminar (y con
          // las fuentes listas, que cambian el alto del texto) se recalculan
          // las posiciones del pin, solo si las fuentes todavía cargaban
          // cuando se armó la escena (si no, ya se midió con las definitivas
          // y ese refresh completo costaba ~250 ms de bloqueo en un celular de
          // gama media sin cambiar nada). Los tramos esperan al primer scroll (quien
          // no scrollea no baja la secuencia) y siguen a la persona; si ya
          // scrolleó, arrancan con la pasada en curso (con el scroll en
          // reposo, lo que la caja tiene que mostrar ya va primero: con
          // deslizadas tempranas el cuadro exacto no espera la pasada
          // entera). No arrancan en una red lenta:
          // lo dice el tipo de red donde el navegador lo sabe (Chromium) y, si
          // no (iPhone), la primera tanda medida; si la pasada entera termina
          // lenta, se cortan. El scrub usa entonces el cuadro listo más
          // cercano. Con ahorro de datos no se llega acá (versión quieta).
          // Estado de las fuentes con la escena ya medida: el layout de sus
          // triggers ya pidió todas las que usa la página (con `swap`, las que
          // faltan quedan "loading").
          const fuentesPendientes = document.fonts?.status === "loading";
          let medidaLenta = false;
          const cargarTodo = async () => {
            capa?.cargarDesenfocada(heroSecuencia.tapa.desenfocada);
            const [primera = []] = pasadasDeCarga(version.cuadros, [
              PASADA_INICIAL,
            ]);
            const pasada = m.cargar(primera);
            void seguirAlScrollear();
            await pasada;
            const kbs = m.velocidadRed();
            if (kbs !== null && kbs < RED_LENTA_KBS) {
              medidaLenta = true;
              m.soltarTramos();
            }
            if (!fuentesPendientes) return;
            await document.fonts?.ready;
            if (!vivo) return;
            // Seguro (refresh(true)): si el usuario está scrolleando, GSAP lo
            // posterga al final del scroll. Un refresh forzado revierte los
            // pins y lleva la ventana a 0 y de vuelta: en táctiles cortaba el
            // momentum del dedo.
            ScrollTrigger.refresh(true);
          };
          const seguirAlScrollear = async () => {
            if (redLenta()) return;
            // El primer scroll lo avisa ScrollTrigger (que ya escucha el
            // scroll, también el de Lenis): sin listener propio.
            await new Promise<void>((resolve) => {
              if (window.scrollY > 0) return resolve();
              const alScrollear = () => {
                quitarEspera();
                resolve();
              };
              ScrollTrigger.addEventListener("scrollStart", alScrollear);
              quitarEspera = () =>
                ScrollTrigger.removeEventListener("scrollStart", alScrollear);
            });
            if (!vivo) return;
            // Sin tipo de red, la primera tanda de la pasada (o la pasada
            // entera, si terminó antes del scroll) dice si la red da.
            if (tipoDeRed() === null) {
              const kbs = await m.medirRed();
              if (kbs !== null && kbs < RED_LENTA_KBS) return;
            }
            if (!vivo || medidaLenta) return;
            await m.seguir({
              horizonte: desktop ? HORIZONTE.desktop : HORIZONTE.mobile,
            });
          };
          cancelar = despuesDeLoad(() => void cargarTodo());
        };

        try {
          if (!canvas || !pin || !marco || !m1) {
            throw new Error("HeroSecuencia: falta el DOM");
          }
          if (tarde || typeof createImageBitmap !== "function") {
            // La red de seguridad ya mostró horneado y cierre: se queda así.
            // Sin createImageBitmap (Safari < 15) el motor no puede decodificar
            // los cuadros (la CSP no permite <img> con blob:): la versión
            // final, con todo visible, en vez de un scrub trabado en el
            // cuadro 0.
            root.dataset.hs = "final";
          } else {
            root.dataset.hs = "escena";
            // Red extra: si el inicio no entra en el escenario (texto muy
            // grande para esa pantalla), fijarlo escondería los botones.
            // En "final" el escenario se estira al alto del inicio (CSS con
            // --hs-m1-h): arranca debajo del nav y no pisa lo que sigue.
            if (m1.offsetHeight > pin.clientHeight - MARGEN * 4) {
              root.style.setProperty(
                "--hs-m1-h",
                `${Math.ceil(m1.offsetHeight)}px`,
              );
              root.dataset.hs = "final";
            } else {
              const m = crearMotor({
                canvas,
                version,
                foco,
                escalaMax: desktop ? zoom : undefined,
                ventana: desktop ? VENTANA.desktop : VENTANA.mobile,
                // Desde el primer dibujo, el canvas tapa al <img> de respaldo.
                alDibujar: () => {
                  root.dataset.hsLienzo = "";
                },
              });
              motor = m;
              if (lienzoTapa && tapaImg) {
                // Lo que mueve al canvas de los cuadros dentro del escenario
                // (del más interno al más externo) y cómo leer lo que le puso
                // el timeline: la caché de transforms de GSAP, sin layout.
                const cadena = [imagen, encuadre, marco].filter(
                  (el): el is HTMLElement => el !== null,
                );
                const num = (el: HTMLElement, prop: string) =>
                  Number(gsap.getProperty(el, prop)) || 0;
                const transformDe = (el: HTMLElement): Desplazamiento => ({
                  x: num(el, "x"),
                  y: num(el, "y"),
                  xPercent: num(el, "xPercent"),
                  yPercent: num(el, "yPercent"),
                  escala: Number(gsap.getProperty(el, "scaleX")) || 1,
                });
                capa = crearTapa({
                  canvas: lienzoTapa,
                  referencia: canvas,
                  cadena,
                  transformDe,
                  tapa: tapaImg,
                  datos: heroSecuencia.tapa,
                  // El lienzo de la tapa reemplaza a la tapa fija del servidor.
                  alDibujar: () => {
                    root.dataset.hsTapa = "";
                  },
                });
              }
              armarEscena(m, pin);
            }
          }
        } catch (error) {
          // Fail-open: sin pin ni scrub y con todas las capas visibles.
          if (process.env.NODE_ENV !== "production") console.error(error);
          if (rafSync) cancelAnimationFrame(rafSync);
          rafSync = 0;
          sucio = false;
          tl?.revert();
          tl = null;
          cancelar();
          quitarEspera();
          quitarRefresh();
          restaurarBotones();
          motor?.destruir();
          motor = null;
          capa?.destruir();
          capa = null;
          if (animados.length) {
            gsap.set(animados, {
              clearProps: "opacity,transform,pointerEvents,visibility",
            });
          }
          quitarPreparacion();
          delete root.dataset.hsLienzo;
          delete root.dataset.hsTapa;
          root.dataset.hs = "final";
        }

        return () => {
          vivo = false;
          if (rafSync) cancelAnimationFrame(rafSync);
          rafSync = 0;
          pinRef.current = null;
          cancelar();
          quitarEspera();
          quitarRefresh();
          restaurarBotones();
          motor?.destruir();
          capa?.destruir();
          quitarPreparacion();
          limpiar();
        };
      });

      return () => {
        mm.revert();
        window.removeEventListener("resize", anotar);
        ScrollTrigger.removeEventListener("matchMedia", volver);
      };
    },
    { scope: rootRef },
  );

  const { desktop, mobile } = heroSecuencia.versiones;
  const { foco, encuadre, acercamiento } = heroSecuencia;
  // A lectores de pantalla solo llegan los productos confirmados (sin [[ ]]).
  const productos = heroSecuencia.fichas.filter((f) => !isPlaceholder(f.texto));
  const vars = {
    "--hs-ar-d": (desktop.ancho / desktop.alto).toFixed(5),
    "--hs-ar-m": (mobile.ancho / mobile.alto).toFixed(5),
    "--hs-foco": `${foco.x}% ${foco.y}%`,
    "--hs-caja-inicio": (encuadre.cajaInicio.abajo / 100).toFixed(4),
    "--hs-zoom": String(acercamiento.escala),
    "--hs-zoom-angosta": String(acercamiento.escalaAngosta),
  } as React.CSSProperties;

  return (
    // suppressHydrationWarning: HeroMarcaAhorro puede ponerle data-hs antes de
    // hidratar (React no lo maneja: lo maneja el useGSAP de arriba).
    <header
      id="inicio"
      ref={rootRef}
      style={vars}
      className="hs"
      suppressHydrationWarning
    >
      {/* Primero, antes de pintar nada del hero. */}
      <HeroMarcaAhorro />
      <div className="hs-pin">
        {/* 1 · Inicio (h1 visible desde el HTML del servidor). */}
        <div className="hs-m1">
          <div className="hs-m1-in">{inicio}</div>
        </div>

        <div className="hs-escena">
          <div className="hs-marco select-none">
            {/* Para lectores de pantalla: la escena es decorativa. */}
            {productos.length > 0 && (
              <div className="sr-only">
                <p id="hs-lista">{heroSecuencia.listaTitulo}</p>
                <ul aria-labelledby="hs-lista">
                  {productos.map((f) => (
                    <li key={f.id}>{f.texto}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Encuadre: lo que sube (mobile) para dejarle lugar al cierre. */}
            <div className="hs-encuadre">
              {/* Detrás de los cuadros (transparentes fuera de los productos). */}
              <div aria-hidden className="hs-halo" />
              <div aria-hidden className="hs-imagen">
                <HeroSecuenciaPoster />
                <canvas className="hs-canvas" />
                <HeroTapaFija />
              </div>
              <HeroFichas />
            </div>
          </div>
          {/* La tapa en vivo: encima del marco y a todo el escenario (puede
              salirse del marco al acercarse a la cámara). */}
          <canvas aria-hidden className="hs-tapa-lienzo" />
          <HeroAviso />
        </div>

        {/* 2 · Horneado, 3 · Cifras y 5 · Cierre (4 · fichas, en el marco;
            6 · salida, sin texto propio). */}
        <HeroHorneado />
        <HeroCifras />
        <HeroCierre />

        {/* Confianza: con el inicio. */}
        <div className="hs-confianza">
          <div className="hs-confianza-in">{confianza}</div>
        </div>
      </div>
    </header>
  );
}
