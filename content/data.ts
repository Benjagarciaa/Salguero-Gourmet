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
  /** Placa ancha (ocupa la fila completa, imagen a un lado). */
  wide: boolean;
}

export interface GaleriaFoto {
  image: string;
  /** Etiqueta descriptiva. Asignada por contenido de la foto (a revisar). */
  caption: string;
  alt: string;
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
  whatsappDigits: "5493512300715",
  whatsappDisplay: "+54 351 230 0715",
  whatsappHref: "https://wa.me/5493512300715",
  /** Confirmado por el cliente: el 351 2300715 es WhatsApp. */
  whatsappConfirmado: true,
  email: "salguerogourmet@gmail.com",
  instagramHandle: "@salguerogourmet",
  instagramUrl: "https://instagram.com/salguerogourmet",
  // Nombre del perfil de Google, confirmado en el brief del cliente (no aparece en el mockup).
  googleProfileName: "Salguero Gourmet Catering",
  // Link público del perfil de Google, confirmado por el cliente.
  googleProfileUrl: "https://share.google/WSgW27pZTcjI7gejG",
  ciudad: "Córdoba capital",
  zonaDelivery: "anillo de Circunvalación de Córdoba capital",
} as const;

export const site = {
  name: "Salguero Gourmet",
  aniosTrayectoria: 15,
  rating: 5.0,
  reviewCount: 33,
} as const;

/**
 * Políticas comerciales CONFIRMADAS por el cliente (agosto 2026). Fuente de verdad
 * para el copy de las FAQ y el aside del cotizador.
 */
export const politicas = {
  // Anticipación mínima de 48 hs antes del evento; se reserva con la seña del 50%.
  anticipacionMinima: "Al menos 48 hs antes de la fecha del evento.",
  senaPorcentaje: "50%",
  mediosDePago: "Efectivo, transferencia o depósito bancario",
  cantidadesMinimas: "Sin cantidades mínimas",
  horarioAtencion: "9 a 17 hs",
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
  kicker: "Catering · Pastelería · Córdoba",
  title: { pre: "La mesa que se ", em: "recuerda" } as EmphasisTitle,
  sub: {
    pre: "Catering gourmet, pastelería para eventos, boxes de regalo y propuestas corporativas. ",
    strong: "Comida casera, abundante y bien servida",
    post: ", como la describen las reseñas.",
  } as RichLead,
  ctas: {
    primary: { label: "Pedir presupuesto", href: "#cotizar" } as CTA,
    ghost: { label: "Ver el trabajo", href: "#galeria" } as CTA,
  },
  trust: [
    { before: "5.0 en Google · ", count: 33, after: " reseñas" },
    { before: "+", count: 15, after: " años de trayectoria" },
    { before: "Córdoba capital" },
  ] as TrustItem[],
  media: {
    /** Video del hero: clip crudo sin texto quemado (mesa dulce + coffee break). */
    video: "/media/hero.mp4",
    /** Poster JPG (LCP), frame limpio del clip. */
    poster: "/media/hero-poster.jpg",
    alt: "Mesa de coffee break y mesa dulce servida por Salguero Gourmet en un evento",
    width: 720,
    height: 900, // marco 4:5
  },
};

/* ========================================================================== *
 * 2 · Servicios
 * ========================================================================== */

