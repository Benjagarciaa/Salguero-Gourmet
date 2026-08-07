import { Section } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { Wordmark } from "@/components/ui/Wordmark";
import { Kicker } from "@/components/ui/Kicker";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Pill } from "@/components/ui/Pill";
import { Placa } from "@/components/ui/Placa";
import { Field, Select, TextArea } from "@/components/ui/Field";
import { Reveal } from "@/components/ui/Reveal";
import { cotizador } from "@/content/data";

/**
 * Página de MUESTRA de FASE 1: control interno de tokens, tipografías y
 * primitivas contra el mockup. Se reemplaza por el sitio real desde FASE 2.
 */
export default function Page() {
  return (
    <main>
      {/* Barra de muestra: valida el Wordmark y la pill del nav. */}
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between px-6 py-[14px]">
          <Wordmark />
          <Pill href="#cotizar" className="px-5 py-[10px] text-[14px]">
            Pedir presupuesto
          </Pill>
        </div>
      </header>

      <Section>
        <SectionHead
          kicker="Muestra · FASE 1"
          title={{ pre: "Primitivas y ", em: "tokens", post: " en su lugar" }}
          description="Página de control interna: verifica paleta, tipografías (Playfair, DM Sans, JetBrains Mono) y componentes base contra el mockup aprobado."
        />
        <div className="flex flex-wrap gap-4">
          <Pill href="#">CTA primaria</Pill>
          <Pill variant="fantasma" href="#">
            CTA fantasma
          </Pill>
        </div>
        <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
          <Etiqueta>5.0 en Google · 33 reseñas</Etiqueta>
          <Etiqueta>+15 años de trayectoria</Etiqueta>
          <Etiqueta>Córdoba capital</Etiqueta>
        </div>
      </Section>

      <Section flush>
        <Kicker>Placas</Kicker>
        <div className="mt-6 grid gap-[18px] sm:grid-cols-2">
          {["Catering para eventos", "Boxes corporativos"].map((titulo, i) => (
            <Reveal key={titulo} delay={i * 0.08}>
              <Placa interactive className="h-full p-6">
                <h3 className="font-display text-[1.45rem] font-medium text-crema">
                  {titulo}
                </h3>
                <p className="mt-2 text-[15px] text-crema-dim">
                  Placa interactiva: en hover sube 4px y el borde se tiñe de
                  amarillo. La imagen va aparte en las secciones reales.
                </p>
                <span className="mt-4 inline-block">
                  <Etiqueta>Ejemplo</Etiqueta>
                </span>
              </Placa>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section flush>
        <SectionHead
          kicker="Formulario"
          title={{ pre: "Campos del ", em: "cotizador" }}
        />
        <form className="max-w-[560px]">
          <div className="grid gap-x-[14px] sm:grid-cols-2">
            <Field label="Nombre" required placeholder="Tu nombre" />
            <Field
              label="WhatsApp o email"
              required
              placeholder="Para responderte"
            />
          </div>
          <Select
            label="Tipo de servicio"
            required
            options={cotizador.form.servicioOptions}
          />
          <TextArea
            label="Contanos qué estás organizando"
            required
            placeholder="Tipo de evento, horario, qué te imaginás para la mesa..."
          />
          <Pill type="button">Enviar por WhatsApp</Pill>
        </form>
      </Section>
    </main>
  );
}
