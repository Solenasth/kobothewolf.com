import { DEFAULT_LANG, type Lang } from './languages';

export type Catalog = Readonly<Record<string, string>>;
export type Params = Readonly<Record<string, string | number>>;

/**
 * Looks up `key` in the active language, then English, then returns the key
 * itself (DESIGN §4). `{name}` placeholders are filled from `params`; when
 * `params.count` is a number, `key.<plural category>` is tried first, so
 * catalogs hold e.g. `items.one` and `items.other`.
 */
export function createTranslator<K extends string>(
  catalogs: Readonly<Record<Lang, Catalog>>,
  lang: Lang,
  onMissing: (key: string, lang: Lang) => void = () => {},
) {
  const plurals = new Intl.PluralRules(lang);

  function lookup(key: string): string | undefined {
    return catalogs[lang][key] ?? catalogs[DEFAULT_LANG][key];
  }

  return function t(key: K, params?: Params): string {
    const count = params?.['count'];
    const pluralKey = typeof count === 'number' ? `${key}.${plurals.select(count)}` : undefined;
    const template =
      (pluralKey && (catalogs[lang][pluralKey] ?? catalogs[DEFAULT_LANG][pluralKey])) ??
      lookup(key) ??
      (typeof count === 'number' ? lookup(`${key}.other`) : undefined);

    if (template === undefined) {
      onMissing(key, lang);
      return key;
    }
    return params ? interpolate(template, params) : template;
  };
}

function interpolate(template: string, params: Params): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : match,
  );
}
