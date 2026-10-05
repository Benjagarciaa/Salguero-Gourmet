/* ==========================================================================
 * Tapa de la caja: una capa aparte, dibujada en vivo (sin React y sin GSAP).
 *
 * El cuadro 1 del video es la caja abierta y llena; con la tapa encima es la
 * caja cerrada. La apertura no son cuadros: este canvas (encima del marco, a
 * todo el ancho del escenario, así la tapa puede salirse del marco) dibuja la
 * tapa con transformaciones continuas según el progreso `u` (0 a 1):
 *   - se levanta hacia la cámara (escala 1 a `escala`, curva sine.inOut: la
 *     más pareja, sin un pico de velocidad a mitad de camino), sube hasta
 *     salir de la caja (SUBE: a u = 0.7 su borde de abajo ya pasó el borde de
 *     arriba de la caja) y se inclina apenas. Se va como un objeto opaco que
 *     se levanta, no disolviéndose sobre la comida (se leía como un velo
 *     lechoso encima de los productos, una doble exposición);
 *   - pasa de nítida a desenfocada (las dos sumadas con sus pesos, composición
 *     "lighter": la interpolación exacta, así a mitad del cruce la tapa no se
 *     vuelve transparente ni le queda un halo) y se desvanece recién en el
 *     último 30% del tramo, ya fuera de la caja, como si pasara la cámara;
 *   - su sombra sobre la caja se abre, se corre y se apaga: la comida arranca
 *     apenas en sombra y se ilumina al quedar descubierta.
 * Por la ventana de film se ve el cuadro de abajo con paralaje real.
 * La posición es la del canvas de los cuadros (incluye el acercamiento de
 * desktop y el corrimiento del marco en mobile): siempre calza. Sin leer
 * rects en cada cuadro (eran dos getBoundingClientRect por tick, justo después
 * de que GSAP escribió estilos: layout forzado de 58 a 111 ms con CPU x4). La
 * geometría de layout se mide una vez (al empezar, al cambiar de tamaño y en
 * cada refresh, `recalcular`) y en cada cuadro se le aplican las
 * transformaciones que el timeline le puso a la cadena imagen > encuadre >
 * marco, leídas de la caché de GSAP (`transformDe`, sin layout).
 * Con u >= 1 el canvas se vacía, se achica a 1px y se oculta (no ocupa memoria
 * ni composición el resto del recorrido).
 * ========================================================================== */

const DPR_MAX = 2;
/**
 * Cuánto sube la tapa (en altos del cuadro) al final de su tramo, con la
 * subida en suave(0.15, 1, u). Con la tapa en 34.3% a 70% del cuadro y la
 * escala final de 2.05: a u = 0.7 (donde empieza a apagarse) su borde de
 * abajo queda sobre el borde de arriba de la caja (34.5%), así nunca se apaga
 * encima de la comida.
 */
const SUBE = 0.72;
const GRADOS = Math.PI / 180;

/** Datos de la tapa (heroSecuencia.tapa). */
export interface DatosTapa {
  ancho: number;
  alto: number;
  margen: number;
  rect: { x: number; y: number; w: number; h: number };
  escala: number;
}

/** Traslación y escala uniforme que el timeline le puso a un elemento. */
export interface Desplazamiento {
  x: number;
  y: number;
  /** En % del ancho y del alto del propio elemento (como xPercent/yPercent). */
  xPercent: number;
  yPercent: number;
  escala: number;
}

