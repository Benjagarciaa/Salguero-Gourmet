/* ==========================================================================
 * Tests de las funciones puras de la secuencia del hero (HeroSecuenciaPlan y
 * HeroSecuenciaRed): sin DOM, sin GSAP, sin dependencias. Corren con Node solo
 * (`npm test`: node --experimental-strip-types --test).
 *
 * Qué protegen: la cuenta de archivos y la pasada con intermedios, la
 * posición en archivos, la elección del cuadro por tiempo (no por índice), el
 * reloj (velocidad corta, saltos, reposo), el ritmo de la pantalla, los
 * ajustes por dispositivo, el nivel de anticipo y lo que pide la demanda en
 * reposo, en movimiento y con la pantalla apurada.
 * ========================================================================== */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ajustesPara,
  BAJADO,
  crearReloj,
  crearRitmo,
  demanda,
  elegirCuadro,
  PASADA,
  tiemposDe,
  urlDeCuadro,
  type Ajustes,
  type EstadoCuadros,
  type Medidas,
  type Scroll,
  type Tiempos,
} from "../components/sections/HeroSecuenciaPlan.ts";
import {
  ANTICIPO_KBS,
  nivelAnticipo,
  RED_LENTA_KBS,
} from "../components/sections/HeroSecuenciaRed.ts";
import type { HeroSecuenciaVersion } from "../content/data.ts";

/* ---------- Los datos reales (content/data.ts) y los archivos en disco ---------- */

test("content/data.ts: las versiones cierran y los cuadros están en public/", async () => {
  const { heroSecuencia } = await import("../content/data.ts");
  const { readdirSync } = await import("node:fs");
  for (const v of [heroSecuencia.versiones.desktop, heroSecuencia.versiones.mobile]) {
    const t = tiemposDe(v);
    assert.equal(t.ultimo, 171, v.carpeta);
    assert.equal(t.pasada.length, 23, v.carpeta);
    const archivos = readdirSync(new URL(`../public${v.carpeta}`, import.meta.url))
      .filter((f) => f.endsWith(".webp"))
      .sort();
    assert.equal(archivos.length, v.cuadros, v.carpeta);
    assert.equal(`${v.carpeta}/${archivos[0]}`, urlDeCuadro(v, 0));
    assert.equal(`${v.carpeta}/${archivos[archivos.length - 1]}`, urlDeCuadro(v, v.cuadros - 1));
  }
});

/* ---------- Versiones como las de content/data.ts (caja-v9) ---------- */

const DESKTOP: HeroSecuenciaVersion = {
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
};

const MOBILE: HeroSecuenciaVersion = {
  carpeta: "/media/secuencia/caja-v9/mobile",
  patron: "f{n}.webp",
  cuadros: 268,
  primero: 1,
  digitos: 3,
  ancho: 540,
  alto: 960,
  densidad: [{ desde: 6, hasta: 102, x: 2 }],
};

/** Archivo del cuadro del video `t` en desktop (entero). */
const archivoDesktop = (t: number) => tiemposDe(DESKTOP).posicion(t);

/* ---------- Tiempos ---------- */

test("tiemposDe: 172 cuadros del video en las dos versiones y la pasada de 23", () => {
  for (const v of [DESKTOP, MOBILE]) {
    const t = tiemposDe(v);
    assert.equal(t.total, v.cuadros);
    assert.equal(t.ultimo, 171);
    assert.equal(t.pasada.length, 23);
    // La pasada: 1 de cada 8 cuadros del video y el último, nunca un intermedio.
    assert.equal(t.pasada[0], 0);
    assert.equal(t.pasada[t.pasada.length - 1], t.total - 1);
    for (const i of t.pasada) {
      assert.equal(t.escalon[i], PASADA);
      assert.ok(Number.isInteger(t.tiempo[i]));
    }
    // Los intermedios tienen escalón 0 y tiempo con decimales.
    let intermedios = 0;
    for (let i = 0; i < t.total; i++) {
      if (t.escalon[i] === 0) {
        intermedios++;
        assert.ok(!Number.isInteger(t.tiempo[i]), `archivo ${i}`);
      }
    }
    assert.equal(intermedios, v.cuadros - 172);
  }
});

