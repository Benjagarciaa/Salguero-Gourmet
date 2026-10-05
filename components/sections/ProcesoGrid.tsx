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

/** Rótulos de las dos puntas del recorrido (decorativo). */
const MAPA_COPY = proceso.mapa;

/* ==========================================================================
 * Cómo trabajamos · del mensaje a la mesa.
 *
 * El mapa dibuja el título (SVG propio, trazo crema fino): arriba a la
 * izquierda el globito de chat (TU MENSAJE, con tres puntitos que escriben),
 * abajo a la derecha una mesa vista desde arriba (TU MESA, un círculo con 4
 * sillas: sirve para cualquier lugar y cualquier persona), unidos por una
 * sola onda suave con dos paradas (02 en el valle, 03 en la cresta). Al lado
 * (desktop) o debajo (mobile), los 4 pasos sobre un riel: un nodo por paso y
 * un tramo entre nodos, el espejo de la onda.
 *
 * Sin pin ni scrub: una vuelta de 5,40 s (VUELTA) en loop mientras la
 * sección se ve.
 *   01 Contanos tu evento: el globito escribe, da un toque de envío y de su
 *      colita sale un globito chico.
 *   02 Recibís propuesta y precio: el globito chico llega al valle, la parada
 *      se enciende y el globito se da vuelta (la respuesta).
 *   03 Coordinamos: llega a la cresta, se enciende y el globito se convierte
 *      en la cajita con la cuchara (el pedido quedó cerrado: viaja comida).
 *   04 Servimos o entregamos: la cajita llega a la mesa y se apoya; la mesa
 *      se enciende en ámbar con un pulso y sube vapor.
 * La lista y el riel acompañan: cada paso se enciende cuando el viajero llega
 * a su lugar y los demás quedan tenues (siguen pasando AA). Al volver a
 * empezar no se rebobina: la estela se consume hacia la mesa, las paradas se
 * apagan cuando la cola pasa por ellas, la caja y el vapor se van y el
 * globito ya está escribiendo el mensaje siguiente.
 *
 * Fail-open: el HTML del servidor trae el estado final de la vuelta (onda
 * entera con 02 y 03 encendidas, la caja apoyada en la mesa ámbar con su
 * vapor, los 4 rótulos y los 4 pasos encendidos, el riel lleno), que es
 * también el último cuadro de cada vuelta: el loop empalma sin saltos y la
 * primera vuelta arranca desde ahí (la línea se consume y 02 a 04 bajan a
 * tenue). Solo vienen invisibles lo pasajero (el globito chico, los aros que
 * se abren). El JS arma la vuelta recién cuando llegan los plugins (después
 * de `load`, en idle); antes de eso al armar solo toca lo invisible o lo deja
 * en el mismo valor. Sin JS o con reducir movimiento no se toca nada. Si algo
 * falla al armar, se revierte y queda la versión quieta.
 *
 * Corre mientras el mapa está a la vista o la lista sigue en pantalla (ZONA):
 * afuera se pausa y al volver retoma donde quedó (con la pestaña oculta, el
 * ticker de GSAP ya se frena solo). Sin listeners de scroll.
 *
 * Física (lib/fisica.ts): resortes de resorteGsap (panel para los tramos del
 * viaje, entrada para la estela que se consume y el vapor, pop para lo que
 * aparece, tacto para lo que se achica, lento para los aros), la opacidad
 * aparte con OPACIDAD_GSAP y SALIDA_GSAP, y TRAMO en los keyframes. Solo
 * transform, opacity y el trazo de las líneas. Sin estado de React por cuadro.
 * ========================================================================== */

/** Opacidades de lo apagado, medidas sobre el fondo real y no sobre el
 *  #241C15 liso: el brillo ámbar del fondo ambiental (fijo, deriva lento)
 *  aclara el marrón detrás de la lista y del mapa hasta ~#42341E. Ahí siguen
 *  pasando AA: número 0.56 (amarillo, texto grande: 3.24:1), título 0.60
 *  (crema: 4.87:1), bajada 0.92 (crema-dim: 4.55:1) y los rótulos 02, 03 y
 *  04 del mapa 0.60 (crema: 4.87:1). Con 0.48 / 0.52 / 0.78 bajaban a 2.8,
 *  4.1 y 3.7:1 debajo del brillo. */
const APAGADO = { num: 0.56, titulo: 0.6, desc: 0.92, rotulo: 0.6 };

