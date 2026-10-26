// Editor ranges derived from a style's anti-rules (FR-E9, DESIGN §3.3), so
// tokens.json stays the single source of truth. The sticker scale has no
// anti-rule and comes from editor.json.

export type Range = readonly [min: number, max: number];

export interface EditorRanges {
  rotSt: Range;
  rotTit: Range;
  washi: Range;
  brillitos: Range;
  escala: Range;
}

const isRange = (value: unknown): value is Range =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
  value[0] <= value[1];

function at(antirreglas: Record<string, unknown>, path: string): Range {
  const value = path
    .split('.')
    .reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), antirreglas);
  if (!isRange(value)) throw new Error(`antirreglas.${path} must be a [min, max] range`);
  return value;
}

export function deriveRanges(antirreglas: Record<string, unknown>, escala: Range): EditorRanges {
  return {
    rotSt: at(antirreglas, 'rotacion_stickers_grados'),
    rotTit: at(antirreglas, 'rotacion_titulares_grados'),
    washi: at(antirreglas, 'washi.grados'),
    brillitos: at(antirreglas, 'brillitos.por_cara'),
    escala,
  };
}
