// DECISIÓN DE BENJAMIN (30/9/2026): palabras gigantes en amarillo #e9bc4f macizo, con movimiento, sobre el fondo del sitio (sin banda amarilla, sin video ni canvas). Es la única excepción a la regla de dosis del amarillo. Sin líneas separadoras. No revertir.
"use client";

import { Fragment, useRef } from "react";
import { useQuote } from "@/components/chrome/QuoteContext";
import { Container } from "@/components/ui/Section";
import { Kicker } from "@/components/ui/Kicker";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Pill } from "@/components/ui/Pill";
import { Reveal } from "@/components/ui/Reveal";
import { TitleEm } from "@/components/ui/TitleEm";
import { empresas } from "@/content/data";
import { SCRUB, TRAMO } from "@/lib/fisica";
import { gsap, ScrollTrigger, useGSAPAlAcercarse } from "@/lib/gsap";
import { cn } from "@/lib/cn";
import styles from "./Empresas.module.css";

/**
 * Velocidad media del cruce: anchos de pantalla que se corre la fila de
 * adelante por cada alto de pantalla scrolleado (la aprobada: en px de fila
 * por px de scroll, 1.20 a 1440x900 y 1280x800, 1.00 a 1024x768, 0.69 a
 * 390x844 y 0.84 a 375x667). La curva (`CENTRO`) la reparte: más rápido al
 * entrar y al salir, lento en la pose de lectura.
 */
const VELOCIDAD = { escritorio: 0.75, mobile: 1.5 };
/**
 * Curva del cruce: velocidad con la sección centrada en pantalla, como
 * fracción de la media (nunca 0: las filas no se detienen). En compu, la
 * curva `deslizar` aprobada el 30/9 (0.55). En el celular la frase de lectura
 * casi llena el ancho ("Coffee breaks" deja 15 px por lado a 390), así que
 * pasa más despacio por la pose para que se alcance a leer entera.
 */
const CENTRO = { escritorio: 0.55, mobile: 0.12 };
/**
 * Profundidad entre filas: la de arriba va adelante (recorre todo y deriva más
 * en vertical); la de abajo va "más lejos" (se corre 0.9 de costado y apenas
 * deriva), como dos planos a distinta distancia. Deriva en em de la tira: con
 * la de abajo más quieta, las filas se separan apenas mientras cruzan.
 */
const PROFUNDIDAD = {
  cerca: { velocidad: 1, deriva: 0.08 },
  lejos: { velocidad: 0.9, deriva: 0.03 },
};
/** Vaivén de las cucharas (grados): se mecen con su fila, derechas en la pose de lectura. */
const VAIVEN = 12;
/**
 * Encendido: cada fila entra al 22% y se prende del todo mientras asoma, hasta
 * que su borde de abajo pasa el `borde` (fracción de la pantalla desde abajo).
 */
const ENCENDIDO = { desde: 0.22, borde: 0.08 };

/**
 * Curva del cruce (`deslizar`): rápido al entrar y al salir, lento con la
 * sección centrada en pantalla. `centro` es la pendiente en el medio (relativa
 * a la media); en las puntas vale 3 - 2·centro. Cúbica monótona de 0 a 1: la
 * velocidad nunca salta.
 */
const deslizar = (centro: number) => (p: number) => {
  const u = 2 * p - 1;
  return 0.5 + 0.5 * (centro * u + (1 - centro) * u * u * u);
};

/**
 * La cuchara del logo como separador entre palabras, en un solo trazado (la
 * unión del cuenco y el mango del wordmark: mismo dibujo, sin el solape).
 */
const CUCHARA =
  "M12.25 52.925A17 27 0 1 1 21.75 52.925L21.75 175.25A4.75 4.75 0 0 1 12.25 175.25Z";

function Cuchara() {
  return (
    <svg
      aria-hidden
      focusable="false"
      data-cuchara
      viewBox="0 0 34 180"
      className={styles.cuchara}
    >
      <path d={CUCHARA} />
    </svg>
  );
}