export const servicios = {
  head: {
    kicker: "Servicios",
    title: { pre: "Cuatro formas de ", em: "servirte" } as EmphasisTitle,
  },
  items: [
    {
      id: "catering",
      title: "Catering para eventos",
      desc: "Mesas dulces y saladas para cumpleaños, casamientos, recibidas y eventos de empresa. Armamos la propuesta según tu evento, cantidad de invitados y presupuesto.",
      etiqueta: "Eventos sociales y corporativos",
      ctaLabel: "Cotizar catering",
      servicioValue: "Catering para evento",
      image: "/media/servicios-catering.jpg",
      alt: "Mesa dulce con alfajores de maicena, pepas y brownies en un evento",
      wide: true,
    },
    {
      id: "pasteleria",
      title: "Pastelería para eventos",
      desc: "Tortas, alfajores, budines y mesa dulce. Pastelería casera hecha a pedido.",
      etiqueta: "Por encargo",
      ctaLabel: "Cotizar pastelería",
      servicioValue: "Pastelería por encargo",
      image: "/media/servicios-pasteleria.jpg",
      alt: "Budines de chocolate con glaseado y nuez sobre tabla de madera",
      wide: false,
    },
    {
      id: "box-regalo",
      title: "Boxes dulces y salados",
      desc: "Cajas de regalo para fechas especiales, con envío en Córdoba. Ediciones limitadas durante el año.",
      etiqueta: "Envíos en Córdoba",
      ctaLabel: "Cotizar un box",
      servicioValue: "Box de regalo",
      image: "/media/galeria-08-desayuno-mano.jpg",
      alt: "Box de desayuno en mano con budín, alfajores y limonada, olivo de fondo",
      wide: false,
    },
    {
      id: "box-corporativo",
      title: "Boxes corporativos",
      desc: "Cajas individuales para eventos de empresa, jornadas y ocasiones especiales, o para agasajar a tu equipo en una fecha importante. Se arman a medida del evento.",
      etiqueta: "Empresas · eventos y ocasiones especiales",
      ctaLabel: "Cotizar box corporativo",
      servicioValue: "Box corporativo",
      image: "/media/servicios-box-corporativo.jpg",
      alt: "Boxes corporativos individuales con sándwiches, budín y bebida",
      wide: true,
    },
  ] as Servicio[],
};

/* ========================================================================== *
 * 3 · Galería (marquee doble)
 * ---------------------------------------------------------------------------
 * Captions asignados por CONTENIDO real de la foto (ver _assets/fotos/SELECCION.md),
 * usando el vocabulario de etiquetas del mockup. Pendiente de revisión con el cliente.
 * ========================================================================== */

export const galeria = {
  head: {
    kicker: "Galería",
    title: { pre: "El trabajo ", em: "habla solo" } as EmphasisTitle,
  },
  fotos: [
    { image: "/media/galeria-flatlay-tarta.jpg", caption: "Mesa dulce", alt: "Tarta de rejilla, chocolate blanco y alfajores vistos desde arriba" },
    { image: "/media/galeria-alfajores.jpg", caption: "Pastelería casera", alt: "Alfajores de maicena apilados en un pedestal de madera" },
    { image: "/media/galeria-oficio.jpg", caption: "Hecho a mano", alt: "Armando alfajores a mano sobre la mesa dulce" },
    { image: "/media/galeria-bombas.jpg", caption: "Bombones", alt: "Bombas de chocolate sobre una tabla de madera" },
    { image: "/media/galeria-mesa-cups.jpg", caption: "Coffee breaks", alt: "Mesa larga con vasitos de café y mesa dulce junto al ventanal" },
    { image: "/media/galeria-noche.jpg", caption: "Eventos de noche", alt: "Facturas en pedestales con luz azul en un evento de noche" },
    { image: "/media/galeria-coffee-boxes.jpg", caption: "Boxes corporativos", alt: "Boxes individuales de coffee break con budín y limonada" },
    { image: "/media/galeria-flatlay-spread.jpg", caption: "Meriendas", alt: "Mesa dulce vista desde arriba con alfajores, budín y brownies" },
  ] as GaleriaFoto[],
};

/* ========================================================================== *
 * 4 · La cocina de Flor
 * ========================================================================== */

export const flor = {
  kicker: "La casa",
  title: { pre: "La cocina de ", em: "Flor" } as EmphasisTitle,
  body: "Detrás de cada mesa está Flor, al frente de Salguero Gourmet desde hace más de quince años. Cocina casera, atención personalizada y el mismo cuidado para un cumpleaños de diez personas que para un evento de empresa.",
  etiqueta: "Al frente desde el primer día",
  foto: {
    src: "/media/flor-alternativa.jpg",
    /** Respaldo (la de fondo verde institucional). */
    fallback: "/media/flor-trabajando.jpg",
    alt: "Flor sirviendo en la mesa de un evento de Salguero Gourmet",
    /** Encuadre cálido contra la pared de madera; el neón es el lema de la marca. */
    cropNote: "encuadre cálido",
  },
  /** Confirmado por el cliente: la persona de la foto es Flor. */
  identidadConfirmada: true,
};

/* ========================================================================== *
 * 5 · Reseñas
 * ========================================================================== */

export const resenas = {
  kicker: "Reseñas",
  rating: site.rating,
  reviewCount: site.reviewCount,
  stars: 5,
  ratingCaption: "reseñas en Google",
  profileUrl: contacto.googleProfileUrl,
  profileCta: "Ver perfil de Google",
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
        "Excelente servicio! Abundante, delicioso y ni hablar de la atencion! Quede mas que conforme. Gracias nuevamente",
      author: "Nahir",
      servicio: "Box de regalo",
      // Confirmado por el cliente: la reseña de Nahir es de un box de regalo.
      servicioConfirmado: true,
    },
  ] as Resena[],
};

