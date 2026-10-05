import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { COSTURA } from "@/lib/fisica";
import { completarMaquetado } from "@/lib/maquetado";

/**
 * GSAP del sitio: registro ÚNICO de ScrollTrigger y useGSAP, y los helpers que
 * comparten las escenas (física de lib/fisica.ts aplicada al scroll).
 *
 * GSAP está permitido desde la beta "dopamina" (CLAUDE.md §6) para las escenas
 * de scroll: hero, servicios, empresas, galería, Flor, reseñas, cómo trabajamos,
 * FAQ, pie, bocaditos, la cuchara de progreso y los títulos que se encienden
 * (más el refresh del formulario, Field). Todos importan gsap, ScrollTrigger y
 * useGSAP desde acá (así el registro corre una sola vez y siempre antes del
 * primer uso); los plugins extra (DrawSVG, MotionPath...) los registra el
 * componente que los usa.
 *
 * Scroll (un solo suavizado):
 * - Con puntero fino (rueda, trackpad) el scroll lo mueve Lenis desde un rAF
 *   propio (SmoothScroll) que llama primero a lenis.raf y después a
 *   gsap.ticker.tick(): cada cuadro de pantalla tiene su tick de GSAP y Lenis ya
 *   escribió el scroll de ESE cuadro cuando corren los listeners del ticker.
 * - En táctiles (scrollNativo) no hay Lenis: el dedo mueve el scroll nativo, con
 *   su momentum, en el hilo del compositor. Por eso ahí los pins anticipan
 *   (anticiparPin) y las anclas usan scroll-behavior: smooth (globals.css).
 * - Las escenas usan scrub directo (SCRUB) y cada pin lleva costura
 *   (conCostura): el contenido frena y arranca con velocidad continua al fijarse
 *   y al soltarse, en vez de pasar de golpe de la velocidad del scroll a 0.
 *
 * Orden de los refresh: varias secciones se fijan (pin): el hero, servicios
 * (solo en compu), la intro de galería, Flor (compu con alto) y reseñas. Cómo
 * trabajamos ya no fija. Esos pins y los triggers de empresas, galería y cómo
 * trabajamos llevan `refreshPriority: 0`: con esa opción presente en cualquier
 * trigger, ScrollTrigger ordena TODOS los refresh por posición en la página,
 * así cada pin se calcula con el espacio de los de arriba aunque se haya creado
 * más tarde. Lo que tiene que ir último (el pie y el mazo de reseñas después de
 * su pin) lleva -1: más alto = antes.
 *
 * Cuándo se arma cada escena: al hidratar, solo las que fijan o cambian el alto
 * de la página (hero, Servicios, Galería, Flor en compu, Reseñas); las demás
 * (Empresas, la fila de Galería y Flor en celular, Preguntas, el pie, los
 * títulos que se encienden) al acercarse, con alAcercarse / useGSAPAlAcercarse
 * (abajo). Es lo que más baja el bloqueo de la carga en celular.
 *
 * Armado sin recálculos de más (rendimiento, mismo resultado en pantalla):
 * - prepararTransformes: antes de armar los tweens de una escena, lo que mueve
 *   se lee en una sola tanda (si no, GSAP lee y escribe elemento por elemento
 *   y cada lectura obliga a recalcular estilos);
 * - medidaPorTarea: los valores en función que salen de la misma medida de
 *   layout se miden una vez por tarea (altoNav, las poses de Reseñas);
 * - invalidateOnRefresh solo donde hay valores en función (en el hero se
 *   invalidan únicamente esos tweens).
 *
 * El registro va protegido: este módulo también se evalúa en el servidor (SSR de
 * los componentes cliente) y ahí no se ejecuta nada de GSAP.
 */