/** Una vuelta entera de la fila, decorativa (continúa la fila fuera de cuadro). */
function Vuelta({ items, inicio }: { items: string[]; inicio: boolean }) {
  return (
    <span aria-hidden>
      {items.map((it) => (
        <Fragment key={it}>
          {inicio && <Cuchara />}
          {it}
          {!inicio && <Cuchara />}
        </Fragment>
      ))}
    </span>
  );
}

/**
 * Una fila de palabras gigantes. Su caja es solo la FRASE DE LECTURA
 * (`items[frase]`): es lo que se centra en pantalla (en el HTML y, con
 * movimiento, con la sección centrada). Las demás palabras reales cuelgan a
 * los costados en dos tiras absolutas, en su orden (los lectores de pantalla
 * leen la fila completa, con comas), y cada tira sigue con una vuelta entera
 * decorativa (aria-hidden), así la fila puede correrse para los dos lados sin
 * dejar un hueco.
 */
function Fila({
  items,
  frase,
  className,
}: {
  items: string[];
  frase: number;
  className?: string;
}) {
  const antes = items.slice(0, frase);
  const despues = items.slice(frase + 1);
  return (
    <p data-fila className={cn("relative w-max whitespace-nowrap", className)}>
      <span data-punta className="absolute right-full top-0">
        <Vuelta items={items} inicio={false} />
        {antes.map((it) => (
          <Fragment key={it}>
            {it}
            <span className="sr-only">, </span>
            <Cuchara />
          </Fragment>
        ))}
      </span>
      {items[frase]}
      <span data-punta className="absolute left-full top-0">
        {despues.map((it) => (
          <Fragment key={it}>
            <span className="sr-only">, </span>
            <Cuchara />
            {it}
          </Fragment>
        ))}
        <Vuelta items={items} inicio />
      </span>
    </p>
  );
}

/**
 * 3 · Empresas (después de Servicios, decisión de Benjamin 30/9/2026):
 * palabras gigantes en amarillo macizo sobre el fondo del sitio, sin banda ni
 * líneas.
 *
 * Composición (390 y 1440): arriba, dos filas a sangre de dos palabras cada una
 * (separadas por la cuchara del logo) que cruzan de costado con el scroll, una
 * hacia cada lado. Cada fila tiene su frase de lectura centrada: "Coffee
 * breaks" arriba y "Agasajos" abajo (la primera de `arriba` y la última de
 * `abajo` en content/data.ts). Abajo, un solo bloque centrado: kicker, título
 * ("come bien" en itálica amarilla), etiquetas con datos para decidir y CTA
 * (pill amarilla primaria, deja preseleccionado el coffee break en el
 * cotizador).
 *
 * Movimiento (todo con scrub directo SCRUB, atado a la sección):
 * - Cruce: con la sección centrada en pantalla cada fila pasa por su pose de
 *   lectura (la del HTML: su frase entera y centrada), y antes y después se
 *   corre hacia su lado con la curva `deslizar`: rápido al entrar y al salir,
 *   lento en la pose. La de arriba va a la izquierda (al entrar asoma
 *   "Desayunos" por la izquierda y al salir por la derecha); la de abajo, a la
 *   derecha. Profundidad: la de abajo se corre menos y deriva menos en
 *   vertical.
 * - Vaivén: las cucharas se mecen con su fila (cada fila hacia su lado),
 *   derechas en la pose de lectura.
 * - Encendido: cada fila entra tenue y se prende (opacidad, TRAMO) mientras
 *   asoma por abajo; la de abajo, un poco después.
 * Solo transform y opacidad, sobre la misma capa de cada fila (will-change
 * solo cerca de la sección): moverlas y prenderlas no repinta el texto.
 *
 * Fail-open: el HTML del servidor es la pose de lectura (amarillo pleno,
 * cucharas derechas, las dos frases enteras y centradas). Con reducir
 * movimiento o sin JS queda así. Nada de estado de React por cuadro.
 *
 * Se arma al acercarse (useGSAPAlAcercarse, lib/gsap.ts), no al hidratar: no
 * fija nada ni cambia el alto, y nada arranca antes de 1 pantalla de entrar.
 */