test("tiemposDe: posición en archivos y densidad por tramo", () => {
  const t = tiemposDe(DESKTOP);
  assert.equal(t.posicion(3), 3);
  assert.equal(t.posicion(4), 4);
  assert.equal(t.posicion(10), 16); // 4 + 2 * (10 - 4)
  assert.equal(t.posicion(10.5), 17.5);
  assert.equal(t.posicion(32), 82); // 16 + 3 * (32 - 10)
  assert.equal(t.posicion(101), 220); // 82 + 2 * (101 - 32)
  assert.equal(t.posicion(171), 290);
  assert.equal(t.densidad(5), 2);
  assert.equal(t.densidad(10), 3);
  assert.equal(t.densidad(31.9), 3);
  assert.equal(t.densidad(32), 2);
  assert.equal(t.densidad(150), 1);
  // Fuera del recorrido sigue la recta del borde (quien la usa la acota).
  assert.equal(t.posicion(-1), -1);
  assert.equal(t.posicion(172), 291);
});

test("tiemposDe: una densidad que no entra en los archivos tira error (fail-open)", () => {
  // Con menos archivos que intermedios, el último cuadro del video queda negativo.
  assert.throws(() => tiemposDe({ ...DESKTOP, cuadros: 100 }));
  // Con archivos de sobra para un tramo que pasa el final, la cuenta no cierra.
  assert.throws(() => tiemposDe({ ...MOBILE, cuadros: 150 }));
  // Sin tramos, cada archivo es un cuadro del video: cierra siempre.
  assert.equal(tiemposDe({ ...MOBILE, densidad: [] }).ultimo, 267);
});

test("urlDeCuadro: nombre con ceros a la izquierda desde `primero`", () => {
  assert.equal(
    urlDeCuadro(DESKTOP, 0),
    "/media/secuencia/caja-v9/desktop/f001.webp",
  );
  assert.equal(
    urlDeCuadro(DESKTOP, 290),
    "/media/secuencia/caja-v9/desktop/f291.webp",
  );
  assert.equal(urlDeCuadro(MOBILE, 267), "/media/secuencia/caja-v9/mobile/f268.webp");
});

/* ---------- Elección del cuadro ---------- */

test("elegirCuadro: el archivo de la posición si está decodificado", () => {
  const t = tiemposDe(DESKTOP);
  const tiene = (i: number) => i === 48;
  // 20.67 → archivo 48.01 → 48 (un intermedio decodificado).
  assert.equal(elegirCuadro(20.67, 1, t, tiene, -1), 48);
});

test("elegirCuadro: sin intermedios decodificados elige el más cercano EN TIEMPO", () => {
  const t = tiemposDe(DESKTOP);
  const a20 = archivoDesktop(20); // 46
  const a21 = archivoDesktop(21); // 49
  const tiene = (i: number) => i === a20 || i === a21;
  // En archivos, 20.74 redondea al intermedio 20.67 y empata a los dos
  // vecinos; en tiempo, 21 está a 0.26 y 20 a 0.74.
  assert.equal(elegirCuadro(20.74, 1, t, tiene, -1), a21);
  assert.equal(elegirCuadro(20.2, 1, t, tiene, -1), a20);
});

test("elegirCuadro: en un empate gana el de atrás según el sentido, y el mostrado si queda igual de cerca", () => {
  const t = tiemposDe(DESKTOP);
  const a20 = archivoDesktop(20);
  const a21 = archivoDesktop(21);
  const tiene = (i: number) => i === a20 || i === a21;
  assert.equal(elegirCuadro(20.5, 1, t, tiene, -1), a20);
  assert.equal(elegirCuadro(20.5, -1, t, tiene, -1), a21);
  // Lo que ya está en el lienzo no se cambia por otro igual de cerca.
  assert.equal(elegirCuadro(20.5, 1, t, tiene, a21), a21);
  // Pero sí por uno más cerca.
  assert.equal(elegirCuadro(20.74, 1, t, tiene, a20), a21);
});

