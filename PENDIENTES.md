# PENDIENTES · Salguero Gourmet

Registro vivo de lo que falta hacer o confirmar y de las notas técnicas vigentes.
Cada dato no confirmado vive como `[[PLACEHOLDER]]` en `content/data.ts` (hoy no queda
ninguno). Lo ya resuelto está resumido al final, en "Historia".

---

## 1 · Falta hacer o confirmar

### Confirmar en producción (la beta `dopamina` pasó a `main` el 8/10/2026)
- **Escalones de la caja sin el fundido** (7/10/2026): para sacar las imágenes dobles, la caja
  dibuja un solo cuadro por vez. Desde `caja-v9` hay cuadros intermedios (RIFE) en los tramos
  donde los productos más se mueven (compu x2/x3 en 4-101, celular x2 en 6-102); van solo con
  scroll lento y pantalla holgada (HeroSecuenciaPlan). Benjamin lo aprobó en la preview el
  7/10/2026 (PC e iPhone). Si los escalones vuelven a molestar, la salida es generar más
  intermedios desde la fuente (`_assets/archivo/`), no volver a mezclar dos cuadros.
- **El diagnóstico `?hsdiag` se sacó** antes del pase a `main` (8/10/2026). Para volver a
  medir la caja en un teléfono, recuperarlo de la historia de git (`HeroSecuenciaDiag.ts` y
  `diagnostico()` del motor, commit anterior al pase) en una rama de prueba, nunca en `main`.
- **Prueba en dispositivos reales.** Benjamin la probó en su celular con wifi (5/10/2026)
  y en iPhone y PC con la preview (7/10/2026). Falta una prueba con datos móviles (4G) y,
  en iPhone con Safari: entrar y salir de los pins del hero y de Reseñas con el dedo,
  rotar el teléfono en el hero y el poster con ahorro de energía. Si se puede, también un
  Android de gama media (fluidez de la secuencia del hero y de la galería, y que no se note
  el armado de Empresas, Galería y Flor mientras se scrollea).
- **Fecha del sitemap.** `site.lastUpdated` (`content/data.ts`) está en 2026-10-08, la del
  pase a `main`. Cada vez que cambie el copy en producción, ponerle la fecha de ese pase.
- **Rendimiento en celular.** Tercera vuelta (6/10/2026, ver "Notas técnicas"):
  Lighthouse local con la config de PageSpeed, 90-91 en celular y 100 en compu. Falta
  confirmarlo en PageSpeed Insights con la versión publicada. Para decidir (Benjamin):
  cargar Clarity recién con la primera interacción le saca ~100 ms de bloqueo a la carga
  (PageSpeed lo cuenta), pero no graba las visitas que no tocan nada.
- **Dos excepciones a la regla fail-open (CLAUDE.md §5.5), para decidir y, si quedan,
  anotarlas en §5.5:**
  (a) en el hero, antes de hidratar y con JS y movimiento, algunas capas arrancan ocultas;
  una red CSS (`.hs-diferida`, `hs-failsafe` en `globals.css`) las muestra a los 4 s si el
  JS no llega; (b) el error de los campos del cotizador abre y cierra su alto (`height` y
  `marginTop` con el resorte `panel`, `components/ui/Field.tsx`), y §5.5 pide solo
  transform y opacity (§7.5 exceptúa solo el FAQ). La alternativa a (b) es reservar el
  renglón del error y animar solo opacidad e `y`, que cambia el alto del formulario en
  reposo. Mientras tanto, al abrir o cerrar se pide un `ScrollTrigger.refresh(true)`.

### Diseño y textos que tiene que confirmar Benjamin
- **Cierre del hero** ("Tu pedido puede *lucir así*." + pill "Quiero el mío" a `#cotizar`,
  sin bajada desde el 5/10/2026). En compu el título va en un renglón; en el celular, en
  dos ("Tu pedido puede / lucir así."). Confirmar: (1) mientras se ve el cierre también
  está en pantalla la pill "Pedir presupuesto" del nav, o sea dos botones amarillos a la
  vez; (2) para que entre el cierre, el encuadre se achica en pantallas bajas (tope 0.66,
  `heroSecuencia.cierre.ajuste.escalaMin`). Todo se cambia en `heroSecuencia.cierre`.
