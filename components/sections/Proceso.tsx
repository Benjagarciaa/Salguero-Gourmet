import { Section } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { proceso } from "@/content/data";

export function Proceso() {
  return (
    <Section flush>
      <SectionHead kicker={proceso.head.kicker} title={proceso.head.title} />
      <div className="grid grid-cols-1 gap-[18px] min-[520px]:grid-cols-2 min-[860px]:grid-cols-4">
        {proceso.pasos.map((p) => (
          <div key={p.n} className="border-t border-hairline pt-[18px]">
            <b className="mb-2 block font-display text-[1.9rem] font-medium italic text-amarillo">
              {p.n}
            </b>
            <h3 className="mb-1.5 text-[16px] font-bold text-crema">{p.title}</h3>
            <p className="text-[14.5px] text-crema-dim">{p.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
