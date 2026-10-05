"use client";

import { useRef } from "react";
import {
  capaActiva,
  gsap,
  prepararTransformes,
  ScrollTrigger,
  useGSAP,
} from "@/lib/gsap";
import { OPACIDAD_GSAP, resorteGsap, SALIDA_GSAP, TRAMO } from "@/lib/fisica";
import { trasCargaInactivo } from "@/lib/video";
import { proceso, type Paso } from "@/content/data";
import { cn } from "@/lib/cn";
import s from "./ProcesoGrid.module.css";

/**
 * DrawSVG y MotionPath (más las utilidades de trazos que arrastra MotionPath,
 * unos 24 KB sin comprimir) solo los usa esta escena, que está lejos del
 * principio: viajan en su propio chunk, fuera de la primera carga, y se piden
 * después de `load` en idle (ProcesoGrid, abajo). Una sola descarga y un solo
 * registro por página; si falla, el próximo montaje lo reintenta.
 */
let plugins: Promise<void> | null = null;
function cargarPlugins(): Promise<void> {
  plugins ??= Promise.all([
    import("gsap/DrawSVGPlugin"),
    import("gsap/MotionPathPlugin"),
  ]).then(
    ([{ DrawSVGPlugin }, { MotionPathPlugin }]) => {
      gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin);
    },
    (error: unknown) => {
      plugins = null;
      throw error;
    },
  );
  return plugins;
}

/** Rótulos del mapa (decorativo). */
const MAPA_COPY = proceso.mapa;

/* ==========================================================================
 * Cómo trabajamos · el recorrido del pedido.
 *
 * Un mapa mínimo (SVG propio, trazo crema fino): el anillo de Circunvalación
 * (irregular, dibujado a mano, sin calles ni datos geográficos), la cocina con
 * su vapor y tu oficina, unidas por una ruta con dos estaciones (02 y 03). Al
 * lado (desktop) o debajo (mobile), los 4 pasos sobre un riel: un nodo por paso
 * y un tramo entre nodos, el espejo de la ruta del mapa.
 *
 * Sin pin ni scrub: la sección corre con la página y la coreografía va por
 * TIEMPO, una sola vez, cuando entra a la pantalla.
 *   1. Mapa (cuando el mapa está casi entero a la vista): el anillo se dibuja
 *      desde abajo hacia los dos lados y cierra arriba; aparecen la cocina y
 *      la oficina con un pop, y la ruta punteada se traza de la cocina a la
 *      oficina (las estaciones asoman cuando el trazo pasa por ellas).
 *   2. Viaje (con el mapa armado y los pasos a la vista): la cocina echa
 *      vapor, la cajita sale de ella y se enciende el paso 01. La cajita
 *      viaja por la ruta en tres tramos, cada uno con el resorte `entrada`
 *      (arranca de 0, llega sin rebote), deja una estela y el tramo del riel
 *      se llena a la par; al llegar a cada estación, la estación y su paso se
 *      encienden juntos (02 y 03). En la oficina la cajita se entrega (se
 *      achica y se va), la oficina se enciende en ámbar con un pulso y se
 *      enciende el paso 04.
 *   3. Vivo: al terminar, el vapor de la cocina se mece apenas, solo con el
 *      mapa a la vista y la página quieta.
 * Si la persona vuelve a pasar no se repite: queda el estado final. Si pasa
 * de largo antes de que arranque (un ancla, un scroll muy rápido), corre la
 * primera vez que la sección está de verdad a la vista.
 *
 * Fail-open: el HTML del servidor trae el estado final (anillo y ruta
 * dibujados, estaciones y pasos encendidos, oficina en ámbar). El JS arma el
 * estado inicial recién cuando llegan los plugins (después de `load`, en
 * idle) y solo si en ese momento la sección todavía no está a la vista
 * (nunca pasa de visible a apagado). Sin JS o con reducir movimiento no se
 * toca nada. Si algo falla al armar, se revierte y queda la versión quieta.
 *
 * Física (lib/fisica.ts): todo por resortes de resorteGsap (lento para el
 * anillo y los aros que se abren, entrada para la ruta, el viaje y los
 * textos, pop para lo que aparece, tacto para la entrega), la opacidad aparte
 * con OPACIDAD_GSAP y la salida de la cajita con SALIDA_GSAP. Solo transform,
 * opacity y el trazo de las líneas. Sin estado de React por cuadro.
 * ========================================================================== */

