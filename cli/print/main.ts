// The vector PDF's print page (FR-B1, DESIGN §9). Never deployed: `kobo
// pdf-vector` builds it to dist-print/ and prints it with Chromium. The
// document goes through the editor's own validated import, then the two
// faces it shows are painted, one per 96 × 56 mm page.
import '../../src/theme/fonts.css';
import { createSession } from '../../src/editor/session';
import { initLanguage } from '../../src/i18n';
import { styleLabel, variants } from '../../src/styles';

const lang = initLanguage();
document.documentElement.lang = lang;

async function print(text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const named = (JSON.parse(text) as { estilo?: unknown }).estilo;
  const estilo = typeof named === 'string' ? named : '';
  const list = variants.get(estilo);
  if (!list) return { ok: false, error: `unknown style ${JSON.stringify(named)}` };
  const session = createSession(estilo, list);
  const imported = await session.store.importText(text);
  if (!imported.ok) return { ok: false, error: JSON.stringify(imported.error) };
  const root = document.getElementById('paginas')!;
  for (const id of [session.store.document.frente, session.store.document.reverso]) {
    const page = document.createElement('section');
    page.className = 'pagina';
    page.append(session.faces.get(id)!.el);
    root.append(page);
    session.shown(id);
  }
  await session.ready();
  const { frente, reverso } = session.store.document;
  // The PDF's title, as the browser export names its PDF (DESIGN §5.5).
  document.title = `${styleLabel(estilo, lang, `face.${frente}.name`)} + ${styleLabel(estilo, lang, `face.${reverso}.name`)} · KOBO.EXE ${estilo}`;
  return { ok: true };
}

Object.assign(window, { __print: print });