test("elegirCuadro: -1 sin bitmaps; con uno solo, ese", () => {
  const t = tiemposDe(MOBILE);
  assert.equal(elegirCuadro(50, 1, t, () => false, -1), -1);
  assert.equal(elegirCuadro(50, 1, t, (i) => i === 3, -1), 3);
  assert.equal(elegirCuadro(0, -1, t, (i) => i === 200, -1), 200);
});

/* ---------- Reloj y ritmo ---------- */

test("crearReloj: la velocidad corta sube antes que la media, y las dos llegan a la real", () => {
  const r = crearReloj();
  const paso = 1000 / 60;
  r.marcar(0, 0);
  r.marcar(1, paso);
  const primero = r.leer(paso);
  assert.ok(primero.vel > 0 && primero.velCorta > primero.vel);
  let ahora = paso;
  for (let f = 2; f <= 120; f++) {
    ahora = f * paso;
    r.marcar(f, ahora);
  }
  const s = r.leer(ahora);
  assert.ok(s.vel > 55 && s.vel <= 60.5, `vel ${s.vel}`);
  assert.ok(s.velCorta > 59 && s.velCorta <= 60.5, `velCorta ${s.velCorta}`);
  assert.equal(s.dir, 1);
});

test("crearReloj: un salto no cuenta como velocidad y el reposo la vuelve a 0", () => {
  const r = crearReloj();
  const paso = 1000 / 60;
  let ahora = 0;
  for (let f = 0; f <= 60; f++) {
    ahora = f * paso;
    r.marcar(f, ahora);
  }
  const antes = r.leer(ahora).vel;
  // Un ancla: 100 cuadros de golpe.
  r.marcar(160, ahora + paso);
  assert.equal(r.leer(ahora + paso).vel, antes);
  // Sin cambios durante REPOSO_MS: 0 al leer y al volver a marcar.
  assert.equal(r.leer(ahora + paso + 200).vel, 0);
  assert.equal(r.leer(ahora + paso + 200).velCorta, 0);
  r.marcar(161, ahora + paso + 300);
  assert.equal(r.leer(ahora + paso + 300).vel, 0);
  // Hacia atrás cambia el sentido.
  r.marcar(150, ahora + paso + 316);
  assert.equal(r.leer(ahora + paso + 316).dir, -1);
});

test("crearRitmo: se apura con cuadros de pantalla largos y se vuelve a holgar", () => {
  const ritmo = crearRitmo();
  let ahora = 0;
  const marcar = (dt: number, n: number) => {
    for (let k = 0; k < n; k++) {
      ahora += dt;
      ritmo.marcar(ahora);
    }
  };
  marcar(16, 9);
  assert.equal(ritmo.holgada, true);
  marcar(30, 9);
  assert.equal(ritmo.holgada, false);
  marcar(16, 9);
  assert.equal(ritmo.holgada, true);
  // Una pausa (más de 100 ms) no cuenta como cuadro lento.
  marcar(500, 9);
  assert.equal(ritmo.holgada, true);
});

/* ---------- Ajustes y red ---------- */

test("ajustesPara: memoria, descargas y ventanas por dispositivo", () => {
  const pc = ajustesPara({
    desktop: true,
    punteroFino: true,
    webkit: false,
    multiplexa: true,
    version: DESKTOP,
  });
  assert.equal(pc.capacidad, 26); // 96 MB / (720 x 1280 x 4)
  assert.equal(pc.descargas, 12);
  assert.deepEqual(pc.ventana, { atras: 8, adelante: 20 });
  const safari = ajustesPara({
    desktop: true,
    punteroFino: true,
    webkit: true,
    multiplexa: true,
    version: DESKTOP,
  });
  assert.equal(safari.capacidad, 24); // descuenta 2 decodificaciones en vuelo
  const celu = ajustesPara({
    desktop: false,
    punteroFino: false,
    webkit: false,
    multiplexa: true,
    version: MOBILE,
  });
  assert.equal(celu.capacidad, 19); // 40 MB / (540 x 960 x 4)
  assert.equal(celu.descargas, 6);
  assert.deepEqual(celu.ventana, { atras: 4, adelante: 12 });
  const iphone = ajustesPara({
    desktop: false,
    punteroFino: false,
    webkit: true,
    multiplexa: false,
    version: MOBILE,
  });
  assert.equal(iphone.capacidad, 17);
});

