"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { Container } from "@/components/ui/Section";
import { Kicker } from "@/components/ui/Kicker";
import { Pill } from "@/components/ui/Pill";
import { Reveal } from "@/components/ui/Reveal";
import { Estrellas } from "@/components/ui/Estrellas";
import { resenas, isPlaceholder } from "@/content/data";
import { COSTURA, SCRUB, TRAMO, resorteGsap } from "@/lib/fisica";
import {
  altoNav,
  anticiparPin,
  capaActiva,
  conCostura,
  gsap,
  medidaPorTarea,
  prepararTransformes,
  scrollNativo,
  ScrollTrigger,
  useGSAPEnCola,
} from "@/lib/gsap";
import styles from "./Resenas.module.css";

/* ==========================================================================
 * Reseñas: el 5.0 como momento.
 *
 * Con movimiento, la sección se fija y el scroll arma la calificación: un
 * 5.0 GIGANTE que va de 0.0 a 5.0 mientras las cinco estrellas se llenan de
 * a una (relleno amarillo con scaleX), ATADO al scroll como el resto de las
 * escenas: bajando, el número sube y las estrellas se llenan; subiendo, baja
 * y se vacían. Nada por tiempo. El número se ve SIEMPRE (nunca opacidad ni
 * hueco en la pila, tampoco antes del pin): lo único que cambia es su valor
 * y el relleno de las estrellas. La cantidad de reseñas no se muestra en la
 * página (pedido de Benjamin): solo va en el JSON-LD, para Google.
 * Después la pila gigante vuelve a su lugar en el encabezado (FLIP con
 * transform) y las cuatro reseñas se reparten desde un mazo, con un giro
 * leve que se endereza al apoyarse.
 *
 * Modos (atributo data-rs del <section>, CSS en Resenas.module.css):
 *   - sin atributo: SSR y sin JS. Encabezado con el 5.0, estrellas llenas y
 *     las cuatro cartas en grilla, todo visible (fail-open).
 *   - "escena": desktop (>=760px) donde encabezado y grilla entran en el alto
 *     útil. Se fija el escenario entero: arma, vuelve al encabezado, el mazo
 *     sube y reparte las cuatro cartas a la grilla.
 *   - "mazo": mobile, o desktop donde la grilla no entra. Todo junto en una
 *     pantalla: el 5.0 gigante cuenta arriba con el mazo ya a la vista debajo,
 *     vuelve al encabezado y se reparte la primera fila (pin corto). Al
 *     soltarse, el mazo se queda quieto en pantalla mientras la columna sube:
 *     cada carta sale del mazo cuando su lugar llega a él, se endereza y se
 *     apoya. Nunca hay huecos: debajo de la última carta apoyada siempre está
 *     el mazo.
 *   - "quieto": reducir movimiento o pantalla muy baja. Nada fijado ni
 *     scrubbeado: la versión estática completa.
 * El estado final de cada modo es exactamente el layout estático (el FLIP y
 * el mazo son solo transforms que vuelven a cero). Rendimiento: estrellas y
 * cartas del mazo con quickSetter (sin estado de React por cuadro); solo
 * transform y opacity, más el texto del número, que se escribe solo cuando
 * cambia la décima (la caja del número no cambia de ancho). Mientras la
 * sección está cerca (capaActiva), cartas, sombras y dorsos son capas propias
 * (will-change en el CSS): moverlas no vuelve a rasterizar la carta entera en
 * cada cuadro. Todo se revierte al desmontar (useGSAP + matchMedia).
 *
 * Botones: "Ver perfil de Google" (fantasma, secundario: saca de la página)
 * aparece en el encabezado cuando la pila vuelve a su lugar; "Pedir
 * presupuesto" (el único amarillo de la sección, L6) va debajo de las cartas,
 * FUERA del escenario: no cambia el encaje ni la geometría del mazo, y entra
 * con Reveal (resorte `entrada`, una sola vez) cuando llega a la pantalla.
 * Con teclado, el foco en el perfil antes de que la escena lo ubique lleva el
 * scroll al punto armado (enfocarPerfil).
 *
 * Física (lib/fisica.ts): scrub directo (SCRUB) y, en los dos modos, costura
 * (conCostura) sobre el envoltorio `data-rs-costura`: el pin se fija
 * COSTURA.d px antes y el contenido frena hasta quedar quieto, y antes de
 * soltarse vuelve a tomar la velocidad del scroll de a poco. Con scroll nativo
 * (táctiles, scrollNativo) la costura va apagada (d = 0), como en las demás
 * escenas: con el dedo el transform llega un cuadro tarde. Los tramos van
 * con TRAMO (sin velocidad al empezar y al terminar; también la cuenta del
 * 5.0) y los que se asientan (estrellas, giro de las cartas) con la forma del
 * resorte `pop`. Todo lo que arma la
 * escena termina antes de la rampa de salida: ahí aterriza el ancla #resenas.
 * ========================================================================== */

/**
 * Recorrido fijado, en pantallas. Con la costura el pin es 0.2 pantallas más
 * largo que antes (1.8 y 1.0) y los tiempos de abajo se achicaron en la misma
 * proporción: cada paso cae en el mismo px de scroll que antes y lo último
 * termina antes de la rampa de salida.
 */
const RECORRIDO = { escena: 2.0, mazo: 1.2 };
/** Aire extra (px) que tiene que sobrar para usar la escena completa. */
const HOLGURA = 40;

/**
 * Tiempos del timeline, en progreso (0 a 1). [inicio, duración].
 * Escena: arma, respira, vuelve al encabezado mientras sube el mazo, reparte.
 * Lo último (la cuarta carta) termina en 0.8775, antes de la rampa de salida
 * de la costura (desde 1 - 2·COSTURA.d / recorrido: 0.91 a 900px de alto).
 */
