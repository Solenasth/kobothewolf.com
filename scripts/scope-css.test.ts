import { describe, expect, it } from 'vitest';
import { scopeCss, scopeFor, scopeSelector, unscopedSelectors, type Scope } from './scope-css.ts';

const LIC: Scope = ['lic-f', 'lic-r'];
const ok = (css: string, scope: Scope = LIC) => {
  const result = scopeCss(css, scope, 'v.css');
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.code;
};
const fails = (css: string, scope: Scope = LIC) => {
  const result = scopeCss(css, scope, 'v.css');
  if (result.ok) throw new Error(`expected an error, got:\n${result.code}`);
  return result.errors;
};
/** Selectors of the flattened output, one per style rule, whitespace-normalized. */
const selectors = (css: string) => [...css.matchAll(/^\s*([^@{}\n][^{}]*?)\s*\{/gm)].map((m) => m[1]!.replace(/\s+/g, ' '));

describe('FR-E18 variant CSS is scoped to its own faces', () => {
  it('wraps every rule under the variant faces', () => {
    const out = ok('.titulo { color: red }\n.qr img, .cred > p { margin: 0 }');
    expect(selectors(out)).toEqual([
      ':is([data-cara="lic-f"], [data-cara="lic-r"]) .titulo',
      ':is([data-cara="lic-f"], [data-cara="lic-r"]) .qr img, :is([data-cara="lic-f"], [data-cara="lic-r"]) .cred > p',
    ]);
  });

  it('uses & for the face root and keeps nesting, pseudo-elements and @media inside the scope', () => {
    const out = ok('& { --tinta: #333 }\n.papel { &::before { content: "" } }\n@media (min-width: 900px) { .papel { color: blue } }');
    expect(selectors(out)).toEqual([
      ':is([data-cara="lic-f"], [data-cara="lic-r"])',
      ':is([data-cara="lic-f"], [data-cara="lic-r"]) .papel:before',
      ':is([data-cara="lic-f"], [data-cara="lic-r"]) .papel',
    ]);
    expect(out).toContain('@media');
  });

  it('allows @supports, @container and @starting-style', () => {
    const out = ok('@supports (display: grid) { .a { display: grid } }\n@container (width > 10px) { .b { color: red } }\n@starting-style { .c { opacity: 0 } }');
    expect(unscopedSelectors(out, LIC)).toEqual([]);
  });

  it('scopes a style-level sheet to every face', () => {
    const out = ok('.card { width: 960px }\n& { --tinta: #333 }', null);
    expect(selectors(out)).toEqual(['[data-cara] .card', '[data-cara]']);
  });

  it('builds the scope selector from the face ids', () => {
    expect(scopeSelector(null)).toBe('[data-cara]');
    expect(scopeSelector(LIC)).toBe(':is([data-cara="lic-f"], [data-cara="lic-r"])');
  });
});

describe('NFR-1 rules that would leak or silently match nothing are build errors', () => {
  it.each([
    ['@font-face { font-family: x; src: url(a.woff2) }', '@font-face'],
    ['@keyframes k { from { opacity: 0 } }', '@keyframes'],
    ['@import "other.css";', '@import'],
    ['@layer base { .a { color: red } }', '@layer'],
    ['@property --x { syntax: "*"; inherits: false }', '@property'],
    ['@page { margin: 0 }', '@page'],
    ['@scope (.a) { .b { color: red } }', '@scope'],
    ['@frobnicate x;', '@frobnicate'],
  ])('rejects %s', (css, name) => {
    expect(fails(css).join('\n')).toContain(name);
  });

  it.each([
    [':root { --tinta: #333 }', ':root'],
    ['html { font-size: 10px }', 'html'],
    ['body .a { color: red }', 'body'],
    [':host { color: red }', ':host'],
    ['.a:is(:root .b) { color: red }', ':root'],
  ])('rejects %s', (css, part) => {
    expect(fails(css)).toEqual([expect.stringContaining(`${part} can't be scoped to a face`)]);
  });

  it('points at the source line', () => {
    expect(fails('.a { color: red }\n\n:root { --x: 1 }')[0]).toMatch(/^v\.css:3:/);
  });

  it('reports CSS syntax errors with the file name and line', () => {
    expect(fails('.a { color: red }\n.b { color: red } ]\n.c {}')).toEqual(['v.css:2:19: Invalid empty selector']);
  });

  it('catches a stray } that would close the scope early', () => {
    expect(fails('.a { color: red } }\n.evil { color: red }')).toEqual(['v.css: unbalanced { } (a missing or extra brace)']);
    expect(fails('.a { color: red; ]')).toEqual(['v.css: unbalanced { } (a missing or extra brace)']);
  });

  it('rejects invalid face ids', () => {
    expect(fails('.a{}', ['lic-f', 'x"] , body'])).toEqual([expect.stringContaining('invalid face ids')]);
    expect(fails('.a{}', [])).toEqual([expect.stringContaining('invalid face ids')]);
  });
});

describe('NFR-1 output check: no rule outside the scope', () => {
  it('accepts scoped output', () => {
    expect(unscopedSelectors('[data-cara] .a{color:red}', null)).toEqual([]);
    expect(unscopedSelectors(':is([data-cara="lic-f"],[data-cara="lic-r"]) .a{color:red}', LIC)).toEqual([]);
  });

  it('flags unscoped rules, other faces and global at-rules', () => {
    expect(unscopedSelectors('.a{color:red}', null)).toHaveLength(1);
    expect(unscopedSelectors('[data-cara="lic-f"] .a{color:red}', null)).toHaveLength(1);
    expect(unscopedSelectors(':is([data-cara="lic-f"],[data-cara="cer-r"]) .a{color:red}', LIC)).toHaveLength(1);
    expect(unscopedSelectors(':is([data-cara="lic-f"]) .a{color:red}', LIC)).toHaveLength(1);
    expect(unscopedSelectors('[data-cara] .a, .b{color:red}', null)).toHaveLength(1);
    expect(unscopedSelectors('@media print { .a { color: red } }', null)).toHaveLength(1);
    expect(unscopedSelectors('@font-face { font-family: x; src: url(a.woff2) }', null)).toEqual(['@font-face']);
  });
});

describe('FR-E18 which files are scoped, and how', () => {
  const manifest = () => JSON.stringify({ caras: { frente: 'lic-f', reverso: 'lic-r' } });

  it('scopes a variant sheet to the faces in its variant.json', () => {
    expect(scopeFor('/r/styles/boykisser-uwu/variantes/licencia/caras.css', manifest)).toEqual(['lic-f', 'lic-r']);
  });

  it('scopes the style sheet to every face', () => {
    expect(scopeFor('/r/styles/boykisser-uwu/caras.css', manifest)).toBeNull();
  });

  it('leaves every other stylesheet alone', () => {
    expect(scopeFor('/r/src/theme/ui.css', manifest)).toBeUndefined();
    expect(scopeFor('/r/styles/boykisser-uwu/otra.css', manifest)).toBeUndefined();
  });

  it('fails on a variant.json without face ids', () => {
    expect(() => scopeFor('/r/styles/s/variantes/v/caras.css', () => '{}')).toThrow('caras.frente/reverso');
  });
});
