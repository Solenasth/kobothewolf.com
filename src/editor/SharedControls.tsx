// Controls shared by both faces (FR-E6, FR-E8, FR-E9, DESIGN §5.6): accent and
// flat shadow from the style's colors only, the common anti-rule ranges, and
// the upload that turns the user's drawing into a sticker. A control shows
// when either shown face's variant lists it in `controles`.
import { useRef, useState } from 'preact/hooks';
import { t, type MessageKey } from '../i18n';
import { Range } from './Range';
import type { Session } from './session';
import { stickerFromFile, type StickerFailure } from './stickers';

const FAILURES: Record<StickerFailure, MessageKey> = {
  'not-image': 'editor.sticker.notImage',
  'no-figure': 'editor.sticker.noFigure',
  'too-large': 'editor.sticker.failed',
  'invalid-pixels': 'editor.sticker.failed',
};

export function SharedControls(props: { session: Session; label: (key: string) => string; say: (key: MessageKey) => void }) {
  const { session, label, say } = props;
  const { store, lists, ranges } = session;
  const doc = store.document;
  const shown = [doc.frente, doc.reverso].map((id) => session.faces.get(id)!);
  const controls = new Set(shown.flatMap((f) => f.variant.manifest.controles));
  const withArt = shown.filter((f) => f.marks.art !== undefined && f.variant.manifest.controles.includes('arte'));
  const [closedBottom, setClosedBottom] = useState(false);
  const [dragging, setDragging] = useState(false);
  const lastFile = useRef<File | null>(null);

  async function upload(file: File, closed: boolean) {
    lastFile.current = file;
    say('editor.sticker.working');
    const result = await stickerFromFile(file, session.efectos, closed);
    if (!result.ok) return say(FAILURES[result.error]);
    const stored = await store.setOwnArt(result.dataUri);
    if (!stored.ok) return say('editor.sticker.failed');
    for (const face of withArt) store.setFaceValue(face.id, 'arte', 'propio');
    say('editor.sticker.done');
  }

  const colorSelect = (key: 'acento' | 'sombra', text: string, options: readonly string[]) => (
    <div class="f">
      <label for={`ed-${key}`}>{text}</label>
      <select id={`ed-${key}`} value={doc[key]} onChange={(e) => store.setGlobal(key, e.currentTarget.value)}>
        {options.map((hex) => (
          <option value={hex}>{label(`color.${hex.slice(1).toLowerCase()}`)}</option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <fieldset class="ed-shared">
        <legend>{t('editor.shared')}</legend>
        {controls.has('acento') && colorSelect('acento', t('editor.accent'), lists.acentos)}
        {controls.has('sombra') && colorSelect('sombra', t('editor.shadow'), lists.sombras)}
        {controls.has('rotTit') && (
          <Range id="ed-rottit" label={t('editor.rotTit')} min={ranges.rotTit[0]} max={ranges.rotTit[1]} step={0.5} value={doc.rotTit!} unit="°" onInput={(v) => store.setGlobal('rotTit', v)} />
        )}
        {controls.has('escala') && (
          <Range id="ed-escala" label={t('editor.escala')} min={ranges.escala[0]} max={ranges.escala[1]} step={1} value={doc.escala!} unit=" %" onInput={(v) => store.setGlobal('escala', v)} />
        )}
        {controls.has('washi') && (
          <Range id="ed-washi" label={t('editor.washi')} min={ranges.washi[0]} max={ranges.washi[1]} step={1} value={doc.anguloWashi!} unit="°" onInput={(v) => store.setGlobal('anguloWashi', v)} />
        )}
      </fieldset>
      {withArt.length > 0 && (
        <fieldset class="ed-upload">
          <label
            class={dragging ? 'ed-drop on' : 'ed-drop'}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer?.files[0];
              if (file) void upload(file, closedBottom);
            }}
          >
            {t('editor.upload')}
            <input
              type="file"
              id="ed-archivo"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) void upload(file, closedBottom);
              }}
            />
          </label>
          <label class="chk">
            <input
              type="checkbox"
              id="ed-cerrar"
              checked={closedBottom}
              onChange={(e) => {
                const closed = e.currentTarget.checked;
                setClosedBottom(closed);
                if (lastFile.current) void upload(lastFile.current, closed);
              }}
            />
            {t('editor.cutBottom')}
          </label>
        </fieldset>
      )}
    </>
  );
}
