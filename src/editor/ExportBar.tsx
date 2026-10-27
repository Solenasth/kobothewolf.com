// The export buttons (FR-E14, FR-E15, DESIGN §5.5). The export chunk is
// imported as soon as the editor mounts; the buttons wait for it and for both
// shown faces to be ready. If the chunk can't load, they stay disabled and the
// status region says so.
import { useEffect, useState } from 'preact/hooks';
import { t, type MessageKey } from '../i18n';
import type { Session } from './session';

type ExportModule = typeof import('../core/export');
export type Say = (key: MessageKey, params?: Record<string, string>) => void;

export function ExportBar({ session, say }: { session: Session; say: Say }) {
  const [lib, setLib] = useState<ExportModule | null>(null);
  const [facesReady, setFacesReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const { frente, reverso } = session.store.document;

  useEffect(() => {
    import('../core/export').then(setLib, (error: unknown) => {
      console.error(error);
      say('export.unavailable');
    });
  }, []);

  useEffect(() => {
    let current = true;
    setFacesReady(false);
    void session.ready().then(() => current && setFacesReady(true));
    return () => {
      current = false;
    };
  }, [session, frente, reverso]);

  async function exportPng(id: string, side: 'frente' | 'reverso') {
    if (!lib) return;
    const face = session.faces.get(id)!;
    const filename = t(side === 'frente' ? 'export.file.front' : 'export.file.back', { file: face.variant.manifest.archivo });
    setBusy(true);
    say('export.making', { file: filename });
    try {
      await session.ready();
      const data = await lib.renderFace(face.el);
      await lib.browserSaver.save({ filename, data });
      say('export.saved', { file: filename });
    } catch (error) {
      console.error(error);
      say('export.failed', { file: filename });
    } finally {
      setBusy(false);
    }
  }

  const disabled = !lib || !facesReady || busy;
  return (
    <div class="ed-export" role="group" aria-label={t('export.label')}>
      <button type="button" class="ed-boton prim" id="ed-png-frente" disabled={disabled} onClick={() => exportPng(frente, 'frente')}>
        {t('export.png.front')}
      </button>
      <button type="button" class="ed-boton prim" id="ed-png-reverso" disabled={disabled} onClick={() => exportPng(reverso, 'reverso')}>
        {t('export.png.back')}
      </button>
    </div>
  );
}
