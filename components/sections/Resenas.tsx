import { Section } from "@/components/ui/Section";
import { Kicker } from "@/components/ui/Kicker";
import { Pill } from "@/components/ui/Pill";
import { resenas, isPlaceholder } from "@/content/data";

export function Resenas() {
  const showProfile = !isPlaceholder(resenas.profileUrl);
  return (
    <Section id="resenas" flush>
      <Kicker>{resenas.kicker}</Kicker>
      <div className="mb-9 mt-4 flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-baseline gap-4">
          <b className="font-display text-[4rem] font-medium leading-none text-crema">
            {resenas.rating.toFixed(1)}
          </b>
          <div>
            <div
              className="text-[19px] tracking-[3px] text-amarillo"
              aria-hidden
            >
              {"★".repeat(resenas.stars)}
            </div>
            <small className="mt-1 block text-[14px] text-crema-dim">
              {resenas.reviewCount} {resenas.ratingCaption}
            </small>
          </div>
        </div>
        {showProfile ? (
          <Pill
            variant="fantasma"
            href={resenas.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {resenas.profileCta}
          </Pill>
        ) : null}
      </div>
      <div className="grid gap-4 min-[760px]:grid-cols-2">
        {resenas.items.map((r, i) => (
          <figure
            key={i}
            className="flex flex-col gap-[14px] rounded-lg border border-hairline bg-surface p-6"
          >
            <blockquote className="flex-1 text-[15.5px] leading-[1.6] text-crema">
              {r.quote}
            </blockquote>
            <figcaption className="flex items-center justify-between gap-[10px]">
              <b className="text-[14px] font-bold text-crema">{r.author}</b>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-crema-dim">
                {r.servicio}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
