// Style label rules for `validate` (FR-I1, FR-I5, DESIGN §4, §7): every key a
// style uses has a label in each language, and no label outlives its key.
import { readMarks } from '../src/core/marks.ts';
import { faceFrom } from '../src/core/parse5-element.ts';
import { findFaces } from './faces.ts';

export interface LabelSource {
  editor: { fondos: readonly string[]; arte: readonly string[]; acentos: readonly string[]; sombras: readonly string[] };
  variants: readonly { id: string; html: string }[];
}

/** Label keys the style needs, each with where it is first used. */
export function requiredLabels(source: LabelSource): Map<string, string> {
  const keys = new Map<string, string>();
  const need = (key: string, where: string) => {
    if (!keys.has(key)) keys.set(key, where);
  };
  for (const key of source.editor.fondos) need(`fondo.${key}`, 'editor.json fondos');
  for (const key of source.editor.arte) need(`arte.${key}`, 'editor.json arte');
  for (const color of [...source.editor.acentos, ...source.editor.sombras]) {
    need(`color.${color.slice(1).toLowerCase()}`, 'editor.json colors');
  }
  for (const variant of source.variants) {
    need(`variant.${variant.id}.name`, `variant ${variant.id}`);
    for (const { id } of findFaces(variant.html)) {
      need(`face.${id}.name`, id);
      const marks = readMarks(faceFrom(variant.html, id));
      for (const field of marks.fields) need(`ed.${field.key}`, id);
      for (const piece of marks.pieces) if (piece.kind === 'parte') need(`parte.${piece.key}`, id);
    }
  }
  return keys;
}

/** Checks each language's style catalog against the keys the style uses. Missing catalogs are reported by checkCatalogs. */
export function checkLabels(dir: string, catalogs: Readonly<Record<string, unknown>>, required: ReadonlyMap<string, string>): string[] {
  const errors: string[] = [];
  for (const [lang, catalog] of Object.entries(catalogs)) {
    if (typeof catalog !== 'object' || catalog === null) continue;
    const file = `${dir}/${lang}.json`;
    for (const [key, where] of required) {
      if (!(key in catalog)) errors.push(`${file}: missing label "${key}" (used by ${where})`);
    }
    for (const key of Object.keys(catalog)) {
      if (!required.has(key)) errors.push(`${file}: label "${key}" is not used by the style`);
    }
  }
  return errors;
}