const T_ESCENA = {
  arma: [0.027, 0.27],
  forma: [0.36, 0.144],
  perfil: 0.477,
  sube: [0.387, 0.153],
  reparte: [0.54, 0.0675, 0.135], // inicio, separación entre cartas, duración
} as const;
/**
 * Mazo: arma, vuelve al encabezado y reparte la primera fila. La primera fila
 * se apoya en 0.73 (una columna) o 0.79 (dos), antes de la rampa de salida
 * (0.84 a 844px de alto).
 */
const T_MAZO = {
  arma: [0.017, 0.333],
  forma: [0.367, 0.183],
  perfil: 0.5,
  // La primera carta despega mientras el encabezado se forma (sin un
  // momento vacío entre los dos).
  reparte: [0.417, 0.058, 0.317], // inicio, separación entre cartas, duración
} as const;

/** Lo que tarda (en progreso) el fundido de "Ver perfil de Google". */
const PERFIL_DUR = 0.06;
/**
 * Desde qué progreso el perfil se lee en su lugar: la pila ya volvió al
 * encabezado y el link terminó de aparecer. Antes de eso, el 5.0 gigante
 * está encima (el foco con teclado salta al punto armado: enfocarPerfil).
 */
const perfilListo = (t: {
  forma: readonly [number, number];
  perfil: number;
}) => Math.max(t.forma[0] + t.forma[1], t.perfil + PERFIL_DUR);

/**
 * Cómo queda cada carta en el mazo: corrimiento (px) y giro (grados) respecto
 * del centro de la pila. La primera va arriba y es la primera en salir.
 */
const MAZO = [
  { x: -6, y: 4, r: -4 },
  { x: 10, y: -6, r: 3 },
  { x: -12, y: 10, r: -7 },
  { x: 14, y: 2, r: 5.5 },
];

/** Geometría del modo mazo. */
const PILA = {
  /** Aire (px) entre el nav y el escenario fijado. */
  arriba: 20,
  /** Línea del mazo: fracción del alto útil, medida desde arriba del escenario. */
  linea: 0.6,
  /** Aire (px) entre la pila gigante y el mazo mientras cuenta. */
  aire: 28,
  /** Cada carta de más abajo en el mazo: cuánto se achica y cuánto asoma (px). */
  achica: 0.04,
  asoma: 9,
  /** Sombra de las cartas de abajo (la de arriba va entera). */
  sombraFondo: 0.55,
  /** Salida de cada carta, en altos de pantalla antes y después de apoyarse. */
  antes: 0.1,
  despues: 0.12,
  /** Desfase (px de scroll) de la segunda columna al repartir una fila. */
  columna: 44,
  /** Suavizado (px) del momento en que la carta deja el mazo y sigue a la página. */
  suave: 64,
  /** Saltito (px) de la carta al dejar el mazo (después del pin). */
  salto: 14,
  /** En una columna, los giros del mazo más suaves (la carta ocupa el ancho). */
  giroAngosto: 0.75,
  /** Tramo (en altos de pantalla) en que se descubre la cara de la carta. */
  revela: 0.08,
} as const;

// ancho y angosto son complementarios: matchMedia solo llama al armado cuando
// alguna condición se cumple, así que siempre tiene que haber una verdadera.
const MQ = {
  ancho: "(min-width: 760px)",
  angosto: "(max-width: 759.98px)",
  bajo: "(max-height: 419.98px)",
  reduce: "(prefers-reduced-motion: reduce)",
};

type Condiciones = {
  ancho: boolean;
  angosto: boolean;
  bajo: boolean;
  reduce: boolean;
};
type Modo = "escena" | "mazo" | "quieto";
type Caja = { x: number; y: number; w: number; h: number };
type Pose = { x: number; y: number; s: number };
type Zona = { arriba: number; abajo: number };

const NOTA = resenas.rating;
/** La nota como la muestra el servidor (y la versión quieta): "5.0". */
const NOTA_TEXTO = NOTA.toFixed(1);
/** Las cuatro reseñas con servicio confirmado (las del mockup). */
const TARJETAS = resenas.items.filter((r) => r.servicioConfirmado).slice(0, 4);

/** Alto visible debajo del nav. */
const altoUtil = () => window.innerHeight - altoNav();

/**
 * Caja de layout de `el` relativa a `marco` (que tiene que estar
 * posicionado). Usa offset*, que ignoran los transforms: mide siempre el
 * lugar "de reposo", aunque el elemento esté en medio de una animación.
 */
function caja(el: HTMLElement, marco: HTMLElement): Caja {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== marco) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

const acotar = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Px que la costura (conCostura, lib/gsap.ts) ya corrió el contenido en la
 * rampa de salida del pin: 0 hasta que empieza, crece con velocidad continua
 * y queda en l/2 después de soltarse. Misma cuenta que conCostura, con la
 * misma `d` (0 con scroll nativo).
 */
function salidaCostura(st: ScrollTrigger, d: number): number {
  const D = st.end - st.start;
  const l = Math.max(0, Math.min(2 * d, D / 4));
  if (!(D > 0) || !l) return 0;
  const s = acotar(st.scroll() - st.start, 0, D);
  if (s <= D - l) return 0;
  const u = (s - (D - l)) / l;
  return (l / 2) * u * u;
}

/** Ancla #resenas: todo armado, 8px antes de la rampa de salida de la costura. */
const antesDeLaSalida = (st: ScrollTrigger, d: number) => st.end - 2 * d - 8;

/**
 * Mínimo suave entre `a` y 0 (radio `k`): igual a min(a, 0) lejos del
 * cruce, sin quiebre de velocidad en el cruce.
 */
