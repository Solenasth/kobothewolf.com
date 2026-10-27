// The export buttons (FR-E14, FR-E15, DESIGN §5.5). The export chunk and the
// PDF chunk are imported as soon as the editor mounts; the buttons wait for
// them, for both shown faces to be ready, and for a first render of each to
// have loaded their fonts and images. If a chunk can't load, its buttons stay
// disabled and the status region says so.
import { useEffect, useState } from 'preact/hooks';
import { t, type MessageKey } from '../i18n';
import type { Session } from './session';

type ExportModule = typeof import('../core/export');
type PdfModule = typeof import('../core/export/pdf');
export type Say = (key: MessageKey, params?: Record<string, string>) => void;

export function ExportBar({ session, say, label }: { session: Session; say: Say; label: (key: string) => string }) {
  const [lib, setLib] = useState<ExportModule | null>(null);
  const [pdf, setPdf] = useState<PdfModule | null>(null);
  const [facesReady, setFacesReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const { frente, reverso } = session.store.document;

  useEffect(() => {
    import('../core/export').then(setLib, (error: unknown) => {
      console.error(error);
      say('export.unavailable');
    });
    import('../core/export/pdf').then(setPdf, (error: unknown) => {
      console.error(error);
      say('export.unavailable');
    });
  }, []);

  useEffect(() => {
    let current = true;
    setFacesReady(false);
    if (lib) {
      void session
        .ready()
        .then(() => Promise.all([frente, reverso].map((id) => lib.prepareFace(session.faces.get(id)!.el))))
        // The warm-up is best effort: it fails harmlessly when the page goes away
        // mid-render, and a real export reports its own errors.
        .catch(() => undefined)
        .then(() => current && setFacesReady(true));
    }
    return () => {
      current = false;
    };
  }, [session, lib, frente, reverso]);

  async function save(filename: string, make: () => Promise<Blob>) {
    if (!lib) return;
    setBusy(true);
    say('export.making', { file: filename });
    try {
      await session.ready();
      const data = await make();
      await lib.browserSaver.save({ filename, data });
      say('export.saved', { file: filename });
    } catch (error) {
      console.error(error);
      say('export.failed', { file: filename });
    } finally {
      setBusy(false);
    }
  }

  function exportPng(id: string, side: 'frente' | 'reverso') {
    const face = session.faces.get(id)!;
    const filename = t(side === 'frente' ? 'export.file.front' : 'export.file.back', { file: face.variant.manifest.archivo });
    void save(filename, () => lib!.renderFace(face.el));
  }

  function exportPdf() {
    const [front, back] = [frente, reverso].map((id) => session.faces.get(id)!);
    const [a, b] = [front!.variant.manifest.archivo, back!.variant.manifest.archivo];
    const filename = t('export.file.pdf', { file: a === b ? a : `${a}+${b}` });
    const title = `${label(`face.${frente}.name`)} + ${label(`face.${reverso}.name`)} · KOBO.EXE ${session.store.document.estilo}`;
    void save(filename, () => pdf!.renderPdf(front!.el, back!.el, { title }));
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
      <button type="button" class="ed-boton" id="ed-pdf" disabled={disabled || !pdf} onClick={exportPdf}>
        {t('export.pdf')}
      </button>
    </div>
  );
}