export interface CapaTapa {
  /** Dibuja la tapa en el progreso `u` (0 = cerrada, 1 = ya pasó). */
  dibujar(u: number): void;
  /**
   * La geometría de layout cambió (refresh de ScrollTrigger, nuevo origen de
   * una transformación): se vuelve a medir antes del próximo dibujo.
   */
  recalcular(): void;
  /** Baja la versión desenfocada (después de `load`). */
  cargarDesenfocada(url: string): void;
  destruir(): void;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const suave = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const sineInOut = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * Sombra pre-renderizada: un rectángulo de puntas redondeadas (la huella de la
 * tapa) difuminado, en un sprite chico que se dibuja escalado. La forma ocupa
 * la mitad del sprite; `desenfoque` es relativo al lado de la forma.
 */
function crearSombra(desenfoque: number): HTMLCanvasElement {
  const lado = 128;
  const forma = lado / 2;
  const c = document.createElement("canvas");
  c.width = lado;
  c.height = lado;
  const g = c.getContext("2d");
  if (!g) return c;
  // La forma se dibuja fuera del sprite y solo su sombra cae adentro.
  const fuera = 1000;
  g.shadowColor = "rgba(12, 8, 5, 1)";
  g.shadowBlur = desenfoque * forma;
  g.shadowOffsetX = fuera;
  g.fillStyle = "#000";
  const x0 = (lado - forma) / 2 - fuera;
  const y0 = (lado - forma) / 2;
  const r = forma * 0.03;
  g.beginPath();
  g.moveTo(x0 + r, y0);
  g.arcTo(x0 + forma, y0, x0 + forma, y0 + forma, r);
  g.arcTo(x0 + forma, y0 + forma, x0, y0 + forma, r);
  g.arcTo(x0, y0 + forma, x0, y0, r);
  g.arcTo(x0, y0, x0 + forma, y0, r);
  g.closePath();
  g.fill();
  return c;
}

/** Rect en px, relativo al lienzo de la tapa. */
type Caja = { x: number; y: number; w: number; h: number };

export function crearTapa({
  canvas,
  referencia,
  cadena,
  transformDe,
  tapa,
  datos,
  alDibujar,
}: {
  /** Canvas transparente que cubre el escenario. */
  canvas: HTMLCanvasElement;
  /** El canvas de los cuadros (su rect en pantalla = el cuadro). */
  referencia: HTMLElement;
  /**
   * Los elementos que mueven a `referencia` dentro del escenario, del más
   * interno al más externo (imagen, encuadre, marco). Todos ocupan la caja del
   * marco (inset 0) y solo se trasladan y escalan (sin giro).
   */
  cadena: HTMLElement[];
  /** La transformación actual de un elemento de la cadena (sin tocar layout). */
  transformDe: (el: HTMLElement) => Desplazamiento;
  /** La tapa nítida (el <img> del servidor, ya en la página). */
  tapa: HTMLImageElement;
  datos: DatosTapa;
  /** Se llama una vez, después del primer dibujo. */
  alDibujar?: () => void;
}): CapaTapa {
  const ctx = canvas.getContext("2d");
  const sombraCerca = crearSombra(0.05);
  const sombraLejos = crearSombra(0.32);
  /** La desenfocada ya decodificada (ImageBitmap donde se puede). */
  let desenfocada: HTMLImageElement | ImageBitmap | null = null;
  let lista = false;
  let muerto = false;
  let avisado = false;
  let oculto = false;
  let ultimaU = -1;
  let ultimaGeo = "";
  let dpr = 1;
  let cssW = 0;
  let cssH = 0;

  /*
   * Geometría de layout (sin transformaciones), relativa al lienzo de la tapa:
   * la esquina de la caja del marco (P), su tamaño y el origen de la
   * transformación de cada elemento de la cadena (px, desde esa esquina). Se
   * mide con rects una sola vez y se invalida con `recalcular`.
   */
  let geoLista = false;
  let px0 = 0;
  let py0 = 0;
  let caja = { w: 0, h: 0 };
  let origenes: { x: number; y: number }[] = [];

  /**
   * Dónde queda la esquina de la caja (relativa a P) y con qué escala total,
   * con las transformaciones actuales. Cada elemento, alrededor de su origen o:
   * q' = o + t + s (q - o); del más interno al más externo, todo en el mismo
   * sistema sin transformar (el de P).
   */
  const componer = () => {
    let qx = 0;
    let qy = 0;
    let escala = 1;
    for (let k = 0; k < cadena.length; k++) {
      const t = transformDe(cadena[k]);
      const o = origenes[k] ?? { x: 0, y: 0 };
      const tx = t.x + (t.xPercent / 100) * caja.w;
      const ty = t.y + (t.yPercent / 100) * caja.h;
      qx = o.x + tx + t.escala * (qx - o.x);
      qy = o.y + ty + t.escala * (qy - o.y);
      escala *= t.escala;
    }
    return { qx, qy, escala };
  };

  /** Mide la geometría de layout (una lectura de rects, fuera de cada cuadro). */
  const medirGeometria = (): boolean => {
    const R = referencia.getBoundingClientRect();
    const C = canvas.getBoundingClientRect();
    if (R.width < 2 || C.width < 2) return false;
    origenes = cadena.map((el) => {
      const [ox = 0, oy = 0] = getComputedStyle(el)
        .transformOrigin.split(" ")
        .map((v) => parseFloat(v) || 0);
      return { x: ox, y: oy };
    });
    // Primero el tamaño (los xPercent/yPercent dependen de él): el rect solo
    // incluye la escala total.
    const { escala } = componer();
    if (!(escala > 0)) return false;
    caja = { w: R.width / escala, h: R.height / escala };
    const { qx, qy } = componer();
    px0 = R.left - C.left - qx;
    py0 = R.top - C.top - qy;
    geoLista = true;
    return true;
  };

  /** El rect del canvas de los cuadros ahora, relativo al lienzo de la tapa. */
  const cuadro = (): Caja | null => {
    if (!geoLista && !medirGeometria()) return null;
    const { qx, qy, escala } = componer();
    return {
      x: px0 + qx,
      y: py0 + qy,
      w: caja.w * escala,
      h: caja.h * escala,
    };
  };

  const medir = () => {
    dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    const cs = getComputedStyle(canvas);
    cssW = parseFloat(cs.width) || 0;
    cssH = parseFloat(cs.height) || 0;
  };

  const dimensionar = () => {
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      ultimaGeo = "";
      geoLista = false;
    }
  };