- **Hero en compu de 1200px o más:** las columnas del hero se miden desde el borde de la
  ventana (el título arranca en x=43 a 1440), mientras el logo y las secciones arrancan en
  el contenedor. Alinearlas al contenedor achica la caja (13% a 1880, 24% a 1920) y a 1920
  parte el título del inicio en tres renglones. Es una decisión de diseño.
- **Servicios:** las 4 marcas amarillas de progreso y los números "01" a "04" del mazo.
- **Bocaditos en Servicios en el celular:** en 375 y 390 las cartas del mazo tapan casi
  todas las piezas. Si lo quiere más cargado: nítidas que asomen del borde y desenfocadas
  sobre el título y entre cartas.
- **Empresas después de Servicios** (pedido suyo del 30/9/2026, "veamos cómo queda"):
  confirmar que queda. El menú de arriba no tiene link a Empresas (el mockup no lo tiene);
  si lo quiere, es una línea en `nav.links`.
- **Empresas, palabras y etiquetas:** arriba "Coffee breaks · Desayunos" y abajo "Mesas
  gourmet · Agasajos" (`empresas.palabras`); en la pose de lectura se ven enteras "Coffee
  breaks" y "Agasajos". Debajo del título, "Con factura", "Sin mínimos" y "Pedido con
  48 hs" (`empresas.items`). Si quiere ver las cuatro palabras enteras hace falta letra
  más chica o filas en bucle.
- **Botones al final de Reseñas y de Cómo trabajamos (L6):** "Pedir presupuesto"
  (`resenas.cta`) y "Contanos tu evento" (`proceso.cta`), los dos a `#cotizar`. Confirmar
  los textos y que no le sobren con la pill del nav en pantalla.
- **Coffee break en el cotizador (L3):** "Coffee break o desayuno de trabajo" es la
  primera opción (`cotizador.form.servicioOptions`), así que queda elegida si nadie
  preseleccionó otra, y "Cotizar para mi empresa" la elige a propósito
  (`empresas.servicio`).
- **Finger food en la galería:** el marquee usa un cuadro del clip 4 rotulado "Finger
  food". Confirmar el rótulo y la foto.
- **Visor de la galería:** usa `destacadas` tal cual (18 ítems, "Mesa dulce" incluida) y, al
  final, las fotos del carril que no estén ahí, para que cada foto abra la suya.

### Panel de gestión
- **No se toca por ahora** (decisión de Benjamin, 5/10/2026). Consecuencia conocida: el
  `MAPA_SERVICIO` del panel (`app/api/leads/route.ts` en su repo) no tiene "Coffee break o
  desayuno de trabajo", así que en el sitio publicado esos pedidos entrarían como "otro"
  (el panel ya tiene el tipo `coffee`). Es una línea cuando se retome.

### Datos del cliente
- **Reseña de Javier Sauret ("Evento a medida"):** diferida hasta que llegue el texto (no
  se inventa copy de reseñas).
- **Reseñas:** se ven solo las 4 con servicio confirmado (Mauricio Schmid, María
  Candelaria Contreras, Maria Victoria Garcia y Franco Businello). Las 5 sin servicio
  confirmado se sacaron de `content/data.ts` (5/10/2026) y quedaron en
  `_assets/archivo/data-retirado-2026-10-05.ts` por si vuelven.
- **Cantidad de reseñas:** no se muestra en ninguna parte de la página (pedido de Benjamin,
  5/10/2026). Va solo en el JSON-LD, desde `site.reviewCount` (34): actualizarlo cuando
  cambie en Google.

### Dominio y Google (fuera del código)
- Verificar que esté hecho: (1) en Vercel, `salguerogourmet.com` como dominio **Primary**
  (es el apex; www redirige al apex); (2) en Google Search Console, una **propiedad de
  Dominio** verificada por TXT en el DNS de Vercel, con el sitemap
  (`https://salguerogourmet.com/sitemap.xml`); (3) la URL del sitio en el perfil de Google
  Business.
- El meta `google-site-verification` viejo (de la propiedad `vercel.app`, en
  `app/layout.tsx`) se saca recién cuando la propiedad de Dominio esté verificada.

### Respaldo y ramas
- **Respaldar fuera de la PC** `_assets/archivo/` (incluye `caja-v4`, la fuente de las
  secuencias del hero), `_assets/contenido/` (fuentes de los cuadros y de los bocaditos) y
  `_assets/productos-recortes/`. Están ignorados por git y existen solo en el disco: no se
  suben al repo por el peso.