/**
 * Zona en la que corre la vuelta (ScrollTrigger sin scrub, solo para saber
 * si se ve): desde que el centro del mapa pasa el 85 % de la pantalla hasta
 * que el borde de abajo de la lista se va por arriba. Afuera, en pausa.
 */
const ZONA = { vuelta: { start: "center 85%", end: "bottom top" } };

const MQ_MOVER = "(prefers-reduced-motion: no-preference)";

/** Duración exacta de una vuelta, en segundos. */
const VUELTA = 5.4;

/** Momentos de la vuelta, en segundos (los de llegada salen de los resortes). */
const T = {
  /** Nada en t = 0 salvo tweens: los sets y las llamadas, desde acá. */
  minimo: 0.001,
  /** Paso 01 encendido (sale de 04). */
  activo01: 0.02,
  /** Las tres teclas del globito, una detrás de otra. */
  tecleo: 0.05,
  tecla: 0.12,
  teclaDur: 0.42,
  /** La caja de la vuelta anterior se va. */
  cajaSale: 0.06,
  /** Rearmado invisible: caja al origen, escalas y vapor sin dibujar. */
  rearmar: 0.3,
  /** La mesa se apaga, junto con la caja que se va: el mapa y la lista
   *  cambian de paso a la par (con 0.4, medio segundo seguían en 04 y 01). */
  mesaApaga: 0.06,
  /** El riel vuelve a llenarse desde arriba (todos sus tramos ya vacíos). */
  rearmarRiel: 0.6,
  /** Toque de envío del globito y sale el globito chico. */
  envio: 0.7,
  envioDur: 0.36,
  /** El brillo de la mesa, ya invisible, vuelve a su escala de arranque. */
  rearmarBrillo: 0.84,
  /** Salida de cada tramo (cada uno dura panel, 0.60 s). */
  salidas: [0.85, 2.05, 3.25],
  /** De la llegada a 02 a que el globito chico se da vuelta. */
  giro: 0.1,
  /** De la llegada a 03 a que el globito se convierte en la cajita. */
  cambio: 0.1,
  /** El globito vuelve a su lado (ya invisible desde 2.58). */
  giroVuelve: 2.7,
  /** De la llegada a la mesa a que se apoya y se enciende. */
  entrega: 0.1,
  /** De la entrega a que sube el vapor. */
  vapor: 0.1,
};

/* ---------- Geometría del mapa (viewBox 400 x 200) ---------- */

/** La onda: 3 cúbicas con tangente horizontal en el valle (148,150) y en la
 *  cresta (244,62), sin quiebres. Largos 129.39 + 135.65 + 122.50 = 387.54
 *  (GSAP mide 387.10). Si se toca, volver a medir HITOS (las fracciones). */
const RUTA =
  "M66 63C74 106 104 150 148 150C188 150 204 62 244 62C288 62 300 128 342 128";
/** Punta de salida: la colita del globito. */
const ORIGEN = { x: 66, y: 63 };
/** Paradas 02 y 03, con su fracción del largo de la onda (largo acumulado
 *  sobre el total; en getPositionOnPath caen a menos de 0.1 u del punto). */
const HITOS = [
  { x: 148, y: 150, f: 0.3339 },
  { x: 244, y: 62, f: 0.6839 },
];
/** Centro de la mesa (la punta de llegada). */
const MESA = { x: 342, y: 128 };
/** Paradas del viajero (fracción de la onda), una por paso. */
const PARADAS = [0, HITOS[0].f, HITOS[1].f, 1];
/** El globito de chat, con la colita abajo a la derecha (llega a 65,58). */
const GLOBO =
  "M41 22H63A11 11 0 0 1 74 33V37A11 11 0 0 1 63 48L65 58L55 48H41A11 11 0 0 1 30 37V33A11 11 0 0 1 41 22Z";
/** Los tres puntitos que escriben. */
const TECLAS = [
  { x: 42, y: 35 },
  { x: 52, y: 35 },
  { x: 62, y: 35 },
];
/** Sillas a 45° y radio 23: queda libre la entrada de la onda por la izquierda. */
const SILLAS = [
  { x: 358.3, y: 111.7 },
  { x: 358.3, y: 144.3 },
  { x: 325.7, y: 144.3 },
  { x: 325.7, y: 111.7 },
];
/** Vapor de la mesa: tres volutas finas arriba de la caja (de abajo hacia
 *  arriba: el trazo se dibuja subiendo). */
