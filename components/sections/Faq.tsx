import { Section } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/ui/Reveal";
import { faq } from "@/content/data";

export function Faq() {
  return (
    <Section id="faq">
      <SectionHead kicker={faq.head.kicker} title={faq.head.title} />
      <div className="max-w-[760px]">
        {faq.items.map((item, i) => (
          <Reveal key={i} delay={i * 0.05} y={14} duration={0.6}>
            <details className="faq-acc group border-b border-hairline">
              <summary className="group/sum flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16.5px] font-medium text-crema [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="font-display text-[24px] leading-none text-amarillo transition-transform duration-200 group-open:rotate-45 group-hover/sum:scale-110"
                >
                  +
                </span>
              </summary>
              <p className="max-w-[60ch] pb-5 text-[15.5px] text-crema-dim">
                {item.a}
              </p>
            </details>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
