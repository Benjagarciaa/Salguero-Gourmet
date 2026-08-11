import { ImageResponse } from "next/og";

/**
 * Favicon generado como PNG (via ImageResponse/Satori): la cuchara amarilla de la
 * marca sobre el fondo oscuro. Mismo diseño que el de siempre (cuchara #E9BC4F
 * sobre #241C15), pero en raster para que Google lo tome bien en los resultados
 * de búsqueda, además de en la pestaña del navegador. Se prerenderiza en build.
 */
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

const spoon = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 180"><g fill="#E9BC4F"><ellipse cx="17" cy="27" rx="17" ry="27"/><rect x="12.25" y="48" width="9.5" height="132" rx="4.75"/></g></svg>',
)}`;

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#241C15",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={spoon} width={28} height={150} alt="" />
      </div>
    ),
    { ...size },
  );
}
