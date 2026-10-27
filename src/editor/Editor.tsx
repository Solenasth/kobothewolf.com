// The editor shell (FR-E1, FR-E2, FR-E10, FR-E13, FR-E21, DESIGN §5.6): variant
// tabs, face selects, text and piece controls per face, the guides toggle,
// restore, the two-face stage and the status region. Art and ranges: #16.
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'preact/hooks';
import type { Notice } from '../core/store';
import { getLanguage, onLanguageChange, t, type MessageKey } from '../i18n';
import { styleLabel } from '../styles';
import { FaceControls } from './FaceControls';
import type { Session } from './session';

const NOTICES: Record<Notice, MessageKey> = {
  'storage-unavailable': 'editor.notice.storageUnavailable',
  'storage-full': 'editor.notice.storageFull',
  'sticker-not-saved': 'editor.notice.stickerNotSaved',
  'saved-state-invalid': 'editor.notice.savedStateInvalid',
};

export function Editor({ sessions }: { sessions: ReadonlyMap<string, Session> }) {
  const [estilo, setEstilo] = useState(() => [...sessions.keys()][0]!);
  const session = sessions.get(estilo)!;
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [guias, setGuias] = useState(true);
  const [status, setStatus] = useState<MessageKey | null>(null);

  useEffect(() => onLanguageChange(() => refresh(0)), []);
  useEffect(() => {
    const offChange = session.store.subscribe(() => {
      session.paint();
      refresh(0);
    });
    setStatus(session.notice && NOTICES[session.notice]);
    const offNotice = session.onNotice((notice) => setStatus(NOTICES[notice]));
    return () => {
      offChange();
      offNotice();
    };
  }, [session]);

  const label = (key: string) => styleLabel(estilo, getLanguage(), key);
  const { frente, reverso } = session.store.document;
  const faces = [...session.faces.values()];
  const select = (f: string, r: string) => session.store.select(f, r);

  return (
    <div class="kobo-editor">
      {sessions.size > 1 && (
        <div class="f ed-estilo">
          <label for="ed-estilo">{t('editor.style')}</label>
          <select id="ed-estilo" value={estilo} onChange={(e) => setEstilo(e.currentTarget.value)}>
            {[...sessions.keys()].map((key) => (
              <option value={key}>{key}</option>
            ))}
          </select>
        </div>
      )}
      <Tabs session={session} label={label} />
      <p class="status" role="status" aria-live="polite">
        {status ? t(status) : ''}
      </p>
      <div class="ed-layout" id="ed-layout">
        <form class="ed-panel" autocomplete="off" onSubmit={(e) => e.preventDefault()}>
          <fieldset>
            <legend>{t('editor.faces')}</legend>
            <div class="f">
              <label for="ed-frente">{t('editor.front')}</label>
              <select id="ed-frente" value={frente} onChange={(e) => select(e.currentTarget.value, reverso)}>
                {faces
                  .filter((f) => f.side === 'frente')
                  .map((f) => (
                    <option value={f.id}>{label(`face.${f.id}.name`)}</option>
                  ))}
              </select>
            </div>
            <div class="f">
              <label for="ed-reverso">{t('editor.back')}</label>
              <select id="ed-reverso" value={reverso} onChange={(e) => select(frente, e.currentTarget.value)}>
                {faces
                  .filter((f) => f.side === 'reverso')
                  .map((f) => (
                    <option value={f.id}>{label(`face.${f.id}.name`)}</option>
                  ))}
              </select>
            </div>
            <p class="ed-hint">{t('editor.facesHint')}</p>
          </fieldset>
          <FaceControls session={session} id={frente} heading={t('editor.front')} label={label} />
          <FaceControls session={session} id={reverso} heading={t('editor.back')} label={label} />
          <fieldset>
            <legend>{t('editor.view')}</legend>
            <label class="chk">
              <input type="checkbox" id="ed-guias" checked={guias} onChange={(e) => setGuias(e.currentTarget.checked)} />
              {t('editor.guides')}
            </label>
            <button
              type="button"
              class="ed-boton"
              onClick={() => {
                session.store.restore();
                setStatus('editor.restored');
              }}
            >
              {t('editor.restore')}
            </button>
          </fieldset>
        </form>
        <div class="ed-stage">
          <Viewer session={session} id={frente} heading={t('editor.front')} guias={guias} />
          <Viewer session={session} id={reverso} heading={t('editor.back')} guias={guias} />
        </div>
      </div>
    </div>
  );
}

/** Variant tabs (ARIA tabs pattern): each sets both faces; one is selected only when both faces are its own. */
function Tabs({ session, label }: { session: Session; label: (key: string) => string }) {
  const { frente, reverso } = session.store.document;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = session.variants.findIndex((v) => v.manifest.caras.frente === frente && v.manifest.caras.reverso === reverso);
  const [focus, setFocus] = useState(Math.max(selected, 0));
  const activate = (i: number) => {
    const { caras } = session.variants[i]!.manifest;
    session.store.select(caras.frente, caras.reverso);
  };

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const last = session.variants.length - 1;
    const keys: Record<string, number> = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last };
    const next = keys[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setFocus(next);
    refs.current[next]?.focus();
    activate(next);
  };

  return (
    <div class="ed-tabs" role="tablist" aria-label={t('editor.variants')}>
      {session.variants.map((v, i) => (
        <button
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`ed-tab-${v.manifest.id}`}
          class="ed-tab"
          aria-selected={i === selected}
          aria-controls="ed-layout"
          tabIndex={i === (selected >= 0 ? selected : focus) ? 0 : -1}
          onClick={() => {
            setFocus(i);
            activate(i);
          }}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {label(`variant.${v.manifest.id}.name`)}
        </button>
      ))}
    </div>
  );
}

/** One face at scale: the face element is moved in, and the guides sit over it, outside the face (FR-E10). */
function Viewer({ session, id, heading, guias }: { session: Session; id: string; heading: string; guias: boolean }) {
  const visor = useRef<HTMLDivElement>(null);
  const escala = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    escala.current!.replaceChildren(session.faces.get(id)!.el);
    session.shown(id);
  }, [session, id]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      escala.current!.style.setProperty('--k', String(entry!.contentRect.width / 960));
    });
    observer.observe(visor.current!);
    return () => observer.disconnect();
  }, []);

  return (
    <section class="ed-cara" aria-label={heading}>
      <h3>
        <span>{heading}</span>
        <span>{t('editor.bleed')}</span>
      </h3>
      <div class="ed-visor" ref={visor} data-face={id}>
        <div class="ed-escala" ref={escala} />
        <div class="ed-guias" hidden={!guias} aria-hidden="true" />
      </div>
    </section>
  );
}