- **Rama `rebrand-2026`** (en pausa desde el 13/9): existe solo en esta PC. Subirla si se
  quiere conservar o borrarla si se descarta.
- **Rama remota `claude/hide-scrollbar-3fpf1f`:** su cambio ya está en `app/globals.css`;
  se puede borrar en GitHub.

---

## 2 · Aprobado por Benjamin (5/10/2026)

- **La física de `lib/fisica.ts` para producción** (resortes de framer-motion,
  `resorteGsap` en GSAP y `ease-resorte` en CSS, en lugar de la curva
  `[0.16, 1, 0.3, 1]`). CLAUDE.md §5.5 y §6 y DESIGN.md §4 ya lo dicen.
- **"en Google" debajo de las estrellas de Reseñas**, sin la cantidad de reseñas (lo pidió él:
  las estrellas son de Google).
- **Las animaciones de la beta tal como están.** Entre ellas:
  - Hero: recorrido fijo de 3.5 pantallas en compu y 2.6 en el celular
    (`heroSecuencia.recorrido`), con el cierre que se aleja y se apaga junto con la caja.
  - Reseñas: el 5.0 va de 0.0 a 5.0 y las estrellas se llenan de a una atados al scroll,
    en las dos direcciones; sin JS o con reducir movimiento, 5.0 quieto con las cinco
    llenas.
  - Empresas: dos filas de palabras gigantes que cruzan con el scroll y frenan en la pose
    de lectura (`CENTRO` en `Empresas.tsx`: 0.55 en compu, 0.12 en el celular, donde la
    fila casi se detiene), con la cuchara del logo meciéndose como separador.
  - Cuchara de progreso con reducir movimiento: visible y quieta (es un indicador).

---

## 3 · Notas técnicas vigentes

- **Dominio:** `salguerogourmet.com` (apex). Todo deriva de `site.url`
  (`content/data.ts`): canonical, metadataBase, OG, sitemap, robots y JSON-LD.
- **Leads al panel (`Cotizador.tsx`):** el aviso al panel sale solo desde el sitio
  publicado (hostname `salguerogourmet.com` o `www.salguerogourmet.com`) hacia
  `https://admin.salguerogourmet.com/api/leads`. En un preview de Vercel o en un
  `next start` local no se avisa a nadie; en desarrollo va al panel local
  (`localhost:3001`). Es fail-open: si el panel falla, el envío por WhatsApp sigue igual.
  `lib/wa.ts` no cambia. Clarity también carga solo en el dominio real.
- **JSON-LD (`components/chrome/JsonLd.tsx`):** tipo `FoodEstablishment` + `Bakery`. El
  `aggregateRating` lleva `site.reviewCount`, que no se ve en la página (CLAUDE.md §7.4).
- **Secuencia del hero:** compu en `public/media/secuencia/caja-v9/desktop/` (291 archivos
  720x1280, ~16 MB: los 172 cuadros del video más 119 intermedios) y celular en
  `caja-v9/mobile/` (268 archivos 540x960, ~11 MB: 172 más 96 intermedios); la tapa en
  `caja-v6/` (`tapa-v3.webp` y `tapa-blur-v3.webp`). Después de `load` baja una primera
  pasada (1 de cada 8 cuadros del video, nunca un intermedio); desde el primer scroll, el
  resto por tramos cerca de donde está la persona (`seguir` de `HeroSecuenciaMotor.ts`); con
  la pasada bajada y la red midiendo bien, lo que falta se baja por adelantado en reposo
  (`anticipar`: todo en una compu con 2 MB/s o más, los cuadros del video con 500 KB/s, 1 de
  cada 2 en un celular con 1 MB/s, si no 1 de cada 4; `nivelAnticipo` en
  `HeroSecuenciaRed.ts`); los intermedios se piden y se decodifican solo con scroll lento o
  por adelantado en compu. Con ahorro de datos se
  saltean. No usar AVIF, no sacar cuadros ni bajar de q80 sin prueba en un iPhone real y
  el OK de Benjamin. Un iPad que rota entre vertical y horizontal cruza el corte
  (860x600) y baja las dos versiones.
