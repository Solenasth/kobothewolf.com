import { expect, test, type Page } from '@playwright/test';

// Art, background, color and range controls, and the user's sticker
// (FR-E5–E9, FR-E16, NFR-4, DESIGN §5.3, §5.6, §10). Every value goes in
// through the UI, as the controls test requires.

type Hook = { bound(id: string): { pieces: Map<string, HTMLElement[]>; sparks: HTMLElement[] }; face(id: string): HTMLElement };

let problems: string[];

async function open(page: Page, lang: 'en' | 'es' = 'en') {
  problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(err.message));
  await page.goto(`/?lang=${lang}&test#editor`);
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);
}

/** What the face shows: art src and visibility, transforms, background, colors, sparkles. */
function look(page: Page, id: string) {
  return page.evaluate((id) => {
    const kobo = (window as unknown as { __kobo: Hook }).__kobo;
    const face = kobo.face(id);
    const bound = kobo.bound(id);
    const art = bound.pieces.get('arte')?.[0];
    return {
      art: art && { src: art.getAttribute('src')!, hidden: getComputedStyle(art).display === 'none', transform: art.style.transform },
      fondos: [...face.classList].filter((c) => c.startsWith('fondo-')),
      acento: face.style.getPropertyValue('--acento'),
      sombra: face.style.getPropertyValue('--sombra'),
      titles: [...face.querySelectorAll<HTMLElement>('[data-rot="tit"]')].map((el) => el.style.transform),
      washi: [...face.querySelectorAll<HTMLElement>('.washi')].map((el) => el.style.transform),
      sparks: bound.sparks.filter((el) => getComputedStyle(el).display !== 'none').length,
    };
  }, id);
}

const TABS = {
  en: ['Certificate', 'License', 'Code cat', 'Programming socks'],
  es: ['Certificado', 'Licencia', 'Gatito de código', 'Programming socks'],
};

async function rangeBounds(page: Page, selector: string) {
  const range = page.locator(selector);
  return { range, min: Number(await range.getAttribute('min')), max: Number(await range.getAttribute('max')) };
}

