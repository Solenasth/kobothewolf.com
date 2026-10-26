import { describe, expect, it } from 'vitest';
import { fillStaticHtml } from './static-html';

const catalog = { 'a.text': 'Hello & <welcome>', 'a.desc': 'Say "hi"', 'a.nav': 'Language' };

describe('FR-P6 static text is filled from the catalog at build time', () => {
  it('fills element text, escaping HTML', () => {
    expect(fillStaticHtml('<p class="x" data-i18n="a.text"></p>', catalog)).toBe(
      '<p class="x" data-i18n="a.text">Hello &amp; &lt;welcome&gt;</p>',
    );
  });

  it('replaces placeholder text already in the element', () => {
    expect(fillStaticHtml('<h2 data-i18n="a.nav">old</h2>', catalog)).toBe('<h2 data-i18n="a.nav">Language</h2>');
  });

  it('fills content and aria-label attributes, escaping quotes', () => {
    expect(fillStaticHtml('<meta name="description" data-i18n-content="a.desc" />', catalog)).toBe(
      '<meta name="description" data-i18n-content="a.desc" content="Say &quot;hi&quot;" />',
    );
    expect(fillStaticHtml('<nav data-i18n-aria-label="a.nav">', catalog)).toBe(
      '<nav data-i18n-aria-label="a.nav" aria-label="Language">',
    );
  });

  it('replaces an existing attribute instead of duplicating it', () => {
    expect(fillStaticHtml('<meta content="old" data-i18n-content="a.nav">', catalog)).toBe(
      '<meta data-i18n-content="a.nav" content="Language">',
    );
  });

  it('fails the build on an unknown key', () => {
    expect(() => fillStaticHtml('<p data-i18n="nope"></p>', catalog)).toThrow('unknown key "nope"');
  });
});