if (typeof window !== "undefined") {
  // Antes de que cualquier escena mida: suelta las secciones que el
  // maquetado diferido (lib/maquetado.ts) todavía no soltó. Normalmente ya
  // terminó (corre apenas llegan las fuentes); si no, una sola maquetación
  // acá, y los pins se calculan sobre la página entera como siempre.
  completarMaquetado();
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  // En mobile, la barra del navegador que aparece y desaparece cambia el alto de
  // la ventana: no recalcular por eso (evita saltos en medio del pin).
  // Sin el refresh automático en `load` (los demás eventos, los de siempre):
  // cuando `load` llegaba después de hidratar, recalculaba la página entera
  // otra vez (~100 a 300 ms de bloqueo en un celular de gama media) sin que
  // nada hubiera cambiado: las imágenes tienen su tamaño reservado (CLS 0),
  // las secciones diferidas se sueltan antes de medir (completarMaquetado,
  // arriba) y las fuentes tienen su propio refresh (abajo).
  ScrollTrigger.config({
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,resize",
  });
  // Red de seguridad: ScrollTrigger ya recalcula solo al cambiar el tamaño de
  // la ventana, pero si las fuentes (display: swap) terminan después,
  // el alto de los textos cambia y los pins de más abajo quedarían corridos.
  // Un recálculo cuando están listas. refresh(true) es el seguro: si el
  // usuario está scrolleando, GSAP lo posterga al final del scroll. Sin el
  // true, el refresh es forzado: revierte los pins y lleva la ventana a 0 y de
  // vuelta en pleno gesto (en táctiles corta el momentum del dedo).
  if (document.fonts && document.fonts.status !== "loaded") {
    void document.fonts.ready.then(() => ScrollTrigger.refresh(true));
  }
}

/**
 * Scroll nativo: pantalla táctil sin puntero fino (teléfonos y tablets). Es el
 * mismo criterio con el que SmoothScroll decide NO crear Lenis: con el dedo
 * Lenis no suaviza (syncTouch false) y solo sumaba listeners no pasivos de
 * touchstart/touchmove. Las laptops táctiles (puntero fino) siguen con Lenis.
 * Solo en el cliente.
 */
export function scrollNativo(): boolean {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/**
 * Valor de `anticipatePin` para los pins: 1 solo con scroll nativo
 * (scrollNativo), que corre en el hilo del compositor: anticipar evita que el
 * pin tiemble al fijarse. Con Lenis el scroll se escribe en el mismo cuadro que
 * ScrollTrigger, y anticipar fijaba el pin 60 a 80px antes de tiempo: un salto
 * visible. Antes se usaba ScrollTrigger.isTouch, que en la vista de celular de
 * DevTools vale 1 mientras Lenis mueve la rueda (saltos de 52 a 58 px en
 * Galería, Reseñas y Proceso). Llamarla al armar el pin (en el cliente).
 */
export const anticiparPin = (): number => (scrollNativo() ? 1 : 0);

/**
 * Alto real del Nav sticky (las escenas se fijan justo debajo). Si no se puede
 * medir, el de la variable --nav-h de globals.css. Solo en el cliente.
 *
 * Una medida por tarea (medidaPorTarea): el alto del nav solo cambia con el
 * ancho de la ventana, y lo piden las posiciones de todos los pins y varias
 * escenas en cada armado y en cada refresh, cada vez obligando a maquetar
 * después de las escrituras de la anterior.
 */
const medirNav = medidaPorTarea((): number => {
  const medido = document.querySelector("nav")?.getBoundingClientRect().height;
  if (medido) return medido;
  const css = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--nav-h"),
  );
  return Number.isFinite(css) ? css : 70;
});
export function altoNav(): number {
  return medirNav();
}

/**
 * Pide UN refresh completo para el cuadro siguiente, salvo que antes corra
 * otro. Para la escena que, al armarse con la página ya cargada, cambia el
 * alto de su sección y necesita que los triggers de abajo se recalculen.
 *
 * Al armar la página, crear un pin ya encola un refresh completo para el
 * cuadro siguiente (ScrollTrigger lo hace solo), y ese refresh corre antes que
 * este pedido si el pin se creó antes (arriba en la página): pedir otro
 * duplicaba el trabajo, unos 300 ms de bloqueo en un celular de gama media
 * con los ~70 triggers del sitio. Si nadie refresca (HMR, un cambio de modo
 * sin pins de por medio), lo hace este. Si el refresh de este pedido corre
 * primero, el encolado por un pin de más abajo se saltea solo (ScrollTrigger
 * no repite si ya hubo uno). Devuelve la cancelación. Solo en el cliente.
 */
export function refrescarSiNadieLoHace(): () => void {
  let hubo = false;
  const marcar = () => {
    hubo = true;
  };
  ScrollTrigger.addEventListener("refresh", marcar);
  const id = requestAnimationFrame(() => {
    ScrollTrigger.removeEventListener("refresh", marcar);
    if (!hubo) ScrollTrigger.refresh();
  });
  return () => {
    cancelAnimationFrame(id);
    ScrollTrigger.removeEventListener("refresh", marcar);
  };
}