/* ========================================================================== *
 * 6 · Cómo trabajamos (proceso)
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
      desc: "Armamos un menú a medida de tu evento y tu presupuesto.",
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
};

/* ========================================================================== *
 * 7 · Banda empresas
 * ========================================================================== */

export const empresas = {
  kicker: "Para empresas",
  title: { pre: "Tu equipo también ", em: "come bien" } as EmphasisTitle,
  items: ["Coffee breaks", "Boxes corporativos", "Agasajos y fechas especiales"],
  cta: { label: "Cotizar para mi empresa", href: "#cotizar" } as CTA,
};

/* ========================================================================== *
 * 8 · FAQ
 * ---------------------------------------------------------------------------
 * Respuestas actualizadas con los datos CONFIRMADOS por el cliente (agosto 2026):
 * se reemplazaron las frases "a confirmar" del mockup por la info real (seña 50%,
 * medios de pago, horario, sin mínimos). La mención a "viandas" quedó fuera: el
 * negocio no hace viandas recurrentes (discrepancia resuelta).
 * ========================================================================== */

export const faq = {
  head: {
    kicker: "Preguntas frecuentes",
    title: { pre: "Antes de ", em: "escribirnos" } as EmphasisTitle,
  },
  items: [
    {
      q: "¿Tienen opciones sin TACC, veganas o vegetarianas?",
      a: "Sí. Elaboramos opciones sin TACC, veganas y vegetarianas según cada servicio. Indicanos tus preferencias al hacer el pedido y las sumamos a la propuesta.",
    },
    {
      q: "¿Con cuánta anticipación tengo que reservar?",
      a: "Solicitamos una anticipación mínima de 48 hs respecto de la fecha del evento. Reservás tu fecha con una seña del 50% del servicio.",
    },
    {
      q: "¿Hay cantidades mínimas?",
      a: "No trabajamos con cantidades mínimas. Atendemos desde encargos pequeños hasta eventos de gran escala con la misma dedicación.",
    },
    {
      q: "¿El servicio incluye vajilla o personal?",
      a: "Coordinamos vajilla y personal según el tipo de evento y tus necesidades, como parte de la propuesta.",
    },
    {
      q: "¿Hacen envíos? ¿A qué zonas?",
      a: "Sí. Hacemos envíos en Córdoba capital, dentro del anillo de Circunvalación. El costo se define al momento del pedido, según la zona.",
    },
    {
      q: "¿Cómo reservo mi fecha?",
      a: "Confirmás la reserva con una seña del 50%. Aceptamos efectivo, transferencia y depósito bancario.",
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
    intro:
      "Completá el formulario y el pedido te llega armado al WhatsApp de Salguero. Sin vueltas.",
  },
  form: {
    fields: {
      nombre: { label: "Nombre", required: true, placeholder: "Tu nombre" },
      contacto: {
        label: "WhatsApp o email",
        required: true,
        placeholder: "Para responderte",
      },
      servicio: { label: "Tipo de servicio", required: true },
      fecha: { label: "Fecha del evento", required: false },
      personas: {
        label: "Cantidad de personas",
        required: false,
        placeholder: "Aprox.",
      },
      descripcion: {
        label: "Contanos qué estás organizando",
        required: true,
        placeholder: "Tipo de evento, horario, qué te imaginás para la mesa...",
      },
    },
    /** Las opciones deben coincidir con Servicio.servicioValue para la preselección. */
    servicioOptions: [
      "Catering para evento",
      "Pastelería por encargo",
      "Box de regalo",
      "Box corporativo",
      "Otro",
    ],
    submitLabel: "Enviar por WhatsApp",
  },
  aside: {
    title: "O escribinos directo",
    datos: [
      { label: "WhatsApp", value: contacto.whatsappDisplay, href: contacto.whatsappHref },
      { label: "Email", value: contacto.email, href: `mailto:${contacto.email}` },
      { label: "Instagram", value: contacto.instagramHandle, href: contacto.instagramUrl },
      // Horario pendiente: la UI muestra "A confirmar" mientras sea placeholder.
      { label: "Horario de atención", value: politicas.horarioAtencion, href: null },
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
};
