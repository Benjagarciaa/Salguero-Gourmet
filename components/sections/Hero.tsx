import { Kicker } from "@/components/ui/Kicker";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Pill } from "@/components/ui/Pill";
import { Counter } from "@/components/ui/Counter";
import { TitleEm } from "@/components/ui/TitleEm";
import { HeroSecuencia } from "./HeroSecuencia";
import { hero, heroSecuencia } from "@/content/data";

/**
 * Hero "escenario": la caja como protagonista, centrada y a todo el alto, con
 * los textos por momentos alrededor (HeroSecuencia arma el <header>, el pin, el
 * marco y el resto de los momentos). Acá va el momento 1, que se renderiza en
 * el servidor y es visible sin JS: kicker, h1, bajada (larga en desktop y en la
 * versión quieta, corta arriba del marco en mobile), los dos botones y la
 * confianza con sus contadores.
 */
export function Hero() {
  const corta = heroSecuencia.inicio.bajadaCorta;

  return (
    <HeroSecuencia
      inicio={
        <>
          <Kicker className="hs-kicker">{hero.kicker}</Kicker>
          {/* El título no se parte: no interferir con el shimmer de TitleEm. */}
          <h1 className="hs-titulo font-display font-medium text-crema">
            {hero.title.pre}
            <br />
            <TitleEm>{hero.title.em}</TitleEm>
            {hero.title.post}
          </h1>
          <p className="hs-bajada text-crema-dim">
            <span className="hs-bajada-larga">
              {hero.sub.pre}
              <strong className="font-medium text-crema">
                {hero.sub.strong}
              </strong>
              {hero.sub.post}
            </span>
            <span className="hs-bajada-corta">
              {corta.pre}
              <strong className="font-medium text-crema">{corta.strong}</strong>
              {corta.post}
            </span>
          </p>
          <div className="hs-botones flex flex-wrap gap-3">
            <Pill href={hero.ctas.primary.href}>
              {hero.ctas.primary.label}
            </Pill>
            <Pill variant="fantasma" href={hero.ctas.ghost.href}>
              {hero.ctas.ghost.label}
            </Pill>
          </div>
        </>
      }
      confianza={hero.trust.map((item, i) => (
        <Etiqueta key={i}>
          {item.before}
          {item.count != null ? (
            <b className="font-bold">
              <Counter to={item.count} />
            </b>
          ) : null}
          {item.after}
        </Etiqueta>
      ))}
    />
  );
}
