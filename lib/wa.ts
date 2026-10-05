import { contacto, cotizador } from "@/content/data";

export interface QuoteForm {
  nombre: string;
  contacto: string;
  servicio: string;
  fecha?: string;
  personas?: string;
  descripcion: string;
}

/** Pasa una fecha ISO del <input type="date"> (YYYY-MM-DD) a DD/MM/AAAA. */
function formatFecha(iso?: string): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Arma el mensaje de WhatsApp con el pedido de presupuesto. El texto (saludo,
 * nombres de los datos y cierre) vive en content/data.ts (cotizador.whatsapp).
 */
function buildWhatsappMessage(f: QuoteForm): string {
  const t = cotizador.whatsapp;
  const lines: string[] = [
    t.saludo,
    "",
    `${t.nombre}: ${f.nombre.trim()}`,
    `${t.contacto}: ${f.contacto.trim()}`,
    `${t.servicio}: ${f.servicio.trim()}`,
  ];
  const fecha = formatFecha(f.fecha);
  if (fecha) lines.push(`${t.fecha}: ${fecha}`);
  if (f.personas?.trim()) lines.push(`${t.personas}: ${f.personas.trim()}`);
  lines.push("", f.descripcion.trim(), "", t.cierre);
  return lines.join("\n");
}

/** URL de wa.me con el mensaje ya codificado. */
export function buildWhatsappUrl(f: QuoteForm): string {
  return `${contacto.whatsappHref}?text=${encodeURIComponent(buildWhatsappMessage(f))}`;
}
