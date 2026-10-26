// Static text is marked in the HTML instead of being rendered by JavaScript,
// so the page reads fine without it (FR-P6). The same marks are filled from
// en.json at build time and re-applied with textContent on language change.
//
//   data-i18n="key"               element text
//   data-i18n-content="key"       content attribute (meta tags)
//   data-i18n-aria-label="key"    aria-label attribute

export const ATTRIBUTES = ['content', 'aria-label'] as const;

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Build time: fills every mark in an HTML string. Throws on an unknown key. */
export function fillStaticHtml(html: string, catalog: Readonly<Record<string, string>>): string {
  const lookup = (key: string): string => {
    const value = catalog[key];
    if (value === undefined) throw new Error(`static i18n: unknown key "${key}"`);
    return escape(value);
  };

  let out = html.replace(
    /<([a-z][a-z0-9]*)([^>]*\sdata-i18n="([\w.]+)"[^>]*)>[^<]*<\/\1>/g,
    (_m, tag: string, attrs: string, key: string) => `<${tag}${attrs}>${lookup(key)}</${tag}>`,
  );
  for (const attr of ATTRIBUTES) {
    out = out.replace(new RegExp(`<[^>]*\\sdata-i18n-${attr}="([\\w.]+)"[^>]*>`, 'g'), (tagText, key: string) => {
      const value = lookup(key);
      const withoutOld = tagText.replace(new RegExp(`\\s${attr}="[^"]*"`), '');
      return withoutOld.replace(/\s*\/?>$/, (end) => ` ${attr}="${value}"${end}`);
    });
  }
  return out;
}