test("nivelAnticipo: escalón según dispositivo y red medida", () => {
  assert.equal(nivelAnticipo(true, ANTICIPO_KBS.todo), 0);
  assert.equal(nivelAnticipo(true, ANTICIPO_KBS.todo - 1), 1);
  assert.equal(nivelAnticipo(true, ANTICIPO_KBS.video), 1);
  assert.equal(nivelAnticipo(true, ANTICIPO_KBS.video - 1), 4);
  assert.equal(nivelAnticipo(false, ANTICIPO_KBS.mitad), 2);
  assert.equal(nivelAnticipo(false, ANTICIPO_KBS.mitad - 1), 4);
  // Una red "lenta" nunca llega al anticipo.
  assert.ok(RED_LENTA_KBS < ANTICIPO_KBS.video);
});

/* ---------- Demanda ---------- */

const PC: Ajustes = ajustesPara({
  desktop: true,
  punteroFino: true,
  webkit: false,
  multiplexa: true,
  version: DESKTOP,
});

const MEDIDAS: Medidas = {
  latenciaMs: 120,
  decodificarMs: 25,
  tramos: false,
  holgada: true,
  anticipo: PASADA,
};

const REPOSO: Scroll = { pos: 0, vel: 0, velCorta: 0, dir: 1 };

function estadoDe(
  t: Tiempos,
  {
    bajados = [],
    decodificados = [],
    mostrado = -1,
    pasadaPendiente = false,
  }: {
    bajados?: Iterable<number>;
    decodificados?: Iterable<number>;
    mostrado?: number;
    pasadaPendiente?: boolean;
  },
): EstadoCuadros {
  const red = new Uint8Array(t.total);
  for (const i of bajados) red[i] = BAJADO;
  const dec = new Set(decodificados);
  return {
    tiempos: t,
    red,
    decodificado: (i) => dec.has(i),
    decodificando: () => false,
    mostrado,
    pasadaPendiente,
  };
}

const todos = (t: Tiempos) => Array.from({ length: t.total }, (_, i) => i);

test("demanda: al arrancar pide la pasada en orden, desde la posición", () => {
  const t = tiemposDe(DESKTOP);
  const d = demanda(REPOSO, estadoDe(t, { pasadaPendiente: true }), PC, MEDIDAS);
  assert.deepEqual(d.bajar, t.pasada);
  assert.deepEqual(d.decodificar, []);
  assert.equal(d.conservar.size, 0);
  // Con la página ya scrolleada, primero lo cercano a la posición, y de lo
  // cercano, lo de adelante (PESO_ADELANTE_REPOSO) antes que lo de atrás.
  const lejos = demanda(
    { ...REPOSO, pos: 100 },
    estadoDe(t, { pasadaPendiente: true }),
    PC,
    MEDIDAS,
  );
  assert.equal(t.tiempo[lejos.bajar[0]], 104);
  assert.equal(t.tiempo[lejos.bajar[1]], 96);
  assert.equal(t.tiempo[lejos.bajar[2]], 112);
});

test("demanda: el anticipo baja lo que falta de lo grueso a lo fino, solo en reposo", () => {
  const t = tiemposDe(DESKTOP);
  const e = estadoDe(t, { bajados: t.pasada });
  const d = demanda(REPOSO, e, PC, { ...MEDIDAS, anticipo: 1 });
  assert.ok(d.bajar.length > 0);
  const escalones = d.bajar.map((i) => t.escalon[i]);
  assert.ok(escalones.every((k) => k > 0 && k < PASADA), "ni pasada ni intermedios");
  for (let k = 1; k < escalones.length; k++) {
    assert.ok(escalones[k] <= escalones[k - 1], "de lo grueso a lo fino");
  }
  assert.equal(escalones[0], 4);
  assert.equal(t.tiempo[d.bajar[0]], 4); // el primero de la grilla 4 desde el cuadro 0
  // Con anticipo 0 entran también los intermedios, al final.
  const conInter = demanda(REPOSO, e, PC, { ...MEDIDAS, anticipo: 0 });
  const primerIntermedio = conInter.bajar.findIndex((i) => t.escalon[i] === 0);
  assert.ok(primerIntermedio > 0);
  assert.ok(conInter.bajar.slice(primerIntermedio).every((i) => t.escalon[i] === 0));
  assert.equal(conInter.bajar.length, t.total - t.pasada.length);
  // En movimiento el anticipo no pide nada.
  const moviendo: Scroll = { pos: 10, vel: 60, velCorta: 60, dir: 1 };
  assert.deepEqual(demanda(moviendo, e, PC, { ...MEDIDAS, anticipo: 1 }).bajar, []);
  // Sin anticipo (PASADA) tampoco.
  assert.deepEqual(demanda(REPOSO, e, PC, MEDIDAS).bajar, []);
});

