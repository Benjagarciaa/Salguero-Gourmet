@AGENTS.md

# Salguero Gourmet · Landing (manual de trabajo)

Este archivo es la fuente de reglas del proyecto. Se deriva del PROMPT MAESTRO v3.1.
`AGENTS.md` (importado arriba) trae la advertencia de Next 16: **antes de escribir código
Next, leer la guía correspondiente en `node_modules/next/dist/docs/`.**

---

## 1. Qué estamos construyendo

Landing de una sola página para **Salguero Gourmet** (catering y pastelería, Córdoba
capital, +15 años). Un único objetivo de conversión: **pedir presupuesto por WhatsApp**.
Solo delivery dentro del anillo de Circunvalación. No hay retiro.

## 2. Fuente de verdad (orden de prioridad ante conflicto)

1. **`_assets/mockup-salguero-v4.html`** manda en **layout, secciones, copy, paleta y
   comportamiento**. Ya está aprobado por el cliente. No rediseñar, no "mejorar" el layout
   por iniciativa propia. El sitio final es *el mockup elevado*: mismas decisiones, mejor
   ejecución.
2. **Las fotos de `_assets/fotos/`** mandan sobre las imágenes del mockup. Cada archivo ya
   está nombrado por su destino y reemplaza al frame de video equivalente. Ver
   `_assets/fotos/SELECCION.md` para saber qué foto va en cada lugar y por qué.
3. **Este proyecto (CLAUDE.md + PROMPT MAESTRO)** manda en **stack, calidad y en lo que el
   mockup no puede mostrar**: video real en el hero, smooth scroll, `lib/wa.ts`, SEO,
   performance, accesibilidad.

**Ante cualquier conflicto entre estas fuentes, preguntar antes de decidir.**

## 3. Decisiones cerradas del cliente (no revisar, no "mejorar")

1. **Logo:** el wordmark con cuchara `SALGUERO 🥄 GOURMET` (cuchara SVG amarilla como
   separador). Es el del header/footer del mockup. NO usar sello circular, NO usar trío de
   utensilios. Favicon (`app/icon.svg`): la cuchara sola en `#E9BC4F` sobre `#241C15`.
   SVG exacto de la cuchara:
   `<svg viewBox="0 0 34 180"><g fill="#E9BC4F"><ellipse cx="17" cy="27" rx="17" ry="27"/><rect x="12.25" y="48" width="9.5" height="132" rx="4.75"/></g></svg>`
2. **Sin sticky bar inferior en mobile.** El nav sticky superior con la pill de presupuesto
   alcanza.
3. **Reseñas etiquetadas por servicio contratado**, jamás por fecha.
4. **Paleta y jerarquía del mockup, sin agregar colores.**

## 4. Paleta y tipografía (LOCK, igual al mockup)

Ver `DESIGN.md` para el detalle. Resumen:

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#241C15` | Fondo global |
| `--surface` | `#30261D` | Placas, inputs, bandas |
| `--crema` | `#F5EEE0` | Texto principal |
| `--crema-dim` | `#B5A691` | Texto de apoyo |
| `--amarillo` | `#E9BC4F` | Único croma: CTA, énfasis, logo |
| `--hairline` | `rgba(245,238,224,.14)` | Bordes 1px |

**Regla de dosis:** si todo es amarillo, nada es amarillo. Amarillo pleno solo en CTA, una
palabra por titular y el logo.

Fuentes por `next/font/google`: **Playfair Display** (display; itálica solo para la palabra
destacada), **DM Sans** (texto y UI), **JetBrains Mono** (solo etiquetas: 11px, uppercase,
tracking `+0.14em`). CTA: pill (radio 999px) amarilla con texto `#241C15`.

## 5. Reglas de trabajo (innegociables)

1. **Fases con gate.** Al cerrar cada fase: `npm run build` + `npx tsc --noEmit`. Si falla,
   arreglar antes de mostrar. Resumen corto + commit (`fase-N: descripción`) + esperar OK
   explícito del usuario antes de avanzar de fase.
2. **Archivos completos**, nunca fragmentos. No tocar archivos que no se pidieron.
3. **Cero datos inventados.** Lo no confirmado va como `[[PLACEHOLDER]]` en
   `content/data.ts` y se registra en `PENDIENTES.md`.
4. **Todo el copy vive en `content/data.ts`**, tipado. El copy del mockup es el aprobado:
   transcribirlo, no reescribirlo. Español argentino, **voseo, sin guion largo (—) ni medio
   (–)**.