export function Empresas() {
  const raiz = useRef<HTMLElement>(null);
  const tira = useRef<HTMLDivElement>(null);
  const { setServicio } = useQuote();

  useGSAPAlAcercarse(
    () => {
      const raizEl = raiz.current;
      const tiraEl = tira.current;
      if (!raizEl || !tiraEl) return;
      const filas = gsap.utils.toArray<HTMLElement>("[data-fila]", tiraEl);
      if (filas.length !== 2) return;
      const [arriba, abajo] = filas;
      const cucharasDe = (fila: HTMLElement) =>
        gsap.utils.toArray<SVGSVGElement>("[data-cuchara]", fila);
      const cucharasArriba = cucharasDe(arriba);
      const cucharasAbajo = cucharasDe(abajo);
      const cucharas = [...cucharasArriba, ...cucharasAbajo];

      const mm = gsap.matchMedia();
      mm.add(
        {
          escritorio: "(min-width: 760px)",
          movimiento: "(prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const { escritorio, movimiento } = ctx.conditions as {
            escritorio: boolean;
            movimiento: boolean;
          };
          // Reducir movimiento: versión quieta (la del servidor).
          if (!movimiento) return;

          const k = escritorio ? VELOCIDAD.escritorio : VELOCIDAD.mobile;
          const curva = deslizar(
            escritorio ? CENTRO.escritorio : CENTRO.mobile,
          );
          /** Corrimiento (px) de la curva, de -1 a 1 alrededor de la pose. */
          const g = (u: number) => 2 * curva((Math.max(-1, Math.min(1, u)) + 1) / 2) - 1;

          /**
           * Medio recorrido de una fila (px): la fila va de +medio a -medio
           * (o al revés) mientras el trigger va de "la sección asoma abajo" a
           * "la sección se fue arriba"; en el medio (sección centrada) está en
           * la pose del HTML. Es el de la velocidad media aprobada, sin
           * destapar las puntas mientras la fila está a la vista. Todo con
           * medidas de layout (offset*, sin transformaciones): da lo mismo en
           * cualquier punto del scroll y se recalcula en cada refresh.
           */
          const medio = (
            fila: HTMLElement,
            velocidad: number,
            haciaIzquierda: boolean,
          ) => {
            const ancho = tiraEl.clientWidth;
            const alto = window.innerHeight;
            const largo = alto + raizEl.offsetHeight;
            let x = ((k * ancho) / alto) * velocidad * (largo / 2);
            // Tramo a la vista (u de -1 a 1 en todo el trigger).
            const arribaFila = tiraEl.offsetTop + fila.offsetTop;
            const uEntra = (2 * arribaFila) / largo - 1;
            const uSale =
              (2 * (alto + arribaFila + fila.offsetHeight)) / largo - 1;
            // Lo que cuelga a cada lado más allá del borde de la pantalla.
            const [antes, despues] = fila.querySelectorAll<HTMLElement>(
              ":scope > [data-punta]",
            );
            const izquierda = (antes?.offsetWidth ?? 0) - fila.offsetLeft;
            const derecha =
              fila.offsetLeft +
              fila.offsetWidth +
              (despues?.offsetWidth ?? 0) -
              ancho;
            // Al entrar la fila está corrida hacia el lado contrario al que
            // viaja; al salir, hacia el suyo.
            const [alEntrar, alSalir] = haciaIzquierda
              ? [izquierda, derecha]
              : [derecha, izquierda];
            if (g(uEntra) < 0) x = Math.min(x, alEntrar / -g(uEntra));
            if (g(uSale) > 0) x = Math.min(x, alSalir / g(uSale));
            return Math.max(0, x);
          };
          /** Deriva vertical en px (la tira define el em). */
          const deriva = (em: number) =>
            parseFloat(getComputedStyle(tiraEl).fontSize) * em;

          /* ---- Capas de GPU solo cerca de la sección ---- */
          // Filas (transform y opacidad sobre la misma capa) y cucharas (su
          // giro no repinta la fila). En 2D (force3D false en los tweens): sin
          // will-change no son capa.
          let conCapa = false;
          const capa = (quiere: boolean) => {
            if (quiere === conCapa) return;
            conCapa = quiere;
            gsap.set(filas, {
              willChange: quiere ? "transform, opacity" : "auto",
            });
            gsap.set(cucharas, { willChange: quiere ? "transform" : "auto" });
          };
          ScrollTrigger.create({
            trigger: raizEl,
            start: "top bottom+=100%",
            end: "bottom top-=100%",
            refreshPriority: 0,
            onToggle: (self) => capa(self.isActive),
            onRefresh: (self) => capa(self.isActive),
          });

          /* ---- Cruce, profundidad y vaivén ---- */
          // Atado a la sección: el medio del trigger es la sección centrada en
          // pantalla, y ahí cada fila queda en la pose del HTML.
          const { cerca, lejos } = PROFUNDIDAD;
          gsap
            .timeline({
              defaults: { ease: "none", force3D: false },
              scrollTrigger: {
                trigger: raizEl,
                start: "top bottom",
                end: "bottom top",
                scrub: SCRUB,
                invalidateOnRefresh: true,
                // Presente: ordena los refresh por posición en la página (los
                // pines de arriba se calculan antes).
                refreshPriority: 0,
              },
            })
            .fromTo(
              arriba,
              { x: () => medio(arriba, cerca.velocidad, true) },
              { x: () => -medio(arriba, cerca.velocidad, true), ease: curva },
              0,
            )
            .fromTo(
              abajo,
              { x: () => -medio(abajo, lejos.velocidad, false) },
              { x: () => medio(abajo, lejos.velocidad, false), ease: curva },
              0,
            )
            .fromTo(
              arriba,
              { y: () => deriva(cerca.deriva) },
              { y: () => -deriva(cerca.deriva) },
              0,
            )
            .fromTo(
              abajo,
              { y: () => deriva(lejos.deriva) },
              { y: () => -deriva(lejos.deriva) },
              0,
            )
            .fromTo(
              cucharasArriba,
              { rotation: VAIVEN },
              { rotation: -VAIVEN, ease: curva },
              0,
            )
            .fromTo(
              cucharasAbajo,
              { rotation: -VAIVEN },
              { rotation: VAIVEN, ease: curva },
              0,
            );

          /* ---- Encendido ---- */
          // Cada fila con su tramo: de que asoma su borde de arriba a que su
          // borde de abajo pasa el `borde` (la de abajo, por estar más abajo,
          // se prende un poco después). Medido sobre la tira (su layout, sin
          // las transformaciones de las filas). En la tarea siguiente al cruce:
          // la escena se arma mientras la persona scrollea (al acercarse) y de
          // una sola vez eran ~80 ms de bloqueo en un celular de gama media.
          const pie = `${Math.round((1 - ENCENDIDO.borde) * 100)}%`;
          const encender = ctx.add("encender", () => {
            filas.forEach((fila) => {
              gsap.fromTo(
                fila,
                { opacity: ENCENDIDO.desde },
                {
                  opacity: 1,
                  ease: TRAMO,
                  scrollTrigger: {
                    trigger: tiraEl,
                    start: () => `top+=${fila.offsetTop} bottom`,
                    end: () =>
                      `top+=${fila.offsetTop + fila.offsetHeight} ${pie}`,
                    scrub: SCRUB,
                    invalidateOnRefresh: true,
                    refreshPriority: 0,
                  },
                },
              );
            });
          }) as () => void;
          const esperaEncendido = window.setTimeout(encender, 0);

          return () => {
            window.clearTimeout(esperaEncendido);
            gsap.set([...filas, ...cucharas], { clearProps: "willChange" });
          };
        },
      );

      return () => mm.revert();
    },
    { scope: raiz },
  );

  return (
    // data-sin-bocaditos: los bocaditos que caen (chrome/Bocaditos) se apagan
    // en esta sección (no pasan por detrás de las letras gigantes).
    // Aire de arriba (va después de Servicios): en mobile 44px, así con los
    // 76px de Servicios quedan los 120px que había cuando venía después de
    // Cómo trabajamos. Desde 760px, 40px: el pin de Servicios (mazo) ya deja
    // su propio aire debajo de la última placa.
    <section
      ref={raiz}
      id="empresas"
      aria-labelledby="empresas-titulo"
      data-sin-bocaditos
      className={cn(styles.seccion, "relative pt-11 min-[760px]:pt-10")}
    >
      {/* Tira: recorta las filas de costado. El font-size vive acá (los em de
          abajo dependen de él; con él se mide el recorrido): el cuerpo está
          elegido para que la frase de lectura más larga ("Coffee breaks", 8.4
          em) entre entera con aire: 11vw en el celular (15 px por lado a 390
          y a 375), 9.5vw desde 760px (146 px por lado a 1440). El margen
          negativo con su padding deja lugar a la J y a la deriva vertical sin
          sumar alto. data-sin-cuchara: la cuchara de progreso se oculta
          mientras las letras gigantes (a sangre) pasan por su altura. */}
      <div
        ref={tira}
        data-sin-cuchara
        className="relative -my-[0.25em] overflow-hidden py-[0.25em] font-display text-[clamp(36px,11vw,64px)] min-[760px]:text-[clamp(72px,9.5vw,176px)]"
      >
        <div className="font-black uppercase leading-[0.86] tracking-normal text-amarillo">
          <Container className="flex flex-col items-center">
            <Fila items={empresas.palabras.arriba} frase={0} />
            <Fila
              items={empresas.palabras.abajo}
              frase={empresas.palabras.abajo.length - 1}
            />
          </Container>
        </div>
      </div>

      {/* pb 76px: la Galería no tiene aire arriba (vive del de la sección
          anterior); es el mismo que le dejaba Servicios. */}
      <Container className="pb-[76px] pt-9 text-center min-[760px]:pt-12">
        <Reveal y={16}>
          <Kicker className="justify-center">{empresas.kicker}</Kicker>
          <h2
            id="empresas-titulo"
            className="mt-[14px] font-display text-[30px] font-medium leading-[1.12] text-crema min-[760px]:mt-4 min-[760px]:text-[42px] min-[760px]:leading-[1.1]"
          >
            {empresas.title.pre}
            <TitleEm className="block text-[44px] font-semibold leading-none min-[760px]:inline min-[760px]:text-[54px]">
              {empresas.title.em}
            </TitleEm>
            {empresas.title.post}
          </h2>
        </Reveal>
        <ul
          role="list"
          className="mt-[18px] flex flex-wrap justify-center gap-x-[18px] gap-y-[10px] text-[11px] min-[760px]:mt-6 min-[760px]:gap-x-[30px]"
        >
          {empresas.items.map((it, i) => (
            <li key={it}>
              <Reveal y={10} delay={0.06 * i}>
                <Etiqueta>{it}</Etiqueta>
              </Reveal>
            </li>
          ))}
        </ul>
        <Reveal
          y={16}
          delay={0.12}
          className="mt-7 flex justify-center min-[760px]:mt-8"
        >
          {/* L3: deja preseleccionado el coffee break en el cotizador (el
              mismo mecanismo que las placas de Servicios). */}
          <Pill
            href={empresas.cta.href}
            onClick={() => setServicio(empresas.servicio)}
            className={styles.cta}
          >
            {empresas.cta.label}
          </Pill>
        </Reveal>
      </Container>
    </section>
  );
}
