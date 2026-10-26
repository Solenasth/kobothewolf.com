// Loads the JSON Schemas in schemas/ into one ajv instance (draft 2020-12).
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';

// ajv is CommonJS: Node's ESM loader exposes it as `.default`, bundlers as the import itself.
export const interop = <T>(mod: T): T => (mod as { default?: T }).default ?? mod;

export const SCHEMAS = ['tokens', 'editor', 'variant', 'document'] as const;
export type SchemaName = (typeof SCHEMAS)[number];

export const schemaId = (name: SchemaName) => `https://kobothewolf.com/schemas/${name}.schema.json`;

export function createAjv(options: { standalone?: boolean } = {}) {
  const Ajv = interop(Ajv2020);
  const ajv = new Ajv({
    strict: true,
    allErrors: true,
    ...(options.standalone ? { code: { source: true, esm: true } } : {}),
  });
  for (const name of SCHEMAS) {
    ajv.addSchema(JSON.parse(readFileSync(`schemas/${name}.schema.json`, 'utf8')));
  }
  return ajv;
}

export function formatErrors(file: string, validate: ValidateFunction): string[] {
  return (validate.errors ?? []).map((e) => `${file}: ${e.instancePath || '/'} ${e.message ?? 'is invalid'}`);
}
