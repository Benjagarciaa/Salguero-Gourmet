"use client";

import { useRef, type CSSProperties } from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { CotizarCard, CotizarCue } from "@/components/chrome/QuoteContext";
import {
  altoNav,
  anticiparPin,
  capaActiva,
  conCostura,
  gsap,
  prepararTransformes,
  refrescarSiNadieLoHace,
  ScrollTrigger,
  scrollNativo,
  useGSAP,
} from "@/lib/gsap";
import { COSTURA, SCRUB, TRAMO } from "@/lib/fisica";
import { cn } from "@/lib/cn";
import { servicios } from "@/content/data";
import styles from "./Servicios.module.css";

/**
 * Servicios · "tarjetas que se apilan como un mazo".
 *
 * El HTML del servidor es la GRILLA de siempre: todo visible, sin atributos. Es
 * lo que queda sin JS, con reducir movimiento y en pantallas bajas. En el
 * cliente, gsap.matchMedia elige un modo y lo escribe en data-sv:
 *
 * - "mazo" (desktop): el bloque (encabezado + escenario) queda fijo debajo del
 *   nav (pin + scrub) y las 4 placas, del mismo tamaño y superpuestas, suben
 *   una por una desde abajo y tapan a la anterior, que se achica y oscurece
 *   apenas (queda asomando arriba, como un mazo). La foto de cada placa se
 *   asienta con un zoom lento y unas marcas cuentan cuántas van.
 * - "pila" (mobile): la misma idea, más corta y sin pin: cada placa es sticky
 *   (scroll nativo) y el JS solo achica/oscurece las de abajo y hace el zoom.
 *
 * Solo se anima transform y opacity, de envoltorios propios (la placa-link y la
 * foto conservan sus hovers). Si el texto de una placa no entra en el alto del
 * modo, se queda la grilla. Toda la placa sigue siendo el link "Cotizar X" que
 * preselecciona el servicio del cotizador (CotizarCard + QuoteContext). Con
 * teclado, enfocar una placa tapada o que todavía no subió lleva el scroll al
 * punto en que queda arriba (el foco nunca cae en algo que no se ve).
 *
 * Detalle técnico importante: el punto de partida de cada movimiento lo pone el
 * CSS del modo (placa corrida abajo de la pantalla, texto desfasado, foto con
 * zoom, marca vacía) y GSAP solo anima con .to() hacia el valor final. Nada de
 * fromTo: su "estado inicial" (_startAt) se vuelve a crear en cada refresh
 * dentro del contexto de GSAP que esté activo en ese momento (puede ser el de
 * otra sección) y, al cambiar de tamaño, ese otro contexto lo "restauraba"
 * encima de la limpieza de esta sección (placas corridas 600px en mobile).
 * La pila ni siquiera crea tweens: escribe con quickSetter desde UN solo
 * ScrollTrigger, que calcula el progreso de cada tramo.
 *
 * Física (lib/fisica.ts): el mazo va con scrub directo (SCRUB) y costura
 * (conCostura): el pin se fija COSTURA.d px antes y el bloque frena con
 * velocidad continua hasta quedar debajo del nav (y arranca igual antes de
 * soltarse). Las placas, el texto y el zoom llegan con TRAMO (velocidad 0 al
 * empezar y al terminar). Las capas de GPU (will-change) existen solo con la
 * sección cerca (capaActiva).
 */

const MQ = {
  mazo: "(min-width: 760px) and (min-height: 640px)",
  pila: "(max-width: 759.98px) and (min-height: 560px)",
  reduce: "(prefers-reduced-motion: reduce)",
};
type Condiciones = Record<keyof typeof MQ, boolean>;

/** Mazo: pantallas de scroll que dura el pin completo. */
const RECORRIDO = 2.6;
/**
 * Mazo (unidades del timeline): respiro al fijarse y al final. INICIO cubre la
 * costura de entrada (2 * COSTURA.d = 160 px de ~2340 son ~0.24 unidades de
 * 3.65): la primera placa arranca cuando el bloque ya frenó debajo del nav.
 */
const INICIO = 0.25;
const FINAL = 0.4;
/** Mazo: el texto de cada placa llega apenas después que la placa. */
const DESFASE_TEXTO = 0.08;
/** Cuánto se achica cada nivel tapado y cuánto se oscurece (por nivel). */
const ACHIQUE = 0.04;
const OSCURO = [0, 0.3, 0.48, 0.6];
/** Pila: alto mínimo que tiene que quedarle a la foto. */
const FOTO_MIN = 104;
/** Pila: aire entre el nav y la pila. */
const AIRE_PILA = 12;
/** Pila: cuánto asoma cada placa tapada, en px. */
const ASOME_PILA = 10;

