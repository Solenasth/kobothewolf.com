// One face's controls (FR-E3–E5, FR-E7, FR-E9, FR-E11, FR-E12, FR-E22, FR-E23, DESIGN §5.6),
// built from its marks and its variant's `controles`. Locked elements never
// appear: the marks don't list them. Every change goes through the store,
// which checks the value against the style and paints the face.
import { MAX_TEXT } from '../core/store';
import type { Piece } from '../core/marks';
import { t, type MessageKey } from '../i18n';
import { Range } from './Range';
import type { Session } from './session';

function pieceLabel(piece: Piece, label: (key: string) => string): string {
  switch (piece.kind) {
    case 'parte':
      return label(`parte.${piece.key}`);
    case 'arte':
      return t('editor.piece.arte');
    case 'lazo':
      return t('editor.piece.lazo');
    case 'washi':
      return t('editor.piece.washi', { n: piece.key.slice('washi-'.length) });
  }
}

export function FaceControls(props: { session: Session; id: string; heading: string; label: (key: string) => string }) {
  const { session, id, heading, label } = props;
  const { marks, variant, side } = session.faces.get(id)!;
  const state = session.store.face(id);
  const controls = new Set(variant.manifest.controles);
  const hasArt = controls.has('arte') && marks.art !== undefined;
  const rotates = controls.has('rotSt') && marks.rotations.some((r) => r.kind === 'st');
  const [min, max] = session.ranges.brillitos;
  const [sizeMin, sizeMax] = session.ranges.tamano;
  const layouts = side === 'reverso' ? (variant.manifest.qr ?? []) : [];
  const sparksMax = Math.min(max, marks.sparks);
  const artOptions: [string, string, boolean?][] = [
    ...session.lists.arte.map((key): [string, string] => [key, label(`arte.${key}`)]),
    ['hueco', t('editor.art.placeholder')],
    ['propio', t('editor.art.own'), !session.store.document.artePropio],
    ...(side === 'reverso' ? [['ninguno', t('editor.art.none')] as [string, string]] : []),
  ];

  return (
    <details class="ed-grupo" open data-face={id}>
      <summary>{heading}</summary>
      <fieldset class="ed-textos">
        <legend>{t('editor.texts')}</legend>
        {marks.fields.length === 0 && <p class="ed-hint">{t('editor.noTexts')}</p>}
        {marks.fields.map((field) => {
          const name = label(`ed.${field.key}`);
          const inputId = `ed-${id}-${field.index}`;
          return (
            <div class="ed-campo" key={inputId}>
              <input
                type="checkbox"
                data-campo={field.index}
                aria-label={t('editor.show', { label: name })}
                checked={!state.ocultosEd.includes(field.index)}
                onChange={(e) => session.store.setFieldHidden(id, field.index, !e.currentTarget.checked)}
              />
              <div class="f">
                <label for={inputId}>{name}</label>
                <input
                  type="text"
                  id={inputId}
                  maxLength={MAX_TEXT}
                  value={state.textos[String(field.index)] ?? field.text}
                  onInput={(e) => session.store.setText(id, field.index, e.currentTarget.value)}
                />
              </div>
            </div>
          );
        })}
      </fieldset>
      {marks.pieces.length > 0 && (
        <fieldset class="ed-piezas">
          <legend>{t('editor.pieces')}</legend>
          {marks.pieces.map((piece) => (
            <label class="chk" key={piece.key}>
              <input
                type="checkbox"
                data-pieza={piece.key}
                checked={!state.ocultasPiezas.includes(piece.key)}
                onChange={(e) => session.store.setPieceHidden(id, piece.key, !e.currentTarget.checked)}
              />
              {pieceLabel(piece, label)}
            </label>
          ))}
        </fieldset>
      )}
      <fieldset class="ed-look">
        <legend>{t('editor.look')}</legend>
        {layouts.length > 1 && (
          <div class="f">
            <label for={`ed-qr-${id}`}>{t('editor.qr.label')}</label>
            <select id={`ed-qr-${id}`} value={state.qr} onChange={(e) => session.store.setFaceValue(id, 'qr', e.currentTarget.value)}>
              {layouts.map((key) => (
                <option value={key}>{t(`editor.qr.${key}` as MessageKey)}</option>
              ))}
            </select>
          </div>
        )}
        {hasArt && (
          <div class="f">
            <label for={`ed-arte-${id}`}>{t('editor.art')}</label>
            <select id={`ed-arte-${id}`} value={state.arte} onChange={(e) => session.store.setFaceValue(id, 'arte', e.currentTarget.value)}>
              {artOptions.map(([key, text, disabled]) => (
                <option value={key} disabled={disabled}>
                  {text}
                </option>
              ))}
            </select>
          </div>
        )}
        {hasArt && rotates && (
          <Range
            id={`ed-rotst-${id}`}
            label={t('editor.rotSt')}
            min={session.ranges.rotSt[0]}
            max={session.ranges.rotSt[1]}
            step={0.5}
            value={state.rotSt}
            unit="°"
            onInput={(v) => session.store.setFaceValue(id, 'rotSt', v)}
          />
        )}
        {controls.has('fondo') && (
          <div class="f">
            <label for={`ed-fondo-${id}`}>{t('editor.background')}</label>
            <select id={`ed-fondo-${id}`} value={state.fondo} onChange={(e) => session.store.setFaceValue(id, 'fondo', e.currentTarget.value)}>
              {session.lists.fondos.map((key) => (
                <option value={key}>{label(`fondo.${key}`)}</option>
              ))}
            </select>
          </div>
        )}
        {controls.has('brillitos') && marks.sparks > 0 && (
          <Range
            id={`ed-brillitos-${id}`}
            label={t('editor.sparks', { n: String(sparksMax) })}
            min={Math.min(min, sparksMax)}
            max={sparksMax}
            step={1}
            value={state.brillitos}
            unit=""
            onInput={(v) => session.store.setFaceValue(id, 'brillitos', v)}
          />
        )}
      </fieldset>
      {marks.sections.length > 0 && (
        <fieldset class="ed-tamanos">
          <legend>{t('editor.textSize')}</legend>
          {marks.sections.map((section) => (
            <Range
              key={section}
              id={`ed-tam-${id}-${section}`}
              label={label(`seccion.${section}`)}
              min={sizeMin}
              max={sizeMax}
              step={1}
              value={state.tamanos[section] ?? 100}
              unit=" %"
              onInput={(v) => session.store.setSectionSize(id, section, v)}
            />
          ))}
          <button type="button" class="ed-boton" id={`ed-tam-reset-${id}`} onClick={() => session.store.resetSizes(id)}>
            {t('editor.textSize.reset')}
          </button>
        </fieldset>
      )}
    </details>
  );
}
