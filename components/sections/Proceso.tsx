import { Section } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { ProcesoGrid } from "./ProcesoGrid";
import { proceso } from "@/content/data";

export function Proceso() {
  return (
    <Section flush>
      <SectionHead kicker={proceso.head.kicker} title={proceso.head.title} />
      <ProcesoGrid pasos={proceso.pasos} />
    </Section>
  );
}
