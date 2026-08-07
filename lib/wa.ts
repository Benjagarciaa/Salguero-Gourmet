import { contacto } from "@/content/data";

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

/** Arma el mensaje de WhatsApp con el pedido de presupuesto. */
export function buildWhatsappMessage(f: QuoteForm): string {
  const lines: string[] = [
    "¡Hola Salguero Gourmet! Quiero pedir un presupuesto.",
    "",
    `Nombre: ${f.nombre.trim()}`,
    `Contacto: ${f.contacto.trim()}`,
    `Servicio: ${f.servicio}`,
  ];
  const fecha = formatFecha(f.fecha);
  if (fecha) lines.push(`Fecha del evento: ${fecha}`);
  if (f.personas?.trim()) lines.push(`Cantidad de personas: ${f.personas.trim()}`);
  lines.push("", f.descripcion.trim(), "", "¡Gracias!");
  return lines.join("\n");
}

/** URL de wa.me con el mensaje ya codificado. */
export function buildWhatsappUrl(f: QuoteForm): string {
  return `${contacto.whatsappHref}?text=${encodeURIComponent(buildWhatsappMessage(f))}`;
}
