# DESIGN.md · Salguero Gourmet

Sistema de diseño **transcripto del mockup aprobado** (`_assets/mockup-salguero-v4.html`).
Estos valores son la referencia exacta para FASE 1 en adelante. No inventar tokens nuevos.

---

## 1. Tokens de color (LOCK)

```css
--bg:        #241C15;               /* fondo global */
--surface:   #30261D;               /* placas, inputs, bandas */
--crema:     #F5EEE0;               /* texto principal (~14:1 sobre bg) */
--crema-dim: #B5A691;               /* texto de apoyo (~7:1 sobre bg) */
--amarillo:  #E9BC4F;               /* ÚNICO croma: CTA, énfasis, logo (~9:1) */
--hairline:  rgba(245,238,224,.14); /* bordes 1px */
```

En Tailwind v4 se exponen dentro de `@theme` en `globals.css` como
`--color-bg`, `--color-surface`, `--color-crema`, `--color-crema-dim`,
`--color-amarillo`, `--color-hairline` (para poder usar `bg-bg`, `text-crema`, etc.).

**Regla de dosis del amarillo:** CTA + una palabra por titular + el logo. Nada más.
**Única excepción** (decisión de Benjamin, 30/9/2026): en Empresas, las palabras gigantes
van en amarillo `#E9BC4F` macizo sobre el fondo del sitio, sin banda amarilla ni líneas
separadoras (reemplazó a la banda amarilla lisa del 29/9). No revertir.
Hover del CTA (`.pill-primaria`): `translateY(-2px)` + `filter:brightness(1.06)`; active
vuelve a `translateY(0)`.

## 2. Tipografía

Cargar con `next/font/google`, `display: swap`, expuestas como variables CSS.

| Familia | Variable | Uso | Pesos |
|---|---|---|---|
| Playfair Display | `--font-display` | Titulares (h1/h2/h3), números de paso, inicial de Flor. Itálica **solo** para la palabra destacada. | 400, 500, 600; italic 500, 600 |
| DM Sans | `--font-sans` | Cuerpo y UI. Base 17px, line-height 1.65. | 400, 500, 700 |
| JetBrains Mono | `--font-mono` | Solo etiquetas/kickers: 11px, uppercase. | 400, 500 |

Escalas clave (del mockup):
- `body`: 17px / 1.65, `-webkit-font-smoothing:antialiased`.
- `h1` (hero): Playfair 500, `clamp(2.6rem, 5.6vw, 4.2rem)`, line-height 1.08.
- `h2` (sec-head): Playfair 500, `clamp(1.9rem, 4vw, 2.7rem)`, line-height 1.15.
- `h2 em` / `h1 em`: `font-style:italic; color:var(--amarillo)`.
- Kicker: mono 11px, `letter-spacing:.18em`, uppercase, `color:crema-dim`, con tick
  cuadrado amarillo `6x6px` antes (`::before`).
- Etiqueta: mono 11px, `letter-spacing:.14em`, uppercase, `crema-dim`, tick `6x6px` amarillo.

## 3. Layout y espaciado

- Contenedor `.wrap`: `max-width:1160px; margin:0 auto; padding:0 24px`.
- Sección `.sec`: `padding:76px 0`. Muchas secciones encadenadas usan `padding-top:0`
  para no duplicar el aire (galería, flor, reseñas, proceso, cotizador).
- `.sec-head`: `margin-bottom:40px`; el `<p>` de apoyo: `max-width:56ch; margin-top:12px`.
- Radios: placas 8px, hero-media 10px, inputs 4px, pill 999px.
- Bordes: siempre `1px solid var(--hairline)`.

### Breakpoints (del mockup)
- `860px`: nav-links se ocultan; hero pasa a 1 columna (media arriba); pasos a 2 columnas;
  cotizador a 1 columna.
- `760px`: servicios a 1 columna; flor a 1 columna centrada; reseñas a 1 columna;
  cobertura a 1 columna.
- `520px`: pasos a 1 columna; `cot-2c` a 1 columna.
- Verificación obligatoria a **390px** y **1440px**.

## 4. Motion (fail-open)

