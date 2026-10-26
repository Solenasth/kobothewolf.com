// Builds the E2E fixture pages (DESIGN §10) with the same face-CSS plugin as
// the site. Never deployed: output goes to dist-e2e/.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { scopeFaceCss } from '../../scripts/scope-css.ts';

export default defineConfig({
  root: fileURLToPath(new URL('scoping', import.meta.url)),
  plugins: [scopeFaceCss()],
  build: {
    target: 'es2022',
    outDir: fileURLToPath(new URL('../../dist-e2e', import.meta.url)),
    emptyOutDir: true,
  },
});
