import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { ExportIndex, FaceManifest } from '../../cli/manifest.ts';

// Renders what `kobo check-exports` checks (FR-B2, DESIGN §9, §10): every
// variant's PNGs and print PDF, exported through the editor's own buttons in
// its default state, and its PNGs again with every text section at the
// smallest and at the largest size (FR-E22), and each back in its other
// QR layouts (FR-E23), plus what the files can't tell: where the QRs and what
// could cover them are, and each face's text with its font. Written to
// exports/<browser>/, which CI uploads as an artifact.

/** One face's boxes (in face pixels, 960 × 560) and texts, read from the page. */
function manifest(page: Page, id: string): Promise<Omit<FaceManifest, 'png' | 'engine'>> {
  return page.locator(`.ed-visor [data-cara="${id}"]`).evaluate((face) => {
    const frame = face.getBoundingClientRect();
    const k = frame.width / 960;
    const box = (r: DOMRect): [number, number, number, number] => [(r.x - frame.x) / k, (r.y - frame.y) / k, r.width / k, r.height / k];
    const shown = (el: Element) => el.getClientRects().length > 0;
    // The main QR, and the site block with its QR: nothing may touch them (EV §5.3).
    const site = [...face.querySelectorAll('.sitio')].filter(shown);
    const main = [...face.querySelectorAll('.qr')].filter((el) => shown(el) && !el.closest('.sitio'));
    const zones = [...main.map((el) => ({ name: 'qr', box: box(el.getBoundingClientRect()) })), ...site.map((el) => ({ name: 'sitio', box: box(el.getBoundingClientRect()) }))];
    const qrs = [
      ...main.map((el) => ({ kind: 'main' as const, box: box(el.getBoundingClientRect()) })),
      ...site.flatMap((el) => [...el.querySelectorAll('.qr')].map((qr) => ({ kind: 'site' as const, box: box(qr.getBoundingClientRect()) }))),
    ];
    const isProtected = (node: Node) => [...main, ...site].some((zone) => zone.contains(node));
    const obstacles: FaceManifest['obstacles'] = [];
    for (const [selector, kind] of [['.spark', 'sparkle'], ['.washi', 'washi'], ['[data-arte]', 'sticker']] as const) {
      for (const el of face.querySelectorAll(selector)) if (shown(el)) obstacles.push({ kind, label: selector, box: box(el.getBoundingClientRect()) });
    }
    const texts: FaceManifest['texts'] = [];
    const walker = document.createTreeWalker(face, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const raw = node.textContent ?? '';
      if (!raw.trim() || !shown(node.parentElement!)) continue;
      const style = getComputedStyle(node.parentElement!);
      const text = style.textTransform === 'uppercase' ? raw.toUpperCase() : style.textTransform === 'lowercase' ? raw.toLowerCase() : raw;
      texts.push({ family: style.fontFamily.split(',')[0]!.trim().replace(/^["']|["']$/g, ''), text });
      if (isProtected(node)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) obstacles.push({ kind: 'text', label: raw.trim().slice(0, 40), box: box(rect) });
    }
    return { face: face.getAttribute('data-cara')!, style: (window as unknown as { __kobo: { store: { document: { estilo: string } } } }).__kobo.store.document.estilo, qrs, zones, obstacles, texts };
  });
}

/** Sets every text-size range of a face to its min or max, through the panel (FR-E22). */
async function sizeAll(page: Page, id: string, end: 'min' | 'max') {
  for (const range of await page.locator(`details[data-face="${id}"] .ed-tamanos input[type="range"]`).all()) {
    await range.fill((await range.getAttribute(end))!);
  }
}

async function save(page: Page, button: string, dir: string, name: string) {
  await expect(page.locator(button)).toBeEnabled();
  const [file] = await Promise.all([page.waitForEvent('download'), page.locator(button).click()]);
  await file.saveAs(`${dir}/${name}`);
}

test('render every variant for check-exports', async ({ page, browserName }) => {
  test.setTimeout(240_000);
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(err.message));
  const dir = `exports/${browserName}`;
  mkdirSync(dir, { recursive: true });
  await page.goto('/?lang=en&test#editor');
  await expect(page.locator('.ed-visor [data-cara]')).toHaveCount(2);

  const index: ExportIndex = { engine: browserName, faces: [], pdfs: [] };
  for (const tab of await page.getByRole('tab').all()) {
    await tab.click();
    const [front, back] = await page.locator('.ed-visor [data-cara]').evaluateAll((faces) => faces.map((f) => f.getAttribute('data-cara')!));
    const variant = (await page.locator('[role="tab"][aria-selected="true"]').getAttribute('id'))!.replace(/^ed-tab-/, '');
    for (const [id, button] of [
      [front!, '#ed-png-frente'],
      [back!, '#ed-png-reverso'],
    ] as const) {
      await save(page, button, dir, `${id}.png`);
      const face: FaceManifest = { ...(await manifest(page, id)), png: `${id}.png`, engine: browserName };
      writeFileSync(`${dir}/${id}.json`, `${JSON.stringify(face, null, 1)}\n`);
      index.faces.push(`${id}.json`);
    }
    await save(page, '#ed-pdf', dir, `${variant}.pdf`);
    index.pdfs.push({ file: `${variant}.pdf`, pages: [`${front}.json`, `${back}.json`] });

    for (const end of ['min', 'max'] as const) {
      for (const [id, button] of [
        [front!, '#ed-png-frente'],
        [back!, '#ed-png-reverso'],
      ] as const) {
        await sizeAll(page, id, end);
        const name = `${id}-${end}`;
        await save(page, button, dir, `${name}.png`);
        const face: FaceManifest = { ...(await manifest(page, id)), png: `${name}.png`, engine: browserName };
        writeFileSync(`${dir}/${name}.json`, `${JSON.stringify(face, null, 1)}\n`);
        index.faces.push(`${name}.json`);
      }
    }
    for (const id of [front!, back!]) await page.locator(`#ed-tam-reset-${id}`).click();

    const select = page.locator(`#ed-qr-${back}`);
    if (await select.count()) {
      const layouts = await select.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
      for (const layout of layouts.slice(1)) {
        await select.selectOption(layout);
        const name = `${back}-qr-${layout}`;
        await save(page, '#ed-png-reverso', dir, `${name}.png`);
        const face: FaceManifest = { ...(await manifest(page, back!)), png: `${name}.png`, engine: browserName };
        writeFileSync(`${dir}/${name}.json`, `${JSON.stringify(face, null, 1)}\n`);
        index.faces.push(`${name}.json`);
      }
      await select.selectOption(layouts[0]!);
    }
  }
  writeFileSync(`${dir}/index.json`, `${JSON.stringify(index, null, 1)}\n`);
  expect(index.faces.length).toBeGreaterThanOrEqual(24);
  expect(problems).toEqual([]);
});
