# Salguero Gourmet · Landing

Landing de una sola página de **Salguero Gourmet** (catering y pastelería en Córdoba
capital). Tiene un único objetivo: que la persona pida presupuesto por WhatsApp desde el
cotizador. Publicada en [salguerogourmet.com](https://salguerogourmet.com).

Stack: Next.js 16 (app router) + TypeScript + Tailwind v4 + GSAP/ScrollTrigger + Lenis +
framer-motion. Sin backend. Deploy en Vercel.

## Cómo correrlo

```bash
npm install
npm run dev                              # desarrollo en http://localhost:3000
npm run build && npx next start -p 3100  # build de producción en http://localhost:3100
```

Las mediciones de rendimiento (Lighthouse) se hacen siempre sobre el build de producción,
nunca sobre `npm run dev`.

```bash
npm run check   # tipos (tsc) + lint (eslint) + tests; lo mismo corre el CI de GitHub en cada push
npm test        # solo los tests (tests/, corren con Node, sin dependencias)
```

## Dónde está cada cosa

- **Copy y datos:** todo el texto del sitio vive en `content/data.ts`, tipado. Para cambiar
  un texto, se cambia ahí.
- **Secciones:** `components/sections/` (una por sección), `components/ui/` (primitivas) y
  `components/chrome/` (nav, pie, smooth scroll, JSON-LD).
- **Media:** `public/media/` (fotos, clips y las secuencias de cuadros del hero).
- **`_assets/`:** material de referencia del cliente (mockup aprobado y fotos elegidas).
  No va al deploy.

## Documentación

- `CLAUDE.md`: reglas del proyecto (fuentes de verdad, paleta, animación, stack).
- `DESIGN.md`: sistema de diseño transcripto del mockup aprobado.
- `PENDIENTES.md`: lo que falta confirmar y las notas técnicas.

## Ramas

- `main`: producción (lo que se ve en salguerogourmet.com).
- `dopamina`: rama de prueba. Vercel arma una vista previa de cada push; lo que se aprueba
  ahí pasa a `main`.