  const ocultar = () => {
    if (oculto) return;
    oculto = true;
    canvas.style.visibility = "hidden";
    // Sin memoria de un lienzo a pantalla completa el resto del recorrido.
    canvas.width = 1;
    canvas.height = 1;
    ultimaGeo = "";
  };

  const mostrar = () => {
    if (!oculto) return;
    oculto = false;
    canvas.style.removeProperty("visibility");
  };

  /** Primer dibujo: el lienzo reemplaza a la tapa fija del servidor. */
  const avisar = () => {
    if (avisado) return;
    avisado = true;
    alDibujar?.();
  };

  const pintar = (u: number) => {
    if (!ctx || !lista || muerto) return;
    if (u >= 1) {
      ultimaU = u;
      ocultar();
      // La tapa ya pasó: la fija del servidor también tiene que irse. Sin
      // esto, si el primer dibujo llegaba con la tapa ya pasada (la persona
      // scrolleó antes de que la tapa estuviera lista), la tapa fija quedaba
      // cerrada encima de la caja abierta.
      avisar();
      return;
    }
    mostrar();
    dimensionar();
    const R = cuadro();
    if (!R || R.w < 2) return;
    const geo = `${R.x}|${R.y}|${R.w}|${R.h}|${canvas.width}`;
    if (u === ultimaU && geo === ultimaGeo) return;
    ultimaU = u;
    ultimaGeo = geo;

    const { rect, escala, margen, ancho, alto } = datos;
    const lw = (rect.w / 100) * R.w;
    const lh = (rect.h / 100) * R.h;
    const cx = R.x + (rect.x / 100) * R.w + lw / 2;
    const cy = R.y + (rect.y / 100) * R.h + lh / 2;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // La tapa: hacia la cámara, un poco hacia arriba y apenas inclinada.
    // Se dibuja primero (sobre el lienzo vacío, "lighter" suma exacto) y la
    // sombra va después, por debajo (destination-over).
    const t = sineInOut(u);
    const s = 1 + (escala - 1) * t;
    // Primero se acerca casi en su lugar (los botones del inicio terminan de
    // irse arriba) y después sube, sin escalón de velocidad.
    const sube = -SUBE * R.h * suave(0.15, 1, u);
    const giro = -3.5 * GRADOS * sineInOut(u);
    // Opaca mientras se levanta sobre la caja; se apaga ya afuera.
    const opacidad = 1 - suave(0.7, 1, u);
    const desenfoque = desenfocada ? suave(0.25, 0.8, u) : 0;
    // Sin la desenfocada todavía, la nítida se desvanece un poco antes.
    const nitida = desenfocada ? 1 - desenfoque : 1 - suave(0.45, 0.9, u);
    if (opacidad > 0.002) {
      ctx.save();
      ctx.translate(cx, cy + sube);
      ctx.rotate(giro);
      ctx.scale(s, s);
      ctx.globalCompositeOperation = "lighter";
      if (desenfocada && desenfoque > 0.002) {
        const mx = (margen / ancho) * lw;
        const my = (margen / alto) * lh;
        ctx.globalAlpha = opacidad * desenfoque;
        ctx.drawImage(
          desenfocada,
          -lw / 2 - mx,
          -lh / 2 - my,
          lw + 2 * mx,
          lh + 2 * my,
        );
      }
      if (nitida > 0.002) {
        ctx.globalAlpha = opacidad * nitida;
        ctx.drawImage(tapa, -lw / 2, -lh / 2, lw, lh);
      }
      ctx.restore();
    }

    // Sombra sobre la caja: nítida y apenas oscura con la tapa apoyada (la
    // comida arranca apenas en sombra), se abre, se corre hacia abajo a la
    // derecha y se apaga mientras sube (la comida se ilumina). Con la misma
    // curva que la tapa (sineInOut): arranca con velocidad 0, sin escalón.
    const e = sineInOut(u);
    const fuerza = 0.34 * (1 - suave(0, 0.72, u));
    if (fuerza > 0.003) {
      const escS = 1 + 0.32 * e;
      const sw = lw * escS * 2;
      const sh = lh * escS * 2;
      const sx = cx + 0.035 * lw * e - sw / 2;
      const sy = cy + 0.08 * lh * e - sh / 2;
      const mezcla = suave(0, 0.45, u);
      ctx.globalCompositeOperation = "destination-over";
      ctx.globalAlpha = fuerza * (1 - mezcla);
      ctx.drawImage(sombraCerca, sx, sy, sw, sh);
      ctx.globalAlpha = fuerza * mezcla;
      ctx.drawImage(sombraLejos, sx, sy, sw, sh);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    avisar();
  };

  let pendiente = -1;
  let raf = 0;
  const pedir = (u: number) => {
    pendiente = u;
    if (!raf && !muerto)
      raf = requestAnimationFrame(() => {
        raf = 0;
        pintar(pendiente);
      });
  };

  const ro = new ResizeObserver(() => {
    medir();
    ultimaGeo = "";
    geoLista = false;
    if (ultimaU >= 0) pedir(ultimaU);
  });
  ro.observe(canvas);
  medir();

  // La tapa del servidor ya está (o está por estar) decodificada.
  tapa
    .decode()
    .catch(() => {})
    .then(() => {
      if (muerto || !tapa.naturalWidth) return;
      lista = true;
      pedir(ultimaU < 0 ? 0 : ultimaU);
    });

  return {
    dibujar(u) {
      const v = clamp01(u);
      if (!lista) {
        ultimaU = v;
        return;
      }
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      pintar(v);
    },

    recalcular() {
      geoLista = false;
      ultimaGeo = "";
    },

    cargarDesenfocada(url) {
      if (desenfocada || muerto) return;
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      img
        .decode()
        // Como ImageBitmap: decodificada fuera del hilo principal. Un <img>
        // dibujado en el canvas por primera vez se decodificaba de nuevo, de
        // forma sincrónica, en el Commit del cuadro (6.5 ms en pleno scroll).
        .then(() =>
          typeof createImageBitmap === "function"
            ? createImageBitmap(img).catch(() => img)
            : img,
        )
        .then((lista) => {
          if (muerto) {
            if (!(lista instanceof HTMLImageElement)) lista.close();
            return;
          }
          desenfocada = lista;
          ultimaGeo = "";
          if (ultimaU > 0 && ultimaU < 1) pedir(ultimaU);
        })
        .catch(() => {});
    },

    destruir() {
      muerto = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      if (desenfocada && !(desenfocada instanceof HTMLImageElement)) {
        desenfocada.close();
      }
      desenfocada = null;
      canvas.style.removeProperty("visibility");
    },
  };
}
