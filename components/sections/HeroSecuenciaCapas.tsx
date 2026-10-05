import { Pill } from "@/components/ui/Pill";
import { heroSecuencia, textoDePlaceholder } from "@/content/data";

/* ==========================================================================
 * Capas del escenario del hero que salen de content/data.ts (heroSecuencia):
 * fichas de productos (momento 4), aviso "Scrolleá", horneado (momento 2),
 * cifras (momento 3) y cierre (momento 5). El inicio y la confianza los arma
 * Hero.tsx. Después del cierre, la caja abierta se aleja hacia Servicios
 * (salida, en HeroSecuencia).
 *
 * Todo es visible en el CSS base (fail-open). Cada capa tiene un envoltorio
 * que la ubica (globals.css) y un interior que anima GSAP (solo opacity y
 * transform); lo que aparece con el scroll lleva `.hs-diferida`: antes de
 * hidratar espera oculto, con una red de seguridad CSS que lo muestra a los 4s.
 * Fichas, aviso y cifras son decorativos (aria-hidden): los productos se
 * listan para lectores de pantalla en HeroSecuencia y las cifras repiten la
 * confianza del inicio. El horneado y el cierre son contenido.
 * ========================================================================== */

/**
 * Un texto partido en palabras para la entrada "desde abajo": cada palabra va
 * en una ventana (.hs-pal, recortada con clip-path) y adentro sube la palabra
 * (.hs-pal-in, la que mueve GSAP). Los espacios quedan como texto normal, así
 * el renglón se parte igual que sin JS y los lectores de pantalla leen la
 * frase de corrido. Sin GSAP, las palabras están en su lugar (visibles).
 */
function Palabras({ texto }: { texto: string }) {
  return texto.split(/(\s+)/).map((parte, i) => {
    if (!parte) return null;
    if (/^\s+$/.test(parte)) return " ";
    return (
      <span key={i} className="hs-pal">
        <span className="hs-pal-in">{parte}</span>
      </span>
    );
  });
}

/**
 * Una ficha por producto, dentro del marco (las posiciones son % del último
 * cuadro). Solo desktop (en mobile el CSS las oculta: los rótulos tapaban
 * productos). Las de los costados llevan línea y punto; las del centro, solo
 * el rótulo debajo del producto. Mientras un nombre sea [[placeholder]], la
 * ficha muestra el texto de ejemplo como vista previa.
 */
export function HeroFichas() {
  return (
    <div aria-hidden className="hs-fichas">
      {heroSecuencia.fichas.map((f) => (
        <div
          key={f.id}
          className="hs-ficha"
          data-lado={f.lado}
          style={
            {
              "--x": `${f.producto.x}%`,
              "--y": `${f.producto.y}%`,
              "--base": `${f.producto.base}%`,
              "--punta": `${f.producto.punta}%`,
            } as React.CSSProperties
          }
        >
          <span className="hs-ficha-linea" />
          <span className="hs-ficha-punto" />
          <span className="hs-ficha-rotulo">
            <span className="hs-ficha-texto">
              {textoDePlaceholder(f.texto)}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Aviso "Scrolleá" (solo desktop, mientras no se scrollea). */
export function HeroAviso() {
  return (
    <div aria-hidden className="hs-aviso">
      <div className="hs-aviso-in flex flex-col items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-crema-dim">
          {heroSecuencia.aviso}
        </span>
        <span className="relative h-7 w-px overflow-hidden bg-hairline">
          <span className="hs-nudge absolute inset-x-0 top-0 h-2 bg-crema" />
        </span>
      </div>
    </div>
  );
}

/**
 * Momento 2: la frase grande en Playfair, centrada debajo de la caja, con "el
 * mismo día" en la itálica amarilla (como el <em> de los títulos) y el corte
 * de renglón después de esa frase. Entra palabra por palabra con el scroll.
 */
export function HeroHorneado() {
  const { pre, em, post } = heroSecuencia.horneado.texto;
  return (
    <div className="hs-m2">
      <div className="hs-m2-in hs-diferida">
        <p className="hs-horneado font-display text-crema">
          <Palabras texto={pre} />
          <em className="hs-horneado-em italic text-amarillo">
            <Palabras texto={em} />
          </em>
          <br />
          <Palabras texto={post ?? ""} />
        </p>
      </div>
    </div>
  );
}

/**
 * Momento 3: la confianza en grande (número en Playfair, rótulo en mono). Solo
 * existe con la escena (globals.css): sin JS o en la versión quieta, los mismos
 * datos ya están en la confianza del inicio.
 */
export function HeroCifras() {
  return (
    <div aria-hidden className="hs-m3">
      <div className="hs-m3-in">
        {heroSecuencia.cifras.items.map((c) => (
          <div key={c.valor} className="hs-cifra">
            <span className="hs-cifra-valor font-display text-crema">
              {c.valor}
            </span>
            <span className="hs-cifra-texto">
              <span className="hs-cifra-largo">{c.texto}</span>
              <span className="hs-cifra-corto">{c.corto}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Momento 5: el remate del hero, centrado debajo de la caja abierta con los
 * productos quietos. El título en display grande, con "a tu oficina" en la
 * itálica amarilla (como el <em> de los títulos; sin partirse, así en mobile
 * queda "Así llega / a tu oficina."), la bajada y "Armar mi pedido" en la
 * pill amarilla primaria: el único botón amarillo del escenario en ese
 * momento. Entra palabra por palabra y después la bajada y el botón. El botón
 * va dentro de un envoltorio (lo mueve GSAP; el Pill conserva sus hovers).
 */
export function HeroCierre() {
  const { titulo, bajada, boton } = heroSecuencia.cierre;
  return (
    <div className="hs-m4">
      <div className="hs-m4-in hs-diferida">
        <p className="hs-cierre-titulo font-display font-medium text-crema">
          <Palabras texto={titulo.pre} />
          {/* La frase destacada y el punto, juntos y sin partirse (el punto
              también en su ventana: entra con la última palabra). */}
          <span className="hs-cierre-fin">
            <em className="italic text-amarillo">
              <Palabras texto={titulo.em} />
            </em>
            <Palabras texto={titulo.post ?? ""} />
          </span>
        </p>
        <p className="hs-cierre-bajada text-crema-dim">{bajada}</p>
        <div className="hs-cierre-boton">
          <Pill href={boton.href}>{boton.label}</Pill>
        </div>
      </div>
    </div>
  );
}
