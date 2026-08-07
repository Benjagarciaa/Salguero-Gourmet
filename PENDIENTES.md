# PENDIENTES · Salguero Gourmet

Registro vivo de lo que falta confirmar y de las notas técnicas del proyecto.
Cada dato no confirmado vive como `[[PLACEHOLDER]]` en `content/data.ts`.

---

## A · Datos a confirmar con el cliente

Estos ocho son los pendientes conocidos del brief. Al confirmarse, se cargan en
`content/data.ts` (en `politicas`, `contacto`, `flor` o `resenas` según corresponda) y se
tacha la línea acá.

| # | Pendiente | Dónde vive en el código | Estado |
|---|---|---|---|
| 1 | **Anticipación mínima** para reservar | `politicas.anticipacionMinima` + FAQ #2 | `[[ANTICIPACION_MINIMA]]` |
| 2 | **Seña / porcentaje** para confirmar fecha | `politicas.senaPorcentaje` + FAQ #6 | `[[SENA_PORCENTAJE]]` |
| 3 | **Medios de pago** | `politicas.mediosDePago` + FAQ #6 | `[[MEDIOS_DE_PAGO]]` |
| 4 | **Horario de atención** | `politicas.horarioAtencion` + aside cotizador | `[[HORARIO_ATENCION]]` (UI muestra "A confirmar") |
| 5 | **¿La persona de `flor-trabajando.jpg` es Flor?** | `flor.identidadConfirmada` | `false` (respaldo: `flor-alternativa.jpg`) |
| 6 | **Link público del perfil de Google** | `contacto.googleProfileUrl` / `resenas.profileUrl` | `[[LINK_PERFIL_GOOGLE]]` |
| 7 | **Confirmar que el 351 2300715 es WhatsApp** | `contacto.whatsappConfirmado` | `false` |
| 8 | **¿La reseña de Nahir es de un box de regalo?** | `resenas.items[3].servicioConfirmado` | `false` |

### Pendientes adicionales detectados en las FAQ (menores)
- **Cantidades mínimas** por servicio → `politicas.cantidadesMinimas` (FAQ #3).
- **Opciones sin TACC / veganas / vegetarianas**: detalle a confirmar (FAQ #1).
- **Vajilla / personal incluido**: a confirmar según evento (FAQ #4).
- **Costo de envío por zona**: a confirmar (FAQ #5).

---

## B · Discrepancias de copy a validar (no se toca sin OK)

- **FAQ "cantidades mínimas" menciona "viandas".** El mockup aprobado lista
  `catering, pastelería, boxes o viandas`, pero el brief del negocio aclara que Salguero
  **no hace viandas recurrentes**. Se dejó el copy aprobado verbatim y se marca acá.
  Sugerencia al confirmar: reemplazar "viandas" por "boxes corporativos" o quitarlo.
- **Captions de la galería.** El mockup tenía etiquetas atadas a frames de video; las fotos
  reales son otras. Se asignaron captions por contenido real de cada foto (según
  `SELECCION.md`) usando el vocabulario del mockup. Repasar con el cliente si conviene.

---

## C · Notas técnicas / de assets

- **Nombres de video con doble extensión.** Los originales llegaron como
  `salguero_navidad.mp4.mp4`, `salguero_caja_navidena.mp4.mp4`, `salguero_box.mp4.mp4`.
  En FASE 2 se comprimen y se guardan en `public/media/` con nombre normalizado
  (`salguero_navidad.mp4`, etc.).
- **Videos crudos fuera de git.** Los 3 `.mp4` originales (~76MB) quedan en `_assets/` solo
  como referencia y están en `.gitignore`. Al repo/deploy solo van las versiones comprimidas
  (`public/media/`, FASE 2).
- **ffmpeg no está instalado.** Necesario en FASE 2 para comprimir video (720px, sin audio,
  H.264 CRF 28, `-movflags +faststart`, objetivo < 4MB) y generar los posters JPG.
  Opciones: `winget install ffmpeg`, o continuar con posters JPG a mano y dejar la
  compresión pendiente. **Decisión del cliente/usuario requerida en FASE 2.**
- **Poster del hero (LCP).** `hero.media.poster` = `[[HERO_POSTER]]` hasta que FASE 2 genere
  el frame (`public/media/…-poster.jpg`, objetivo < 150KB con `priority`).
- **Nombres de fotos con sufijo descriptivo.** Los archivos reales son
  `galeria-01-alfajores.jpg`, `servicios-catering.jpg`, etc. (el brief los nombraba
  `galeria-01`). Las rutas en `content/data.ts` ya usan los nombres reales.
- **npm: postinstall diferido.** `unrs-resolver` (dependencia de ESLint) tiene un
  postinstall no ejecutado por la política de scripts de npm 11. Se resolverá solo si el
  gate de build/lint lo pide (`npm approve-scripts`).

---

## D · Decisiones cerradas (NO revisar, NO "mejorar")

1. **Logo:** wordmark `SALGUERO 🥄 GOURMET` con cuchara SVG amarilla. Sin sello circular,
   sin trío de utensilios. Favicon = cuchara sola.
2. **Sin sticky bar inferior en mobile.** Alcanza el nav sticky superior con su pill.
3. **Reseñas etiquetadas por servicio**, nunca por fecha.
4. **Paleta y jerarquía del mockup, sin agregar colores.**

---

## E · Estado de fases

- [x] **FASE 0** · Lectura + scaffold + documentos (este set). Mostrar y esperar OK.
- [ ] FASE 1 · Base (tokens, fuentes, Lenis, primitivas, Wordmark, icon.svg, página muestra).
- [ ] FASE 2 · Hero (video + poster) + Servicios.
- [ ] FASE 3 · Galería + Flor + Reseñas.
- [ ] FASE 4 · Proceso + Empresas + FAQ + Cotizador + Footer + `lib/wa.ts`.
- [ ] FASE 5 · SEO + performance + a11y + pasada mobile.
- [ ] FASE 6 · Entrega (build final, guía de deploy en Vercel, cómo cargar datos faltantes).