/** Opacidades de un paso todavía apagado. Título (0.52) y bajada (0.78)
 *  siguen pasando AA sobre el fondo: una auditoría al cargar los ve así. */
const APAGADO = {
  num: 0.24,
  titulo: 0.52,
  desc: 0.78,
  estacion: 0.4,
  oficina: 0.6,
};

/**
 * Disparadores (ScrollTrigger sin scrub, solo para saber cuándo algo está a
 * la vista). Cada zona va de "entra por abajo" a "se va por arriba": se activa
 * al entrar bajando (start) o volviendo desde abajo (end).
 * - mapa: su centro al 92 % de la pantalla (se ve el 70 a 80 % del mapa).
 * - pasos: en desktop (mapa al costado), el borde de arriba de la lista al
 *   78 %, casi a la par del mapa. En una columna (mapa arriba, pasos abajo),
 *   el borde de abajo de la lista al 96 %: el viaje espera a que el paso 04
 *   esté a la vista (en teléfonos bajos, con el borde de arriba al 78 % el 04
 *   quedaba debajo del borde justo cuando se encendía) y el mapa, más chico
 *   en esas pantallas (ProcesoGrid.module.css), sigue arriba.
 */
const ZONA = {
  mapa: { start: "center 92%", end: "center 25%" },
  pasos: { start: "top 78%", end: "bottom 22%" },
  pasosColumna: { start: "bottom 96%" },
};
/** Mismo corte que ProcesoGrid.module.css: desde acá, mapa al costado. */
const MQ_COLUMNA = "(max-width: 859.98px)";

/** Momentos de la coreografía, en segundos. */
const T = {
  /* Mapa */
  anillo: 0,
  etqAnillo: 0.06,
  cocina: 0.28,
  oficina: 0.4,
  etiqueta: 0.08, // las etiquetas, un poco después de su punto
  ruta: 0.52,
  /** Desde acá puede arrancar el viaje (el anillo termina de cerrar mientras). */
  listo: 1.0,
  /* Viaje */
  vapor: 0,
  sale: 0.16,
  paso01: 0.22,
  parte: 0.68,
  /** Quieta en cada estación, después de asentarse. */
  espera: 0.12,
  /** De la llegada a la oficina a que se enciende. */
  entrega: 0.1,
};

const MQ_MOVER = "(prefers-reduced-motion: no-preference)";

/* ---------- Geometría del mapa (viewBox 400 x 320) ---------- */

/** Anillo irregular (Catmull-Rom cerrado por 11 puntos). Arranca arriba al
 *  medio: el 50% de su largo queda abajo, desde donde se dibuja. */
const ANILLO =
  "M200 22C233 19.3 264.7 22.3 290 32C315.3 41.7 337 59 352 80C367 101 379.7 132 380 158C380.3 184 371.3 214 354 236C336.7 258 306.3 279.3 276 290C245.7 300.7 203.7 302.7 172 300C140.3 297.3 109.7 289.7 86 274C62.3 258.3 39 232 30 206C21 180 21.7 144.3 32 118C42.3 91.7 64 64 92 48C120 32 167 24.7 200 22Z";
const COCINA = { x: 100, y: 238 };
const OFICINA = { x: 292, y: 138 };
/** Ruta en Z con esquinas redondeadas (r 18): 78 + arco + 64 + arco + 78. */
const RUTA = "M100 238H178A18 18 0 0 0 196 220V156A18 18 0 0 1 214 138H292";
/** Estaciones en el medio de cada esquina, con su fracción del largo de la
 *  ruta (largo total 276.55; cada arco mide 28.27). Parten la ruta en 3 tramos
 *  iguales (92.14 cada uno). */
const HITOS = [
  { x: 190.7, y: 232.7, f: 0.3332 },
  { x: 201.3, y: 143.3, f: 0.6668 },
];
/** Paradas de la cajita (fracción de la ruta), una por paso. */
const PARADAS = [0, HITOS[0].f, HITOS[1].f, 1];
/** Vapor de la cocina: tres volutas finas arriba del punto (de abajo hacia
 *  arriba: el trazo se dibuja subiendo). */
const VAPOR = [
  "M94.5 222c-2.2-2.4 2.2-4.4 0-7s2.2-4.6 0-7",
  "M100 220.5c-2.4-2.6 2.4-4.8 0-7.6s2.4-5 0-7.6",
  "M105.5 222c-2.2-2.4 2.2-4.4 0-7s2.2-4.6 0-7",
];

