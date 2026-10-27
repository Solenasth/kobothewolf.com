import { describe, expect, it } from 'vitest';
import {
  PROGRAMA,
  acomodar,
  dibujar,
  relleno,
  tamanoLetra,
  texto,
  tramos,
  unidades,
  type Tramo,
} from '../styles/boykisser-uwu/variantes/codigo/gato';

const programa = unidades(PROGRAMA);
const tokens = (src: string) => unidades(src).filter((u) => u.t !== ' ').map((u) => u.t);
const programTokens = tokens(PROGRAMA);

/** Runs from a disc the size of the code-cat canvas, as montar() would find them in the mask. */
function disco(fs: number): Tramo[] {
  const [ancho, alto] = [460, 456];
  const dentro = (x: number, y: number) => (x - ancho / 2) ** 2 + (y - alto / 2) ** 2 < 220 ** 2;
  return tramos(dentro, ancho, alto, fs * 0.6, fs * 1.1);
}

/** Ragged runs, several per row, from a seeded generator: a shape with ears, gaps and narrow rows. */
function irregular(seed: number): Tramo[] {
  let s = seed;
  const rand = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const out: Tramo[] = [];
  for (let fila = 0; fila < 70; fila++) {
    let col = Math.floor(rand() * 6);
    for (let k = 0; k < 1 + Math.floor(rand() * 3); k++) {
      const n = 3 + Math.floor(rand() * 40);
      out.push({ y: fila * 7, col0: col, n });
      col += n + 1 + Math.floor(rand() * 5);
    }
  }
  return out;
}

/**
 * Rust's view of the comments in `src`: block comments nest, and strings and
 * line comments are skipped. Returns the code with comments removed, or the
 * problem found.
 */
function sinComentarios(src: string): { code: string } | { error: string } {
  let code = '';
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    const two = src.slice(i, i + 2);
    if (depth > 0) {
      if (two === '/*') [depth, i] = [depth + 1, i + 1];
      else if (two === '*/') [depth, i] = [depth - 1, i + 1];
      continue;
    }
    if (two === '*/') return { error: `stray */ at ${i}` };
    if (two === '//') return { error: `line comment at ${i}` };
    if (two === '/*') {
      [depth, i] = [1, i + 1];
      code += ' ';
      continue;
    }
    if (src[i] === '"') {
      const end = /^"(?:[^"\\]|\\.)*"/.exec(src.slice(i));
      if (!end) return { error: `unclosed string at ${i}` };
      code += end[0];
      i += end[0].length - 1;
      continue;
    }
    code += src[i];
  }
  return depth === 0 ? { code } : { error: `${depth} comment(s) left open` };
}

const layouts = [
  ...[5.5, 6, 6.5, 7, 7.5].map((fs) => ({ name: `disc at ${fs}px`, runs: disco(fs) })),
  ...[1, 2, 3, 4, 5].map((seed) => ({ name: `ragged shape ${seed}`, runs: irregular(seed) })),
];