function minSuave(a: number, k: number): number {
  const h = Math.max(k - Math.abs(a), 0) / k;
  return Math.min(a, 0) - (h * h * k) / 4;
}

/**
 * Primer momento: kicker, número y estrellas apilados y centrados en la zona
 * (por defecto, el marco entero), con el número gigante. Devuelve, para cada
 * parte, el transform (desde su lugar en el encabezado) que la lleva a la
 * pila.
 */
function pilaGigante(
  marco: HTMLElement,
  partes: HTMLElement[],
  zona?: Zona,
): Pose[] {
  const [, num] = partes;
  const W = marco.offsetWidth;
  const arriba = zona?.arriba ?? 0;
  const alto = (zona?.abajo ?? marco.offsetHeight) - arriba;
  const cajas = partes.map((p) => caja(p, marco));
  const fuente = parseFloat(getComputedStyle(num).fontSize) || 80;
  // Sin zona (escena), el número toma el 30% del alto útil; con zona (mazo),
  // el 42% de la zona, que es más chica porque comparte pantalla con el mazo.
  const tope = zona ? alto * 0.42 : altoUtil() * 0.3;
  const sN = acotar(Math.min(tope, W * 0.44) / fuente, 1.3, 3.4);
  // Kicker, número y estrellas.
  const escalas = [1, sN, 1 + (sN - 1) * 0.5];
  const altos = cajas.map((c, i) => c.h * escalas[i]);
  // Kicker -> número: la caja del número trae aire propio arriba de las
  // cifras (~0.15em con leading 0.9), así que se descuenta para que el hueco
  // visible quede en ~26px.
  const huecos = [26 - 0.15 * fuente * sN, altos[1] * 0.1, 0];
  const total =
    altos.reduce((a, b) => a + b, 0) + huecos.reduce((a, b) => a + b, 0);
  let y = arriba + alto / 2 - total / 2;
  return cajas.map((c, i) => {
    const centro = y + altos[i] / 2;
    y += altos[i] + huecos[i];
    return {
      x: W / 2 - (c.x + c.w / 2),
      y: centro - (c.y + c.h / 2),
      s: escalas[i],
    };
  });
}

