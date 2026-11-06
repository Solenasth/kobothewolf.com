import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';
import en from './src/i18n/en.json' with { type: 'json' };
import { fillStaticHtml } from './src/i18n/static-html.ts';
import { renderVersion } from './scripts/release-notes.ts';
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

/** The build's commit: CI's GITHUB_SHA, else git; none outside a checkout. */
function buildCommit(): string | undefined {
  if (process.env['GITHUB_SHA']) return process.env['GITHUB_SHA'];
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return undefined;
  }
}

/** FR-P9, DESIGN §6: the version label and release notes, from package.json and CHANGELOG.md. */
function versionNotes(): Plugin {
  const MARK = '<!-- kobo:version -->';
  return {
    name: 'kobo:version',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes(MARK)) return html;
        const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
        return html.replace(MARK, renderVersion(readFileSync('CHANGELOG.md', 'utf8'), version, buildCommit()));
      },
    },
  };
}

/** FR-P10, DESIGN §6: the theme switcher, and tema.js, which applies the remembered theme before the first paint. */
function pageThemes(): Plugin {
  const MARK = '<!-- kobo:temas -->';
  const read = () => JSON.parse(readFileSync('src/theme/generated/themes.json', 'utf8')) as { porDefecto: string; ids: string[] };
  const script = () =>
    [
      '// Applies the remembered page theme before the first paint (FR-P10, DESIGN §6).',
      `try { var t = localStorage.getItem('kobo-theme'); if (${JSON.stringify(read().ids)}.indexOf(t) >= 0) document.documentElement.setAttribute('data-theme', t); } catch (e) {}`,
      '',
    ].join('\n');
  return {
    name: 'kobo:themes',
    configureServer(server) {
      server.middlewares.use('/tema.js', (_req, res) => {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(script());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'tema.js', source: script() });
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // A classic script in <head> blocks first paint for a few lines, so the theme never flashes.
        let out = html.replace('<head>', '<head>\n    <script src="/tema.js"></script>');
        if (out.includes(MARK)) {
          const options = read().ids.map((id) => `<option value="${id}" data-i18n="theme.${id}"></option>`).join('');
          out = out.replace(MARK, `<div class="tema" hidden><label for="tema" data-i18n="theme.label"></label> <select id="tema">${options}</select></div>`);
        }
        return out;
      },
    },
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
  plugins: [scopeFaceCss(), versionNotes(), pageThemes(), staticI18n(), contentSecurityPolicy()],
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  build: {
    target: 'es2022',
    rolldownOptions: {
      input: { main: 'index.html', notFound: '404.html', how: 'how-it-works.html' },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
