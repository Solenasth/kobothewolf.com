// One face's text and piece controls (FR-E3, FR-E4, FR-E11, FR-E12, DESIGN
// §5.6), built from its marks. Locked elements never appear: the marks don't
// list them. Every change goes through the store, which paints the face.
import { MAX_TEXT } from '../core/store';
import type { Piece } from '../core/marks';
import { t } from '../i18n';
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
  const { marks } = session.faces.get(id)!;
  const state = session.store.face(id);

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
    </details>
  );
}
