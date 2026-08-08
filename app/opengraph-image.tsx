import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

const star = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" fill="#E9BC4F"/></svg>',
)}`;

export default async function OgImage() {
  const photo = readFileSync(join(process.cwd(), "public/media/hero-poster.jpg"));
  const photoSrc = `data:image/jpeg;base64,${photo.toString("base64")}`;

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
          background: BG,
          color: CREMA,
          fontFamily: "Playfair Display, serif",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 28,
              letterSpacing: 6,
              fontWeight: 700,
            }}
          >
            <span>SALGUERO</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spoon} width={11} height={58} alt="" />
            <span>GOURMET</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
            <span style={{ fontSize: 82, fontWeight: 700, lineHeight: 1.02, color: AMBER, fontStyle: "italic" }}>
              Gastronomía
            </span>
            <span style={{ fontSize: 82, fontWeight: 700, lineHeight: 1.02, color: AMBER, fontStyle: "italic" }}>
              de autor
            </span>
          </div>

          <span style={{ fontSize: 31, fontWeight: 500, color: DIM, marginTop: 26, maxWidth: 540 }}>
            Catering para empresas, instituciones y eventos en Córdoba.
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 30, fontSize: 26, fontWeight: 500 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={star} width={26} height={26} alt="" />
            <span style={{ color: AMBER }}>5.0</span>
            <span>en Google</span>
            <span style={{ color: DIM, marginLeft: 6 }}>·</span>
            <span>+200 eventos</span>
          </div>
        </div>

        <div style={{ width: 468, height: "100%", display: "flex", position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc}
            width={468}
            height={630}
            alt=""
            style={{ objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, #241C15 0%, rgba(36,28,21,0) 34%)",
            }}
          />
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
