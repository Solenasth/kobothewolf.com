// Build-time CSS scoping for faces (FR-E2, FR-E18, NFR-1, DESIGN §5.1,
// decision 0006). Each face stylesheet is wrapped in native nesting under its
// faces' data-cara selector and flattened by Lightning CSS; the output is
// re-parsed and must have every style rule inside the scope.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { escalarFuentes } from '../src/core/fuentes.ts';
import { Features, transform, type Rule, type Selector, type SelectorComponent } from 'lightningcss';
import type { Plugin } from 'vite';

/** `null` scopes to every face; otherwise to the listed face ids. */
export type Scope = readonly string[] | null;

export type ScopeResult = { ok: true; code: string } | { ok: false; errors: string[] };

/** At-rules that stay inside the scope once flattened. Anything else is global or escapes. */
const ALLOWED_RULES = new Set(['style', 'media', 'supports', 'container', 'starting-style', 'nested-declarations']);
const RULE_NAMES: Record<string, string> = {
  'font-face': '@font-face',
  keyframes: '@keyframes',
  import: '@import',
  'layer-statement': '@layer',
  'layer-block': '@layer',
  property: '@property',
  page: '@page',
  scope: '@scope',
  namespace: '@namespace',
  'counter-style': '@counter-style',
  'font-palette-values': '@font-palette-values',
  'font-feature-values': '@font-feature-values',
  'view-transition': '@view-transition',
  'moz-document': '@-moz-document',
};
const GLOBAL_PSEUDO_CLASSES = new Set(['root', 'host', 'scope']);
const GLOBAL_TYPES = new Set(['html', 'body']);
const KEY = /^[a-z0-9]+-[fr]$/;

export function scopeSelector(scope: Scope): string {
  return scope === null ? '[data-cara]' : `:is(${scope.map((id) => `[data-cara="${id}"]`).join(', ')})`;
}

function isScopeAttribute(c: SelectorComponent, scope: Scope): boolean {
  if (c.type !== 'attribute' || c.name !== 'data-cara' || c.namespace) return false;
  if (scope === null) return !c.operation;
  return c.operation?.operator === 'equal' && scope.includes(c.operation.value);
}

/** True when a flattened selector starts with the scope compound followed by a combinator or nothing. */
export function startsWithScope(selector: Selector, scope: Scope): boolean {
  const first = selector[0];
  if (!first) return false;
  const ok =
    scope === null
      ? isScopeAttribute(first, scope)
      : (first.type === 'pseudo-class' &&
          first.kind === 'is' &&
          first.selectors.length === scope.length &&
          first.selectors.every((s) => s.length === 1 && isScopeAttribute(s[0]!, scope))) ||
        (scope.length === 1 && isScopeAttribute(first, scope));
  return ok;
}

function globalParts(selector: Selector, found: Set<string>): void {
  for (const c of selector) {
    if (c.type === 'pseudo-class' && GLOBAL_PSEUDO_CLASSES.has(c.kind)) found.add(`:${c.kind}`);
    if (c.type === 'type' && GLOBAL_TYPES.has(c.name.toLowerCase())) found.add(c.name.toLowerCase());
    if (c.type === 'pseudo-class' && 'selectors' in c && Array.isArray(c.selectors)) {
      for (const inner of c.selectors as Selector[]) globalParts(inner, found);
    }
  }
}

