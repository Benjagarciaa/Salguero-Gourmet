import styles from "./Estrellas.module.css";

/**
 * Estrellas de la calificación (decorativas: el texto accesible lo pone quien
 * las usa). Cada estrella es un recorte con un riel tenue y un relleno amarillo
 * encima, LLENO por defecto: sin JS o con reducir movimiento se ven las cinco
 * completas. Para animarlas, los ganchos son `data-estrella` (la estrella) y
 * `data-estrella-relleno` (el relleno, que se escala en X desde la izquierda).
 * Tamaño: 1em, así que se dimensionan con el font-size del contenedor.
 */
export function Estrellas({ count }: { count: number }) {
  return (
    <span aria-hidden className="inline-flex gap-[0.2em]">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} data-estrella className={styles.estrella}>
          <span data-estrella-relleno className={styles.relleno} />
        </span>
      ))}
    </span>
  );
}
