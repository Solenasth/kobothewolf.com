import { describe, expect, it } from 'vitest';
import { checkFacesHtml } from './faces.ts';

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
