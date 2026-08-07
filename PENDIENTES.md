# PENDIENTES · Salguero Gourmet

Registro vivo de lo que falta confirmar y de las notas técnicas del proyecto.
Cada dato no confirmado vive como `[[PLACEHOLDER]]` en `content/data.ts`.

---

## A · Datos del cliente — RESUELTOS (agosto 2026)

Los ocho pendientes del brief quedaron **cargados** en `content/data.ts` con los datos que
pasó el cliente.

| # | Pendiente | Dónde vive | Estado |
|---|---|---|---|
| 1 | ~~Anticipación mínima~~ | `politicas.anticipacionMinima` + FAQ #2 | ✅ Al menos 48 hs antes de la fecha del evento (+ seña del 50%) |
| 2 | ~~Seña / porcentaje~~ | `politicas.senaPorcentaje` + FAQ #6 | ✅ 50% |
| 3 | ~~Medios de pago~~ | `politicas.mediosDePago` + FAQ #6 | ✅ Efectivo, transferencia o depósito bancario |
| 4 | ~~Horario de atención~~ | `politicas.horarioAtencion` + aside cotizador | ✅ 9 a 17 hs |
| 5 | ~~¿Es Flor en la foto?~~ | `flor.identidadConfirmada` | ✅ Sí (`true`) |
| 6 | ~~Link del perfil de Google~~ | `contacto.googleProfileUrl` / `resenas.profileUrl` | ✅ https://share.google/WSgW27pZTcjI7gejG |
| 7 | ~~¿El 351 2300715 es WhatsApp?~~ | `contacto.whatsappConfirmado` | ✅ Sí (`true`) |
| 8 | ~~¿Reseña de Nahir = box de regalo?~~ | `resenas.items[3].servicioConfirmado` | ✅ Sí (`true`) |

### Pendientes adicionales de las FAQ — también RESUELTOS
- ✅ **Cantidades mínimas** → "Sin cantidades mínimas" (`politicas.cantidadesMinimas`, FAQ #3).
- ✅ **Opciones sin TACC / veganas / vegetarianas** → nos adaptamos según el servicio (FAQ #1).
- ✅ **Vajilla / personal** → se adapta a lo que necesita el cliente (FAQ #4).
- ✅ **Costo de envío por zona** → se acuerda al hacer el pedido (FAQ #5).

### Abierto (diferido por decisión del usuario)
- ⏳ **Reseña de "Javier Sauret" con etiqueta "Evento a medida"** (punto 11 del cliente).
  Decisión: por ahora se dejan las **4 reseñas actuales**; se sumará la de Javier Sauret
  ("Evento a medida") más adelante, cuando llegue el **texto** de la reseña (no se inventa
  copy de reseñas). La de Nahir ya quedó confirmada como "Box de regalo".

---

## B · Discrepancias de copy

- ✅ **"viandas" en FAQ.** RESUELTO: la respuesta de cantidades mínimas se reescribió
  ("Sin cantidades mínimas") y ya no menciona viandas.
- ⏳ **Captions de la galería.** El mockup tenía etiquetas atadas a frames de video; las fotos
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
- ✅ **ffmpeg instalado** (Gyan.FFmpeg 9.0, vía winget). Videos comprimidos a 720px de ancho,
  30fps, sin audio, H.264 CRF 28, `+faststart` en `public/media`: navidad 2.15MB (hero
  recortado 4:5), caja 1.61MB, box 1.58MB. No queda en el PATH de shells nuevos: usar la ruta
  completa del `.exe` (`%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_...\bin\ffmpeg.exe`).
- ✅ **Poster del hero (LCP)** generado: `public/media/salguero_navidad-poster.jpg` (58KB, 4:5).
- ⚠️ **Hero: video con texto quemado.** El reel `salguero_navidad` trae texto de marketing
  quemado en todo el clip. Por decisión del usuario se usa igual, con un recorte agresivo 4:5
  que saca las bandas de texto; queda un watermark tenue ("crear") que asoma ~2s. Los videos
  `caja` y `box` también tienen texto y hoy NO se usan (quedan disponibles en `public/media`).
  Para un hero impecable: conseguir un clip limpio (de los 60+ sin curar) y reemplazar.
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

- [x] **FASE 0** · Lectura + scaffold + documentos.
- [x] **FASE 1** · Base (tokens, fuentes, Lenis, primitivas, Wordmark, icon.svg, muestra).
- [x] **FASE 2** · Hero (video recortado + poster) + Servicios (fotos + preselección).
- [ ] FASE 3 · Galería + Flor + Reseñas.
- [ ] FASE 4 · Proceso + Empresas + FAQ + Cotizador + Footer + `lib/wa.ts`.
- [ ] FASE 5 · SEO + performance + a11y + pasada mobile.
- [ ] FASE 6 · Entrega (build final, guía de deploy en Vercel, cómo cargar datos faltantes).
