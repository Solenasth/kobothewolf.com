// Code-cat layout, ported from P8's gato() (FR-E20, DESIGN §5.4). No DOM here,
// so vitest covers it; montar.ts reads the mask, measures the font and draws.
//
// 1) The Rust program is laid out once inside the silhouette without breaking
//    a token across lines, so the drawn text compiles as is (CI runs rustc).
// 2) The rest is filled with /* */ comments: first "Do you liek mwy cwode?",
//    then OwO faces and cringe phrases. The last comment is always closed.

export const PROGRAMA = `#[derive(Debug)] struct Boykisser { name: String, coolness: f32, silliness: f32, is_gay: bool, socks: &'static str }
impl Boykisser {
  fn new(name: &str) -> Self { Self { name: name.to_string(), coolness: 100_000.0, silliness: 9001.0, is_gay: true, socks: "programming" } }
  fn nuzzle(&self, bug: &str) -> String { format!("*nuzzles* {} fixed! >w<", bug) }
  fn greet(&self) {
    println!("OwO~ wats dis?"); println!("{} is here uwu", self.name);
    println!("coolness: {}", self.coolness); println!("silliness: {}", self.silliness);
    println!("is_gay: {}", self.is_gay); println!("socks: {}", self.socks);
  }
}
fn main() {
  print!("Initializing "); println!("boykissers...");
  let kobo = Boykisser::new("Kobo The Wolf"); kobo.greet();
  for bug in ["null", "NaN", "undefined", "CSS"] { println!("{}", kobo.nuzzle(bug)); }
  /* EXP Date: Never UwU */
  println!("All boykissers"); println!("operational. ✔");
}`;
const LIEK = 'Do you liek mwy cwode?UwU?!?1';
const CARITAS = ['OwO', 'UwU', 'owo', 'uwu', '>w<', '^w^', 'ÒwÓ', 'OwU', 'UwO', 'QwQ', 'TwT', '°w°', 'x3', ':3', '>:3', ';3', 'OwO~', 'uwu~', 'ÚwÚ', '*w*', 'OvO', '(=^w^=)', 'ówò', '>//w//<'];
const FRASES = [
  'Daddy your code is s-s-so big! >w<!',
  "*notices your pull request* OwO what's this?",
  'it c-compiled?? f-for me?? >///<',
  '*pounces on your keyboard*',
  'rawr x3 *nuzzles* how are you',
  'senpai merged my PR uwu',
  '*blushes in hexadecimal*',
  'your stack is so deep... OwO',
  'pwease review me gently >w<',
  '*wags tail at your commits*',
  "I'm not a bug, I'm a feature~ :3",
  'so many semicolons... x3',
  'hewwo wowld!! ^w^',
  '*sits on your lap(top)*',
];
const COL = { kw: '#E0559B', str: '#3D8BD9', num: '#9B6BD1', typ: '#2E9E8F', com: '#B49BB0', pun: '#6B5B73', id: '#2B2233' };
const PASTEL = ['#FF8FB8', '#8EC5FF', '#B48BD9', '#E0559B', '#3D8BD9', '#2E9E8F'];

/** Where a token comes from: the program, the "liek" comment, the opening of the OwO comment, or its words. */
export type Origen = 'programa' | 'liek' | 'abre' | 'relleno';

/** A token that never breaks across lines, or a break point when `t` is a space. */
export interface Unidad {
  t: string;
  c: string;
  origen: Origen;
}

/** A row's run of whole character cells inside the silhouette. */
export interface Tramo {
  /** Baseline middle, in canvas pixels. */
  y: number;
  /** First cell's column. */
  col0: number;
  /** Cells in the run. */
  n: number;
}

/** A placed token: its run and its starting column. */
export interface Colocado {
  t: string;
  c: string;
  origen: Origen;
  tramo: number;
  col: number;
}

/** The part of a 2D canvas context dibujar() uses. */
export interface Lienzo {
  fillStyle: unknown;
  fillText(text: string, x: number, y: number): void;
}

const largo = (t: string) => [...t].length;
const espacio = (origen: Origen): Unidad => ({ t: ' ', c: '', origen });

