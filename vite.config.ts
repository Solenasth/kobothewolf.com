import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';
import en from './src/i18n/en.json' with { type: 'json' };
import { fillStaticHtml } from './src/i18n/static-html.ts';
import { scopeFaceCss } from './scripts/scope-css.ts';

// DESIGN §8. Pages can't send headers, so the policy ships as a meta tag. It is
// added to built pages only: the dev server needs inline scripts and a socket.
export const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "connect-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function staticI18n(): Plugin {
  return {
    name: 'kobo:static-i18n',
    transformIndexHtml: (html) => fillStaticHtml(html, en),
  };
}

function contentSecurityPolicy(): Plugin {
  return {
    name: 'kobo:csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html.replace(/(<meta charset="utf-8" \/>)/, `$1\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    },
  };
}

// jsPDF's optional modules, used only by features the export doesn't use (DESIGN §5.5).
const noOptional = fileURLToPath(new URL('./src/core/export/no-optional.ts', import.meta.url));

export default defineConfig({
  appType: 'mpa',
  resolve: {
    alias: { html2canvas: noOptional, dompurify: noOptional, canvg: noOptional },
  },
  plugins: [scopeFaceCss(), staticI18n(), contentSecurityPolicy()],
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  build: {
    target: 'es2022',
    rolldownOptions: {
      input: { main: 'index.html', notFound: '404.html' },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
