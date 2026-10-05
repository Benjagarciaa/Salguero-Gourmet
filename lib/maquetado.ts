/**
 * Maquetado diferido de las secciones de abajo del hero (rendimiento en
 * celular, sin cambiar lo que se ve).
 *
 * El problema: la primera maquetación de la página entera (unos 1500
 * elementos, todo el texto) se hacía con las fuentes de respaldo, porque las
 * web fonts todavía no habían llegado, y en cuanto llegaban se rehacía entera
 * con las fuentes reales. En un celular de gama media (CPU x4 de Lighthouse)
 * eran ~1.2 s + ~0.4 s de trabajo antes del primer pintado: el hero tardaba
 * 2.6 s en aparecer.
 *
 * Qué hace:
 * - globals.css (bloque "Maquetado diferido") pone `content-visibility: auto`
 *   a todo lo que va debajo del hero (los hijos de <main> salvo el primero y
 *   el pie), solo con JS (`@media (scripting: enabled)`). El navegador maqueta
 *   y pinta el hero sin recorrer el resto: el primer pintado sale enseguida.
 *   Sin JS no aplica: el HTML del servidor queda como siempre (fail-open).
 * - Este script en línea (al final del <body>, layout.tsx), cuando el hero
 *   ya tiene sus fuentes (las cuatro caras aparecen en el hero y están
 *   precargadas), suelta las secciones de a UNA por tarea: cada una se
 *   maqueta una sola vez, ya con las fuentes reales, en tareas cortas en vez
 *   de un bloque largo. Lo hace con una hoja de estilos adoptada
 *   (document.adoptedStyleSheets), sin tocar atributos que maneja React (sin
 *   avisos de hidratación).
 * - Antes de que GSAP mida nada (lib/gsap.ts, al evaluarse el módulo),
 *   completarMaquetado() suelta lo que falte en el acto: las escenas siempre
 *   miden la página entera, igual que antes.
 *
 * Mientras una sección está diferida, el navegador igual la maqueta y la
 * pinta si se acerca a la pantalla (eso es `content-visibility: auto`): si
 * alguien scrollea antes de que termine, ve todo igual. Lo único distinto
 * es el alto provisorio (contain-intrinsic-size) de lo que todavía no se
 * maquetó, siempre fuera de la vista, por uno o dos segundos.
 */

/** Lo que globals.css difiere. Tiene que coincidir con el selector de allá. */
const DIFERIDAS = "main>:not(:first-child),body>footer";

/** Lo que deja el script en `window` para que el resto lo complete. */
type EstadoMaquetado = { listo: boolean; completar: () => void };
type VentanaConMaquetado = Window & { __salgueroMaquetado?: EstadoMaquetado };

/**
 * Script en línea (ES5, sin dependencias). Se ejecuta una sola vez, al final
 * del HTML: espera el primer cuadro (el hero ya pidió sus fuentes) y que las
 * fuentes estén listas, con un tope de 3 s, y suelta las secciones de a una
 * (cada una en su tarea, maquetada en el acto). Sin hojas adoptadas usa un
 * <style> en el <head>. Si el navegador no tiene content-visibility o la
 * media query `scripting`, el CSS no difirió nada y no hace nada.
 */
export const SCRIPT_MAQUETADO = `(function(){var d=document,w=window;if(w.__salgueroMaquetado)return;var S=${JSON.stringify(
  DIFERIDAS,
)},V="{content-visibility:visible!important}",h=null,s=null,r="",e={listo:!1,completar:c};w.__salgueroMaquetado=e;function p(t){try{if(!h){h=new CSSStyleSheet();d.adoptedStyleSheets=d.adoptedStyleSheets.concat(h)}h.replaceSync(t)}catch(x){if(!s){s=d.createElement("style");d.head.appendChild(s)}s.textContent=t}}function c(){if(e.listo)return;e.listo=!0;p(S+V)}if(!w.CSS||!CSS.supports("content-visibility","auto")||!w.matchMedia("(scripting: enabled)").matches){e.listo=!0;return}function u(l,k){if(e.listo)return;if(k>=l.length){c();return}r+=l[k]+V;p(r);void d.body.offsetHeight;setTimeout(function(){u(l,k+1)},0)}function a(){if(e.listo)return;var m=d.querySelector("main"),l=[],i;if(m)for(i=2;i<=m.children.length;i++)l.push("main>:nth-child("+i+")");l.push("body>footer");u(l,0)}function q(){var y=!1,g=function(){if(!y){y=!0;setTimeout(a,0)}};setTimeout(g,3e3);requestAnimationFrame(function(){var f=d.fonts;f&&f.ready?f.ready.then(g,g):g()})}d.readyState==="loading"?d.addEventListener("DOMContentLoaded",q):q()})();`;

/**
 * Suelta en el acto las secciones que el script todavía no soltó (una sola
 * maquetación). Idempotente. Si el script en línea no corrió, lo hace igual
 * con su propia hoja adoptada (por si el CSS las difirió). Solo en el cliente.
 */
export function completarMaquetado(): void {
  const w = window as VentanaConMaquetado;
  if (w.__salgueroMaquetado) {
    w.__salgueroMaquetado.completar();
    return;
  }
  const estado: EstadoMaquetado = { listo: true, completar: () => {} };
  w.__salgueroMaquetado = estado;
  if (!window.CSS || !CSS.supports("content-visibility", "auto")) return;
  const reglas = `${DIFERIDAS}{content-visibility:visible!important}`;
  try {
    const hoja = new CSSStyleSheet();
    hoja.replaceSync(reglas);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, hoja];
  } catch {
    // Sin hojas adoptadas: un <style> al final del <head>.
    const estilo = document.createElement("style");
    estilo.textContent = reglas;
    document.head.appendChild(estilo);
  }
}
