"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Section";
import { Kicker } from "@/components/ui/Kicker";
import { Etiqueta } from "@/components/ui/Etiqueta";
import {
  alAcercarse,
  altoNav,
  anticiparPin,
  capaActiva,
  conCostura,
  gsap,
  prepararTransformes,
  ScrollTrigger,
  scrollNativo,
  useGSAPEnCola,
} from "@/lib/gsap";
import { COSTURA, OPACIDAD_GSAP, SCRUB, TRAMO } from "@/lib/fisica";
import { flor } from "@/content/data";
import styles from "./Flor.module.css";

/* ==========================================================================
 * La cocina de Flor: la foto se abre desde un círculo chico (el avatar del
 * mockup, centrado en la cara de Flor) hasta verse entera, mientras el título
 * y el texto se encienden palabra por palabra.
 *
 * Técnica: el marco 3:4 recorta; adentro, un contenedor centrado en el marco y
 * apenas más grande que su diagonal (sin recorte propio, cubre el marco
 * entero: esa es la versión quieta). Al armarse, el contenedor recorta con
 * clip-path: inset(... round r): arranca como un cuadrado de DIAMETRO_INICIAL
 * con radio de la mitad del lado (un círculo) centrado en la cara de Flor, y
 * cada borde viaja hasta el del marco mientras el radio baja a RADIO_FINAL.
 * Así pasa de círculo a rectángulo redondeado sin la forma intermedia de
 * círculo cortado por el rectángulo (un "octógono" con cuatro arcos), que en
 * mobile (sin pin) podía quedar en reposo. Un recorte rectangular redondeado
 * lo resuelve el compositor (como el de overflow con border-radius); la foto,
 * adentro, solo lleva el acercamiento leve (ZOOM_INICIAL a 1, anclado en la
 * cara) con transform. La geometría sale de FOCO y PROPORCION.
 *
 * Modos (gsap.matchMedia, todo se revierte al desmontar o al cambiar de modo):
 *   - Desktop con alto (MQ.escena): la escena se fija debajo del nav (pin +
 *     scrub) durante RECORRIDO pantallas: el círculo se abre, el título se
 *     enciende y después el texto, en un solo timeline.
 *   - Desktop bajo: la misma coreografía, sin pin, mientras la escena cruza
 *     la pantalla.
 *   - Mobile y tablet (una columna): sin pin. Cada pieza se anima con scrub
 *     mientras cruza la pantalla (la foto, el título y el texto por separado).
 *   - Reducir movimiento: nada se arma (versión quieta).
 * Fail-open: el HTML del servidor trae la foto entera (círculo a escala 1) y
 * el texto pleno; sin JS o con reducir movimiento se queda así. GSAP pone el
 * estado inicial recién al armarse, con la sección todavía debajo del fold.
 * Rendimiento: nada de estado de React por cuadro; los transforms se escriben
 * directo en el estilo y el resto son tweens de opacidad. La capa del círculo
 * (máscara redondeada) se crea dos pantallas antes de que la escena llegue
 * (capaActiva), no cuando aparece (eran cuadros de 100 a 133 ms en mobile).
 *
 * Física (lib/fisica.ts): scrub directo (SCRUB) en todos los modos; la escena
 * fijada lleva costura (conCostura sobre .grid, el envoltorio de las dos
 * columnas: el círculo y la foto se escriben en su propio estilo y no tocan su
 * `y`). El acercamiento sale con TRAMO.
 *
 * No reusa PalabrasQueSeEncienden: aquella mide la posición del título con
 * useScroll de motion, que no sigue al pin de ScrollTrigger (el título queda
 * quieto mientras la escena está fijada). Acá el encendido vive en el mismo
 * timeline que la foto, con las mismas reglas (tenue 0.4 en títulos, cascada)
 * y la misma red: si el scroll se detiene con el título a mitad de encenderse
 * (o el texto), se termina por tiempo (completarAlDetener).
 * ========================================================================== */