/**
 * Armar al acercarse: las escenas que no fijan nada ni cambian el alto de la
 * página no se arman al hidratar, sino cuando su elemento queda a `margen`
 * (1.5 pantallas por defecto) de la vista, cada una en su propia tarea.
 *
 * Al hidratar, todas las escenas se armaban juntas en una sola tarea: unos
 * 800 ms de bloqueo en un celular de gama media (CPU x4 en Lighthouse), casi
 * todo crear ScrollTriggers (~60) y sus tweens con las mediciones de layout
 * que eso fuerza, y después el refresh completo que encolan los pins los
 * recalculaba a todos otra vez. Las escenas de más
 * abajo no necesitan existir hasta que la persona se acerca: así la carga
 * arma solo lo que está cerca (y lo que tiene que estar para que los pins
 * midan bien), y el refresh de los pins tiene menos triggers que recorrer.
 *
 * Condiciones para usarlo (si no, armar al hidratar con useGSAP):
 * - Nada de pin (ScrollTrigger encola un refresh completo al crear uno) ni
 *   cambios de alto o de layout de la sección (los pins de más abajo quedarían
 *   medidos con el alto viejo).
 * - Ningún trigger arranca antes de que la sección esté a `margen` de la vista
 *   (los `start` habituales son "top bottom" o más tarde; capaActiva arranca a
 *   1 pantalla). Así, al armarse, todo está en progreso 0 y lo que la escena
 *   pone de entrada (palabras tenues, filas corridas) se aplica fuera de la
 *   vista. Con un ancla o una recarga a mitad de página la escena se arma
 *   enseguida, con la página ya medida (y si el elemento quedó adentro de un
 *   pin activo, se pide un refresh seguro para medirla sin el pin).
 * - Fail-open intacto: hasta armarse, la sección es la del servidor (todo
 *   visible); sin JS o con reducir movimiento, igual que antes.
 *
 * Sin IntersectionObserver arma enseguida. Devuelve la cancelación.
 */
export const MARGEN_ACERCARSE = "150%";

export function alAcercarse(
  el: Element,
  armar: () => void,
  margen: string = MARGEN_ACERCARSE,
): () => void {
  if (typeof IntersectionObserver === "undefined") {
    armar();
    return () => {};
  }
  let hecho = false;
  const io = new IntersectionObserver(
    (entradas) => {
      if (hecho || !entradas.some((e) => e.isIntersecting)) return;
      hecho = true;
      io.disconnect();
      armar();
      // Armada con el elemento adentro de un pin activo (un ancla o una
      // recarga que cae en medio de una escena fijada, como el encabezado de
      // Servicios en compu): ScrollTrigger midió sus triggers con el pin
      // fijado y quedan corridos. Un refresh seguro (si se está scrolleando,
      // espera al final) los mide con los pins revertidos.
      const fijado = el.closest(".pin-spacer")?.firstElementChild;
      if (
        fijado instanceof HTMLElement &&
        getComputedStyle(fijado).position === "fixed"
      ) {
        ScrollTrigger.refresh(true);
      }
    },
    { rootMargin: `${margen} 0px ${margen} 0px` },
  );
  io.observe(el);
  return () => {
    hecho = true;
    io.disconnect();
  };
}

/**
 * Corre `pasos` en orden, cada uno en su propia tarea (el primero enseguida,
 * los demás con setTimeout 0). Para partir el armado de una escena que se arma
 * al acercarse (mientras la persona scrollea) en tareas de menos de 50 ms: un
 * armado de ~110 ms en un celular de gama media congelaba un instante lo que
 * se mueve con el scroll. Los pasos tienen que correr dentro del contexto de
 * GSAP de la escena (envolverlos con ctx.add o contextSafe) para que se
 * reviertan con ella. Devuelve la cancelación de los que falten.
 */
export function enTareas(pasos: Array<() => void>): () => void {
  let i = 0;
  let id = 0;
  let vivo = true;
  const siguiente = () => {
    if (!vivo) return;
    pasos[i++]?.();
    if (i < pasos.length) id = window.setTimeout(siguiente, 0);
  };
  siguiente();
  return () => {
    vivo = false;
    window.clearTimeout(id);
  };
}

