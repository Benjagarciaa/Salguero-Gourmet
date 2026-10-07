/**
 * content/data.ts · Salguero Gourmet
 * ---------------------------------------------------------------------------
 * FUENTE ÚNICA DE COPY. Todo el texto de la landing vive acá, tipado.
 *
 * Reglas (ver CLAUDE.md):
 *  - El copy proviene del mockup aprobado (_assets/mockup-salguero-v4.html).
 *    Transcripto, no reescrito. Español argentino, voseo, sin guion largo ni medio.
 *  - Lo no confirmado va como "[[PLACEHOLDER]]" y queda registrado en PENDIENTES.md.
 *  - Los textos de reseñas son reales (Google): se dejan VERBATIM, con sus typos.
 *
 * Convención de placeholder: cualquier string "[[X]]". Usar isPlaceholder() para que
 * la UI muestre un fallback prolijo hasta que el cliente confirme el dato.
 */

export const isPlaceholder = (v: string): boolean =>
  v.startsWith("[[") && v.endsWith("]]");

/**
 * El texto de adentro de un placeholder ("[[Budín]]" -> "Budín"); cualquier
 * otro string, igual. Solo para vistas previas decorativas (aria-hidden) que
 * muestran el dato de ejemplo mientras no se confirma.
 */
export const textoDePlaceholder = (v: string): string =>
  isPlaceholder(v) ? v.slice(2, -2) : v;

/* ========================================================================== *
 * Tipos
 * ========================================================================== */

/** Titular con una palabra en itálica amarilla (el <em> del mockup). */
export interface EmphasisTitle {
  pre: string;
  em: string;
  post?: string;
}

/** Bajada con un tramo en <strong> (color crema pleno). */
export interface RichLead {
  pre: string;
  strong: string;
  post: string;
}

export interface CTA {
  label: string;
  href: string;
}