- **Video de la mesa en el celular:** `mesa-mobile-v2.mp4` (1.8 MB, todo cuadros clave);
  `mesa.mp4` de compu (2.7 MB).
- **Caché de `/media` (solo producción, `next.config.ts`):** `/media/secuencia/*` y
  `/media/productos/*` con caché de un año `immutable`; el resto, una semana con
  `stale-while-revalidate`. Regla: lo que cambie en `secuencia/` o `productos/` cambia de
  carpeta o de nombre (`caja-v10`, `mesa-mobile-v3`...). Nunca se pisa un archivo en el
  lugar.
- **Imágenes:** `images.qualities` es `[88]` (todas las fotos piden 88; el poster del
  hero no pasa por el optimizador).
- **Orden de los ScrollTriggers:** se fijan el hero, Servicios (solo compu), la intro de
  la galería, Flor (compu con alto) y Reseñas. Esos pins y los triggers de Empresas,
  galería y Cómo trabajamos llevan `refreshPriority: 0`, y ScrollTrigger ordena los
  refresh por posición en la página. El pie y el mazo de Reseñas van con `-1`. Todo pin
  nuevo lleva `0`. `lib/gsap.ts` recalcula cuando terminan de cargar las fuentes.
- **`anticipatePin` solo en táctiles:** `anticiparPin()` de `lib/gsap.ts` en todos los
  pins. Con rueda o trackpad (Lenis), anticipar fijaba el pin 60 a 80px antes: un salto
  visible.
- **Ancla `#resenas`:** a propósito aterriza al final de su escena (todo armado), con un
  `scroll-margin-top` negativo que calcula `Resenas.tsx`. No es un error.
- **CustomSelect:** escribir una letra con la lista cerrada la abre en la opción elegida,
  no en la que coincide con la letra.
- **Rendimiento:** medir SIEMPRE con el build de producción
  (`npm run build && npx next start -p 3100`), nunca con `next dev` (en dev da ~64).
  - Lighthouse real de Benjamin (5/10/2026, Mobile, incógnito): **87** (FCP 1,4 s · LCP
    3,1 s · TBT 280 ms · CLS 0 · SI 2,9 s). La nota estimada del 4/10 era 72; dos vueltas
    de rendimiento la llevaron a 87 en celular y 100 en compu, sin sacar animaciones.
  - Lo que falta para 90+: el LCP de Lighthouse en celular lo frenan el JS de Next y la
    hidratación (~255 KB) y las 4 fuentes precargadas (~155 KB), no el hero. Precargar el
    poster no mejoró nada. Lo que queda es de riesgo medio (diferir JS antes del primer
    pintado, precargar menos fuentes). Medir en el preview de Vercel (h2 y brotli) antes
    de seguir.
  - **No reintentar la hidratación diferida** del Cotizador y la galería (probada en
    `main`: bajó de 80 a 65 porque rompió el CLS y subió el TBT).
  - **Tercera vuelta (6/10/2026).** Local, mediana de 6 (celular) y de 3 (compu),
    contra el build anterior: celular 86,5 -> 90,5 (TBT 227 -> 147 ms, LCP 3,53 ->
    3,30 s); compu 100 -> 100 y, con CPU x3, 90 -> 100 (TBT 255 -> 54 ms). Sin cambios
    en lo que se ve (capturas, anclas, sin JS, reducir movimiento y resize iguales).
  - **Cola de armado (`useGSAPEnCola`, `lib/gsap.ts`).** El hero, Servicios, Galería,
    Flor y Reseñas se arman cada uno en su propia tarea apenas termina la hidratación,
    no todos juntos adentro del commit (era una tarea de ~150 ms). Una escena nueva que
    fija o cambia el alto de la página va con `useGSAPEnCola`; las que no, con
    `useGSAPAlAcercarse` (que ahora empieza a mirar desde la cola, después de los pins).
  - **Fuentes recortadas (`app/fonts`).** Playfair Display (normal e itálica) y
    JetBrains Mono son los archivos de Google Fonts (subset latin) recortados con
    `pyftsubset <archivo> --unicodes=U+0020-007E,U+00A0-00A1,U+00A9-00AB,U+00AE,U+00B0,U+00B4,U+00B7,U+00BA-00BB,U+00BF,U+00C1,U+00C9,U+00CD,U+00D1,U+00D3,U+00DA,U+00DC,U+00E1,U+00E9,U+00ED,U+00F1,U+00F3,U+00FA,U+00FC,U+00D7,U+2007-200A,U+2013-2014,U+2018-201A,U+201C-201E,U+2022,U+2026,U+202F,U+2039-203A,U+20AC,U+2122,U+2190-2193,U+2212 --layout-features='*' --flavor=woff2`
    (la Mono con `--layout-features=ccmp,frac,locl,mark,kern,liga,mkmk`, sin `calt`:
    sin ligaduras de código). 43 KB menos antes de pintar. Si un titular o una etiqueta
    nuevos usan un carácter fuera de esa lista, sale con la letra de respaldo: sumarlo
    al recorte. DM Sans sigue entera (Google), porque es la del cotizador.
  - **Después de pintar (`lib/pintado.ts`).** Lo que se pide al hidratar y no hace falta
    para ver el hero (los chunks de bocaditos y cuchara, Clarity) espera a la primera
    pintura. En una página visible no cambia nada;
    en una pestaña que todavía no se muestra (o el Chrome de PageSpeed cuando demora los
    cuadros) no le compite al hero.
