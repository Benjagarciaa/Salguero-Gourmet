import Image from "next/image";
import { Section } from "@/components/ui/Section";
import { Kicker } from "@/components/ui/Kicker";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Reveal } from "@/components/ui/Reveal";
import { TitleEm } from "@/components/ui/TitleEm";
import { flor } from "@/content/data";

export function Flor() {
  return (
    <Section flush>
      <Reveal className="grid items-center gap-8 rounded-[10px] border border-hairline bg-surface p-8 min-[760px]:grid-cols-[auto_1fr] min-[760px]:gap-11 min-[760px]:p-11">
        <div className="relative mx-auto h-[180px] w-[180px] shrink-0 overflow-hidden rounded-full border border-hairline min-[760px]:mx-0">
          <Image
            src={flor.foto.src}
            alt={flor.foto.alt}
            fill
            quality={88}
            sizes="180px"
            className="object-cover object-[30%_30%]"
          />
        </div>
        <div className="text-center min-[760px]:text-left">
          <Kicker className="justify-center min-[760px]:justify-start">
            {flor.kicker}
          </Kicker>
          <h2 className="mt-3 font-display text-[1.9rem] font-medium leading-tight text-crema">
            {flor.title.pre}
            <TitleEm>{flor.title.em}</TitleEm>
            {flor.title.post}
          </h2>
          <p className="mx-auto mt-2 max-w-[58ch] text-crema-dim min-[760px]:mx-0">
            {flor.body}
          </p>
          <div className="mt-4 inline-flex">
            <Etiqueta>{flor.etiqueta}</Etiqueta>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