/** Cuts source into tokens. Strings stay whole; a comment breaks only at its spaces. */
export function unidades(src: string, origen: Origen = 'programa'): Unidad[] {
  const re =
    /(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*")|(\b\d[\d_.]*\b)|(\b(?:fn|let|for|in|impl|struct|true|false|self|Self|derive)\b)|('static\b|\b[A-Z][A-Za-z]*\b|\b(?:String|str|f32|bool)\b)|([A-Za-z_][\w]*!?)|(\s+)|(->|::|=>|\.\.|&&|\|\||[!=<>]=|.)/gu;
  const out: Unidad[] = [];
  for (const m of src.matchAll(re)) {
    if (m[7]) {
      out.push(espacio(origen));
      continue;
    }
    if (m[1]) {
      for (const w of m[1].split(/\s+/)) out.push({ t: w, c: COL.com, origen }, espacio(origen));
      continue;
    }
    const c = m[2] ? COL.str : m[3] ? COL.num : m[4] ? COL.kw : m[5] ? COL.typ : m[6] ? COL.id : COL.pun;
    out.push({ t: m[0], c, origen });
  }
  return out;
}

/** Endless filler: a closed "liek" comment, then an OwO comment that acomodar() closes. */
export function* relleno(): Generator<Unidad, never> {
  const palabra = (t: string, c: string, origen: Origen): Unidad[] => [{ t, c, origen }, espacio(origen)];
  yield* palabra('/*', COL.kw, 'liek');
  for (const w of LIEK.split(' ')) yield* palabra(w, COL.kw, 'liek');
  yield* palabra('*/', COL.kw, 'liek');
  yield* palabra('/*', COL.com, 'abre');
  for (let i = 0, f = 0; ; ) {
    yield* palabra(CARITAS[i % CARITAS.length]!, PASTEL[i % PASTEL.length]!, 'relleno');
    i++;
    if (i % 7 === 0) {
      for (const w of FRASES[f % FRASES.length]!.split(' ')) yield* palabra(w, COL.com, 'relleno');
      f++;
    }
  }
}

/** Font size in pixels: the program takes about a third of the cells, the rest is filler. */
export function tamanoLetra(area: number, programa: readonly Unidad[]): number {
  const total = programa.reduce((s, u) => s + largo(u.t), 0);
  return Math.max(5.5, Math.min(11, Math.sqrt((area * 0.34) / (0.6 * 1.1 * total))));
}

/** Runs of cells whose middle and both edges are inside the silhouette, row by row. */
export function tramos(dentro: (x: number, y: number) => boolean, ancho: number, alto: number, cw: number, lh: number): Tramo[] {
  const out: Tramo[] = [];
  for (let y = lh / 2; y < alto; y += lh) {
    let actual: Tramo | null = null;
    for (let col = 0; col * cw <= ancho; col++) {
      const x = col * cw;
      const ok = x + cw <= ancho && dentro(x + cw / 2, y) && dentro(x + cw * 0.1, y) && dentro(x + cw * 0.9, y);
      if (ok) {
        actual ??= { y, col0: col, n: 0 };
        actual.n++;
      } else if (actual) {
        out.push(actual);
        actual = null;
      }
    }
    if (actual) out.push(actual);
  }
  return out;
}

/**
 * Places the program, then filler, greedily into the runs without breaking a
 * token, and turns the last filler word into the closing `*\/`. Throws when
 * the program or the comment openings don't fit.
 */
export function acomodar(runs: readonly Tramo[], programa: readonly Unidad[]): Colocado[] {
  const fuente = (function* () {
    yield* programa;
    yield espacio('programa');
    yield* relleno();
  })();
  const out: Colocado[] = [];
  let u = fuente.next().value as Unidad;
  for (let i = 0; i < runs.length; i++) {
    const tramo = runs[i]!;
    let usado = 0;
    for (;;) {
      if (u.t === ' ') {
        if (usado > 0 && usado < tramo.n) usado++;
        u = fuente.next().value as Unidad;
        continue;
      }
      const len = largo(u.t);
      if (usado + len > tramo.n) break;
      out.push({ t: u.t, c: u.c, origen: u.origen, tramo: i, col: tramo.col0 + usado });
      usado += len;
      u = fuente.next().value as Unidad;
    }
  }

  const enPrograma = programa.filter((p) => p.t !== ' ').length;
  if (out.filter((p) => p.origen === 'programa').length < enPrograma) throw new Error('code cat: the program does not fit in the silhouette');
  // The OwO comment is still open: replace its last word of 2+ letters with the closing.
  let ultimo = out.pop();
  while (ultimo?.origen === 'relleno' && largo(ultimo.t) < 2) ultimo = out.pop();
  if (ultimo?.origen !== 'relleno') throw new Error('code cat: no room to close the filler comment');
  out.push({ ...ultimo, t: '*/', c: COL.com });
  return out;
}

/** The drawn text: one line per run that holds tokens, indented to its column. */
export function texto(colocados: readonly Colocado[]): string {
  const lineas: string[] = [];
  let tramo = -1;
  let linea = '';
  let cur = 0; // columns, counted in characters
  for (const p of colocados) {
    if (p.tramo !== tramo) {
      if (tramo >= 0) lineas.push(linea);
      tramo = p.tramo;
      linea = '';
      cur = 0;
    }
    linea += ' '.repeat(p.col - cur) + p.t;
    cur = p.col + largo(p.t);
  }
  if (tramo >= 0) lineas.push(linea);
  return lineas.join('\n');
}

/** Draws one character at a time, so JetBrains Mono ligatures (`->`) never form. */
export function dibujar(ctx: Lienzo, colocados: readonly Colocado[], runs: readonly Tramo[], cw: number): void {
  for (const p of colocados) {
    ctx.fillStyle = p.c;
    [...p.t].forEach((ch, i) => ctx.fillText(ch, (p.col + i) * cw, runs[p.tramo]!.y));
  }
}
