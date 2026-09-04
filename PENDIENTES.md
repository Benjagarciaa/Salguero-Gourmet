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
- ✅ **Galería y servicios renovados** con el material nuevo (agosto 2026): fotos elegidas
  por el cliente en servicios (IMG_2171/1745/1903 + box en mano) y galería con 8 gemas
  (tarta de rejilla, alfajores, oficio, bombas, mesa+vasitos, evento de noche, coffee boxes,
  flat-lay). Con captions descriptivos.
- 📸 **Los HEIC del cliente son imágenes en mosaico.** Decodificar SIEMPRE con el default de
  ffmpeg (sin `-map`), que reconstruye la grilla a full-res (~2266x4028). `-map [0:v]` toma un
  solo tile y da falsos "borrosos". Hay una biblioteca rica de fotos buenas sin usar (spreads,
  flat-lays, oficio, eventos corporativos El Norte/Coca/Samsung/FCEFyN) para futuras pasadas.

---

## C · Notas técnicas / de assets

- ✅ **Dominio definitivo: `salguerogourmet.com`** (comprado en Vercel, agosto 2026).
  En el código todo deriva de `site.url` (`content/data.ts`): canonical, metadataBase,
  OG, sitemap, robots y JSON-LD. Es el **apex** (sin www); Vercel redirige www -> apex.
  Config externa a completar (fuera del código): (1) en Vercel, asignar el dominio al
  proyecto y ponerlo como **Primary**; (2) en Google Search Console, crear una **propiedad
  de Dominio** verificada por **TXT en el DNS de Vercel** y reenviar el sitemap
  (`https://salguerogourmet.com/sitemap.xml`); (3) actualizar la URL del sitio en el perfil
  de Google Business. El `.vercel.app` sigue funcionando pero el canonical ya apunta al
  dominio real. El meta `google-site-verification` viejo (de la propiedad vercel.app) queda
  inofensivo.

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
- ✅ **Hero: montaje liviano (resuelto).** El clip único de 1.74MB castigaba Lighthouse
  mobile (94→77), así que se reemplazó por un **montaje de 2 escenas en un archivo**
  (mesa dulce + bocaditos salados, crudos `cortados-2` y `cortados-6`), crossfade de 0.5s,
  recorte 4:5, 800×1000, 6.4s, `-an -crf 30 +faststart`:
  `public/media/hero-montage.mp4` (**386KB**) + `hero-poster.jpg`
  (LCP). El video ahora también corre en mobile (solo se omite en Save-Data / 2G /
  reduced-motion). Se eliminó el `hero.mp4` viejo. Material curado en el estudio gráfico.
- ✅ **Performance mobile: TBT/LCP son de JS, no de imágenes.** Lighthouse mobile ~74:
  lo bajan TBT (751ms, peso 30%) y LCP (3.2s, peso 25%), los dos por hidratación/JS
  (CLS 0, SI 98, FCP 89). Bundle real de prod: ~197KB transfer / ~640KB decoded de JS.
  Medir SIEMPRE con `next start` (prod), no con `next dev` (dev infla el JS a ~4.7MB con
  HMR y React en modo desarrollo). Optimizaciones aplicadas: (1) Lenis se difiere a idle
  (`SmoothScroll`), (2) `ScrollProgress` se monta recién en idle (`lib/useAfterIdle.ts`),
  (3) `LazyMotion` + `m.*` en vez de `motion.*` (saca drag/layout del runtime; aporte de
  bundle chico pero baja el costo por componente), (4) el video del hero espera al evento
  `load` antes de bajar para no competir con el poster (LCP). **Resultado: 74 → 80**
  (LCP 73 → 88, TBT 40 → 47). **80 es el baseline mobile aceptado por el cliente.**
- ❌ **Lazy-hydration del Cotizador + galería (probado y REVERTIDO).** Se intentó bajar el
  TBT difiriendo el montaje de las secciones client pesadas con code-split +
  IntersectionObserver (`useNearViewport`, `CotizadorLazy`, `GaleriaLightboxLazy`).
  **Empeoró: 80 → 65.** El montaje diferido rompió el CLS (0 → 0.24, porque el swap
  placeholder→real sí shifteó en la medición de Lighthouse) y el TBT subió (646 → 823ms,
  los chunks diferidos terminan ejecutándose dentro de la ventana de medición). Revertido
  en el commit siguiente. **No reintentar por esta vía.** Si algún día se quiere más score,
  el grueso restante es `motion` (dep más pesada): habría que reducir animaciones o su
  runtime, que es un trade-off de diseño para hablar con el cliente.
- **Nombres de fotos con sufijo descriptivo.** Los archivos reales son
  `galeria-01-alfajores.jpg`, `servicios-catering.jpg`, etc. (el brief los nombraba
  `galeria-01`). Las rutas en `content/data.ts` ya usan los nombres reales.
- **Captura de leads hacia el panel (sept 2026).** El submit del cotizador ahora
  también dispara un POST fail-open a `https://admin.salguerogourmet.com/api/leads`
  (repo `D:\salguero-admin`), que crea cliente + evento "cotizado" en el panel. Si la
  API falla o no existe, el flujo de WhatsApp no se entera (fetch con `keepalive`,
  catch vacío). En dev apunta a `http://localhost:3001` (permitido en el connect-src
  de la CSP solo en development; la CSP de prod solo suma el dominio del admin).
  El subdominio `admin.salguerogourmet.com` ya está asignado y andando (verificado
  2026-09-04). **Pendiente:** confirmar con el cliente el mapeo de servicios
  landing → panel: "Pastelería por encargo" → `mesa_dulce`, "Box de regalo" y
  "Box corporativo" → `box`, "Catering para evento" → `catering`, resto → `otro`
  (tabla en `salguero-admin/app/api/leads/route.ts`).
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
- [x] **FASE 2** · Hero (clip limpio + poster) + Servicios (fotos elegidas por el cliente).
- [x] **FASE 3** · Galería (marquee con las gemas) + La cocina de Flor + Reseñas.
- [x] **FASE 4** · Proceso + Empresas + FAQ + Cotizador (WhatsApp + preselección) + Footer + Nav.
- [ ] FASE 4 · Proceso + Empresas + FAQ + Cotizador + Footer + `lib/wa.ts`.
- [ ] FASE 5 · SEO + performance + a11y + pasada mobile.
- [ ] FASE 6 · Entrega (build final, guía de deploy en Vercel, cómo cargar datos faltantes).
