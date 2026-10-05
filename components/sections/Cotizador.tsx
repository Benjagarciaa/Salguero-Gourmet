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
const ayudaEnvio = cotizador.form.ayudaEnvio;
type ReqKey = "nombre" | "contacto" | "descripcion";
const REQUIRED: ReqKey[] = ["nombre", "contacto", "descripcion"];

const MESSAGES: Record<ReqKey, string> = {
  nombre: "Contanos tu nombre.",
  contacto: "Dejanos un WhatsApp o email para responderte.",
  descripcion: "Contanos qué estás organizando.",
};

// El contacto tiene que servir para responder: un email (con @ y dominio) o un
// número de WhatsApp (al menos 8 dígitos). Así palabras sueltas como "mail" o
// "no sé" no pasan como contacto válido y se le pide al usuario que lo complete.
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const countDigits = (s: string) => (s.match(/\d/g) ?? []).length;
const CONTACTO_INVALIDO =
  "Poné un email (con @) o tu WhatsApp con el número completo.";

// Aviso silencioso al panel de gestión (crea el lead solo). TOTALMENTE
// fail-open: no se espera la respuesta ni se bloquea el flujo de WhatsApp;
// si la API no existe o falla, acá no pasa nada. "empresa" es un honeypot
// anti-bots que los humanos nunca ven (siempre viaja vacío).
function enviarLeadAlPanel(f: QuoteForm) {
  try {
    // Solo el sitio publicado avisa al panel de producción. En desarrollo va al
    // panel local (aunque se abra desde el celular en 192.168.x.x) y en una
    // vista previa de Vercel o en un `next start` local no se avisa a nadie:
    // una prueba del formulario nunca puede crear un lead real.
    const host = window.location.hostname;
    const publicado =
      host === "salguerogourmet.com" || host === "www.salguerogourmet.com";
    const url = publicado
      ? "https://admin.salguerogourmet.com/api/leads"
      : process.env.NODE_ENV !== "production"
        ? "http://localhost:3001/api/leads"
        : null;
    if (!url) return;
    void fetch(url, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: f.nombre.trim(),
        contacto: f.contacto.trim(),
        servicio: f.servicio,
        fecha: f.fecha || null,
        personas: f.personas?.trim() || null,
        descripcion: f.descripcion.trim(),
        empresa: "",
      }),
    }).catch(() => {});
  } catch {
    // Nunca romper el envío por WhatsApp por culpa del panel.
  }
}

export function Cotizador() {
  const { servicio, nonce } = useQuote();
  const [values, setValues] = useState<QuoteForm>({
    nombre: "",
    contacto: "",
    // Si al montar ya hay un servicio preseleccionado, arranca con ese (lo que
    // antes hacía el efecto en su primera corrida).
    servicio: servicio ?? cotizador.form.servicioOptions[0],
    fecha: "",
    personas: "",
    descripcion: "",
  });
  const [errors, setErrors] = useState<Partial<Record<ReqKey, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<ReqKey, boolean>>>({});

  // Preselección desde los links "Cotizar X": cada vez que cambia el pedido
  // (servicio o nonce) se setea el servicio del formulario. Se ajusta durante
  // el render (patrón de React para "estado que depende de otro estado") en vez
  // de un setState dentro de un efecto, que dispara un render en cascada.
  const [preseleccion, setPreseleccion] = useState({ servicio, nonce });
  if (preseleccion.servicio !== servicio || preseleccion.nonce !== nonce) {
    setPreseleccion({ servicio, nonce });
    if (servicio) setValues((v) => ({ ...v, servicio }));
  }

  // ...y el flash del select (DOM, fuera de React) queda en el efecto.
  useEffect(() => {
    if (!servicio) return;
    const el = document.querySelector<HTMLElement>(
      "#cotizar [data-servicio-trigger]",
    );
    if (el) {
      el.classList.remove("flash");
      void el.offsetWidth; // reflow para reiniciar la animación
      el.classList.add("flash");
    }
  }, [servicio, nonce]);

  const check = (k: ReqKey, val: string): string | undefined => {
    const v = val.trim();
    if (!v) return MESSAGES[k];
    if (k === "contacto" && !EMAIL_RE.test(v) && countDigits(v) < 8) {
      return CONTACTO_INVALIDO;
    }
    return undefined;
  };

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
      const el = document.querySelector<HTMLElement>(
        `#cotizar [name="${firstBad}"]`,
      );
      if (el) {
        // Foco sin el salto del navegador (lo dejaba justo debajo del borde
        // de arriba, tapado por el nav, o fuera de pantalla) y el campo al
        // centro. Dos cuadros después: al abrir los errores, motion mide su
        // alto y restaura el scroll con un scrollTo instantáneo, que cortaba
        // el scroll suave si ya había arrancado.
        el.focus({ preventScroll: true });
        const quieto = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            el.scrollIntoView({
              block: "center",
              behavior: quieto ? "auto" : "smooth",
            }),
          ),
        );
        // Sacudida de rechazo (mismo patrón que .flash: reflow para reiniciar).
        el.classList.remove("shake");
        void el.offsetWidth;
        el.classList.add("shake");
      }
      return;
    }
    enviarLeadAlPanel(values);
    window.open(buildWhatsappUrl(values), "_blank", "noopener");
  };

  return (
    <>
      <Section id="cotizar" flush>
        <SectionHead
          kicker={cotizador.head.kicker}
          title={cotizador.head.title}
          description={cotizador.head.intro}
        />
        <div className="grid gap-9 min-[860px]:grid-cols-[1.15fr_0.85fr] min-[860px]:gap-[52px]">
          {/* Cascada corta campo por campo (cada fila con su propio Reveal
            fail-open) que guía el ojo hacia el botón de WhatsApp. */}
          <form onSubmit={onSubmit} noValidate>
            <Reveal
              y={14}
              duration={0.6}
              className="grid gap-x-[14px] sm:grid-cols-2"
            >
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
            </Reveal>
            {/* z: la lista abierta (y el calendario, en la fila de abajo)
              pinta sobre las filas siguientes aun durante la entrada, cuando
              cada Reveal tiene su transform (contexto de apilamiento). */}
            <Reveal
              y={14}
              duration={0.6}
              delay={0.06}
              className="relative z-30"
            >
              <CustomSelect
                label={fields.servicio.label}
                required
                name="servicio"
                options={cotizador.form.servicioOptions}
                value={values.servicio}
                onChange={(v) => setField("servicio", v)}
              />
            </Reveal>
            <Reveal
              y={14}
              duration={0.6}
              delay={0.12}
              className="relative z-20 grid gap-x-[14px] sm:grid-cols-2"
            >
              <CustomDate
                label={fields.fecha.label}
                ayuda={fields.fecha.ayuda}
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
            </Reveal>
            <Reveal y={14} duration={0.6} delay={0.18}>
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
            </Reveal>
            <Reveal y={14} duration={0.6} delay={0.24}>
              <Pill type="submit">{cotizador.form.submitLabel}</Pill>
              {/* Ayuda por si el navegador no abre WhatsApp (L4). */}
              <p className="mt-3 text-[12.5px] leading-[1.45] text-crema-dim">
                {ayudaEnvio.pre}
                <a
                  href={ayudaEnvio.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap font-medium text-crema underline decoration-crema-dim/50 underline-offset-[3px] transition-colors hover:text-amarillo hover:decoration-amarillo"
                >
                  {ayudaEnvio.numero}
                </a>
              </p>
            </Reveal>
          </form>

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
    </>
  );
}