/**
 * useGSAP que arma la escena al acercarse (ver alAcercarse): mismo `scope`,
 * mismas `dependencies` y la misma limpieza. Lo que `armar` crea (tweens,
 * triggers, matchMedia) y la función que devuelve quedan en el contexto de
 * useGSAP (contextSafe), así que se revierten al desmontar como siempre. Se
 * observa el elemento del `scope`.
 */
export function useGSAPAlAcercarse(
  armar: () => void | (() => void),
  {
    scope,
    dependencies = [],
    margen,
  }: {
    scope: { current: Element | null };
    dependencies?: unknown[];
    margen?: string;
  },
) {
  return useGSAP(
    (_contexto, contextSafe) => {
      const el = scope.current;
      if (!el || !contextSafe) return;
      return alAcercarse(el, contextSafe(armar), margen);
    },
    { scope, dependencies },
  );
}

/**
 * Prepara lo que una escena va a mover ANTES de armar sus tweens
 * (rendimiento: mismo resultado en pantalla).
 *
 * GSAP lee el transform de cada elemento la primera vez que lo toca
 * (getComputedStyle) y en ese momento escribe translate/rotate/scale: none en
 * línea; para la opacidad, cada tween (y el "desde" de cada fromTo) lee el
 * valor actual si no hay uno en línea. Armando una escena, cada lectura caía
 * después de la escritura del tween anterior y obligaba al navegador a
 * recalcular estilos: un recálculo por elemento (unos 70 en el armado del
 * hero; en un celular de gama media ~1 ms cada uno). Además, cada refresh de
 * un trigger con invalidateOnRefresh revierte sus tweens: si el elemento no
 * tenía transform u opacidad en línea, GSAP los vuelve a leer al rearmarlos,
 * otro recálculo por elemento en cada refresh.
 *
 * Acá, en tandas: primero se leen todos (un solo recálculo), después se
 * escribe en línea el mismo valor que ya computa el CSS (transform, translate,
 * rotate y scale en none: lo mismo que escribiría GSAP; la opacidad, la que
 * tiene) y al final GSAP lee los transforms con el estilo ya limpio (sus
 * escrituras no cambian nada). Con los valores en línea, revertir los deja
 * igual y GSAP no vuelve a leer.
 *
 * - `transformes`: lo que la escena transforma. Solo toca elementos con caja
 *   (sin display: none propio ni de un ancestro), sin transform propio
 *   (computado y en línea en none) y que GSAP todavía no tocó.
 * - `opacidades`: lo que la escena le cambia la opacidad. Solo elementos sin
 *   opacidad en línea ni animaciones CSS en curso (una animación puede estar
 *   mostrando un valor intermedio).
 * El resto queda como siempre. Llamarla después de los cambios de modo de la
 * escena (con el CSS del modo ya puesto). Mientras la escena está armada, GSAP
 * ya escribe esos valores en línea igual. Devuelve la limpieza: saca lo que
 * puso si sigue igual (llamarla después de que el contexto de GSAP revirtió lo
 * suyo, como hacen las limpiezas de las escenas).
 */
const PROPS_TRANSFORM = ["transform", "translate", "rotate", "scale"] as const;
type ConGsap = HTMLElement & { _gsap?: unknown };
export function prepararTransformes(
  transformes: ReadonlyArray<Element | null | undefined>,
  opacidades: ReadonlyArray<Element | null | undefined> = [],
): () => void {
  const html = (lista: ReadonlyArray<Element | null | undefined>) =>
    Array.from(
      new Set(
        lista.filter((el): el is HTMLElement => el instanceof HTMLElement),
      ),
    );
  // 1 · Lecturas (la primera recalcula; las demás encuentran el estilo limpio).
  const libres = html(transformes).filter((el) => {
    if ((el as ConGsap)._gsap || el.style.transform) return false;
    // Sin caja (lo que el modo no usa): GSAP mide esos de otra forma y solo
    // si los anima.
    if (!el.offsetParent) return false;
    const cs = getComputedStyle(el);
    return PROPS_TRANSFORM.every((p) => cs[p] === "none");
  });
  const opacas = html(opacidades)
    .filter(
      (el) =>
        !el.style.opacity &&
        typeof el.getAnimations === "function" &&
        el.getAnimations().length === 0,
    )
    .map((el) => ({ el, valor: getComputedStyle(el).opacity }));
  // 2 · Escrituras: el mismo valor que ya tiene.
  for (const el of libres) {
    for (const p of PROPS_TRANSFORM) el.style[p] = "none";
  }
  for (const { el, valor } of opacas) el.style.opacity = valor;
  // 3 · Caché de GSAP (un recálculo para toda la tanda).
  for (const el of libres) gsap.getProperty(el, "x");
  return () => {
    for (const el of libres) {
      for (const p of PROPS_TRANSFORM) {
        if (el.style[p] === "none") el.style.removeProperty(p);
      }
    }
    for (const { el, valor } of opacas) {
      if (el.style.opacity === valor) el.style.removeProperty("opacity");
    }
  };
}

