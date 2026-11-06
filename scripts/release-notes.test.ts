import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findEntry, inline, renderVersion, visibleSections } from './release-notes.ts';

// FR-P9: the page's release notes come from CHANGELOG.md at build time.

const R = 'https://github.com/Solenasth/kobothewolf.com';
const GENERATED = `# Changelog

## [0.7.0](${R}/compare/v0.6.1...v0.7.0) (2026-10-27)


### Features

* **editor:** resize text per section on each face ([c8846e5](${R}/commit/c8846e5bee0d)), closes [#73](${R}/issues/73)
* **editor:** text size per card section ([#78](${R}/issues/78)) ([171889e](${R}/commit/171889e3ba47))


### Docs

* specify text size per section ([#78](${R}/issues/78)) ([dbbbcb0](${R}/commit/dbbbcb0))

## v0.6.0 (2026-10-27): vector PDF

Milestone M6 (CLI): \`npm run kobo -- pdf-vector\` makes a print PDF.

### Features
- **cli:** \`pdf-vector\` prints a card ([#59](${R}/pull/59), closes [#20](${R}/issues/20))

### Docs
- decision [0008](docs/decisions/0008-release-please.md)
`;

describe('FR-P9 finding the running version in CHANGELOG.md', () => {
  it('reads a release-please entry', () => {
    const entry = findEntry(GENERATED, '0.7.0')!;
    expect(entry).toMatchObject({ version: '0.7.0', date: '2026-10-27', generated: true, summary: [] });
    expect(entry.sections.map((s) => [s.name, s.items.length])).toEqual([['Features', 2], ['Docs', 1]]);
  });

  it('reads a hand-written entry with its title and summary', () => {
    const entry = findEntry(GENERATED, '0.6.0')!;
    expect(entry).toMatchObject({ title: 'vector PDF', generated: false, summary: ['Milestone M6 (CLI): `npm run kobo -- pdf-vector` makes a print PDF.'] });
  });

  it('finds nothing for a version without an entry, and the build fails', () => {
    expect(findEntry(GENERATED, '0.8.0')).toBeUndefined();
    expect(() => renderVersion(GENERATED, '0.8.0', 'abc1234')).toThrow('CHANGELOG.md has no entry for v0.8.0');
  });

  it('the real changelog has an entry for the version in package.json', () => {
    const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    expect(findEntry(readFileSync('CHANGELOG.md', 'utf8'), version), version).toBeDefined();
  });
});

describe('FR-P9 what the notes show', () => {
  it('keeps user-facing sections, one line per merged PR, without commit links or "closes"', () => {
    expect(visibleSections(findEntry(GENERATED, '0.7.0')!)).toEqual([{ name: 'Features', items: [`**editor:** text size per card section ([#78](${R}/issues/78))`] }]);
  });

  it('keeps every item of a hand-written entry', () => {
    expect(visibleSections(findEntry(GENERATED, '0.6.0')!)).toEqual([{ name: 'Features', items: [`**cli:** \`pdf-vector\` prints a card ([#59](${R}/pull/59))`] }]);
  });
});

describe('FR-P9 NFR-4 the notes become safe HTML', () => {
  it('escapes text and turns only bold, code and repo links into markup', () => {
    expect(inline('**a** `b` <img src=x onerror=alert(1)> & "q"')).toBe('<strong>a</strong> <code>b</code> &lt;img src=x onerror=alert(1)&gt; &amp; &quot;q&quot;');
    expect(inline(`see [#78](${R}/issues/78)`)).toBe(`see <a href="${R}/issues/78">#78</a>`);
    expect(inline('[docs](docs/DESIGN.md)')).toBe(`<a href="${R}/blob/main/docs/DESIGN.md">docs</a>`);
  });

  it('drops links that leave the repository, keeping their text', () => {
    expect(inline('[evil](https://example.com/x)')).toBe('evil');
    // The link pattern stops at the first ')', so a stray one stays as text; no link either way.
    expect(inline('[js](javascript:alert(1))')).toBe('js)');
    expect(inline('[up](../../secret)')).toBe('up');
    expect(inline(`[x](${R}.evil.com/a)`)).toBe('x');
  });

  it('renders the version, the commit, the notes and the release link', () => {
    const html = renderVersion(GENERATED, '0.7.0', 'a31aa73cafe');
    expect(html).toContain('<span class="v">v0.7.0 · a31aa73</span>');
    expect(html).toContain('<div lang="en">');
    expect(html).toContain(`<li><strong>editor:</strong> text size per card section (<a href="${R}/issues/78">#78</a>)</li>`);
    expect(html).toContain(`href="${R}/releases/tag/v0.7.0"`);
    expect(html).toContain(`href="${R}/commit/a31aa73cafe"`);
    expect(html).not.toContain('Docs');
    expect(renderVersion(GENERATED, '0.7.0', undefined)).toContain('<span class="v">v0.7.0</span>');
  });
});
