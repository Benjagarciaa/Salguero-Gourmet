/**
 * Fondo ambiental: dos glows ámbar que derivan lento detrás de todo el contenido
 * (da "vida" constante sin distraer). Es pura decoración CSS (ver .ambient en
 * globals.css); fixed, aria-hidden y sin eventos de puntero. Con reduced-motion,
 * el reset global congela la animación y los glows quedan estáticos y sutiles.
 */
export function AmbientBackground() {
  return (
    <div className="ambient" aria-hidden>
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
    </div>
  );
}
