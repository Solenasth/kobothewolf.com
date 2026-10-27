import { describe, expect, it } from 'vitest';
import { checkAssetRefs, checkFacesHtml } from './faces.ts';

const back = (inner: string, id = 'x-r') => `<div class="bleed" data-cara="${id}"><div class="card">${inner}</div></div>`;
const QR = '<div class="qr"><img alt="QR"></div>';
const AT = '<div class="arroba">@KoboTheWolf</div>';
const SITE = '<div class="sitio" data-parte="Sitio"><b data-ed="Sitio · pregunta">hi</b><div class="qr"><img></div><span class="url">kobothewolf.com</span></div>';
const check = (html: string) => checkFacesHtml('f.html', html);

describe('FR-B3 back faces carry the contact', () => {
  it('accepts a P8-style back: main QR, @KoboTheWolf, optional site block', () => {
    expect(check(back(`<h2 data-ed="Título">terms</h2>${QR}${AT}${SITE}`))).toEqual([]);
  });

  it('accepts a front without any contact', () => {
    expect(check(back('<span data-ed="Titular">hi</span>', 'x-f'))).toEqual([]);
  });

  it('rejects a back without the main QR', () => {
    expect(check(back(AT))).toEqual([expect.stringContaining('exactly one main QR')]);
  });

  it('rejects a back whose only QR is inside a data-parte', () => {
    expect(check(back(`${AT}${SITE}`))).toEqual([expect.stringContaining('exactly one main QR')]);
  });

  it('rejects a back with two main QRs', () => {
    expect(check(back(`${QR}${QR}${AT}`))).toEqual([expect.stringContaining('found 2')]);
  });

  it('rejects a back without @KoboTheWolf', () => {
    expect(check(back(QR))).toEqual([expect.stringContaining('@KoboTheWolf outside')]);
  });

  it('rejects @KoboTheWolf that is only inside a data-parte', () => {
    expect(check(back(`${QR}<div data-parte="Contacto"><div class="arroba">@KoboTheWolf</div></div>`))).toEqual([
      expect.stringContaining('@KoboTheWolf outside'),
    ]);
  });

  it('rejects HTML with no faces', () => {
    expect(check('<div class="card"></div>')).toEqual(['f.html: no [data-cara] faces found']);
  });
});

describe('FR-B3 locked elements are never editable', () => {
  it.each([
    ['inside .qr', `<div class="qr"><span data-ed="X">x</span></div>${AT}`],
    ['on .arroba', `${QR}<div class="arroba" data-ed="X">@KoboTheWolf</div>`],
    ['inside .url', `${QR}${AT}<span class="url"><i data-ed="X">kobothewolf.com</i></span>`],
    ['on a canvas', `${QR}${AT}<canvas data-ed="X"></canvas>`],
  ])('rejects data-ed %s', (_where, inner) => {
    expect(check(back(inner))).toContainEqual(expect.stringContaining('locked element'));
  });

  it.each(['telegram · t.me/KoboTheWolf', 'see kobothewolf.com', 'by @KoboTheWolf'])('rejects editable contact text %j', (txt) => {
    expect(check(back(`${QR}${AT}<p data-ed="X">${txt}</p>`))).toEqual([expect.stringContaining('contact data editable')]);
  });
});

describe('FR-E4 data-parte names do not collide with built-in pieces', () => {
  it.each(['arte', 'lazo', 'washi-2'])('rejects data-parte=%j', (name) => {
    expect(check(back(`${QR}${AT}<div data-parte="${name}"></div>`))).toEqual([expect.stringContaining('built-in piece key')]);
  });
});

describe('FR-E5 NFR-5 face images point at existing style assets', () => {
  const assets = new Set(['st-feliz.png', 'qr.png', 'mask.png']);
  const refs = (inner: string) => checkAssetRefs('f.html', back(inner, 'x-f'), assets, ['feliz', 'yap']);

  it('accepts assets/<file> images, masks and art', () => {
    expect(refs('<img src="assets/qr.png"><canvas data-mask="assets/mask.png"></canvas><img data-arte="frente" src="assets/st-feliz.png">')).toEqual([]);
  });

  it('rejects paths outside assets/ and files that do not exist', () => {
    expect(refs('<img src="../assets/qr.png"><img src="assets/nope.png"><canvas data-mask="/x/mask.png"></canvas>')).toEqual([
      'f.html [data-cara="x-f"]: src="../assets/qr.png" must be assets/<file>',
      'f.html [data-cara="x-f"]: src="assets/nope.png" does not exist in the style\'s assets',
      'f.html [data-cara="x-f"]: data-mask="/x/mask.png" must be assets/<file>',
    ]);
  });

  it('rejects art that is not one of the style art keys', () => {
    expect(refs('<img data-arte="frente" src="assets/qr.png">')).toEqual([expect.stringContaining('data-arte image must be assets/st-<key>.png')]);
    expect(refs('<img data-arte="frente" src="assets/st-yap.png">')).toEqual([expect.stringContaining('does not exist')]);
  });
});

describe('FR-E22 text-size sections', () => {
  const front = (inner: string) => back(inner, 'x-f');

  it('accepts sections, one spanning two elements where only one is editable', () => {
    expect(check(front('<div data-seccion="titular">is a</div><div data-seccion="titular" data-ed="Titular">hi</div><p data-seccion="campos"><span data-ed="A">a</span></p>'))).toEqual([]);
  });

  it('accepts a back whose site block lends its texts to a section, not its QR', () => {
    const site = '<div class="sitio" data-parte="Sitio"><b data-seccion="sitio" data-ed="Sitio · pregunta">hi</b><div class="qr"><img></div><div class="txt"><span data-seccion="sitio" data-ed="Sitio · invitación">come</span><span class="url">kobothewolf.com</span></div></div>';
    expect(check(back(`${QR}${AT}${site}`))).toEqual([]);
  });

  it('rejects a section key that is not a lowercase slug', () => {
    expect(check(front('<div data-seccion="Título" data-ed="T">t</div>'))).toEqual([expect.stringContaining('must be a lowercase slug')]);
  });

  it('rejects a section on, around or inside a locked element', () => {
    expect(check(back(`<div data-seccion="contacto">${QR}${AT}<span data-ed="R">r</span></div>`))).toEqual([expect.stringContaining('locked element')]);
    expect(check(back(`<div class="qr" data-seccion="qr"><img></div>${AT}<span data-ed="R">r</span>`))).toEqual([
      expect.stringContaining('locked element'),
      expect.stringContaining('has no editable text'),
    ]);
    expect(check(back(`${QR}${AT}<div class="sitio" data-parte="S"><div class="txt"><span class="url" data-seccion="u">kobothewolf.com</span></div><b data-ed="Q">q</b></div>`))).toEqual([
      expect.stringContaining('locked element'),
      expect.stringContaining('has no editable text'),
    ]);
  });

  it('rejects a section holding contact text', () => {
    expect(check(front('<div data-seccion="nombre"><span data-ed="N">hi</span> @KoboTheWolf</div>'))).toEqual([expect.stringContaining('holds contact data')]);
  });

  it('rejects a section inside another, and a section with no editable text', () => {
    expect(check(front('<div data-seccion="a"><span data-seccion="b" data-ed="X">x</span></div>'))).toEqual([expect.stringContaining('"b" is inside another section')]);
    expect(check(front('<div data-seccion="adorno">just words</div>'))).toEqual([expect.stringContaining('"adorno" has no editable text')]);
  });
});