/**
 * Fracción de la duración (0 a 1) en la que un ease llega a `f` por primera
 * vez. Sirve para sincronizar con un resorte: "cuando la cajita ya está al
 * 90 % del tramo", "cuando el trazo pasa por la estación".
 */
function momento(ease: (p: number) => number, f: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (ease(m) < f) lo = m;
    else hi = m;
  }
  return hi;
}

/** ¿Alguna parte del elemento está dentro de la pantalla? */
function aLaVista(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

/**
 * Arma la coreografía (estado inicial, timelines pausados y disparadores) o,
 * si la sección ya está a la vista, deja el estado final y solo el detalle
 * vivo. Tira si falta algo del DOM (queda estático). Devuelve la limpieza de
 * lo que no revierte el contexto de GSAP (listeners y la capa) y la que va
 * después de revertirlo (lo que dejó prepararTransformes).
 */
function armar(root: HTMLElement): {
  limpiar: () => void;
  despues: () => void;
} {
  const q = gsap.utils.selector(root);
  const uno = <T extends Element = Element>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`ProcesoGrid: falta ${sel}`);
    return el;
  };

  const lienzo = uno<HTMLElement>("[data-lienzo]");
  const lista = uno<HTMLElement>("[data-lista]");
  const volutas = q('[data-m="voluta"]');
  if (!volutas.length) throw new Error("ProcesoGrid: falta el vapor");

  /* 3 · Vivo: el vaivén del vapor. Cada cuadro repinta el SVG del mapa: corre
     solo con el mapa a la vista, la coreografía terminada y la página quieta
     (en pleno scroll se pausa y sigue al detenerse). */
  const vaiven = gsap.timeline({ repeat: -1, paused: true });
  volutas.forEach((voluta, i) => {
    vaiven.to(
      voluta,
      {
        keyframes: { y: [0, -2, 0], opacity: [1, 0.45, 1], easeEach: TRAMO },
        duration: 3.4,
        ease: "none",
      },
      i * 0.6,
    );
  });
  let vivo = false;
  let visible = false;
  let scrolleando = false;
  const sincronizarVapor = () => {
    if (vivo && visible && !scrolleando) vaiven.play();
    else vaiven.pause();
  };
  ScrollTrigger.create({
    trigger: lienzo,
    start: "top bottom",
    end: "bottom top",
    refreshPriority: 0,
    onToggle: (self) => {
      visible = self.isActive;
      sincronizarVapor();
    },
  });
  const alEmpezarScroll = () => {
    scrolleando = true;
    sincronizarVapor();
  };
  const alTerminarScroll = () => {
    scrolleando = false;
    sincronizarVapor();
  };
  ScrollTrigger.addEventListener("scrollStart", alEmpezarScroll);
  ScrollTrigger.addEventListener("scrollEnd", alTerminarScroll);

  // El SVG del mapa (se redibuja mientras anima) es capa propia solo con la
  // escena cerca (ProcesoGrid.module.css, [data-capa]).
  const quitarCapa = capaActiva(root);
  const limpiar = () => {
    ScrollTrigger.removeEventListener("scrollStart", alEmpezarScroll);
    ScrollTrigger.removeEventListener("scrollEnd", alTerminarScroll);
    quitarCapa();
  };

  // Ya a la vista al montar (recarga a mitad de página): queda el estado
  // final del servidor, sin apagarse para volver a encenderse.
  if (aLaVista(root)) {
    vivo = true;
    sincronizarVapor();
    return { limpiar, despues: () => {} };
  }
  let despues = () => {};

  try {
    const anillo = uno<SVGPathElement>('[data-m="anillo"]');
    const trazo = uno<SVGPathElement>('[data-m="ruta-trazo"]');
    const estela = uno<SVGPathElement>('[data-m="estela"]');
    const cocina = uno('[data-m="cocina"]');
    const oficina = uno('[data-m="oficina"]');
    const caja = uno('[data-m="caja"]');
    const cajaPop = uno('[data-m="caja-pop"]');
    const cajaCuerpo = uno('[data-m="caja-cuerpo"]');
    const luz = uno('[data-m="oficina-luz"]');
    const brillo = uno('[data-m="brillo"]');
    const halo = uno('[data-m="halo"]');
    const pulso = uno('[data-m="pulso"]');
    const oficinaAro = uno('[data-m="oficina-aro"]');
    const etqAnillo = uno('[data-etq="anillo"]');
    const etqCocina = uno('[data-etq="cocina"]');
    const etqOficina = uno('[data-etq="oficina"]');
    const oficinaLuz = uno('[data-etq="oficina"] [data-luz]');
    const pasos = q("[data-paso]");
    const nums = q("[data-num]");
    const textos = q("[data-texto]");
    const titulos = q("[data-titulo]");
    const descs = q("[data-desc]");
    const puntos = q("[data-punto]");
    const tramos = q("[data-tramo]");
    const hitos = q('[data-m="hito"]');
    const hitoAros = q('[data-m="hito-aro"]');
    const etqEstaciones = q('[data-etq="estacion"]');
    const estaciones = q('[data-etq="estacion"] [data-luz]');
    const pings = q('[data-m="ping"]');
    const vapor = q('[data-m="vapor"] path');
    const TRAMOS = PARADAS.length - 1;
    if (
      pasos.length !== PARADAS.length ||
      tramos.length !== TRAMOS ||
      hitos.length !== HITOS.length ||
      hitoAros.length !== HITOS.length ||
      estaciones.length !== HITOS.length ||
      pings.length !== HITOS.length + 1
    ) {
      throw new Error(
        "ProcesoGrid: la cantidad de pasos no coincide con el mapa",
      );
    }

    const lento = resorteGsap("lento");
    const entrada = resorteGsap("entrada");
    const pop = resorteGsap("pop");
    const tacto = resorteGsap("tacto");
    const centro = { transformOrigin: "50% 50%" };

    // Rendimiento: lo HTML que se mueve o cambia de opacidad se lee en una
    // sola tanda antes de los set de abajo (prepararTransformes, lib/gsap.ts).
    // Las etiquetas del anillo y de la oficina solo cambian de opacidad (se
    // centran con `translate`).
    despues = prepararTransformes(
      [etqCocina, oficinaLuz, ...textos, ...puntos, ...tramos],
      [
        etqAnillo,
        etqCocina,
        etqOficina,
        oficinaLuz,
        ...etqEstaciones,
        ...estaciones,
        ...nums,
        ...titulos,
        ...descs,
      ],
    );

    /* Estado inicial (el SSR trae el final). La trama de la ciudad y la
       calzada tenue del anillo quedan: el mapa nunca se ve vacío. */
    gsap.set(anillo, { drawSVG: "50% 50%" });
    // Las etiquetas que se centran con la propiedad CSS `translate` (anillo,
    // oficina) solo cambian de opacidad: si GSAP les escribe un transform,
    // absorbe ese translate y pierde el -100% vertical (la etiqueta de la
    // oficina caía sobre el halo). La que sube es la de la cocina y, en la
    // oficina, el texto de adentro.
    gsap.set([etqAnillo, etqCocina, etqOficina], { opacity: 0 });
    gsap.set([etqCocina, oficinaLuz], { y: 4 });
    gsap.set([cocina, oficina], { opacity: 0, scale: 0.3, ...centro });
    gsap.set(trazo, { drawSVG: "0% 0%" });
    gsap.set(hitoAros, { opacity: 0, scale: 0.4, ...centro });
    gsap.set(hitos, { opacity: 0, scale: 0.2, ...centro });
    gsap.set(etqEstaciones, { opacity: 0 });
    gsap.set(estaciones, { opacity: APAGADO.estacion });
    gsap.set(vapor, { drawSVG: "0% 0%" });
    gsap.set(caja, { x: COCINA.x, y: COCINA.y });
    gsap.set(cajaPop, { opacity: 0, scale: 0.4, y: 5, ...centro });
    gsap.set(cajaCuerpo, centro);
    gsap.set(estela, { drawSVG: "0% 0%" });
    gsap.set([...pings, pulso], { opacity: 0, scale: 0.8, ...centro });
    gsap.set([halo, brillo], { opacity: 0, scale: 0.6, ...centro });
    gsap.set(luz, { scale: 0, ...centro });
    // El aro crema de la oficina: en el SSR ya se abrió y se fue.
    gsap.set(oficinaAro, { opacity: 1, scale: 1, ...centro });
    gsap.set(oficinaLuz, { opacity: APAGADO.oficina });
    gsap.set(nums, { opacity: APAGADO.num });
    gsap.set(titulos, { opacity: APAGADO.titulo });
    gsap.set(descs, { opacity: APAGADO.desc });
    gsap.set(textos, { y: 6 });
    gsap.set(puntos, { scale: 0 });
    gsap.set(tramos, { scaleY: 0, transformOrigin: "50% 0%" });

    /** Aparecer: opacidad aparte y el resto con el resorte dado. */
    const aparecer = (
      tl: gsap.core.Timeline,
      el: gsap.TweenTarget,
      resto: gsap.TweenVars,
      resorte: { ease: (p: number) => number; duration: number },
      t: number,
    ) =>
      tl
        .to(el, { opacity: 1, ...OPACIDAD_GSAP }, t)
        .to(el, { ...resto, ...resorte }, t);

    /** Un aro que se abre y se desvanece (arranca y termina invisible). */
    const ping = (
      tl: gsap.core.Timeline,
      el: Element,
      t: number,
      escala = 3.2,
    ) =>
      tl
        .set(el, { opacity: 0.7, scale: 0.8 }, t)
        .to(el, { scale: escala, ...lento }, t)
        .to(
          el,
          {
            opacity: 0,
            duration: lento.duration * 0.7,
            ease: OPACIDAD_GSAP.ease,
          },
          t,
        );

    /* 1 · Mapa. */
    const intro = gsap.timeline({ paused: true });
    intro
      .to(anillo, { drawSVG: "0% 100%", ...lento }, T.anillo)
      .to(etqAnillo, { opacity: 1, ...OPACIDAD_GSAP }, T.etqAnillo);
    aparecer(intro, cocina, { scale: 1 }, pop, T.cocina);
    aparecer(intro, etqCocina, { y: 0 }, entrada, T.cocina + T.etiqueta);
    aparecer(intro, oficina, { scale: 1 }, pop, T.oficina);
    intro
      .to(etqOficina, { opacity: 1, ...OPACIDAD_GSAP }, T.oficina + T.etiqueta)
      .to(oficinaLuz, { y: 0, ...entrada }, T.oficina + T.etiqueta);
    intro.to(trazo, { drawSVG: "0% 100%", ...entrada }, T.ruta);
    hitoAros.forEach((aro, i) => {
      // Cada estación asoma cuando el trazo pasa por ella.
      const t = T.ruta + momento(entrada.ease, HITOS[i].f) * entrada.duration;
      aparecer(intro, aro, { scale: 1 }, pop, t);
      intro.to(etqEstaciones[i], { opacity: 1, ...OPACIDAD_GSAP }, t + 0.05);
    });

    /* 2 · Viaje. */
    const viaje = gsap.timeline({ paused: true });
    const encender = (k: number, t: number) => {
      viaje
        .to([nums[k], titulos[k], descs[k]], { opacity: 1, ...OPACIDAD_GSAP }, t)
        .to(textos[k], { y: 0, ...entrada }, t)
        .to(puntos[k], { scale: 1, ...pop }, t);
    };

    // La cocina echa vapor y la cajita sale de ella (sube y se asienta).
    viaje.to(
      vapor,
      { drawSVG: "0% 100%", ...entrada, stagger: 0.08 },
      T.vapor,
    );
    aparecer(viaje, cajaPop, { scale: 1, y: 0 }, pop, T.sale);
    ping(viaje, pings[0], T.paso01);
    encender(0, T.paso01);

    // Tres tramos. Cada uno con el resorte `entrada` entero (sale de 0 y se
    // asienta sin rebote) y la partida siguiente recién cuando terminó: la
    // cajita nunca salta. La estación y su paso se encienden cuando la
    // cajita ya hizo el 90 % del tramo (se lee como "llegó").
    const llegada = momento(entrada.ease, 0.9) * entrada.duration;
    let t = T.parte;
    for (let k = 0; k < TRAMOS; k++) {
      viaje
        .to(
          caja,
          {
            motionPath: {
              path: estela,
              start: PARADAS[k],
              end: PARADAS[k + 1],
            },
            ...entrada,
          },
          t,
        )
        // La estela sigue a la cajita: mismo largo, mismo resorte.
        .to(estela, { drawSVG: `0% ${PARADAS[k + 1] * 100}%`, ...entrada }, t)
        // El tramo del riel se llena a la par.
        .to(tramos[k], { scaleY: 1, ...entrada }, t);

      const llega = t + llegada;
      if (k < HITOS.length) {
        aparecer(viaje, hitos[k], { scale: 1 }, pop, llega);
        viaje.to(estaciones[k], { opacity: 1, ...OPACIDAD_GSAP }, llega);
        ping(viaje, pings[k + 1], llega);
        encender(k + 1, llega);
      } else {
        // Entrega: la cajita se achica y se va en la oficina, que se enciende
        // en ámbar (punto, halo, brillo y un pulso) junto con el paso 04.
        const enciende = llega + T.entrega;
        viaje
          .to(cajaCuerpo, { scale: 0.35, ...tacto }, llega)
          .to(cajaCuerpo, { opacity: 0, ...SALIDA_GSAP }, llega + 0.06)
          .to(oficinaAro, { scale: 1.8, ...lento }, enciende)
          .to(oficinaAro, { opacity: 0, ...OPACIDAD_GSAP }, enciende)
          .to(luz, { scale: 1, ...pop }, enciende)
          .to(oficinaLuz, { opacity: 1, ...OPACIDAD_GSAP }, enciende);
        aparecer(viaje, [halo, brillo], { scale: 1 }, pop, enciende);
        ping(viaje, pulso, enciende, 2.6);
        encender(PARADAS.length - 1, enciende);
      }
      t += entrada.duration + T.espera;
    }
    viaje.call(() => {
      vivo = true;
      sincronizarVapor();
    });

    /* Disparo: el mapa arranca al entrar a la vista; el viaje, con el mapa
       armado y los pasos a la vista. Cada uno una sola vez. */
    let introHecha = false;
    let pasosALaVista = false;
    let viajando = false;
    const quizasViajar = () => {
      if (viajando || !introHecha || !pasosALaVista) return;
      viajando = true;
      viaje.play();
    };
    intro.call(
      () => {
        introHecha = true;
        quizasViajar();
      },
      [],
      T.listo,
    );
    let introCorriendo = false;
    ScrollTrigger.create({
      trigger: lienzo,
      ...ZONA.mapa,
      refreshPriority: 0,
      onToggle: (self) => {
        if (!self.isActive || introCorriendo) return;
        introCorriendo = true;
        intro.play();
      },
    });
    ScrollTrigger.create({
      trigger: lista,
      ...ZONA.pasos,
      // Función: se vuelve a decidir en cada refresh (al cruzar el corte).
      start: () =>
        window.matchMedia(MQ_COLUMNA).matches
          ? ZONA.pasosColumna.start
          : ZONA.pasos.start,
      refreshPriority: 0,
      onToggle: (self) => {
        pasosALaVista = self.isActive;
        quizasViajar();
      },
    });
  } catch (error) {
    limpiar();
    throw error;
  }

  return { limpiar, despues };
}

