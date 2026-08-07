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

- Ease único: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Solo `transform` y `opacity`. Nada de animar layout.
- `whileInView` **una sola vez** (`viewport={{ once: true }}`), pequeño stagger en grids
  (delays escalonados ~0.08 / 0.15 / 0.22s como en el mockup).
- **Fail-open:** el contenido es visible por defecto en el CSS. La animación oculta/revela
  solo cuando el runtime de motion está garantizado. `useReducedMotion()` en todo
  componente animado: con reduced-motion, todo visible y estático.
- Marquee de galería: `translate3d(0)` → `translate3d(-50%,0,0)`, ~42s lineal infinito,
  `animation-play-state:paused` en hover, desactivado con `prefers-reduced-motion`.
- Contadores de la tira de confianza: **SSR muestra el número final**; el conteo animado es
  un realce opcional client-side (easing cúbico ~1.1s), nunca arranca en 0 en el HTML.

## 5. Primitivas UI (derivadas del mockup)

Se implementan en FASE 1 dentro de `components/ui/`.

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

### `Placa`
Tarjeta base: `background:surface; border:1px solid hairline; border-radius:8px`. Variante
servicio: `overflow:hidden`, imagen 200px alto `object-fit:cover`, hover
`translateY(-4px)` + `border-color:rgba(233,188,79,.4)` + imagen `scale(1.05)` (0.6s).

### `Field` / `Select` / `TextArea`
`background:surface; border:1px solid hairline; border-radius:4px; color:crema; font:inherit;
font-size:15px; padding:13px 14px; width:100%`. Focus:
`outline:2px solid amarillo; outline-offset:1px; border-color:transparent`. Label 13.5px/500,
asterisco requerido en amarillo. Textarea `min-height:110px; resize:vertical`.
Flash de preselección: outline amarillo que se apaga en ~1.4s (`@keyframes flash`).

### `Reveal`
Wrapper fail-open sobre `motion`: hijo visible por defecto, `whileInView` una vez con el
ease del sistema; respeta `useReducedMotion()`.

## 6. Medidas específicas por sección (referencia rápida)

| Sección | Grid / detalle |
|---|---|
| Hero | `1.15fr .75fr`, gap 56px; media `max-width:400px`, `aspect-ratio:4/5`, radio 10px. |
| Servicios | `repeat(2,1fr)`, gap 18px; 2 placas `serv-wide` ocupan fila completa con imagen a un lado (`1.15fr 1fr`). Imagen 200px (wide hasta 270px). |
| Galería | 2 tracks marquee; `figure` 280px ancho, `img` 230px alto radio 8px. |
| Flor | `auto 1fr`, gap 44px, `padding:44px`, placa surface radio 10px; foto redonda 180px. |
| Reseñas | score Playfair 4rem + estrellas amarillas; grid `repeat(2,1fr)` gap 16px; meta con nombre 14/700 y servicio en mono 10px. |
| Proceso | `repeat(4,1fr)` gap 18px; cada paso con número Playfair itálico amarillo 1.9rem y borde superior hairline. |
| Empresas | banda `surface` con borde arriba/abajo; items como etiquetas + CTA a la derecha. |
| FAQ | `max-width:760px`; `<details>` con `summary` y marcador `+`→`×` (rota 45°) en amarillo. |
| Cotizador | `1.15fr .85fr` gap 52px; form + aside de contactos surface. |
| Footer | borde superior; wordmark + tagline + copyright, `crema-dim` 13.5px. |