for (const lang of ['en', 'es'] as const) {
  test(`FR-E5 FR-E7 FR-E9 every face's art, background, rotation and sparkles go through the UI (${lang})`, async ({ page }) => {
    test.setTimeout(180_000);
    await open(page, lang);
    for (const name of TABS[lang]) {
      await page.getByRole('tab', { name, exact: true }).click();
      for (const group of await page.locator('details.ed-grupo').all()) {
        const id = (await group.getAttribute('data-face'))!;

        const art = page.locator(`#ed-arte-${id}`);
        if (await art.count()) {
          const options = await art.locator('option:not([disabled])').evaluateAll((els) => els.map((el) => (el as HTMLOptionElement).value));
          expect(options).toContain('hueco');
          expect(options.includes('ninguno'), id).toBe(id.endsWith('-r'));
          for (const key of options) {
            await art.selectOption(key);
            const shown = (await look(page, id)).art!;
            if (key === 'ninguno') expect(shown.hidden, `${id} ${key}`).toBe(true);
            else {
              expect(shown.hidden, `${id} ${key}`).toBe(false);
              if (key === 'hueco') expect(shown.src).toMatch(/^data:image\/png;base64,/);
              else expect(shown.src, `${id} ${key}`).toContain(`/st-${key}-`);
            }
          }
          await art.selectOption(options[0]!);
        }

        const rot = page.locator(`#ed-rotst-${id}`);
        if (await rot.count()) {
          const { min, max } = await rangeBounds(page, `#ed-rotst-${id}`);
          for (const v of [min, max]) {
            await rot.fill(String(v));
            expect((await look(page, id)).art!.transform).toBe(`rotate(${v}deg) scale(1)`);
          }
        }

        const fondo = page.locator(`#ed-fondo-${id}`);
        for (const key of await fondo.locator('option').evaluateAll((els) => els.map((el) => (el as HTMLOptionElement).value))) {
          await fondo.selectOption(key);
          expect((await look(page, id)).fondos).toEqual([`fondo-${key}`]);
        }

        const sparks = page.locator(`#ed-brillitos-${id}`);
        if (await sparks.count()) {
          const { min, max } = await rangeBounds(page, `#ed-brillitos-${id}`);
          for (const v of [min, max]) {
            await sparks.fill(String(v));
            expect((await look(page, id)).sparks, `${id} sparkles`).toBe(v);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  test(`FR-E8 FR-E9 accent, shadow and the shared ranges go through the UI (${lang})`, async ({ page }) => {
    await open(page, lang);
    const face = 'cer-f';
    for (const [selector, prop] of [['#ed-acento', 'acento'], ['#ed-sombra', 'sombra']] as const) {
      const select = page.locator(selector);
      const values = await select.locator('option').evaluateAll((els) => els.map((el) => (el as HTMLOptionElement).value));
      expect(values.length).toBeGreaterThan(1);
      for (const hex of values) {
        await select.selectOption(hex);
        expect((await look(page, face))[prop], `${prop} ${hex}`).toBe(hex);
      }
    }
    // No free color picker anywhere (FR-E8).
    await expect(page.locator('#editor input[type="color"]')).toHaveCount(0);

    const tit = await rangeBounds(page, '#ed-rottit');
    expect([tit.min, tit.max]).toEqual([-4, 3]);
    for (const v of [tit.min, tit.max]) {
      await tit.range.fill(String(v));
      expect(new Set((await look(page, face)).titles)).toEqual(new Set([`rotate(${v}deg)`]));
    }
    const escala = await rangeBounds(page, '#ed-escala');
    expect([escala.min, escala.max]).toEqual([85, 115]);
    for (const v of [escala.min, escala.max]) {
      await escala.range.fill(String(v));
      expect((await look(page, face)).art!.transform).toMatch(new RegExp(`scale\\(${v / 100}\\)$`));
    }
    const washi = await rangeBounds(page, '#ed-washi');
    expect([washi.min, washi.max]).toEqual([12, 18]);
    for (const v of [washi.min, washi.max]) {
      await washi.range.fill(String(v));
      // Each tape keeps its authored sign.
      expect((await look(page, face)).washi.map((tf) => Math.abs(Number(/rotate\((-?[\d.]+)deg\)/.exec(tf)![1])))).toEqual([v, v]);
    }
    await expect(page.locator('output[for="ed-escala"]')).toHaveText(`${escala.max} %`);
    expect(problems).toEqual([]);
  });
}

test('FR-E8 the shadow control shows only for a variant that lists it', async ({ page }) => {
  await open(page);
  await expect(page.locator('#ed-sombra')).toHaveCount(1); // certificate
  await page.getByRole('tab', { name: 'License', exact: true }).click();
  await expect(page.locator('#ed-sombra')).toHaveCount(0);
  await expect(page.getByLabel('Accent (name, signature, seals, bows)')).toBeVisible();
});

test('FR-E5 the placeholder follows the language', async ({ page }) => {
  await open(page);
  await page.locator('#ed-arte-cer-r').selectOption('hueco');
  const english = (await look(page, 'cer-r')).art!.src;
  await page.locator('a[data-lang="es"]').first().click();
  await expect(page.locator('#ed-arte-cer-r option[value="hueco"]')).toHaveText('[ tu gatito aquí ]');
  await expect.poll(async () => (await look(page, 'cer-r')).art!.src).not.toBe(english);
});

test('FR-E6 FR-E16 the user\'s sticker is made in the browser, shown on both faces and kept after a reload', async ({ page }) => {
  await open(page);
  const outgoing: string[] = [];
  page.on('request', (req) => {
    if (req.method() !== 'GET' || new URL(req.url()).origin !== new URL(page.url()).origin) outgoing.push(`${req.method()} ${req.url()}`);
  });
  await expect(page.locator('#ed-arte-cer-f option[value="propio"]')).toBeDisabled();
  await page.locator('#ed-archivo').setInputFiles('tests/fixtures/sticker/filled-blob.input.png');
  await expect(page.locator('#editor [role="status"]')).toHaveText('Your sticker is ready and shown on both faces.');
  const front = (await look(page, 'cer-f')).art!;
  const back = (await look(page, 'cer-r')).art!;
  expect(front.src).toMatch(/^data:image\/png;base64,/);
  expect(back.src).toBe(front.src);
  await expect(page.locator('#ed-arte-cer-f')).toHaveValue('propio');
  expect(outgoing, 'the image never leaves the browser').toEqual([]);

  await page.waitForFunction(() => localStorage.getItem('kobo-editor-v1')?.includes('"artePropio"'));
  await page.reload();
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);
  await expect(page.locator('#ed-arte-cer-f')).toHaveValue('propio');
  expect((await look(page, 'cer-f')).art!.src).toBe(front.src);
  expect(problems).toEqual([]);
});

test('FR-E6 "cut off at the bottom" remakes the sticker from the last file', async ({ page }) => {
  await open(page);
  await page.locator('#ed-archivo').setInputFiles('tests/fixtures/sticker/cut-bottom.input.png');
  await expect(page.locator('#editor [role="status"]')).toHaveText('Your sticker is ready and shown on both faces.');
  const open1 = (await look(page, 'cer-f')).art!.src;
  await page.getByLabel('The drawing is cut off at the bottom (the neck or body runs off the frame)').check();
  await expect.poll(async () => (await look(page, 'cer-f')).art!.src).not.toBe(open1);
  await expect(page.locator('#editor [role="status"]')).toHaveText('Your sticker is ready and shown on both faces.');
});

test('FR-E6 a file that is not an image shows an error and changes nothing', async ({ page }) => {
  await open(page);
  const before = await look(page, 'cer-f');
  await page.locator('#ed-archivo').setInputFiles({ name: 'drawing.png', mimeType: 'image/png', buffer: Buffer.from('this is not a PNG') });
  await expect(page.locator('#editor [role="status"]')).toHaveText("That file isn't an image. Choose a PNG, JPEG or WebP.");
  expect(await look(page, 'cer-f')).toEqual(before);
  await expect(page.locator('#ed-arte-cer-f option[value="propio"]')).toBeDisabled();
});

test('FR-E6 an image with no drawing says so', async ({ page }) => {
  await open(page);
  // A plain white PNG: nothing darker than the threshold.
  const white = await page.evaluate(async () => {
    const c = new OffscreenCanvas(40, 40);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 40, 40);
    return [...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())];
  });
  await page.locator('#ed-archivo').setInputFiles({ name: 'blank.png', mimeType: 'image/png', buffer: Buffer.from(white) });
  await expect(page.locator('#editor [role="status"]')).toHaveText('No drawing found in that image. Try one with a light background.');
});
