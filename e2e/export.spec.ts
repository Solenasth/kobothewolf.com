import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// PNG export (FR-E14, FR-E15, NFR-2, DESIGN §5.5).

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

/** Width, height and pHYs (pixels per unit, unit) read straight from the PNG bytes. */
function pngInfo(bytes: Buffer) {
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const info = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), phys: null as null | { x: number; y: number; unit: number } };
  for (let i = 8; i < bytes.length; ) {
    const length = bytes.readUInt32BE(i);
    const type = bytes.toString('latin1', i + 4, i + 8);
    if (type === 'pHYs') info.phys = { x: bytes.readUInt32BE(i + 8), y: bytes.readUInt32BE(i + 12), unit: bytes[i + 16]! };
    if (type === 'IDAT' && !info.phys) break; // pHYs must come before the image data
    i += 12 + length;
  }
  return info;
}

async function download(page: Page, button: string) {
  await expect(page.locator(button)).toBeEnabled();
  const started = Date.now();
  const [file] = await Promise.all([page.waitForEvent('download'), page.locator(button).click()]);
  const path = await file.path();
  return { name: file.suggestedFilename(), bytes: readFileSync(path), ms: Date.now() - started };
}

/** Pixel colors at points given in face coordinates (960 × 560), decoded in the page. */
function samples(page: Page, bytes: Buffer, points: [number, number][]) {
  return page.evaluate(
    async ({ b64, points }) => {
      const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(bitmap, 0, 0);
      const k = bitmap.width / 960;
      return points.map(([x, y]) => [...ctx.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data.slice(0, 3)]);
    },
    { b64: bytes.toString('base64'), points },
  );
}

/** Share of pixels in a face-coordinate box that differ clearly from a background color. */
function inkRatio(page: Page, bytes: Buffer, box: { x: number; y: number; w: number; h: number }, background: number[]) {
  return page.evaluate(
    async ({ b64, box, background }) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(bitmap, 0, 0);
      const k = bitmap.width / 960;
      const { data } = ctx.getImageData(Math.round(box.x * k), Math.round(box.y * k), Math.round(box.w * k), Math.round(box.h * k));
      let ink = 0;
      for (let i = 0; i < data.length; i += 4) if ([0, 1, 2].some((c) => Math.abs(data[i + c]! - background[c]!) > 48)) ink++;
      return ink / (data.length / 4);
    },
    { b64: bytes.toString('base64'), box, background },
  );
}

test('FR-E14 NFR-2 each face downloads as a 1134 × 661 PNG at 300 dpi, quickly', async ({ page }) => {
  await open(page);
  for (const [button, name] of [
    ['#ed-png-frente', 'certified-bug-nuzzler-front-300dpi.png'],
    ['#ed-png-reverso', 'certified-bug-nuzzler-back-300dpi.png'],
  ] as const) {
    const file = await download(page, button);
    expect(file.name).toBe(name);
    const info = pngInfo(file.bytes);
    expect([info.width, info.height]).toEqual([1134, 661]);
    expect(info.phys).toEqual({ x: 11811, y: 11811, unit: 1 }); // 300 dpi
    await expect(page.locator('#editor [role="status"]')).toHaveText(`Saved ${name}.`);
    test.info().annotations.push({ type: 'export time', description: `${name}: ${file.ms} ms` });
    expect(file.ms, 'NFR-2: one face in under 3 s').toBeLessThan(3000);
  }
  expect(problems).toEqual([]);
});

test('FR-E14 file names follow the face\'s variant and the language', async ({ page }) => {
  await open(page, 'es');
  await page.locator('#ed-frente').selectOption('lic-f');
  await page.locator('#ed-reverso').selectOption('soc-r');
  expect((await download(page, '#ed-png-frente')).name).toBe('boykisser-license-frente-300dpi.png');
  expect((await download(page, '#ed-png-reverso')).name).toBe('programming-socks-reverso-300dpi.png');
  await expect(page.locator('#editor [role="status"]')).toHaveText('Guardado: programming-socks-reverso-300dpi.png.');
});

test('FR-E14 the export shows what the face shows: hidden pieces, the drawn code cat, round corners', async ({ page }) => {
  await open(page);
  // A hidden piece is gone from the export, and the code cat (a canvas) is in it.
  await page.getByRole('tab', { name: 'Code cat', exact: true }).click();
  const box = (selector: string) =>
    page.locator(`[data-cara="cod-f"] ${selector}`).evaluate((el) => {
      const face = el.closest('[data-cara]')!.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const k = face.width / 960;
      return { x: (r.x - face.x) / k, y: (r.y - face.y) / k, w: r.width / k, h: r.height / k };
    });
  const ok = await box('.ok');
  const cat = await box('canvas');
  await page.locator('details[data-face="cod-f"] input[data-pieza="Etiqueta OK"]').uncheck();
  const file = await download(page, '#ed-png-frente');
  const cream = [255, 248, 238];
  expect(await inkRatio(page, file.bytes, cat, cream), 'code cat drawn').toBeGreaterThan(0.05);
  expect((await samples(page, file.bytes, [[ok.x + ok.w / 2, ok.y + ok.h / 2]]))[0], 'hidden OK label').toEqual(cream);

  // Round corners survive (WebKit dropped border-radius in #17): just inside the
  // paper's box, outside its 18 px curve, the gingham shows, not white paper.
  await page.getByRole('tab', { name: 'Certificate', exact: true }).click();
  const cert = await download(page, '#ed-png-frente');
  // Both gingham layers survive (a first WebKit render lost one in #17): one 36 px cell
  // shows three shades, where both stripes cross, where one does, and where none does.
  const cell = await samples(page, cert.bytes, [
    [5, 5],
    [20, 5],
    [5, 20],
    [20, 20],
  ]);
  expect(new Set(cell.map((c) => c.join())).size, `gingham cell ${JSON.stringify(cell)}`).toBe(3);
  const paper = await page.locator('[data-cara="cer-f"] .papel').evaluate((el) => {
    const face = el.closest('[data-cara]')!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const k = face.width / 960;
    return { x: (r.x - face.x) / k, y: (r.y - face.y) / k };
  });
  const [corner, inside] = await samples(page, cert.bytes, [
    [paper.x + 2, paper.y + 2],
    [paper.x + 30, paper.y + 200],
  ]);
  expect(inside, 'the paper itself is white').toEqual([255, 255, 255]);
  expect(corner, 'its rounded corner shows the background').not.toEqual([255, 255, 255]);
  expect(problems).toEqual([]);
});

test('FR-E15 if the export code is blocked, the buttons stay disabled and say why', async ({ page }) => {
  await page.route(/\/assets\/export-[\w-]+\.js$/, (route) => route.abort());
  await page.goto('/?lang=en#editor');
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);
  await expect(page.locator('#editor [role="status"]')).toHaveText("Export isn't available: its code didn't load. Reload the page to try again.");
  await expect(page.locator('#ed-png-frente')).toBeDisabled();
  await expect(page.locator('#ed-png-reverso')).toBeDisabled();
  // The rest of the editor still works.
  await page.getByRole('tab', { name: 'License', exact: true }).click();
  await expect(page.locator('.ed-visor [data-cara="lic-f"]')).toHaveCount(1);
});