export function Resenas() {
  const rootRef = useRef<HTMLElement>(null);
  const showProfile = !isPlaceholder(resenas.profileUrl);

  useGSAPEnCola(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const q = (sel: string) => root.querySelector<HTMLElement>(sel);
      const qa = (sel: string) =>
        Array.from(root.querySelectorAll<HTMLElement>(sel));

      const escenario = q("[data-rs-escenario]");
      const costura = q("[data-rs-costura]");
      const cabeza = q("[data-rs-cabeza]");
      const mazo = q("[data-rs-mazo]");
      const kicker = q("[data-rs-kicker]");
      const num = q("[data-rs-num]");
      const estrellas = q("[data-rs-estrellas]");
      const perfil = q("[data-rs-perfil]");
      const lugares = qa("[data-rs-lugar]");
      const cartas = qa("[data-rs-carta]");
      const sombras = qa("[data-rs-sombra]");
      const velos = qa("[data-rs-velo]");
      const rellenos = qa("[data-estrella-relleno]");
      if (
        !escenario ||
        !costura ||
        !cabeza ||
        !mazo ||
        !kicker ||
        !num ||
        !estrellas
      ) {
        return;
      }
      const partes = [kicker, num, estrellas];

      /** ¿Encabezado + grilla entran en el alto útil? (ignora transforms y pin) */
      const encaja = (holgura: number) => {
        const hueco = parseFloat(getComputedStyle(mazo).marginTop) || 0;
        const alto = cabeza.offsetHeight + hueco + mazo.offsetHeight;
        return alto + holgura <= altoUtil();
      };

      /**
       * La calificación según el avance (0 a 1), sin React: el número va de
       * 0.0 a la nota y cada estrella se llena en su quinto (relleno con
       * scaleX) y se asienta con la forma del resorte `pop`. Número y
       * estrellas salen del mismo avance: la estrella k termina de llenarse
       * cuando el número marca k.0 (décima más cercana), y el 5.0 llega con
       * las cinco llenas. El número nunca se oculta: solo cambia su texto.
       */
      // Rendimiento: los transforms de las estrellas se leen en una sola tanda
      // antes de crear sus quickSetter (prepararTransformes, lib/gsap.ts).
      const quitarPrepEstrellas = prepararTransformes(rellenos);
      const llenar = rellenos.map((r) => gsap.quickSetter(r, "scaleX"));
      // El texto del número (el valor, encima de la copia que fija la caja):
      // se cambia el dato del nodo que trajo el servidor (no se reemplaza el
      // nodo, que es de React) y solo cuando cambia la décima (51 valores en
      // todo el armado).
      const valorNum = q("[data-rs-valor]") ?? num;
      const textoNum =
        valorNum.firstChild instanceof Text ? valorNum.firstChild : null;
      let escrito = valorNum.textContent ?? NOTA_TEXTO;
      const escribir = (texto: string) => {
        if (texto === escrito) return;
        escrito = texto;
        if (textoNum) textoNum.data = texto;
        else valorNum.textContent = texto;
      };
      const pintar = (p: number) => {
        const n = Math.max(1, rellenos.length);
        for (let i = 0; i < n; i++) {
          const e = Math.min(1, Math.max(0, p * n - i));
          llenar[i]?.(e);
        }
        const decimas = Math.round(NOTA * 10 * acotar(p, 0, 1));
        escribir((decimas / 10).toFixed(1));
      };
      /** Deja la calificación como la trae el servidor: 5.0 y las cinco llenas. */
      const restaurar = () => {
        pintar(1);
        escribir(NOTA_TEXTO);
        gsap.set(rellenos, { clearProps: "transform" });
      };

      /**
       * Las anclas (#resenas del nav) aterrizan en `destino`, no en el
       * arranque del pin: ahí ya está todo armado. Lenis y el navegador
       * respetan scroll-margin-top (negativo = más abajo).
       */
      const aterrizar = (destino: number) => {
        const arriba = root.getBoundingClientRect().top + window.scrollY;
        root.style.scrollMarginTop = `${Math.round(arriba - destino)}px`;
      };

      /**
       * Un avance (0 a 1) que corre `alCambiar` en cada render del timeline.
       * Es un setter y no un onUpdate: ScrollTrigger renderiza en silencio
       * (sin callbacks) al refrescar o al cargar con el scroll restaurado a
       * mitad de la escena, y el setter corre igual.
       */
      const avance = (alCambiar: (v: number) => void) => {
        let actual = 0;
        return {
          get p() {
            return actual;
          },
          set p(v: number) {
            actual = v;
            alCambiar(v);
          },
        };
      };

      /**
       * Arma: el número cuenta de 0.0 a 5.0 y las estrellas se llenan ATADOS
       * al scroll (scrub directo, en las dos direcciones), en un tramo TRAMO:
       * sin velocidad al empezar ni al terminar. Antes del tramo (también
       * antes del pin) se ve 0.0 con las estrellas vacías; después, 5.0 con
       * las cinco llenas. Con un avance (setter): corre también en los
       * renders silenciosos de ScrollTrigger (refresh, carga con el scroll
       * restaurado a mitad de la escena).
       */
      const armado = (
        tl: gsap.core.Timeline,
        [inicio, dur]: readonly [number, number],
      ) => {
        tl.fromTo(
          avance(pintar),
          { p: 0 },
          { p: 1, duration: dur, ease: TRAMO },
          inicio,
        );
      };

      /** La pila gigante vuelve a su lugar en el encabezado (FLIP). */
      const forma = (
        tl: gsap.core.Timeline,
        marco: HTMLElement,
        [inicio, dur]: readonly [number, number],
        tPerfil: number,
        zona?: () => Zona,
      ) => {
        // Las doce poses (x, y y escala de las cuatro partes, de ida y de
        // vuelta) salen de UNA medida por tarea (medidaPorTarea): GSAP las
        // evalúa intercaladas con sus escrituras y cada una volvía a maquetar.
        const poses = medidaPorTarea(() =>
          pilaGigante(marco, partes, zona?.()),
        );
        const pose = (el: HTMLElement) => poses()[partes.indexOf(el)];
        const px = (_: number, el: HTMLElement) => pose(el).x;
        const py = (_: number, el: HTMLElement) => pose(el).y;
        const ps = (_: number, el: HTMLElement) => pose(el).s;
        // 2D: el texto escalado se vuelve a rasterizar nítido en cada cuadro.
        const nitido = { force3D: false };
        const [kick, n, est] = partes;
        // Kicker y número viajan primero; el número se achica rápido, antes
        // de llegar a su lugar (le abre lugar a las estrellas). Las estrellas
        // salen después y frenan al final: así nunca se pisan con él.
        tl.fromTo(
          [kick, n],
          { x: px, y: py },
          { x: 0, y: 0, duration: dur, ease: TRAMO, ...nitido },
          inicio,
        );
        tl.fromTo(
          n,
          { scale: ps },
          { scale: 1, duration: dur * 0.62, ease: TRAMO, ...nitido },
          inicio,
        );
        tl.fromTo(
          est,
          { x: px, y: py, scale: ps },
          {
            x: 0,
            y: 0,
            scale: 1,
            duration: dur * 0.7,
            ease: TRAMO,
            ...nitido,
          },
          inicio + dur * 0.3,
        );
        if (perfil) {
          // Opacidad y no autoAlpha: con visibility hidden el link quedaba
          // fuera del orden de Tab (con teclado nunca se llegaba a Google).
          // Con foco se ve entero (Resenas.module.css). Mientras no se ve, no
          // toma clicks (pointer-events con un avance: corre también en los
          // renders silenciosos de ScrollTrigger).
          tl.fromTo(
            perfil,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: PERFIL_DUR, ease: TRAMO },
            tPerfil,
          );
          const tocable = avance((v) => {
            perfil.style.pointerEvents = v > 0.5 ? "" : "none";
          });
          tl.fromTo(
            tocable,
            { p: 0 },
            { p: 1, duration: PERFIL_DUR },
            tPerfil,
          );
        }
      };

      const cierre = (tl: gsap.core.Timeline) => tl.to({}, { duration: 0 }, 1);

      /**
       * Teclado: con Tab a "Ver perfil de Google", el navegador scrollea lo
       * justo para mostrar el link, y eso cae al principio de la escena (o
       * antes del pin), con el 5.0 gigante todavía encima. Si el foco llega
       * antes de que el perfil esté en su lugar (`listo`), el scroll salta al
       * punto armado, el mismo en el que aterriza el ancla #resenas: el link
       * queda en el encabezado, legible. Un cuadro después del scroll del
       * navegador, e instantáneo (como el foco en Servicios): en táctiles
       * <html> lleva scroll-behavior smooth y recorrería la escena entera.
       * Solo con foco de teclado (:focus-visible).
       */
      const enfocarPerfil = (
        tl: gsap.core.Timeline,
        d: number,
        listo: number,
      ) => {
        if (!perfil) return () => {};
        let cuadro = 0;
        const alEnfocar = (e: FocusEvent) => {
          const el = e.target as HTMLElement | null;
          if (!el?.matches?.(":focus-visible")) return;
          cancelAnimationFrame(cuadro);
          cuadro = requestAnimationFrame(() => {
            const st = tl.scrollTrigger;
            // Con el scroll de ahora (st.progress puede venir de antes del
            // scroll del foco).
            if (!st || st.scroll() >= lerp(st.start, st.end, listo)) return;
            window.scrollTo({
              top: Math.round(antesDeLaSalida(st, d)),
              behavior: "instant",
            });
            ScrollTrigger.update();
          });
        };
        perfil.addEventListener("focusin", alEnfocar);
        return () => {
          cancelAnimationFrame(cuadro);
          perfil.removeEventListener("focusin", alEnfocar);
        };
      };

      /* ---- Escena completa: se fija el escenario entero ---------------- */
      const armarEscena = () => {
        // Con la costura el escenario se fija COSTURA.d px más abajo y el
        // contenido sube hasta su lugar de siempre: el recorte del escenario
        // (overflow: clip en el CSS) le cortaría la parte de arriba. Solo se
        // recorta abajo (donde espera el mazo), y a los costados ya recorta la
        // sección.
        const estiloPrevio = {
          overflow: escenario.style.overflow,
          clipPath: escenario.style.clipPath,
        };
        escenario.style.overflow = "visible";
        escenario.style.clipPath = "inset(-100vh -100vw 0 -100vw)";

        // El escenario ocupa el alto útil y centra el contenido: debajo de la
        // grilla queda aire que crece con el alto de la pantalla. El botón del
        // final lo descuenta (Resenas.module.css, .cta) con el alto del
        // contenido, que solo cambia con el ancho: se mide antes de cada
        // refresh, así los triggers de más abajo ya ven el lugar nuevo.
        const medirContenido = () =>
          root.style.setProperty("--rs-contenido", `${costura.offsetHeight}px`);
        medirContenido();
        ScrollTrigger.addEventListener("refreshInit", medirContenido);

        // Costura apagada con scroll nativo (tablets táctiles en horizontal).
        const d = scrollNativo() ? 0 : COSTURA.d;
        const recorrido = () =>
          Math.round(window.innerHeight * RECORRIDO.escena);
        const { vars, limpiar } = conCostura(
          {
            trigger: escenario,
            pin: escenario,
            // 1 solo con scroll nativo: sin anticipar, el pin tiembla al fijarse.
            anticipatePin: anticiparPin(),
            start: () => `top ${altoNav() + d}px`,
            end: () => `+=${recorrido()}`,
            scrub: SCRUB,
            invalidateOnRefresh: true,
            // Con refreshPriority presente, ScrollTrigger ordena los refresh
            // por posición en la página (hay secciones que arman sus pins
            // tarde): el pin de acá queda bien corrido igual.
            refreshPriority: 0,
            // Todo armado y antes de la rampa de salida.
            onRefresh: (self) => aterrizar(antesDeLaSalida(self, d)),
          },
          costura,
          { d, recorrido },
        );
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: vars,
        });

        armado(tl, T_ESCENA.arma);
        forma(tl, escenario, T_ESCENA.forma, T_ESCENA.perfil);

        // El mazo: cada carta, corrida al centro de la grilla (más su
        // desorden) y, de arranque, por debajo del borde del escenario.
        // Una medida por tarea para todas las cartas (medidaPorTarea).
        const geoMazo = medidaPorTarea(() => {
          const m = caja(mazo, escenario);
          const alto = Math.max(...lugares.map((l) => l.offsetHeight));
          return {
            enMazo: lugares.map((lugar, i) => {
              const c = caja(lugar, escenario);
              const d = MAZO[i % MAZO.length];
              return {
                x: m.x + m.w / 2 - (c.x + c.w / 2) + d.x,
                y: m.y + m.h / 2 - (c.y + c.h / 2) + d.y,
                r: d.r,
              };
            }),
            debajo:
              escenario.offsetHeight - (m.y + m.h / 2) + alto * 0.75 + 60,
          };
        });
        const enMazo = (i: number) => geoMazo().enMazo[i];
        const debajo = () => geoMazo().debajo;

        const [sInicio, sDur] = T_ESCENA.sube;
        tl.fromTo(
          cartas,
          {
            x: (i: number) => enMazo(i).x,
            y: (i: number) => enMazo(i).y + debajo(),
            rotation: (i: number) => enMazo(i).r,
          },
          {
            x: (i: number) => enMazo(i).x,
            y: (i: number) => enMazo(i).y,
            rotation: (i: number) => enMazo(i).r,
            duration: sDur,
            ease: TRAMO,
            stagger: 0.012,
          },
          sInicio,
        );

        const [rInicio, rSep, rDur] = T_ESCENA.reparte;
        const giro = resorteGsap("pop").ease;
        cartas.forEach((carta, i) => {
          const t = rInicio + i * rSep;
          // x e y con curvas distintas: la carta viaja en arco, no en recta,
          // y las dos arrancan y llegan sin escalón de velocidad. Excepción
          // a TRAMO a propósito: power2.inOut en y es lo que curva el arco.
          tl.to(carta, { x: 0, duration: rDur, ease: TRAMO }, t)
            .to(carta, { y: 0, duration: rDur, ease: "power2.inOut" }, t)
            .to(carta, { rotation: 0, duration: rDur, ease: giro }, t);
          if (sombras[i]) {
            // Levantada en el mazo y en el vuelo; se apoya al llegar.
            tl.fromTo(
              sombras[i],
              { opacity: 1 },
              { opacity: 0, duration: rDur * 0.45 },
              t + rDur * 0.55,
            );
          }
          if (i > 0 && velos[i]) {
            // Dorso liso mientras está debajo de otra; la cara se descubre
            // cuando sale la de arriba (del mazo solo asoman bordes prolijos).
            tl.fromTo(
              velos[i],
              { opacity: 1 },
              { opacity: 0, duration: rSep },
              t - rSep,
            );
          }
        });

        cierre(tl);
        const quitarFoco = enfocarPerfil(tl, d, perfilListo(T_ESCENA));

        return () => {
          quitarFoco();
          ScrollTrigger.removeEventListener("refreshInit", medirContenido);
          root.style.removeProperty("--rs-contenido");
          limpiar();
          escenario.style.overflow = estiloPrevio.overflow;
          escenario.style.clipPath = estiloPrevio.clipPath;
        };
      };

      /* ---- Mazo: todo junto en pantalla, el mazo acompaña a la columna -- */
      const armarMazo = () => {
        const N = cartas.length;
        // Costura apagada con scroll nativo (el modo de los teléfonos): con el
        // dedo el transform de la costura llega un cuadro tarde.
        const d = scrollNativo() ? 0 : COSTURA.d;
        // Todas sin escalón de velocidad al salir y al llegar (TRAMO); el giro
        // se asienta con el resorte `pop`.
        const cfX = gsap.parseEase(TRAMO);
        // Vuelo de la primera fila: x e y con curvas distintas (arco).
        const cfVueloX = gsap.parseEase(TRAMO);
        // Excepción a TRAMO a propósito: con la misma curva en x e y el vuelo
        // sería una recta (power2.inOut también arranca y llega en 0).
        const cfVueloY = gsap.parseEase("power2.inOut");
        const cfGiro = resorteGsap("pop").ease;

        /**
         * Geometría en coordenadas del escenario (medida con offset*, sin
         * transforms). La "línea" es dónde espera el mazo, fija en pantalla
         * mientras está el pin y después, mientras la columna sube.
         */
        const geo = {
          linea: 0,
          dx: [] as number[],
          dy: [] as number[],
          h: [] as number[],
          r: [] as number[],
          fila: [] as boolean[],
          salida: [] as number[],
          ventana: 1,
          revela: 1,
        };
        const medir = () => {
          const m = caja(mazo, escenario);
          const util = altoUtil() - PILA.arriba;
          // Debajo del primer lugar y con al menos 120px del mazo a la vista.
          geo.linea = Math.round(
            acotar(util * PILA.linea, m.y + 80, Math.max(m.y + 80, util - 120)),
          );
          const cx = m.x + m.w / 2;
          geo.ventana = window.innerHeight * (PILA.antes + PILA.despues);
          geo.revela = window.innerHeight * PILA.revela;
          const unaColumna = lugares.every(
            (l) => l.offsetLeft === lugares[0].offsetLeft,
          );
          let col = 0;
          lugares.forEach((l, i) => {
            const c = caja(l, escenario);
            const d = MAZO[i % MAZO.length];
            const primera = c.y <= m.y + 1;
            col =
              i > 0 && c.y === caja(lugares[i - 1], escenario).y ? col + 1 : 0;
            geo.dx[i] = cx - (c.x + c.w / 2) + d.x;
            geo.dy[i] = geo.linea - c.y + d.y;
            geo.h[i] = c.h;
            geo.r[i] = d.r * (unaColumna ? PILA.giroAngosto : 1);
            geo.fila[i] = primera;
            // Scroll (después del pin) en que el lugar llega al mazo, menos
            // el tramo previo de la salida; la segunda columna, un poco
            // después (la fila se reparte de a una).
            geo.salida[i] =
              c.y -
              geo.linea -
              window.innerHeight * PILA.antes +
              col * PILA.columna;
          });
        };

        // Las cartas de la primera fila se reparten dentro del pin.
        const reparto = cartas.map(() => avance(() => pintarMazo()));
        let st: ScrollTrigger | undefined = undefined;

        const pone = cartas.map((c) => ({
          x: gsap.quickSetter(c, "x", "px"),
          y: gsap.quickSetter(c, "y", "px"),
          r: gsap.quickSetter(c, "rotation", "deg"),
        }));
        // Sin escala: quickSetter no acepta el atajo "scale" (lo escribe como el
        // atributo "scaleX,scaleY", que el WebKit de iPhone rechaza con un error
        // que frenaba todas las escenas) y el mazo aprobado es sin escalar.
        const sombra = sombras.map((s) => gsap.quickSetter(s, "opacity"));
        const tapa = velos.map((s) => gsap.quickSetter(s, "opacity"));
        const salio = new Array<number>(N).fill(0);

        function pintarMazo() {
          if (!geo.dx.length) return;
          // Scroll "después del pin" medido en el contenido: incluye lo que la
          // costura ya lo corrió en la rampa de salida, así el mazo queda
          // clavado en pantalla mientras la columna empieza a subir.
          const v = st
            ? Math.max(0, st.scroll() - st.end) + salidaCostura(st, d)
            : 0;
          for (let i = 0; i < N; i++) {
            salio[i] = geo.fila[i]
              ? reparto[i].p
              : acotar((v - geo.salida[i]) / geo.ventana, 0, 1);
          }
          // Alto de la carta de arriba del mazo (la próxima en salir),
          // mezclado mientras sale para que el mazo no salte.
          let f = 0;
          while (f < N && salio[f] >= 1) f++;
          const hArriba =
            f >= N
              ? 0
              : lerp(geo.h[f], geo.h[Math.min(f + 1, N - 1)], salio[f]);

          let delante = 0;
          for (let i = 0; i < N; i++) {
            // Profundidad: cuántas cartas quedan todavía encima de esta.
            const d = delante;
            delante += 1 - salio[i];
            const h = geo.h[i];
            // Las de abajo, un poco más chicas y asomando por abajo (nunca
            // más altas que la de arriba: no se les ve el texto).
            const s0 =
              d > 0 ? Math.min(1 - PILA.achica * d, (hArriba + 4 * d) / h) : 1;
            const oy =
              d > 0 ? hArriba + PILA.asoma * d - ((1 + s0) * h) / 2 : 0;
            const e = salio[i];
            const aire = Math.sin(Math.PI * e);

            // Cara tapada (dorso liso) mientras está debajo de otra o
            // esperando en el mazo: del mazo solo asoman bordes prolijos, no
            // pedazos de texto. Se descubre justo antes de salir.
            let velo = acotar(d, 0, 1);
            let y: number;
            if (geo.fila[i]) {
              // Vuela del mazo a su lugar (x e y con curvas distintas: arco).
              y = (geo.dy[i] + oy) * (1 - cfVueloY(e));
            } else {
              // Quieta en pantalla (sobre la línea) hasta que su lugar llega;
              // después sigue a la página, con un saltito al despegar.
              y =
                minSuave(geo.dy[i] + v, PILA.suave) +
                oy * (1 - e) -
                PILA.salto * aire;
              const espera = (geo.salida[i] - v) / geo.revela;
              velo = Math.max(velo, acotar(espera + 1, 0, 1));
            }
            tapa[i]?.(velo);
            pone[i].x(geo.dx[i] * (1 - (geo.fila[i] ? cfVueloX : cfX)(e)));
            pone[i].y(y);
            pone[i].r(geo.r[i] * (1 - cfGiro(e)));
            sombra[i]?.(
              (d > 0 ? PILA.sombraFondo : 1) * (1 - Math.pow(e, 2.4)),
            );
          }
        }

        medir();

        const zona = (): Zona => ({ arriba: 0, abajo: geo.linea - PILA.aire });

        const recorrido = () =>
          Math.round(window.innerHeight * RECORRIDO.mazo);
        const { vars, limpiar: limpiarCostura } = conCostura(
          {
            trigger: escenario,
            pin: escenario,
            // Solo con scroll nativo (táctiles): con Lenis fijaba el pin antes.
            anticipatePin: anticiparPin(),
            start: () => `top ${altoNav() + PILA.arriba + d}px`,
            end: () => `+=${recorrido()}`,
            scrub: SCRUB,
            invalidateOnRefresh: true,
            refreshPriority: 0,
            onRefresh: (self) => {
              medir();
              // Aterriza con el encabezado formado y la primera fila apoyada,
              // antes de la rampa de salida.
              aterrizar(antesDeLaSalida(self, d));
              pintarMazo();
            },
          },
          costura,
          { d, recorrido },
        );
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: vars,
        });
        st = tl.scrollTrigger;

        armado(tl, T_MAZO.arma);
        forma(tl, escenario, T_MAZO.forma, T_MAZO.perfil, zona);
        const [rInicio, rSep, rDur] = T_MAZO.reparte;
        let k = 0;
        reparto.forEach((a, i) => {
          if (!geo.fila[i]) return;
          tl.fromTo(a, { p: 0 }, { p: 1, duration: rDur }, rInicio + k * rSep);
          k++;
        });
        cierre(tl);
        const quitarFoco = enfocarPerfil(tl, d, perfilListo(T_MAZO));

        // Después del pin, el mazo sigue al scroll directo (sin scrub: tiene
        // que quedar clavado en pantalla, Lenis ya suaviza la rueda). Refresca
        // al final, con el pin ya medido.
        ScrollTrigger.create({
          trigger: root,
          start: "top bottom",
          end: "bottom top",
          refreshPriority: -1,
          onUpdate: pintarMazo,
          onRefresh: pintarMazo,
        });
        pintarMazo();

        return () => {
          quitarFoco();
          limpiarCostura();
          gsap.set(cartas, { clearProps: "transform" });
          gsap.set([...sombras, ...velos], { clearProps: "opacity" });
        };
      };

      /* ---- Modo según pantalla, preferencia y encaje -------------------- */
      let modo: Modo = "quieto";
      let mm: gsap.MatchMedia | null = null;
      let vivo = true;
      let pendiente = false;
      // Tamaño con el que se eligió el modo. En táctiles solo el ancho: la
      // barra del navegador cambia el alto sin que cambie nada más.
      const tamano = () =>
        scrollNativo()
          ? `${window.innerWidth}`
          : `${window.innerWidth}x${window.innerHeight}`;
      let tamanoModo = "";

      const armar = () => {
        mm?.revert();
        const nuevo = gsap.matchMedia();
        mm = nuevo;
        nuevo.add(MQ, (ctx) => {
          const { ancho, bajo, reduce } = ctx.conditions as Condiciones;
          if (reduce || bajo) {
            modo = "quieto";
            root.dataset.rs = "quieto";
            return () => {
              delete root.dataset.rs;
            };
          }
          modo = ancho && encaja(HOLGURA) ? "escena" : "mazo";
          tamanoModo = tamano();
          root.dataset.rs = modo;
          root.style.setProperty("--rs-nav", `${altoNav()}px`);
          // Rendimiento: lo que la escena mueve se lee en una sola tanda, ya
          // con el modo puesto (prepararTransformes, lib/gsap.ts).
          const quitarPreparacion = prepararTransformes(
            [...partes, perfil, ...cartas],
            [perfil, ...sombras, ...velos],
          );
          // Capas de GPU (cartas, sombras, dorsos) solo alrededor de la escena.
          const quitarCapa = capaActiva(root);
          const limpiar = modo === "escena" ? armarEscena() : armarMazo();
          return () => {
            limpiar();
            quitarPreparacion();
            quitarCapa();
            restaurar();
            delete root.dataset.rs;
            root.style.removeProperty("--rs-nav");
            root.style.removeProperty("scroll-margin-top");
            perfil?.style.removeProperty("pointer-events");
          };
        });
      };
      armar();

      // Si cambia el encaje (resize dentro del mismo corte, fuentes que
      // cargan tarde), se rearma en el modo que corresponde. Con histéresis
      // (para volver a la escena tiene que sobrar el doble de aire) solo con
      // el mismo tamaño de ventana: si cambió (girar una tablet y volver), se
      // elige como en una carga nueva, así queda el mismo modo que cargando
      // de cero.
      const alRefrescar = () => {
        if (!vivo || pendiente || modo === "quieto") return;
        if (!window.matchMedia(MQ.ancho).matches) return;
        const otroTamano = tamano() !== tamanoModo;
        const cambia =
          modo === "escena"
            ? !encaja(HOLGURA)
            : encaja(otroTamano ? HOLGURA : HOLGURA * 2);
        if (!cambia) return;
        pendiente = true;
        requestAnimationFrame(() => {
          pendiente = false;
          if (!vivo) return;
          armar();
          ScrollTrigger.sort();
          ScrollTrigger.refresh();
        });
      };
      ScrollTrigger.addEventListener("refresh", alRefrescar);

      return () => {
        vivo = false;
        ScrollTrigger.removeEventListener("refresh", alRefrescar);
        mm?.revert();
        quitarPrepEstrellas();
      };
    },
    { scope: rootRef },
  );

  return (
    <section
      id="resenas"
      ref={rootRef}
      className={cn(styles.seccion, "overflow-x-clip pb-[76px]")}
    >
      <Container>
        <div data-rs-escenario className={styles.escenario}>
          {/* Envoltorio de la costura (conCostura mueve su `y`). */}
          <div data-rs-costura>
            <div data-rs-cabeza className={styles.cabeza}>
              <h2 className="sr-only">{resenas.srTitulo}</h2>
              <div data-rs-kicker className="w-fit">
                <Kicker>{resenas.kicker}</Kicker>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
                <div className="flex items-center gap-4 min-[760px]:gap-5">
                  <p className="sr-only">
                    {resenas.srCalificacion(NOTA_TEXTO)}
                  </p>
                  {/* El número cuenta con el scroll (solo cambia su texto,
                      nunca se oculta); el servidor trae la nota real. Las
                      cifras de Playfair no son tabulares ("1.1" es un tercio
                      más angosto que "0.0"): la caja la fija una copia
                      invisible de la nota real y el valor va encima,
                      centrado. Así el número no corre a las estrellas ni se
                      descentra en la pila mientras cuenta, y en reposo
                      (5.0) se ve exactamente como el texto plano. */}
                  <span
                    aria-hidden
                    data-rs-num
                    className="relative block font-display text-[4.25rem] font-medium leading-[0.9] text-crema lining-nums tabular-nums min-[760px]:text-[5.25rem]"
                  >
                    <span className="invisible">{NOTA_TEXTO}</span>
                    {/* flex y no text-align: con text-align, lo que es más
                        ancho que la caja ("0.0") desborda solo a la derecha;
                        justify-content lo centra igual. */}
                    <span
                      data-rs-valor
                      className="absolute inset-0 flex justify-center whitespace-nowrap"
                    >
                      {NOTA_TEXTO}
                    </span>
                  </span>
                  {/* "en Google" va DENTRO del bloque de las estrellas: así
                      acompaña a las estrellas en el encabezado, en la pila
                      gigante y en el mazo (la escena mide este bloque entero).
                      Sin la cantidad de reseñas: no se muestra en la página. */}
                  <span
                    aria-hidden
                    data-rs-estrellas
                    className="flex flex-col items-center gap-2 text-[20px] min-[760px]:text-[24px]"
                  >
                    <span className="flex">
                      <Estrellas count={resenas.stars} />
                    </span>
                    <span className="font-mono text-[11px] uppercase leading-none tracking-[0.14em] text-crema-dim">
                      {resenas.ratingCaption}
                    </span>
                  </span>
                </div>
                {showProfile ? (
                  <div data-rs-perfil>
                    <Pill
                      variant="fantasma"
                      href={resenas.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {resenas.profileCta}
                    </Pill>
                  </div>
                ) : null}
              </div>
            </div>

            <ul
              data-rs-mazo
              className="mt-9 grid gap-4 min-[760px]:grid-cols-2 min-[760px]:gap-5"
            >
              {TARJETAS.map((r, i) => (
                <li
                  key={r.author}
                  data-rs-lugar
                  className="relative"
                  style={{ zIndex: TARJETAS.length - i }}
                >
                  <div data-rs-carta className="relative h-full">
                    <span
                      aria-hidden
                      data-rs-sombra
                      className={styles.sombra}
                    />
                    <figure className="relative flex h-full flex-col rounded-xl border border-hairline bg-surface p-6 transition-colors duration-300 hover:border-crema-dim/40 min-[760px]:p-7">
                      <span
                        aria-hidden
                        className="block h-[0.42em] font-display text-[2.75rem] leading-[0.9] text-crema-dim/45"
                      >
                        “
                      </span>
                      <blockquote className="mb-6 mt-3 text-[16px] leading-[1.6] text-crema min-[760px]:text-[16.5px]">
                        {r.quote}
                      </blockquote>
                      <figcaption className="mt-auto flex flex-col gap-1.5 border-t border-hairline pt-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-3">
                        <b className="text-[15px] font-bold text-crema">
                          {r.author}
                        </b>
                        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-crema-dim">
                          {r.servicio}
                        </span>
                      </figcaption>
                    </figure>
                    <span aria-hidden data-rs-velo className={styles.velo} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* L6: el botón de presupuesto al final de las reseñas. Fuera del
            escenario (no lo fija ni lo mide la escena). Amarillo: "Ver perfil
            de Google" queda fantasma, como secundario. */}
        <Reveal y={16} className={cn(styles.cta, "flex justify-center")}>
          <Pill href={resenas.cta.href}>{resenas.cta.label}</Pill>
        </Reveal>
      </Container>
    </section>
  );
}
