// Builds the E2E fixture pages (DESIGN §10) with the same face-CSS plugin and
// Content Security Policy as the site. Never deployed: output goes to dist-e2e/.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { scopeFaceCss } from '../../scripts/scope-css.ts';
import { CSP } from '../../vite.config.ts';

const page = (dir: string) => fileURLToPath(new URL(`${dir}/index.html`, import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [
    scopeFaceCss(),
    {
      name: 'kobo:fixture-csp',
      transformIndexHtml: (html) => html.replace('<meta charset="utf-8" />', `$&\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    },
  ],
  build: {
    target: 'es2022',
    outDir: fileURLToPath(new URL('../../dist-e2e', import.meta.url)),
    emptyOutDir: true,
    rolldownOptions: { input: { scoping: page('scoping'), caras: page('caras') } },
  },
});
