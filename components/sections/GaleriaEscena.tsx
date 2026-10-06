"use client";

import { useRef } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { Container } from "@/components/ui/Section";
import { Kicker } from "@/components/ui/Kicker";
import { TitleEm } from "@/components/ui/TitleEm";
import { InstagramIcon } from "@/components/ui/InstagramIcon";
import {
  GaleriaLightbox,
  precargarLightbox,
  type GaleriaLightboxHandle,
} from "@/components/ui/GaleriaLightbox";
import { cn } from "@/lib/cn";
import { contacto, galeria, type GaleriaFoto } from "@/content/data";
import {
  alAcercarse,
  altoNav,
  anticiparPin,
  capaActiva,
  conCostura,
  enTareas,
  gsap,
  prepararTransformes,
  ScrollTrigger,
  scrollNativo,
  useGSAPEnCola,
} from "@/lib/gsap";
import { COSTURA, rampa, resorteGsap, SCRUB, TRAMO } from "@/lib/fisica";
import { ahorroDeDatos, calentarVideo, trasCargaInactivo } from "@/lib/video";
import s from "./Galeria.module.css";

/* ==========================================================================
 * Galería "escena": el video real de la mesa y después las fotos.
 *
 * 1 · Intro: el video avanza con el scroll (video.currentTime ligado al
 *     progreso; el MP4 está codificado todo en cuadros clave, así cada búsqueda
 *     es inmediata).
 *     - Desktop, corta y en dos tiempos:
 *       a) Llegada (sin pin): mientras la galería sube desde abajo, el marco
 *          vertical crece de ESCALA_LLEGADA a entero y el video ya corre.
 *       b) Pin corto (RECORRIDO.desktop): el velo se levanta y el título sale
 *          de atrás del video, "Las mesas" a la izquierda y "hablan solas" a
 *          la derecha (cada línea en una caja que recorta del lado del marco).
 *       El video recorre los dos tramos seguidos, con rampa.
 *     - Mobile (sin cambios): el video llena el escenario; el título sube y se
 *       achica sobre un fundido. Solo el primer clip.
 * 2 · Fotos. Cada una abre el visor del lightbox en esa foto.
 *     - Desktop: marquee doble del mockup (dos filas en sentidos opuestos,
 *       animación CSS con translate3d). GSAP corre cada fila unos px con el
 *       scroll (deriva, en sentidos opuestos) y el hover frena el marquee con
 *       resorte. Sin pin: la galería entera dura poco más de 2 pantallas.
 *     - Mobile: fila deslizable (swipe con snap al centro); la tarjeta central
 *       crece, con ScrollTriggers sobre el scroll horizontal.
 *
 * Física (lib/fisica.ts): scrub directo (SCRUB), tramos con TRAMO, costura en
 * el pin (conCostura, sobre un envoltorio propio: marco y título ya tienen sus
 * transforms), video con rampa y el frenado del hover con el resorte `panel`
 * (arranque con `lento`). El video se pide y se calienta en idle después de
 * `load` (lib/video.ts), nunca en pleno scroll.
 *
 * Fail-open: el HTML del servidor ya muestra el estado final (poster, título y
 * fotos; la media query de Galeria.module.css elige esta versión o la quieta).
 * Sin JS o con reducir movimiento se ve la galería de siempre. Nada de estado
 * de React por cuadro; todo se limpia al desmontar (useGSAP + matchMedia).
 * ========================================================================== */

/** Nombres accesibles de las fotos y del link de Instagram. */
const COPY = galeria.escena;
/** Videos recodificados (todo cuadros clave, sin audio, faststart). */
const VIDEO = galeria.escena.video;

/** Mismos cortes que Galeria.module.css (y que el hero). */
const MQ = {
  desktop: "(min-width: 860px) and (min-height: 600px)",
  mobile: "(max-width: 859.98px) and (min-height: 560px)",
  reduce: "(prefers-reduced-motion: reduce)",
};

/** Pantallas de scroll que dura la intro fijada. */
const RECORRIDO = { desktop: 0.65, mobile: 1.3 };
/**
 * Desktop: punto del pin donde cae el ancla #galeria (título ya afuera, antes
 * de la costura de salida).
 */
