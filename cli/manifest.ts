// What the export renderer (e2e/exports/render.ts) writes next to the files,
// and check-exports reads (FR-B2, DESIGN §9). Boxes are [x, y, width, height]
// in face pixels (960 × 560).

export type Box = [number, number, number, number];

export interface FaceManifest {
  face: string;
  style: string;
  engine: string;
  png: string;
  /** Each QR's own box: the main one, and the one inside the site block. */
  qrs: { kind: 'main' | 'site'; box: Box }[];
  /** What nothing may touch: the main QR and the site block. */
  zones: { name: string; box: Box }[];
  /** Sparkles, washi tape, stickers and lines of text outside the zones. */
  obstacles: { kind: 'sparkle' | 'washi' | 'sticker' | 'text'; label: string; box: Box }[];
  /** Every text run with its first font family, after text-transform. */
  texts: { family: string; text: string }[];
}

export interface ExportIndex {
  engine: string;
  /** Face manifests, relative to the index. */
  faces: string[];
  /** Each PDF with the face manifests of its pages, in order. */
  pdfs: { file: string; pages: string[] }[];
}