- **Fotos HEIC del cliente:** son imágenes en mosaico. Decodificar SIEMPRE con el default
  de ffmpeg (sin `-map`), que reconstruye la grilla a resolución completa; `-map [0:v]`
  toma un solo tile y da falsos "borrosos". Hay muchas fotos buenas sin usar (spreads,
  flat-lays, oficio, eventos corporativos) para futuras pasadas.
- **npm:** `unrs-resolver` (dependencia de ESLint) tiene un postinstall no ejecutado por la
  política de scripts de npm 11. Se resuelve solo si el lint lo pide
  (`npm approve-scripts`).
- **Lint:** ESLint ignora `_assets/**` y `.claude/**` (los worktrees de Claude traen su
  propio `.next`).

---

## 4 · Archivo: lo que el sitio no usa

El 30/9/2026 todo lo sin uso se movió a `_assets/archivo/`, conservando la ruta, en vez de
borrarlo: se vuelve atrás moviéndolo de nuevo. La carpeta está ignorada por git y
`tsconfig.json` y ESLint la excluyen. Lo que estaba en git **ya no está trackeado**: queda
en la historia de git (commit 76ab383) y en la copia local.

Archivado:
- `components/sections/HeroCaja.tsx` y `HeroCajaArte.tsx`, y `heroCaja` de
  `content/data.ts` (`_assets/archivo/codigo/`).
- `components/ui/Placa.tsx` y `Entrada.tsx`; la variante `tinta` de `Pill` y el
  `tono="oscuro"` de `Kicker` y `Etiqueta` (eran de la banda amarilla de Empresas).
- En `app/globals.css`: `.err-in` y los `@keyframes` `err-in`, `dd-in`, `overlay-in` y
  `overlay-up` (`_assets/archivo/codigo/app/globals-sin-uso.css`).
- `public/media/secuencia/caja-v3/`, `caja-v4/` y `caja-v5/`. **`caja-v4` es la fuente de
  `caja-v6` y `caja-v7`** (y de cualquier versión futura): no borrarla.
- `public/media/secuencia/empresas/` (videos y posters de la vieja Empresas).
- `public/media/galeria-alfajores.jpg`, `galeria-clip-2.mp4` y `galeria-clip-5.mp4` con
  sus posters, y el video anterior de la mesa para el celular.
- Los datos de `content/data.ts` que nadie leía (5/10/2026):
  `_assets/archivo/data-retirado-2026-10-05.ts`.

Fuera de `public/` y de git, a propósito: `_assets/caja-provisoria/` y
`_assets/beta-sin-uso/` (escenas viejas del hero) y `_assets/productos-recortes/` (los 13
recortes originales de los bocaditos; guardar si se van a regenerar variantes).

`public/media/flor-trabajando.jpg` se borró (5/10/2026): ningún componente la mostraba.
La copia original sigue en `_assets/fotos/flor-trabajando.jpg`.

---

## 5 · Decisiones cerradas (NO revisar, NO "mejorar")

1. **Logo:** wordmark `SALGUERO 🥄 GOURMET` con cuchara SVG amarilla. Sin sello circular,
   sin trío de utensilios. Favicon = cuchara sola.