export function ProcesoGrid({
  pasos,
  head,
  cierre,
}: {
  pasos: Paso[];
  head: React.ReactNode;
  /** El botón debajo de los pasos (Proceso.tsx). Fuera de la lista. */
  cierre?: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    (_contexto, contextSafe) => {
      const root = rootRef.current;
      if (!root || !contextSafe) return;

      // Todo se arma recién con los plugins registrados. Hasta entonces (y si
      // no llegan) queda el estado final del servidor: no se esconde nada
      // antes. armar() decide en ese momento si la sección ya está a la vista.
      let desmontado = false;
      const montar = contextSafe(() => {
        if (desmontado) return;
        const mm = gsap.matchMedia();
        // Reducir movimiento: la versión quieta del SSR, sin tocar nada.
        mm.add(MQ_MOVER, () => {
          // Contexto propio: si algo falla al armar, se revierte lo que alcanzó
          // a crearse y queda la versión estática (fail-open).
          const escena = gsap.context(() => {}, root);
          let armado = { limpiar: () => {}, despues: () => {} };
          try {
            escena.add(() => {
              armado = armar(root);
            });
          } catch (error) {
            if (process.env.NODE_ENV !== "production") console.error(error);
            escena.revert();
            return;
          }
          return () => {
            armado.limpiar();
            escena.revert();
            armado.despues();
          };
        });
      });

      // El armado va en su propia tarea (otro idle), no en la misma que
      // evalúa el chunk de los plugins: juntos eran una tarea larga (~80 ms
      // en un celular de gama media) después de `load`.
      let cancelarArmado = () => {};
      const cancelarEspera = trasCargaInactivo(() => {
        cargarPlugins().then(
          () => {
            if (!desmontado) cancelarArmado = trasCargaInactivo(montar);
          },
          (error: unknown) => {
            if (process.env.NODE_ENV !== "production") console.error(error);
          },
        );
      });
      return () => {
        desmontado = true;
        cancelarEspera();
        cancelarArmado();
      };
    },
    { scope: rootRef },
  );

  const ultimo = pasos.length - 1;

  return (
    <div ref={rootRef} className={s.escena}>
      <div className={s.grilla}>
        <div className={s.head}>{head}</div>

        <div className={s.cuerpo}>
          <div className={s.mapa}>
            <div data-lienzo className={s.lienzo}>
              <MapaTrama />
              <Mapa />
              <div aria-hidden>
                <span data-etq="anillo" className={cn(s.etq, s.etqAnillo)}>
                  {MAPA_COPY.anillo}
                </span>
                <span data-etq="cocina" className={cn(s.etq, s.etqCocina)}>
                  {MAPA_COPY.cocina}
                </span>
                <span data-etq="oficina" className={cn(s.etq, s.etqOficina)}>
                  <span data-luz className="block">
                    {MAPA_COPY.destino}
                  </span>
                </span>
                {HITOS.map((h, i) => (
                  <span
                    key={h.f}
                    data-etq="estacion"
                    className={cn(
                      s.etq,
                      s.etqEstacion,
                      i === 0 ? s.etqEstacion1 : s.etqEstacion2,
                    )}
                  >
                    <span data-luz className="block">
                      {pasos[i + 1]?.n}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className={s.columna}>
            <ol data-lista role="list" className={s.pasos}>
              {pasos.map((p, i) => (
                <li key={p.n} data-paso className={s.paso}>
                  <span data-num aria-hidden className={s.num}>
                    {p.n}
                  </span>
                  <span aria-hidden className={s.nodo}>
                    <span
                      data-punto
                      className={cn(s.punto, i === ultimo && s.puntoFinal)}
                    />
                  </span>
                  {i < ultimo ? (
                    <span aria-hidden className={s.tramo}>
                      <span data-tramo className={s.tramoLleno} />
                    </span>
                  ) : null}
                  <div data-texto className={s.texto}>
                    <h3 data-titulo className={s.titulo}>
                      {p.title}
                    </h3>
                    <p data-desc className={s.desc}>
                      {p.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {cierre}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * La ciudad: una trama de puntos muy tenue, solo adentro del anillo. Va en su
 * propio SVG, quieto y debajo del mapa: el mapa se redibuja en cada cuadro
 * mientras anima (DrawSVG, la cajita, el vapor) y con la trama adentro el
 * navegador volvía a rasterizar también el patrón entero. Queda siempre a la
 * vista: es la base sobre la que se dibuja el resto.
 */
function MapaTrama() {
  return (
    <svg
      viewBox="0 0 400 320"
      className={s.svg}
      aria-hidden
      focusable="false"
    >
      <defs>
        <clipPath id="proceso-mapa-dentro">
          <path d={ANILLO} />
        </clipPath>
        <pattern
          id="proceso-mapa-puntos"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx="6"
            cy="6"
            r="0.85"
            className="fill-crema"
            fillOpacity={0.13}
          />
        </pattern>
      </defs>
      <rect
        x="0"
        y="0"
        width="400"
        height="320"
        fill="url(#proceso-mapa-puntos)"
        clipPath="url(#proceso-mapa-dentro)"
      />
    </svg>
  );
}

/** El mapa en SVG. Decorativo (aria-hidden): lo que cuenta lo cuentan los
 *  pasos. Estado del SSR: el final (ruta recorrida, oficina encendida). */
function Mapa() {
  return (
    <svg
      viewBox="0 0 400 320"
      className={cn(s.svg, s.svgVivo)}
      aria-hidden
      focusable="false"
    >
      <defs>
        {/* La ruta punteada se revela con un trazo que va de la cocina a la
            oficina (la máscara se dibuja con DrawSVG): el punteado no se
            puede dibujar directo porque su dasharray es el de los puntos. */}
        <mask
          id="proceso-ruta-plan"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="400"
          height="320"
        >
          <path
            data-m="ruta-trazo"
            d={RUTA}
            fill="none"
            stroke="white"
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>

      {/* Circunvalación: una banda muy tenue (la calzada, siempre a la vista)
          y el trazo fino, que es el que se dibuja. */}
      <path
        d={ANILLO}
        className="fill-none stroke-crema"
        strokeOpacity={0.06}
        strokeWidth={10}
        strokeLinejoin="round"
      />
      <path
        data-m="anillo"
        d={ANILLO}
        className="fill-none stroke-crema"
        strokeOpacity={0.6}
        strokeWidth={1.2}
        strokeLinecap="round"
      />

      {/* Ruta: punteada (el plan) y la estela que deja la cajita. */}
      <path
        data-m="punteada"
        d={RUTA}
        mask="url(#proceso-ruta-plan)"
        className="fill-none stroke-crema"
        strokeOpacity={0.4}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeDasharray="0.1 5"
      />
      <path
        data-m="estela"
        d={RUTA}
        className="fill-none stroke-crema"
        strokeOpacity={0.85}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Aros que se abren cuando se enciende un paso (cocina y estaciones).
          En reposo no se ven. */}
      {[COCINA, ...HITOS].map((p) => (
        <circle
          key={`ping-${p.x}`}
          data-m="ping"
          cx={p.x}
          cy={p.y}
          r="6"
          opacity={0}
          className="fill-none stroke-crema"
          strokeWidth={1}
        />
      ))}

      {/* Estaciones del recorrido (pasos 02 y 03). */}
      {HITOS.map((h) => (
        <g key={h.f}>
          <circle
            data-m="hito-aro"
            cx={h.x}
            cy={h.y}
            r="4.4"
            className="fill-bg stroke-crema"
            strokeOpacity={0.55}
            strokeWidth={1.1}
          />
          <circle
            data-m="hito"
            cx={h.x}
            cy={h.y}
            r="2.3"
            className="fill-crema"
          />
        </g>
      ))}

      {/* Cocina de Salguero, con su vapor. */}
      <g data-m="cocina">
        <circle
          cx={COCINA.x}
          cy={COCINA.y}
          r="12"
          className="fill-none stroke-crema"
          strokeOpacity={0.3}
          strokeWidth={1}
        />
        <circle cx={COCINA.x} cy={COCINA.y} r="4.6" className="fill-crema" />
      </g>
      {/* Cada voluta en su grupo: el viaje dibuja el trazo y el vaivén mueve
          el grupo (animaciones separadas, elementos separados). */}
      <g data-m="vapor" className="fill-none stroke-crema">
        {VAPOR.map((d) => (
          <g key={d} data-m="voluta">
            <path
              d={d}
              strokeOpacity={0.42}
              strokeWidth={1.1}
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>

      {/* Tu oficina: aro crema y, al llegar la cajita, la luz ámbar (punto,
          brillo, halo y un pulso que se abre). */}
      <circle
        data-m="brillo"
        cx={OFICINA.x}
        cy={OFICINA.y}
        r="17"
        className="fill-amarillo"
        fillOpacity={0.1}
      />
      <circle
        data-m="halo"
        cx={OFICINA.x}
        cy={OFICINA.y}
        r="21"
        className="fill-none stroke-amarillo"
        strokeOpacity={0.9}
        strokeWidth={1.2}
      />
      <circle
        data-m="pulso"
        cx={OFICINA.x}
        cy={OFICINA.y}
        r="12"
        opacity={0}
        className="fill-none stroke-amarillo"
        strokeWidth={1}
      />
      <g data-m="oficina">
        <circle
          data-m="oficina-aro"
          cx={OFICINA.x}
          cy={OFICINA.y}
          r="12"
          opacity={0}
          className="fill-none stroke-crema"
          strokeOpacity={0.3}
          strokeWidth={1}
        />
        <circle
          cx={OFICINA.x}
          cy={OFICINA.y}
          r="4.6"
          className="fill-bg stroke-crema"
          strokeWidth={1.2}
        />
        <circle
          data-m="oficina-luz"
          cx={OFICINA.x}
          cy={OFICINA.y}
          r="4.6"
          className="fill-amarillo"
        />
      </g>

      {/* La cajita con la cuchara, dibujada alrededor de (0,0). Tres capas, cada
          una movida por su propia animación (así ninguna pisa la
          transformación de otra al revertir): "caja" = su punto en la ruta
          (MotionPath), "caja-pop" = sale de la cocina, "caja-cuerpo" = se
          entrega. En el SSR ya se entregó (no se ve). */}
      <g data-m="caja" transform={`translate(${OFICINA.x} ${OFICINA.y})`}>
        <g data-m="caja-pop" opacity={0}>
          <g data-m="caja-cuerpo">
            <rect
              x="-12"
              y="-6.5"
              width="24"
              height="16"
              rx="2.2"
              className="fill-bg stroke-crema"
              strokeOpacity={0.9}
              strokeWidth={1.1}
            />
            <rect
              x="-13.5"
              y="-10.5"
              width="27"
              height="5.5"
              rx="1.8"
              className="fill-surface stroke-crema"
              strokeOpacity={0.9}
              strokeWidth={1.1}
            />
            <g
              transform="translate(-1.05 -4) scale(0.062)"
              className="fill-amarillo"
            >
              <ellipse cx="17" cy="27" rx="17" ry="27" />
              <rect x="12.25" y="48" width="9.5" height="132" rx="4.75" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
