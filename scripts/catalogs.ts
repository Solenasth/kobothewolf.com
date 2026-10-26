// FR-I5: every catalog directory has one flat JSON file per supported
// language, and all of them define exactly the same keys.

export type CatalogSet = Readonly<Record<string, unknown>>;

export function checkCatalogs(dir: string, files: CatalogSet, languages: readonly string[]): string[] {
  const errors: string[] = [];

  for (const name of Object.keys(files)) {
    if (!languages.includes(name)) errors.push(`${dir}/${name}.json: "${name}" is not a supported language`);
  }

  const keys = new Map<string, Set<string>>();
  for (const lang of languages) {
    const catalog = files[lang];
    if (catalog === undefined) {
      errors.push(`${dir}/${lang}.json: missing`);
      continue;
    }
    if (typeof catalog !== 'object' || catalog === null || Array.isArray(catalog)) {
      errors.push(`${dir}/${lang}.json: must be a JSON object`);
      continue;
    }
    for (const [key, value] of Object.entries(catalog)) {
      if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`${dir}/${lang}.json: "${key}" must be a non-empty string`);
      }
    }
    keys.set(lang, new Set(Object.keys(catalog)));
  }

  const all = new Set([...keys.values()].flatMap((set) => [...set]));
  for (const [lang, set] of keys) {
    for (const key of [...all].sort()) {
      if (!set.has(key)) errors.push(`${dir}/${lang}.json: missing key "${key}"`);
    }
  }
  return errors;
}
