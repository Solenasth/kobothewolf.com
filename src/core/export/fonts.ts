// The @font-face CSS an export embeds (NFR-2, DESIGN §5.5): the page's own
// same-origin font rules for the families a face uses, with each font file
// inlined as a data URL. URLs are resolved against their stylesheet with
// new URL(), so nothing changes the document's base URL (CSP base-uri 'none').

function* fontRules(rules: CSSRuleList, base: string): Generator<{ rule: CSSFontFaceRule; base: string }> {
  for (const rule of rules) {
    if (rule instanceof CSSFontFaceRule) yield { rule, base };
    else if (rule instanceof CSSImportRule && rule.styleSheet) yield* fontRules(rule.styleSheet.cssRules, rule.styleSheet.href ?? base);
    else if ('cssRules' in rule) yield* fontRules((rule as CSSGroupingRule).cssRules, base);
  }
}

const unquote = (family: string) => family.trim().replace(/^["']|["']$/g, '');

/** The first family of every element in the face. */
export function usedFamilies(face: Element): Set<string> {
  const families = new Set<string>();
  for (const el of [face, ...face.querySelectorAll('*')]) families.add(unquote(getComputedStyle(el).fontFamily.split(',')[0] ?? ''));
  return families;
}

async function dataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function fontEmbedCss(face: Element): Promise<string> {
  const families = usedFamilies(face);
  const out: string[] = [];
  for (const sheet of face.ownerDocument.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // not readable: not ours
    }
    for (const { rule, base } of fontRules(rules, sheet.href ?? location.href)) {
      if (!families.has(unquote(rule.style.getPropertyValue('font-family')))) continue;
      let css = rule.cssText;
      for (const [whole, raw] of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
        const url = new URL(raw!, base);
        if (url.origin !== location.origin && url.protocol !== 'data:') continue;
        css = css.replace(whole, `url("${url.protocol === 'data:' ? url.href : await dataUrl(url.href)}")`);
      }
      out.push(css);
    }
  }
  return out.join('\n');
}