const VAPOR = [
  "M336.5 116c-2.2-2.4 2.2-4.4 0-7s2.2-4.6 0-7",
  "M342 117.5c-2.4-2.6 2.4-4.8 0-7.6s2.4-5 0-7.6",
  "M347.5 116c-2.2-2.4 2.2-4.4 0-7s2.2-4.6 0-7",
];
/** Puntitos del globito chico (simétricos: se dan vuelta con él). */
const PUNTITOS = [-3.6, 0, 3.6];

/**
 * Fracción de la duración (0 a 1) en la que un ease llega a `f` por primera
 * vez. Sirve para sincronizar con un resorte: "cuando el viajero ya está al
 * 90 % del tramo", "cuando la cola de la estela pasa por la parada".
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

type ResorteGsap = { ease: (p: number) => number; duration: number };

/** Corre `fn` sin que lo que crea quede registrado en el contexto `ctx`. */
function fuera<R>(ctx: gsap.Context, fn: () => R): R {
  let r: R | undefined;
  ctx.ignore(() => {
    r = fn();
  });
  return r as R;
}

/**
 * Arma la vuelta (timeline en loop, pausado) y la zona en la que corre. Tira
 * si falta algo del DOM o las cantidades no coinciden (queda estático).
 *
 * La vuelta va FUERA del contexto `escena` y se revierte sola, con su propio
 * revert (limpiar), antes que el contexto (que a su vez va fuera del de
 * matchMedia, para que ese orden valga también al pasar a reducir
 * movimiento: ver ProcesoGrid): un timeline revertido entero
 * recorre sus tweens hacia atrás en orden y deja todo como estaba. Revertidos
 * uno por uno desde el contexto, GSAP deja los `set` para el final y los
 * revierte después de los tweens que los siguen (el giro quedaba en -1, el
 * vapor en 0), y el arranque del fromTo de la estela se revertía dos veces
 * (la estela quedaba sin trazo al pasar a reducir movimiento).
 *
 * Devuelve la limpieza que va antes de revertir el contexto (el trigger, la
 * vuelta y la capa) y la que va después (lo que dejó prepararTransformes).
 */