/**
 * Memoriza una medida durante la tarea en curso (rendimiento). Para los
 * valores en función de los tweens que salen todos de la MISMA medida de
 * layout (offset*, sin transforms): GSAP los evalúa uno por uno, intercalados
 * con sus escrituras, y cada evaluación volvía a medir y obligaba a maquetar de
 * nuevo. Dentro de una misma tarea (un armado, un refresh) el layout de reposo
 * no cambia; la tarea siguiente mide de nuevo. Solo en el cliente.
 */
export function medidaPorTarea<T>(medir: () => T): () => T {
  let valor: T | undefined;
  let vigente = false;
  return () => {
    if (!vigente) {
      valor = medir();
      vigente = true;
      queueMicrotask(() => {
        vigente = false;
      });
    }
    return valor as T;
  };
}

/** Variable CSS con la que la costura corre la sección siguiente (ver conCostura). */
const VAR_COSTURA = "--costura-mb";

/**
 * Costura de un pin: el contenido llega a su lugar con velocidad continua.
 *
 * Sin costura, al fijarse el contenido pasa en UN cuadro de la velocidad del
 * scroll a 0 (y al soltarse de 0 a la velocidad del scroll): un golpe. Con
 * costura el pin se fija `d` px antes (quien llama pone
 * `start: () => \`top ${altoNav() + COSTURA.d}px\``) y el contenido:
 * - al fijarse sigue subiendo a 1x el scroll y frena a 0 en l px (entrada);
 * - antes de soltarse acelera de 0 a 1x en l px (salida);
 * con l = min(2d, D/4) y D = el recorrido del pin. En cada tramo el contenido
 * se corre l/2 px: con d = 80 y un pin largo, 80 px al fijarse (vuelve a quedar
 * justo debajo del nav) y otros 80 al soltarse.
 *
 * Para que la sección siguiente quede pegada, el elemento fijado lleva un
 * margin-bottom negativo igual a lo que se corrió el contenido; ScrollTrigger
 * lo copia al pin-spacer al refrescar. Va por una variable CSS (--costura-mb):
 * si el recorrido cambia y con él el corrimiento, se actualiza la variable y se
 * pide un refresh (converge en uno). Si el padre del pin es flex, ScrollTrigger
 * no pone pinSpacing y este margen no alcanza: usar costura solo de entrada o
 * pasar pinSpacing explícito.
 *
 * Devuelve las mismas vars con onUpdate y onRefresh compuestos (primero corre
 * el callback original) y `limpiar`, que saca el listener de refreshInit, el
 * transform del contenido y el margen. `contenido` tiene que ser un hijo del pin
 * que ningún otro tween mueva en `y`. En `refreshInit` el contenido vuelve a
 * y = 0 para que las mediciones no incluyan el corrimiento.
 *
 * Con reducir movimiento no se llama: sin pins, sin costura.
 */
