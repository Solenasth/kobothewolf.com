// Finds every style's variants from their files (FR-E18, DESIGN §3.4). The
// editor never lists variants in code: a folder with a variant.json and a
// caras.html is a variant. Pure, so tests can feed it fixture files.

export interface VariantManifest {
  id: string;
  orden?: number;
  caras: { frente: string; reverso: string };
  fondo: { frente: string; reverso: string };
  archivo: string;
  controles: readonly string[];
  verificar?: readonly string[];
  montar?: string;
}

export interface Variant {
  estilo: string;
  manifest: VariantManifest;
  /** The variant's caras.html, parsed later with parseFaces(). */
  html: string;
}

export interface VariantFiles {
  /** variant.json contents by path, e.g. from import.meta.glob. */
  manifests: Readonly<Record<string, unknown>>;
  /** caras.html text by path. */
  faces: Readonly<Record<string, string>>;
}

const PATH = /(?:^|\/)styles\/([^/]+)\/variantes\/([^/]+)\/(?:variant\.json|caras\.html)$/;

function where(path: string): { estilo: string; carpeta: string } {
  const match = PATH.exec(path);
  if (!match) throw new Error(`${path}: not a variant file`);
  return { estilo: match[1]!, carpeta: match[2]! };
}

/** Variants by style, each list sorted by `orden` (missing sorts last), then id. */
export function collectVariants(files: VariantFiles): Map<string, Variant[]> {
  const html = new Map<string, string>();
  for (const [path, text] of Object.entries(files.faces)) {
    const { estilo, carpeta } = where(path);
    html.set(`${estilo}/${carpeta}`, text);
  }

  const styles = new Map<string, Variant[]>();
  for (const [path, data] of Object.entries(files.manifests)) {
    const { estilo, carpeta } = where(path);
    const manifest = data as VariantManifest;
    if (manifest.id !== carpeta) throw new Error(`${path}: id "${manifest.id}" must match the folder "${carpeta}"`);
    const faces = html.get(`${estilo}/${carpeta}`);
    if (faces === undefined) throw new Error(`${path}: caras.html is missing`);
    styles.set(estilo, [...(styles.get(estilo) ?? []), { estilo, manifest, html: faces }]);
  }

  const orden = (v: Variant) => v.manifest.orden ?? Number.POSITIVE_INFINITY;
  for (const list of styles.values()) {
    list.sort((a, b) => orden(a) - orden(b) || (a.manifest.id < b.manifest.id ? -1 : a.manifest.id > b.manifest.id ? 1 : 0));
  }
  return styles;
}