- Ease único del mockup: `cubic-bezier(0.16, 1, 0.3, 1)`. **Desde la beta "dopamina"** esa
  curva se reemplazó por la física de `lib/fisica.ts`: resortes de framer-motion
  (`RESORTE`), su versión para GSAP (`resorteGsap`), `SCRUB`, `TRAMO` y `COSTURA` para las
  escenas de scroll, y en CSS los tokens `ease-resorte` (500 ms) y `ease-resorte-lento`
  (650 ms) de `globals.css`. Aprobada por Benjamin para producción el 5/10/2026
  (CLAUDE.md §5.5).
- Solo `transform` y `opacity`. Nada de animar layout.
- `whileInView` **una sola vez** (`viewport={{ once: true }}`), pequeño stagger en grids
  (delays escalonados ~0.08 / 0.15 / 0.22s como en el mockup).
- **Fail-open:** el contenido es visible por defecto en el CSS. La animación oculta/revela
  solo cuando el runtime de motion está garantizado. `useReducedMotion()` en todo
  componente animado: con reduced-motion, todo visible y estático.
- Marquee de galería: `translate3d(0)` → `translate3d(-50%,0,0)`, 55s lineal infinito
  (`.mq-track` en `globals.css`, versión quieta de `Galeria.tsx`),
  `animation-play-state:paused` en hover, desactivado con `prefers-reduced-motion`. En la
  escena de desktop de la beta (`GaleriaEscena` + `Galeria.module.css`) el marquee doble
  tiene su propia animación, deriva con el scroll y el hover lo frena con resorte.
- Contadores de la tira de confianza: **SSR muestra el número final**; el conteo animado es
  un realce opcional client-side (easing cúbico ~1.1s), nunca arranca en 0 en el HTML.

## 5. Primitivas UI (derivadas del mockup)

Se implementan en FASE 1 dentro de `components/ui/`. Hoy están: `Wordmark`, `Section` /
`Container`, `SectionHead`, `Kicker`, `Etiqueta`, `Pill`, `Field` / `TextArea`,
`CustomSelect`, `CustomDate`, `NumberStepper`, `Reveal`, `TitleEm`,
`PalabrasQueSeEncienden`, `Counter`, `Estrellas`, `GaleriaLightbox` e `InstagramIcon`.

### `Wordmark`
`SALGUERO` + cuchara SVG amarilla + `GOURMET`. `font-weight:700; letter-spacing:.14em;
font-size:15px` (16px alto de cuchara en footer, 22px en nav). SVG exacto:
`<svg viewBox="0 0 34 180"><g fill="#E9BC4F"><ellipse cx="17" cy="27" rx="17" ry="27"/><rect x="12.25" y="48" width="9.5" height="132" rx="4.75"/></g></svg>`

### `Section` (`.sec`)
Envoltorio de sección: `padding:76px 0`, prop opcional `flush` para `padding-top:0`, id
para ancla, `.wrap` interno.

### `SectionHead` (`.sec-head`)
Kicker (opcional) + `h2` con una palabra en `<em>` itálica amarilla + `<p>` opcional.
`margin-bottom:40px`.

### `Kicker` / `Etiqueta`
Mono 11px uppercase con tick cuadrado amarillo `6x6px`. Kicker `.18em`, Etiqueta `.14em`.
Etiqueta es `inline-flex`; Kicker es `flex` (bloque).

### `Pill`
- `pill-primaria`: `background:amarillo; color:#241C15`. Padding `14px 28px`, `font-size:15px`,
  `font-weight:500`, radio 999px. En nav: `10px 20px / 14px`. Hover: lift 2px + brillo.
- `pill-fantasma`: `background:transparent; color:crema; border:1px solid hairline`.
- (La variante `tinta`, espresso con texto amarillo para la vieja banda amarilla de
  Empresas, y el `tono="oscuro"` de Kicker y Etiqueta quedaron en `_assets/archivo/`.)