describe('FR-E20 the code-cat layout keeps the program intact', () => {
  it.each(layouts)('$name: never breaks a token and keeps every token inside its run', ({ runs }) => {
    const placed = acomodar(runs, programa);
    for (const p of placed) {
      const run = runs[p.tramo]!;
      expect(p.col).toBeGreaterThanOrEqual(run.col0);
      expect(p.col + [...p.t].length).toBeLessThanOrEqual(run.col0 + run.n);
    }
    // Read back the way rustc reads it: the first tokens are exactly the program's.
    expect(tokens(texto(placed)).slice(0, programTokens.length)).toEqual(programTokens);
  });

  it.each(layouts)('$name: closes every comment, so only the program is left as code', ({ runs }) => {
    const text = texto(acomodar(runs, programa));
    const result = sinComentarios(text);
    expect(result).toHaveProperty('code');
    const code = (r: ReturnType<typeof sinComentarios>) => tokens((r as { code: string }).code);
    expect(code(result)).toEqual(code(sinComentarios(PROGRAMA)));
    expect(text.trimEnd().endsWith('*/')).toBe(true);
  });

  it('fills the silhouette with the "liek" comment and OwO filler after the program', () => {
    const text = texto(acomodar(disco(6), programa)).replace(/\s+/g, ' ');
    expect(text).toContain('/* Do you liek mwy cwode?UwU?!?1 */');
    expect(text.slice(text.indexOf('?!?1 */'))).toMatch(/\/\* OwO UwU owo/);
  });

  it('starts each line at its run and puts a line per run that holds tokens', () => {
    const runs: Tramo[] = [
      { y: 0, col0: 4, n: 30 },
      { y: 0, col0: 40, n: 2 }, // too narrow for anything but tiny tokens
      { y: 7, col0: 0, n: 80 },
    ];
    const lines = texto(acomodar([...runs, ...irregular(9)], programa)).split('\n');
    expect(lines[0]).toMatch(/^ {4}#\[derive\(Debug\)\] struct/);
    expect(lines[0]!.length).toBeLessThanOrEqual(34);
  });

  it('rejects a silhouette too small for the program', () => {
    expect(() => acomodar(disco(7).slice(0, 8), programa)).toThrow('the program does not fit');
  });

  it('rejects a silhouette with no room to close the filler comment', () => {
    // Exactly enough runs for the program and part of the "liek" comment.
    const runs: Tramo[] = Array.from({ length: 400 }, (_, i) => ({ y: i, col0: 0, n: 30 }));
    const placed = acomodar(runs, programa);
    const program = placed.findLastIndex((p) => p.origen === 'programa');
    const tight = runs.slice(0, placed[program]!.tramo + 2);
    expect(() => acomodar(tight, programa)).toThrow('no room to close the filler comment');
  });
});

describe('FR-E20 the code cat is drawn letter by letter', () => {
  it('draws each character on its own, at its cell, so ligatures never form', () => {
    const runs = disco(6);
    const placed = acomodar(runs, programa);
    const calls: { text: string; x: number; y: number; color: unknown }[] = [];
    const ctx = {
      fillStyle: '' as unknown,
      fillText(text: string, x: number, y: number) {
        calls.push({ text, x, y, color: this.fillStyle });
      },
    };
    dibujar(ctx, placed, runs, 3.6);
    expect(calls.every((c) => [...c.text].length === 1)).toBe(true);
    expect(calls.map((c) => c.text).join('')).toBe(placed.map((p) => p.t).join(''));
    const arrow = placed.find((p) => p.t === '->')!;
    const at = calls.findIndex((c) => c.x === arrow.col * 3.6 && c.y === runs[arrow.tramo]!.y && c.text === '-');
    expect(calls[at + 1]).toMatchObject({ text: '>', x: (arrow.col + 1) * 3.6 });
  });
});

describe('FR-E20 tokens and filler', () => {
  it('keeps strings, numbers, paths and arrows whole', () => {
    const t = tokens(PROGRAMA);
    expect(t).toContain('"Kobo The Wolf"');
    expect(t).toContain('"*nuzzles* {} fixed! >w<"');
    expect(t).toContain('100_000.0');
    expect(t).toContain("'static");
    expect(t).toContain('println!');
    expect(t).toContain('->');
    expect(t).toContain('::');
  });

  it('never opens or closes a comment inside a filler word', () => {
    const words = [...take(relleno(), 2000)].filter((u) => u.t !== ' ' && u.t !== '/*' && u.t !== '*/');
    expect(words.filter((u) => /\/\*|\*\/|"/.test(u.t))).toEqual([]);
  });

  it('sizes the font between 5.5 and 11 px', () => {
    expect(tamanoLetra(0, programa)).toBe(5.5);
    expect(tamanoLetra(1e9, programa)).toBe(11);
    expect(tamanoLetra(110_000, programa)).toBeGreaterThan(5.5);
  });
});

function* take<T>(it: Iterator<T>, n: number): Generator<T> {
  for (let i = 0; i < n; i++) yield it.next().value as T;
}