/** Scopes one face stylesheet. `filename` is used in error messages only. */
export function scopeCss(css: string, scope: Scope, filename: string): ScopeResult {
  if (scope !== null && (scope.length === 0 || !scope.every((id) => KEY.test(id)))) {
    return { ok: false, errors: [`${filename}: invalid face ids ${JSON.stringify(scope)}`] };
  }
  const errors: string[] = [];
  // Visitor locations count lines from 0 and columns from 1.
  const where = (loc: { line: number; column: number } | undefined) => (loc ? `${filename}:${loc.line + 1}:${loc.column}` : filename);
  // The wrapper opens on the same line as the file's first line, so line numbers match the source.
  const wrapped = `${scopeSelector(scope)} {${css}\n}`;
  let code: string;
  try {
    code = transform({
      filename,
      code: Buffer.from(wrapped),
      include: Features.Nesting,
      visitor: {
        Rule(rule: Rule) {
          if (!ALLOWED_RULES.has(rule.type)) {
            const value = 'value' in rule ? (rule.value as { loc?: { line: number; column: number }; name?: string }) : {};
            const name = rule.type === 'unknown' ? `@${value.name}` : (RULE_NAMES[rule.type] ?? `@${rule.type}`);
            const loc = value.loc;
            errors.push(`${where(loc)}: ${name} is not allowed in face CSS (DESIGN §5.1)`);
          }
          if (rule.type === 'style') {
            const found = new Set<string>();
            for (const selector of rule.value.selectors) globalParts(selector, found);
            for (const part of found) errors.push(`${where(rule.value.loc)}: ${part} can't be scoped to a face; write & for the face root`);
          }
          return undefined;
        },
      },
    }).code.toString();
  } catch (error) {
    // Thrown errors count lines from 1. One past the source means the wrapper's closing brace was hit.
    const e = error as { message: string; loc?: { line: number; column: number } };
    const lines = css.split('\n').length;
    if (e.loc && e.loc.line > lines) return { ok: false, errors: [`${filename}: unbalanced { } (a missing or extra brace)`] };
    return { ok: false, errors: [`${e.loc ? `${filename}:${e.loc.line}:${e.loc.column}` : filename}: ${e.message}`] };
  }
  if (errors.length > 0) return { ok: false, errors };
  const escaped = unscopedSelectors(code, scope);
  if (escaped.length > 0) return { ok: false, errors: escaped.map((s) => `${filename}: rule escaped its scope: ${s}`) };
  return { ok: true, code };
}

/** Every style rule selector in `css` that does not start with the scope. */
export function unscopedSelectors(css: string, scope: Scope): string[] {
  const escaped: string[] = [];
  transform({
    filename: 'scoped.css',
    code: Buffer.from(css),
    visitor: {
      Rule(rule: Rule) {
        if (rule.type === 'style') {
          for (const selector of rule.value.selectors) {
            if (!startsWithScope(selector, scope)) escaped.push(JSON.stringify(selector));
          }
        } else if (!ALLOWED_RULES.has(rule.type)) {
          escaped.push(`@${rule.type}`);
        }
        return undefined;
      },
    },
  });
  return escaped;
}

const STYLE_CSS = /\/styles\/[^/]+\/caras\.css$/;
const VARIANT_CSS = /\/styles\/[^/]+\/variantes\/[^/]+\/caras\.css$/;

/** The scope for a face stylesheet path, or undefined for any other file. */
export function scopeFor(file: string, readManifest = (path: string) => readFileSync(path, 'utf8')): Scope | undefined {
  const path = file.replaceAll('\\', '/');
  if (VARIANT_CSS.test(path)) {
    const manifest = JSON.parse(readManifest(join(dirname(file), 'variant.json'))) as { caras?: { frente?: unknown; reverso?: unknown } };
    const ids = [manifest.caras?.frente, manifest.caras?.reverso];
    if (!ids.every((id): id is string => typeof id === 'string')) throw new Error(`${file}: variant.json has no caras.frente/reverso`);
    return ids;
  }
  if (STYLE_CSS.test(path)) return null;
  return undefined;
}

/**
 * Vite plugin: scopes `styles/<estilo>/caras.css` and `styles/<estilo>/variantes/<v>/caras.css`,
 * after making their font sizes follow each section's --tam (FR-E22).
 */
export function scopeFaceCss(): Plugin {
  return {
    name: 'kobo:scope-css',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0]!;
      const scope = scopeFor(file);
      if (scope === undefined) return null;
      const manifest = scope === null ? [] : [join(dirname(file), 'variant.json')];
      for (const dep of manifest) this.addWatchFile(dep);
      const result = scopeCss(escalarFuentes(code), scope, file);
      if (!result.ok) this.error(result.errors.join('\n'));
      return { code: result.code, map: null };
    },
  };
}
