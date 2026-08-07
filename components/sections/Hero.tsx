import Image from "next/image";
import { Container } from "@/components/ui/Section";
import { Kicker } from "@/components/ui/Kicker";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Pill } from "@/components/ui/Pill";
import { Counter } from "@/components/ui/Counter";
import { HeroVideo } from "./HeroVideo";
import { hero } from "@/content/data";

export function Hero() {
  return (
    <header id="inicio" className="pb-[72px] pt-[60px]">
      <Container className="grid items-center gap-9 min-[860px]:grid-cols-[1.15fr_0.75fr] min-[860px]:gap-14">
        <div>
          <Kicker>{hero.kicker}</Kicker>
          <h1 className="mb-4 mt-[18px] font-display text-[clamp(2.6rem,5.6vw,4.2rem)] font-medium leading-[1.08] text-crema">
            {hero.title.pre}
            <em className="italic text-amarillo">{hero.title.em}</em>
            {hero.title.post}
          </h1>
          <p className="mb-7 max-w-[46ch] text-crema-dim">
            {hero.sub.pre}
            <strong className="font-medium text-crema">{hero.sub.strong}</strong>
            {hero.sub.post}
          </p>
          <div className="flex flex-wrap gap-3">
            <Pill href={hero.ctas.primary.href}>{hero.ctas.primary.label}</Pill>
            <Pill variant="fantasma" href={hero.ctas.ghost.href}>
              {hero.ctas.ghost.label}
            </Pill>
          </div>
          <div className="mt-[34px] flex flex-wrap gap-x-7 gap-y-3">
            {hero.trust.map((item, i) => (
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
          </div>
        </div>

        <div className="order-first w-full max-w-[400px] justify-self-center min-[860px]:order-none min-[860px]:justify-self-end">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] border border-hairline">
            <Image
              src={hero.media.poster}
              alt={hero.media.alt}
              fill
              priority
              sizes="(max-width: 860px) 90vw, 400px"
              className="object-cover"
            />
            <HeroVideo src={hero.media.video} poster={hero.media.poster} />
          </div>
        </div>
      </Container>
    </header>
  );
}
