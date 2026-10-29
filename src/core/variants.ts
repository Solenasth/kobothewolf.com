// Finds every style's variants from their files (FR-E18, FR-E19, DESIGN §3.4).
// The editor never lists variants in code: a folder with a variant.json and a
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
  /** QR layouts the back supports, the first being its default (FR-E23). */
  qr?: readonly string[];
}

export interface Variant {
  estilo: string;
  manifest: VariantManifest;
  /** The variant's caras.html, parsed later with parseFaces(). */
  html: string;
  /** Loads the module named by `manifest.montar`, which exports `montar(cara)`. */
  montar?: () => Promise<unknown>;
}

export interface VariantFiles {
  /** variant.json contents by path, e.g. from import.meta.glob. */
  manifests: Readonly<Record<string, unknown>>;
  /** caras.html text by path. */
  faces: Readonly<Record<string, string>>;
  /** Lazy loaders of the variants' montar.ts by path; used when the manifest names it. */
  scripts?: Readonly<Record<string, () => Promise<unknown>>>;
}

const PATH = /(?:^|\/)styles\/([^/]+)\/variantes\/([^/]+)\/(?:variant\.json|caras\.html|montar\.ts)$/;

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
  const scripts = new Map<string, () => Promise<unknown>>();
  for (const [path, load] of Object.entries(files.scripts ?? {})) {
    const { estilo, carpeta } = where(path);
    scripts.set(`${estilo}/${carpeta}/${path.slice(path.lastIndexOf('/') + 1)}`, load);
  }

  const styles = new Map<string, Variant[]>();
  for (const [path, data] of Object.entries(files.manifests)) {
    const { estilo, carpeta } = where(path);
    const manifest = data as VariantManifest;
    if (manifest.id !== carpeta) throw new Error(`${path}: id "${manifest.id}" must match the folder "${carpeta}"`);
    const faces = html.get(`${estilo}/${carpeta}`);
    if (faces === undefined) throw new Error(`${path}: caras.html is missing`);
    const variant: Variant = { estilo, manifest, html: faces };
    if (manifest.montar !== undefined) {
      const load = scripts.get(`${estilo}/${carpeta}/${manifest.montar}`);
      if (!load) throw new Error(`${path}: montar file ${manifest.montar} is missing`);
      variant.montar = load;
    }
    styles.set(estilo, [...(styles.get(estilo) ?? []), variant]);
  }

  const orden = (v: Variant) => v.manifest.orden ?? Number.POSITIVE_INFINITY;
  for (const list of styles.values()) {
    list.sort((a, b) => orden(a) - orden(b) || (a.manifest.id < b.manifest.id ? -1 : a.manifest.id > b.manifest.id ? 1 : 0));
  }
  return styles;
}
