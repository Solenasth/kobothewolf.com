import { validateDocument } from './generated/validators.js';

// Untrusted input (NFR-4, DESIGN §8): size first, then parsing that refuses
// prototype keys, then the compiled schema. The store (#7) adds migration.

export const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export type ParseError =
  | { code: 'too-large'; bytes: number }
  | { code: 'not-json' }
  | { code: 'forbidden-key'; key: string }
  | { code: 'invalid'; issues: string[] };

export type ParseResult = { ok: true; document: KoboDocument } | { ok: false; error: ParseError };

export interface FaceState {
  textos?: Record<string, string>;
  ocultosEd?: number[];
  ocultasPiezas?: string[];
  arte?: string;
  fondo?: string;
  rotSt?: number;
  brillitos?: number;
}

export interface KoboDocument {
  app: 'kobo-exe-editor';
  version: 1;
  estilo: string;
  frente: string;
  reverso: string;
  caras: Record<string, FaceState>;
  artePropio?: string;
  acento?: string;
  sombra?: string;
  rotTit?: number;
  escala?: number;
  anguloWashi?: number;
}

class ForbiddenKey extends Error {
  readonly key: string;
  constructor(key: string) {
    super(key);
    this.key = key;
  }
}

export function parseDocument(text: string): ParseResult {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MAX_DOCUMENT_BYTES) return { ok: false, error: { code: 'too-large', bytes } };

  let data: unknown;
  try {
    data = JSON.parse(text, (key, value: unknown) => {
      if (FORBIDDEN_KEYS.has(key)) throw new ForbiddenKey(key);
      return value;
    });
  } catch (error) {
    if (error instanceof ForbiddenKey) return { ok: false, error: { code: 'forbidden-key', key: error.key } };
    return { ok: false, error: { code: 'not-json' } };
  }

  if (!validateDocument(data)) {
    const issues = (validateDocument.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? 'is invalid'}`);
    return { ok: false, error: { code: 'invalid', issues } };
  }
  return { ok: true, document: data as KoboDocument };
}