2. **Sin sticky bar inferior en mobile.** Alcanza el nav sticky superior con su pill.
3. **Reseñas etiquetadas por servicio**, nunca por fecha.
4. **Paleta y jerarquía del mockup, sin agregar colores.** Única excepción: las palabras
   gigantes amarillas de Empresas (30/9/2026).

---

## 6 · Estado de fases

- [x] **FASE 0** · Lectura + scaffold + documentos.
- [x] **FASE 1** · Base (tokens, fuentes, Lenis, primitivas, Wordmark, ícono, muestra).
- [x] **FASE 2** · Hero + Servicios (fotos elegidas por el cliente).
- [x] **FASE 3** · Galería + La cocina de Flor + Reseñas.
- [x] **FASE 4** · Proceso + Empresas + FAQ + Cotizador (WhatsApp + preselección) + Footer + Nav.
- [x] FASE 5 · SEO + performance + a11y + pasada mobile.
- [x] FASE 6 · Entrega (build final, guía de deploy en Vercel, cómo cargar datos faltantes).

---

## 7 · Historia (resuelto)

- **Datos del cliente (agosto 2026):** anticipación mínima 48 hs antes del evento con seña
  del 50%; medios de pago efectivo, transferencia o depósito; horario de atención 9 a
  17 hs; sin cantidades mínimas; opciones sin TACC, veganas y vegetarianas según el
  servicio; vajilla y personal según lo que necesite el cliente; envío por zona se acuerda
  al hacer el pedido. Confirmados el 7/8/2026: el número del sitio es WhatsApp y la de la
  foto de su sección es Flor. Todo eso vive como texto en las FAQ, en Empresas y en el cotizador. La reseña
  de Nahir (box de regalo) se reemplazó el 7/8/2026 por la de Franco Businello (Evento a
  medida).
- **Copy:** la respuesta de cantidades mínimas ya no menciona viandas. Galería y Servicios
  se renovaron en agosto con las fotos que eligió el cliente.
- **Hero de `main`:** pasó de un clip a un montaje liviano y quedó en Lighthouse mobile 80
  (baseline aceptado por el cliente), con Lenis y `ScrollProgress` diferidos a idle y
  `LazyMotion` + `m.*`. En la beta el video se retiró y el hero pasó a la secuencia de la
  caja; `HeroVideo.tsx`, `Parallax.tsx` y los videos viejos quedan en la historia de git.
- **Beta "dopamina":** GSAP + ScrollTrigger en todas las escenas, estilo Apple, autorizada
  por Benjamin. Integrada el 29/9/2026; Empresas pasó después de Servicios el 30/9;
  optimización (código y media sin uso al archivo, caché inmutable, carga por tramos,
  CLS 0) el 30/9; rendimiento en celular el 4 y 5/10; subida a GitHub con vista previa en
  Vercel el 5/10/2026. CLAUDE.md ya refleja GSAP, el hero con la secuencia, la excepción
  amarilla de Empresas y la física aprobada.
- **Limpieza del 5/10/2026:** se sacaron del repo la configuración local de Claude Code
  (`.claude/settings.local.json` y `launch.json`, ahora ignoradas) y el `.gitkeep`
  sobrante; `.gitignore` ignora `_assets/` entero salvo `fotos/` y el mockup; README
  propio del proyecto; se desinstaló el paquete `motion` (todo usa `framer-motion` vía
  `lib/motion.ts`); se sacaron de `content/data.ts` los datos que nadie leía (campos de
  contacto, `politicas`, los flags de confirmación, `flor.foto.fallback` junto con
  `public/media/flor-trabajando.jpg`, los `required` del formulario y las 5 reseñas sin
  servicio confirmado), guardados en `_assets/archivo/data-retirado-2026-10-05.ts`;
  `site.lastUpdated` pasó a 2026-10-05; se sacó el gancho de QA del hero
  (`canvas.__motor`, `estado()`, `EstadoMotor`); 404 en español (`app/not-found.tsx`); JSON-LD con `FoodEstablishment` + `Bakery` (el tipo
  `Caterer` no existe en schema.org); `images.qualities` en `[88]`; `interest-cohort`
  fuera de la `Permissions-Policy`; se borró la rama `mejoras-2026` (ya estaba en
  `main`).
