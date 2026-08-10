"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Devuelve un `ref` y un booleano `near` que pasa a `true` cuando el elemento se
 * acerca al viewport (con `rootMargin` de anticipación). Sirve para montar
 * componentes pesados below-the-fold recién cuando hacen falta: su JS no se
 * descarga ni ejecuta durante la hidratación inicial, que es donde se acumula el
 * Total Blocking Time en mobile.
 *
 * Fail-safe: si no hay IntersectionObserver, monta de una (`near = true`).
 */
export function useNearViewport<T extends Element>(rootMargin = "600px 0px") {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, rootMargin]);

  return { ref, near };
}
