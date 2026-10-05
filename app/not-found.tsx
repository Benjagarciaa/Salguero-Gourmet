import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { Kicker } from "@/components/ui/Kicker";
import { Pill } from "@/components/ui/Pill";
import { noEncontrada } from "@/content/data";

/**
 * 404 en español (cualquier URL que no existe). Va dentro del layout, con el
 * nav y el pie. Quieta: sin animaciones. La palabra destacada queda en ámbar
 * sólido (title-em sin el barrido de brillo). El copy vive en content/data.ts
 * (`noEncontrada`). Next le agrega noindex por responder 404.
 */
export const metadata: Metadata = {
  title: noEncontrada.metaTitulo,
};

export default function NotFound() {
  const { kicker, titulo, texto, boton } = noEncontrada;
  return (
    <main>
      <Section className="flex min-h-[70svh] items-center">
        <Kicker>{kicker}</Kicker>
        <h1 className="mt-[14px] font-display text-[clamp(2.1rem,5vw,3.2rem)] font-medium leading-[1.12] text-crema">
          {titulo.pre}
          <em className="title-em italic">{titulo.em}</em>
          {titulo.post}
        </h1>
        <p className="mt-4 max-w-[52ch] text-crema-dim">{texto}</p>
        <div className="mt-8">
          <Pill href={boton.href}>{boton.label}</Pill>
        </div>
      </Section>
    </main>
  );
}
