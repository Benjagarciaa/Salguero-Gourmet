import { ImageResponse } from "next/og";
import { site } from "@/content/data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${site.name} · catering gourmet de autor en Córdoba`;

/** Carga una variante de Playfair Display desde Google Fonts (con fallback). */
async function loadPlayfair(weight: number, italic = false) {
  try {
    const axis = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Playfair+Display:${axis}`,
        { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } },
      )
    ).text();
    const url = css.match(/src:\s*url\((https:[^)]+)\)/)?.[1];
    if (url) return await (await fetch(url)).arrayBuffer();
  } catch {
    // sin red -> ImageResponse usa la fuente por defecto
  }
  return null;
}

const AMBER = "#E9BC4F";
const CREMA = "#F5EEE0";
const DIM = "#B5A691";
const BG = "#241C15";

const spoon = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 180"><g fill="#E9BC4F"><ellipse cx="17" cy="27" rx="17" ry="27"/><rect x="12.25" y="48" width="9.5" height="132" rx="4.75"/></g></svg>',
)}`;

export default async function OgImage() {
  const [p700, p500, p700i] = await Promise.all([
    loadPlayfair(700),
    loadPlayfair(500),
    loadPlayfair(700, true),
  ]);
  const fonts = [];
  if (p500)
    fonts.push({ name: "Playfair Display", data: p500, weight: 500 as const, style: "normal" as const });
  if (p700)
    fonts.push({ name: "Playfair Display", data: p700, weight: 700 as const, style: "normal" as const });
  if (p700i)
    fonts.push({ name: "Playfair Display", data: p700i, weight: 700 as const, style: "italic" as const });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: BG,
          color: CREMA,
          fontFamily: "Playfair Display, serif",
          position: "relative",
        }}
      >
        {/* glow ambiental */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 42%, rgba(233,188,79,0.18) 0%, rgba(233,188,79,0) 58%)",
          }}
        />
        {/* marco fino */}
        <div
          style={{
            position: "absolute",
            top: 42,
            left: 42,
            right: 42,
            bottom: 42,
            border: "1px solid rgba(245,238,224,0.16)",
            borderRadius: 20,
          }}
        />

        {/* kicker */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 9, height: 9, background: AMBER }} />
          <span
            style={{
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: 8,
              color: DIM,
            }}
          >
            CATERING GOURMET · CÓRDOBA
          </span>
        </div>

        {/* wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginTop: 30,
            fontSize: 78,
            fontWeight: 700,
            letterSpacing: 10,
          }}
        >
          <span>SALGUERO</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={spoon} width={18} height={95} alt="" />
          <span>GOURMET</span>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