const ANCLA_DESKTOP = 0.72;
/** Rampa del video (fracción del recorrido que acelera y que frena). */
const RAMPA_VIDEO = 0.1;
/** El video se baja solo con la galería a 3 pantallas o menos (todos los anchos). */
const CERCA = 3;
/** Mobile: escala y velo de las tarjetas que no están en el centro. */
const LATERAL = { escala: 0.84, velo: 0.42 };
/** Desktop: escala del marco cuando la galería asoma por abajo. */
const ESCALA_LLEGADA = 0.72;
/** Desktop: velo del video al llegar (se levanta mientras sale el título). */
const VELO_DESKTOP = 0.5;
/** Desktop: px que cada fila del marquee se corre con el scroll, a cada lado (= --g-deriva). */
const DERIVA = 90;
/** Marquee: veces que se repite el set de una fila en cada mitad del loop. */
const REPETICIONES = 3;

type Condiciones = { desktop: boolean; mobile: boolean; reduce: boolean };

/** Una foto con su lugar en el visor. */
type Pieza = { foto: GaleriaFoto; enVisor: number; esVideo: boolean };

/**
 * Control del video por progreso (0 a 1). Una búsqueda por vez: mientras el
 * video busca, se guarda el último pedido y se aplica al terminar (`seeked`).
 */
function crearScrubVideo(video: HTMLVideoElement, alListo: () => void) {
  let objetivo = 0;
  let listo = false;
  const aplicar = () => {
    if (!listo || video.seeking) return;
    const d = video.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    // Nunca el final exacto: algunos navegadores muestran negro en `ended`.
    const t = gsap.utils.clamp(0, d - 1 / 30, objetivo * d);
    if (Math.abs(video.currentTime - t) < 1 / 90) return;
    video.currentTime = t;
  };
  const alDatos = () => {
    listo = true;
    aplicar();
    alListo();
  };
  video.addEventListener("seeked", aplicar);
  video.addEventListener("loadeddata", alDatos);
  // El play/pause mudo que "despierta" al video en iOS (calentarVideo) lo
  // corre unos cuadros: al pausar vuelve a la posición del scroll.
  video.addEventListener("pause", aplicar);
  return {
    cargar(src: string) {
      video.muted = true;
      video.defaultMuted = true;
      video.preload = "auto";
      video.src = src;
      video.load();
    },
    ir(p: number) {
      objetivo = p;
      aplicar();
    },
    destruir() {
      video.removeEventListener("seeked", aplicar);
      video.removeEventListener("loadeddata", alDatos);
      video.removeEventListener("pause", aplicar);
      video.pause();
      if (video.getAttribute("src")) {
        video.removeAttribute("src");
        video.load();
      }
      listo = false;
    },
  };
}

/** Nombre accesible de una foto: "Ampliar: Cookies" o "Reproducir: Finger food". */
const nombreFoto = (p: Pieza) =>
  `${p.esVideo ? COPY.reproducir : COPY.ampliar}: ${p.foto.caption}`;

/** Ícono de video sobre la foto (abre un clip en el visor). */
function IconoVideo() {
  return (
    <span className={s.play} aria-hidden>
      <Play className={s.playIcono} fill="currentColor" />
    </span>
  );
}

/**
 * Una fila del marquee (desktop). Dos mitades idénticas de REPETICIONES veces
 * el set. Las fotos "reales" (con alt y foco) son la repetición del medio de
 * la primera mitad: así, al enfocarlas con Tab, siempre hay recorrido para
 * traerlas a la vista sin salir del loop. Las copias van aria-hidden y fuera
 * del orden de tabulación (con el mouse se pueden tocar todas).
 */