/** Punto de la foto (fracción del ancho y del alto) donde nace el círculo: la cara y los hombros de Flor. */
const FOCO = { x: 0.355, y: 0.43 };
/** Proporción del marco (ancho / alto): la de la foto, así se ve entera. */
const PROPORCION = 3 / 4;
/** Diámetro del círculo al empezar, en px (el avatar del mockup era de 180). */
const DIAMETRO_INICIAL = { ancho: 180, angosto: 150 };
/** Acercamiento de la foto al empezar; vuelve a 1 mientras el círculo se abre. */
const ZOOM_INICIAL = 1.1;
/** Radio (px) del recorte al terminar de abrirse: el de las esquinas del marco. */
const RADIO_FINAL = 10;
/**
 * Opacidad de una palabra todavía apagada (tenue, nunca invisible). 0.4 deja el
 * crema en ~3.4:1 sobre el fondo: AA para texto grande (el título, y el texto
 * en desktop, que va a 24px o más). En mobile el texto es de tamaño normal y
 * necesita 4.5:1: ahí arranca en 0.55 (~5.3:1, con margen para el resplandor
 * ambiental del fondo).
 */
const TENUE = { titulo: 0.4, cuerpoAncho: 0.4, cuerpoAngosto: 0.55 };
/** Separación (s) entre palabras al terminar de encenderse por tiempo. */
const ESCALON = 0.04;
/** Desktop: pantallas de scroll que dura la escena fijada. */
const RECORRIDO = 1.1;

/**
 * El corte de la escena es el mismo que el de Flor.module.css. `angosto` está
 * para que siempre haya una condición que se cumpla (matchMedia solo corre la
 * función si alguna se cumple).
 */
const MQ = {
  ancho: "(min-width: 860px)",
  angosto: "(max-width: 859.98px)",
  escena: "(min-width: 860px) and (min-height: 640px)",
  reduce: "(prefers-reduced-motion: reduce)",
};
type Condiciones = Record<keyof typeof MQ, boolean>;

/* --------------------------------------------------------------------------
 * Geometría (en anchos del marco). El círculo va centrado en el marco y a
 * escala 1 tiene que cubrirlo entero: su radio es media diagonal (con 1% de
 * aire). Así el final de la animación es exactamente el estado del servidor.
 * ------------------------------------------------------------------------ */
const ALTO = 1 / PROPORCION;
const RADIO = 1.01 * 0.5 * Math.hypot(1, ALTO);
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
const GEOMETRIA = {
  circulo: {
    left: "50%",
    top: "50%",
    width: pct(2 * RADIO),
    // Los márgenes en % se miden sobre el ANCHO del marco (también el de arriba).
    marginLeft: pct(-RADIO),
    marginTop: pct(-RADIO),
  },
  // Dentro del círculo (que mide 2 * RADIO de lado), la foto ocupa exactamente
  // el lugar del marco. Escala desde su centro (el mismo punto que el círculo).
  foto: {
    left: pct((RADIO - 0.5) / (2 * RADIO)),
    top: pct((RADIO - 0.5 * ALTO) / (2 * RADIO)),
    width: pct(1 / (2 * RADIO)),
    height: pct(ALTO / (2 * RADIO)),
  },
} satisfies Record<string, CSSProperties>;

/** Parte un texto en palabras (spans) sin tocar los espacios: el corte de línea no cambia. */
function trocear(texto: string): ReactNode[] {
  return texto.split(/(\s+)/).map((t, i) =>
    !t || /^\s+$/.test(t) ? (
      t
    ) : (
      <span key={i} data-palabra="">
        {t}
      </span>
    ),
  );
}