export function conCostura(
  vars: ScrollTrigger.Vars,
  contenido: HTMLElement | HTMLElement[],
  {
    d = COSTURA.d,
    entrada = true,
    salida = true,
  }: { d?: number; entrada?: boolean; salida?: boolean } = {},
): { vars: ScrollTrigger.Vars; limpiar: () => void } {
  const els = Array.isArray(contenido) ? contenido : [contenido];
  const objetivo = vars.pin === true ? vars.trigger : vars.pin;
  const fijado = objetivo
    ? (gsap.utils.toArray<HTMLElement>(objetivo)[0] ?? null)
    : null;
  // Lecturas antes de escribir: el margen propio del pin y los transforms del
  // contenido (prepararTransformes), así el quickSetter no fuerza recálculos.
  const propio = fijado
    ? parseFloat(getComputedStyle(fijado).marginBottom) || 0
    : 0;
  const quitarPreparacion = prepararTransformes(els);
  const ponerY = gsap.quickSetter(els, "y", "px") as (v: number) => void;

  /** Corrimiento de cada tramo para un recorrido D. */
  const tramo = (D: number) => {
    const l = Math.max(0, Math.min(2 * d, D / 4));
    return { l, dd: l / 2 };
  };
  const margenPara = (dd: number) =>
    (entrada ? dd : 0) + (salida ? dd : 0);

  // Margen inicial: el de un pin largo (D >= 8d). Se fija ANTES de crear el
  // ScrollTrigger: el estado "original" del pin que ScrollTrigger restaura en
  // cada refresh lo incluye, y la variable se puede cambiar después.
  let margen = margenPara(d);
  let margenPrevio = "";
  if (fijado) {
    margenPrevio = fijado.style.marginBottom;
    fijado.style.setProperty(VAR_COSTURA, `${-margen}px`);
    fijado.style.marginBottom = propio
      ? `calc(${propio}px + var(${VAR_COSTURA}, 0px))`
      : `var(${VAR_COSTURA}, 0px)`;
  }

  const aplicar = (st: ScrollTrigger) => {
    const D = st.end - st.start;
    if (!(D > 0)) {
      ponerY(0);
      return;
    }
    const { l, dd } = tramo(D);
    if (!l) {
      ponerY(0);
      return;
    }
    const s = st.progress * D;
    let y = 0;
    if (entrada) {
      const u = Math.min(s, l) / l;
      y -= dd * (1 - (1 - u) * (1 - u));
    }
    if (salida && s > D - l) {
      const u = (s - (D - l)) / l;
      y -= dd * u * u;
    }
    ponerY(y);
  };

  const alRefrescarInicio = () => ponerY(0);
  ScrollTrigger.addEventListener("refreshInit", alRefrescarInicio);

  const { onUpdate, onRefresh } = vars;
  const compuestas: ScrollTrigger.Vars = {
    ...vars,
    onUpdate: (st) => {
      onUpdate?.(st);
      aplicar(st);
    },
    onRefresh: (st) => {
      onRefresh?.(st);
      aplicar(st);
      // Pin corto: el corrimiento real no es el supuesto. Se corrige la
      // variable y se recalcula (la sección siguiente se mide de nuevo).
      if (fijado) {
        const real = margenPara(tramo(st.end - st.start).dd);
        if (Math.abs(real - margen) > 0.5) {
          margen = real;
          fijado.style.setProperty(VAR_COSTURA, `${-margen}px`);
          requestAnimationFrame(() => ScrollTrigger.refresh());
        }
      }
    },
  };

  const limpiar = () => {
    ScrollTrigger.removeEventListener("refreshInit", alRefrescarInicio);
    gsap.set(els, { clearProps: "y" });
    quitarPreparacion();
    if (fijado) {
      fijado.style.removeProperty(VAR_COSTURA);
      fijado.style.marginBottom = margenPrevio;
    }
  };

  return { vars: compuestas, limpiar };
}

/**
 * will-change solo mientras la escena está cerca: pone el atributo `data-capa`
 * en `el` desde `antes` pantallas antes de que entre hasta `despues` pantallas
 * después de que sale (el CSS de la sección decide qué capa promueve con
 * `[data-capa]`). Así las capas de GPU existen solo alrededor de la escena
 * activa y se rasterizan antes de que llegue, no en pleno scroll.
 * Devuelve la limpieza (mata el trigger y saca el atributo).
 */
export function capaActiva(
  el: HTMLElement,
  { antes = 1, despues = 1 }: { antes?: number; despues?: number } = {},
): () => void {
  const poner = (activa: boolean) => {
    if (activa) el.setAttribute("data-capa", "");
    else el.removeAttribute("data-capa");
  };
  const st = ScrollTrigger.create({
    trigger: el,
    start: `top bottom+=${antes * 100}%`,
    end: `bottom top-=${despues * 100}%`,
    refreshPriority: 0,
    onToggle: (self) => poner(self.isActive),
    onRefresh: (self) => poner(self.isActive),
  });
  return () => {
    st.kill();
    el.removeAttribute("data-capa");
  };
}

export { gsap, ScrollTrigger, useGSAP };