function armar(
  root: HTMLElement,
  escena: gsap.Context,
): {
  limpiar: () => void;
  despues: () => void;
} {
  const q = gsap.utils.selector(root);
  const uno = <E extends Element = Element>(sel: string): E => {
    const el = root.querySelector<E>(sel);
    if (!el) throw new Error(`ProcesoGrid: falta ${sel}`);
    return el;
  };

  const lienzo = uno<HTMLElement>("[data-lienzo]");
  const lista = uno<HTMLElement>("[data-lista]");

  // El SVG del mapa (se redibuja mientras anima) es capa propia solo con la
  // escena cerca (ProcesoGrid.module.css, [data-capa]).
  const quitarCapa = capaActiva(root);
  let vueltaCreada: gsap.core.Timeline | null = null;
  let zona: ScrollTrigger | null = null;
  const limpiar = () => {
    // Primero el trigger: que nada vuelva a dar play a la vuelta revertida.
    zona?.kill();
    vueltaCreada?.revert();
    quitarCapa();
  };
  let despues = () => {};

  try {
    const estela = uno<SVGPathElement>('[data-m="estela"]');
    const globo = uno('[data-m="globo"]');
    const caja = uno('[data-m="caja"]');
    const msj = uno('[data-m="msj"]');
    const giro = uno('[data-m="giro"]');
    const cajaPop = uno('[data-m="caja-pop"]');
    const cajaCuerpo = uno('[data-m="caja-cuerpo"]');
    const brillo = uno('[data-m="brillo"]');
    const mesaLuz = uno('[data-m="mesa-luz"]');
    const pulso = uno('[data-m="pulso"]');
    const vapor = uno('[data-m="vapor"]');
    const volutas = q('[data-m="vapor"] path');
    const teclas = q('[data-m="tecla"]');
    const hitos = q('[data-m="hito"]');
    const pings = q('[data-m="ping"]');
    const luces = q("[data-luz]");
    const pasos = q("[data-paso]");
    const nums = q("[data-num]");
    const titulos = q("[data-titulo]");
    const descs = q("[data-desc]");
    const puntos = q("[data-punto]");
    const tramos = q("[data-tramo]");
    const TRAMOS = PARADAS.length - 1;
    if (
      pasos.length !== PARADAS.length ||
      nums.length !== PARADAS.length ||
      titulos.length !== PARADAS.length ||
      descs.length !== PARADAS.length ||
      puntos.length !== PARADAS.length ||
      tramos.length !== TRAMOS ||
      hitos.length !== HITOS.length ||
      pings.length !== HITOS.length ||
      luces.length !== HITOS.length + 1 ||
      teclas.length !== TECLAS.length ||
      volutas.length !== VAPOR.length
    ) {
      throw new Error(
        "ProcesoGrid: la cantidad de pasos no coincide con el mapa",
      );
    }

    const entrada = resorteGsap("entrada");
    const panel = resorteGsap("panel");
    const pop = resorteGsap("pop");
    const tacto = resorteGsap("tacto");
    const lento = resorteGsap("lento");

    // Rendimiento: lo HTML que se mueve o cambia de opacidad se lee en una
    // sola tanda antes de los set de abajo (prepararTransformes, lib/gsap.ts).
    // Los rótulos del mapa solo cambian de opacidad (se centran con
    // `translate`, en el span de afuera, que GSAP no toca).
    despues = prepararTransformes(
      [...puntos, ...tramos],
      [...nums, ...titulos, ...descs, ...luces],
    );

    /* Al armar solo cambia lo invisible (o queda en el mismo valor): el
       estado del SSR es el último cuadro de la vuelta. */
    gsap.set(
      [
        globo,
        msj,
        giro,
        cajaPop,
        cajaCuerpo,
        brillo,
        pulso,
        ...hitos,
        ...pings,
      ],
      { transformOrigin: "50% 50%" },
    );
    gsap.set(msj, { scale: 0.5 });
    gsap.set([...pings, pulso], { opacity: 0, scale: 0.8 });

    /* La lista, con quickTo: arranca siempre del valor actual, así el primer
       apagado sale del 1 del SSR sin dejar ese 1 grabado para las vueltas
       siguientes (un tween del timeline volvería a él en cada vuelta). */
    const luz = (els: Element[]) =>
      els.map((el) => gsap.quickTo(el, "opacity", { ...OPACIDAD_GSAP }));
    const qNum = luz(nums);
    const qTit = luz(titulos);
    const qDesc = luz(descs);
    /** Enciende el paso k y deja los demás tenues. */
    const activar = (k: number) => {
      for (let i = 0; i < qNum.length; i++) {
        qNum[i](i === k ? 1 : APAGADO.num);
        qTit[i](i === k ? 1 : APAGADO.titulo);
        qDesc[i](i === k ? 1 : APAGADO.desc);
      }
    };

    // La vuelta y sus tweens van fuera del contexto (ver armar).
    const vuelta = fuera(escena, () =>
      gsap.timeline({ repeat: -1, paused: true }),
    );
    vueltaCreada = vuelta;
    fuera(escena, () => {
      /** Aparecer: opacidad aparte y el resto con el resorte dado. */
      const aparecer = (
        el: gsap.TweenTarget,
        resto: gsap.TweenVars,
        resorte: ResorteGsap,
        t: number,
      ) =>
        vuelta
          .to(el, { opacity: 1, ...OPACIDAD_GSAP }, t)
          .to(el, { ...resto, ...resorte }, t);

      /** Un aro que se abre y se desvanece (arranca y termina invisible). */
      // Escalas chicas: con 3.2 y 1.9 los aros pasaban por encima de los
      // rótulos 02, 03 y "04 Tu mesa" mientras se apagaban.
      const ping = (el: Element, t: number, escala = 2.4) =>
        vuelta
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

      /** Cuándo la cola de la estela que se consume pasa por la fracción f. */
      const cola = (f: number) =>
        Math.max(momento(entrada.ease, f) * entrada.duration, T.minimo);
      /** Del arranque de un tramo a que el viajero "llegó" (90 %): 0.253 s. */
      const llegada = momento(panel.ease, 0.9) * panel.duration;

      /* 0 · Cierre de la vuelta anterior: la estela se consume hacia la mesa,
         el vapor y la caja se van, y cada parada (con su paso del riel) se
         apaga cuando la cola pasa por ella. */
      vuelta
        .to(estela, { drawSVG: "100% 100%", ...entrada }, 0)
        .to(vapor, { opacity: 0, ...SALIDA_GSAP }, 0)
        .to(cajaPop, { opacity: 0, ...SALIDA_GSAP }, T.cajaSale);
      tramos.forEach((tramo, k) => {
        // El tramo del riel se vacía hacia abajo, detrás de la cola.
        const t = cola(PARADAS[k]);
        vuelta
          .set(tramo, { transformOrigin: "50% 100%" }, t)
          .to(tramo, { scaleY: 0, ...tacto }, t);
      });
      hitos.forEach((hito, k) => {
        const t = cola(PARADAS[k + 1]);
        vuelta
          .to(hito, { opacity: 0, ...SALIDA_GSAP }, t)
          .to(hito, { scale: 0.2, ...tacto }, t)
          .to(luces[k], { opacity: APAGADO.rotulo, ...OPACIDAD_GSAP }, t)
          .to(puntos[k + 1], { scale: 0, ...tacto }, t);
      });
      // Rearmado, todo invisible (caja y vapor ya se fueron).
      vuelta
        .set(caja, { x: ORIGEN.x, y: ORIGEN.y }, T.rearmar)
        .set(cajaPop, { scale: 0.5 }, T.rearmar)
        .set(cajaCuerpo, { scale: 1 }, T.rearmar)
        .set(volutas, { drawSVG: "0% 0%" }, T.rearmar)
        .to([mesaLuz, brillo], { opacity: 0, ...OPACIDAD_GSAP }, T.mesaApaga)
        .to(
          luces[HITOS.length],
          { opacity: APAGADO.rotulo, ...OPACIDAD_GSAP },
          T.mesaApaga,
        )
        .to(puntos[TRAMOS], { scale: 0, ...tacto }, T.mesaApaga)
        .set(tramos, { transformOrigin: "50% 0%" }, T.rearmarRiel)
        .set(brillo, { scale: 0.6 }, T.rearmarBrillo);

      /* 1 · Tu mensaje: el globito escribe, da un toque de envío (un solo
         tween con keyframes: nada se pisa en la escala) y de su colita sale el
         globito chico. */
      vuelta.call(activar, [0], T.activo01);
      teclas.forEach((tecla, i) => {
        vuelta.to(
          tecla,
          {
            keyframes: { y: [0, -2.4, 0], easeEach: TRAMO },
            duration: T.teclaDur,
            ease: "none",
          },
          T.tecleo + i * T.tecla,
        );
      });
      vuelta.to(
        globo,
        {
          keyframes: { scale: [1, 0.94, 1], easeEach: TRAMO },
          duration: T.envioDur,
          ease: "none",
        },
        T.envio,
      );
      aparecer(msj, { scale: 1 }, pop, T.envio);

      /* 2 · El viaje, en tres tramos con `panel` (sale de 0 y se asienta sin
         rebote). La estela lo sigue y el tramo del riel se llena a la par; al
         llegar a cada lugar se enciende con su paso. */
      T.salidas.forEach((sale, k) => {
        const hasta = `0% ${PARADAS[k + 1] * 100}%`;
        vuelta.to(
          caja,
          {
            motionPath: {
              path: estela,
              start: PARADAS[k],
              end: PARADAS[k + 1],
            },
            ...panel,
          },
          sale,
        );
        if (k === 0) {
          vuelta.fromTo(
            estela,
            { drawSVG: "0% 0%" },
            { drawSVG: hasta, ...panel, immediateRender: false },
            sale,
          );
        } else {
          vuelta.to(estela, { drawSVG: hasta, ...panel }, sale);
        }
        vuelta.to(tramos[k], { scaleY: 1, ...panel }, sale);

        const llega = sale + llegada;
        if (k < HITOS.length) {
          aparecer(hitos[k], { scale: 1 }, pop, llega);
          vuelta
            .to(luces[k], { opacity: 1, ...OPACIDAD_GSAP }, llega)
            .to(puntos[k + 1], { scale: 1, ...pop }, llega)
            .call(activar, [k + 1], llega);
          ping(pings[k], llega);
          if (k === 0) {
            // 02: el globito chico se da vuelta. Es la respuesta.
            vuelta.to(giro, { scaleX: -1, ...pop }, llega + T.giro);
          } else {
            // 03: el pedido quedó cerrado; el globito pasa a ser la cajita.
            const cambio = llega + T.cambio;
            vuelta
              .to(msj, { scale: 0.5, ...tacto }, cambio)
              .to(msj, { opacity: 0, ...SALIDA_GSAP }, cambio);
            aparecer(cajaPop, { scale: 1 }, pop, cambio);
            vuelta.set(giro, { scaleX: 1 }, T.giroVuelve);
          }
        } else {
          // 04: la cajita se apoya en la mesa, que se enciende en ámbar (aro,
          // brillo y un pulso) junto con su paso, y sube el vapor.
          const entrega = llega + T.entrega;
          vuelta
            .to(cajaCuerpo, { scale: 0.8, ...tacto }, entrega)
            .to(mesaLuz, { opacity: 1, ...OPACIDAD_GSAP }, entrega);
          aparecer(brillo, { scale: 1 }, pop, entrega);
          ping(pulso, entrega, 1.6);
          vuelta
            .to(luces[k], { opacity: 1, ...OPACIDAD_GSAP }, entrega)
            .to(puntos[k + 1], { scale: 1, ...pop }, entrega)
            .call(activar, [k + 1], entrega)
            .set(vapor, { opacity: 1 }, entrega + T.vapor)
            .to(
              volutas,
              { drawSVG: "0% 100%", ...entrada, stagger: 0.08 },
              entrega + T.vapor,
            );
        }
      });
      // Hasta VUELTA todo quieto y servido: ese último cuadro es el del SSR.
      vuelta.set({}, {}, VUELTA);
    });

    /* Corre solo con la sección a la vista; afuera, en pausa. Se decide
       también en cada refresh: si se arma en medio de un cambio de
       matchMedia (al volver de reducir movimiento), ScrollTrigger la mide
       recién en el refresh siguiente. */
    const seguir = (self: ScrollTrigger) => {
      if (self.isActive) vuelta.play();
      else vuelta.pause();
    };
    zona = ScrollTrigger.create({
      trigger: lienzo,
      start: ZONA.vuelta.start,
      endTrigger: lista,
      end: ZONA.vuelta.end,
      refreshPriority: 0,
      onToggle: seguir,
      onRefresh: seguir,
    });
    if (zona.isActive) vuelta.play();
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
      // antes.
      let desmontado = false;
      const montar = contextSafe(() => {
        if (desmontado) return;
        const mm = gsap.matchMedia();
        // Reducir movimiento: la versión quieta del SSR, sin tocar nada.
        mm.add(MQ_MOVER, (deMedia) => {
          // Contexto propio: si algo falla al armar, se revierte lo que alcanzó
          // a crearse y queda la versión estática (fail-open). Se crea Y se
          // llena fuera del contexto de matchMedia: Context.add se anota en el
          // contexto que esté activo al correr, y si quedara adentro, al
          // cambiar a reducir movimiento matchMedia lo revertiría antes que la
          // limpieza de abajo, que tiene que revertir primero la vuelta y
          // recién después la escena (ver armar).
          const escena = fuera(deMedia, () => gsap.context(() => {}, root));
          let armado = { limpiar: () => {}, despues: () => {} };
          try {
            fuera(deMedia, () =>
              escena.add(() => {
                armado = armar(root, escena);
              }),
            );
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
              <Mapa />
              {/* Rótulos: HTML sobre el SVG (mantienen su tamaño a cualquier
                  ancho del mapa). GSAP solo toca la opacidad de los
                  [data-luz], nunca el span que se centra con `translate`. */}
              <div aria-hidden>
                <span className={cn(s.etq, s.etqOrigen)}>
                  <span className={s.etqNum}>{pasos[0]?.n}</span>{" "}
                  {MAPA_COPY.origen}
                </span>
                <span className={cn(s.etq, s.etqParada2)}>
                  <span data-luz className="block">
                    {pasos[1]?.n}
                  </span>
                </span>
                <span className={cn(s.etq, s.etqParada3)}>
                  <span data-luz className="block">
                    {pasos[2]?.n}
                  </span>
                </span>
                <span className={cn(s.etq, s.etqDestino)}>
                  <span data-luz className="block">
                    {pasos[3]?.n} {MAPA_COPY.destino}
                  </span>
                </span>
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
                  <div className={s.texto}>
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

/** El mapa en SVG. Decorativo (aria-hidden): lo que cuenta lo cuentan los
 *  pasos. Estado del SSR: el final de la vuelta (onda recorrida, caja
 *  apoyada en la mesa encendida, con su vapor). */
function Mapa() {
  return (
    <svg
      viewBox="0 0 400 200"
      className={cn(s.svg, s.svgVivo)}
      aria-hidden
      focusable="false"
    >
      {/* La onda: punteada (el plan, siempre a la vista) y la estela que deja
          el viajero. */}
      <path
        data-m="plan"
        d={RUTA}
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

      {/* Aros que se abren cuando se enciende una parada. En reposo no se
          ven. */}
      {HITOS.map((h) => (
        <circle
          key={`ping-${h.f}`}
          data-m="ping"
          cx={h.x}
          cy={h.y}
          r="6"
          opacity={0}
          className="fill-none stroke-crema"
          strokeWidth={1}
        />
      ))}

      {/* Paradas 02 y 03: el aro queda siempre; el punto se apaga y se
          enciende. */}
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

      {/* Tu mensaje: el globito con los tres puntitos que escriben. El toque
          de envío escala el grupo entero. */}
      <g data-m="globo">
        <path
          d={GLOBO}
          className="fill-bg stroke-crema"
          strokeOpacity={0.8}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        {TECLAS.map((t) => (
          <circle
            key={t.x}
            data-m="tecla"
            cx={t.x}
            cy={t.y}
            r="2.2"
            className="fill-crema"
            fillOpacity={0.75}
          />
        ))}
      </g>

      {/* Tu mesa, vista desde arriba: el círculo tapa la punta de la onda;
          encima, la luz ámbar (brillo, aro y un pulso que se abre) y las 4
          sillas. */}
      <circle
        cx={MESA.x}
        cy={MESA.y}
        r="15"
        className="fill-bg stroke-crema"
        strokeOpacity={0.5}
        strokeWidth={1.2}
      />
      <circle
        data-m="brillo"
        cx={MESA.x}
        cy={MESA.y}
        r="14.4"
        className="fill-amarillo"
        fillOpacity={0.12}
      />
      <circle
        data-m="mesa-luz"
        cx={MESA.x}
        cy={MESA.y}
        r="15"
        className="fill-none stroke-amarillo"
        strokeWidth={1.2}
      />
      <circle
        data-m="pulso"
        cx={MESA.x}
        cy={MESA.y}
        r="15"
        opacity={0}
        className="fill-none stroke-amarillo"
        strokeWidth={1}
      />
      {SILLAS.map((p) => (
        <circle
          key={`${p.x}-${p.y}`}
          cx={p.x}
          cy={p.y}
          r="1.9"
          className="fill-crema"
          fillOpacity={0.45}
        />
      ))}

      {/* El viajero, dibujado alrededor de (0,0). Capas separadas, cada una
          movida por su propia animación (así ninguna pisa la transformación
          de otra al revertir): "caja" = su punto en la onda (MotionPath),
          "msj" = el globito chico (aparece y se va), "giro" = se da vuelta en
          02, "caja-pop" = la cajita aparece en 03, "caja-cuerpo" = se apoya
          en la mesa. En el SSR ya se apoyó: la caja en la mesa, a 0.8. */}
      <g data-m="caja" transform={`translate(${MESA.x} ${MESA.y})`}>
        <g data-m="msj" opacity={0}>
          <g data-m="giro">
            <rect
              x="-8"
              y="-7"
              width="16"
              height="11"
              rx="4.5"
              className="fill-bg stroke-crema"
              strokeOpacity={0.9}
              strokeWidth={1.1}
            />
            <path
              d="M-4 3.6L-6.2 8L0 3.6"
              className="fill-bg stroke-crema"
              strokeOpacity={0.9}
              strokeWidth={1.1}
              strokeLinejoin="round"
            />
            {PUNTITOS.map((x) => (
              <circle
                key={x}
                cx={x}
                cy="-1.5"
                r="1"
                className="fill-crema"
                fillOpacity={0.8}
              />
            ))}
          </g>
        </g>
        <g data-m="caja-pop">
          <g data-m="caja-cuerpo" transform="scale(0.8)">
            <g transform="scale(0.85)">
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
      </g>

      {/* Vapor de la mesa servida. */}
      <g data-m="vapor" className="fill-none stroke-crema">
        {VAPOR.map((d) => (
          <path
            key={d}
            d={d}
            strokeOpacity={0.42}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
}
