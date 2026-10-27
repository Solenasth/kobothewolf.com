// Builds the vector PDF's print page (DESIGN §9) with the same face-CSS plugin
// and Content Security Policy as the site. Never deployed: output goes to dist-print/.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { scopeFaceCss } from '../../scripts/scope-css.ts';
import { CSP } from '../../vite.config.ts';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  logLevel: 'warn',
  plugins: [
    scopeFaceCss(),
    {
      name: 'kobo:print-csp',
      transformIndexHtml: (html) => html.replace('<meta charset="utf-8" />', `$&\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    },
  ],
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  build: {
    target: 'es2022',
    outDir: fileURLToPath(new URL('../../dist-print', import.meta.url)),
    emptyOutDir: true,
  },
});