export interface TrustItem {
  /** Texto antes del contador. */
  before: string;
  /** Valor final del contador (el SSR ya muestra este número). */
  count?: number;
  /** Texto después del contador. */
  after?: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface Servicio {
  id: string;
  title: string;
  desc: string;
  etiqueta: string;
  ctaLabel: string;
  /** Debe COINCIDIR con una opción del <select> para la preselección + wa.ts. */
  servicioValue: string;
  image: string;
  alt: string;
  /** object-position de la imagen (desktop, >=760px). */
  objectPosition?: string;
  /** object-position SOLO para mobile (<760px). Si falta, usa objectPosition. */
  objectPositionMobile?: string;
  /** Placa ancha (ocupa la fila completa, imagen a un lado). */
  wide: boolean;
}

export interface GaleriaFoto {
  /** Imagen (o poster del video, si `video` está seteado). */
  image: string;
  /** Etiqueta descriptiva. Asignada por contenido de la foto (a revisar). */
  caption: string;
  alt: string;
  /** Si está seteado, el ítem es un clip: `image` es el poster y esto el .mp4. */
  video?: string;
}

export interface Resena {
  quote: string;
  author: string;
  /** Etiqueta por SERVICIO contratado, nunca por fecha. */
  servicio: string;
  /** false = el servicio de esta reseña está pendiente de confirmar. */
  servicioConfirmado: boolean;
}

export interface Paso {
  n: string;
  title: string;
  desc: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

/* ========================================================================== *
 * Datos de contacto y negocio (globales)
 * ========================================================================== */

export const contacto = {
  // WhatsApp confirmado por el cliente (el 351 2300715).
  whatsappDisplay: "+54 351 230 0715",
  whatsappHref: "https://wa.me/5493512300715",
  email: "salguerogourmet@gmail.com",
  instagramHandle: "@salguerogourmet",
  instagramUrl: "https://instagram.com/salguerogourmet",
  // Link público del perfil de Google, confirmado por el cliente.
  googleProfileUrl: "https://share.google/WSgW27pZTcjI7gejG",
  // Horario de atención confirmado por el cliente (agosto 2026). Lo muestra el
  // aside del cotizador.
  horarioAtencion: "9 a 17 hs",
} as const;

export const site = {
  name: "Salguero Gourmet",
  rating: 5.0,
  reviewCount: 34,
  // Dominio de produccion definitivo (comprado en Vercel). Es el apex, sin www:
  // Vercel redirige www -> apex. Alimenta canonical, metadataBase, sitemap, robots y JSON-LD.
  url: "https://salguerogourmet.com",
  // Fecha real de última actualización del contenido (copy/reseñas). Alimenta el
  // <lastmod> del sitemap; actualizar SOLO cuando cambia el contenido, no en cada
  // deploy, para que sea una señal honesta a los buscadores.
  lastUpdated: "2026-10-05",
  // Descripcion base para meta/OG/JSON-LD (alineada al posicionamiento de autor).
  description:
    "Gastronomía de autor para empresas, instituciones y eventos en Córdoba: desayunos, coffee breaks y mesas gourmet, cuidadas hasta el último detalle. Pedí tu presupuesto por WhatsApp.",
  tagline: "Catering gourmet de autor en Córdoba",
} as const;

/* ========================================================================== *
 * Navegación
 * ========================================================================== */

export const nav = {
  links: [
    { label: "Servicios", href: "#servicios" },
    { label: "Galería", href: "#galeria" },
    { label: "Reseñas", href: "#resenas" },
    { label: "Preguntas", href: "#faq" },
  ] as NavLink[],
  cta: { label: "Pedir presupuesto", href: "#cotizar" } as CTA,
};

/* ========================================================================== *
 * 1 · Hero
 * ========================================================================== */

export const hero = {
  kicker: "Catering · Córdoba",
  title: { pre: "Cada encuentro, ", em: "algo especial" } as EmphasisTitle,
  sub: {
    pre: "Gastronomía de autor para empresas, instituciones y eventos en Córdoba: desayunos, coffee breaks y mesas gourmet, ",
    strong: "cuidadas hasta el último detalle",
    post: ".",
  } as RichLead,
  ctas: {
    primary: { label: "Pedir presupuesto", href: "#cotizar" } as CTA,
    ghost: { label: "Ver el trabajo", href: "#galeria" } as CTA,
  },
  trust: [
    // Sin la cantidad de reseñas: no se muestra en la página (solo va en el
    // JSON-LD, components/chrome/JsonLd.tsx).
    { before: "5.0 en Google" },
    { before: "+", count: 15, after: " años de trayectoria" },
    { before: "+", count: 200, after: " eventos realizados" },
  ] as TrustItem[],
  // El video del hero se retiró: era un montaje de clips que ya están en la
  // galería. Kicker, título, bajada, botones y confianza son el primer momento
  // del escenario de la caja (heroSecuencia, más abajo).
};

/* ========================================================================== *
 * 1c · Hero · escenario de la caja (técnica de Apple, ver HeroSecuencia.tsx)
 * ---------------------------------------------------------------------------
 * El hero entero queda fijo mientras dos <canvas> dibujan lo que corresponde al
 * scroll (todo ligado al mismo progreso `p`, de 0 a 1):
 *   - la TAPA (una capa aparte, dibujada en vivo): se levanta hacia la cámara,
 *     se desenfoca y se desvanece; su sombra se abre sobre la caja y la comida
 *     se ilumina al quedar descubierta (`tapa.tramo`);
 *   - el VIDEO (secuencia de cuadros, uno entero por vez): los 8 productos
 *     suben y se acomodan en tres filas sobre la caja vacía (`video.desde` a
 *     1; quedan quietos cerca de 0.82).
 * Los textos aparecen por momentos, alternando los costados (desktop) o arriba
 * y abajo del marco (mobile):
 *   1. inicio (visible al cargar): kicker, título, bajada y botones; confianza.
 *   2. horneado: una frase grande, centrada debajo de la caja (las dos).
 *   3. cifras: 5.0, +15 y +200 en grande (desktop a la izquierda; mobile
 *      arriba, en tres columnas).
 *   4. fichas (solo desktop): una por producto, fila por fila, cuando se
 *      acomodan. En mobile la caja abierta queda sola, sin rótulos.
 *   5. cierre: título grande y botón, centrado debajo de la caja
 *      abierta en todos los anchos (la caja sube lo justo para dejarle lugar).
 *   6. salida: la caja abierta y el cierre se alejan juntos (escala y
 *      opacidad, sobre el mismo fondo) mientras Servicios sube pegado por
 *      abajo (`salida`).
 * Para cambiar los cuadros se tocan SOLO estos datos:
 *   1. Copiar los WebP a su carpeta en /public (una por versión).
 *   2. En `versiones`: carpeta, patron, cuadros, primero, digitos, ancho y alto
 *      (el tamaño real de los archivos: define la relación de aspecto del marco)
 *      y, si la secuencia trae cuadros intermedios, `densidad`.
 *   3. Medir sobre el primer y el último cuadro el `encuadre`, la `tapa` y la
 *      posición de cada producto en `fichas`, y ajustar los tramos si la
 *      secuencia cambia de largo.
 * El primer cuadro (con la tapa encima) y el último también se usan como imagen
 * fija (sin JS, con reducir movimiento y mientras cargan los demás).
 * ========================================================================== */

/**
 * Tramo de la secuencia con cuadros intermedios: cada paso del video que
 * arranca entre el cuadro `desde` (incluido) y el `hasta` (sin incluir; los
 * dos en cuadros del video, 0 = el primero) lleva `x` archivos: el cuadro del
 * video y x - 1 intermedios a tiempos parejos (con x 3, en t + 1/3 y t + 2/3).
 */
export interface HeroDensidad {
  desde: number;
  hasta: number;
  x: number;
}

export interface HeroSecuenciaVersion {
  /** Carpeta dentro de /public, empezando con "/" y sin barra final. */
  carpeta: string;
  /** Nombre de cada archivo: `{n}` es el número del archivo con ceros a la izquierda. */
  patron: string;
  /** Cantidad de archivos (los cuadros del video más los intermedios). */
  cuadros: number;
  /** Número del primer archivo (f001.webp -> 1). */
  primero: number;
  /** Dígitos del número (f001.webp -> 3). */
  digitos: number;
  /** Tamaño real de cada cuadro, en px. Da la relación de aspecto del marco. */
  ancho: number;
  alto: number;
  /**
   * Tramos con cuadros intermedios, en orden y sin superponerse. Sin
   * `densidad`, un archivo por cuadro del video. La coreografía sigue en
   * cuadros del video (el timeline no se entera de los intermedios): el motor
   * ubica cada archivo en su tiempo (tiemposDe, en HeroSecuenciaPlan).
   */
  densidad?: readonly HeroDensidad[];
}

/** Tramo del recorrido, en progreso (0 a 1). */
export interface HeroTramo {
  desde: number;
  hasta: number;
}

/**
 * Ficha de un producto (momento 4, solo desktop). Las de `lado` "izq" y "der"
 * van al costado del marco con una línea fina que llega hasta el producto, y
 * las de "centro" van dentro del marco, justo debajo. En mobile no hay fichas:
 * la caja abierta queda sola (los rótulos tapaban productos).
 */
export interface HeroSecuenciaFicha {
  id: string;
  /** Nombre del producto (en pantalla va en mayúsculas, JetBrains Mono). */
  texto: string;
  lado: "izq" | "der" | "centro";
  /**
   * Producto al que apunta, en % del marco medido sobre el ÚLTIMO cuadro:
   * centro (x, y), borde inferior (`base`) y `punta`, la x donde termina la
   * línea: JUSTO AFUERA del borde del producto (a ~1.5% del marco), así la
   * línea y su punto nunca pisan ni "cortan" un producto.
   */
  producto: { x: number; y: number; base: number; punta: number };
  /** Progreso (0 a 1) en el que aparece. Queda hasta la salida. */
  desde: number;
}

/**
 * Salida del hero hacia Servicios. Empieza con el hero todavía fijo (en
 * `desde`, progreso del recorrido) y sigue después de soltarse, mientras
 * Servicios sube pegado por abajo: las fichas se apagan primero y la caja
 * abierta se aleja (escala hasta `escala`) y se desvanece sobre el mismo
 * fondo. Ya suelto, el marco sube más lento que la página (`deriva`, fracción
 * del scroll que se compensa): se lee como profundidad y no como un corte.
 */
export interface HeroSalida {
  desde: { desktop: number; mobile: number };
  /** Cuánto dura después de soltarse, en altos del escenario. */
  despues: number;
  escala: number;
  deriva: number;
}

/**
 * Antes del cierre (desktop y mobile): el encuadre (caja abierta, productos y
 * fichas) sube y, si hace falta, se achica lo justo para que el cierre entre
 * ENTERO debajo de la caja, sin tapar nada. El cálculo sale de las medidas reales (alto del
 * escenario, del marco y del cierre) en cada refresh; `escalaMin` es el tope.
 */
export interface HeroAjusteCierre {
  tramo: HeroTramo;
  escalaMin: number;
}

/** Una cifra del momento 3: número grande y rótulo (corto en mobile). */
export interface HeroCifra {
  valor: string;
  texto: string;
  corto: string;
}

export const heroSecuencia = {
  /**
   * Desktop (>=860px de ancho y >=600px de alto) y mobile. Las dos en 9:16 y
   * con el fondo TRANSPARENTE (WebP con alfa: el fondo del video se llevó al
   * #241c15 de la web y después se recortó, con las sombras como sombra
   * translúcida), así detrás de los productos se ve la página misma y el marco
   * nunca se lee como un rectángulo de otro tono. Los cuadros son SOLO el
   * video (el primero es la caja abierta y llena): la tapa es otra capa. El
   * motor decodifica solo los cuadros cercanos al actual, así que la cantidad
   * no pesa en memoria; sí en datos (desktop ~15MB, mobile ~10MB en total: la
   * pasada inicial después de `load`, los mismos 23 archivos que antes de los
   * intermedios, y el resto por tramos, a medida que la persona scrollea; ver
   * HeroSecuencia.tsx).
   * caja-v9 = caja-v8 con 110 intermedios retocados: los huecos de alfa que
   * dejaba RIFE dentro de los productos (muescas en la corteza del budín y en
   * el borde del yogur, la ranura bajo la tapa del frasco) se rellenaron con
   * la mezcla de los dos cuadros del video vecinos, solo donde esos dos
   * coinciden entre sí (nunca en un borde en movimiento). Mismo WebP (q86).
   * caja-v8 = los 172 cuadros del video, idénticos byte a byte a los de
   * caja-v6/desktop y caja-v7/mobile, más cuadros intermedios (`densidad`) en
   * el tramo donde los productos se mueven más por cuadro (salen de la caja y
   * gira el vaso de café): con scroll lento cada cambio de cuadro era un
   * saltito de hasta ~6 px en pantalla y ahora queda debajo de 2.5 px.
   * Interpolados con RIFE v4.6 sobre video-2.mp4, con un realce suave dentro
   * de los productos y la misma receta que los originales (fondo
   * transparente, halo, sombras y huecos de mobile, mismo WebP).
   * caja-v6 = caja-v4 (la fuente, con el vaso corregido en 162 a 172; está en
   * _assets/archivo/media/secuencia) con el borde semitransparente de cada
   * producto llevado a sombra oscura en TODOS los cuadros (traía el color del
   * fondo del video: un halo oliva; en caja-v5 quedaba en 150 a 172) y el alfa
   * idéntico, en WebP q80 (q82 a q88 en los cuadros que lo necesitan para
   * quedar a 40 dB o más de la fuente): -10% de peso contra caja-v5.
   * La carpeta cambia de nombre con cada versión: /media/secuencia tiene caché
   * de un año (next.config.ts), nunca se pisa un cuadro en el lugar.
   */
  versiones: {
    // Fuente: _assets/contenido/video-2.mp4 (cuadros 21 a 192). 291 archivos:
    // los 172 del video y 119 intermedios (x2 en 4-10, x3 en 10-32 y x2 en
    // 32-101: ahí los productos se movían de 3 a 6 px por cuadro).
    desktop: {
      carpeta: "/media/secuencia/caja-v9/desktop",
      patron: "f{n}.webp",
      cuadros: 291,
      primero: 1,
      digitos: 3,
      ancho: 720,
      alto: 1280,
      densidad: [
        { desde: 4, hasta: 10, x: 2 },
        { desde: 10, hasta: 32, x: 3 },
        { desde: 32, hasta: 101, x: 2 },
      ],
    } as HeroSecuenciaVersion,
    // Los mismos 172 cuadros que desktop, a 540x960 (con la mitad, cada cambio
    // de cuadro era el doble de largo mientras suben los productos), más 96
    // intermedios (x2 en 6-102): 268 archivos.
    // Los originales son los de caja-v7/mobile = caja-v6/mobile con la sombra
    // oscura alrededor de los productos bajada al 15 % (sobre el brillo cálido
    // del fondo en celular se veía como mancha) y el hueco de la mermelada
    // relleno con el color real (caja-v3).
    mobile: {
      carpeta: "/media/secuencia/caja-v9/mobile",
      patron: "f{n}.webp",
      cuadros: 268,
      primero: 1,
      digitos: 3,
      ancho: 540,
      alto: 960,
      densidad: [{ desde: 6, hasta: 102, x: 2 }],
    } as HeroSecuenciaVersion,
  },
  /** Punto del cuadro que se conserva si el marco lo recorta (en %, como object-position). */
  foco: { x: 50, y: 50 },
  /** Cuánto se scrollea con el hero fijo, en pantallas (alto de la ventana). */
  recorrido: { desktop: 3.5, mobile: 2.6 },
  /**
   * La tapa, como capa separada sobre el primer cuadro (tapa + cuadro 1 = la
   * caja cerrada). Se dibuja en vivo en su propio canvas, con transformaciones
   * continuas: sin escalones.
   */
  tapa: {
    // v3: tapa regenerada en alta (Nano Banana, recorte de Benjamin), encajada con una
    // homografía sobre la geometría exacta de la anterior y con su mismo acetato.
    // Mismas medidas; nombre nuevo por la caché inmutable de /media/secuencia.
    imagen: "/media/secuencia/caja-v6/tapa-v3.webp",
    /** La misma, desenfocada, con `margen` px transparentes por lado. */
    desenfocada: "/media/secuencia/caja-v6/tapa-blur-v3.webp",
    ancho: 682,
    alto: 685,
    margen: 40,
    /** Posición sobre el cuadro, en % (izquierda, arriba, ancho y alto). */
    rect: { x: 18.52, y: 34.32, w: 63.15, h: 35.68 },
    /** Escala final: se acerca a la cámara hasta pasarla. */
    escala: 2.05,
    tramo: { desde: 0.02, hasta: 0.32 } as HeroTramo,
  },
  /**
   * El video corre desde `desde` hasta el final, empezando mientras la tapa
   * termina de pasar (la acción no se corta). `curva` > 1 le da más scroll al
   * arranque (los productos salen rápido de la caja) y menos al final (ya casi
   * quietos): el cambio en pantalla por px de scroll queda más parejo. Con
   * estos valores, los productos quedan quietos (cuadro ~124) cerca de 0.82.
   */
  video: { desde: 0.27, curva: 1.15 },
  /**
   * Medidas de los cuadros en % del marco (iguales en las dos versiones). Con
   * ellas la confianza se apoya en la base de la caja cerrada, el horneado se
   * centra debajo de ella, el cierre se centra debajo de la caja vacía (el
   * encuadre sube lo justo para dejarle lugar) y la salida se
   * aleja desde el centro de la caja abierta (productos + caja vacía).
   */
  encuadre: {
    /** Caja cerrada (con la tapa), en el primer cuadro (borde superior e inferior). */
    cajaInicio: { arriba: 34.5, abajo: 69.7 },
    /**
     * Caja vacía con su papel, en el último cuadro. `abajo` incluye su sombra
     * (alfa medido en el cuadro 172 de las dos versiones: 89.9 y 90.3).
     */
    cajaFinal: { arriba: 67.6, abajo: 90.3 },
    /**
     * Borde superior de la fila de arriba de productos (las tapas de los
     * frascos), en el último cuadro (medido: 17.9 mobile, 18.8 desktop).
     */
    productosArriba: 17.9,
  },
  aviso: "Scrolleá",
  /** Encabezado de la lista sr-only (la escena es decorativa). */
  listaTitulo: "Qué trae un desayuno de trabajo",
  /** Momento 1: título, bajada y botones son los de `hero`. */
  inicio: {
    /**
     * Bajada corta para mobile (arriba del marco, sobre la caja cerrada). L5:
     * nombra lo que se vende, con las palabras de `hero.sub`. Tiene que entrar
     * en DOS renglones desde 360px: la larga de desktop ocupa cuatro y en los
     * teléfonos bajos (375x667, o 390x664 con las barras de Safari) dejaba los
     * botones del inicio encima de la tapa blanca (medido: 25 a 34px encimados).
     */
    bajadaCorta: {
      pre: "",
      strong: "Desayunos, coffee breaks y mesas gourmet",
      post: " para empresas y eventos.",
    } as RichLead,
    /**
     * Se desvanece hacia afuera cuando empieza a subir la tapa. Arriba de todo
     * (y hasta ~60px de scroll en mobile) el inicio está 100% opaco: el
     * desvanecido arranca recién cuando el usuario ya scrolleó un poco, y
     * arranca lento (curva de entrada).
     */
    salida: {
      desktop: { desde: 0.025, hasta: 0.1 } as HeroTramo,
      mobile: { desde: 0.03, hasta: 0.1 } as HeroTramo,
    },
    /**
     * Mobile: el marco sube a su lugar (deshace la bajada inicial) mientras la
     * tapa se levanta, apenas después de que el inicio empieza a irse.
     */
    subida: { desde: 0.03, hasta: 0.16 } as HeroTramo,
    /**
     * Mobile con poco alto (menos de `alto` px de ventana): la caja queda
     * pegada a los botones del inicio, así que el inicio termina de irse
     * antes y el marco sube un poco después (los botones nunca quedan encima
     * de la tapa blanca).
     */
    bajo: {
      alto: 700,
      salida: { desde: 0.02, hasta: 0.075 } as HeroTramo,
      subida: { desde: 0.06, hasta: 0.18 } as HeroTramo,
    },
  },
  /**
   * Desktop: al cargar, la imagen arranca agrandada (`escala`, con la base de
   * la caja cerrada fija) para que la caja sea protagonista, y vuelve a su
   * tamaño mientras suben los productos (`tramo`). Solo transform.
   */
  acercamiento: {
    escala: 1.3,
    /** Entre 860 y 1100px de ancho los textos de los costados necesitan lugar. */
    escalaAngosta: 1.15,
    tramo: { desde: 0.2, hasta: 0.56 } as HeroTramo,
  },
  /**
   * Momento 2: frase confirmada por Benjamin, con "el mismo día" en la
   * itálica amarilla (como "lucir así" en el cierre). Va centrada en el
   * espacio libre debajo de la caja (desktop y mobile), en dos renglones, y
   * entra palabra por palabra con el scroll. Se va antes de que la caja, que
   * baja mientras suben los productos, llegue hasta ella.
   */
  horneado: {
    texto: {
      pre: "Horneado ",
      em: "el mismo día",
      post: " de tu evento.",
    } as EmphasisTitle,
    desktop: { desde: 0.215, hasta: 0.44 } as HeroTramo,
    mobile: { desde: 0.215, hasta: 0.45 } as HeroTramo,
  },
  /**
   * Momento 3: la confianza en grande mientras los productos se reparten
   * (desktop a la izquierda; mobile arriba, en tres columnas). Repite los
   * datos de `hero.trust`: para lectores de pantalla es decorativo.
   */
  cifras: {
    items: [
      // Sin la cantidad de reseñas (solo va en el JSON-LD).
      { valor: "5.0", texto: "en Google", corto: "en Google" },
      { valor: "+15", texto: "años de trayectoria", corto: "años" },
      { valor: "+200", texto: "eventos realizados", corto: "eventos" },
    ] as HeroCifra[],
    desktop: { desde: 0.51, hasta: 0.79 } as HeroTramo,
    mobile: { desde: 0.46, hasta: 0.75 } as HeroTramo,
  },
  /**
   * Momento 4 (solo desktop): una ficha por producto, medidas sobre el último
   * cuadro (los productos quedan quietos cerca de 0.82; las fichas terminan de
   * aparecer cuando ya no se mueven). Aparecen fila por fila. `punta` queda a
   * ~1.5% del borde real de cada producto (medido sobre el alfa del cuadro
   * 172, a la altura de la línea): ninguna línea pisa un producto.
   * Contenido confirmado por Benjamin (28/9/2026): la caja es a medida (dulce,
   * mixta o salada); esta es la versión mixta.
   */
  fichas: [
    { id: "medialuna", texto: "Medialuna", lado: "izq", producto: { x: 24, y: 26.9, base: 33, punta: 13.5 }, desde: 0.8 },
    { id: "jugo", texto: "Jugo", lado: "centro", producto: { x: 49.9, y: 25.9, base: 32.2, punta: 49.9 }, desde: 0.8 },
    { id: "mermelada", texto: "Mermelada", lado: "der", producto: { x: 74.9, y: 23.9, base: 30.5, punta: 85.5 }, desde: 0.8 },
    { id: "sandwich", texto: "Sándwich", lado: "izq", producto: { x: 31.1, y: 42.9, base: 48.3, punta: 17.4 }, desde: 0.82 },
    { id: "infusiones", texto: "Café o té", lado: "der", producto: { x: 70.5, y: 43.1, base: 48.9, punta: 82.7 }, desde: 0.82 },
    { id: "budin", texto: "Budín", lado: "izq", producto: { x: 23.8, y: 57.7, base: 63, punta: 12.7 }, desde: 0.84 },
    { id: "yogur", texto: "Yogur", lado: "centro", producto: { x: 50.9, y: 57.8, base: 63.4, punta: 50.9 }, desde: 0.84 },
    { id: "granola", texto: "Granola", lado: "der", producto: { x: 74.6, y: 58.1, base: 63.7, punta: 83 }, desde: 0.84 },
  ] as HeroSecuenciaFicha[],
  /**
   * Momento 5: el cierre, el remate del hero (pedido de Benjamin, 30/9/2026:
   * "el texto de Así llega a tu oficina se pierde"; texto y sin bajada desde
   * el 5/10/2026). Centrado debajo de la caja abierta, en desktop y en
   * mobile: título display grande con "lucir así" en la itálica amarilla y
   * "Quiero el mío" (antes "Armar mi pedido", de F8; cambiado el 5/10/2026
   * para no repetir "pedido" debajo del título) en la
   * pill amarilla primaria, el único botón amarillo del escenario en ese
   * momento. Antes, el encuadre (productos, caja y fichas) sube y, si hace
   * falta, se achica lo justo para que el cierre entre entero debajo de la
   * caja (`ajuste`, medido en cada refresh; `escalaMin` es el tope).
   * Dura como los otros momentos (QA 30/9/2026: quedaba menos de media
   * pantalla): entra en `desde`, apenas terminado el ajuste, y se sigue
   * leyendo hasta bien entrada la salida (ver `salida`). Título y botón
   * entran casi juntos (~0.45 s, RITMO en HeroSecuencia): con rueda
   * continua a ~1000 px/s el cierre queda entero antes de soltarse el pin
   * (QA 30/9/2026: el botón no llegaba a verse pleno antes de la salida).
   */
  cierre: {
    titulo: { pre: "Tu pedido puede ", em: "lucir así", post: "." } as EmphasisTitle,
    boton: { label: "Quiero el mío", href: "#cotizar" } as CTA,
    desde: { desktop: 0.84, mobile: 0.83 },
    ajuste: { tramo: { desde: 0.71, hasta: 0.84 }, escalaMin: 0.66 } as HeroAjusteCierre,
  },
  /**
   * Momento 6: la salida hacia Servicios. Casi al final del pin, las fichas se
   * apagan y la caja abierta y el cierre empiezan a alejarse juntos (un solo
   * grupo: misma escala desde el centro de la caja y misma opacidad, así
   * debajo de la caja no queda un hueco); ya suelto, el grupo sube más lento
   * que la página (sin encimarse con Servicios) y se apaga mientras Servicios
   * entra pegado por abajo.
   */
  salida: {
    desde: { desktop: 0.985, mobile: 0.985 },
    despues: 0.7,
    escala: 0.8,
    deriva: 0.2,
  } as HeroSalida,
};

/* ========================================================================== *
 * 2 · Servicios
 * ========================================================================== */

export const servicios = {
  head: {
    kicker: "Servicios",
    title: { pre: "Nuestras formas de ", em: "servirte" } as EmphasisTitle,
  },
  items: [
    {
      id: "catering",
      title: "Catering para eventos",
      desc: "Mesas dulces y saladas para cumpleaños, recibidas y reuniones de empresa.",
      etiqueta: "Sociales y corporativos",
      ctaLabel: "Cotizar catering",
      servicioValue: "Catering para evento",
      image: "/media/catering.jpg",
      alt: "Mesa dulce con alfajores de maicena, pepas y brownies en un evento",
      objectPosition: "50% 63%",
      wide: true,
    },
    {
      id: "pasteleria",
      title: "Pastelería para eventos",
      desc: "Tortas, alfajores, budines y mesa dulce, todo casero.",
      etiqueta: "Por encargo",
      ctaLabel: "Cotizar pastelería",
      servicioValue: "Pastelería por encargo",
      image: "/media/pasteleria.jpg",
      alt: "Budines de chocolate con glaseado y nuez sobre tabla de madera",
      objectPosition: "50% 43%",
      wide: false,
    },
    {
      id: "box-regalo",
      title: "Boxes dulces y salados",
      desc: "Cajas de regalo para fechas especiales, a tu gusto.",
      etiqueta: "Envíos dentro de Circunvalación",
      ctaLabel: "Cotizar un box",
      servicioValue: "Box de regalo",
      image: "/media/galeria-08-desayuno-mano.jpg",
      alt: "Box de desayuno en mano con budín, alfajores y limonada, olivo de fondo",
      objectPosition: "50% 56%",
      objectPositionMobile: "50% 61%",
      wide: false,
    },
    {
      id: "box-corporativo",
      title: "Boxes corporativos",
      desc: "Cajas individuales para jornadas de trabajo o para agasajar a tu equipo.",
      etiqueta: "Empresas · eventos y agasajos",
      ctaLabel: "Cotizar box corporativo",
      servicioValue: "Box corporativo",
      image: "/media/box-corporativo-gift.jpg",
      alt: "Box gourmet con budín, focaccia, queso, mermelada y nueces, con luces y sticker de Salguero Gourmet",
      objectPosition: "50% 52%",
      objectPositionMobile: "50% 53%",
      wide: true,
    },
  ] as Servicio[],
};

/* ========================================================================== *
 * 4 · Galería (video de la mesa y fotos: marquee doble en desktop, carril en mobile)
 * ---------------------------------------------------------------------------
 * Captions asignados por CONTENIDO real de la foto (ver _assets/fotos/SELECCION.md),
 * usando el vocabulario de etiquetas del mockup. Pendiente de revisión con el cliente.
 * ========================================================================== */

export const galeria = {
  head: {
    kicker: "Galería",
    title: { pre: "Las mesas ", em: "hablan solas" } as EmphasisTitle,
  },
  // Orden: primero empresas y saladas, después las dulces. En el marquee doble
  // la primera mitad es la fila de arriba y la segunda, la de abajo.
  // "Finger food" es el primer cuadro del clip 4 (en el visor abre ese video).
  fotos: [
    { image: "/media/galeria-coffee.jpg", caption: "Coffee breaks", alt: "Coffee break con sándwiches, mesa dulce y pastelería" },
    { image: "/media/galeria-clip-4-poster.jpg", caption: "Finger food", alt: "Wraps, sándwiches de miga, ensaladas en vasitos y canapés salados" },
    { image: "/media/galeria-meriendas.jpg", caption: "Meriendas", alt: "Boxes de desayuno abiertos con budín, pan y limonada" },
    { image: "/media/galeria-noche.jpg", caption: "Eventos de noche", alt: "Facturas en pedestales con luz azul en un evento de noche" },
    { image: "/media/galeria-mesa-dulce.jpg", caption: "Mesa dulce", alt: "Mesa dulce con cookies de chocolate en pedestal y facturas" },
    { image: "/media/galeria-pasteleria.jpg", caption: "Pastelería casera", alt: "Mesa dulce con brownies, cuadrados de limón y budín" },
    { image: "/media/galeria-oficio.jpg", caption: "Hecho a mano", alt: "Armando alfajores a mano sobre la mesa dulce" },
    { image: "/media/galeria-cookies.jpg", caption: "Cookies", alt: "Cookies caseras sobre una tabla de madera" },
  ] as GaleriaFoto[],
  // Set curado más amplio para el lightbox "Ver galería completa": fotos + clips
  // (los ítems con `video` se reproducen en el visor; en la grilla llevan un ▶).
  // Mismo criterio que `fotos`: empresas y saladas primero, dulces después.
  destacadas: [
    { image: "/media/galeria-clip-4-poster.jpg", video: "/media/galeria-clip-4.mp4", caption: "Finger food", alt: "Video de wraps, sándwiches de miga, ensaladas en vasitos y canapés salados" },
    { image: "/media/galeria-coffee.jpg", caption: "Coffee breaks", alt: "Coffee break con sándwiches, mesa dulce y pastelería" },
    { image: "/media/galeria-produccion.jpg", caption: "Boxes listos", alt: "Cajas de desayuno armadas con panes, budín en bolsa y limonada de la marca, listas para entrega" },
    { image: "/media/galeria-clip-3-poster.jpg", video: "/media/galeria-clip-3.mp4", caption: "En una empresa", alt: "Video de una mesa de alfajores y budines en un evento corporativo" },
    { image: "/media/galeria-meriendas.jpg", caption: "Meriendas", alt: "Boxes de desayuno abiertos con budín, pan y limonada" },
    { image: "/media/box-corporativo-gift.jpg", caption: "Boxes corporativos", alt: "Box gourmet con budín, focaccia, queso, mermelada y nueces, con luces y sticker de Salguero Gourmet" },
    { image: "/media/galeria-box-blanca.jpg", caption: "Lista para regalar", alt: "Caja blanca de regalo con ventana y el sello de Salguero Gourmet, sostenida con las dos manos" },
    { image: "/media/galeria-caja.jpg", caption: "Box de regalo", alt: "Box de regalo abierto con budín, alfajores y dulces" },
    { image: "/media/galeria-noche.jpg", caption: "Eventos de noche", alt: "Facturas en pedestales con luz azul en un evento de noche" },
    { image: "/media/galeria-clip-1-poster.jpg", video: "/media/galeria-clip-1.mp4", caption: "La mesa servida", alt: "Video de la mesa dulce con budines, alfajores y facturas sobre tablas de madera" },
    { image: "/media/galeria-mesa-dulce.jpg", caption: "Mesa dulce", alt: "Mesa dulce con cookies de chocolate en pedestal y facturas" },
    { image: "/media/galeria-pasteleria.jpg", caption: "Pastelería casera", alt: "Mesa dulce con brownies, cuadrados de limón y budín" },
    { image: "/media/galeria-oficio.jpg", caption: "Hecho a mano", alt: "Armando alfajores a mano sobre la mesa dulce" },
    { image: "/media/galeria-cookies.jpg", caption: "Cookies", alt: "Cookies caseras sobre una tabla de madera" },
    { image: "/media/galeria-scones.jpg", caption: "Scones y meriendas", alt: "Scones caseros y pastelería para una merienda" },
    { image: "/media/galeria-budin.jpg", caption: "Budín artesanal", alt: "Budín casero con etiqueta de Salguero Gourmet" },
    { image: "/media/galeria-bowl.jpg", caption: "Recién horneadas", alt: "Bowl con cookies caseras recién horneadas" },
    { image: "/media/galeria-pepas.jpg", caption: "Como en casa", alt: "Armando pastelería a mano sobre la mesa dulce" },
  ] as GaleriaFoto[],
  /** Botón que abre el visor con `destacadas` (GaleriaLightbox.tsx). */
  verCompleta: "Ver galería completa",
  /**
   * Escena de la galería (GaleriaEscena.tsx): intro con el video de la mesa
   * ligado al scroll y, después, las fotos (desktop: marquee doble; mobile:
   * carril deslizable). Videos recodificados todo en cuadros clave
   * (ffmpeg -g 1), sin audio y con faststart, para que cada búsqueda sea
   * inmediata.
   */
  escena: {
    /** Nombre accesible de cada foto: "Ampliar: Cookies". */
    ampliar: "Ampliar",
    /** Nombre accesible de una foto que abre un video en el visor: "Reproducir: Finger food". */
    reproducir: "Reproducir",
    /** Nombre accesible del link de Instagram (en mobile queda solo el ícono). */
    instagram: "Instagram",
    video: {
      /** Los clips 1 y 2 encadenados: un paneo entero por la mesa. */
      desktop: "/media/secuencia/galeria/mesa.mp4",
      /**
       * Solo el clip 1 (recorrido más corto y menos datos). v2: el mismo video
       * todo en cuadros clave con crf 25 (antes 22, más calidad que el de
       * desktop): 1.73 MB en vez de 2.36, 43.7 dB y SSIM 0.984 contra el
       * anterior; busca igual. Nombre nuevo porque /media/secuencia tiene
       * caché de un año (next.config.ts).
       */
      mobile: "/media/secuencia/galeria/mesa-mobile-v2.mp4",
      /** Primer cuadro (mismo encuadre): se ve hasta que el video está listo. */
      poster: "/media/secuencia/galeria/mesa-poster.jpg",
    },
  },
};

/* ========================================================================== *
 * 5 · La cocina de Flor
 * ========================================================================== */

export const flor = {
  kicker: "La casa",
  title: { pre: "La cocina y ", em: "Flor" } as EmphasisTitle,
  body: "Detrás de cada mesa está Flor, al frente de Salguero Gourmet desde hace más de quince años. Cocina casera, atención personalizada y el mismo cuidado para un cumpleaños de diez personas que para un evento de empresa.",
  etiqueta: "Al frente desde el primer día",
  // Confirmado por el cliente: la persona de la foto es Flor.
  foto: {
    src: "/media/flor-alternativa.jpg",
    alt: "Flor sirviendo en la mesa de un evento de Salguero Gourmet",
  },
};

/* ========================================================================== *
 * 6 · Reseñas
 * ========================================================================== */

export const resenas = {
  kicker: "Reseñas",
  rating: site.rating,
  stars: 5,
  profileUrl: contacto.googleProfileUrl,
  /** Secundario (fantasma): saca de la página. El principal es `cta`. */
  profileCta: "Ver perfil de Google",
  /**
   * Botón al final de la sección (L6): en el celular, entre Reseñas y el
   * cotizador había unas 10 pantallas sin ningún botón en el contenido.
   */
  cta: { label: "Pedir presupuesto", href: "#cotizar" } as CTA,
  /** Título de la sección, solo para lectores de pantalla. */
  srTitulo: "Reseñas de clientes",
  /**
   * La calificación para lectores de pantalla (el 5.0 visible cuenta con el
   * scroll y es decorativo). Sin la cantidad de reseñas: no se muestra en la
   * página, solo va en el JSON-LD (site.reviewCount).
   */
  srCalificacion: (nota: string) => `Calificación ${nota} de 5 en Google.`,
  /** Debajo de las estrellas: la fuente de la calificación, sin cantidad. */
  ratingCaption: "en Google",
  items: [
    {
      quote:
        "Tuvimos la posibilidad de trabajar con Flor y su emprendimiento para un evento que tuvimos que realizar en la empresa. Desde la organización, predisposición, profesionalismos y la pastelería y cafetería es de primera calidad. Contraten los servicios para sus eventos que no se van a arrepentir.",
      author: "Mauricio Schmid",
      servicio: "Catering de empresa",
      servicioConfirmado: true,
    },
    {
      quote:
        "Contraté un coffee para una reunión empresarial y la experiencia fue muy buena! Buenas productos, excelente atención, muy buena relación precio-calidad.",
      author: "María Candelaria Contreras",
      servicio: "Coffee break empresarial",
      servicioConfirmado: true,
    },
    {
      quote:
        "Contrate el catering de Salguero Gourmet para mi cumpleaños y todo estuvo riquisimo!!! La comida casera es sin dudas lo mejor. Gracias!!!",
      author: "Maria Victoria Garcia",
      servicio: "Catering de cumpleaños",
      servicioConfirmado: true,
    },
    {
      quote:
        "Mucho foco puesto en el detalle, tanto en la producción, presentación y atención personal! Hermosa calidez humana, pasión y dedicación! He compartido muchos eventos con Flor, y recomiendo muchísimo su servicio!",
      author: "Franco Businello",
      servicio: "Evento a medida",
      servicioConfirmado: true,
    },
  ] as Resena[],
};

/* ========================================================================== *
 * 7 · Cómo trabajamos (proceso)
 * ========================================================================== */

export const proceso = {
  head: {
    kicker: "Cómo trabajamos",
    title: { pre: "Del mensaje a la mesa, ", em: "en cuatro pasos" } as EmphasisTitle,
  },
  pasos: [
    {
      n: "01",
      title: "Contanos tu evento",
      desc: "Fecha, cantidad de personas y qué tenés en mente. Por el formulario o directo por WhatsApp.",
    },
    {
      n: "02",
      title: "Recibís propuesta y precio",
      desc: "Te pasamos un menú pensado para tu evento y tu presupuesto.",
    },
    {
      n: "03",
      title: "Coordinamos",
      desc: "Confirmás con una seña y cerramos fecha, entrega y detalles.",
    },
    {
      n: "04",
      title: "Servimos o entregamos",
      desc: "El día del evento llegamos con todo listo, o lo recibís con nuestro delivery.",
    },
  ] as Paso[],
  /**
   * Botón debajo de los pasos (L6): retoma el paso 01 y lleva al cotizador.
   * Es el único botón de la sección (amarillo).
   */
  cta: { label: "Contanos tu evento", href: "#cotizar" } as CTA,
  /**
   * Rótulos de las dos puntas del recorrido de Cómo trabajamos (decorativo,
   * aria-hidden: los pasos llevan el contenido). Salen del título ("Del
   * mensaje a la mesa"): sirven para cualquier lugar y cualquier persona, sin
   * zonas, direcciones ni tiempos. Los números salen de `pasos[i].n`.
   * Reemplazan a "Cocina de Salguero", "Tu oficina" y "Circunvalación"
   * (pedido de Benjamin, 5/10/2026).
   */
  mapa: { origen: "Tu mensaje", destino: "Tu mesa" },
};

/* ========================================================================== *
 * 3 · Empresas (palabras gigantes; va después de Servicios, decisión de Benjamin
 *     30/9/2026)
 * ========================================================================== */

export const empresas = {
  kicker: "Para empresas",
  title: { pre: "Tu equipo también ", em: "come bien" } as EmphasisTitle,
  /**
   * Etiquetas debajo del título (L2): datos que ayudan a decidir a quien
   * organiza para una empresa (RR.HH., compras), no rubros (esos ya los dicen
   * las palabras gigantes). Todos confirmados por Flor: trabajamos con factura,
   * sin cantidades mínimas y pedido con 48 horas de anticipación. "Sin TACC
   * embalado aparte" se sacó el 5/10/2026 (pedido de Benjamin); el dato sigue
   * en las preguntas frecuentes.
   */
  items: ["Con factura", "Sin mínimos", "Pedido con 48 hs"],
  cta: { label: "Cotizar para mi empresa", href: "#cotizar" } as CTA,
  /**
   * Servicio que "Cotizar para mi empresa" deja preseleccionado en el
   * cotizador (L3, por QuoteContext). Tiene que ser EXACTAMENTE una de
   * `cotizador.form.servicioOptions`.
   */
  servicio: "Coffee break o desayuno de trabajo",
  /**
   * Las palabras gigantes de la sección (amarillo macizo sobre el fondo del
   * sitio, separadas por la cuchara del logo). DOS por fila (QA 30/9/2026).
   * Frase de lectura: la PRIMERA de `arriba` y la ÚLTIMA de `abajo`. Es la que
   * queda entera y centrada en la versión quieta y, con movimiento, con la
   * sección centrada en pantalla (Empresas.tsx). La más larga define el
   * cuerpo de la letra: "Coffee breaks" mide 8.4 em y entra con 11vw en el
   * celular; si se cambia, medirla de nuevo a 375.
   * `arriba` viaja a la izquierda; `abajo`, a la derecha.
   */
  palabras: {
    arriba: ["Coffee breaks", "Desayunos"],
    abajo: ["Mesas gourmet", "Agasajos"],
  } as { arriba: string[]; abajo: string[] },
};

/* ========================================================================== *
 * 8 · FAQ
 * ---------------------------------------------------------------------------
 * Respuestas actualizadas con los datos CONFIRMADOS por el cliente (agosto 2026):
 * se reemplazaron las frases "a confirmar" del mockup por la info real (seña 50%,
 * medios de pago, horario, sin mínimos). La mención a "viandas" quedó fuera: el
 * negocio no hace viandas recurrentes (discrepancia resuelta).
 * L1 (octubre 2026): las respuestas dicen los datos que Flor confirmó y antes
 * se esquivaban: pedido con 48 horas y horneado el mismo día, sin TACC
 * preparado y embalado aparte (nunca "apto celíaco"), con mozos o por
 * delivery y "trabajamos con factura".
 * ========================================================================== */

export const faq = {
  head: {
    kicker: "Preguntas frecuentes",
    title: { pre: "Antes de ", em: "escribirnos" } as EmphasisTitle,
  },
  items: [
    {
      q: "¿Tienen opciones sin TACC, veganas o vegetarianas?",
      a: "Sí, tenemos opciones sin TACC, veganas y vegetarianas. Avisanos al hacer el pedido.",
    },
    {
      q: "¿Con cuánta anticipación tengo que reservar?",
      a: "Con al menos 48 horas, y horneamos todo el mismo día de tu evento. Si reservás antes, mejor: con más tiempo diseñamos una propuesta de autor y cuidamos cada detalle.",
    },
    {
      q: "¿Hay cantidades mínimas?",
      a: "No, atendemos desde encargos pequeños hasta eventos de mediana escala con la misma dedicación.",
    },
    {
      q: "¿El servicio incluye vajilla o personal?",
      a: "Trabajamos con mozos o por delivery. Coordinamos vajilla y personal según el tipo de evento y tus necesidades, como parte de la propuesta.",
    },
    {
      q: "¿Hacen envíos? ¿A qué zonas?",
      a: "Sí. Hacemos envíos en Córdoba capital, dentro del anillo de Circunvalación. El costo se define al momento del pedido, según la zona.",
    },
    {
      q: "¿Cómo reservo mi fecha?",
      a: "Confirmás la reserva con una seña del 50%. Aceptamos efectivo, transferencia y depósito bancario, y trabajamos con factura.",
    },
  ] as FaqItem[],
};

/* ========================================================================== *
 * 9 · Cotizador
 * ========================================================================== */

export const cotizador = {
  head: {
    kicker: "Cotizador",
    title: { pre: "Pedí tu presupuesto, ", em: "tarda un minuto" } as EmphasisTitle,
    // L4: que quede claro que el pedido no se manda solo (hay que tocar enviar).
    intro:
      "Completá el formulario: se abre tu WhatsApp con el pedido ya escrito y solo te queda enviarlo.",
  },
  form: {
    fields: {
      // Los obligatorios (nombre, contacto, servicio y descripción) los marca
      // Cotizador.tsx con `required`.
      nombre: { label: "Nombre", placeholder: "Tu nombre" },
      contacto: {
        label: "WhatsApp o email",
        placeholder: "Para responderte",
      },
      servicio: { label: "Tipo de servicio" },
      fecha: {
        label: "Fecha del evento",
        /** Lo que muestra el campo mientras no hay fecha elegida (CustomDate.tsx). */
        placeholder: "dd/mm/aaaa",
        /** Ayuda debajo del campo (anticipación confirmada por Flor). */
        ayuda: "Pedí con al menos 48 hs de anticipación.",
      },
      personas: {
        label: "Cantidad de personas",
        placeholder: "Aprox.",
      },
      descripcion: {
        label: "Contanos qué estás organizando",
        placeholder: "Tipo de evento, horario, qué te imaginás para la mesa...",
      },
    },
    /**
     * Las opciones deben coincidir con Servicio.servicioValue para la
     * preselección. La primera es la que queda elegida si nadie preseleccionó
     * otra (el cierre del hero y el nav no preseleccionan; Empresas deja
     * elegido el coffee break, L3): por eso va el coffee break, el pedido más
     * común de las empresas. El panel
     * (salguero-admin, /api/leads) clasifica cada valor con su MAPA_SERVICIO:
     * uno que no esté ahí entra como "otro".
     */
    servicioOptions: [
      "Coffee break o desayuno de trabajo",
      "Catering para evento",
      "Pastelería por encargo",
      "Box de regalo",
      "Box corporativo",
      "Otro",
    ],
    submitLabel: "Enviar por WhatsApp",
    /**
     * Línea de ayuda debajo del botón (L4), por si el navegador no abre
     * WhatsApp (bloqueo de ventanas, compu sin WhatsApp). El número y el link
     * salen de `contacto`.
     */
    ayudaEnvio: {
      pre: "¿No se abrió WhatsApp? Escribinos al ",
      numero: contacto.whatsappDisplay,
      href: contacto.whatsappHref,
    },
  },
  /**
   * Mensaje que arma lib/wa.ts para WhatsApp: saludo, un renglón por dato y
   * cierre. Sin exclamaciones (regla de copy). Texto a confirmar por Benjamin.
   */
  whatsapp: {
    saludo: "Hola, Salguero Gourmet. Quiero pedir un presupuesto.",
    nombre: "Nombre",
    contacto: "Contacto",
    servicio: "Servicio",
    fecha: "Fecha del evento",
    personas: "Cantidad de personas",
    cierre: "Gracias.",
  },
  aside: {
    title: "O escribinos directo",
    datos: [
      { label: "WhatsApp", value: contacto.whatsappDisplay, href: contacto.whatsappHref },
      { label: "Email", value: contacto.email, href: `mailto:${contacto.email}` },
      { label: "Instagram", value: contacto.instagramHandle, href: contacto.instagramUrl },
      // Horario confirmado (9 a 17 hs); la UI cae a "A confirmar" solo si es placeholder.
      { label: "Horario de atención", value: contacto.horarioAtencion, href: null },
    ] as { label: string; value: string; href: string | null }[],
    etiqueta: "Respondemos a la brevedad",
  },
};

/* ========================================================================== *
 * Footer
 * ========================================================================== */

export const footer = {
  tagline: "Catering y pastelería artesanal · Córdoba, Argentina",
  copyright: "© 2026 Salguero Gourmet",
  /** Etiqueta de la columna de secciones (anclas del nav más el pedido). */
  secciones: "Secciones",
  /** Etiqueta de la columna de contacto directo. */
  contacto: "Contacto",
  /** Nombre accesible del nav del pie. */
  navLabel: "Pie de página",
  /** Link a #inicio. */
  arriba: "Volver arriba",
};

/* ========================================================================== *
 * Página 404 (app/not-found.tsx)
 * ========================================================================== */

export const noEncontrada = {
  /** Título de la pestaña (con la plantilla del layout: "... · Salguero Gourmet"). */
  metaTitulo: "Página no encontrada",
  kicker: "Error 404",
  titulo: { pre: "No encontramos ", em: "esta página" } as EmphasisTitle,
  texto:
    "Puede que el link esté mal escrito o que la página ya no exista. Desde el inicio ves nuestros servicios y pedís tu presupuesto.",
  boton: { label: "Volver al inicio", href: "/" } as CTA,
};
