"use client";

import { useRef } from "react";
import { Section } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { faq } from "@/content/data";
import { resorteGsap, SALIDA_GSAP } from "@/lib/fisica";
import { alAcercarse, gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import styles from "./Faq.module.css";

const MQ_MOVIMIENTO = "(prefers-reduced-motion: no-preference)";

/**
 * Recalcula los ScrollTrigger cuando la lista terminó de cambiar de alto.
 * `true`: si hay un scroll en curso (Lenis), espera a que termine. Un solo
 * temporizador (hay una sola FAQ en la página).
 */
let temporizador = 0;
function programarRefresh(espera: number) {
  window.clearTimeout(temporizador);
  temporizador = window.setTimeout(() => ScrollTrigger.refresh(true), espera);
}

/**
 * Preguntas frecuentes: acordeón sobre <details>/<summary> nativos (teclado,
 * lectores de pantalla y buscar en la página funcionan solos).
 *
 * - Apertura/cierre: GSAP anima el alto del cuerpo (0 <-> auto) con los
 *   resortes de lib/fisica.ts como ease (resorteGsap): `panel` al abrir,
 *   `tacto` (más corto) al cerrar. El texto asienta con el mismo resorte y un
 *   fundido. Se puede interrumpir a mitad de camino (el alto parte del valor
 *   actual). Con reducir movimiento, el toggle es nativo.
 * - Entrada: la divisoria se dibuja de izquierda a derecha y la pregunta sube,
 *   una vez, con el resorte `entrada`, SOLO en los ítems que arrancan por
 *   debajo de la vista (fail-open: el HTML del servidor trae todo visible).
 * - Al cambiar el alto de la lista se recalculan los ScrollTrigger (lo de
 *   abajo, el cotizador y la entrada del pie, se corre).
 * - La entrada se arma al acercarse (alAcercarse, lib/gsap.ts), no al
 *   hidratar: no fija nada ni cambia el alto. El aviso de toggle y el
 *   acordeón están desde la hidratación.
 */
export function Faq() {
  const listaRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP(
    (_contexto, seguro) => {
      const lista = listaRef.current;
      if (!lista || !seguro) return;

      // Aperturas nativas (reducir movimiento, buscar en la página): el
      // evento toggle no burbujea, se escucha en captura.
      const alCambiar = () => programarRefresh(450);
      lista.addEventListener("toggle", alCambiar, true);

      // Entrada, al acercarse: con la lista a 1.5 pantallas todos los ítems
      // están abajo de la vista (los esconde fuera de ella). Con un ancla o
      // una recarga sobre la FAQ se arma enseguida y solo entran los de abajo.
      const armarEntrada = seguro(() => {
        gsap.matchMedia().add(MQ_MOVIMIENTO, () => {
          const items = gsap.utils.toArray<HTMLElement>(
            `.${styles.item}`,
            lista,
          );
          const vh = window.innerHeight;
          const abajo = items.filter(
            (el) => el.getBoundingClientRect().top >= vh,
          );
          if (!abajo.length) return;

          const linea = (el: Element) => el.querySelector(`.${styles.linea}`);
          const pregunta = (el: Element) => el.querySelector("summary");
          gsap.set(abajo.map(linea), { scaleX: 0 });
          gsap.set(abajo.map(pregunta), { opacity: 0, y: 14 });

          ScrollTrigger.batch(abajo, {
            start: "top 94%",
            once: true,
            onEnter: (lote) => {
              gsap.to(lote.map(linea), {
                scaleX: 1,
                ...resorteGsap("entrada"),
                stagger: { each: 0.07 },
              });
              gsap.to(lote.map(pregunta), {
                opacity: 1,
                y: 0,
                ...resorteGsap("entrada"),
                stagger: { each: 0.07 },
              });
            },
          });
        });
      });
      const cancelarEntrada = alAcercarse(lista, armarEntrada);

      return () => {
        cancelarEntrada();
        lista.removeEventListener("toggle", alCambiar, true);
        window.clearTimeout(temporizador);
      };
    },
    { scope: listaRef },
  );

  const alternar = contextSafe((ev: React.MouseEvent<HTMLElement>) => {
    const det = ev.currentTarget.parentElement;
    if (!(det instanceof HTMLDetailsElement)) return;
    // Reducir movimiento: toggle nativo (el evento toggle pide el refresh).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cuerpo = det.querySelector<HTMLElement>(`.${styles.cuerpo}`);
    const texto = cuerpo?.firstElementChild;
    if (!cuerpo || !texto) return;
    ev.preventDefault();

    const cerrando = det.dataset.estado === "cerrando";
    gsap.killTweensOf([cuerpo, texto]);

    if (!det.open || cerrando) {
      // Abrir (o retomar la apertura si se estaba cerrando).
      const desde = det.open ? cuerpo.offsetHeight : 0;
      const opacidad = det.open
        ? Number(gsap.getProperty(texto, "opacity"))
        : 0;
      det.dataset.estado = "abriendo";
      det.open = true;
      gsap.fromTo(
        cuerpo,
        { height: desde },
        {
          height: "auto",
          // Antes expo.out, que arrancaba a 6.9 veces su velocidad media.
          ...resorteGsap("panel"),
          onComplete: () => {
            gsap.set(cuerpo, { clearProps: "height" });
            delete det.dataset.estado;
            programarRefresh(0);
          },
        },
      );
      gsap.fromTo(
        texto,
        { opacity: opacidad, y: -8 },
        { opacity: 1, y: 0, ...resorteGsap("panel"), delay: 0.04 },
      );
    } else {
      // Cerrar: el alto baja a 0 y recién ahí se cierra el <details>.
      det.dataset.estado = "cerrando";
      // Las salidas son más cortas que las entradas: resorte `tacto`.
      gsap.to(cuerpo, {
        height: 0,
        ...resorteGsap("tacto"),
        onComplete: () => {
          det.open = false;
          gsap.set([cuerpo, texto], { clearProps: "all" });
          delete det.dataset.estado;
          programarRefresh(0);
        },
      });
      gsap.to(texto, { opacity: 0, ...SALIDA_GSAP });
    }
  });

  return (
    <Section id="faq" className={styles.seccion}>
      <SectionHead kicker={faq.head.kicker} title={faq.head.title} />
      <div ref={listaRef} className="max-w-[760px]">
        {faq.items.map((item) => (
          <div key={item.q} className={styles.item}>
            <details className={styles.det}>
              <summary
                onClick={alternar}
                className={`${styles.resumen} flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16.5px] font-medium text-crema [&::-webkit-details-marker]:hidden`}
              >
                <span className={styles.pregunta}>{item.q}</span>
                <span aria-hidden="true" className={styles.icono} />
              </summary>
              <div className={styles.cuerpo}>
                <p className="max-w-[60ch] pb-5 text-[15.5px] text-crema-dim">
                  {item.a}
                </p>
              </div>
            </details>
            {/* Fuera del <details>: su contenido se oculta cerrado. */}
            <span aria-hidden="true" className={styles.linea} />
          </div>
        ))}
      </div>
    </Section>
  );
}