5. **Animación fail-open (regla aprendida en este proyecto, innegociable):** ningún
   elemento arranca oculto en CSS estático. El contenido es visible por defecto; `motion`
   anima por encima con `whileInView` una sola vez, ease `[0.16, 1, 0.3, 1]`. Solo
   `transform` y `opacity`. `useReducedMotion()` en todo componente animado. Sin listeners
   de scroll manuales.
6. **Verificación visual:** revisar cada sección a 390px y 1440px antes del checkpoint y
   comparar contra el mockup. Si no hay browser/Playwright, pedir captura.
7. **Antes de escribir código Next, leer `node_modules/next/dist/docs/`** (Next 16 tiene
   breaking changes respecto al conocimiento previo).

## 6. Stack

Next.js 16 (app router, sin `src/`) + TypeScript + Tailwind v4 (`@theme` en CSS) +
`motion` + `lenis` + `lucide-react`. Sin GSAP, sin backend. Deploy: Vercel. Imágenes con
`next/image` y `sizes` explícito.

## 7. Lo que el sitio real suma sobre el mockup

1. **Hero con video:** `salguero_navidad.mp4` en loop (`muted loop playsinline autoPlay`),
   `poster` = frame del video, mismo marco 4:5 del mockup. Con `prefers-reduced-motion`:
   solo el poster. El video carga lazy; **el poster es el LCP con `priority`.**
2. **Lenis smooth scroll** global (excepto reduced-motion).
3. **Preselección + `lib/wa.ts`:** los links "Cotizar X" preseleccionan el `select` Y el
   servicio viaja en el mensaje de WhatsApp. `wa.ts` arma saludo, nombre, contacto,
   servicio, fecha, personas, descripción y cierre, luego
   `https://wa.me/5493512300715?text=` + `encodeURIComponent`, abierto con
   `window.open(url, "_blank", "noopener")`. Validación inline en español al blur y al
   submit; labels siempre visibles.
4. **Contadores** de la tira de confianza (33 reseñas, 15 años), pero inicializados en el
   valor final para SSR (el HTML servido muestra los números reales).
5. **Micro-mejoras permitidas** (sin cambiar layout): transiciones más finas, hover states,
   marquee de galería con `translate3d` pausable, acordeón FAQ con animación de altura.

## 8. Secciones (9 + footer, en este orden)

1. Hero (video + tira de confianza) · 2. Servicios (4 placas, cada una con su foto
`servicios-*.jpg`) · 3. Galería (marquee doble con `galeria-01..08`, cada foto con su
etiqueta) · 4. La cocina de Flor (`flor-trabajando.jpg` recortada cerrada; confirmar
identidad) · 5. Reseñas (5.0 · 33 · las 4 del mockup por servicio) · 6. Cómo trabajamos
(4 pasos; paso 4 = delivery, sin retiro) · 7. Banda empresas (eventual, no recurrente) ·
8. FAQ (6 preguntas; envíos = anillo de Circunvalación) · 9. Cotizador (form + WhatsApp,
email e Instagram directos) · Footer.

## 9. Performance y accesibilidad

LCP = poster del hero < 150KB con `priority`. Cero layout shift (dimensiones explícitas).
Fuentes `display: swap`. Foco visible amarillo. Contraste AA. Objetivo Lighthouse mobile
90+ en las cuatro métricas (correr y reportar en FASE 5).

## 10. Estructura de carpetas

```
app/                      # Next app router (layout, page, icon.svg, opengraph, sitemap, robots)
components/
  chrome/                 # nav, footer, smooth-scroll provider
  sections/               # una por sección de la landing
  ui/                     # primitivas: Section, SectionHead, Etiqueta, Pill, Placa, Field, Reveal, Wordmark
content/data.ts           # TODO el copy, tipado
lib/                      # wa.ts y utilidades
public/media/             # fotos e (en FASE 2) videos comprimidos + posters
_assets/                  # material original del cliente (referencia; videos crudos gitignored)
```

## 11. Fases

- **FASE 0** · Lectura + scaffold + documentos (este set). **Frenar y mostrar.**
- **FASE 1** · Base: tokens en `globals.css`, fuentes, Lenis, primitivas UI, `Wordmark`,
  `app/icon.svg`, página de muestra.
- **FASE 2** · Hero (video + poster) + Servicios (fotos + preselección).
- **FASE 3** · Galería + Flor + Reseñas.
- **FASE 4** · Proceso + Empresas + FAQ + Cotizador + Footer + `lib/wa.ts`.
- **FASE 5** · SEO + performance + a11y + pasada mobile completa.
- **FASE 6** · Entrega: build final, `PENDIENTES.md` depurado, guía de deploy.
