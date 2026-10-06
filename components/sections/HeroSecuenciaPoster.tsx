import { getImageProps } from "next/image";
import { heroSecuencia } from "@/content/data";
import { AHORRO_EN_LINEA, MQ_AHORRO } from "@/lib/video";
import { urlDeCuadro } from "./HeroSecuenciaMotor";

/** Mismos cortes que el escenario del hero (HeroSecuencia y globals.css). */
const MQ_MOBILE = "(max-width: 859.98px)";
/**
 * Pantallas bajas (teléfono en horizontal, ventana ancha y baja): el hero no se
 * fija y muestra el último cuadro quieto. Una por versión.
 */
const MQ_BAJO_MOBILE = "(max-width: 859.98px) and (max-height: 559.98px)";
const MQ_BAJO_DESKTOP = "(min-width: 860px) and (max-height: 599.98px)";

/**
 * Script en línea que corre mientras el navegador lee el HTML, antes de la
 * primera pintura (la guía "preventing flash before hydration" de Next 16). En
 * el cliente va como text/plain: React no lo ejecuta ni avisa por renderizar
 * un <script>; suppressHydrationWarning acepta esa diferencia de `type`. La CSP
 * del sitio permite scripts en línea (next.config.ts).
 */
function ScriptEnLinea({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Ahorro de datos, antes de la primera pintura: el hero arranca directo en su
 * versión quieta (data-hs="quieto" en el <header>, ver el bloque Quieto de
 * globals.css) y no baja la secuencia. Va como primer hijo del <header>
 * (HeroSecuencia, que lleva suppressHydrationWarning por este atributo).
 * Save-Data no tiene media query: sin este script, el hero se pintaba con la
 * escena y saltaba a la versión quieta al hidratar.
 */
export function HeroMarcaAhorro() {
  return (
    <ScriptEnLinea
      html={`try{if(${AHORRO_EN_LINEA})document.getElementById("inicio").setAttribute("data-hs","quieto")}catch(e){}`}
    />
  );
}

/**
 * Con ahorro de datos, las fuentes `data-hs-ahorro` del <picture> pasan a su
 * media query sin la condición de prefers-reduced-data (el valor del
 * atributo): el <img> elige el último cuadro, el más liviano de cada versión.
 * Lo hace el script en línea de HeroSecuenciaPoster mientras el navegador lee
 * el HTML; esta es la misma operación desde JS (HeroSecuencia la repite al
 * armar la versión quieta por si el script no corrió). Idempotente.
 */
export function posterDeAhorro(raiz: ParentNode) {
  raiz
    .querySelectorAll<HTMLSourceElement>("source[data-hs-ahorro]")
    .forEach((s) => {
      const media = s.getAttribute("data-hs-ahorro");
      if (media && s.getAttribute("media") !== media) s.media = media;
    });
}

/**
 * Imagen fija del marco, renderizada en el servidor.
 *
 * Los cuadros van TAL CUAL (unoptimized): ya son WebP livianos con alfa al
 * tamaño en que se ven (el primero pesa ~45KB en desktop y ~31KB en mobile) y
 * el optimizador los recomprimía distinto de lo que dibuja el canvas (saltaba
 * el brillo al pasar del <img> al canvas). Así el motor además adopta este
 * mismo archivo como cuadro 0.
 *
 * El <img> elige UNA sola fuente según media queries:
 *   - ahorro de datos: el ÚLTIMO cuadro, sin la versión de alta densidad en
 *     mobile (lo más liviano). Donde prefers-reduced-data existe lo elige
 *     sola; con Save-Data lo activa el script en línea de acá abajo, mientras
 *     el navegador lee el HTML (ver HeroMarcaAhorro). Ese script llega tarde
 *     para el escáner de precarga, que ya pidió con las `media` del HTML el
 *     PRIMER cuadro y la tapa (HeroTapaFija): con Save-Data se bajan además
 *     esos dos, unos 48 KB en mobile y 63 KB en desktop, que no se muestran.
 *     Es a propósito: sacarlos del escáner (que las `media` del HTML no los
 *     elijan y el script los habilite) demoraría el LCP de todos los demás;
 *     Chrome no tiene una media query de Save-Data que lo evite;
 *   - reducir movimiento, sin JS o pantalla baja: el ÚLTIMO cuadro (la versión
 *     quieta, con las fichas sobre los productos);
 *   - con JS y movimiento: el PRIMER cuadro (la caja abierta y llena; con la
 *     tapa fija encima, ver HeroTapaFija, es la caja cerrada), que es lo que
 *     se ve hasta que el canvas dibuja (y queda debajo de él);
 *   - versión mobile o desktop según el ancho.
 * Con varias fuentes posibles no se usa `preload` (Next lo desaconseja en ese
 * caso): el <img> va eager y con fetchPriority alto, y está al principio del HTML.
 */
export function HeroSecuenciaPoster() {
  const { desktop, mobile } = heroSecuencia.versiones;
  const { props: img } = getImageProps({
    src: urlDeCuadro(desktop, 0),
    alt: "",
    width: desktop.ancho,
    height: desktop.alto,
    unoptimized: true,
    loading: "eager",
  });
  const primeroMobile = urlDeCuadro(mobile, 0);
  const ultimoDesktop = urlDeCuadro(desktop, desktop.cuadros - 1);
  const ultimoMobile = urlDeCuadro(mobile, mobile.cuadros - 1);
  // Imagen fija en mobile: en pantallas de alta densidad, el último cuadro de
  // desktop (mismo encuadre, más píxeles), así productos y sticker no se ven
  // blandos. La secuencia sigue en la versión liviana (memoria).
  const ultimoMobileDensidad = `${ultimoMobile} 1x, ${ultimoDesktop} 2x`;

  return (
    <>
      <picture className="hs-poster">
        {/* Ahorro de datos: el script de abajo les cambia `media`. */}
        <source
          media={`${MQ_AHORRO} and ${MQ_MOBILE}`}
          srcSet={ultimoMobile}
          data-hs-ahorro={MQ_MOBILE}
          suppressHydrationWarning
        />
        <source
          media={MQ_AHORRO}
          srcSet={ultimoDesktop}
          data-hs-ahorro="all"
          suppressHydrationWarning
        />
        <source
          media={`(prefers-reduced-motion: reduce) and ${MQ_MOBILE}`}
          srcSet={ultimoMobileDensidad}
        />
        <source
          media="(prefers-reduced-motion: reduce)"
          srcSet={ultimoDesktop}
        />
        <source
          media={`(scripting: none) and ${MQ_MOBILE}`}
          srcSet={ultimoMobileDensidad}
        />
        <source media="(scripting: none)" srcSet={ultimoDesktop} />
        <source media={MQ_BAJO_MOBILE} srcSet={ultimoMobileDensidad} />
        <source media={MQ_BAJO_DESKTOP} srcSet={ultimoDesktop} />
        <source media={MQ_MOBILE} srcSet={primeroMobile} />
        {/* decoding sync (getImageProps pone async): la caja entra en el
            mismo cuadro que los textos del hero. Con async, a veces se pintaba
            uno o dos cuadros después que el texto (el LCP quedaba detrás del
            JS que se evaluaba en ese hueco). Es un WebP chico: decodificarlo
            con la pintura no se nota. Lo mismo la tapa (HeroTapaFija). */}
        <img
          {...img}
          decoding="sync"
          fetchPriority="high"
          alt=""
          draggable={false}
        />
      </picture>
      {/* Justo después del <picture> y no adentro: un <script> entre las
          fuentes desarmaba el <picture> para el escáner de precarga de Chrome,
          que bajaba además el primer cuadro de desktop en celulares (46 KB de
          más para todos). Cambiar `media` acá hace que el <img> vuelva a
          elegir. Solo si HeroMarcaAhorro marcó el ahorro de datos. */}
      <ScriptEnLinea html='try{var h=document.getElementById("inicio");if(h&&h.getAttribute("data-hs")==="quieto")h.querySelectorAll("source[data-hs-ahorro]").forEach(function(s){s.media=s.getAttribute("data-hs-ahorro")})}catch(e){}' />
    </>
  );
}

/**
 * La tapa sobre el primer cuadro (juntos = la caja cerrada), renderizada en el
 * servidor: la primera pintura ya muestra la caja cerrada. Cuando el lienzo de
 * la tapa dibuja (HeroSecuenciaTapa) la reemplaza; en la versión quieta (último
 * cuadro) no se muestra (globals.css). Tal cual (unoptimized): es un WebP con
 * alfa de ~16KB y el lienzo adopta este mismo archivo. Va eager aunque haya
 * ahorro de datos: el escáner de precarga la pide antes de que el script en
 * línea marque la versión quieta (ver HeroSecuenciaPoster).
 */
export function HeroTapaFija() {
  const { imagen, ancho, alto, rect } = heroSecuencia.tapa;
  const { props } = getImageProps({
    src: imagen,
    alt: "",
    width: ancho,
    height: alto,
    unoptimized: true,
    loading: "eager",
  });
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ya es un WebP chico y el lienzo lo adopta tal cual
    <img
      {...props}
      decoding="sync"
      alt=""
      draggable={false}
      fetchPriority="high"
      className="hs-tapa-img"
      style={{
        left: `${rect.x}%`,
        top: `${rect.y}%`,
        width: `${rect.w}%`,
        height: `${rect.h}%`,
      }}
    />
  );
}