### Placas (sin primitiva propia)
La tarjeta del mockup (`background:surface; border:1px solid hairline; border-radius:8px`,
hover `translateY(-4px)` + borde ámbar + zoom de la foto) vive dentro de cada sección
(`CotizarCard` con la clase `.placa` de `Servicios.module.css`, las cartas de
`Resenas.tsx`). La primitiva `Placa` no se usaba y se archivó en
`_assets/archivo/codigo/components/ui/Placa.tsx` (30/9/2026).

### `Field` / `Select` / `TextArea`
`background:surface; border:1px solid hairline; border-radius:4px; color:crema; font:inherit;
font-size:15px; padding:13px 14px; width:100%`. Focus:
`outline:2px solid amarillo; outline-offset:1px; border-color:transparent`. Label 13.5px/500,
asterisco requerido en amarillo. Textarea `min-height:110px; resize:vertical`.
Flash de preselección: outline amarillo que se apaga en ~1.4s (`@keyframes flash`).

### `Reveal`
Wrapper fail-open sobre framer-motion (vía `lib/motion.ts`): hijo visible por defecto,
`whileInView` una vez con el resorte `entrada` de `lib/fisica.ts`; respeta
`useReducedMotion()`.

## 6. Medidas específicas por sección (referencia rápida)

En el orden de la página de la beta "dopamina" (Empresas va después de Servicios desde el
30/9/2026). La columna "Mockup" es la referencia de medidas; "Beta" dice qué cambió.

| Sección | Mockup (grid / detalle) | Beta "dopamina" |
|---|---|---|
| Hero | `1.15fr .75fr`, gap 56px; media `max-width:400px`, `aspect-ratio:4/5`, radio 10px. | Secuencia de la caja centrada y fijada (`HeroSecuencia`, cuadros WebP en `public/media/secuencia/caja-v6/desktop/` para compu y `caja-v7/mobile/` para celular, tapa en `caja-v6/`), textos por momentos alrededor; sin JS o con reducir movimiento, versión quieta. |
| Servicios | `repeat(2,1fr)`, gap 18px; 2 placas `serv-wide` ocupan fila completa con imagen a un lado (`1.15fr 1fr`). Imagen 200px (wide hasta 270px). | Misma grilla en el HTML; en compu "mazo" fijado, en celular "pila" sticky sin pin. |
| Empresas | banda `surface` con borde arriba/abajo; items como etiquetas + CTA a la derecha. | Sin banda ni líneas: dos filas de palabras gigantes amarillas (cuchara del logo como separador) que cruzan con el scroll, y abajo, centrados, kicker, título, etiquetas y la pill "Cotizar para mi empresa". |
| Galería | 2 tracks marquee; `figure` 280px ancho, `img` 230px alto radio 8px. | Intro con el video de la mesa fijado (pin corto en compu, más largo en celular) y después el marquee doble en compu o el carril deslizable en celular. La versión quieta mantiene el marquee del mockup. |
| Flor | `auto 1fr`, gap 44px, `padding:44px`, placa surface radio 10px; foto redonda 180px. | La foto se abre desde un círculo en la cara de Flor (pin solo en compu con alto). |
| Reseñas | score Playfair 4rem + estrellas amarillas; grid `repeat(2,1fr)` gap 16px; meta con nombre 14/700 y servicio en mono 10px. | El 5.0 gigante se arma fijado y las 4 cartas se reparten desde un mazo. |
| Proceso | `repeat(4,1fr)` gap 18px; cada paso con número Playfair itálico amarillo 1.9rem y borde superior hairline. | Recorrido del mensaje a la mesa (globito, paradas 02 y 03, mesa) + los 4 pasos en un riel; sin pin, vuelta de 5,4 s en loop mientras se ve, pausa fuera de pantalla. |
| FAQ | `max-width:760px`; `<details>` con `summary` y marcador `+`→`×` (rota 45°) en amarillo. | Igual, con el alto animado por resorte. |
| Cotizador | `1.15fr .85fr` gap 52px; form + aside de contactos surface. | Igual. |
| Footer | borde superior; wordmark + tagline + copyright, `crema-dim` 13.5px. | Suma el wordmark grande (`FooterMarca`): entra una vez al verse y sube con un parallax leve. |
