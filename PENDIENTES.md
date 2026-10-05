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
- **Hero sin video (rama `dopamina`, sept 2026).** El video del hero era un montaje de
  clips que ya están en la galería, así que se retiró. Hoy el hero es la secuencia de la
  caja (`HeroSecuencia`: canvas + tapa en vivo, ver la sección F). Se borraron
  `components/sections/HeroVideo.tsx`, `components/ui/Parallax.tsx`,
  `public/media/hero-montage.mp4`, `public/media/hero-poster.jpg` y `hero.media` de
  `content/data.ts` (siguen en el historial de git; los crudos, en `_assets/`). La nota
  del "montaje liviano" de más arriba queda como historia. ✅ CLAUDE.md §2, §4, §6 y §7
  ya están actualizados (GSAP permitido, hero con la secuencia, excepción amarilla de
  Empresas).
- **Escenas anteriores del hero (historia).** `HeroCaja` (caja en SVG con recortes
  circulares) y la primera secuencia de prueba quedaron sin uso. Sus recortes se movieron
  de `public/media/caja/` a `_assets/caja-provisoria/` (con la carpeta de fuentes "nano
  banana fondo verde") y las secuencias viejas a `_assets/beta-sin-uso/` (ignorada por
  git). `HeroCaja` quedó archivado en `_assets/archivo/` (ver F.2).

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
- [ ] FASE 5 · SEO + performance + a11y + pasada mobile.
- [ ] FASE 6 · Entrega (build final, guía de deploy en Vercel, cómo cargar datos faltantes).

---

## F · Beta "dopamina" (rama `dopamina`, sept 2026)

Beta autorizada por Benjamin: GSAP + ScrollTrigger en todas las escenas, estilo Apple.
Integrada el 29/9/2026 (copy nuevo movido a `content/data.ts`, orden de ScrollTriggers
verificado, `tsc` y `eslint` limpios).

Orden de la página desde el 30/9/2026: Hero · Servicios · Empresas · Galería · La
cocina de Flor · Reseñas · Cómo trabajamos · Preguntas · Cotizador · Pie.

### F.1 · Decisiones que tiene que confirmar Benjamin
- **Cierre del hero (rehecho el 30/9/2026).** Centrado debajo de la caja abierta: "Así
  llega *a tu oficina*." grande (con "a tu oficina" en la itálica amarilla), "Armada a tu
  medida, con mozos o delivery, dentro de Circunvalación." y "Armar mi pedido" (el texto de
  F8) en la pill amarilla primaria a `#cotizar`. Confirmar: (1) mientras se ve el cierre
  también está en pantalla la pill "Pedir presupuesto" del nav, o sea dos botones amarillos
  a la vez (F8 lo evitaba con un botón fantasma); (2) para que entre el cierre, los
  productos se achican en pantallas bajas (0.86 en 1280x720, 0.79 en 375x667, hasta 0.66);
  (3) a 390 el título entra en un renglón con ~29px de margen por lado: verlo en un iPhone.
  Todo se cambia en `heroSecuencia.cierre` (`content/data.ts`).
- **Servicios:** las 4 marcas amarillas de progreso y los números "01" a "04" del mazo.
- **Cuchara de progreso con reducir movimiento:** hoy queda visible y quieta (es un
  indicador). Si la quieren oculta en ese modo, es un cambio chico en `ScrollProgress`.
- **Reseñas:** se muestran solo las 4 con servicio confirmado (Mauricio Schmid, María
  Candelaria Contreras, Maria Victoria Garcia, Franco Businello); las otras 5 ya no
  aparecen. La cantidad de reseñas ya no se muestra en ninguna parte de la página (pedido
  de Benjamin, 5/10/2026): ni en Reseñas, ni en la tira de confianza ("5.0 en Google"), ni
  en las cifras del hero ("en Google"), ni en el texto para lectores de pantalla. Solo va
  en el JSON-LD, desde `site.reviewCount` (34): actualizar ese número cuando cambie en
  Google.
- **El 5.0 de Reseñas atado al scroll (5/10/2026):** el número va de 0.0 a 5.0 y las
  estrellas se llenan de a una con el scroll (scrub, tramo `TRAMO`), en las dos
  direcciones: bajando sube y se llenan, subiendo baja y se vacían. Al acercarse, antes
  del pin, se ve 0.0 con las estrellas vacías (el número nunca se oculta). Sin JS y con
  reducir movimiento, 5.0 quieto con las cinco llenas. Con la línea de la cantidad se fue
  también el "en Google" que estaba al lado del 5.0: la fuente queda en "Ver perfil de
  Google". Confirmar con Benjamin que no lo extraña.