test("demanda: los intermedios se decodifican en reposo y se dejan con velocidad corta alta", () => {
  const t = tiemposDe(DESKTOP);
  const e = estadoDe(t, { bajados: todos(t) });
  const enX3: Scroll = { pos: 20, vel: 0, velCorta: 0, dir: 1 };
  const quieto = demanda(enX3, e, PC, MEDIDAS);
  assert.ok(quieto.decodificar.some((i) => t.escalon[i] === 0), "intermedios en reposo");
  assert.ok(quieto.decodificar.length <= PC.capacidad);
  // 30 cuadros/s x 3 archivos = 90 imágenes/s, más que el tope de intermedios.
  const arrancando: Scroll = { pos: 20, vel: 5, velCorta: 30, dir: 1 };
  const sinInter = demanda(arrancando, e, PC, MEDIDAS);
  assert.ok(sinInter.decodificar.length > 0);
  assert.ok(sinInter.decodificar.every((i) => t.escalon[i] > 0), "sin intermedios al arrancar");
  // Con la pantalla apurada tampoco, ni en reposo.
  const apurada = demanda(enX3, e, PC, { ...MEDIDAS, holgada: false });
  assert.ok(apurada.decodificar.every((i) => t.escalon[i] > 0));
});

test("demanda: en movimiento rápido decodifica solo la grilla y nada de lo que quedó atrás", () => {
  const t = tiemposDe(DESKTOP);
  const e = estadoDe(t, { bajados: todos(t), mostrado: archivoDesktop(20) });
  const rapido: Scroll = { pos: 20, vel: 200, velCorta: 200, dir: 1 };
  const d = demanda(rapido, e, PC, MEDIDAS);
  assert.ok(d.decodificar.length > 0);
  for (const i of d.decodificar) {
    assert.ok(t.escalon[i] >= 2, `archivo ${i} (escalón ${t.escalon[i]})`);
    assert.ok(t.tiempo[i] >= 20, `archivo ${i} quedó atrás`);
  }
  assert.ok(d.conservar.size <= PC.capacidad + 1);
  assert.ok(d.conservar.has(archivoDesktop(20)), "lo mostrado se conserva");
});

test("demanda: con tramos, en reposo, pide lo cercano y los intermedios después de los cuadros del video", () => {
  const t = tiemposDe(DESKTOP);
  const e = estadoDe(t, { bajados: t.pasada });
  const d = demanda(
    { ...REPOSO, pos: 50 },
    e,
    PC,
    { ...MEDIDAS, tramos: true },
  );
  assert.ok(d.bajar.length > 0);
  for (const i of d.bajar) {
    assert.ok(t.tiempo[i] >= 50 - 4 && t.tiempo[i] <= 50 + 40, `archivo ${i} fuera del tramo`);
    assert.ok(e.red[i] !== BAJADO);
  }
  const primerIntermedio = d.bajar.findIndex((i) => t.escalon[i] === 0);
  assert.ok(primerIntermedio > 0, "hay intermedios y no van primero");
  assert.ok(d.bajar.slice(primerIntermedio).every((i) => t.escalon[i] === 0));
  // Cupo: a lo sumo la mitad de las descargas son intermedios.
  assert.ok(d.bajar.length - primerIntermedio <= PC.descargas / 2);
});