/** Mazo: cuánto asoma cada placa tapada, en px (crece con la pantalla). */
function asomeMazo(): number {
  return Math.round(gsap.utils.clamp(12, 18, window.innerHeight * 0.017));
}

const escala = (nivel: number) => 1 - ACHIQUE * nivel;
/** Oscuridad del velo para un nivel (admite niveles fraccionarios). */
function oscuro(nivel: number): number {
  const tope = OSCURO.length - 1;
  const n = gsap.utils.clamp(0, tope, nivel);
  const i = Math.min(Math.floor(n), tope - 1);
  return gsap.utils.interpolate(OSCURO[i], OSCURO[i + 1], n - i);
}

export function Servicios() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add(MQ, (ctx) => {
        const { mazo, pila, reduce } = ctx.conditions as Condiciones;
        // Reducir movimiento: la grilla quieta, sin nada más.
        if (reduce || (!mazo && !pila)) return;

        const partes = (nombre: string) =>
          Array.from(
            root.querySelectorAll<HTMLElement>(`[data-sv-parte="${nombre}"]`),
          );
        const [pin] = partes("pin");
        const [cabecera] = partes("cabecera");
        const [escenario] = partes("escenario");
        const cartas = partes("carta");
        const zooms = partes("zoom");
        const velos = partes("velo");
        const textos = partes("texto");
        const llenos = partes("lleno");
        const animados = [...cartas, ...zooms, ...velos, ...textos, ...llenos];
        const n = cartas.length;
        if (
          !pin ||
          !cabecera ||
          !escenario ||
          n < 2 ||
          [zooms, velos, textos].some((lista) => lista.length !== n)
        ) {
          return;
        }

        let vivo = true;
        let quitarFoco = () => {};
        let quitarCostura = () => {};
        let quitarCapa = () => {};
        let quitarRefresh = () => {};
        let quitarPreparacion = () => {};
        let asome = mazo ? asomeMazo() : ASOME_PILA;
        let fuera = 0;

        // Distancia (px) entre el tope del bloque fijo y el del escenario, sin
        // el corrimiento de la costura (la `y` que conCostura le pone al
        // escenario): da lo mismo en cualquier punto del pin.
        const dentroDelPin = () =>
          escenario.getBoundingClientRect().top -
          pin.getBoundingClientRect().top -
          (Number(gsap.getProperty(escenario, "y")) || 0);

        // Variables que usa el CSS del modo. En el mazo, --sv-fuera deja cada
        // placa entera debajo de la pantalla cuando el bloque está fijo.
        const medir = () => {
          if (mazo) asome = asomeMazo();
          root.style.setProperty("--sv-nav", `${Math.round(altoNav())}px`);
          root.style.setProperty("--sv-p", `${asome}px`);
          if (mazo) {
            fuera = Math.ceil(
              window.innerHeight - (altoNav() + dentroDelPin()) + 16,
            );
            root.style.setProperty("--sv-fuera", `${fuera}px`);
          }
        };
        const quitarModo = () => {
          delete root.dataset.sv;
          ["--sv-nav", "--sv-p", "--sv-fuera", "--sv-costura"].forEach((v) =>
            root.style.removeProperty(v),
          );
        };

        // El texto de alguna placa no entra en el alto del modo.
        const noEntra = (minFoto: number) =>
          textos.some(
            (t, i) => t.offsetHeight + minFoto > cartas[i].clientHeight + 1,
          );

        // Teclado: scrollear hasta `y` si hace falta (fuera del foco).
        // Instantáneo: en táctiles <html> lleva scroll-behavior: smooth.
        const irA = (y: number) =>
          requestAnimationFrame(() => {
            if (vivo) {
              window.scrollTo({ top: Math.round(y), behavior: "instant" });
            }
          });
        const escucharFoco = (alEnfocar: (k: number) => void) => {
          const handler = (e: FocusEvent) => {
            const el = e.target as HTMLElement | null;
            if (!el?.matches?.(":focus-visible")) return;
            const k = cartas.findIndex((c) => c.contains(el));
            if (k >= 0) alEnfocar(k);
          };
          root.addEventListener("focusin", handler);
          quitarFoco = () => root.removeEventListener("focusin", handler);
        };

        /* ---------------------------- MAZO ---------------------------- */
        const armarMazo = (): boolean => {
          root.dataset.sv = "mazo";
          // Costura solo con puntero fino (Lenis): con scroll nativo (táctil)
          // el transform del contenido se escribe en el hilo principal y llega
          // un cuadro después del scroll del compositor (screencast táctil: 4 a
          // 7 cuadros de 4 a 22 px fuera de lugar, contra un solo salto de 16 a
          // 20 px sin costura).
          const d = scrollNativo() ? 0 : COSTURA.d;
          // El ancla #servicios cae al final de la costura de entrada (el
          // bloque ya frenó debajo del nav y la primera placa está por subir):
          // Servicios.module.css resta --sv-costura del scroll-margin-top.
          root.style.setProperty("--sv-costura", `${d}px`);
          medir();
          if (noEntra(0)) return false;
          // Rendimiento: lo que el mazo mueve se lee en una sola tanda, con el
          // modo ya puesto (prepararTransformes, lib/gsap.ts).
          quitarPreparacion = prepararTransformes(
            [...cartas, ...textos, ...zooms, ...llenos],
            velos,
          );

          // Costura: el encabezado y el escenario son los hijos del pin y
          // nada más los mueve en `y` (las placas se mueven adentro).
          const recorrido = () => Math.round(window.innerHeight * RECORRIDO);
          const costura = conCostura(
            {
              trigger: pin,
              pin: true,
              start: () => `top ${altoNav() + d}px`,
              end: () => `+=${recorrido()}`,
              scrub: SCRUB,
              // anticiparPin: 1 solo con scroll nativo (tablets táctiles en
              // modo mazo), donde evita que el pin tiemble al fijarse; con
              // Lenis da 0 (adelantarlo producía un salto de ~50px).
              anticipatePin: anticiparPin(),
              refreshPriority: 0,
              // Los destinos dependen del alto de la pantalla (asome, fuera).
              invalidateOnRefresh: true,
            },
            [cabecera, escenario],
            { d, recorrido },
          );
          quitarCostura = costura.limpiar;
          const linea = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: costura.vars,
          });

          // La primera ya está: su foto se asienta mientras llega la segunda.
          linea.to(zooms[0], { scale: 1, duration: INICIO + 1, ease: TRAMO }, 0);

          for (let k = 1; k < n; k++) {
            const t = INICIO + (k - 1);
            // Sube desde abajo de la pantalla (el CSS la corre --sv-fuera) y
            // se apoya un asome más abajo que la anterior: las tapadas asoman
            // arriba, como un mazo.
            linea.to(
              cartas[k],
              {
                y: () => k * asome - fuera,
                duration: 1,
                ease: TRAMO,
              },
              t,
            );
            // El texto llega un poco después que la placa (el CSS lo baja).
            linea.to(
              textos[k],
              {
                y: () => -(parseFloat(getComputedStyle(textos[k]).top) || 0),
                duration: 1,
                ease: TRAMO,
              },
              t + DESFASE_TEXTO,
            );
            // Zoom lento: la foto se asienta mientras la placa está arriba.
            linea.to(
              zooms[k],
              {
                scale: 1,
                duration: k === n - 1 ? 1 + FINAL : 1.6,
                ease: TRAMO,
              },
              t,
            );
            // Las de abajo se achican y oscurecen un nivel más.
            for (let i = 0; i < k; i++) {
              const vars = { duration: 0.8, ease: TRAMO };
              linea.to(cartas[i], { ...vars, scale: escala(k - i) }, t + 0.2);
              linea.to(velos[i], { ...vars, opacity: oscuro(k - i) }, t + 0.2);
            }
            if (llenos[k]) {
              linea.to(
                llenos[k],
                { scaleX: 1, duration: 0.45, ease: TRAMO },
                t + 0.55,
              );
            }
          }
          // Respiro final con el mazo completo antes de soltar el pin.
          linea.to({}, { duration: FINAL }, INICIO + (n - 1));

          escucharFoco((k) => {
            const st = linea.scrollTrigger;
            if (!st) return;
            const total = linea.duration();
            // La primera también espera a que el bloque frene (costura).
            const llega = INICIO + k;
            const sigue = k === n - 1 ? total : INICIO + k + 0.15;
            const ahora = st.progress * total;
            if (ahora >= llega - 0.02 && ahora <= sigue) return;
            irA(st.start + (llega / total) * (st.end - st.start));
          });
          return true;
        };

        /* ---------------------------- PILA ---------------------------- */
        const armarPila = (): boolean => {
          root.dataset.sv = "pila";
          medir();
          if (noEntra(FOTO_MIN)) return false;
          // Rendimiento: placas y fotos se leen en una sola tanda antes de
          // crear sus quickSetter (prepararTransformes, lib/gsap.ts).
          quitarPreparacion = prepararTransformes([...cartas, ...zooms]);

          const tope = () => altoNav() + AIRE_PILA;
          const alto = () => cartas[0].offsetHeight;
          const paso = () =>
            alto() + (parseFloat(getComputedStyle(escenario).rowGap) || 0);
          // Zoom inicial de la foto: el mismo que pone el CSS del modo.
          const zoom =
            parseFloat(getComputedStyle(root).getPropertyValue("--sv-zoom")) ||
            1;
          const suave = gsap.parseEase(TRAMO);
          // Escribe solo si el valor cambió (refresh y update pueden caer en el
          // mismo cuadro).
          // quickSetter no acepta el atajo "scale": se escriben los dos ejes.
          const setter = (el: HTMLElement, prop: "scale" | "opacity") => {
            const sets = (prop === "scale" ? ["scaleX", "scaleY"] : [prop]).map(
              (p) => gsap.quickSetter(el, p),
            );
            let ultimo = NaN;
            return (v: number) => {
              if (Math.abs(v - ultimo) < 1e-4) return;
              ultimo = v;
              sets.forEach((set) => set(v));
            };
          };
          const setEscala = cartas.map((c) => setter(c, "scale"));
          const setVelo = velos.map((v) => setter(v, "opacity"));
          const setZoom = zooms.map((z) => setter(z, "scale"));

          // Tramos, en px de scroll. Las placas son sticky: se miden sobre el
          // escenario (estático), cuyo borde de arriba queda en `top` px de la
          // pantalla con el scroll en `T - top`. La placa k está k * paso más
          // abajo que la primera.
          // - entra[k] (zoom): desde que la placa asoma abajo hasta que se
          //   pega arriba.
          // - tapa[k] (k >= 1): mientras tapa a la k-1 (de apoyarse en su
          //   borde de abajo a pegarse), las de abajo bajan un nivel.
          // Antes era un ScrollTrigger por tramo (7 con 4 placas); ahora uno
          // solo cubre todos y el progreso de cada tramo se calcula igual que
          // ScrollTrigger (lineal y recortado a 0..1). Mismo resultado, con
          // 6 triggers menos que crear al hidratar y que recalcular en cada
          // refresh (~70 ms menos de bloqueo en un celular de gama media).
          type Tramo = readonly [desde: number, hasta: number];
          const entra: Tramo[] = [];
          const tapa: Tramo[] = [];
          let y = 0;
          const progreso = ([desde, hasta]: Tramo) =>
            hasta > desde
              ? gsap.utils.clamp(0, 1, (y - desde) / (hasta - desde))
              : Number(y >= hasta);
          const medirTramos = (T: number) => {
            const vh = window.innerHeight;
            const tp = tope();
            const al = alto();
            const pa = paso();
            for (let k = 0; k < n; k++) {
              const pegada = T - (tp + k * asome - k * pa);
              entra[k] = [T - (vh - k * pa), pegada];
              if (k > 0) {
                tapa[k] = [T - (tp + (k - 1) * asome + al - k * pa), pegada];
              }
            }
          };

          // Todo el estado sale del progreso de los tramos (no se pisan), así
          // que cada escritura deja las 4 placas coherentes.
          const aplicar = () => {
            for (let i = 0; i < n; i++) {
              let nivel = 0;
              for (let k = i + 1; k < n; k++) {
                nivel += suave(tapa[k] ? progreso(tapa[k]) : 0);
              }
              setEscala[i](escala(nivel));
              setVelo[i](oscuro(nivel));
              const asentada = entra[i] ? progreso(entra[i]) : 0;
              setZoom[i](zoom - (zoom - 1) * asentada);
            }
          };

          // Un trigger del primer tramo que empieza (entra[0]: el escenario
          // asoma abajo) al último que termina (la última placa se pega). Su
          // `start` es T - alto de la pantalla.
          ScrollTrigger.create({
            trigger: escenario,
            start: () => `top ${window.innerHeight}px`,
            end: () => `top ${tope() + (n - 1) * asome - (n - 1) * paso()}px`,
            onUpdate: (self) => {
              y = self.scroll();
              aplicar();
            },
            onRefresh: (self) => {
              medirTramos(self.start + window.innerHeight);
              y = self.scroll();
              aplicar();
            },
          });

          escucharFoco((k) => {
            if (k === n - 1) return;
            const r = cartas[k].getBoundingClientRect();
            const s = cartas[k + 1].getBoundingClientRect();
            if (s.top >= r.bottom - 4) return;
            irA(
              escenario.getBoundingClientRect().top +
                window.scrollY -
                (tope() + k * asome - k * paso()),
            );
          });
          return true;
        };

        const limpiar = () => {
          quitarFoco();
          quitarCostura();
          quitarCapa();
          quitarModo();
          gsap.set(animados, { clearProps: "transform,opacity" });
          quitarPreparacion();
        };

        try {
          const armado = mazo ? armarMazo() : armarPila();
          if (!armado) {
            limpiar();
            return;
          }
          // will-change de placas y fotos solo con la sección cerca.
          quitarCapa = capaActiva(root);
          ScrollTrigger.addEventListener("refreshInit", medir);
          // Si la página ya cargó (HMR, cambio de tamaño, o una red lenta en
          // la que `load` llega antes de hidratar), el resto de los triggers
          // tiene que enterarse del nuevo alto de la sección. Al cargar, el
          // pin del hero ya encoló ese refresh: no se pide otro.
          if (document.readyState === "complete") {
            quitarRefresh = refrescarSiNadieLoHace();
          }
        } catch (error) {
          // Fail-open: la grilla de siempre, sin transformaciones.
          if (process.env.NODE_ENV !== "production") console.error(error);
          limpiar();
          return;
        }

        // Corre después de que el contexto revierte lo suyo (cambio de modo o
        // desmontaje): vuelve a la grilla limpia.
        return () => {
          vivo = false;
          quitarRefresh();
          ScrollTrigger.removeEventListener("refreshInit", medir);
          limpiar();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section id="servicios" ref={rootRef} className={styles.raiz}>
      <Container>
        <div data-sv-parte="pin" className={styles.pin}>
          <div data-sv-parte="cabecera" className={styles.cabecera}>
            <SectionHead
              kicker={servicios.head.kicker}
              title={servicios.head.title}
              className={styles.cabeza}
            />
            {/* Cuántas placas van (decorativo, solo en el mazo). */}
            <div aria-hidden className={styles.marcas}>
              {servicios.items.map((s) => (
                <span key={s.id} className={styles.marca}>
                  <span data-sv-parte="lleno" className={styles.lleno} />
                </span>
              ))}
            </div>
          </div>

          <div data-sv-parte="escenario" className={styles.escenario}>
            {servicios.items.map((s, i) => (
              <div
                key={s.id}
                data-sv-parte="carta"
                className={cn(styles.carta, s.wide && styles.ancha)}
                style={{ "--i": i } as CSSProperties}
              >
                <CotizarCard
                  servicio={s.servicioValue}
                  ariaLabel={`Cotizar ${s.title}`}
                  className={styles.placa}
                >
                  <div className={styles.foto}>
                    <div data-sv-parte="zoom" className={styles.zoom}>
                      <Image
                        src={s.image}
                        alt={s.alt}
                        fill
                        quality={88}
                        sizes="(max-width: 759px) 100vw, (max-width: 1160px) 54vw, 600px"
                        style={
                          {
                            "--obj-m": s.objectPositionMobile ?? s.objectPosition,
                            "--obj-d": s.objectPosition,
                          } as CSSProperties
                        }
                        className="serv-obj object-cover transition-transform duration-500 ease-resorte group-hover:scale-[1.05]"
                      />
                    </div>
                  </div>
                  <div data-sv-parte="texto" className={styles.texto}>
                    <span aria-hidden className={styles.indice}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3
                      className={cn(
                        "font-display font-medium text-crema",
                        styles.titulo,
                      )}
                    >
                      {s.title}
                    </h3>
                    <p className={cn("text-crema-dim", styles.desc)}>{s.desc}</p>
                    <Etiqueta className={styles.etiqueta}>{s.etiqueta}</Etiqueta>
                    <CotizarCue>{s.ctaLabel}</CotizarCue>
                  </div>
                </CotizarCard>
                <div aria-hidden data-sv-parte="velo" className={styles.velo} />
              </div>
            ))}
            {/* Pila (mobile): mantiene pegada la pila completa un momento. */}
            <div aria-hidden className={styles.cola} />
          </div>
        </div>
      </Container>
    </section>
  );
}
