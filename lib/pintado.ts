/**
 * Esperar a que el hero se vea antes de pedir lo que no hace falta para verlo
 * (rendimiento: mismo resultado en pantalla). Solo en el cliente.
 *
 * "Se pintó" = la primera pintura con contenido ya había pasado (lo normal en
 * una página visible) o, si no, una entrada de LCP de imagen adentro de
 * #inicio (el cuadro del <img> o la tapa). Si el LCP termina siendo un texto,
 * `RESPALDO_MS` después de la primera pintura; donde no hay LCP (Safari), la
 * primera pintura; sin PerformanceObserver, enseguida.
 *
 * En una página visible el hero se pinta antes de hidratar: todo sale igual
 * que siempre, sin esperar nada. En una pestaña que el navegador todavía no
 * muestra (abierta en segundo plano, o un navegador automatizado que demora
 * los cuadros, como el de PageSpeed) no hay pintura hasta mostrarse: lo que
 * se pedía en ese rato le competía al hero y Lighthouse lo contaba dentro del
 * LCP (la secuencia del hero, ~1 MB en celular, lo llevaba de ~3.6 a ~8.5 s
 * simulados; los chunks de la decoración y el cuadro 0 del motor, unos
 * cientos de ms más).
 *
 * Para lo del hero (despuesDeLoad y despuesDelPintado), la intención también
 * cuenta como pintado: si la persona ya usó la página (rueda, dedo, tecla o
 * puntero), la está viendo. Sin esto, una rueda apenas entrar cortaba el
 * registro de LCP antes de la entrada de la imagen del hero y, si `load`
 * llegaba antes que la entrada de la primera pintura, la secuencia esperaba
 * todo el respaldo (la caja quieta en el cuadro 0 ~1.5 s y después un salto).
 * Lighthouse no genera input: para PageSpeed es lo mismo que antes.
 */
const RESPALDO_MS = 1500;

/**
 * Intención: se escucha desde que se evalúa el módulo (pasivo, en captura)
 * hasta la primera; ahí avisa a los que esperan (`alIntentar`).
 */
const TIPOS_INTENCION = [
  "wheel",
  "touchstart",
  "keydown",
  "pointerdown",
] as const;
let intencion = false;
const alIntentar = new Set<() => void>();
if (typeof window !== "undefined") {
  const opciones = { capture: true, passive: true } as const;
  const marcar = () => {
    if (intencion) return;
    intencion = true;
    TIPOS_INTENCION.forEach((t) =>
      window.removeEventListener(t, marcar, opciones),
    );
    const avisar = Array.from(alIntentar);
    alIntentar.clear();
    avisar.forEach((fn) => fn());
  };
  TIPOS_INTENCION.forEach((t) => window.addEventListener(t, marcar, opciones));
}

function cuandoSePinte(
  fn: () => void,
  conLoad: boolean,
  esperarHero = true,
): () => void {
  const tipos =
    typeof PerformanceObserver !== "undefined"
      ? (PerformanceObserver.supportedEntryTypes ?? [])
      : [];
  // Sin esperarHero alcanza con la primera pintura (como donde no hay LCP).
  const conLcp = esperarHero && tipos.includes("largest-contentful-paint");
  const conPaint = tipos.includes("paint");
  // La primera pintura con contenido ya pasó: la página se está mostrando
  // (lo normal en una página visible, antes de `load`): como siempre, sin
  // esperar a la entrada de LCP (los observadores avisan un poco después).
  const yaPinto = () =>
    conPaint &&
    performance
      .getEntriesByType("paint")
      .some((e) => e.name === "first-contentful-paint");
  let vivo = true;
  let cargo = !conLoad || document.readyState === "complete";
  let listo =
    (!conLcp && !conPaint) ||
    (cargo && yaPinto()) ||
    (esperarHero && intencion);
  let respaldo = 0;
  const observadores: PerformanceObserver[] = [];
  const terminar = () => {
    vivo = false;
    observadores.forEach((o) => o.disconnect());
    window.clearTimeout(respaldo);
    window.removeEventListener("load", alCargar);
    alIntentar.delete(marcarListo);
  };
  const intentar = () => {
    if (!vivo || !cargo || !listo) return;
    terminar();
    fn();
  };
  function marcarListo() {
    listo = true;
    intentar();
  }
  function alCargar() {
    cargo = true;
    if (yaPinto()) listo = true;
    intentar();
  }
  const observar = (
    tipo: string,
    alVer: (entradas: PerformanceEntryList) => void,
  ) => {
    const o = new PerformanceObserver((lista) => alVer(lista.getEntries()));
    o.observe({ type: tipo, buffered: true });
    observadores.push(o);
  };
  if (!listo && conLcp) {
    // LCP de una imagen del hero (`url`, adentro de #inicio): ya se ve.
    observar("largest-contentful-paint", (entradas) => {
      const delHero = entradas.some((e) => {
        const lcp = e as LargestContentfulPaint;
        return Boolean(lcp.url && lcp.element?.closest("#inicio"));
      });
      if (delHero) marcarListo();
    });
  }
  if (!listo && conPaint) {
    observar("paint", () => {
      if (!conLcp) marcarListo();
      else if (!respaldo) {
        respaldo = window.setTimeout(marcarListo, RESPALDO_MS);
      }
    });
  }
  // La persona ya usa la página: la está viendo (solo para lo del hero).
  if (!listo && esperarHero) alIntentar.add(marcarListo);
  if (!cargo) window.addEventListener("load", alCargar, { once: true });
  intentar();
  return terminar;
}

/**
 * Corre `fn` después del evento load Y de que el hero se pintó (o ya, si las
 * dos cosas pasaron). Para la secuencia del hero (HeroSecuencia). Devuelve la
 * cancelación.
 */
export function despuesDeLoad(fn: () => void): () => void {
  return cuandoSePinte(fn, true);
}

/**
 * Corre `fn` cuando el hero ya se pintó (o ya, si pasó), sin esperar a
 * `load`. Para lo que se pide al hidratar y no hace falta para ver el hero:
 * los chunks de la decoración (Decoracion) y el cuadro 0 del motor del hero.
 * Devuelve la cancelación.
 */
export function despuesDelPintado(fn: () => void): () => void {
  return cuandoSePinte(fn, false);
}

/**
 * Corre `fn` después del evento load Y de la primera pintura con contenido
 * (o ya, si las dos cosas pasaron), sin esperar a la imagen del hero. Para
 * Clarity: en una página visible la primera pintura llega antes que `load`,
 * así que es exactamente lo de antes (lazyOnload). Devuelve la cancelación.
 */
export function despuesDeLoadYPintura(fn: () => void): () => void {
  return cuandoSePinte(fn, true, false);
}