- **Galería:** el visor ahora usa `destacadas` + "Mesa dulce" al final (18 ítems), para que
  cada foto del carril abra la suya.
- **Excepción a "nada oculto en CSS" (CLAUDE.md §5.5) en el hero:** antes de hidratar, con
  JS y movimiento, algunas capas arrancan ocultas y una red CSS (`.hs-diferida`,
  `hs-failsafe` en `globals.css`) las muestra a los 4s si el JS no llega. Decidir si queda
  y, si queda, anotarla en §5.5.
- **CLAUDE.md §5.5 y la física de la beta:** §5.5 todavía pide la ease
  `[0.16, 1, 0.3, 1]`, pero la beta la reemplazó por `lib/fisica.ts`. Texto propuesto: "En
  la beta 'dopamina' la curva fija [0.16,1,0.3,1] se reemplazó por la física de
  lib/fisica.ts (resortes de motion por stiffness/damping/mass, resorteGsap en GSAP y
  ease-resorte en CSS)." Falta el OK de Benjamin para editar CLAUDE.md.
- **Error de los campos del cotizador:** abre y cierra su alto (`height` y `marginTop`
  con el resorte `panel`, `components/ui/Field.tsx`). §5.5 pide solo transform y opacity y
  §7.5 exceptúa solo el FAQ: sumarlo a la excepción, o reservar el renglón del error y
  animar solo opacidad e `y` (cambia el alto del formulario en reposo). Mientras tanto, al
  terminar de abrir o cerrar se pide un `ScrollTrigger.refresh(true)` (como el FAQ).
- **Halo y compresión de la secuencia del hero (`caja-v6`, 30/9/2026):** el hero pasó de
  `caja-v5` a `caja-v6`, regenerada desde `caja-v4` (la fuente, con el vaso corregido en
  162 a 172; hoy en `_assets/archivo/media/secuencia/`). Lleva el borde semitransparente
  de cada producto a sombra oscura en TODOS los cuadros (en `caja-v5` el halo oliva
  seguía en el reposo, 150 a 172), con el alfa idéntico, y va en WebP q80 (q82 a q88
  donde hace falta para quedar a 40 dB o más): 10% menos de peso. Falta el OK de Benjamin
  viendo la comparación lado a lado. Si no la aprueba, volver `carpeta`, `tapa.imagen` y
  `tapa.desenfocada` de `heroSecuencia` a `caja-v5` (archivada en
  `_assets/archivo/media/secuencia/caja-v5/`, hay que devolverla a `public/`).
- **Hero en desktop de 1200px o más:** las columnas (inicio, cifras, cierre y confianza) se
  miden desde el borde de la ventana: el título arranca en x=43 a 1440 y en 168 a 1920,
  mientras el logo y todas las secciones arrancan en 164 y 404. Alinearlas al contenedor de
  1112px (`--hs-ancho: min(100vw, calc(1112px + 2 * var(--hs-pad)))`) achica la caja 13% a
  1880 y 24% a 1920 (el marco también se mide con ese ancho), baja el título del cierre a
  su mínimo (25.6px) y a 1920 el título del inicio se parte en tres renglones. Es una
  decisión de diseño: captura antes/después en `pulir/fix-r2/z-alinear-sin-vs-con.jpg`.
- **Bocaditos en Servicios mobile:** el mapa le da densidad alta, pero en 375 y 390 las
  cartas opacas del mazo tapan casi todas las piezas (solo asoman manchas en los bordes).
  Si Benjamin lo quiere más cargado: priorizar ahí nítidas que asomen del borde y ubicar
  las desenfocadas sobre "Nuestras formas de servirte" y entre cartas.
- **Leads fuera de dev (`Cotizador.tsx`):** el destino se decide por `NODE_ENV` y no por el
  dominio: un preview de Vercel de esta rama, o `next start` abierto por IP desde el
  celular, mandaría leads reales al panel. Propuesta (toca el ruteo de leads, por eso
  espera su OK): producción solo si el hostname termina en `salguerogourmet.com`, y si no,
  `localhost:3001`. No cambia `lib/wa.ts` ni el envío por WhatsApp.
