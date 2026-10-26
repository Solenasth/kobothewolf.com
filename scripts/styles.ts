// Style data rules for `validate` (FR-B3, FR-E8, FR-E9, DESIGN §7).
import type Ajv from 'ajv';
import { deriveRanges, type Range } from '../src/core/ranges.ts';
import { checkFacesHtml, findFaces } from './faces.ts';
import { formatErrors, schemaId, type SchemaName } from './schemas.ts';

export interface VariantData {
  dir: string;
  manifest: unknown;
  html?: string;
}

export interface StyleData {
  dir: string;
  tokens: unknown;
  editor: unknown;
  variants: VariantData[];
}

type Ajv2020 = Pick<Ajv, 'getSchema'>;

function check(ajv: Ajv2020, name: SchemaName, file: string, data: unknown): string[] {
  const validate = ajv.getSchema(schemaId(name))!;
  return validate(data) ? [] : formatErrors(file, validate);
}

export function checkStyle(ajv: Ajv2020, style: StyleData): string[] {
  const name = style.dir.split('/').pop()!;
  const errors = [
    ...check(ajv, 'tokens', `${style.dir}/tokens.json`, style.tokens),
    ...check(ajv, 'editor', `${style.dir}/editor.json`, style.editor),
  ];
  if (errors.length > 0) return errors;

  const tokens = style.tokens as { estilo: string; color: Record<string, string>; antirreglas: Record<string, unknown> };
  const editor = style.editor as { acentos: string[]; sombras: string[]; escala: Range };

  if (tokens.estilo !== name) errors.push(`${style.dir}/tokens.json: estilo "${tokens.estilo}" must match the folder "${name}"`);

  const palette = new Set(Object.values(tokens.color).map((c) => c.toUpperCase()));
  for (const list of ['acentos', 'sombras'] as const) {
    for (const color of editor[list]) {
      if (!palette.has(color.toUpperCase())) errors.push(`${style.dir}/editor.json: ${list} ${color} is not a color token`);
    }
  }

  try {
    deriveRanges(tokens.antirreglas, editor.escala);
  } catch (error) {
    errors.push(`${style.dir}/tokens.json: ${(error as Error).message}`);
  }

  for (const variant of style.variants) errors.push(...checkVariant(ajv, variant));
  return errors;
}

function checkVariant(ajv: Ajv2020, variant: VariantData): string[] {
  const id = variant.dir.split('/').pop()!;
  const errors = check(ajv, 'variant', `${variant.dir}/variant.json`, variant.manifest);
  if (errors.length > 0) return errors;

  const manifest = variant.manifest as { id: string; caras: { frente: string; reverso: string } };
  if (manifest.id !== id) errors.push(`${variant.dir}/variant.json: id "${manifest.id}" must match the folder "${id}"`);
  if (variant.html === undefined) return [...errors, `${variant.dir}/caras.html: missing`];

  const file = `${variant.dir}/caras.html`;
  const faceIds = findFaces(variant.html).map((f) => f.id);
  for (const face of [manifest.caras.frente, manifest.caras.reverso]) {
    if (!faceIds.includes(face)) errors.push(`${file}: face "${face}" from variant.json is missing`);
  }
  return [...errors, ...checkFacesHtml(file, variant.html)];
}