function FilaMarquee({
  piezas,
  inversa,
  onAbrir,
}: {
  piezas: Pieza[];
  inversa?: boolean;
  onAbrir: (indice: number) => void;
}) {
  const n = piezas.length;
  if (n === 0) return null;
  const mitad = Array.from({ length: REPETICIONES }, () => piezas).flat();
  const items = [...mitad, ...mitad];
  return (
    <div className={s.mqFila} data-g="mq-fila">
      <div className={s.mqDeriva} data-g="mq-deriva">
        <ul
          className={cn(s.mqPista, inversa && s.mqInversa)}
          data-g="mq-pista"
        >
          {items.map((p, i) => {
            const real = i >= n && i < 2 * n;
            return (
              <li
                key={i}
                className={s.mqItem}
                aria-hidden={real ? undefined : true}
              >
                <button
                  type="button"
                  className={s.mqTarjeta}
                  tabIndex={real ? undefined : -1}
                  aria-label={nombreFoto(p)}
                  onClick={() => onAbrir(p.enVisor)}
                >
                  <Image
                    src={p.foto.image}
                    alt={real ? p.foto.alt : ""}
                    fill
                    quality={88}
                    sizes="330px"
                    className={s.mqImg}
                  />
                  {p.esVideo ? <IconoVideo /> : null}
                  <span className={s.mqPie}>
                    <span className={s.etiqueta}>
                      <span className={s.tick} />
                      {p.foto.caption}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function GaleriaEscena({
  fotos,
  visor,
}: {
  /** Las fotos de la galería (primera mitad: fila de arriba del marquee). */
  fotos: GaleriaFoto[];
  /** La lista del lightbox (contiene todas las fotos). */
  visor: GaleriaFoto[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<GaleriaLightboxHandle>(null);

  useGSAPEnCola(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add(MQ, (ctx) => {
        const { desktop, mobile, reduce } = ctx.conditions as Condiciones;
        // Reducir movimiento o pantalla baja: se ve la versión quieta (CSS).
        if (reduce || (!desktop && !mobile)) return;
        // Navegadores sin la media query `scripting`: el CSS muestra la quieta
        // y la escena está oculta; fijarla dejaría un hueco del alto del pin.
        if (getComputedStyle(root).display === "none") return;

        const q = <T extends HTMLElement = HTMLElement>(g: string) =>
          root.querySelector<T>(`[data-g="${g}"]`);
        const intro = q("intro");
        const costuraIntro = q("costura");
        const marco = q("marco");
        const video = q<HTMLVideoElement>("video");
        const velo = q("velo");
        const degrade = q("degrade");
        const pie = q("pie");
        const grupo = q("grupo");
        const kicker = q("kicker");
        const l1 = q("l1");
        const l2 = q("l2");
        if (
          !intro ||
          !costuraIntro ||
          !marco ||
          !video ||
          !velo ||
          !grupo ||
          !kicker ||
          !l1 ||
          !l2
        ) {
          return;
        }

        root.dataset.modo = desktop ? "desktop" : "mobile";
        const limpiezas: Array<() => void> = [];
        // Rendimiento: lo que la intro (y, en desktop, la deriva del marquee)
        // mueve se lee en una sola tanda, con el modo ya puesto
        // (prepararTransformes, lib/gsap.ts).
        limpiezas.push(
          prepararTransformes(
            desktop
              ? [
                  marco,
                  l1,
                  l2,
                  kicker,
                  pie,
                  ...Array.from(
                    root.querySelectorAll<HTMLElement>('[data-g="mq-deriva"]'),
                  ),
                ]
              : [grupo, pie],
            [velo, degrade, pie, kicker],
          ),
        );
        // Costura solo con puntero fino (Lenis): con scroll nativo (táctil) el
        // transform del contenido se escribe en el hilo principal y llega un
        // cuadro después del scroll del compositor (screencast táctil: 4 a 7
        // cuadros de 4 a 22 px fuera de lugar, contra un solo salto de 16 a 20
        // px sin costura).
        const d = scrollNativo() ? 0 : COSTURA.d;
        // will-change (marco, título, filas) solo con la escena cerca.
        limpiezas.push(capaActiva(root));

        /* ---------------- 1 · Intro ---------------- */
        const scrub = crearScrubVideo(video, () => {
          root.dataset.video = "";
        });
        limpiezas.push(() => {
          scrub.destruir();
          delete root.dataset.video;
        });

        // Ancla #galeria. Mobile: al final de la costura de entrada (el
        // escenario ya frenó debajo del nav; ahí el título se lee entero).
        // Desktop: dentro del pin, con el título ya afuera (scroll-margin
        // negativo: el ancla cae ANCLA_DESKTOP del pin después de su inicio).
        const seccion = root.closest<HTMLElement>("section[id]");
        const ponerAncla = (recorrido: number) => {
          if (!seccion) return;
          const margen = desktop
            ? altoNav() + d - ANCLA_DESKTOP * recorrido
            : altoNav() - d;
          seccion.style.scrollMarginTop = `${Math.round(margen)}px`;
        };
        limpiezas.push(() => seccion?.style.removeProperty("scroll-margin-top"));

        // Desktop: el video recorre la llegada y el pin seguidos. Cada trigger
        // guarda su progreso y su largo; el video sale del promedio pesado.
        const tramoVideo = { pLlegada: 0, llegada: 1, pPin: 0, pin: 1 };
        const curvaVideo = rampa(RAMPA_VIDEO);
        const moverVideo = () => {
          const t = tramoVideo;
          scrub.ir(
            curvaVideo(
              (t.pLlegada * t.llegada + t.pPin * t.pin) / (t.llegada + t.pin),
            ),
          );
        };

        // Los tweens de la intro con valores en función de la geometría (en
        // mobile, el velo y la subida del título) se recalculan en cada
        // refresh: se invalidan solo esos (antes, invalidateOnRefresh
        // rearmaba la intro entera en cada refresh; los demás valores son
        // fijos).
        const conFunciones: gsap.core.Animation[] = [];
        // Costura sobre el envoltorio (marco + título): el pin se fija
        // COSTURA.d px antes y el escenario frena hasta quedar debajo del nav.
        const recorridoIntro = () =>
          Math.round(
            window.innerHeight *
              (desktop ? RECORRIDO.desktop : RECORRIDO.mobile),
          );
        const costuraDeIntro = conCostura(
          {
            trigger: intro,
            pin: true,
            // Con Lenis (puntero fino) el pin va por transform: Lenis escribe
            // el scroll y ScrollTrigger el transform en el mismo cuadro, así
            // se ve igual que fijo, y Chrome no cuenta el paso a
            // position: fixed del <video> como corrimiento de layout (CLS
            // 0,24 en cada visita). Con scroll nativo (táctiles), fijo.
            pinType: d ? "transform" : "fixed",
            // Solo con scroll nativo (táctiles): con Lenis fijaba el pin antes.
            anticipatePin: anticiparPin(),
            // Con refreshPriority presente, ScrollTrigger ordena los refresh por
            // posición en la página (hay secciones que arman sus pins tarde).
            refreshPriority: 0,
            start: () => `top ${altoNav() + d}px`,
            end: () => `+=${recorridoIntro()}`,
            scrub: SCRUB,
            onRefreshInit: () => {
              conFunciones.forEach((t) => t.invalidate());
            },
            onRefresh: (st) => {
              const largo = Math.max(1, st.end - st.start);
              ponerAncla(largo);
              if (desktop) {
                tramoVideo.pin = largo;
                tramoVideo.pPin = st.progress;
                moverVideo();
              }
            },
            onUpdate: desktop
              ? (st) => {
                  tramoVideo.pPin = st.progress;
                  moverVideo();
                }
              : undefined,
          },
          costuraIntro,
          { d, recorrido: recorridoIntro },
        );
        limpiezas.push(costuraDeIntro.limpiar);
        const introTl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: costuraDeIntro.vars,
        });

        if (desktop) {
          // a) Llegada: el marco crece mientras la galería sube desde abajo
          //    (sin pin; termina justo donde arranca el pin). El trigger es la
          //    raíz: la intro misma se fija y no conviene medirla.
          const llegadaTl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root,
              refreshPriority: 0,
              start: "top bottom",
              end: () => `top ${altoNav() + d}px`,
              scrub: SCRUB,
              invalidateOnRefresh: true,
              onUpdate: (st) => {
                tramoVideo.pLlegada = st.progress;
                moverVideo();
              },
              onRefresh: (st) => {
                tramoVideo.llegada = Math.max(1, st.end - st.start);
                tramoVideo.pLlegada = st.progress;
                moverVideo();
              },
            },
          });
          llegadaTl.fromTo(
            marco,
            { scale: ESCALA_LLEGADA },
            { scale: 1, duration: 1, ease: TRAMO },
          );

          // b) Pin: el video gana luz y el título sale de atrás del marco
          //    (cada caja recorta del lado del video). 110 %: la inclinación
          //    de la itálica no deja un resto a la vista.
          introTl.fromTo(
            velo,
            { opacity: VELO_DESKTOP },
            { opacity: 0, duration: 0.5, ease: TRAMO },
            0,
          );
          introTl.fromTo(
            l1,
            { xPercent: 110 },
            { xPercent: 0, duration: 0.46, ease: TRAMO },
            0.04,
          );
          introTl.fromTo(
            l2,
            { xPercent: -110 },
            { xPercent: 0, duration: 0.46, ease: TRAMO },
            0.1,
          );
          introTl.fromTo(
            kicker,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.28, ease: TRAMO },
            0.3,
          );
          if (pie) {
            introTl.fromTo(
              pie,
              { opacity: 0, y: 12 },
              { opacity: 1, y: 0, duration: 0.26, ease: TRAMO },
              0.4,
            );
          }
          // El timeline dura 1: las posiciones de arriba son progreso del pin.
          introTl.set({}, {}, 1);
        } else {
          // Mobile: el video recorre casi todo el pin (un respiro al principio
          // y al final), con rampa: los cuadros arrancan y frenan sin escalón.
          const estado = { t: 0 };
          introTl.to(
            estado,
            {
              t: 1,
              duration: 0.94,
              ease: rampa(RAMPA_VIDEO),
              onUpdate: () => scrub.ir(estado.t),
            },
            0.03,
          );
          // El velo se levanta mientras el título sube.
          introTl.fromTo(
            velo,
            {
              opacity: () =>
                parseFloat(getComputedStyle(root).getPropertyValue("--g-velo")) ||
                0.62,
            },
            { opacity: 0, duration: 0.28, ease: "power1.inOut" },
            0.02,
          );
          conFunciones.push(introTl.recent() as gsap.core.Tween);
          if (pie) {
            introTl.fromTo(
              pie,
              { opacity: 0, y: 12 },
              { opacity: 1, y: 0, duration: 0.08, ease: TRAMO },
              0.3,
            );
          }
          // El título sube y se achica sobre el fundido de arriba.
          gsap.set(grupo, { transformOrigin: "50% 0%" });
          introTl.fromTo(
            grupo,
            { y: 0, scale: 1 },
            {
              y: () => 22 - grupo.offsetTop,
              scale: 0.8,
              duration: 0.28,
              ease: TRAMO,
            },
            0.02,
          );
          conFunciones.push(introTl.recent() as gsap.core.Tween);
          if (degrade) {
            introTl.fromTo(
              degrade,
              { opacity: 0 },
              { opacity: 1, duration: 0.24, ease: "power1.inOut" },
              0.04,
            );
          }
        }

        // El video pesa y su primer cuadro es caro (decodificar, subir la
        // textura, compilar el shader): se pide y se calienta después de
        // `load`, en idle, fuera de pantalla, así no congela el scroll al
        // entrar. Solo con la galería a CERCA pantallas o menos, en todos los
        // anchos: quien no scrollea no baja el video (2.7 MB en desktop, 2.5
        // en mobile) y en desktop no le compite a los cuadros del hero.
        // Con ahorro de datos, nunca: queda el poster (que se ve hasta el
        // primer cuadro del video).
        let pedido = false;
        const cargarVideo = () => {
          if (pedido || ahorroDeDatos()) return;
          pedido = true;
          scrub.cargar(desktop ? VIDEO.desktop : VIDEO.mobile);
          void calentarVideo(video);
        };
        {
          let cancelar = () => {};
          ScrollTrigger.create({
            trigger: root,
            start: `top bottom+=${CERCA * 100}%`,
            end: "bottom top",
            onToggle: (self) => {
              if (!self.isActive || pedido) return;
              cancelar();
              cancelar = trasCargaInactivo(cargarVideo);
            },
          });
          limpiezas.push(() => cancelar());
        }

        /* ---------------- 2 · Fotos ---------------- */
        if (desktop) {
          const muestra = q("muestra");
          const derivas = Array.from(
            root.querySelectorAll<HTMLElement>('[data-g="mq-deriva"]'),
          );
          const pistas = Array.from(
            root.querySelectorAll<HTMLElement>('[data-g="mq-pista"]'),
          );
          if (muestra && derivas.length > 0) {
            // Deriva: con el scroll, la fila de arriba se corre a la izquierda
            // (su mismo sentido) y la de abajo a la derecha. Lineal con el
            // scroll: sin pin de por medio, la velocidad es la de la página.
            const derivaTl = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: muestra,
                start: "top bottom",
                end: "bottom top",
                scrub: SCRUB,
              },
            });
            derivas.forEach((el, i) => {
              const signo = i % 2 === 0 ? 1 : -1;
              derivaTl.fromTo(
                el,
                { x: DERIVA * signo },
                { x: -DERIVA * signo, duration: 1 },
                0,
              );
            });
            limpiezas.push(() => gsap.set(derivas, { clearProps: "transform" }));

            // Hover (mouse): el marquee frena con resorte y vuelve a arrancar
            // (playbackRate de la animación CSS: sin corte de velocidad).
            const animaciones = () => pistas.flatMap((p) => p.getAnimations());
            const ritmo = { r: 1 };
            const aplicarRitmo = () => {
              animaciones().forEach((a) => {
                a.playbackRate = ritmo.r;
              });
            };
            const frenar = resorteGsap("panel");
            const arrancar = resorteGsap("lento");
            const alEntrar = (e: PointerEvent) => {
              if (e.pointerType !== "mouse") return;
              gsap.to(ritmo, {
                r: 0,
                duration: frenar.duration,
                ease: frenar.ease,
                overwrite: true,
                onUpdate: aplicarRitmo,
              });
            };
            const alSalir = (e: PointerEvent) => {
              if (e.pointerType !== "mouse") return;
              gsap.to(ritmo, {
                r: 1,
                duration: arrancar.duration,
                ease: arrancar.ease,
                overwrite: true,
                onUpdate: aplicarRitmo,
              });
            };
            muestra.addEventListener("pointerenter", alEntrar);
            muestra.addEventListener("pointerleave", alSalir);

            // Teclado: la fila se queda quieta con el foco adentro (CSS) y la
            // foto enfocada se trae al centro moviendo el tiempo de la
            // animación (la fila no tiene scroll propio: overflow clip).
            const alFoco = (e: FocusEvent) => {
              const el = e.target as HTMLElement;
              if (!el.matches(":focus-visible")) return;
              const pista = el.closest<HTMLElement>('[data-g="mq-pista"]');
              const fila = el.closest<HTMLElement>('[data-g="mq-fila"]');
              const anim = pista?.getAnimations()[0];
              if (!pista || !fila || !anim?.effect) return;
              const dur = Number(anim.effect.getTiming().duration);
              const mitad = pista.offsetWidth / 2;
              const ahora = Number(anim.currentTime ?? 0);
              if (!(dur > 0) || !(mitad > 0) || !Number.isFinite(ahora)) return;
              const inversa = anim.effect.getTiming().direction === "reverse";
              const base = Math.floor(ahora / dur) * dur;
              const p = (ahora - base) / dur;
              // Corrimiento actual de la pista (0 a mitad) y el que centra la foto.
              const corrido = (inversa ? 1 - p : p) * mitad;
              const rf = fila.getBoundingClientRect();
              const re = el.getBoundingClientRect();
              const destino = rf.left + (rf.width - re.width) / 2;
              const nuevo = gsap.utils.clamp(
                1,
                mitad - 1,
                corrido + (re.left - destino),
              );
              const np = nuevo / mitad;
              anim.currentTime = base + (inversa ? 1 - np : np) * dur;
            };
            muestra.addEventListener("focusin", alFoco);

            limpiezas.push(() => {
              muestra.removeEventListener("pointerenter", alEntrar);
              muestra.removeEventListener("pointerleave", alSalir);
              muestra.removeEventListener("focusin", alFoco);
              gsap.killTweensOf(ritmo);
              ritmo.r = 1;
              aplicarRitmo();
            });
          }
        } else {
          // Mobile: swipe nativo; los triggers leen el scroll horizontal de la
          // fila. La tarjeta crece (y se desvela) mientras su centro cruza el
          // de la pantalla: chica a un paso de distancia, entera en el medio.
          const fila = q("fila");
          const pista = q("pista");
          const barra = q("barra");
          const actual = q("actual");
          const items = Array.from(
            root.querySelectorAll<HTMLElement>('[data-g="item"]'),
          );
          const n = items.length;
          if (fila && pista && n > 0) {
            // La fila se arma al acercarse (alAcercarse, lib/gsap.ts), no al
            // hidratar: son ~17 triggers sobre el scroll horizontal de la fila
            // (no fijan nada ni cambian el alto) que solo importan cuando se ve.
            // Hasta entonces, las tarjetas quedan como las sirve el servidor.
            // Como se arma mientras la persona scrollea, va en tandas de dos
            // tarjetas por tarea (enTareas): de una sola vez eran ~110 ms de
            // bloqueo en un celular de gama media.
            const enCtx = ctx.add("enCtx", (f: () => void) => f()) as (
              f: () => void,
            ) => void;
            let cancelarTandas = () => {};
            limpiezas.push(() => cancelarTandas());
            const armarFila = ctx.add("armarFila", () => {
              const dos = (i: number) => String(i + 1).padStart(2, "0");
              let indice = -1;
              const marcar = (i: number) => {
                const j = gsap.utils.clamp(0, n - 1, i);
                if (j === indice || !actual) return;
                indice = j;
                actual.textContent = dos(j);
              };
              // Distancia entre centros de tarjetas (todas iguales).
              const paso = () =>
                n > 1 ? items[1].offsetLeft - items[0].offsetLeft : 0;
              const centro = () => fila.clientWidth / 2;
              const deFila = { scroller: fila, horizontal: true } as const;

              const armarItem = (item: HTMLElement) => {
                const tarjeta = item.querySelector<HTMLElement>(
                  '[data-g="tarjeta"]',
                );
                const veloF = item.querySelector<HTMLElement>(
                  '[data-g="velo-foto"]',
                );
                const foto = item.querySelector<HTMLElement>('[data-g="foto"]');
                const pieF = item.querySelector<HTMLElement>(
                  '[data-g="pie-foto"]',
                );
                if (!tarjeta) return;
                const tl = gsap.timeline({
                  defaults: { ease: "none" },
                  scrollTrigger: {
                    trigger: item,
                    start: () => `center ${Math.round(centro() + paso())}px`,
                    end: () => `center ${Math.round(centro() - paso())}px`,
                    scrub: SCRUB,
                    invalidateOnRefresh: true,
                    ...deFila,
                  },
                });
                // TRAMO en las dos mitades: la vecina (a un paso del centro, a la
                // vista) empieza a crecer y a desvelarse con velocidad 0.
                tl.fromTo(
                  tarjeta,
                  { scale: LATERAL.escala },
                  { scale: 1, duration: 0.5, ease: TRAMO },
                  0,
                ).to(
                  tarjeta,
                  { scale: LATERAL.escala, duration: 0.5, ease: TRAMO },
                  0.5,
                );
                if (veloF) {
                  tl.fromTo(
                    veloF,
                    { opacity: LATERAL.velo },
                    { opacity: 0, duration: 0.5, ease: TRAMO },
                    0,
                  ).to(
                    veloF,
                    { opacity: LATERAL.velo, duration: 0.5, ease: TRAMO },
                    0.5,
                  );
                }
                // De las vecinas solo se asoma el borde y su etiqueta quedaba
                // cortada: se ve solo la de la tarjeta del centro (la foto la
                // nombra igual el aria-label del botón).
                if (pieF) {
                  tl.fromTo(
                    pieF,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.3, ease: "power1.out" },
                    0.2,
                  ).to(
                    pieF,
                    { opacity: 0, duration: 0.3, ease: "power1.in" },
                    0.5,
                  );
                }
                // Parallax: la foto se corre dentro de su marco mientras cruza.
                if (foto) {
                  gsap.fromTo(
                    foto,
                    { xPercent: 5 },
                    {
                      xPercent: -5,
                      ease: "none",
                      scrollTrigger: {
                        trigger: item,
                        start: "left right",
                        end: "right left",
                        scrub: SCRUB,
                        ...deFila,
                      },
                    },
                  );
                }
              };
              const armarContador = () => {
                ScrollTrigger.create({
                  ...deFila,
                  trigger: pista,
                  start: "left left",
                  end: "right right",
                  onUpdate: (self) => {
                    marcar(Math.round(self.progress * (n - 1)));
                    if (barra) {
                      gsap.set(barra, {
                        scaleX: 1 / n + (1 - 1 / n) * self.progress,
                      });
                    }
                  },
                });
                marcar(0);
                limpiezas.push(() => {
                  if (actual) actual.textContent = dos(0);
                });
              };
              const pasos: Array<() => void> = [];
              for (let i = 0; i < n; i += 2) {
                const tanda = items.slice(i, i + 2);
                pasos.push(() => enCtx(() => tanda.forEach(armarItem)));
              }
              pasos.push(() => enCtx(armarContador));
              cancelarTandas = enTareas(pasos);
            }) as () => void;
            limpiezas.push(alAcercarse(fila, armarFila));
          }
        }

        return () => {
          limpiezas.forEach((f) => f());
          delete root.dataset.modo;
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  const n = fotos.length;
  const titulo = galeria.head.title;
  // La etiqueta del marco es la del clip en el visor ("La mesa servida").
  const etiquetaVideo =
    galeria.destacadas.find((f) => f.video === "/media/galeria-clip-1.mp4")
      ?.caption ?? galeria.destacadas[0]?.caption;
  // Cada foto con su lugar en el visor (y si ahí es un video).
  const piezas: Pieza[] = fotos.map((foto) => {
    const enVisor = visor.findIndex((v) => v.image === foto.image);
    return { foto, enVisor, esVideo: Boolean(visor[enVisor]?.video) };
  });
  const mitad = Math.ceil(n / 2);
  const abrir = (indice: number) => lightboxRef.current?.abrir(indice);

  return (
    <div ref={rootRef} className={s.escena}>
      {/* 1 · Intro: video de la mesa + título */}
      <div className={s.intro} data-g="intro">
        {/* Envoltorio de la costura del pin (lo único que se corre en y). */}
        <div className={s.costura} data-g="costura">
          <div className={s.marco} data-g="marco" aria-hidden>
            <Image
              src={VIDEO.poster}
              alt=""
              fill
              quality={88}
              sizes="(max-width: 859.98px) 100vw, 480px"
              className={s.medio}
            />
            <video
              data-g="video"
              className={`${s.medio} ${s.video}`}
              muted
              playsInline
              preload="none"
              disablePictureInPicture
              disableRemotePlayback
              tabIndex={-1}
            />
            <span className={s.velo} data-g="velo" />
            <span className={s.degrade} data-g="degrade" />
            {etiquetaVideo ? (
              <span className={s.pieMarco} data-g="pie">
                <span className={s.etiqueta}>
                  <span className={s.tick} />
                  {etiquetaVideo}
                </span>
              </span>
            ) : null}
          </div>

          <div className={s.titulo}>
            <div className={s.grupo} data-g="grupo">
              <div className={s.kicker} data-g="kicker">
                <Kicker>{galeria.head.kicker}</Kicker>
              </div>
              <h2 className={s.h2}>
                <span className={cn(s.lado, s.ladoIzq)}>
                  <span className={s.linea} data-g="l1">
                    {titulo.pre.trim()}
                  </span>
                </span>{" "}
                <span className={cn(s.lado, s.ladoDer)}>
                  <span className={s.linea} data-g="l2">
                    <TitleEm>{titulo.em}</TitleEm>
                    {titulo.post ?? ""}
                  </span>
                </span>
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* 2 · Fotos: carril deslizable (mobile) o marquee doble (desktop).
          Con el puntero, el foco o el dedo sobre las fotos se adelanta la
          descarga del lightbox (si todavía no llegó en idle). */}
      <div
        className={s.carril}
        data-g="carril"
        onPointerEnter={precargarLightbox}
        onFocus={precargarLightbox}
        onTouchStart={precargarLightbox}
      >
        <div className={s.contenido}>
          {/* Desktop: fila de arriba empresas y saladas, abajo las dulces.
              Va antes de la cabecera: en desktop las acciones quedan abajo y
              el orden del DOM (y del foco) es el mismo que el visual; en
              mobile está oculta. */}
          <div className={s.muestra} data-g="muestra">
            <FilaMarquee piezas={piezas.slice(0, mitad)} onAbrir={abrir} />
            <FilaMarquee
              piezas={piezas.slice(mitad)}
              inversa
              onAbrir={abrir}
            />
          </div>

          <Container>
            <div className={s.cabecera}>
              <p className={s.contador} aria-hidden>
                <span className={s.tick} />
                <span>
                  <span className={s.contadorActual} data-g="actual">
                    01
                  </span>{" "}
                  / {String(n).padStart(2, "0")}
                </span>
              </p>
              <div className={s.acciones}>
                <GaleriaLightbox ref={lightboxRef} fotos={visor} />
                <a
                  href={contacto.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${COPY.instagram} ${contacto.instagramHandle}`}
                  className={s.ig}
                >
                  <InstagramIcon className="size-[17px]" />
                  <span className={s.igTexto}>{contacto.instagramHandle}</span>
                </a>
              </div>
            </div>
          </Container>

          {/* Mobile */}
          <div className={s.fila} data-g="fila">
            <ul className={s.pista} data-g="pista">
              {piezas.map((p) => (
                <li key={p.foto.image} className={s.item} data-g="item">
                  <button
                    type="button"
                    className={s.tarjeta}
                    data-g="tarjeta"
                    aria-label={nombreFoto(p)}
                    onClick={() => abrir(p.enVisor)}
                  >
                    <span className={s.foto} data-g="foto">
                      <Image
                        src={p.foto.image}
                        alt={p.foto.alt}
                        fill
                        quality={88}
                        sizes="(max-width: 859.98px) 66vw, 1px"
                        className={s.img}
                      />
                    </span>
                    <span className={s.veloFoto} data-g="velo-foto" />
                    {p.esVideo ? <IconoVideo /> : null}
                    <span className={s.pie} data-g="pie-foto">
                      <span className={s.etiqueta}>
                        <span className={s.tick} />
                        {p.foto.caption}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <Container>
            <div className={s.progreso} aria-hidden>
              <span
                className={s.barra}
                data-g="barra"
                style={{ transform: `scaleX(${1 / Math.max(1, n)})` }}
              />
            </div>
          </Container>
        </div>
      </div>
    </div>
  );
}