export function Flor() {
  const rootRef = useRef<HTMLElement>(null);
  const escenaRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const marcoRef = useRef<HTMLDivElement>(null);
  const circuloRef = useRef<HTMLDivElement>(null);
  const fotoRef = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const cuerpoRef = useRef<HTMLParagraphElement>(null);
  const emRef = useRef<HTMLElement>(null);

  useGSAPEnCola(
    () => {
      const root = rootRef.current;
      const escena = escenaRef.current;
      const grid = gridRef.current;
      const marco = marcoRef.current;
      const circulo = circuloRef.current;
      const foto = fotoRef.current;
      const titulo = tituloRef.current;
      const cuerpo = cuerpoRef.current;
      const em = emRef.current;
      if (!root || !escena || !grid || !marco || !circulo || !foto) return;
      if (!titulo || !cuerpo || !em) return;

      const mm = gsap.matchMedia();
      mm.add(MQ, (ctx) => {
        const {
          ancho,
          escena: conEscena,
          reduce,
        } = ctx.conditions as Condiciones;
        if (reduce) return;

        const palabrasTitulo = Array.from(
          titulo.querySelectorAll<HTMLElement>("[data-palabra]"),
        );
        const palabrasCuerpo = Array.from(
          cuerpo.querySelectorAll<HTMLElement>("[data-palabra]"),
        );
        const lineas: gsap.core.Timeline[] = [];
        const quitarDetener: Array<() => void> = [];
        let quitarCostura = () => {};
        let quitarCapa = () => {};
        let quitarPalabras = () => {};

        // Apertura: r (0 a 1) abre el recorte desde la cara de Flor hasta el
        // marco; z (0 a 1) saca el acercamiento, anclado en la cara (la cara
        // no se mueve mientras el resto se aleja). Todo en px relativos al
        // centro del marco (C), con v = cara - C:
        //   recorte: cada borde va del cuadrado inicial (lado D, centrado en
        //            v) al del marco; el radio, de D/2 a RADIO_FINAL;
        //   foto:    translate(v * (1 - zoom)) scale(zoom)
        // (así la foto queda en F + zoom * (q - F)). Con r = z = 1 el recorte
        // es el marco y la foto la identidad: se sacan los dos y queda el
        // estado del servidor. Se escribe directo en el estilo (sin React y
        // sin la caché de transforms de GSAP).
        const estado = { r: 0, z: 0 };
        let geo = { lado: 0, w: 0, h: 0, d: 0, v: { x: 0, y: 0 } };
        const aplicar = () => {
          const { lado, w, h, d, v } = geo;
          const r = estado.r;
          const zoom = ZOOM_INICIAL + (1 - ZOOM_INICIAL) * estado.z;
          if (r >= 1 || !(lado > 0)) {
            circulo.style.removeProperty("clip-path");
          } else {
            const mezcla = (a: number, b: number) => a + (b - a) * r;
            const arriba = mezcla(v.y - d / 2, -h / 2);
            const abajo = mezcla(v.y + d / 2, h / 2);
            const izq = mezcla(v.x - d / 2, -w / 2);
            const der = mezcla(v.x + d / 2, w / 2);
            const radio = mezcla(d / 2, RADIO_FINAL);
            const m = lado / 2;
            circulo.style.clipPath = `inset(${(m + arriba).toFixed(2)}px ${(m - der).toFixed(2)}px ${(m - abajo).toFixed(2)}px ${(m + izq).toFixed(2)}px round ${radio.toFixed(2)}px)`;
          }
          if (zoom === 1) {
            foto.style.removeProperty("transform");
          } else {
            const tx = v.x * (1 - zoom);
            const ty = v.y * (1 - zoom);
            foto.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${zoom.toFixed(5)})`;
          }
        };
        // El tamaño real del contenedor y del marco depende del ancho: se miden
        // en cada refresh (resize) para que el círculo chico mida siempre lo
        // mismo.
        const medir = () => {
          const w = marco.offsetWidth;
          const h = marco.offsetHeight;
          const inicial = ancho
            ? DIAMETRO_INICIAL.ancho
            : DIAMETRO_INICIAL.angosto;
          geo = {
            lado: circulo.offsetWidth,
            w,
            h,
            d: Math.min(inicial, w, h),
            v: { x: (FOCO.x - 0.5) * w, y: (FOCO.y - 0.5) * h },
          };
          aplicar();
        };
        const abrir = (tl: gsap.core.Timeline, duracion: number) => {
          tl.to(
            estado,
            {
              r: 1,
              duration: duracion,
              ease: TRAMO,
              onUpdate: aplicar,
            },
            0,
          );
          tl.to(
            estado,
            {
              z: 1,
              duration: duracion * 1.25,
              ease: TRAMO,
              onUpdate: aplicar,
            },
            0,
          );
        };
        // Cascada: cada palabra pasa de tenue a plena en `solape` del tramo, y
        // la siguiente arranca antes de que termine la anterior.
        const encender = (
          tl: gsap.core.Timeline,
          palabras: HTMLElement[],
          tenue: number,
          desde: number,
          hasta: number,
          solape: number,
        ) => {
          const n = palabras.length;
          if (!n) return undefined;
          const tramo = hasta - desde;
          const duracion = n > 1 ? tramo * solape : tramo;
          tl.fromTo(
            palabras,
            { opacity: tenue },
            {
              opacity: 1,
              duration: duracion,
              stagger: n > 1 ? (tramo - duracion) / (n - 1) : 0,
            },
            desde,
          );
          return tl.recent() as gsap.core.Tween;
        };
        // Si el scroll se detiene (ScrollTrigger "scrollEnd") con el encendido
        // empezado y sin terminar, las palabras dejan el scrub y las que
        // faltan se encienden por tiempo, en cascada (OPACIDAD_GSAP). Una sola
        // vez: ya no vuelven a tenue. Mientras se scrollea no cambia nada.
        const completarAlDetener = (
          tw: gsap.core.Tween | undefined,
          palabras: HTMLElement[],
          alTerminar?: () => void,
        ) => {
          if (!tw) return;
          // Sin sacar el listener acá: ScrollTrigger recorre la lista mientras
          // despacha y sacarlo salteaba al siguiente (el texto, si el título
          // terminaba en el mismo scrollEnd). Se saca en la limpieza.
          let hecho = false;
          const alDetener = () => {
            const p = tw.progress();
            if (hecho || !(p > 0 && p < 1)) return;
            hecho = true;
            const faltan = palabras.filter(
              (el) => Number(gsap.getProperty(el, "opacity")) < 0.999,
            );
            tw.kill();
            gsap.to(faltan, {
              opacity: 1,
              ...OPACIDAD_GSAP,
              stagger: ESCALON,
              overwrite: true,
              onComplete: alTerminar,
            });
          };
          ScrollTrigger.addEventListener("scrollEnd", alDetener);
          quitarDetener.push(() =>
            ScrollTrigger.removeEventListener("scrollEnd", alDetener),
          );
        };
        // El brillo de la palabra destacada (el mismo de TitleEm) dispara
        // cuando la palabra ya está plena. Una vez: la clase queda puesta.
        const brillar = () => em.classList.add("is-shimmering");

        // Coreografía de dos columnas (desktop): un solo timeline de largo 1.
        // La foto se abre en el primer 62%, el título se enciende al principio
        // y el texto después, solapado; el último tramo es de reposo.
        const armarColumnas = (st: ScrollTrigger.Vars) => {
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: escena,
              scrub: SCRUB,
              // Sin invalidateOnRefresh: invalidar un fromTo escalonado deja
              // las palabras que todavía no arrancaron sin su valor inicial
              // (quedan plenas). Lo que depende del tamaño lo recalcula medir.
              onRefresh: medir,
              ...st,
            },
          });
          lineas.push(tl);
          abrir(tl, 0.62);
          completarAlDetener(
            encender(tl, palabrasTitulo, TENUE.titulo, 0, 0.24, 0.4),
            palabrasTitulo,
            brillar,
          );
          tl.call(brillar, undefined, 0.24);
          completarAlDetener(
            encender(tl, palabrasCuerpo, TENUE.cuerpoAncho, 0.2, 0.86, 0.15),
            palabrasCuerpo,
          );
          tl.set({}, {}, 1);
        };

        // Desktop con alto: la escena se fija debajo del nav, con costura
        // (se fija COSTURA.d px antes y las columnas frenan hasta quedar
        // debajo del nav; antes de soltarse arrancan igual).
        const armarEscena = () => {
          // Costura solo con puntero fino (Lenis): con scroll nativo (táctil)
          // el transform del contenido se escribe en el hilo principal y llega
          // un cuadro después del scroll del compositor (screencast táctil: 4 a
          // 7 cuadros de 4 a 22 px fuera de lugar, contra un solo salto de 16 a
          // 20 px sin costura).
          const d = scrollNativo() ? 0 : COSTURA.d;
          const recorrido = () => Math.round(window.innerHeight * RECORRIDO);
          const costura = conCostura(
            {
              trigger: escena,
              pin: true,
              // 1 solo con scroll nativo (tablets táctiles en horizontal):
              // sin anticipar, el pin tiembla al fijarse.
              anticipatePin: anticiparPin(),
              start: () => `top ${altoNav() + d}px`,
              end: () => `+=${recorrido()}`,
              // Con refreshPriority presente, ScrollTrigger ordena los refresh
              // por posición en la página: si una sección de arriba arma su
              // pin después que esta, igual se calcula antes (el pin de acá
              // queda bien corrido).
              refreshPriority: 0,
              // armarColumnas pone medir como onRefresh, pero estas vars van
              // después y lo pisarían: conCostura lo compone con el suyo.
              onRefresh: medir,
            },
            grid,
            { d, recorrido },
          );
          quitarCostura = costura.limpiar;
          armarColumnas(costura.vars);
        };

        // Desktop bajo: la misma coreografía sin pin, mientras las dos
        // columnas cruzan la pantalla (el círculo chico ya a la vista al
        // empezar; todo encendido con la escena todavía entera en pantalla).
        const armarColumnasSinPin = () =>
          armarColumnas({ start: "top 58%", end: "bottom 75%" });

        // Mobile y tablet (una columna): cada pieza con su propio tramo.
        const armarApilado = () => {
          const tlFoto = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: marco,
              start: "top 55%",
              end: "bottom 72%",
              scrub: SCRUB,
              onRefresh: medir,
            },
          });
          lineas.push(tlFoto);
          abrir(tlFoto, 0.8);

          const tlTitulo = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: titulo,
              start: "top 88%",
              end: "top 58%",
              scrub: SCRUB,
            },
          });
          lineas.push(tlTitulo);
          completarAlDetener(
            encender(tlTitulo, palabrasTitulo, TENUE.titulo, 0, 1, 0.4),
            palabrasTitulo,
            brillar,
          );
          tlTitulo.call(brillar, undefined, 0.98);

          const tlCuerpo = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: cuerpo,
              start: "top 82%",
              end: "bottom 56%",
              scrub: SCRUB,
            },
          });
          lineas.push(tlCuerpo);
          completarAlDetener(
            encender(tlCuerpo, palabrasCuerpo, TENUE.cuerpoAngosto, 0, 1, 0.15),
            palabrasCuerpo,
          );
        };

        const quitarTransforms = () => {
          circulo.style.removeProperty("clip-path");
          foto.style.removeProperty("transform");
        };

        const armarModo = () => {
          try {
            // La escena se fija solo si entra entera debajo del nav (con letra
            // muy grande el texto la estira: ahí va sin pin).
            const cabe =
              escena.offsetHeight <= window.innerHeight - altoNav() + 2;
            const modo =
              conEscena && cabe ? "escena" : ancho ? "columnas" : "apilado";
            root.dataset.flor = modo;
            // Rendimiento: las opacidades de las palabras se leen en una sola
            // tanda y quedan en línea (prepararTransformes, lib/gsap.ts), con
            // el modo ya puesto. Si no, cada palabra del encendido se leía
            // intercalada con la escritura de la anterior (un recálculo de
            // estilos forzado por palabra). Mismo resultado en pantalla.
            quitarPalabras = prepararTransformes(
              [],
              [...palabrasTitulo, ...palabrasCuerpo],
            );
            if (modo === "escena") armarEscena();
            else if (modo === "columnas") armarColumnasSinPin();
            else armarApilado();
            medir();
            quitarCapa = capaActiva(root, { antes: 2 });
          } catch (error) {
            // Fail-open: sin animación, la foto entera y el texto pleno.
            if (process.env.NODE_ENV !== "production") console.error(error);
            lineas.forEach((tl) => {
              tl.scrollTrigger?.kill(true);
              tl.revert();
            });
            gsap.set([...palabrasTitulo, ...palabrasCuerpo], {
              clearProps: "opacity",
            });
            quitarPalabras();
            quitarTransforms();
            quitarCostura();
            quitarCapa();
            delete root.dataset.flor;
          }
        };
        // Desktop (con o sin pin) se arma al hidratar: el pin tiene que estar
        // para que lo de abajo se mida bien. Mobile y tablet (apilado: sin pin
        // y sin cambios de alto) se arma al acercarse (alAcercarse,
        // lib/gsap.ts), a 2.5 pantallas: antes de que arranque capaActiva
        // (2 pantallas) y con todo todavía fuera de la vista.
        let cancelarArmado = () => {};
        if (ancho) armarModo();
        else {
          cancelarArmado = alAcercarse(
            root,
            ctx.add("armarApilado", armarModo) as () => void,
            "250%",
          );
        }

        return () => {
          cancelarArmado();
          quitarDetener.forEach((quitar) => quitar());
          quitarTransforms();
          quitarCostura();
          quitarCapa();
          quitarPalabras();
          delete root.dataset.flor;
        };
      });
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      aria-labelledby="flor-titulo"
      className={styles.seccion}
    >
      <Container>
        <div ref={escenaRef} className={styles.escena}>
          <div ref={gridRef} className={styles.grid}>
            <div ref={marcoRef} className={styles.marco}>
              <div
                ref={circuloRef}
                className={styles.circulo}
                style={GEOMETRIA.circulo}
              >
                <div
                  ref={fotoRef}
                  className={styles.foto}
                  style={GEOMETRIA.foto}
                >
                  <Image
                    src={flor.foto.src}
                    alt={flor.foto.alt}
                    fill
                    quality={88}
                    sizes="(min-width: 860px) 510px, (min-width: 568px) 520px, calc(100vw - 48px)"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            <div className={styles.texto}>
              <Kicker>{flor.kicker}</Kicker>
              <h2
                ref={tituloRef}
                id="flor-titulo"
                className="mt-4 font-display text-[clamp(2.2rem,3.3vw,3rem)] font-medium leading-[1.08] text-crema"
              >
                {trocear(flor.title.pre)}
                <em ref={emRef} data-palabra="" className="title-em italic">
                  {flor.title.em}
                </em>
                {flor.title.post ? trocear(flor.title.post) : null}
              </h2>
              <p
                ref={cuerpoRef}
                className="mt-5 text-[1.2rem] leading-[1.5] text-pretty text-crema min-[860px]:mt-6 min-[860px]:text-[clamp(1.5rem,1.9vw,1.75rem)] min-[860px]:leading-[1.42]"
              >
                {trocear(flor.body)}
              </p>
              <div className="mt-6 min-[860px]:mt-8">
                <Etiqueta>{flor.etiqueta}</Etiqueta>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