- **Empresas después de Servicios (pedido de Benjamin, 30/9/2026, "veamos cómo
  queda"):** cambian las costuras Servicios→Empresas, Empresas→Galería y Cómo
  trabajamos→Preguntas. El menú de arriba no suma link a Empresas (el mockup aprobado no
  lo tiene); si lo quiere, es una línea en `nav.links` de `content/data.ts`. Confirmar el
  orden y el aire entre esas secciones con las capturas.
- **Cuchara como separador en Empresas:** entre las palabras gigantes va la cuchara del
  logo (el mismo dibujo del wordmark), meciéndose con su fila. Confirmar que le gusta ahí.
- **Empresas, dos palabras por fila (QA 30/9/2026, al día el 4/10/2026):** con tres por
  fila, a la velocidad aprobada del cruce, cuatro de las seis palabras no llegaban a verse.
  Hoy arriba va "Coffee breaks · Desayunos" y abajo "Mesas gourmet · Agasajos"
  (`empresas.palabras`), con la letra a 11vw en el celular (36 a 64px) y 9.5vw desde 760px
  (72 a 176px). "Boxes corporativos" y "Fechas especiales" ya no aparecen en la sección.
  Cómo se mueve (`Empresas.tsx`): con la sección centrada en pantalla cada fila pasa por su
  **pose de lectura**, la del HTML, con su frase entera y centrada: "Coffee breaks" arriba
  y "Agasajos" abajo. Son las dos únicas que se ven enteras; "Desayunos" y "Mesas gourmet"
  asoman cortadas mientras cruzan. La curva frena en la pose (`CENTRO`): en compu pasa al
  0.55 de la velocidad media (la curva `deslizar` aprobada el 30/9) y en el celular al 0.12,
  o sea que ahí la fila **casi se detiene** para que "Coffee breaks", que deja 15px por lado
  a 390, se alcance a leer. Sin JS o con reducir movimiento queda la pose de lectura quieta
  (11vw también con `scripting: none`). Las etiquetas de abajo del título ya no repiten
  rubros: son "Con factura", "Sin mínimos", "Pedido con 48 hs" y "Sin TACC embalado aparte"
  (L2, datos confirmados por Flor). Si prefiere ver las cuatro palabras enteras o la letra
  más grande, hace falta letra más chica (unos 10vw en el celular) o más velocidad
  (repetir las filas en bucle): consultarlo con él.
- **Empresas en el celular, la pausa casi quieta (4/10/2026):** confirmar con Benjamin que
  le gusta que la fila casi se detenga en la pose de lectura (`CENTRO.mobile` = 0.12 en
  `Empresas.tsx`). Si la quiere más viva, subir ese número hacia el 0.55 de compu, sabiendo
  que se bajó porque "Coffee breaks" casi llena el ancho y tiene que alcanzar a leerse.
- **Botones nuevos al final de Reseñas y de Cómo trabajamos (L6, octubre 2026):** debajo de
  las cartas de Reseñas, "Pedir presupuesto" (`resenas.cta`, el único amarillo de la
  sección) y al cierre de Cómo trabajamos, "Contanos tu evento" (`proceso.cta`), los dos a
  `#cotizar`. Confirmar los textos y que no le sobren con la pill del nav en pantalla.
- **Coffee break en el cotizador (L3, octubre 2026):** "Coffee break o desayuno de
  trabajo" es la primera opción del tipo de servicio (`cotizador.form.servicioOptions`),
  así que queda elegida si nadie preseleccionó otra (el cierre del hero y el nav), y
  "Cotizar para mi empresa" la deja elegida a propósito (`empresas.servicio`). Confirmar
  con Benjamin. **Falta en el panel:** el `MAPA_SERVICIO` de
  `salguero-admin/app/api/leads/route.ts` no tiene esa opción, así que hoy esos pedidos
  entran como "otro" (el panel ya tiene el tipo `coffee`). Es una línea en el otro repo.
- **Finger food en la galería:** el marquee usa un cuadro del clip 4 rotulado "Finger food"
  en lugar de "Como en casa". Confirmar el rótulo y la foto.
- **Hero un poco más largo (QA 30/9/2026):** el remate "Así llega a tu oficina" duraba
  menos de media pantalla. El recorrido fijo pasó de 3.2 a 3.5 pantallas en desktop y de
  2.4 a 2.6 en mobile (todos los momentos se alargan ~9%), y el cierre se aleja y se apaga
  junto con la caja. Si el hero se siente largo, se puede volver atrás solo con
  `heroSecuencia.recorrido`.

### F.2 · Archivo: lo que el sitio no usa (para borrar cuando Benjamin apruebe)
El 30/9/2026 (plan de optimización) todo lo sin uso se MOVIÓ a `_assets/archivo/`,
conservando la ruta, en vez de borrarlo: se vuelve atrás moviéndolo de nuevo. La carpeta
está en `.gitignore` (lo que ya estaba en git se movió con `git mv` y sigue trackeado),
`tsconfig.json` la excluye y ESLint la ignora, así que ni tsc, ni lint, ni Tailwind la
escanean.

Ya archivado:
- ~~`components/sections/HeroCaja.tsx` y `HeroCajaArte.tsx`~~ →
  `_assets/archivo/codigo/components/sections/`.
- ~~`heroCaja` y `HeroCajaProducto` de `content/data.ts`~~ →
  `_assets/archivo/codigo/content/heroCaja.ts`.
- ~~`components/ui/Placa.tsx` y `components/ui/Entrada.tsx`~~ →
  `_assets/archivo/codigo/components/ui/` (con `git mv`).
- ~~Variante `tinta` de `Pill` y `tono="oscuro"` de `Kicker` y `Etiqueta`~~ (eran de la
  banda amarilla de Empresas): los tres archivos enteros, antes del recorte, en
  `_assets/archivo/codigo/components/ui/`.
- ~~En `app/globals.css`: `.err-in` y `@keyframes err-in`, `dd-in`, `overlay-in` y
  `overlay-up`~~ → `_assets/archivo/codigo/app/globals-sin-uso.css`.
- ~~`public/media/secuencia/caja-v3/` y `caja-v4/`~~ →
  `_assets/archivo/media/secuencia/`. `caja-v4` es la fuente de `caja-v6` (y de cualquier
  versión futura): no borrarla.
- ~~`public/media/secuencia/caja-v5/`~~ (el hero usa `caja-v6`) →
  `_assets/archivo/media/secuencia/caja-v5/`.
- ~~`public/media/secuencia/empresas/`~~ (8 archivos, ~2.1MB: los videos y posters de
  Empresas; ya no lleva video ni canvas) → `_assets/archivo/media/secuencia/empresas/`.
- ~~`public/media/galeria-alfajores.jpg`, `galeria-clip-2.mp4` y `galeria-clip-5.mp4`
  (con sus posters)~~ → `_assets/archivo/media/` (con `git mv`).
- ~~El video de la mesa para celular anterior~~ (hoy `mesa-mobile-v2.mp4`) →
  `_assets/archivo/media/secuencia/galeria/`.

Sigue donde está (a propósito):
- `_assets/caja-provisoria/` y `_assets/beta-sin-uso/` (fuera de `public/` y de git).
- `_assets/productos-recortes/`: los 13 recortes originales de los bocaditos (el sitio usa
  las variantes de `public/media/productos/nitido` y `fondo`). Guardar si se van a
  regenerar variantes.
- `public/media/flor-trabajando.jpg`: es la foto de `_assets/fotos/SELECCION.md` (la
  sección usa `flor-alternativa.jpg`); el visitante no la baja.

### F.3 · Técnicas
- **Peso de la secuencia del hero:** desktop ~10.0MB (172 cuadros 720x1280) y mobile
  ~7.0MB (172 cuadros 540x960), en `caja-v6`. Después de `load` se baja una primera
  pasada; desde el primer scroll, el resto por tramos (`seguir` de
  `HeroSecuenciaMotor.ts`: solo los cuadros cercanos a donde está la persona). Con ahorro
  de datos se saltean. Medir Lighthouse mobile con `next start` (baseline aceptado: 80).
  No usar AVIF, no sacar cuadros ni bajar de q80 sin prueba en un iPhone real y el OK de
  Benjamin.
- **Video de la mesa en celular:** `mesa-mobile-v2.mp4` (1.8MB, todo cuadros clave,
  x264 CRF 25) en vez del anterior de 2.4MB; `mesa.mp4` de compu no cambió.
- **Caché de `/media` (solo producción, `next.config.ts`):** `/media/secuencia/*` y
  `/media/productos/*` con caché de un año `immutable`; el resto de `/media` una semana
  con `stale-while-revalidate`. Regla: lo que cambie en `secuencia/` o `productos/`
  cambia de carpeta o de nombre (`caja-v7`, `mesa-mobile-v3`...). Nunca se pisa un
  archivo en el lugar.
- **Orden de los ScrollTriggers:** se fijan el hero, servicios (solo compu), la intro de
  galería, Flor (compu con alto) y reseñas. Esos pins y los triggers de Empresas, galería
  y Cómo trabajamos (que ya no se fija) llevan `refreshPriority: 0` y con eso
  ScrollTrigger ordena todos los refresh por posición en la página (verificado a 1440 y
  390: cada pin arranca justo debajo del nav y un refresh extra no mueve nada). El pie y
  el mazo de reseñas después de su pin van con `-1` (últimos). Todo pin nuevo tiene que
  llevar `0`. `lib/gsap.ts` recalcula cuando terminan de cargar las fuentes.
- **Ancla `#resenas`:** a propósito aterriza al final de su escena (todo armado), con un
  `scroll-margin-top` negativo que calcula `Resenas.tsx`. No es un error.
- **Gancho de QA solo en desarrollo:** `canvas.__motor` (hero).
- **`anticipatePin` solo en táctiles:** `anticiparPin()` de `lib/gsap.ts` en todos los pins
  (servicios, galería, Flor y reseñas, también en sus modos de desktop, que se usan
  en tablets táctiles en horizontal). Con rueda o trackpad (Lenis) anticipar fijaba el pin 60 a 80px antes: un
  salto visible, medido y corregido en la integración.
- **CustomSelect:** escribir una letra con la lista cerrada la abre en la opción elegida,
  no en la que coincide con la letra (como antes).
- **Pasada de suavizado global** (Lenis, curvas y resortes) a cargo del grupo de Empresas.
- **Rendimiento en celular (4/10/2026): mejor, todavía NO listo para producción.**
  Medido con `next start` y el perfil de celular de la QA (412x823, CPU x4, 4G; mediana
  de 3 cargas; nota estimada con las curvas de Lighthouse):

  | | Antes | Ahora |
  |---|---|---|
  | Nota estimada celular | 65 | 72 |
  | TBT celular | 1,69 s | 0,84 s |
  | TTI celular | 11,1 s | 7,5 s |
  | El hero responde al scroll | 6,3 s | 5,3 s |
  | FCP / LCP celular | 2,7 s | 2,7 s (sin cambios) |
  | Nota estimada / TBT compu | 95 / 185 ms | 98 / 122 ms |

  Qué se hizo, sin sacar animaciones y con el mismo resultado en pantalla (recorrido
  completo a 390 y 1440 igual al de la QA final: mismas alturas, pins y capturas):
  (1) se sacaron dos refresh completos de ScrollTrigger que se repetían al cargar
  (`refrescarSiNadieLoHace` en Servicios y el del hero tras la primera pasada, que ahora
  solo corre si las fuentes todavía cargaban); (2) las escenas que no fijan nada ni
  cambian el alto se arman al acercarse (`alAcercarse` / `useGSAPAlAcercarse` de
  `lib/gsap.ts`): Empresas, la fila de fotos de Galería en celular, Flor en celular, la
  entrada de Preguntas, el wordmark del pie y los títulos que se encienden; (3) la pila
  de Servicios en celular usa un solo ScrollTrigger en vez de siete. Al cargar se
  crean 14 triggers en celular (antes 57). Lo que se arma al acercarse va en tareas de
  menos de 50 ms (`enTareas`): recorriendo la página con el dedo no aparecen tareas
  largas. Herramientas y mediciones: `scratchpad/cierre2/correcciones-qa/`.
  **Lo que falta para 90+ en celular** (decisiones de diseño o trabajo grande):
  (a) FCP y LCP de 2,7 s: la primera maquetación del HTML cuesta ~1 s con CPU x4 (la
  publicada, ~0,6 s); bajar el HTML y el CSS de la primera carga. (b) El armado de las
  escenas que sí fijan (hero, Servicios, intro de Galería, Reseñas) sigue en una tarea de
  ~0,5 s: en buena parte, maquetaciones forzadas al pasar cada sección a su modo
  (`data-sv`, `data-hs`, `data-rs`); haría falta poner esos modos por CSS antes de
  hidratar, que cambia lo que se ve sin JS. (c) El refresh completo que ScrollTrigger
  encola al crear los pins (~0,17 s), que es de GSAP.

### F.4 · Pruebas en dispositivos reales (las capturas no alcanzan)
- iPhone con Safari: el poster con ahorro de energía; el scroll táctil al entrar y salir
  de los pins (hero, reseñas); el hero al rotar el teléfono.
- Un Android de gama media: fluidez de la secuencia del hero y de la galería.
- Un Android de gama media: que no se note el armado de Empresas, la fila de fotos de
  Galería y Flor mientras se scrollea (se arman a 1.5 y 2.5 pantallas de entrar).
