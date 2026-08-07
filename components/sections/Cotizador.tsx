"use client";

import { useEffect, useState } from "react";
import { Section } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Pill } from "@/components/ui/Pill";
import { Field, TextArea } from "@/components/ui/Field";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CustomDate } from "@/components/ui/CustomDate";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { Reveal } from "@/components/ui/Reveal";
import { useQuote } from "@/components/chrome/QuoteContext";
import { buildWhatsappUrl, type QuoteForm } from "@/lib/wa";
import { cotizador, isPlaceholder } from "@/content/data";

const fields = cotizador.form.fields;
type ReqKey = "nombre" | "contacto" | "descripcion";
const REQUIRED: ReqKey[] = ["nombre", "contacto", "descripcion"];

const MESSAGES: Record<ReqKey, string> = {
  nombre: "Contanos tu nombre.",
  contacto: "Dejanos un WhatsApp o email para responderte.",
  descripcion: "Contanos qué estás organizando.",
};

export function Cotizador() {
  const { servicio, nonce } = useQuote();
  const [values, setValues] = useState<QuoteForm>({
    nombre: "",
    contacto: "",
    servicio: cotizador.form.servicioOptions[0],
    fecha: "",
    personas: "",
    descripcion: "",
  });
  const [errors, setErrors] = useState<Partial<Record<ReqKey, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<ReqKey, boolean>>>({});

  // Preselección desde los links "Cotizar X": setea el servicio y hace flash del select.
  useEffect(() => {
    if (!servicio) return;
    setValues((v) => ({ ...v, servicio }));
    const el = document.querySelector<HTMLElement>(
      "#cotizar [data-servicio-trigger]",
    );
    if (el) {
      el.classList.remove("flash");
      void el.offsetWidth; // reflow para reiniciar la animación
      el.classList.add("flash");
    }
  }, [servicio, nonce]);

  const check = (k: ReqKey, val: string) => (val.trim() ? undefined : MESSAGES[k]);

  const setField = (k: keyof QuoteForm, val: string) => {
    setValues((v) => ({ ...v, [k]: val }));
    if ((REQUIRED as string[]).includes(k) && touched[k as ReqKey]) {
      setErrors((e) => ({ ...e, [k]: check(k as ReqKey, val) }));
    }
  };

  const handleBlur = (k: ReqKey) => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors((e) => ({ ...e, [k]: check(k, values[k]) }));
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const next: Partial<Record<ReqKey, string>> = {};
    REQUIRED.forEach((k) => (next[k] = check(k, values[k])));
    setErrors(next);
    setTouched({ nombre: true, contacto: true, descripcion: true });
    const firstBad = REQUIRED.find((k) => next[k]);
    if (firstBad) {
      document
        .querySelector<HTMLElement>(`#cotizar [name="${firstBad}"]`)
        ?.focus();
      return;
    }
    window.open(buildWhatsappUrl(values), "_blank", "noopener");
  };

  return (
    <Section id="cotizar" flush>
      <SectionHead
        kicker={cotizador.head.kicker}
        title={cotizador.head.title}
        description={cotizador.head.intro}
      />
      <div className="grid gap-9 min-[860px]:grid-cols-[1.15fr_0.85fr] min-[860px]:gap-[52px]">
        <Reveal>
        <form onSubmit={onSubmit} noValidate>
          <div className="grid gap-x-[14px] sm:grid-cols-2">
            <Field
              label={fields.nombre.label}
              required
              name="nombre"
              autoComplete="name"
              placeholder={fields.nombre.placeholder}
              value={values.nombre}
              onChange={(e) => setField("nombre", e.target.value)}
              onBlur={() => handleBlur("nombre")}
              error={touched.nombre ? errors.nombre : undefined}
            />
            <Field
              label={fields.contacto.label}
              required
              name="contacto"
              placeholder={fields.contacto.placeholder}
              value={values.contacto}
              onChange={(e) => setField("contacto", e.target.value)}
              onBlur={() => handleBlur("contacto")}
              error={touched.contacto ? errors.contacto : undefined}
            />
          </div>
          <CustomSelect
            label={fields.servicio.label}
            required
            name="servicio"
            options={cotizador.form.servicioOptions}
            value={values.servicio}
            onChange={(v) => setField("servicio", v)}
          />
          <div className="grid gap-x-[14px] sm:grid-cols-2">
            <CustomDate
              label={fields.fecha.label}
              name="fecha"
              value={values.fecha}
              onChange={(v) => setField("fecha", v)}
            />
            <NumberStepper
              label={fields.personas.label}
              name="personas"
              min={1}
              placeholder={fields.personas.placeholder}
              value={values.personas}
              onChange={(v) => setField("personas", v)}
            />
          </div>
          <TextArea
            label={fields.descripcion.label}
            required
            name="descripcion"
            placeholder={fields.descripcion.placeholder}
            value={values.descripcion}
            onChange={(e) => setField("descripcion", e.target.value)}
            onBlur={() => handleBlur("descripcion")}
            error={touched.descripcion ? errors.descripcion : undefined}
          />
          <Pill type="submit">{cotizador.form.submitLabel}</Pill>
        </form>
        </Reveal>

        <Reveal delay={0.1} className="self-start">
        <aside className="flex flex-col gap-5 self-start rounded-lg border border-hairline bg-surface p-7 sm:p-8">
          <h3 className="font-display text-[1.3rem] font-medium text-crema">
            {cotizador.aside.title}
          </h3>
          {cotizador.aside.datos.map((d) => {
            const external = d.href?.startsWith("http");
            return (
              <div key={d.label} className="flex flex-col gap-[3px]">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-crema-dim">
                  {d.label}
                </span>
                {d.href ? (
                  <a
                    href={d.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="text-[16.5px] font-medium text-crema hover:text-amarillo"
                  >
                    {d.value}
                  </a>
                ) : (
                  <span className="text-[16.5px] font-medium text-crema-dim">
                    {isPlaceholder(d.value) ? "A confirmar" : d.value}
                  </span>
                )}
              </div>
            );
          })}
          <Etiqueta>{cotizador.aside.etiqueta}</Etiqueta>
        </aside>
        </Reveal>
      </div>
    </Section>
  );
}
