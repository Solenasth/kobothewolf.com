// Text size per section (FR-E22, DESIGN §5.1): every pixel font size in a
// face becomes `calc(<size> * var(--tam, 1))`, so a section scales its texts
// by setting --tam. No DOM: the face-CSS plugin runs it at build time on
// stylesheets, parseFaces on inline styles.

const DECLARATION = /(^|[;{\s])(font-size|font)(\s*:\s*)([^;}]*)/g;
const SIZE = /(\d*\.?\d+)px/;

/** Rewrites the pixel font size of every `font` and `font-size` declaration in `css`. */
export function escalarFuentes(css: string): string {
  return css.replace(DECLARATION, (whole, before: string, property: string, colon: string, value: string) => {
    if (value.includes('--tam')) return whole;
    // In the `font` shorthand the first pixel length is the size; a line height follows a slash.
    const scaled = value.replace(SIZE, (px) => `calc(${px} * var(--tam, 1))`);
    return `${before}${property}${colon}${scaled}`;
  });
}
